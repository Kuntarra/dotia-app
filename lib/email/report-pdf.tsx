import { renderToBuffer, Document, Page, View, Text, StyleSheet, Svg, Circle, Polygon } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildScopeFilter, scopeLabel, type Scope, type Subscription } from '@/lib/email/digest'
import { ROOM_TYPE_LABELS } from '@/lib/types'
import { PRODUCTO, PRODUCTO_BAJADA, PALETA, getMarcaClientePorId } from '@/lib/marca'
import { MODULOS } from '@/lib/modulos'

const MODULO_HOTEL = MODULOS.find(m => m.k === 'hotel')!.label

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const N = PALETA.marca, A = PALETA.senal, G = PALETA.gris600, CREAM = PALETA.lienzo, LINEW = PALETA.filete
const TRACK = PALETA.marcaProfunda
// Verde sube, terracota baja: el mismo par que usan el correo y el otro PDF.
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

function Gauge({ pct }: { pct: number }) {
  const SIZE = 84, R = 33, SW = 8, CX = SIZE / 2
  const C = 2 * Math.PI * R
  const dash = Math.min(pct, 100) / 100 * C
  return (
    <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={CX} cy={CX} r={R} stroke={TRACK} strokeWidth={SW} fill="none" />
        {dash > 0 && (
          <Circle cx={CX} cy={CX} r={R} stroke={A} strokeWidth={SW} fill="none"
            strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round" transform={`rotate(-90 ${CX} ${CX})`} />
        )}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 21, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{pct}%</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8, padding: 34, backgroundColor: '#ffffff', color: PALETA.tinta },
  header:     { backgroundColor: N, color: '#ffffff', padding: '22 24', borderTopLeftRadius: 8, borderTopRightRadius: 8, marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hEyebrow:   { fontSize: 8, color: A, letterSpacing: 2.4, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  hProducto:  { fontSize: 9, fontFamily: 'Times-Bold', color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginBottom: 14 },
  hWordmark:  { fontSize: 23, fontFamily: 'Times-Bold', color: '#ffffff', letterSpacing: 3 },
  hRule:      { width: 34, height: 2, backgroundColor: A, marginTop: 11, marginBottom: 9 },
  hTagline:   { fontSize: 7.5, color: 'rgba(255,255,255,0.55)', letterSpacing: 2 },
  hGaugeLabel:{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', marginTop: 7, textAlign: 'center' },
  metaStrip:  { backgroundColor: CREAM, borderLeft: `1px solid ${LINEW}`, borderRight: `1px solid ${LINEW}`, borderBottom: `1px solid ${LINEW}`, padding: '11 16', marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  metaTitle:  { fontSize: 12, fontFamily: 'Times-Bold', color: N },
  metaSub:    { fontSize: 8, color: G },
  kpiGrid:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard:    { flex: 1, border: `1px solid ${PALETA.filete}`, borderRadius: 5, padding: 10 },
  kpiVal:     { fontSize: 17, fontFamily: 'Helvetica-Bold', color: N },
  kpiLabel:   { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  kpiSub:     { fontSize: 7, color: G, marginTop: 1 },
  row2:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card:       { flex: 1, border: `1px solid ${PALETA.filete}`, borderRadius: 5, overflow: 'hidden' },
  cardHead:   { backgroundColor: N, color: '#ffffff', padding: '6 10', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableHead:  { flexDirection: 'row', backgroundColor: PALETA.gris100, borderBottom: `1px solid ${PALETA.filete}` },
  tableRow:   { flexDirection: 'row', borderBottom: `1px solid ${PALETA.gris100}` },
  tableFooter:{ flexDirection: 'row', backgroundColor: PALETA.gris100, borderTop: `2px solid ${PALETA.filete}` },
  th:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: G, padding: '4 6', textTransform: 'uppercase' },
  td:         { fontSize: 8, padding: '4 6' },
  tdBold:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: N, padding: '4 6' },
  barBg:      { height: 5, backgroundColor: PALETA.gris200, borderRadius: 3, marginTop: 2 },
  barFill:    { height: 5, borderRadius: 3 },
  sectionLbl: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: A, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  footer:     { marginTop: 14, textAlign: 'center', fontSize: 7, color: PALETA.gris500 },
})

const barColor = (pct: number) => (pct >= 70 ? N : A)
const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })

function periodFor(freq: Subscription['frequency'], ref: Date) {
  if (freq === 'monthly') {
    const y = ref.getFullYear(), m = ref.getMonth() // 0-based mes actual
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59) // último día del mes anterior
    return { desde: start, hasta: end, dias: end.getDate(), titulo: `${MONTHS[(m - 1 + 12) % 12]} ${start.getFullYear()}` }
  }
  const dias = freq === 'weekly' ? 7 : 1
  const end = new Date(ref); end.setHours(0, 0, 0, 0)
  const start = new Date(end.getTime() - dias * 86400000)
  return {
    desde: start, hasta: new Date(end.getTime() - 1000), dias,
    titulo: freq === 'weekly' ? `Últimos 7 días` : start.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

export async function renderReportPdf(scope: Scope, freq: Subscription['frequency'], ref = new Date()): Promise<Buffer> {
  const admin = createAdminClient()
  const { desde, hasta, dias, titulo } = periodFor(freq, ref)
  const hastaISO = hasta.toISOString()
  const periodoInicio = desde, periodoFin = hasta
  const applyScope = await buildScopeFilter(scope)
  const cliente = (await getMarcaClientePorId(scope.tenant_id)).nombre

  // Período anterior (para comparación)
  const prevInicio = new Date(desde)
  const prevFin = new Date(desde.getTime() - 1000)
  if (freq === 'monthly') prevInicio.setMonth(prevInicio.getMonth() - 1)
  else if (freq === 'weekly') prevInicio.setTime(desde.getTime() - 7 * 86400000)
  else prevInicio.setTime(desde.getTime() - 86400000)
  const diasPrev = Math.max(1, Math.round((prevFin.getTime() - prevInicio.getTime()) / 86400000))
  const unidad = freq === 'monthly' ? 'mes ant.' : freq === 'weekly' ? 'sem. ant.' : 'día ant.'

  const sel = `guest_id, shift_type, checked_in_at, checked_out_at, guests(first_name, last_name_paterno, rut), rooms(id, number, type, capacity, properties(id, name)), companies(id, name)`
  const [{ data: staysRaw }, { data: allocsRaw }] = await Promise.all([
    applyScope(admin.from('stays').select(sel).lte('checked_in_at', hastaISO).or(`checked_out_at.gte.${prevInicio.toISOString()},checked_out_at.is.null`)).order('checked_in_at').limit(5000),
    applyScope(admin.from('allocations').select(`room_id, rooms(id, capacity, properties(id, name)), companies(id, name)`)),
  ])

  let stays = (staysRaw ?? []) as any[]
  const allocs = (allocsRaw ?? []) as any[]

  const nochesEn = (st: any, pIni: Date, pFin: Date) => {
    const ini = Math.max(new Date(st.checked_in_at).getTime(), pIni.getTime())
    const fin = Math.min((st.checked_out_at ? new Date(st.checked_out_at) : pFin).getTime(), pFin.getTime())
    return Math.max(0, Math.ceil((fin - ini) / 86400000))
  }
  const noches = (st: any) => nochesEn(st, periodoInicio, periodoFin)

  const habMap = new Map<string, number>()
  for (const a of allocs) { const r = a.rooms; if (r?.id) habMap.set(r.id, r.capacity ?? 1) }
  const camasDisp = [...habMap.values()].reduce((a, c) => a + c, 0)

  // Período anterior (antes de filtrar)
  const nochesPrev = stays.reduce((a, st) => a + nochesEn(st, prevInicio, prevFin), 0)
  const estadiasPrev = stays.filter(st => nochesEn(st, prevInicio, prevFin) > 0).length
  const ocupPctPrev = camasDisp > 0 ? Math.round((nochesPrev / (camasDisp * diasPrev)) * 100) : 0

  stays = stays.filter(st => noches(st) > 0)

  const nochesH = stays.reduce((a, st) => a + noches(st), 0)
  const camasNoche = camasDisp * dias
  const camasLibres = Math.max(0, camasNoche - nochesH)
  const ocupPct = camasNoche > 0 ? Math.round((nochesH / camasNoche) * 100) : 0
  const estadiaPromedio = stays.length > 0 ? Math.round((nochesH / stays.length) * 10) / 10 : 0
  const huespedesUnicos = new Set(stays.map(st => st.guest_id).filter(Boolean)).size
  const activosAlCierre = stays.filter(st => !st.checked_out_at).length
  const deltaOcupPts = ocupPct - ocupPctPrev
  const deltaNochesPc = nochesPrev > 0 ? Math.round(((nochesH - nochesPrev) / nochesPrev) * 100) : null
  const deltaEstadias = stays.length - estadiasPrev

  const propMap = new Map<string, { nombre: string; camasNoche: number; usado: number; estadias: number }>()
  for (const a of allocs) {
    const r = a.rooms, p = r?.properties
    if (!p?.id) continue
    if (!propMap.has(p.id)) propMap.set(p.id, { nombre: p.name, camasNoche: 0, usado: 0, estadias: 0 })
    propMap.get(p.id)!.camasNoche += (r.capacity ?? 1) * dias
  }
  for (const st of stays) {
    const pid = st.rooms?.properties?.id
    if (pid && propMap.has(pid)) { propMap.get(pid)!.usado += noches(st); propMap.get(pid)!.estadias++ }
  }
  const porPropiedad = [...propMap.values()].map(p => ({ ...p, pct: p.camasNoche > 0 ? Math.round((p.usado / p.camasNoche) * 100) : 0 })).sort((a, b) => b.pct - a.pct)

  const empMap = new Map<string, { nombre: string; estadias: number; noches: number }>()
  for (const st of stays) {
    const c = st.companies; if (!c?.id) continue
    if (!empMap.has(c.id)) empMap.set(c.id, { nombre: c.name, estadias: 0, noches: 0 })
    empMap.get(c.id)!.estadias++; empMap.get(c.id)!.noches += noches(st)
  }
  const porEmpresa = [...empMap.values()].sort((a, b) => b.noches - a.noches)

  const alcance = await scopeLabel(scope)
  const hoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  const COLS: [string, number][] = [['Huésped', 2], ['RUT', 1.2], ['Empresa', 1.5], ['Propiedad', 1.5], ['Hab.', 0.6], ['Tipo', 0.9], ['Turno', 0.8], ['Entrada', 1], ['Salida', 1], ['Noches', 0.7]]

  const doc = (
    <Document title={`Reporte ${cliente} — ${titulo}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          {/* Membrete de cuatro niveles, igual que el correo y el otro PDF. Antes
              el wordmark grande era «dotia»: correcto en el nombre, pero al revés
              en la jerarquía — el protagonista del reporte es el cliente. */}
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
            <View style={{ marginTop: 3 }}><DeltaChip v={deltaOcupPts} suffix={` pts vs ${unidad}`} /></View>
          </View>
        </View>

        <View style={s.metaStrip}>
          <Text style={s.metaTitle}>{alcance} · {titulo}</Text>
          <Text style={s.metaSub}>{dias} días · {porPropiedad.length} propiedad{porPropiedad.length !== 1 ? 'es' : ''} · Generado el {hoy}</Text>
        </View>

        <View style={s.kpiGrid}>
          {[
            { label: 'Noches-huésped', val: nochesH.toLocaleString('es-CL'), sub: `${camasLibres.toLocaleString('es-CL')} camas-noche libres`, color: N, delta: deltaNochesPc, dSuffix: '% vs ant.' },
            { label: 'Estadía promedio', val: `${estadiaPromedio} d`, sub: `${huespedesUnicos} huéspedes únicos`, color: A, delta: null, dSuffix: '' },
            { label: 'Estadías', val: stays.length.toString(), sub: `${activosAlCierre} activas al cierre`, color: A, delta: deltaEstadias, dSuffix: ' vs ant.' },
            { label: 'Capacidad', val: `${camasDisp}`, sub: `${camasNoche.toLocaleString('es-CL')} camas-noche · ${dias} días`, color: G, delta: null, dSuffix: '' },
          ].map(k => (
            <View key={k.label} style={[s.kpiCard, { borderTopWidth: 3, borderTopColor: k.color }]}>
              <Text style={s.kpiVal}>{k.val}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              {k.delta !== null && <View style={{ marginTop: 2 }}><DeltaChip v={k.delta} suffix={k.dSuffix} /></View>}
              <Text style={s.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>

        <View style={s.row2}>
          <View style={s.card}>
            <View style={s.cardHead}><Text>Ocupación por propiedad</Text></View>
            <View style={{ padding: 8 }}>
              {porPropiedad.length ? porPropiedad.map(p => (
                <View key={p.nombre} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', color: N, fontSize: 8 }}>{p.nombre}</Text>
                    <Text style={{ color: G, fontSize: 7 }}>{p.estadias} est. · {p.usado}/{p.camasNoche} <Text style={{ fontFamily: 'Helvetica-Bold', color: barColor(p.pct) }}>{p.pct}%</Text></Text>
                  </View>
                  <View style={s.barBg}><View style={[s.barFill, { width: `${p.pct}%`, backgroundColor: barColor(p.pct) }]} /></View>
                </View>
              )) : <Text style={{ color: G, fontSize: 8 }}>Sin propiedades en el alcance.</Text>}
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardHead}><Text>Resumen por empresa</Text></View>
            <View style={s.tableHead}>
              {['Empresa', 'Estadías', 'Noches', '%'].map((h, i) => (
                <Text key={h} style={[s.th, { flex: i === 0 ? 3 : 1, textAlign: i > 0 ? 'right' : 'left' }]}>{h}</Text>
              ))}
            </View>
            {porEmpresa.map(e => (
              <View key={e.nombre} style={s.tableRow}>
                <Text style={[s.tdBold, { flex: 3 }]}>{e.nombre}</Text>
                <Text style={[s.td, { flex: 1, textAlign: 'right' }]}>{e.estadias}</Text>
                <Text style={[s.tdBold, { flex: 1, textAlign: 'right' }]}>{e.noches}</Text>
                <Text style={[s.td, { flex: 1, textAlign: 'right', color: G }]}>{nochesH > 0 ? Math.round(e.noches / nochesH * 100) : 0}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHead}><Text>Listado de huéspedes — {stays.length} registros</Text></View>
          <View style={s.tableHead}>
            {COLS.map(([h, f]) => <Text key={h} style={[s.th, { flex: f, textAlign: h === 'Noches' ? 'right' : 'left' }]}>{h}</Text>)}
          </View>
          {stays.slice(0, 120).map((st, i) => {
            const g = st.guests, r = st.rooms, c = st.companies, n = noches(st)
            return (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tdBold, { flex: 2 }]}>{g?.first_name} {g?.last_name_paterno}</Text>
                <Text style={[s.td, { flex: 1.2, color: G }]}>{g?.rut ?? '—'}</Text>
                <Text style={[s.td, { flex: 1.5 }]}>{c?.name}</Text>
                <Text style={[s.td, { flex: 1.5, fontFamily: 'Helvetica-Bold' }]}>{r?.properties?.name}</Text>
                <Text style={[s.td, { flex: 0.6 }]}>{r?.number}</Text>
                <Text style={[s.td, { flex: 0.9, color: G }]}>{r?.type ? (ROOM_TYPE_LABELS[r.type] ?? r.type) : '—'}</Text>
                <Text style={[s.td, { flex: 0.8, color: G }]}>{st.shift_type ?? '—'}</Text>
                <Text style={[s.td, { flex: 1 }]}>{fmt(st.checked_in_at)}</Text>
                <Text style={[s.td, { flex: 1 }]}>{st.checked_out_at ? fmt(st.checked_out_at) : '—'}</Text>
                <Text style={[s.tdBold, { flex: 0.7, textAlign: 'right' }]}>{n}</Text>
              </View>
            )
          })}
        </View>

        <Text style={s.footer}>dotia — Trazabilidad de personal · {hoy}</Text>
      </Page>
    </Document>
  )

  return await renderToBuffer(doc)
}
