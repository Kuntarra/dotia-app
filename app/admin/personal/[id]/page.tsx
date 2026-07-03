import { createClient } from '@/lib/supabase/server'
import { crearAccesoPersona, guardarPermisos } from '@/app/actions/acceso'
import { setPersonaActiva } from '@/app/actions/personal'
import { moverPersonaCuadrilla, crearCuadrilla } from '@/app/actions/cuadrillas'
import { SubmitButton } from '@/app/_components/submit-button'
import { ArrowLeft, IdCard, Phone, Globe, Cake, ShieldAlert, FolderKanban, Lock, KeyRound, Save, CheckCircle2, Power, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatRut } from '@/lib/rut'
import { MODULOS } from '@/lib/modulos'
import { modulosActivosTenant } from '@/lib/tenant'
import { hoyChile, sumarDias } from '@/lib/fechas'
import { BitacoraTimeline } from './_components/bitacora-timeline'
import { TrazaLinea } from './_components/traza-linea'

interface Props { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string; fecha?: string }> }

export default async function FichaPersonaPage({ params, searchParams }: Props) {
  const { id } = await params
  const { success, error, fecha: fechaParam } = await searchParams
  const supabase = await createClient()

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!persona) notFound()

  // ¿El que mira es administración? (solo ella cambia el estado de la persona)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: prof } = user
    ? await supabase.from('user_profiles').select('role, is_super_admin').eq('id', user.id).maybeSingle()
    : { data: null }
  const esAdmin = prof?.role === 'admin' || !!prof?.is_super_admin

  const [{ data: dir }, { data: dotaciones }, { data: login }, { data: eventos }, { data: cuadrillas }] = await Promise.all([
    supabase.from('persona_directorio').select('activa, cuadrilla_id, oficios(nombre)').eq('persona_id', id).maybeSingle(),
    supabase
      .from('dotaciones')
      .select('id, proyecto_id, estado, turno_dias_trabajo, turno_dias_descanso, proyectos(nombre)')
      .eq('persona_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('id, email').eq('persona_id', id).maybeSingle(),
    supabase
      .from('eventos_bitacora')
      .select('id, modulo, tipo, detalle, autor_nombre, created_at, proyectos(nombre)')
      .eq('persona_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('cuadrillas').select('id, nombre').eq('activa', true).order('nombre'),
  ])

  const eventosVivos = (eventos ?? []).map((e) => ({
    id: e.id, modulo: e.modulo, tipo: e.tipo, detalle: e.detalle,
    autor_nombre: e.autor_nombre, created_at: e.created_at,
    proyectos: e.proyectos as { nombre: string } | null,
  }))

  // Línea de trazabilidad por PUNTO (lugar) del día seleccionado: bajo cada lugar
  // se apila lo que la persona tiene planificado ahí (pernocta, comidas según su
  // posición hotel/faena, colación, lavandería). El transporte conecta lugares.
  const fechaTraza = fechaParam || hoyChile()
  const dayStart = fechaTraza + 'T00:00:00'
  const dayEnd = fechaTraza + 'T23:59:59'
  const dotIds = (dotaciones ?? []).map((d) => d.id)

  const [alimRes, staysRes, colRes, lavRes, tpRes, evtRes, excRes, rotRes] = dotIds.length
    ? await Promise.all([
        supabase.from('plan_alimentacion').select('desayuno, almuerzo, cena').in('dotacion_id', dotIds).eq('fecha', fechaTraza),
        supabase.from('stays').select('id').in('dotacion_id', dotIds).lte('checked_in_at', dayEnd).or(`checked_out_at.is.null,checked_out_at.gte.${fechaTraza}`),
        supabase.from('colaciones').select('id, punto_entrega, entregada').in('dotacion_id', dotIds).eq('fecha', fechaTraza),
        supabase.from('lavanderia_bolsas').select('id').in('dotacion_id', dotIds).eq('fecha_entrega', fechaTraza),
        supabase.from('traslado_pasajeros').select('subio_at, traslados!inner(fecha, origen)').eq('persona_id', id).eq('traslados.fecha', fechaTraza),
        supabase.from('eventos_bitacora').select('modulo').eq('persona_id', id).gte('created_at', dayStart).lte('created_at', dayEnd),
        supabase.from('excepciones').select('modulo').eq('persona_id', id).in('estado', ['abierta', 'en_revision']).gte('created_at', dayStart).lte('created_at', dayEnd),
        supabase.from('rotaciones').select('dotacion_id, fecha_inicio, fecha_fin_esperada, vuelo_ida_numero, vuelo_ida_fecha, vuelo_ida_hora').in('dotacion_id', dotIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const confSet = new Set((evtRes.data ?? []).map((e) => (e as { modulo: string }).modulo))
  const excSet = new Set((excRes.data ?? []).map((e) => (e as { modulo: string }).modulo))
  const estadoDe = (mod: string): 'planificado' | 'confirmado' | 'excepcion' =>
    excSet.has(mod) ? 'excepcion' : confSet.has(mod) ? 'confirmado' : 'planificado'

  // Comidas por posición (hotel / faena) desde plan_alimentacion.
  const COMIDA = [['desayuno', 'Desayuno'], ['almuerzo', 'Almuerzo'], ['cena', 'Cena']] as const
  const comidasEn = (pos: string) => {
    const out: string[] = []
    for (const [campo, label] of COMIDA) {
      if ((alimRes.data ?? []).some((r) => (r as Record<string, string>)[campo] === pos)) out.push(label)
    }
    return out
  }

  // Parada AEROPUERTO: aparece cuando ese día hay vuelo de ida (rotación) o
  // colación de llegada. Sus estados salen del dato puntual (no del módulo/día).
  type Rot = { dotacion_id: string; fecha_inicio: string | null; fecha_fin_esperada: string | null; vuelo_ida_numero: string | null; vuelo_ida_fecha: string | null; vuelo_ida_hora: string | null }
  const rots = (rotRes.data ?? []) as Rot[]
  const colaciones = (colRes.data ?? []) as { id: string; punto_entrega: string; entregada: boolean }[]
  const colAeropuerto = colaciones.filter((c) => c.punto_entrega.startsWith('aeropuerto'))
  const colFaena = colaciones.filter((c) => !c.punto_entrega.startsWith('aeropuerto'))
  const vueloHoy = rots.find((r) => r.vuelo_ida_fecha === fechaTraza)
  // Traslados del día, separados por tramo: el de llegada viene del aeropuerto.
  type Tp = { subio_at: string | null; traslados: { fecha: string; origen: string | null } }
  const tps = (tpRes.data ?? []) as unknown as Tp[]
  const tpsLlegada = tps.filter((t) => (t.traslados?.origen ?? '').toLowerCase().includes('aeropuerto'))
  const tpsFaena = tps.filter((t) => !(t.traslados?.origen ?? '').toLowerCase().includes('aeropuerto'))
  const llegadaConfirmada = tpsLlegada.some((t) => t.subio_at !== null)

  const aeroActs = [
    ...(vueloHoy ? [{ label: `Vuelo ${vueloHoy.vuelo_ida_numero ?? ''}${vueloHoy.vuelo_ida_hora ? ` · ${vueloHoy.vuelo_ida_hora.slice(0, 5)}` : ''}`.trim(), icon: 'vuelo', estado: (llegadaConfirmada ? 'confirmado' : 'planificado') as 'confirmado' | 'planificado' }] : []),
    ...(colAeropuerto.length ? [{ label: 'Colación de llegada', icon: 'colacion', estado: (colAeropuerto.some((c) => c.entregada) ? 'confirmado' : 'planificado') as 'confirmado' | 'planificado' }] : []),
  ]
  const alojActs = [
    ...((staysRes.data ?? []).length ? [{ label: 'Pernocta', icon: 'pernocta', estado: estadoDe('hotel') }] : []),
    ...comidasEn('hotel').map((l) => ({ label: l, icon: 'comida', estado: estadoDe('alimentacion') })),
    ...((lavRes.data ?? []).length ? [{ label: 'Lavandería', icon: 'lavanderia', estado: estadoDe('lavanderia') }] : []),
  ]
  const faenaActs = [
    ...comidasEn('faena').map((l) => ({ label: l, icon: 'comida', estado: estadoDe('alimentacion') })),
    ...comidasEn('colacion').map((l) => ({ label: `${l} (vianda)`, icon: 'colacion', estado: estadoDe('alimentacion') })),
    ...(colFaena.length ? [{ label: 'Colación', icon: 'colacion', estado: estadoDe('colaciones') }] : []),
  ]
  const puntos = [
    ...(aeroActs.length ? [{ key: 'aero', nombre: 'Aeropuerto', icon: 'aeropuerto' as const, actividades: aeroActs }] : []),
    ...(alojActs.length ? [{ key: 'aloj', nombre: 'Alojamiento', icon: 'aloj' as const, actividades: alojActs }] : []),
    ...(faenaActs.length ? [{ key: 'faena', nombre: 'Faena', icon: 'faena' as const, actividades: faenaActs }] : []),
  ]
  // Un tramo de transporte por cada par de paradas consecutivas.
  const tramos = puntos.slice(1).map((_, g) => {
    const desde = puntos[g].key
    const grupo = desde === 'aero' ? tpsLlegada : tpsFaena
    return { hay: grupo.length > 0, confirmado: grupo.some((t) => t.subio_at !== null) }
  })

  // Clasificación del día cuando NO hay servicios: descanso CONFIRMADO por la
  // rotación (entre el fin de una rotación y sus días de descanso pactados),
  // día en turno sin planificar, o sin información. "No todos son descansos".
  const descansoDias = new Map((dotaciones ?? []).map((d) => [d.id, d.turno_dias_descanso ?? 0]))
  const enTurno = rots.some((r) => r.fecha_inicio && r.fecha_fin_esperada && r.fecha_inicio <= fechaTraza && fechaTraza <= r.fecha_fin_esperada)
  let estadoDia: 'trabajo' | 'descanso' | 'sin_info' = enTurno ? 'trabajo' : 'sin_info'
  let vuelveEl: string | null = null
  let turnoLabel: string | null = null
  if (!enTurno) {
    for (const r of rots) {
      if (!r.fecha_fin_esperada || r.fecha_fin_esperada >= fechaTraza) continue
      const d = descansoDias.get(r.dotacion_id) ?? 0
      if (d > 0 && fechaTraza <= sumarDias(r.fecha_fin_esperada, d)) {
        estadoDia = 'descanso'
        const dot = (dotaciones ?? []).find((x) => x.id === r.dotacion_id)
        turnoLabel = dot?.turno_dias_trabajo ? `${dot.turno_dias_trabajo}x${dot.turno_dias_descanso ?? 0}` : null
        // Vuelve: la próxima rotación agendada si existe; si no, fin + descanso + 1.
        const prox = rots.filter((x) => x.fecha_inicio && x.fecha_inicio > fechaTraza).sort((a, b) => a.fecha_inicio!.localeCompare(b.fecha_inicio!))[0]
        vuelveEl = prox?.fecha_inicio ?? sumarDias(r.fecha_fin_esperada, d + 1)
        break
      }
    }
  }

  // Permisos actuales (alcance general) del login de la persona
  const permisos: Record<string, string> = {}
  if (login) {
    const { data: ums } = await supabase.from('user_modulos').select('modulo, nivel').eq('user_id', login.id).is('proyecto_id', null)
    for (const u of ums ?? []) permisos[u.modulo] = u.nivel
  }
  const crearAcceso = crearAccesoPersona.bind(null, id)
  const guardarPerms = guardarPermisos.bind(null, id)
  const toggleActiva = setPersonaActiva.bind(null, id, !(dir?.activa ?? true))
  const moverCuadrilla = moverPersonaCuadrilla.bind(null, id)
  const cuadrillaActual = (cuadrillas ?? []).find((c) => c.id === dir?.cuadrilla_id)?.nombre ?? null

  const nombre = `${persona.nombres} ${persona.apellido_paterno}${persona.apellido_materno ? ' ' + persona.apellido_materno : ''}`
  const doc = persona.tipo_documento === 'rut' ? formatRut(persona.numero_documento) : persona.numero_documento
  const oficio = (dir?.oficios as unknown as { nombre: string } | null)?.nombre

  const datos = [
    { icon: <IdCard size={15} strokeWidth={1.75} />, label: 'Documento', value: `${doc} (${persona.tipo_documento})` },
    { icon: <Phone size={15} strokeWidth={1.75} />, label: 'Teléfono', value: persona.telefono ?? '—' },
    { icon: <Globe size={15} strokeWidth={1.75} />, label: 'Nacionalidad', value: persona.nacionalidad ?? '—' },
    { icon: <Cake size={15} strokeWidth={1.75} />, label: 'Fecha de nacimiento', value: persona.fecha_nacimiento ?? '—' },
    { icon: <ShieldAlert size={15} strokeWidth={1.75} />, label: 'Contacto de emergencia', value: persona.contacto_emergencia_nombre ? `${persona.contacto_emergencia_nombre}${persona.contacto_emergencia_telefono ? ' · ' + persona.contacto_emergencia_telefono : ''}` : '—' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/personal" className="text-[var(--gray-600)] hover:text-[var(--ink)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--amber)] flex items-center justify-center shrink-0">
            <span className="text-[var(--ink)] text-sm font-black uppercase">{persona.nombres.slice(0, 1)}{persona.apellido_paterno.slice(0, 1)}</span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">{nombre}</h1>
            <p className="text-sm text-[var(--gray-600)]">
              {doc}{oficio ? ` · ${oficio}` : ''}
              {dir && <span className={`ml-2 badge ${dir.activa ? 'badge-green' : 'badge-gray'}`}>{dir.activa ? 'Activa' : 'Inactiva'}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Datos de la persona</h2>
          <div className="flex items-center gap-3">
            {success === 'editado' && <span className="text-xs text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={13} strokeWidth={2} /> Datos actualizados</span>}
            {esAdmin && <Link href={`/admin/personal/${id}/editar`} className="text-xs font-semibold text-[var(--ink)] hover:underline">Editar</Link>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {datos.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-[var(--gray-600)]">{d.icon}</span>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--gray-600)] font-semibold">{d.label}</p>
                <p className="text-sm text-[var(--ink)]">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estado en el directorio (solo administración) */}
      {esAdmin && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Estado en el directorio</h2>
              <span className={`badge ${dir?.activa ? 'badge-green' : 'badge-gray'}`}>{dir?.activa ? 'Activa' : 'Inactiva'}</span>
              {success === 'estado' && <span className="text-xs text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={13} strokeWidth={2} /> Estado actualizado</span>}
            </div>
            <p className="text-xs text-[var(--gray-600)] mt-1">
              {dir?.activa
                ? 'Activa — continúa en la rotación de turnos.'
                : 'Inactiva — sigue en la base de datos, pero fuera de la rotación de turnos.'}
            </p>
          </div>
          <form action={toggleActiva}>
            <SubmitButton pendingText="Guardando…"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${dir?.activa ? 'bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-[var(--gray-100)]' : 'bg-[var(--navy)] text-white hover:bg-[var(--navy-dark)]'}`}>
              <Power size={15} strokeWidth={2.25} /> {dir?.activa ? 'Marcar inactiva' : 'Reactivar'}
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Cuadrilla global (solo administración/planificación) */}
      {esAdmin && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <UsersRound size={15} strokeWidth={2} className="text-[var(--ink)]" />
            <h2 className="text-sm font-semibold text-[var(--ink)]">Cuadrilla</h2>
            {cuadrillaActual && <span className="badge badge-green">{cuadrillaActual}</span>}
            {success === 'cuadrilla' && <span className="text-xs text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={13} strokeWidth={2} /> Actualizada</span>}
          </div>
          <p className="text-xs text-[var(--gray-600)] mb-3">La cuadrilla es propia de la persona (no del proyecto) y se aplica a sus asignaciones activas.</p>
          <form action={moverCuadrilla} className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Asignar a</label>
              <select name="cuadrilla_id" defaultValue={dir?.cuadrilla_id ?? ''} className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]">
                <option value="">— Sin cuadrilla —</option>
                {(cuadrillas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <SubmitButton pendingText="Guardando…" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">
              <Save size={14} strokeWidth={2.25} /> Guardar
            </SubmitButton>
          </form>
          <details className="mt-3">
            <summary className="text-xs text-[var(--gray-500)] cursor-pointer hover:text-[var(--ink)]">Crear una cuadrilla nueva</summary>
            <form action={crearCuadrilla} className="flex items-end gap-2 mt-2 flex-wrap">
              <input type="hidden" name="back" value={`/admin/personal/${id}`} />
              <input name="nombre" placeholder="Cuadrilla A" className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" required />
              <SubmitButton pendingText="Creando…" className="px-4 py-2 bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-[var(--gray-100)] text-sm font-semibold rounded-lg">Crear</SubmitButton>
            </form>
          </details>
        </div>
      )}

      {/* Línea de trazabilidad por lugar: qué hace la persona en cada punto */}
      <TrazaLinea puntos={puntos} tramos={tramos} fecha={fechaTraza} personaId={id} estadoDia={estadoDia} turnoLabel={turnoLabel} vuelveEl={vuelveEl} />

      {/* Bitácora viva: timeline de eventos en terreno */}
      <BitacoraTimeline eventos={eventosVivos} />

      {/* Proyectos donde está asignada */}
      <h2 className="text-sm font-semibold text-[var(--ink)] mb-3">Proyectos asignados ({dotaciones?.length ?? 0})</h2>
      {!dotaciones?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-8 text-center text-sm text-[var(--gray-600)] mb-6">
          <FolderKanban size={22} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--gray-600)]" />
          Aún no está asignada a ningún proyecto
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)] mb-6">
          {dotaciones.map((d) => (
            <Link key={d.id} href={`/admin/proyectos/${d.proyecto_id}/dotacion/${d.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--gray-100)]/50">
              <span className="text-sm font-medium text-[var(--ink)]">{(d.proyectos as unknown as { nombre: string } | null)?.nombre ?? 'Sin proyecto'}</span>
              <span className="text-xs text-[var(--gray-600)]">
                {d.turno_dias_trabajo ? `${d.turno_dias_trabajo}x${d.turno_dias_descanso ?? 0}` : '—'} · {d.estado}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Acceso y permisos */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={15} strokeWidth={2} className="text-[var(--ink)]" />
          <h2 className="text-sm font-semibold text-[var(--ink)]">Acceso y permisos</h2>
        </div>

        {success === 'acceso' && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Acceso creado. Ahora marca sus permisos por módulo.</div>}
        {success === 'permisos' && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Permisos guardados.</div>}
        {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

        {!login ? (
          /* Paso A: crear el acceso */
          <form action={crearAcceso} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Correo de acceso</label>
              <input id="email" name="email" type="email" required placeholder="persona@empresa.cl" className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Clave (mín. 6)</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} placeholder="clave inicial" className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
            </div>
            <SubmitButton pendingText="Creando acceso…" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">
              <KeyRound size={15} strokeWidth={2.25} /> Crear acceso
            </SubmitButton>
            <p className="md:col-span-3 text-xs text-[var(--gray-600)]">Esto crea el usuario para que esta persona pueda iniciar sesión. Luego marcas sus módulos y nivel.</p>
          </form>
        ) : (
          /* Paso B: marcar permisos por módulo */
          <>
            <p className="text-xs text-[var(--gray-600)] mb-4 flex items-center gap-1.5">
              <CheckCircle2 size={13} strokeWidth={2} className="text-green-600" /> Acceso activo: <strong className="text-[var(--ink)]">{login.email}</strong>
            </p>
            <form action={guardarPerms} className="space-y-2">
              {MODULOS.map((m) => {
                const activo = permisos[m.k] !== undefined
                return (
                  <div key={m.k} className="flex items-center gap-3 py-1.5">
                    <label className="flex items-center gap-2 w-40 shrink-0 cursor-pointer">
                      <input type="checkbox" name={`mod_${m.k}`} defaultChecked={activo} className="w-4 h-4 accent-[var(--navy)]" />
                      <span className="text-sm text-[var(--ink)] font-medium">{m.label}</span>
                    </label>
                    <select name={`nivel_${m.k}`} defaultValue={permisos[m.k] ?? 'visor'} className="px-3 py-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]">
                      <option value="admin_modulo">Supervisor de módulo</option>
                      <option value="actuador">Revisor</option>
                      <option value="visor">Visualizador</option>
                    </select>
                  </div>
                )
              })}
              <SubmitButton pendingText="Guardando…" className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">
                <Save size={15} strokeWidth={2.25} /> Guardar permisos
              </SubmitButton>
              <p className="text-xs text-[var(--gray-600)] mt-1">Marca el módulo y elige el nivel. El alcance (todo el proyecto o solo el módulo) lo aplica el sistema según el tipo de empresa.</p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
