import { NextRequest } from 'next/server'
import { formatDate as fmt } from "@/lib/format"
import { ROOM_TYPE_LABELS } from "@/lib/types"
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { PRODUCTO, PALETA, getMarcaCliente, slugCliente } from '@/lib/marca'
import { hoyChile } from '@/lib/fechas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Excel pide los colores en ARGB (opacidad + hex, sin '#'), así que la paleta
// se traduce acá. Antes eran 'FF0A2C4A' y 'FFE0A33A': el azul y el dorado de
// Sol Eterno, el primer cliente.
const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase()
const NAVY = argb(PALETA.marca), GOLD = argb(PALETA.senal), LIGHT = argb(PALETA.tinte)

export async function GET(req: NextRequest) {
  // ── Guarda de rol admin ──
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })
  const { data: prof } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'admin') return new Response('No autorizado', { status: 403 })

  const sp     = req.nextUrl.searchParams
  const now    = new Date()
  const periodo         = sp.get('periodo')   ?? 'mensual'
  const anio            = parseInt(sp.get('anio') ?? String(now.getFullYear()))
  const mes             = parseInt(sp.get('mes')  ?? String(now.getMonth() + 1))
  const filtroEmpresa   = sp.get('empresa')   ?? 'todas'
  const filtroPropiedad = sp.get('propiedad') ?? 'todas'

  let desdeStr: string, hastaStr: string, diasPeriodo: number, tituloPeriodo: string
  if (periodo === 'mensual') {
    const dias = new Date(anio, mes, 0).getDate()
    desdeStr = `${anio}-${String(mes).padStart(2,'0')}-01`
    hastaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
    diasPeriodo = dias; tituloPeriodo = `${MONTHS[mes-1]} ${anio}`
  } else if (periodo === 'anual') {
    desdeStr = `${anio}-01-01`; hastaStr = `${anio}-12-31`
    diasPeriodo = 365; tituloPeriodo = `Año ${anio}`
  } else {
    desdeStr = '2020-01-01'; hastaStr = `${now.getFullYear()}-12-31`
    diasPeriodo = Math.ceil((new Date(hastaStr).getTime() - new Date(desdeStr).getTime()) / 86400000)
    tituloPeriodo = 'Todo el tiempo'
  }

  const periodoInicio = new Date(desdeStr + 'T00:00:00')
  const periodoFin    = new Date(hastaStr + 'T23:59:59')

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const cliente = (await getMarcaCliente()).nombre
  const desdeISO = desdeStr + 'T00:00:00'
  const hastaISO = hastaStr + 'T23:59:59'

  const [{ data: staysRaw }, { data: allocsRaw }] = await Promise.all([
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name)),
      companies(id, name)
    `)
    .eq('tenant_id', tenantId)
    .lte('checked_in_at', hastaISO)
    .or(`checked_out_at.gte.${desdeISO},checked_out_at.is.null`)
    .order('checked_in_at', { ascending: true })
    .limit(5000),
    admin.from('allocations').select(`room_id, company_id, rooms(id, capacity, properties(id, name)), companies(id, name)`).eq('tenant_id', tenantId),
  ])

  let stays = staysRaw ?? []
  let allocs = allocsRaw ?? []
  if (filtroEmpresa   !== 'todas') { stays = stays.filter(s => (s.companies as any)?.id === filtroEmpresa); allocs = allocs.filter(a => (a.companies as any)?.id === filtroEmpresa) }
  if (filtroPropiedad !== 'todas') { stays = stays.filter(s => (s.rooms as any)?.properties?.id === filtroPropiedad); allocs = allocs.filter(a => (a.rooms as any)?.properties?.id === filtroPropiedad) }

  function noches(s: typeof stays[0]) {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : periodoFin
    const ini = entrada < periodoInicio ? periodoInicio : entrada
    const fin = salida  > periodoFin    ? periodoFin    : salida
    if (fin <= ini) return 0
    return Math.ceil((fin.getTime() - ini.getTime()) / 86400000)
  }

  const nochesH = stays.reduce((a,s) => a + noches(s), 0)
  const habMap  = new Map<string,number>()
  for (const a of allocs) { const r = a.rooms as any; if (r?.id) habMap.set(r.id, r.capacity ?? 1) }
  const camasDisp  = [...habMap.values()].reduce((a,c) => a+c, 0)
  const camasNoche = camasDisp * diasPeriodo
  const camasLibres = Math.max(0, camasNoche - nochesH)
  const ocupPct    = camasNoche > 0 ? Math.round((nochesH / camasNoche) * 100) : 0

  const propMap = new Map<string,{nombre:string;camasNoche:number;usado:number;estadias:number}>()
  for (const a of allocs) {
    const r = a.rooms as any, p = r?.properties
    if (!p?.id) continue
    if (!propMap.has(p.id)) propMap.set(p.id, { nombre: p.name, camasNoche: 0, usado: 0, estadias: 0 })
    propMap.get(p.id)!.camasNoche += (r.capacity ?? 1) * diasPeriodo
  }
  for (const s of stays) {
    const pid = (s.rooms as any)?.properties?.id
    if (pid && propMap.has(pid)) { propMap.get(pid)!.usado += noches(s); propMap.get(pid)!.estadias++ }
  }
  const porPropiedad = [...propMap.values()].map(p => ({ ...p, pct: p.camasNoche > 0 ? Math.round((p.usado/p.camasNoche)*100) : 0 })).sort((a,b)=>b.pct-a.pct)

  const empMap = new Map<string,{nombre:string;estadias:number;noches:number}>()
  for (const s of stays) {
    const c = s.companies as any; if (!c?.id) continue
    if (!empMap.has(c.id)) empMap.set(c.id, { nombre: c.name, estadias: 0, noches: 0 })
    empMap.get(c.id)!.estadias++; empMap.get(c.id)!.noches += noches(s)
  }
  const porEmpresa = [...empMap.values()].sort((a,b)=>b.noches-a.noches)


  // ── Construcción del workbook ──
  const wb = new ExcelJS.Workbook()
  // "Autor" del archivo: lo que Windows muestra en Propiedades → Detalles.
  // Quien genera el archivo es el sistema, no el cliente.
  wb.creator = PRODUCTO
  wb.created = new Date()

  const headerRow = (ws: ExcelJS.Worksheet, row: number, cols: string[]) => {
    const r = ws.getRow(row)
    cols.forEach((c, i) => {
      const cell = r.getCell(i + 1)
      cell.value = c
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
      cell.alignment = { vertical: 'middle' }
    })
    r.height = 20
  }

  // ── Hoja 1: Resumen ──
  const r1 = wb.addWorksheet('Resumen', { properties: { defaultColWidth: 22 } })
  r1.mergeCells('A1:B1')
  r1.getCell('A1').value = `${cliente} · Reporte de Ocupación`
  r1.getCell('A1').font = { bold: true, size: 16, color: { argb: NAVY } }
  r1.getCell('A3').value = 'Período'; r1.getCell('B3').value = tituloPeriodo
  r1.getCell('A4').value = 'Días del período'; r1.getCell('B4').value = diasPeriodo
  r1.getCell('A5').value = 'Propiedades'; r1.getCell('B5').value = porPropiedad.length
  r1.getCell('A6').value = 'Generado'; r1.getCell('B6').value = new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })

  r1.getCell('A8').value = 'Ocupación del período'
  r1.getCell('A8').font = { bold: true, color: { argb: NAVY } }
  r1.getCell('B8').value = ocupPct / 100
  r1.getCell('B8').numFmt = '0%'
  r1.getCell('B8').font = { bold: true, size: 14, color: { argb: ocupPct >= 70 ? NAVY : GOLD } }

  const kpis: [string, number, string][] = [
    ['Noches-huésped', nochesH, 'Suma de noches de todos los huéspedes'],
    ['Camas-noche disponibles', camasNoche, `${camasDisp} camas × ${diasPeriodo} días`],
    ['Camas-noche usadas', nochesH, `${ocupPct}% de ocupación`],
    ['Camas-noche libres', camasLibres, `${100 - ocupPct}% sin ocupar`],
    ['Estadías totales', stays.length, `${stays.filter(s=>!s.checked_out_at).length} activas al cierre`],
  ]
  headerRow(r1, 10, ['Indicador', 'Valor', 'Detalle'])
  kpis.forEach((k, i) => {
    const row = r1.getRow(11 + i)
    row.getCell(1).value = k[0]; row.getCell(1).font = { bold: true, color: { argb: NAVY } }
    row.getCell(2).value = k[1]; row.getCell(2).numFmt = '#,##0'
    row.getCell(3).value = k[2]; row.getCell(3).font = { color: { argb: 'FF6C757D' } }
  })
  r1.getColumn(1).width = 26; r1.getColumn(2).width = 16; r1.getColumn(3).width = 40

  // ── Hoja 2: Por propiedad ──
  const r2 = wb.addWorksheet('Por propiedad')
  headerRow(r2, 1, ['Propiedad', 'Estadías', 'Camas-noche usadas', 'Camas-noche disp.', 'Ocupación %'])
  porPropiedad.forEach((p, i) => {
    const row = r2.getRow(2 + i)
    row.getCell(1).value = p.nombre; row.getCell(1).font = { bold: true, color: { argb: NAVY } }
    row.getCell(2).value = p.estadias
    row.getCell(3).value = p.usado;      row.getCell(3).numFmt = '#,##0'
    row.getCell(4).value = p.camasNoche; row.getCell(4).numFmt = '#,##0'
    row.getCell(5).value = p.pct / 100;  row.getCell(5).numFmt = '0%'
  })
  ;[36, 12, 18, 18, 14].forEach((w, i) => r2.getColumn(i + 1).width = w)

  // ── Hoja 3: Por empresa ──
  const r3 = wb.addWorksheet('Por empresa')
  headerRow(r3, 1, ['Empresa', 'Estadías', 'Noches-huésped', 'Participación %'])
  porEmpresa.forEach((e, i) => {
    const row = r3.getRow(2 + i)
    row.getCell(1).value = e.nombre; row.getCell(1).font = { bold: true, color: { argb: NAVY } }
    row.getCell(2).value = e.estadias
    row.getCell(3).value = e.noches; row.getCell(3).numFmt = '#,##0'
    row.getCell(4).value = nochesH > 0 ? e.noches / nochesH : 0; row.getCell(4).numFmt = '0%'
  })
  const totEmp = r3.getRow(2 + porEmpresa.length)
  totEmp.getCell(1).value = 'Total'; totEmp.getCell(1).font = { bold: true, color: { argb: NAVY } }
  totEmp.getCell(2).value = stays.length; totEmp.getCell(2).font = { bold: true }
  totEmp.getCell(3).value = nochesH; totEmp.getCell(3).font = { bold: true }; totEmp.getCell(3).numFmt = '#,##0'
  totEmp.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } } })
  ;[36, 12, 18, 16].forEach((w, i) => r3.getColumn(i + 1).width = w)

  // ── Hoja 4: Detalle ──
  const r4 = wb.addWorksheet('Detalle')
  headerRow(r4, 1, ['#','Huésped','RUT','Empresa','Propiedad','Hab.','Tipo','Turno','Entrada','Salida','Noches','Estado'])
  stays.forEach((stay, i) => {
    const g = stay.guests as any, r = stay.rooms as any, c = stay.companies as any
    const row = r4.getRow(2 + i)
    row.getCell(1).value = i + 1
    row.getCell(2).value = `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim()
    row.getCell(3).value = g?.rut ?? '—'
    row.getCell(4).value = c?.name ?? ''
    row.getCell(5).value = r?.properties?.name ?? ''
    row.getCell(6).value = r?.number ?? ''
    row.getCell(7).value = r?.type ? (ROOM_TYPE_LABELS[r.type] ?? r.type) : '—'
    row.getCell(8).value = stay.shift_type ?? '—'
    row.getCell(9).value = fmt(stay.checked_in_at)
    row.getCell(10).value = stay.checked_out_at ? fmt(stay.checked_out_at) : '—'
    row.getCell(11).value = noches(stay)
    row.getCell(12).value = stay.checked_out_at ? 'Completada' : 'Activa'
  })
  ;[5, 26, 14, 20, 20, 8, 12, 10, 12, 12, 9, 12].forEach((w, i) => r4.getColumn(i + 1).width = w)
  r4.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 12 } }
  r4.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  const fecha = hoyChile()
  const slug = tituloPeriodo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte-${slugCliente(cliente)}-${slug}-${fecha}.xlsx"`,
    },
  })
}
