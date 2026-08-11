import { NextRequest, NextResponse } from 'next/server'
import { formatDate as fmt } from "@/lib/format"
import { ROOM_TYPE_LABELS } from "@/lib/types"
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { PRODUCTO, PRODUCTO_BAJADA, PALETA, getMarcaCliente, slugCliente } from '@/lib/marca'
import { MODULOS } from '@/lib/modulos'
import React from 'react'
import { renderToBuffer, Document, Page, View, Text, StyleSheet, Svg, Circle, Polygon } from '@react-pdf/renderer'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// El reporte de ocupación habla de estadías, o sea del módulo Hotel.
const MODULO_HOTEL = MODULOS.find(m => m.k === 'hotel')!.label

const N = PALETA.marca, A = PALETA.senal, G = PALETA.gris600, CREAM = PALETA.lienzo, LINEW = PALETA.filete

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8, padding: 36, backgroundColor: '#ffffff', color: PALETA.gris900 },
  header:     { backgroundColor: N, color: '#ffffff', padding: '22 24', borderTopLeftRadius: 8, borderTopRightRadius: 8, marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hProducto:  { fontSize: 9, fontFamily: 'Times-Bold', color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginBottom: 14 },
  hEyebrow:   { fontSize: 8, color: A, letterSpacing: 2.4, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  hWordmark:  { fontSize: 23, fontFamily: 'Times-Bold', color: '#ffffff', letterSpacing: 3 },
  hRule:      { width: 34, height: 2, backgroundColor: A, marginTop: 11, marginBottom: 9 },
  hTagline:   { fontSize: 7.5, color: 'rgba(255,255,255,0.55)', letterSpacing: 2 },
  hGaugeLabel:{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', marginTop: 7, textAlign: 'center' },
  metaStrip:  { backgroundColor: CREAM, borderLeft: `1px solid ${LINEW}`, borderRight: `1px solid ${LINEW}`, borderBottom: `1px solid ${LINEW}`, padding: '11 16', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  metaTitle:  { fontSize: 12, fontFamily: 'Times-Bold', color: N },
  metaSub:    { fontSize: 8, color: G },
  kpiGrid:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard:    { flex: 1, border: `1px solid ${PALETA.gris200}`, borderRadius: 5, padding: 9 },
  kpiVal:     { fontSize: 16, fontFamily: 'Helvetica-Bold', color: N },
  kpiLabel:   { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  kpiSub:     { fontSize: 7, color: G, marginTop: 1 },
  row2:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  card:       { flex: 1, border: `1px solid ${PALETA.gris200}`, borderRadius: 5, overflow: 'hidden' },
  cardHead:   { backgroundColor: N, color: '#ffffff', padding: '6 10', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableHead:  { flexDirection: 'row', backgroundColor: PALETA.gris100, borderBottom: `1px solid ${PALETA.gris300}` },
  tableRow:   { flexDirection: 'row', borderBottom: `1px solid ${PALETA.gris100}` },
  tableFooter:{ flexDirection: 'row', backgroundColor: PALETA.gris100, borderTop: `2px solid ${PALETA.gris300}` },
  th:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: G, padding: '4 6', textTransform: 'uppercase' },
  td:         { fontSize: 8, padding: '4 6' },
  tdBold:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: N, padding: '4 6' },
  barBg:      { height: 5, backgroundColor: PALETA.gris200, borderRadius: 3, marginTop: 2 },
  barFill:    { height: 5, borderRadius: 3 },
  footer:     { marginTop: 12, textAlign: 'center', fontSize: 7, color: PALETA.gris500 },
  badge:      { fontSize: 7, padding: '1 5', borderRadius: 10 },
})

function barColor(pct: number) { return pct >= 70 ? N : A }

// Track del gauge: el verde profundo, un escalón bajo el fondo del membrete.
// Era '#21456B' (azul), resto de cuando el membrete era azul marino: quedaba un
// anillo azul sobre fondo verde.
const TRACK = PALETA.marcaProfunda

// Variación respecto al período anterior. Mismo par que el correo: verde sube,
// terracota baja. Antes eran '#46C28A' y '#E8836B', dos tonos inventados fuera
// de la paleta y demasiado claros para texto de 7,5 px sobre blanco.
const UP = PALETA.marca, DOWN = PALETA.salida
function deltaColor(v: number | null, positiveGood = true) {
  if (v === null || v === 0) return G
  return (v > 0) === positiveGood ? UP : DOWN
}

// Chip de tendencia con triángulo vectorial (sin glifos unicode que rompen en PDF).
function DeltaChip({ v, suffix, positiveGood = true }: { v: number | null; suffix: string; positiveGood?: boolean }) {
  if (v === null) return null
  const color = deltaColor(v, positiveGood)
  const flat = v === 0, up = v > 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {!flat && (
        <Svg width={5} height={5} viewBox="0 0 6 6" style={{ marginRight: 3 }}>
          <Polygon points={up ? '3,0 6,6 0,6' : '0,0 6,0 3,6'} fill={color} />
        </Svg>
      )}
      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color }}>{`${up ? '+' : ''}${v}${suffix}`}</Text>
    </View>
  )
}

// Gauge circular (anillo SVG) con el % al centro.
function Gauge({ pct }: { pct: number }) {
  const SIZE = 84, R = 33, SW = 8, CX = SIZE / 2
  const C = 2 * Math.PI * R
  const dash = Math.min(pct, 100) / 100 * C
  return (
    <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={CX} cy={CX} r={R} stroke={TRACK} strokeWidth={SW} fill="none" />
        {/* Con 0 % de ocupacion el arco mide cero, y PDFKit rechaza un trazo de
            largo cero ("dash [...] invalid, lengths must be numeric and greater
            than zero"): el reporte entero fallaba con 500 y bajaba un PDF vacio.
            Con 0 % simplemente no se dibuja el arco; queda el anillo de fondo. */}
        {dash > 0 && (
          <Circle
            cx={CX} cy={CX} r={R} stroke={A} strokeWidth={SW} fill="none"
            strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CX})`}
          />
        )}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 21, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{pct}%</Text>
      </View>
    </View>
  )
}

export async function GET(req: NextRequest) {
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

  // Período anterior (para comparación)
  const prevInicio = new Date(periodoInicio)
  const prevFin    = new Date(periodoInicio.getTime() - 1000)
  if (periodo === 'mensual')    prevInicio.setMonth(prevInicio.getMonth() - 1)
  else if (periodo === 'anual') prevInicio.setFullYear(prevInicio.getFullYear() - 1)
  else                          prevInicio.setTime(periodoInicio.getTime() - (periodoFin.getTime() - periodoInicio.getTime()))
  const diasPrev = Math.max(1, Math.round((prevFin.getTime() - prevInicio.getTime()) / 86400000))
  const tieneComp = periodo !== 'todo'

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const cliente = (await getMarcaCliente()).nombre
  const hastaISO = hastaStr + 'T23:59:59'

  const [{ data: staysRaw }, { data: allocsRaw }] = await Promise.all([
    admin.from('stays').select(`
      id, guest_id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name)),
      companies(id, name)
    `)
    .eq('tenant_id', tenantId)
    .lte('checked_in_at', hastaISO)
    .or(`checked_out_at.gte.${prevInicio.toISOString()},checked_out_at.is.null`)
    .order('checked_in_at', { ascending: true })
    .limit(5000),
    admin.from('allocations').select(`room_id, company_id, rooms(id, capacity, properties(id, name)), companies(id, name)`).eq('tenant_id', tenantId),
  ])

  let stays = staysRaw ?? []
  let allocs = allocsRaw ?? []
  if (filtroEmpresa   !== 'todas') { stays = stays.filter(s => (s.companies as any)?.id === filtroEmpresa); allocs = allocs.filter(a => (a.companies as any)?.id === filtroEmpresa) }
  if (filtroPropiedad !== 'todas') { stays = stays.filter(s => (s.rooms as any)?.properties?.id === filtroPropiedad); allocs = allocs.filter(a => (a.rooms as any)?.properties?.id === filtroPropiedad) }

  function nochesEn(s: typeof stays[0], pIni: Date, pFin: Date) {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : pFin
    const ini = entrada < pIni ? pIni : entrada
    const fin = salida  > pFin ? pFin : salida
    if (fin <= ini) return 0
    return Math.ceil((fin.getTime() - ini.getTime()) / 86400000)
  }
  const noches = (s: typeof stays[0]) => nochesEn(s, periodoInicio, periodoFin)

  const habMap  = new Map<string,number>()
  for (const a of allocs) { const r = a.rooms as any; if (r?.id) habMap.set(r.id, r.capacity ?? 1) }
  const camasDisp  = [...habMap.values()].reduce((a,c) => a+c, 0)

  // Período anterior (sobre la ventana ampliada, antes de filtrar)
  const nochesPrev = stays.reduce((a,s) => a + nochesEn(s, prevInicio, prevFin), 0)
  const estadiasPrev = stays.filter(s => nochesEn(s, prevInicio, prevFin) > 0).length
  const ocupPctPrev = camasDisp > 0 ? Math.round((nochesPrev / (camasDisp * diasPrev)) * 100) : 0

  // Narrow al período actual
  stays = stays.filter(s => noches(s) > 0)

  const nochesH = stays.reduce((a,s) => a + noches(s), 0)
  const camasNoche = camasDisp * diasPeriodo
  const camasLibres = Math.max(0, camasNoche - nochesH)
  const ocupPct    = camasNoche > 0 ? Math.round((nochesH / camasNoche) * 100) : 0
  const estadiaPromedio = stays.length > 0 ? Math.round((nochesH / stays.length) * 10) / 10 : 0
  const huespedesUnicos = new Set(stays.map(s => (s as any).guest_id).filter(Boolean)).size
  const activosAlCierre = stays.filter(s => !s.checked_out_at).length
  const deltaOcupPts = ocupPct - ocupPctPrev
  const deltaNochesPc = nochesPrev > 0 ? Math.round(((nochesH - nochesPrev) / nochesPrev) * 100) : null
  const deltaEstadias = stays.length - estadiasPrev
  const unidad = periodo === 'anual' ? 'año ant.' : periodo === 'mensual' ? 'mes ant.' : 'período ant.'

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

  const hoy = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})

  const COLS: [string, number][] = [['#',0.4],['Huésped',2],['RUT',1.2],['Empresa',1.5],['Propiedad',1.5],['Hab.',0.6],['Tipo',0.9],['Turno',0.8],['Entrada',1],['Salida',1],['Noches',0.7],['Estado',0.9]]

  const doc = (
    <Document title={`Reporte ${cliente} — ${tituloPeriodo}`}>
      <Page size="LETTER" style={s.page}>

        {/* Membrete de cuatro niveles: producto · módulo · cliente · alcance */}
        <View style={s.header}>
          <View>
            <Text style={s.hProducto}>{PRODUCTO.toUpperCase()}</Text>
            <Text style={s.hEyebrow}>{MODULO_HOTEL.toUpperCase()} · REPORTE DE OCUPACIÓN</Text>
            <Text style={s.hWordmark}>{cliente.toUpperCase()}</Text>
            <View style={s.hRule} />
            <Text style={s.hTagline}>{PRODUCTO_BAJADA.toUpperCase()}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Gauge pct={ocupPct} />
            <Text style={s.hGaugeLabel}>Ocupación del período</Text>
            {tieneComp && <View style={{ marginTop: 3 }}><DeltaChip v={deltaOcupPts} suffix={` pts vs ${unidad}`} /></View>}
          </View>
        </View>

        {/* Franja meta */}
        <View style={s.metaStrip}>
          <Text style={s.metaTitle}>{tituloPeriodo}</Text>
          <Text style={s.metaSub}>{diasPeriodo} días · {porPropiedad.length} propiedad{porPropiedad.length!==1?'es':''} · Generado el {hoy}</Text>
        </View>

        {/* KPIs operativos */}
        <View style={s.kpiGrid}>
          {[
            { label:'Noches-huésped',  val: nochesH.toLocaleString('es-CL'), sub:`${camasLibres.toLocaleString('es-CL')} camas-noche libres`, color: N, delta: deltaNochesPc, dSuffix:'% vs ant.', dGood:true },
            { label:'Estadía promedio',val: `${estadiaPromedio} d`,          sub:`${huespedesUnicos} huéspedes únicos`, color: A, delta: null, dSuffix:'', dGood:true },
            { label:'Estadías',        val: stays.length.toString(),         sub:`${activosAlCierre} activas al cierre`, color: A, delta: deltaEstadias, dSuffix:` vs ant.`, dGood:true },
            { label:'Capacidad',       val: `${camasDisp}`,                  sub:`${camasNoche.toLocaleString('es-CL')} camas-noche · ${diasPeriodo} días`, color: G, delta: null, dSuffix:'', dGood:true },
          ].map(k => (
            <View key={k.label} style={[s.kpiCard, { borderTopWidth: 3, borderTopColor: k.color }]}>
              <Text style={s.kpiVal}>{k.val}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              {tieneComp && k.delta !== null && <View style={{ marginTop: 2 }}><DeltaChip v={k.delta} suffix={k.dSuffix} positiveGood={k.dGood} /></View>}
              <Text style={s.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>

        {/* Por propiedad + Por empresa */}
        <View style={s.row2}>
          <View style={s.card}>
            <View style={s.cardHead}><Text>Ocupación por propiedad</Text></View>
            <View style={{ padding: 8 }}>
              {porPropiedad.map(p => (
                <View key={p.nombre} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                    <Text style={{ fontFamily:'Helvetica-Bold', color:N, fontSize:8 }}>{p.nombre}</Text>
                    <Text style={{ color:G, fontSize:7 }}>{p.estadias} estadías · {p.usado}/{p.camasNoche} <Text style={{ fontFamily:'Helvetica-Bold', color:barColor(p.pct) }}>{p.pct}%</Text></Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width:`${p.pct}%`, backgroundColor:barColor(p.pct) }]}/>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardHead}><Text>Resumen por empresa</Text></View>
            <View style={s.tableHead}>
              {['Empresa','Estadías','Noches','%'].map((h,i) => (
                <Text key={h} style={[s.th, { flex: i===0?3:1, textAlign: i>0?'right':'left' }]}>{h}</Text>
              ))}
            </View>
            {porEmpresa.map(e => (
              <View key={e.nombre} style={s.tableRow}>
                <Text style={[s.tdBold, { flex:3 }]}>{e.nombre}</Text>
                <Text style={[s.td, { flex:1, textAlign:'right' }]}>{e.estadias}</Text>
                <Text style={[s.tdBold, { flex:1, textAlign:'right' }]}>{e.noches}</Text>
                <Text style={[s.td, { flex:1, textAlign:'right', color:G }]}>{nochesH>0?Math.round(e.noches/nochesH*100):0}%</Text>
              </View>
            ))}
            <View style={s.tableFooter}>
              <Text style={[s.tdBold, { flex:3 }]}>Total</Text>
              <Text style={[s.tdBold, { flex:1, textAlign:'right' }]}>{stays.length}</Text>
              <Text style={[s.tdBold, { flex:1, textAlign:'right', color:N }]}>{nochesH}</Text>
              <Text style={[s.td, { flex:1 }]}/>
            </View>
          </View>
        </View>

        {/* Listado */}
        <View style={s.card}>
          <View style={s.cardHead}><Text>Listado completo de huéspedes — {stays.length} registros</Text></View>
          <View style={s.tableHead}>
            {COLS.map(([h,f]) => (
              <Text key={h} style={[s.th, { flex:f, textAlign: h==='Noches'?'right':'left' }]}>{h}</Text>
            ))}
          </View>
          {stays.map((stay,i) => {
            const g=stay.guests as any, r=stay.rooms as any, c=stay.companies as any, n=noches(stay)
            return (
              <View key={stay.id} style={s.tableRow}>
                <Text style={[s.td,{flex:0.4,color:G}]}>{i+1}</Text>
                <Text style={[s.tdBold,{flex:2}]}>{g?.first_name} {g?.last_name_paterno}</Text>
                <Text style={[s.td,{flex:1.2,color:G}]}>{g?.rut??'—'}</Text>
                <Text style={[s.td,{flex:1.5}]}>{c?.name}</Text>
                <Text style={[s.td,{flex:1.5,fontFamily:'Helvetica-Bold'}]}>{r?.properties?.name}</Text>
                <Text style={[s.td,{flex:0.6}]}>{r?.number}</Text>
                <Text style={[s.td,{flex:0.9,color:G}]}>{r?.type?ROOM_TYPE_LABELS[r.type]??r.type:'—'}</Text>
                <Text style={[s.td,{flex:0.8,color:G}]}>{stay.shift_type??'—'}</Text>
                <Text style={[s.td,{flex:1}]}>{fmt(stay.checked_in_at)}</Text>
                <Text style={[s.td,{flex:1}]}>{stay.checked_out_at?fmt(stay.checked_out_at):'—'}</Text>
                <Text style={[s.tdBold,{flex:0.7,textAlign:'right'}]}>{n}</Text>
                <Text style={[s.td,{flex:0.9,color:stay.checked_out_at?G:A}]}>{stay.checked_out_at?'Completada':'Activa'}</Text>
              </View>
            )
          })}
          <View style={s.tableFooter}>
            <Text style={[s.tdBold,{flex:9.4}]}>Total</Text>
            <Text style={[s.tdBold,{flex:0.7,textAlign:'right',color:N}]}>{nochesH}</Text>
            <Text style={[s.td,{flex:0.9}]}/>
          </View>
        </View>

        <Text style={s.footer}>{PRODUCTO} · {PRODUCTO_BAJADA} · Generado el {hoy}</Text>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)
  const fechaArchivo = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now).replace(/\//g, '-')

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${slugCliente(cliente)}-${fechaArchivo}.pdf"`,
    },
  })
}
