import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { PRODUCTO } from '@/lib/marca'

const MONTHS =['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default async function ClienteReportePage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?:      string
    anio?:     string
    periodo?:  string
    proyecto?: string
    propiedad?: string
  }>
}) {
  const params = await searchParams
  const now     = new Date()
  const periodo = params.periodo  ?? 'mensual'
  const anio    = parseInt(params.anio ?? String(now.getFullYear()))
  const mes     = parseInt(params.mes  ?? String(now.getMonth() + 1))

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('user_profiles').select('role, company_id').eq('id', user.id).single()
  if (myProfile?.role !== 'client' && myProfile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const cookieStore = await cookies()
  const impersonateId = myProfile?.role === 'admin' ? cookieStore.get('sol_impersonate')?.value : null
  const { data: profile } = impersonateId
    ? await admin.from('user_profiles').select('company_id').eq('id', impersonateId).eq('tenant_id', tenantId).single()
    : { data: myProfile }

  const companyId = (profile as any)?.company_id
  if (!companyId) redirect('/alojamiento')

  // ── Rango de fechas ────────────────────────────────────────────────────────
  let desdeStr: string
  let hastaStr: string
  let diasPeriodo: number
  let tituloPeriodo: string

  if (periodo === 'anual') {
    desdeStr    = `${anio}-01-01`
    hastaStr    = `${anio}-12-31`
    diasPeriodo = (anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)) ? 366 : 365
    tituloPeriodo = `Año ${anio}`
  } else {
    const dias  = new Date(anio, mes, 0).getDate()
    desdeStr    = `${anio}-${String(mes).padStart(2,'0')}-01`
    hastaStr    = `${anio}-${String(mes).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
    diasPeriodo = dias
    tituloPeriodo = `${MONTHS[mes - 1]} ${anio}`
  }

  const periodoInicio = new Date(desdeStr + 'T00:00:00')
  const periodoFin    = new Date(hastaStr + 'T23:59:59')

  // ── Proyectos de la empresa ────────────────────────────────────────────────
  const { data: proyectosRaw } = await admin
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('name')

  const proyectos = proyectosRaw ?? []
  const proyectoId = params.proyecto && params.proyecto !== 'todos' ? params.proyecto : null

  // ── Allocations → para saber qué propiedades tiene la empresa (por proyecto) ──
  let allocQuery = admin
    .from('allocations')
    .select('room_id, project_id, rooms(id, capacity, properties(id, name))')
    .eq('company_id', companyId)
    .eq('tenant_id', tenantId)

  if (proyectoId) allocQuery = allocQuery.eq('project_id', proyectoId)

  const { data: allocsRaw } = await allocQuery

  // Propiedades disponibles según el proyecto seleccionado
  const propMapDisp = new Map<string, string>()
  for (const a of allocsRaw ?? []) {
    const p = (a.rooms as any)?.properties
    if (p?.id) propMapDisp.set(p.id, p.name)
  }
  const propiedadesDisp = [...propMapDisp.entries()].map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name))

  const propiedadId = params.propiedad && params.propiedad !== 'todas' ? params.propiedad : null

  // Room IDs permitidos (filtro por proyecto y/o propiedad)
  const roomIdsPermitidos = new Set(
    (allocsRaw ?? [])
      .filter(a => !propiedadId || (a.rooms as any)?.properties?.id === propiedadId)
      .map(a => a.room_id)
  )

  // ── Estadías — solo las que se solapan con el período ───────────────────────
  const { data: staysRaw } = await admin
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name))
    `)
    .eq('company_id', companyId)
    .eq('tenant_id', tenantId)
    .lte('checked_in_at', hastaStr + 'T23:59:59')
    .or(`checked_out_at.gte.${desdeStr}T00:00:00,checked_out_at.is.null`)
    .order('checked_in_at')
    .limit(5000)

  const stays = (staysRaw ?? []).filter(s => {
    // Filtrar por rooms permitidas (proyecto + propiedad)
    return roomIdsPermitidos.has((s.rooms as any)?.id)
  })

  // ── Métricas ────────────────────────────────────────────────────────────────
  function noches(s: typeof stays[0]) {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : periodoFin
    const ini = entrada < periodoInicio ? periodoInicio : entrada
    const fin = salida  > periodoFin    ? periodoFin    : salida
    if (fin <= ini) return 0
    return Math.ceil((fin.getTime() - ini.getTime()) / 86400000)
  }

  // Camas disponibles = solo las habitaciones filtradas × días
  const camasDisp   = (allocsRaw ?? [])
    .filter(a => !propiedadId || (a.rooms as any)?.properties?.id === propiedadId)
    .reduce((acc, a) => acc + ((a.rooms as any)?.capacity ?? 1), 0)

  const camasUsadas = stays.reduce((a, s) => a + noches(s), 0)
  const camasTotal  = camasDisp * diasPeriodo
  const camasLibres = Math.max(0, camasTotal - camasUsadas)
  const ocupPct     = camasTotal > 0 ? Math.round((camasUsadas / camasTotal) * 100) : 0

  // ── Ocupación por propiedad ─────────────────────────────────────────────────
  const propStatsMap = new Map<string, { nombre: string; camas: number; usadas: number; estadias: number }>()
  for (const a of allocsRaw ?? []) {
    if (propiedadId && (a.rooms as any)?.properties?.id !== propiedadId) continue
    const p = (a.rooms as any)?.properties
    if (!p?.id) continue
    if (!propStatsMap.has(p.id)) propStatsMap.set(p.id, { nombre: p.name, camas: 0, usadas: 0, estadias: 0 })
    propStatsMap.get(p.id)!.camas += ((a.rooms as any)?.capacity ?? 1)
  }
  for (const s of stays) {
    const pid = (s.rooms as any)?.properties?.id
    if (pid && propStatsMap.has(pid)) {
      propStatsMap.get(pid)!.usadas += noches(s)
      propStatsMap.get(pid)!.estadias++
    }
  }
  const porPropiedad = [...propStatsMap.values()].map(p => ({
    ...p,
    pct: p.camas * diasPeriodo > 0 ? Math.round((p.usadas / (p.camas * diasPeriodo)) * 100) : 0,
  })).sort((a,b) => b.pct - a.pct)

  // ── Datos empresa ───────────────────────────────────────────────────────────
  const { data: company } = await admin.from('companies').select('name').eq('id', companyId).eq('tenant_id', tenantId).single()

  const fmt  = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'2-digit' })
  const years = Array.from({ length: now.getFullYear() - 2023 }, (_, i) => 2024 + i)
  const circ  = 2 * Math.PI * 45
  const dash  = (ocupPct / 100) * circ

  // Etiqueta del filtro activo
  const proyectoNombre  = proyectoId ? (proyectos.find(p => p.id === proyectoId)?.name ?? '') : 'Todos los proyectos'
  const propiedadNombre = propiedadId ? (propiedadesDisp.find(p => p.id === propiedadId)?.name ?? '') : 'Todos los hostales'

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="font-display text-[1.9rem] font-semibold text-[var(--ink)] tracking-[-0.01em]">Reporte de ocupación</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          {company?.name}
          {proyectoId && <span className="ml-2 text-xs bg-[var(--senal)]/20 text-[var(--ink)] font-medium px-2 py-0.5 rounded-full">{proyectoNombre}</span>}
          {propiedadId && <span className="ml-2 text-xs bg-[var(--gray-200)] text-[var(--ink)] font-medium px-2 py-0.5 rounded-full">{propiedadNombre}</span>}
          <span className="ml-2">· {tituloPeriodo}</span>
        </p>
      </div>

      {/* ── Filtros ── */}
      <form method="GET" className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5 mb-8">
        <p className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-widest mb-4">Filtros</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Período */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--gray-500)]">Período</label>
            <select name="periodo" defaultValue={periodo}
              className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]">
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          {/* Año */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--gray-500)]">Año</label>
            <select name="anio" defaultValue={anio}
              className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Mes (solo mensual) */}
          {periodo === 'mensual' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--gray-500)]">Mes</label>
              <select name="mes" defaultValue={mes}
                className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]">
                {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          )}

          {/* Proyecto */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--gray-500)]">Proyecto</label>
            <select name="proyecto" defaultValue={proyectoId ?? 'todos'}
              className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]">
              <option value="todos">Todos los proyectos</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Hostal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--gray-500)]">Hostal</label>
            <select name="propiedad" defaultValue={propiedadId ?? 'todas'}
              className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]">
              <option value="todas">Todos los hostales</option>
              {propiedadesDisp.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Botón */}
          <div className="flex flex-col gap-1 justify-end">
            <button type="submit"
              className="px-4 py-2 bg-[var(--brand)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--brand-dark)] transition-colors">
              Aplicar
            </button>
          </div>
        </div>

        {proyectos.length === 0 && (
          <p className="mt-3 text-xs text-[var(--gray-500)]">
            No hay proyectos creados para tu empresa. El administrador puede crearlos desde el panel.
          </p>
        )}
      </form>

      {/* ── Gauge + KPIs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-widest mb-4">
            Ocupación {periodo === 'anual' ? 'anual' : 'del mes'}
          </p>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--gray-200)" strokeWidth="8"/>
              <circle cx="50" cy="50" r="45" fill="none"
                stroke={ocupPct >= 70 ? '#0B7E60' : '#2FBF8F'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-semibold text-[var(--ink)]">{ocupPct}%</span>
              <span className="text-xs text-[var(--gray-500)]">ocupado</span>
            </div>
          </div>
          <div className="mt-4 w-full space-y-1.5 text-xs text-[var(--gray-600)]">
            <div className="flex justify-between">
              <span>Camas disponibles</span>
              <span className="font-semibold text-[var(--ink)]">{camasTotal.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span>Camas usadas</span>
              <span className="font-semibold text-[var(--senal-dark)]">{camasUsadas.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span>Camas sin usar</span>
              <span className="font-semibold text-[var(--gray-400)]">{camasLibres.toLocaleString('es-CL')}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          {[
            { label:'Camas usadas',      value: camasUsadas,   sub:`${camasDisp} camas × ${diasPeriodo} días = ${camasTotal.toLocaleString('es-CL')} disponibles`, border:'border-t-[var(--brand)]' },
            { label:'Camas sin usar',    value: camasLibres,   sub:`${100-ocupPct}% de capacidad libre`, border:'border-t-[var(--senal)]' },
            { label:'Estadías del período', value: stays.length, sub:`${stays.filter(s=>!s.checked_out_at).length} activas al cierre`, border:'border-t-[var(--brand-light)]' },
            { label:'Días del período',  value: diasPeriodo,   sub:tituloPeriodo, border:'border-t-[var(--gray-300)]' },
          ].map(k => (
            <div key={k.label} className={`bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] border-t-4 ${k.border} p-5`}>
              <p className="font-display text-[1.875rem] font-semibold leading-none text-[var(--ink)] data-number">{k.value.toLocaleString('es-CL')}</p>
              <p className="text-sm font-medium text-[var(--gray-700)] mt-1">{k.label}</p>
              <p className="text-xs text-[var(--gray-500)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ocupación por hostal (solo si hay más de uno) ── */}
      {porPropiedad.length > 1 && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 mb-8">
          <h2 className="text-sm font-bold text-[var(--ink)] mb-5">Ocupación por hostal</h2>
          <div className="space-y-5">
            {porPropiedad.map(p => (
              <div key={p.nombre}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[var(--ink)]">{p.nombre}</span>
                  <div className="flex items-center gap-4 text-xs text-[var(--gray-600)]">
                    <span>{p.estadias} estadías · {p.usadas} / {p.camas * diasPeriodo} camas-{periodo === 'anual' ? 'año' : 'mes'}</span>
                    <span className={`font-bold text-base ${p.pct >= 70 ? 'text-[var(--ink)]' : 'text-[var(--senal-dark)]'}`}>
                      {p.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-[var(--gray-100)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p.pct >= 70 ? 'bg-[var(--brand)]' : 'bg-[var(--senal)]'}`}
                    style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Listado ── */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--ink)]">Estadías del período</h2>
          <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2.5 py-1 rounded-full font-medium">
            {stays.length} registros
          </span>
        </div>

        {!stays.length ? (
          <p className="px-6 py-10 text-center text-sm text-[var(--gray-500)]">
            No hay estadías para este período con los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                  {[
                    ['Nombre','w-[20%]','text-left'],['RUT','w-[12%]','text-left'],['Hostal','w-[16%]','text-left'],
                    ['Hab.','w-[9%]','text-left'],['Turno','w-[9%]','text-left'],['Ingreso','w-[9%]','text-left'],
                    ['Salida','w-[10%]','text-left'],['Noches','w-[7%]','text-right'],['Estado','w-[8%]','text-left'],
                  ].map(([h,w,a]) => (
                    <th key={h} className={`${w} ${a} px-3 py-3 text-xs font-semibold text-[var(--gray-600)]`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {stays.map(s => {
                  const g = s.guests as any
                  const r = s.rooms  as any
                  const n = noches(s)
                  return (
                    <tr key={s.id} className="hover:bg-[var(--gray-50)] transition-colors align-top">
                      <td className="px-3 py-3 font-semibold text-[var(--ink)] leading-snug">{g?.first_name} {g?.last_name_paterno}</td>
                      <td className="px-3 py-3 text-xs text-[var(--gray-500)] font-mono whitespace-nowrap">{g?.rut ?? '—'}</td>
                      <td className="px-3 py-3 font-medium text-[var(--gray-700)] leading-snug">{r?.properties?.name}</td>
                      <td className="px-3 py-3 text-[var(--gray-600)]">{r?.number}</td>
                      <td className="px-3 py-3 text-[var(--gray-600)] whitespace-nowrap">{s.shift_type ?? '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--gray-700)] tabular-nums">{fmt(s.checked_in_at)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-[var(--gray-700)] tabular-nums">
                        {s.checked_out_at ? fmt(s.checked_out_at) : <span className="text-[var(--senal-dark)] font-medium">Activo</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-[var(--ink)] tabular-nums">{n}</td>
                      <td className="px-3 py-3">
                        {s.checked_out_at
                          ? <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-500)] px-2 py-0.5 rounded-full">Completada</span>
                          : <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Activa</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <td colSpan={7} className="px-4 py-3 text-xs font-semibold text-[var(--gray-600)]">Total noches-huésped</td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--ink)]">{camasUsadas}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[var(--gray-400)] mt-6">
        {company?.name} · {PRODUCTO} · Generado el {now.toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })}
      </p>
    </div>
  )
}
