import { createClient } from '@/lib/supabase/server'
import { toggleColacionEntregada, gestionarColaciones } from '@/app/actions/modulos'
import { ColacionesForm } from './_components/colaciones-form'
import { AutoColaciones } from './_components/auto-colaciones'
import { puedeGestionar } from '@/lib/rbac'
import { hoyChile } from '@/lib/fechas'
import { Package, Check, Sparkles, LogIn, LogOut, CalendarDays } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; generadas?: string; sugfecha?: string; sugmodo?: string; sugscope?: string; sugref?: string }> }

const PUNTO_LABEL: Record<string, string> = {
  origen: 'Origen', aeropuerto_llegada: 'Aeropuerto llegada', transporte_ida: 'Transporte ida',
  hotel: 'Hotel', transporte_vuelta: 'Transporte vuelta', aeropuerto_salida: 'Aeropuerto salida', otro: 'Otro',
}

export default async function ColacionesPage({ searchParams }: Props) {
  const { error, generadas, sugfecha, sugmodo, sugscope, sugref } = await searchParams
  const supabase = await createClient()
  const sugFecha = sugfecha || hoyChile()
  const sugModo: 'inicio_fin' | 'todos' = sugmodo === 'todos' ? 'todos' : 'inicio_fin'
  const sugScope: 'persona' | 'cuadrilla' | 'todos' = sugscope === 'persona' || sugscope === 'cuadrilla' ? sugscope : 'todos'
  const sugRef = sugref || ''
  const refOk = sugScope === 'todos' || !!sugRef
  const puedeEscribir = await puedeGestionar('colaciones')

  // Preview en vivo (p_generar=false). En inicio_fin desglosamos entran/se van
  // llamando la función por separado; en 'todos' es el total de días en faena.
  let entran = 0, sevan = 0, cubreDia = 0
  if (puedeEscribir && refOk) {
    if (sugModo === 'inicio_fin') {
      const [{ data: e }, { data: s }] = await Promise.all([
        supabase.rpc('gestionar_colaciones_dia' as never, { p_fecha: sugFecha, p_modo: 'entrada', p_scope: sugScope, p_ref: sugRef || null, p_generar: false } as never),
        supabase.rpc('gestionar_colaciones_dia' as never, { p_fecha: sugFecha, p_modo: 'salida', p_scope: sugScope, p_ref: sugRef || null, p_generar: false } as never),
      ])
      entran = Number(e) || 0; sevan = Number(s) || 0
    } else {
      const { data: t } = await supabase.rpc('gestionar_colaciones_dia' as never, { p_fecha: sugFecha, p_modo: 'todos', p_scope: sugScope, p_ref: sugRef || null, p_generar: false } as never)
      cubreDia = Number(t) || 0
    }
  }
  const totalGen = sugModo === 'inicio_fin' ? entran + sevan : cubreDia
  const sugLabel = new Date(sugFecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'short' })
  const [{ data: colaciones }, { data: dotacionesRaw }, { data: cuadrillasRaw }] = await Promise.all([
    supabase.from('colaciones').select('*, proyectos(nombre), dotaciones(personas(nombres, apellido_paterno))').order('fecha', { ascending: false }).limit(150),
    supabase.from('dotaciones').select('id, personas(nombres, apellido_paterno)').order('created_at', { ascending: false }),
    supabase.from('cuadrillas').select('id, nombre').eq('activa', true).order('nombre'),
  ])
  const dotaciones = (dotacionesRaw ?? []).map((d) => {
    const p = d.personas as { nombres: string; apellido_paterno: string } | null
    return { id: d.id, nombre: p ? `${p.nombres} ${p.apellido_paterno}` : d.id }
  })
  const cuadrillas = (cuadrillasRaw ?? []).map((c) => ({ id: c.id, nombre: c.nombre }))

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Módulo</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Colaciones frías</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Entregas en cualquier punto del ciclo</p>
      </div>

      <div className="px-8 pb-8">
        {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {generadas !== undefined && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Generadas <strong>{generadas}</strong> {Number(generadas) === 1 ? 'colación' : 'colaciones'}.</div>}

        {/* Automático por TURNO: deriva las colaciones de las rotaciones, no del bus */}
        {puedeEscribir && (
        <div className="bg-gradient-to-br from-[var(--brand)]/[0.04] to-white rounded-xl border border-[var(--brand)]/15 p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} strokeWidth={2} className="text-[var(--senal-dark)]" />
            <h2 className="text-sm font-semibold text-[var(--ink)]">Automático por turno</h2>
          </div>
          <p className="text-xs text-[var(--gray-600)] mb-4">El sistema lee los turnos (rotaciones) y calcula las colaciones del día. Elige qué generar y para quién; lo apruebas con un clic.</p>

          <AutoColaciones fecha={sugFecha} modo={sugModo} scope={sugScope} refId={sugRef} dotaciones={dotaciones} cuadrillas={cuadrillas} />

          {/* Requerimiento del día + generar */}
          <div className="mt-5 pt-5 border-t border-[var(--gray-200)] flex flex-wrap items-end justify-between gap-5">
            <div className="flex-1 min-w-[14rem]">
              {!refOk ? (
                <p className="text-sm text-[var(--gray-600)]">Selecciona {sugScope === 'persona' ? 'una persona' : 'una cuadrilla'} para ver el requerimiento.</p>
              ) : sugModo === 'inicio_fin' ? (
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span className="inline-flex items-center gap-2 text-sm text-[var(--gray-700)]">
                    <LogIn size={16} strokeWidth={2} className="text-emerald-600" />
                    <strong className="font-display text-xl text-[var(--ink)]">{entran}</strong> {entran === 1 ? 'entra' : 'entran'} <span className="text-[var(--gray-500)]">(entrada)</span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm text-[var(--gray-700)]">
                    <LogOut size={16} strokeWidth={2} className="text-amber-600" />
                    <strong className="font-display text-xl text-[var(--ink)]">{sevan}</strong> se {sevan === 1 ? 'va' : 'van'} <span className="text-[var(--gray-500)]">(salida)</span>
                  </span>
                  <span className="text-xs text-[var(--gray-500)] basis-full capitalize">{sugLabel}</span>
                </div>
              ) : (
                <p className="text-sm text-[var(--gray-700)] leading-snug">
                  <CalendarDays size={16} strokeWidth={2} className="inline text-[var(--ink)] mr-1.5 align-text-bottom" />
                  <strong className="font-display text-xl text-[var(--ink)] align-middle">{cubreDia}</strong>{' '}
                  <span className="capitalize">{cubreDia === 1 ? 'persona en faena' : 'personas en faena'} el {sugLabel}.</span>
                </p>
              )}
            </div>
            {totalGen > 0 && (
              <form action={gestionarColaciones}>
                <input type="hidden" name="fecha" value={sugFecha} />
                <input type="hidden" name="modo" value={sugModo} />
                <input type="hidden" name="scope" value={sugScope} />
                <input type="hidden" name="ref" value={sugScope === 'todos' ? '' : sugRef} />
                <button type="submit" className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg whitespace-nowrap">
                  Generar {totalGen} {totalGen === 1 ? 'colación' : 'colaciones'}
                </button>
              </form>
            )}
          </div>
        </div>
        )}

        {puedeEscribir && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">Generar colaciones manualmente</h2>
          <ColacionesForm dotaciones={dotaciones} cuadrillas={cuadrillas} />
        </div>
        )}

        {!colaciones?.length ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
            <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3"><Package size={24} strokeWidth={1.5} stroke="var(--gray-600)" /></div>
            <p className="text-sm text-[var(--gray-600)]">Sin colaciones registradas</p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Persona</th>
                  <th className="px-5 py-3 font-semibold">Punto</th>
                  <th className="px-5 py-3 font-semibold">Sentido</th>
                  <th className="px-5 py-3 font-semibold">Cant.</th>
                  <th className="px-5 py-3 font-semibold">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {colaciones.map((c) => {
                  const toggle = toggleColacionEntregada.bind(null, c.id, !c.entregada)
                  return (
                    <tr key={c.id} className="border-b border-[var(--gray-100)] last:border-0">
                      <td className="px-5 py-3.5 tabular-nums text-[var(--gray-600)]">{c.fecha ?? '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-[var(--ink)]">{(() => { const p = (c.dotaciones as { personas: { nombres: string; apellido_paterno: string } | null } | null)?.personas; return p ? `${p.nombres} ${p.apellido_paterno}` : '—' })()}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{PUNTO_LABEL[c.punto_entrega] ?? c.punto_entrega}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{c.sentido}</td>
                      <td className="px-5 py-3.5 tabular-nums font-medium text-[var(--ink)]">{c.cantidad}</td>
                      <td className="px-5 py-3.5">
                        {puedeEscribir ? (
                          <form action={toggle}>
                            <button className={`badge ${c.entregada ? 'badge-green' : 'badge-gray'} hover:opacity-80`}>
                              {c.entregada ? <span className="inline-flex items-center gap-1"><Check size={11} strokeWidth={3} /> Entregada</span> : 'Marcar entregada'}
                            </button>
                          </form>
                        ) : (
                          <span className={`badge ${c.entregada ? 'badge-green' : 'badge-gray'}`}>{c.entregada ? 'Entregada' : 'Pendiente'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
