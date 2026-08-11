import { createClient } from '@/lib/supabase/server'
import { addPasajero, addPasajerosMasivo, marcarPasajero, togglePasajeroTramo, updateTrasladoEstado } from '@/app/actions/transporte'
import { getTraslado, listDotacionesCandidatas, listPasajeros, listTramos, listCuadrillaOptions, listPasajeroTramoLinks } from '@/lib/data/transporte'
import { ManifiestoMasivo } from './_components/manifiesto-masivo'
import { puedeGestionar } from '@/lib/rbac'
import { ArrowLeft, Plus, Check, MapPin, X, Plane, Bus, Car, Footprints, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; agregados?: string; fuera?: string }>
}

const INPUT = 'px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const PAX_BADGE: Record<string, string> = {
  asignado: 'badge-gray', subio: 'badge-senal', dejado: 'badge-green', no_show: 'badge-gray',
}
const PAX_LABEL: Record<string, string> = {
  asignado: 'Asignado', subio: 'A bordo', dejado: 'Dejado', no_show: 'No se presentó',
}

export default async function TrasladoDetallePage({ params, searchParams }: Props) {
  const { id } = await params
  const { error, agregados, fuera } = await searchParams
  const supabase = await createClient()

  const t = await getTraslado(supabase, id)
  if (!t) notFound()

  // Dotaciones candidatas (del proyecto si lo hay) + pasajeros + tramos + cuadrillas
  const [dotaciones, pasajeros, tramos, cuadrillas] = await Promise.all([
    listDotacionesCandidatas(supabase, t.proyecto_id),
    listPasajeros(supabase, id),
    listTramos(supabase, id),
    listCuadrillaOptions(supabase),
  ])

  const MODO_META: Record<string, { label: string; Icon: typeof Plane }> = {
    vuelo: { label: 'Vuelo', Icon: Plane }, bus: { label: 'Bus', Icon: Bus },
    auto: { label: 'Auto', Icon: Car }, caminata: { label: 'A pie', Icon: Footprints }, otro: { label: 'Otro', Icon: MoreHorizontal },
  }

  // En qué tramos va cada pasajero (movilización multimodal)
  const links = tramos.length ? await listPasajeroTramoLinks(supabase, tramos.map((tr) => tr.id)) : []
  const asignados = new Map<string, Set<string>>()
  for (const l of links) {
    if (!asignados.has(l.pasajero_id)) asignados.set(l.pasajero_id, new Set())
    asignados.get(l.pasajero_id)!.add(l.tramo_id)
  }

  const addPax = addPasajero.bind(null, id)
  const addPaxMasivo = addPasajerosMasivo.bind(null, id)
  const setEstado = updateTrasladoEstado.bind(null, id)
  const veh = t.vehiculos as unknown as { tipo: string; identificador: string | null; capacidad: number } | null
  const puedeEscribir = await puedeGestionar('transporte')

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/transporte" className="text-[var(--gray-600)] hover:text-[var(--ink)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">
            {[t.origen, t.destino].filter(Boolean).join(' → ') || 'Traslado'}
          </h1>
          <p className="text-sm text-[var(--gray-600)]">
            {t.tipo === 'diario' ? 'Diario a faena' : 'Movilización'} · {t.sentido} · {t.fecha ?? 's/fecha'}{t.hora ? ` ${(t.hora as string).slice(0,5)}` : ''}
            {(t.proyectos as unknown as { nombre: string } | null)?.nombre ? ` · ${(t.proyectos as unknown as { nombre: string }).nombre}` : ''}
            {veh ? ` · ${veh.tipo}${veh.identificador ? ' ' + veh.identificador : ''} (cap. ${veh.capacidad})` : ''}
          </p>
        </div>
        {puedeEscribir && (
          <form action={setEstado} className="flex items-center gap-2 shrink-0">
            <select name="estado" defaultValue={t.estado} className={INPUT}>
              <option value="planificado">Planificado</option>
              <option value="en_curso">En curso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <button type="submit" className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--gray-100)]">Cambiar</button>
          </form>
        )}
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
      {agregados && Number(agregados) > 0 && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Se agregaron <strong>{agregados}</strong> {Number(agregados) === 1 ? 'pasajero' : 'pasajeros'} al manifiesto.{fuera ? ` ${fuera} quedaron fuera por capacidad del vehículo.` : ''}</div>}
      {(!agregados || Number(agregados) === 0) && fuera && <div className="mb-6 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">No se agregó a nadie: <strong>{fuera}</strong> quedaron fuera por la capacidad del vehículo (ya está lleno).</div>}

      {/* Tramos del viaje (movilización multimodal) */}
      {tramos.length > 0 && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">Tramos del viaje</h2>
          <ol className="relative">
            {tramos.map((tr, i) => {
              const meta = MODO_META[tr.modo] ?? MODO_META.otro
              const { Icon } = meta
              const last = i === tramos.length - 1
              return (
                <li key={tr.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {!last && <span className="absolute left-[19px] top-11 bottom-0 w-px bg-[var(--gray-200)]" aria-hidden />}
                  <span className="relative z-10 w-10 h-10 rounded-xl bg-[var(--brand)]/5 text-[var(--ink)] ring-4 ring-white flex items-center justify-center shrink-0">
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {meta.label}: {[tr.origen, tr.destino].filter(Boolean).join(' → ') || '—'}
                    </p>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5 tabular-nums">
                      {[tr.fecha, tr.hora ? (tr.hora as string).slice(0, 5) : null].filter(Boolean).join(' · ') || 'Sin fecha'}
                      {tr.notas ? ` · ${tr.notas}` : ''}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Agregar pasajero */}
      {puedeEscribir && (
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5 mb-6">
        <form action={addPax} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="dotacion_id" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Agregar pasajero</label>
            <select id="dotacion_id" name="dotacion_id" required className={`${INPUT} w-full`} defaultValue="">
              <option value="" disabled>Selecciona persona…</option>
              {(dotaciones ?? []).map((d) => {
                const p = d.personas as unknown as { nombres: string; apellido_paterno: string } | null
                return <option key={d.id} value={d.id}>{p ? `${p.nombres} ${p.apellido_paterno}` : d.id}</option>
              })}
            </select>
          </div>
          <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg"><Plus size={15} strokeWidth={2.25} /> Agregar</button>
        </form>
        {!dotaciones?.length && (
          <p className="text-xs text-[var(--gray-600)] mt-2">No hay personas asignadas{t.proyecto_id ? ' a este proyecto' : ''}. Asígnalas en Proyectos primero.</p>
        )}

        {/* Planificación masiva del manifiesto (NO es embarque) */}
        <div className="mt-5 pt-5 border-t border-[var(--gray-100)]">
          <p className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wide mb-3">Agregar varios (planificación)</p>
          <ManifiestoMasivo action={addPaxMasivo} cuadrillas={cuadrillas} />
        </div>
      </div>
      )}

      {/* Manifiesto */}
      <h2 className="text-sm font-semibold text-[var(--ink)] mb-3">Pasajeros ({pasajeros?.length ?? 0})</h2>
      {!pasajeros?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-10 text-center text-sm text-[var(--gray-600)]">Sin pasajeros aún</div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)]">
          {pasajeros.map((px) => {
            const p = px.personas as unknown as { nombres: string; apellido_paterno: string } | null
            const subio = marcarPasajero.bind(null, id, px.id, 'subio')
            const dejado = marcarPasajero.bind(null, id, px.id, 'dejado')
            const noShow = marcarPasajero.bind(null, id, px.id, 'no_show')
            return (
              <div key={px.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)] truncate">{p ? `${p.nombres} ${p.apellido_paterno}` : '—'}</p>
                  <span className={`badge ${PAX_BADGE[px.estado] ?? 'badge-gray'}`}>{PAX_LABEL[px.estado] ?? px.estado}</span>
                  {tramos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tramos.map((tr) => {
                        const on = asignados.get(px.id)?.has(tr.id) ?? false
                        const meta = MODO_META[tr.modo] ?? MODO_META.otro
                        const chip = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${on ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-500)] border-[var(--gray-200)]'}`
                        if (!puedeEscribir) {
                          return on ? <span key={tr.id} className={chip}><meta.Icon size={11} strokeWidth={2} /> {meta.label}</span> : null
                        }
                        const toggle = togglePasajeroTramo.bind(null, id, px.id, tr.id)
                        return (
                          <form action={toggle} key={tr.id}>
                            <button className={`${chip} ${on ? 'hover:opacity-80' : 'hover:bg-[var(--gray-100)]'}`} title={`${on ? 'Quitar de' : 'Asignar a'} ${meta.label}`}>
                              <meta.Icon size={11} strokeWidth={2} /> {meta.label}
                            </button>
                          </form>
                        )
                      })}
                    </div>
                  )}
                </div>
                {puedeEscribir && (
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={subio}><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--senal)]/15 text-[var(--senal-dark)] text-xs font-semibold hover:bg-[var(--senal)]/25" title="Marcar a bordo"><Check size={13} strokeWidth={2.5} /> Subió</button></form>
                    <form action={dejado}><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200" title="Marcar dejado"><MapPin size={13} strokeWidth={2.5} /> Dejado</button></form>
                    <form action={noShow}><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--gray-100)] text-[var(--gray-600)] text-xs font-semibold hover:bg-[var(--gray-200)]" title="No se presentó"><X size={13} strokeWidth={2.5} /></button></form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
