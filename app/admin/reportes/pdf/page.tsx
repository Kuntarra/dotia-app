import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { formatDate as fmt } from "@/lib/format"
import { ROOM_TYPE_LABELS } from "@/lib/types"
import { AutoPrint } from './_auto-print'
import { PRODUCTO, PRODUCTO_BAJADA, PALETA, getMarcaCliente } from '@/lib/marca'
import { MODULOS } from '@/lib/modulos'

// El reporte de ocupación habla de estadías, o sea del módulo Hotel.
const MODULO_HOTEL = MODULOS.find(m => m.k === 'hotel')!.label

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const N = PALETA.marca
const A = PALETA.senal
const G = PALETA.gris600

export default async function ReportePdfPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string; empresa?: string; propiedad?: string; periodo?: string }>
}) {
  const params = await searchParams
  const now    = new Date()
  const periodo         = params.periodo   ?? 'mensual'
  const anio            = parseInt(params.anio ?? String(now.getFullYear()))
  const mes             = parseInt(params.mes  ?? String(now.getMonth() + 1))
  const filtroEmpresa   = params.empresa   ?? 'todas'
  const filtroPropiedad = params.propiedad ?? 'todas'

  let desdeStr: string, hastaStr: string, diasPeriodo: number, tituloPeriodo: string
  if (periodo === 'mensual') {
    const dias = new Date(anio, mes, 0).getDate()
    desdeStr = `${anio}-${String(mes).padStart(2,'0')}-01`
    hastaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
    diasPeriodo = dias
    tituloPeriodo = `${MONTHS[mes-1]} ${anio}`
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
  const [{ data: staysRaw }, { data: allocsRaw }] = await Promise.all([
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name)),
      companies(id, name)
    `).eq('tenant_id', tenantId).lte('checked_in_at', hastaStr + 'T23:59:59').order('checked_in_at', { ascending: true }),
    admin.from('allocations').select(`room_id, company_id, rooms(id, number, capacity, properties(id, name)), companies(id, name)`).eq('tenant_id', tenantId),
  ])

  let stays = (staysRaw ?? []).filter(s => {
    const co = s.checked_out_at ? new Date(s.checked_out_at) : null
    return !co || co >= periodoInicio
  })
  let allocs = allocsRaw ?? []
  if (filtroEmpresa   !== 'todas') { stays = stays.filter(s => (s.companies as any)?.id === filtroEmpresa); allocs = allocs.filter(a => (a.companies as any)?.id === filtroEmpresa) }
  if (filtroPropiedad !== 'todas') { stays = stays.filter(s => (s.rooms as any)?.properties?.id === filtroPropiedad); allocs = allocs.filter(a => (a.rooms as any)?.properties?.id === filtroPropiedad) }

  function noches(s: typeof stays[0]) {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : periodoFin
    const ini = entrada < periodoInicio ? periodoInicio : entrada
    const fin = salida  > periodoFin    ? periodoFin    : salida
    if (fin <= ini) return 0
    return Math.max(1, Math.round((fin.getTime() - ini.getTime()) / 86400000))
  }

  const nochesHuesped = stays.reduce((acc, s) => acc + noches(s), 0)
  const habitaciones  = new Map<string,number>()
  for (const a of allocs) { const r = a.rooms as any; if (r?.id) habitaciones.set(r.id, r.capacity ?? 1) }
  const camasDisp  = [...habitaciones.values()].reduce((a,c) => a+c, 0)
  const camasNoche = camasDisp * diasPeriodo
  const camasLibres = Math.max(0, camasNoche - nochesHuesped)
  const ocupPct    = camasNoche > 0 ? Math.round((nochesHuesped / camasNoche) * 100) : 0

  const propMap = new Map<string,{nombre:string;camasNoche:number;usado:number;estadias:number}>()
  for (const a of allocs) {
    const r = a.rooms as any; const p = r?.properties
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

  const fechaGeneracion = new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })

  const gaugeCirc = 2 * Math.PI * 45
  const gaugeDash = (ocupPct / 100) * gaugeCirc

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <title>Reporte {cliente} — {tituloPeriodo}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: var(--font-sans), Arial, Helvetica, sans-serif; font-size: 11px; color: ${PALETA.gris900}; background: #fff; }
          @page { size: A4 landscape; margin: 1.2cm; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
          table { border-collapse: collapse; width: 100%; }
          th, td { text-align: left; padding: 6px 10px; }
          thead th { background: ${PALETA.gris100}; font-size: 10px; font-weight: 700; color: ${PALETA.gris600}; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid ${PALETA.gris200}; }
          tbody tr { border-bottom: 1px solid ${PALETA.gris100}; }
          tbody tr:last-child { border-bottom: none; }
          tfoot td { background: ${PALETA.gris100}; font-weight: 700; border-top: 2px solid ${PALETA.gris300}; }
          .badge-ok { background: ${PALETA.tinte}; color: ${PALETA.marca}; padding: 2px 7px; border-radius: 20px; font-size: 10px; font-weight: 600; }
          .badge-done { background: ${PALETA.gris100}; color: ${PALETA.gris600}; padding: 2px 7px; border-radius: 20px; font-size: 10px; }
        `}</style>
      </head>
      <body>
        <AutoPrint />

        {/* HEADER */}
        <div style={{ background: N, color: '#fff', padding: '16px 24px', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>{PRODUCTO} · {MODULO_HOTEL}</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{cliente.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{tituloPeriodo}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{diasPeriodo} días · {porPropiedad.length} propiedad{porPropiedad.length !== 1 ? 'es' : ''} · Generado el {fechaGeneracion}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: A }}>{ocupPct}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Ocupación del período</div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Noches-huésped', value: nochesHuesped.toLocaleString('es-CL'), sub: 'Suma de noches de todos los huéspedes', color: N },
            { label: 'Camas-noche disponibles', value: camasNoche.toLocaleString('es-CL'), sub: `${camasDisp} camas × ${diasPeriodo} días`, color: A },
            { label: 'Camas-noche libres', value: camasLibres.toLocaleString('es-CL'), sub: `${100 - ocupPct}% sin ocupar`, color: PALETA.gris600 },
            { label: 'Estadías totales', value: stays.length.toString(), sub: `${stays.filter(s=>!s.checked_out_at).length} activas al cierre`, color: A },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', border: `1px solid ${PALETA.gris200}`, borderRadius: 8, padding: '12px 14px' }}>
              {/* Rayita corta en vez del borde superior de 4 px: el borde grueso seguía la
                  esquina redondeada. Mismo gesto que el filete del membrete. */}
              <div style={{ width: 26, height: 3, borderRadius: 2, background: k.color, marginBottom: 9 }} />
              <div style={{ fontSize: 22, fontWeight: 700, color: N }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: PALETA.gris900, marginTop: 2 }}>{k.label}</div>
              <div style={{ fontSize: 10, color: G, marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {/* Ocupación por propiedad */}
          <div style={{ border: `1px solid ${PALETA.gris200}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: N, color: '#fff', padding: '8px 12px', fontSize: 11, fontWeight: 700 }}>Ocupación por propiedad</div>
            <div style={{ padding: '10px 14px', background: '#fff' }}>
              {porPropiedad.map(p => (
                <div key={p.nombre} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, color: N, fontSize: 11 }}>{p.nombre}</span>
                    <span style={{ fontSize: 11, color: G }}>{p.estadias} estadías · {p.usado}/{p.camasNoche} noches <strong style={{ color: p.pct>=70?N:A }}>{p.pct}%</strong></span>
                  </div>
                  <div style={{ height: 8, background: PALETA.gris200, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: p.pct>=70?N:A, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen por empresa */}
          <div style={{ border: `1px solid ${PALETA.gris200}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: N, color: '#fff', padding: '8px 12px', fontSize: 11, fontWeight: 700 }}>Resumen por empresa</div>
            <table>
              <thead><tr><th>Empresa</th><th style={{textAlign:'right'}}>Estadías</th><th style={{textAlign:'right'}}>Noches</th><th style={{textAlign:'right'}}>%</th></tr></thead>
              <tbody>
                {porEmpresa.map(e => (
                  <tr key={e.nombre}>
                    <td style={{ fontWeight: 600, color: N }}>{e.nombre}</td>
                    <td style={{ textAlign: 'right' }}>{e.estadias}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: N }}>{e.noches}</td>
                    <td style={{ textAlign: 'right', color: G }}>{nochesHuesped>0?Math.round(e.noches/nochesHuesped*100):0}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td style={{textAlign:'right'}}>{stays.length}</td><td style={{textAlign:'right',color:N}}>{nochesHuesped}</td><td/></tr></tfoot>
            </table>
          </div>
        </div>

        {/* Listado completo */}
        <div style={{ border: `1px solid ${PALETA.gris200}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: N, color: '#fff', padding: '8px 12px', fontSize: 11, fontWeight: 700 }}>
            Listado completo de huéspedes — {stays.length} registros
          </div>
          <table>
            <thead>
              <tr>
                {['#','Huésped','RUT','Empresa','Propiedad','Hab.','Tipo','Turno','Entrada','Salida','Noches','Estado'].map(h => (
                  <th key={h} style={{ textAlign: ['Noches'].includes(h) ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stays.map((s, i) => {
                const g = s.guests    as any
                const r = s.rooms     as any
                const c = s.companies as any
                const n = noches(s)
                return (
                  <tr key={s.id}>
                    <td style={{ color: G, fontSize: 10 }}>{i+1}</td>
                    <td style={{ fontWeight: 600, color: N, whiteSpace: 'nowrap' }}>{g?.first_name} {g?.last_name_paterno}</td>
                    <td style={{ color: G, fontFamily: 'monospace', fontSize: 10 }}>{g?.rut ?? '—'}</td>
                    <td>{c?.name}</td>
                    <td style={{ fontWeight: 600 }}>{r?.properties?.name}</td>
                    <td>{r?.number}</td>
                    <td style={{ color: G }}>{r?.type ? ROOM_TYPE_LABELS[r.type]??r.type : '—'}</td>
                    <td style={{ color: G }}>{s.shift_type ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmt(s.checked_in_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.checked_out_at ? fmt(s.checked_out_at) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: N }}>{n}</td>
                    <td>{s.checked_out_at ? <span className="badge-done">Completada</span> : <span className="badge-ok">Activa</span>}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr><td colSpan={10}>Total</td><td style={{textAlign:'right'}}>{nochesHuesped}</td><td/></tr></tfoot>
          </table>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: PALETA.gris500 }}>
          {PRODUCTO} · {PRODUCTO_BAJADA} · Generado el {fechaGeneracion}
        </div>
      </body>
    </html>
  )
}
