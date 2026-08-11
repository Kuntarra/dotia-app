import { createClient } from '@/lib/supabase/server'
import { updateRotacion, recalcularSiguientes } from '@/app/actions/rotaciones'
import { ArrowLeft, Plane, Save, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatRut } from '@/lib/rut'

const RIN = 'px-2.5 py-1.5 rounded-md border border-[var(--gray-200)] bg-[var(--surface)] text-xs text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'

interface Props {
  params: Promise<{ id: string; dotId: string }>
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  planificada: 'Planificada',
  en_vuelo_ida: 'En vuelo (ida)',
  arribo_aeropuerto: 'Arribo aeropuerto',
  en_transporte_ida: 'Transporte ida',
  en_hotel: 'En hotel',
  en_faena: 'En faena',
  check_out: 'Check-out',
  en_transporte_vuelta: 'Transporte vuelta',
  en_aeropuerto_vuelta: 'Aeropuerto vuelta',
  en_vuelo_vuelta: 'En vuelo (vuelta)',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
}

export default async function DotacionDetallePage({ params }: Props) {
  const { id, dotId } = await params
  const supabase = await createClient()

  const { data: dot } = await supabase
    .from('dotaciones')
    .select('id, turno_dias_trabajo, turno_dias_descanso, fecha_inicio_contrato, fecha_fin_contrato, estado, personas(nombres, apellido_paterno, apellido_materno, tipo_documento, numero_documento), oficios(nombre), proyectos(nombre)')
    .eq('id', dotId)
    .maybeSingle()

  if (!dot) notFound()

  const { data: rotaciones } = await supabase
    .from('rotaciones')
    .select('*')
    .eq('dotacion_id', dotId)
    .order('numero')

  // Bitácora compartida: eventos que registraron los proveedores y el equipo.
  const { data: eventos } = await supabase
    .from('eventos_bitacora')
    .select('id, modulo, tipo, detalle, autor_nombre, created_at')
    .eq('dotacion_id', dotId)
    .order('created_at', { ascending: false })
    .limit(50)

  const EVENTO_LABEL: Record<string, string> = {
    subio: 'Subió al transporte', dejado: 'Dejado', no_show: 'No se presentó',
    check_in: 'Check-in hotel', check_out: 'Check-out hotel', entregada: 'Entregada',
    recepcionada: 'Recepcionada', nota: 'Nota',
  }

  const p = dot.personas
  const nombre = p ? `${p.nombres} ${p.apellido_paterno}${p.apellido_materno ? ' ' + p.apellido_materno : ''}` : '—'
  const turno = dot.turno_dias_trabajo ? `${dot.turno_dias_trabajo}x${dot.turno_dias_descanso ?? 0}` : '—'

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/proyectos/${id}`} className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">{nombre}</h1>
          <p className="text-sm text-[var(--gray-600)]">
            {dot.oficios?.nombre ?? 'Sin oficio'} · {dot.proyectos?.nombre}
          </p>
        </div>
      </div>

      {/* Resumen del contrato */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { k: 'Documento', v: p?.tipo_documento === 'rut' ? formatRut(p.numero_documento) : (p?.numero_documento ?? '—') },
          { k: 'Turno', v: turno },
          { k: 'Inicio', v: dot.fecha_inicio_contrato ?? '—' },
          { k: 'Fin', v: dot.fecha_fin_contrato ?? '—' },
        ].map((s) => (
          <div key={s.k} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--gray-600)] font-semibold mb-1">{s.k}</p>
            <p className="text-sm font-semibold text-[var(--ink)] tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Rotaciones */}
      <h2 className="text-sm font-semibold text-[var(--ink)] mb-3">
        Rotaciones ({rotaciones?.length ?? 0})
      </h2>
      {!rotaciones?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Plane size={24} strokeWidth={1.5} stroke="var(--gray-600)" />
          </div>
          <p className="text-sm text-[var(--gray-600)]">
            Sin rotaciones. Revisa que la dotación tenga turno y fechas de contrato.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rotaciones.map((r) => {
            const guardar = updateRotacion.bind(null, id, dotId, r.id)
            const recalc = recalcularSiguientes.bind(null, id, dotId, r.numero)
            return (
              <div key={r.id} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center">{r.numero}</span>
                    <span className="badge badge-gray">{ESTADO_LABEL[r.estado_ciclo] ?? r.estado_ciclo}</span>
                    {r.ajustada_manual && <span className="badge badge-senal">ajustada</span>}
                  </div>
                  <form action={recalc}>
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--gray-100)]" title="Recalcular las rotaciones siguientes desde esta">
                      <RefreshCw size={12} strokeWidth={2.5} /> Recalcular siguientes
                    </button>
                  </form>
                </div>
                <form action={guardar} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-[var(--gray-600)] mb-0.5">Inicio</label>
                    <input type="date" name="fecha_inicio" defaultValue={r.fecha_inicio ?? undefined} className={`${RIN} w-full`} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-[var(--gray-600)] mb-0.5">Fin esperada</label>
                    <input type="date" name="fecha_fin_esperada" defaultValue={r.fecha_fin_esperada ?? undefined} className={`${RIN} w-full`} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-[var(--gray-600)] mb-0.5">Vuelo ida</label>
                    <input name="vuelo_ida_numero" defaultValue={r.vuelo_ida_numero ?? ''} placeholder="LA123" className={`${RIN} w-full`} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-[var(--gray-600)] mb-0.5">Fecha ida</label>
                    <input type="date" name="vuelo_ida_fecha" defaultValue={r.vuelo_ida_fecha ?? undefined} className={`${RIN} w-full`} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-[var(--gray-600)] mb-0.5">Vuelo vuelta</label>
                    <input name="vuelo_vuelta_numero" defaultValue={r.vuelo_vuelta_numero ?? ''} placeholder="LA456" className={`${RIN} w-full`} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-[var(--gray-600)] mb-0.5">Estado</label>
                    <select name="estado_ciclo" defaultValue={r.estado_ciclo} className={`${RIN} w-full`}>
                      {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-[var(--brand)] text-white text-xs font-semibold hover:bg-[var(--brand-dark)]">
                    <Save size={12} strokeWidth={2.5} /> Guardar
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      )}

      {/* Bitácora compartida (lo que registran los proveedores y el equipo) */}
      <h2 className="text-sm font-semibold text-[var(--ink)] mt-10 mb-3">Bitácora ({eventos?.length ?? 0})</h2>
      {!eventos?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-8 text-center text-sm text-[var(--gray-600)]">
          Sin actividad registrada todavía.
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)]">
          {eventos.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink)]">
                  {EVENTO_LABEL[e.tipo] ?? e.tipo}
                  <span className="ml-2 badge badge-gray capitalize">{e.modulo}</span>
                </p>
                {e.detalle && <p className="text-xs text-[var(--gray-600)] truncate">{e.detalle}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[var(--ink)] font-medium">{e.autor_nombre ?? '—'}</p>
                <p className="text-[11px] text-[var(--gray-500)] tabular-nums">{new Date(e.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
