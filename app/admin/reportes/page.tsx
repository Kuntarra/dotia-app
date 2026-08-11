import type { ReactNode } from 'react'
import Link from 'next/link'
import { ROOM_TYPE_LABELS } from "@/lib/types"
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId, modulosActivosTenant } from '@/lib/tenant'
import { PRODUCTO, PRODUCTO_BAJADA } from '@/lib/marca'
import { PrintButton } from './_components/print-button'
import { ReportFilters } from './_components/report-filters'
import { Bed, Moon, Users, CalendarDays, FileSpreadsheet, Bus, BedDouble, UtensilsCrossed, Package, Shirt } from 'lucide-react'
import { formatDateShort as fmt } from '@/lib/format'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string; empresa?: string; propiedad?: string; periodo?: string; proyecto?: string }>
}) {
  const params = await searchParams
  const now    = new Date()
  const periodo         = params.periodo  ?? 'mensual'
  const anio            = parseInt(params.anio ?? String(now.getFullYear()))
  const mes             = parseInt(params.mes  ?? String(now.getMonth() + 1))
  const filtroEmpresa   = params.empresa  ?? 'todas'
  const filtroPropiedad = params.propiedad ?? 'todas'
  const filtroProyecto  = params.proyecto ?? 'todos'

  // ── Rango de fechas según período ───────────────────────────
  let desdeStr: string
  let hastaStr: string
  let diasPeriodo: number
  let tituloperiodo: string

  if (periodo === 'mensual') {
    const dias = new Date(anio, mes, 0).getDate()
    desdeStr = `${anio}-${String(mes).padStart(2,'0')}-01`
    hastaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
    diasPeriodo = dias
    tituloperiodo = `${MONTHS[mes - 1]} ${anio}`
  } else if (periodo === 'anual') {
    desdeStr = `${anio}-01-01`
    hastaStr = `${anio}-12-31`
    diasPeriodo = (anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)) ? 366 : 365
    tituloperiodo = `Año ${anio}`
  } else {
    // Todo el tiempo
    desdeStr = '2020-01-01'
    hastaStr = `${now.getFullYear()}-12-31`
    diasPeriodo = Math.ceil((new Date(hastaStr).getTime() - new Date(desdeStr).getTime()) / 86400000)
    tituloperiodo = 'Todo el tiempo'
  }

  const periodoInicio = new Date(desdeStr + 'T00:00:00')
  const periodoFin    = new Date(hastaStr + 'T23:59:59')
  const hasta         = hastaStr + 'T23:59:59'

  // ── Período ANTERIOR (para comparación / tendencias) ──────────
  const prevInicio = new Date(periodoInicio)
  const prevFin    = new Date(periodoInicio.getTime() - 1000) // 1s antes del inicio actual
  if (periodo === 'mensual')      prevInicio.setMonth(prevInicio.getMonth() - 1)
  else if (periodo === 'anual')   prevInicio.setFullYear(prevInicio.getFullYear() - 1)
  else                            prevInicio.setTime(periodoInicio.getTime() - (periodoFin.getTime() - periodoInicio.getTime()))
  const diasPrevPeriodo = Math.max(1, Math.round((prevFin.getTime() - prevInicio.getTime()) / 86400000))
  const tieneComparacion = periodo !== 'todo'

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()

  // ── Multi-módulo: conteos del período por cada módulo activo ──
  const modulosActivos = await modulosActivosTenant()
  const hotelActivo = modulosActivos.includes('hotel')
  const periodoInicioISO = periodoInicio.toISOString()
  const [trasCount, alimCount, colaCount, lavaCount] = await Promise.all([
    admin.from('traslados').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('fecha', desdeStr).lte('fecha', hastaStr),
    admin.from('plan_alimentacion').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('fecha', desdeStr).lte('fecha', hastaStr),
    admin.from('colaciones').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('fecha', desdeStr).lte('fecha', hastaStr),
    admin.from('lavanderia_bolsas').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', periodoInicioISO).lte('created_at', hasta),
  ])

  // Traemos estadías que solapan desde el período anterior (para comparar)
  const desde = prevInicio.toISOString()

  const [{ data: staysRaw }, { data: allocsRaw }, { data: empresasRaw }, { data: propiedadesRaw }, { data: proyectosRaw }] = await Promise.all([
    admin.from('stays').select(`
      id, guest_id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name, cities(name))),
      companies(id, name)
    `)
    // Estadías que se solapan con el período:
    // checkin <= fin_periodo  AND  (checkout >= inicio_periodo OR sin checkout)
    .eq('tenant_id', tenantId)
    .lte('checked_in_at', hasta)
    .or(`checked_out_at.gte.${desde},checked_out_at.is.null`)
    .order('checked_in_at', { ascending: true })
    .limit(5000),

    admin.from('allocations').select(`
      room_id, company_id, project_id,
      rooms(id, number, type, capacity, properties(id, name)),
      companies(id, name)
    `).eq('tenant_id', tenantId),

    admin.from('companies').select('id, name').eq('tenant_id', tenantId).eq('active', true).order('name'),
    admin.from('properties').select('id, name').eq('tenant_id', tenantId).eq('active', true).order('name'),
    admin.from('projects').select('id, name, company_id').eq('tenant_id', tenantId).eq('active', true).order('name'),
  ])

  // El filtro principal ya viene desde la BD; este es solo seguridad extra
  let stays = staysRaw ?? []
  let allocs = allocsRaw ?? []

  // Filtrar por empresa
  if (filtroEmpresa !== 'todas') {
    stays  = stays.filter(s => (s.companies as any)?.id === filtroEmpresa)
    allocs = allocs.filter(a => (a.companies as any)?.id === filtroEmpresa)
  }

  // Filtrar por proyecto — usa room_ids de allocations con ese project_id
  if (filtroProyecto !== 'todos') {
    const roomsDelProyecto = new Set(
      allocs.filter(a => (a as any).project_id === filtroProyecto).map(a => a.room_id)
    )
    stays  = stays.filter(s => roomsDelProyecto.has((s.rooms as any)?.id))
    allocs = allocs.filter(a => (a as any).project_id === filtroProyecto)
  }

  // Filtrar por propiedad
  if (filtroPropiedad !== 'todas') {
    stays  = stays.filter(s => (s.rooms as any)?.properties?.id === filtroPropiedad)
    allocs = allocs.filter(a => (a.rooms as any)?.properties?.id === filtroPropiedad)
  }

  // ── Noches dentro de una ventana cualquiera (ceil: 1h = 1 noche) ──
  const nochesEn = (s: typeof stays[0], ini: Date, fin: Date) => {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : fin
    const a = entrada < ini ? ini : entrada
    const b = salida  > fin ? fin : salida
    return b <= a ? 0 : Math.ceil((b.getTime() - a.getTime()) / 86400000)
  }
  const noches = (s: typeof stays[0]) => nochesEn(s, periodoInicio, periodoFin)

  // ── Capacidad (camas asignadas) ──────────────────────────────
  const habitacionesAsignadas = new Map<string, number>()
  for (const a of allocs) {
    const r = a.rooms as any
    if (r?.id) habitacionesAsignadas.set(r.id, r.capacity ?? 1)
  }
  const camasDisponibles  = [...habitacionesAsignadas.values()].reduce((acc, c) => acc + c, 0)

  // ── Período ANTERIOR (con el set amplio, antes de recortar) ───
  const nochesPrev      = stays.reduce((a, s) => a + nochesEn(s, prevInicio, prevFin), 0)
  const camasNochePrev  = camasDisponibles * diasPrevPeriodo
  const ocupacionPctPrev = camasNochePrev > 0 ? Math.round((nochesPrev / camasNochePrev) * 100) : 0
  const estadiasPrev    = stays.filter(s => nochesEn(s, prevInicio, prevFin) > 0).length

  // ── Recortar al período ACTUAL para todo lo demás ────────────
  stays = stays.filter(s => noches(s) > 0)

  // ── Métricas globales (período actual) ───────────────────────
  const nochesHuesped = stays.reduce((acc, s) => acc + noches(s), 0)
  const camasNocheTotal   = camasDisponibles * diasPeriodo
  const camasNocheLibres  = Math.max(0, camasNocheTotal - nochesHuesped)
  const camasOcupadas     = diasPeriodo > 0 ? Math.round((nochesHuesped / diasPeriodo) * 10) / 10 : 0
  const ocupacionPct      = camasNocheTotal > 0 ? Math.round((nochesHuesped / camasNocheTotal) * 100) : 0
  const estadiaPromedio   = stays.length > 0 ? Math.round((nochesHuesped / stays.length) * 10) / 10 : 0
  const huespedesUnicos   = new Set(stays.map(s => (s as any).guest_id).filter(Boolean)).size
  const activosAlCierre   = stays.filter(s => !s.checked_out_at).length

  // ── Deltas vs período anterior ───────────────────────────────
  const deltaOcupPts  = ocupacionPct - ocupacionPctPrev                 // puntos porcentuales
  const deltaNochesPc = nochesPrev > 0 ? Math.round(((nochesHuesped - nochesPrev) / nochesPrev) * 100) : null
  const deltaEstadias = stays.length - estadiasPrev

  const propiedadesSet = new Set(allocs.map(a => (a.rooms as any)?.properties?.id).filter(Boolean))
  const nPropiedades   = propiedadesSet.size
  const unidad = periodo === 'anual' ? 'año' : periodo === 'mensual' ? 'mes' : 'período'

  // ── Por propiedad ────────────────────────────────────────────
  const propMap = new Map<string, { nombre: string; camasTotal: number; camasNoche: number; nochesUsadas: number; estadias: number }>()
  for (const a of allocs) {
    const r = a.rooms as any
    const p = r?.properties
    if (!p?.id) continue
    if (!propMap.has(p.id)) propMap.set(p.id, { nombre: p.name, camasTotal: 0, camasNoche: 0, nochesUsadas: 0, estadias: 0 })
    propMap.get(p.id)!.camasTotal  += (r.capacity ?? 1)
    propMap.get(p.id)!.camasNoche  += (r.capacity ?? 1) * diasPeriodo
  }
  for (const s of stays) {
    const pid = (s.rooms as any)?.properties?.id
    if (pid && propMap.has(pid)) {
      propMap.get(pid)!.nochesUsadas += noches(s)
      propMap.get(pid)!.estadias++
    }
  }
  const porPropiedad = [...propMap.values()]
    .map(p => ({
      ...p,
      pct: p.camasNoche > 0 ? Math.round((p.nochesUsadas / p.camasNoche) * 100) : 0,
      // Camas promedio ocupadas por día en esta propiedad
      camasOcupadasProm: diasPeriodo > 0 ? Math.round((p.nochesUsadas / diasPeriodo) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.pct - a.pct)

  // ── Por empresa ──────────────────────────────────────────────
  const empMap = new Map<string, { nombre: string; estadias: number; noches: number }>()
  for (const s of stays) {
    const c = s.companies as any
    if (!c?.id) continue
    if (!empMap.has(c.id)) empMap.set(c.id, { nombre: c.name, estadias: 0, noches: 0 })
    empMap.get(c.id)!.estadias++
    empMap.get(c.id)!.noches += noches(s)
  }
  const porEmpresa = [...empMap.values()].sort((a, b) => b.noches - a.noches)


  const circ = 2 * Math.PI * 52
  const dash = (ocupacionPct / 100) * circ

  // ── Tarjetas de resumen por módulo activo (solo las que correspondan) ──
  type ModuloResumen = { label: string; icon: ReactNode; value: number; unit: string; href: string }
  const moduloResumen: ModuloResumen[] = []
  if (hotelActivo) moduloResumen.push({ label: 'Alojamiento', icon: <BedDouble {...RPT_ICON} />, value: stays.length, unit: 'estadías', href: '/admin/estadias' })
  if (modulosActivos.includes('transporte'))   moduloResumen.push({ label: 'Transporte',   icon: <Bus {...RPT_ICON} />,             value: trasCount.count ?? 0, unit: 'traslados',  href: '/admin/transporte' })
  if (modulosActivos.includes('alimentacion')) moduloResumen.push({ label: 'Alimentación', icon: <UtensilsCrossed {...RPT_ICON} />,  value: alimCount.count ?? 0, unit: 'planes',     href: '/admin/alimentacion' })
  if (modulosActivos.includes('colaciones'))   moduloResumen.push({ label: 'Colaciones',   icon: <Package {...RPT_ICON} />,         value: colaCount.count ?? 0, unit: 'colaciones', href: '/admin/colaciones' })
  if (modulosActivos.includes('lavanderia'))   moduloResumen.push({ label: 'Lavandería',   icon: <Shirt {...RPT_ICON} />,           value: lavaCount.count ?? 0, unit: 'bolsas',     href: '/admin/lavanderia' })

  return (
    <div className="min-h-screen bg-[var(--gray-100)]">

      {/* ── Header ── */}
      <div className="bg-[var(--brand)] text-white px-8 py-8 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]" aria-hidden="true">
          <defs>
            <pattern id="rp" width="52" height="52" patternUnits="userSpaceOnUse">
              <path d="M26 0 L52 26 L26 52 L0 26 Z" fill="none" stroke="white" strokeWidth="0.7"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rp)"/>
        </svg>
        <div className="relative max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <span className="section-label">Reporte de ocupación</span>
            <h1 className="font-display text-[2rem] font-semibold leading-tight text-white tracking-[-0.01em]">{tituloperiodo}</h1>
            <p className="text-white/45 text-sm mt-1">
              {diasPeriodo} días · {nPropiedades} propiedad{nPropiedades !== 1 ? 'es' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <ReportFilters
              periodo={periodo} mes={mes} anio={anio}
              filtroEmpresa={filtroEmpresa} filtroPropiedad={filtroPropiedad}
              filtroProyecto={filtroProyecto}
              empresas={(empresasRaw ?? []).map(e => ({ id: e.id, name: e.name }))}
              propiedades={(propiedadesRaw ?? []).map(p => ({ id: p.id, name: p.name }))}
              proyectos={(proyectosRaw ?? []).map(p => ({ id: p.id, name: p.name, company_id: p.company_id }))}
            />
            <a
              href={`/api/reportes/excel?periodo=${periodo}&mes=${mes}&anio=${anio}&empresa=${filtroEmpresa}&propiedad=${filtroPropiedad}`}
              className="no-print flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20
                         text-white text-sm font-medium rounded-lg transition-colors">
              <FileSpreadsheet size={16} strokeWidth={1.75} />
              Excel
            </a>
            <PrintButton />
          </div>
        </div>
      </div>

      <div id="reporte-contenido" className="max-w-7xl mx-auto px-8 py-8 space-y-7">

        {/* ── Resumen por módulo (multi-módulo) ── */}
        {moduloResumen.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-[var(--ink)] mb-4">
              <span className="w-1 h-4 rounded-full bg-[var(--senal)]" />Resumen por módulo
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {moduloResumen.map((m) => (
                <Link key={m.label} href={m.href}
                  className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-5 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 block">
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand-5)] text-[var(--ink)] flex items-center justify-center mb-3">{m.icon}</div>
                  <p className="font-display text-[1.8rem] font-semibold leading-none text-[var(--ink)] data-number">{m.value.toLocaleString('es-CL')}</p>
                  <p className="text-sm font-semibold text-[var(--ink)] mt-2">{m.label}</p>
                  <p className="text-xs text-[var(--gray-500)]">{m.unit} en el período</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!hotelActivo && (
          <p className="text-sm text-[var(--gray-500)] bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] px-6 py-4">
            El detalle de ocupación corresponde al módulo Alojamiento (no activo en esta empresa). Arriba ves el resumen de los módulos contratados.
          </p>
        )}

        {/* ── Detalle de Alojamiento (solo si el módulo está activo) ── */}
        {hotelActivo && (<>

        {/* ── Héroe unificado: ocupación + KPIs operativos ── */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">

            {/* Gauge + desglose */}
            <div className="lg:col-span-4 p-7 flex flex-col items-center text-center
                            bg-gradient-to-b from-[var(--gray-50)] to-white lg:border-r border-[var(--gray-200)]">
              <span className="section-label">Ocupación del período</span>
              <div className="relative w-44 h-44 mt-2">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--gray-200)" strokeWidth="10"/>
                  <circle cx="60" cy="60" r="52" fill="none"
                    stroke={ocupacionPct >= 70 ? 'var(--brand)' : 'var(--senal)'}
                    strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[3rem] font-semibold leading-none text-[var(--ink)] data-number">{ocupacionPct}%</span>
                  <span className="text-xs text-[var(--gray-500)] mt-1.5">ocupado</span>
                </div>
              </div>
              {tieneComparacion && <div className="mt-4"><Delta value={deltaOcupPts} kind="pts" suffix=" pts vs ant." /></div>}
              <div className="mt-6 w-full space-y-3 text-xs">
                <BarRow label={`Camas-${unidad} usadas`}   value={nochesHuesped}    total={camasNocheTotal} color="amber" />
                <BarRow label={`Camas-${unidad} sin usar`}  value={camasNocheLibres} total={camasNocheTotal} color="gray" />
                <div className="flex justify-between pt-3 border-t border-[var(--gray-100)]">
                  <span className="text-[var(--gray-600)]">Camas ocupadas/día (prom.)</span>
                  <span className="font-semibold tabular-nums text-[var(--ink)]">{camasOcupadas}</span>
                </div>
              </div>
            </div>

            {/* KPIs operativos */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y divide-[var(--gray-200)]">
              <Kpi bare icon={<Bed {...RPT_ICON}/>} label="Noches-huésped" value={nochesHuesped} accent="navy"
                delta={tieneComparacion ? deltaNochesPc : null} deltaKind="pct"
                sub={`vs ${nochesPrev.toLocaleString('es-CL')} período anterior`} />
              <Kpi bare icon={<Moon {...RPT_ICON}/>} label="Estadía promedio" value={estadiaPromedio} unit=" días" accent="amber"
                sub={`${stays.length.toLocaleString('es-CL')} estadías en el período`} />
              <Kpi bare icon={<Users {...RPT_ICON}/>} label="Huéspedes únicos" value={huespedesUnicos} accent="navy"
                sub={`${nPropiedades} propiedad${nPropiedades !== 1 ? 'es' : ''} · ${porEmpresa.length} empresa${porEmpresa.length !== 1 ? 's' : ''}`} />
              <Kpi bare icon={<CalendarDays {...RPT_ICON}/>} label="Estadías" value={stays.length} accent="amber"
                delta={tieneComparacion ? deltaEstadias : null} deltaKind="count"
                sub={`${activosAlCierre} activas al cierre`} />
            </div>
          </div>
        </div>

        {/* ── Ocupación por propiedad ── */}
        {porPropiedad.length > 0 && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-6">
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-[var(--ink)] mb-5">
              <span className="w-1 h-4 rounded-full bg-[var(--senal)]" />Ocupación por propiedad
            </h2>
            <div className="space-y-5">
              {porPropiedad.map(p => (
                <div key={p.nombre}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[var(--ink)]">{p.nombre}</span>
                    <div className="flex items-center gap-4 text-xs text-[var(--gray-600)]">
                      <span>{p.estadias} estadías · {p.nochesUsadas} camas usadas / {p.camasNoche} disponibles</span>
                      <span className={`font-bold text-base ${p.pct >= 70 ? 'text-[var(--ink)]' : 'text-[var(--senal-dark)]'}`}>
                        {p.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.pct >= 70 ? 'bg-[var(--brand)]' : 'bg-[var(--senal)]'}`}
                      style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Por empresa ── */}
        {porEmpresa.length > 0 && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--gray-100)]">
              <h2 className="flex items-center gap-2.5 text-sm font-bold text-[var(--ink)]">
                <span className="w-1 h-4 rounded-full bg-[var(--senal)]" />Resumen por empresa
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Empresa</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Estadías</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Noches-huésped</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Participación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {porEmpresa.map(e => {
                  const pct = nochesHuesped > 0 ? Math.round((e.noches / nochesHuesped) * 100) : 0
                  return (
                    <tr key={e.nombre} className="hover:bg-[var(--gray-50)]">
                      <td className="px-6 py-3.5 font-medium text-[var(--ink)]">{e.nombre}</td>
                      <td className="px-6 py-3.5 text-right text-[var(--gray-700)]">{e.estadias}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-[var(--ink)]">{e.noches}</td>
                      <td className="px-6 py-3.5 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[var(--gray-100)] rounded-full">
                            <div className="h-full bg-[var(--senal)] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-[var(--gray-500)] w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <td className="px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Total</td>
                  <td className="px-6 py-3 text-right font-bold text-[var(--ink)]">{stays.length}</td>
                  <td className="px-6 py-3 text-right font-bold text-[var(--ink)]">{nochesHuesped}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Listado completo ── */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-[var(--ink)]">
              <span className="w-1 h-4 rounded-full bg-[var(--senal)]" />Listado completo de huéspedes
            </h2>
            <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2.5 py-1 rounded-full font-medium">
              {stays.length} registros
            </span>
          </div>
          {!stays.length ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--gray-500)]">No hay estadías para este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                    <th className="w-[17%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">Huésped</th>
                    <th className="w-[10%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">RUT</th>
                    <th className="w-[14%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">Empresa</th>
                    <th className="w-[13%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">Propiedad</th>
                    <th className="w-[11%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">Hab.</th>
                    <th className="w-[7%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">Turno</th>
                    <th className="w-[8%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">Entrada</th>
                    <th className="w-[8%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-left">Salida</th>
                    <th className="w-[6%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-right">Noches</th>
                    <th className="w-[6%] px-3 py-3 text-xs font-semibold text-[var(--gray-600)] text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                  {stays.map((stay) => {
                    const g = stay.guests    as any
                    const r = stay.rooms     as any
                    const c = stay.companies as any
                    const n = noches(stay)
                    return (
                      <tr key={stay.id} className="hover:bg-[var(--gray-50)] transition-colors align-top">
                        <td className="px-3 py-3 font-medium text-[var(--ink)] leading-snug">{g?.first_name} {g?.last_name_paterno}</td>
                        <td className="px-3 py-3 text-xs text-[var(--gray-500)] font-mono whitespace-nowrap">{g?.rut ?? '—'}</td>
                        <td className="px-3 py-3 text-[var(--gray-700)] leading-snug">{c?.name}</td>
                        <td className="px-3 py-3 text-[var(--gray-700)] leading-snug">{r?.properties?.name}</td>
                        <td className="px-3 py-3 text-[var(--gray-600)] leading-snug">
                          {r?.number}{r?.type ? <span className="text-xs text-[var(--gray-400)]"> · {ROOM_TYPE_LABELS[r.type]??r.type}</span> : ''}
                        </td>
                        <td className="px-3 py-3 text-[var(--gray-600)] whitespace-nowrap">{stay.shift_type ?? '—'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-[var(--gray-700)] tabular-nums">{fmt(stay.checked_in_at)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-[var(--gray-700)] tabular-nums">
                          {stay.checked_out_at ? fmt(stay.checked_out_at) : <span className="text-[var(--senal-dark)] font-medium">En hotel</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-[var(--ink)] tabular-nums">{n}</td>
                        <td className="px-3 py-3 text-center">
                          {stay.checked_out_at
                            ? <span className="badge badge-gray">Salió</span>
                            : <span className="badge badge-green">Alojado</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--gray-200)] bg-[var(--gray-50)]">
                    <td colSpan={8} className="px-3 py-3 text-xs font-semibold text-[var(--gray-600)]">Total</td>
                    <td className="px-3 py-3 text-right font-bold text-[var(--ink)] tabular-nums">{nochesHuesped}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        </>)}

        <p className="text-center text-xs text-[var(--gray-400)] pb-4">
          {PRODUCTO} · {PRODUCTO_BAJADA} · Generado el {new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })}
        </p>
      </div>
    </div>
  )
}

const RPT_ICON = { size: 16, strokeWidth: 1.75 } as const

// Chip de tendencia (▲/▼). positiveGood: si subir es bueno (verde) o malo (rojo).
function Delta({ value, kind = 'pts', positiveGood = true, suffix = '' }: {
  value: number | null; kind?: 'pts' | 'pct' | 'count'; positiveGood?: boolean; suffix?: string
}) {
  if (value == null) return null
  const flat = value === 0
  const good = positiveGood ? value > 0 : value < 0
  const cls = flat ? 'text-[var(--gray-500)] bg-[var(--gray-100)]'
            : good ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
  const arrow = flat ? '→' : value > 0 ? '↑' : '↓'
  const v = kind === 'pct' ? `${Math.abs(value)}%` : `${Math.abs(value)}`
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {arrow} {v}{suffix}
    </span>
  )
}

// Fila con micro-barra de proporción (desglose del gauge).
function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: 'amber' | 'gray' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const bar = color === 'amber' ? 'bg-[var(--senal)]' : 'bg-[var(--gray-300)]'
  const txt = color === 'amber' ? 'text-[var(--senal-dark)]' : 'text-[var(--gray-500)]'
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[var(--gray-600)]">{label}</span>
        <span className={`font-semibold tabular-nums ${txt}`}>{value.toLocaleString('es-CL')}</span>
      </div>
      <div className="h-1.5 bg-[var(--gray-100)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, unit = '', sub, accent = 'navy', delta = null, deltaKind = 'pts', bare = false }: {
  icon: ReactNode; label: string; value: number; unit?: string; sub: string
  accent?: 'navy' | 'amber'; delta?: number | null; deltaKind?: 'pts' | 'pct' | 'count'; bare?: boolean
}) {
  const iconBg = accent === 'amber' ? 'bg-[var(--senal)]/12 text-[var(--senal-dark)]' : 'bg-[var(--brand-5)] text-[var(--ink)]'
  const display = Number.isInteger(value) ? value.toLocaleString('es-CL') : value.toFixed(1)
  const wrap = bare
    ? 'p-6 hover:bg-[var(--gray-50)]/60 transition-colors'
    : 'bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-5 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200'
  return (
    <div className={wrap}>
      <div className="flex items-start justify-between mb-3.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
        {delta != null && <Delta value={delta} kind={deltaKind} />}
      </div>
      <p className="font-display text-[2.15rem] font-semibold leading-none text-[var(--ink)] data-number">
        {display}{unit && <span className="text-base font-medium text-[var(--gray-500)]">{unit}</span>}
      </p>
      <p className="text-sm font-semibold text-[var(--ink)] mt-2.5">{label}</p>
      <p className="text-xs text-[var(--gray-500)] mt-1 leading-snug">{sub}</p>
    </div>
  )
}
