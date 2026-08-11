import { createClient } from '@/lib/supabase/server'
import { modulosActivosTenant } from '@/lib/tenant'
import { crearExcepcion, actualizarEstadoExcepcion } from '@/app/actions/excepciones'
import { SubmitButton } from '@/app/_components/submit-button'
import { MODULOS } from '@/lib/modulos'
import { formatRut } from '@/lib/rut'
import { TriangleAlert, Filter } from 'lucide-react'
import Link from 'next/link'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

const TIPO_LABEL: Record<string, string> = {
  no_llego: 'No se presentó / no llegó',
  sin_planificacion: 'Llegó sin planificación',
  diferencia_cantidad: 'Diferencia de cantidad',
  no_entregado: 'Servicio no entregado / falla',
}
const ESTADO_LABEL: Record<string, string> = { abierta: 'Abierta', en_revision: 'En revisión', resuelta: 'Resuelta', rechazada: 'Rechazada' }
const ESTADO_BADGE: Record<string, string> = { abierta: 'badge-senal', en_revision: 'badge', resuelta: 'badge-green', rechazada: 'badge-gray' }
const MOD_LABEL = Object.fromEntries(MODULOS.map((m) => [m.k, m.label]))
const FILTROS = [['', 'Todas'], ['abierta', 'Abiertas'], ['en_revision', 'En revisión'], ['resuelta', 'Resueltas'], ['rechazada', 'Rechazadas']] as const

export default async function ExcepcionesPage({ searchParams }: { searchParams: Promise<{ estado?: string; success?: string; error?: string }> }) {
  const { estado: filtro, success, error } = await searchParams
  const supabase = await createClient()

  const [modulosActivos, { data: proyectos }, { data: dir }] = await Promise.all([
    modulosActivosTenant(),
    supabase.from('proyectos').select('id, nombre').order('created_at', { ascending: false }),
    supabase.from('persona_directorio').select('persona_id, personas(nombres, apellido_paterno, tipo_documento, numero_documento)').eq('activa', true),
  ])

  let q = supabase
    .from('excepciones')
    .select('id, modulo, tipo, estado, descripcion, resolucion, responsable_nombre, created_at, personas(nombres, apellido_paterno)')
    .order('created_at', { ascending: false })
  if (filtro) q = q.eq('estado', filtro)
  const { data: excepciones } = await q

  const modulos = MODULOS.filter((m) => modulosActivos.includes(m.k))
  const personas = (dir ?? []).map((d) => {
    const p = d.personas as unknown as { nombres: string; apellido_paterno: string; tipo_documento: string; numero_documento: string } | null
    return { id: d.persona_id, nombre: p ? `${p.nombres} ${p.apellido_paterno}` : d.persona_id, doc: p ? (p.tipo_documento === 'rut' ? formatRut(p.numero_documento) : p.numero_documento) : '' }
  })

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shrink-0">
          <TriangleAlert size={19} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Excepciones</h1>
          <p className="text-sm text-[var(--gray-600)]">Desvíos de la operación: se abren, se revisan y se resuelven (conservan historial).</p>
        </div>
      </div>

      {success && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success === 'creada' ? 'Excepción registrada.' : 'Excepción actualizada.'}</div>}
      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

      {/* Nueva excepción */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--ink)] mb-3">Registrar excepción</h2>
        <form action={crearExcepcion} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Tipo</label>
            <select name="tipo" className={`${INPUT} w-full`} defaultValue="no_llego">
              {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Módulo</label>
            <select name="modulo" className={`${INPUT} w-full`} defaultValue={modulos[0]?.k ?? ''}>
              {modulos.map((m) => <option key={m.k} value={m.k}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Persona (opcional)</label>
            <select name="persona_id" className={`${INPUT} w-full`} defaultValue="">
              <option value="">—</option>
              {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.doc}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Proyecto (opcional)</label>
            <select name="proyecto_id" className={`${INPUT} w-full`} defaultValue="">
              <option value="">—</option>
              {(proyectos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Descripción</label>
            <input name="descripcion" placeholder="Qué pasó (ej. 18 raciones entregadas de 20 requeridas)" className={`${INPUT} w-full`} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Abrir excepción</button>
          </div>
        </form>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-[var(--gray-500)]" />
        {FILTROS.map(([v, l]) => (
          <Link key={v} href={v ? `/admin/excepciones?estado=${v}` : '/admin/excepciones'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${(filtro ?? '') === v ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
            {l}
          </Link>
        ))}
      </div>

      {/* Lista */}
      {!excepciones?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center text-sm text-[var(--gray-600)]">
          No hay excepciones{filtro ? ' con ese estado' : ''}. 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {excepciones.map((e) => {
            const persona = e.personas as unknown as { nombres: string; apellido_paterno: string } | null
            const cerrar = actualizarEstadoExcepcion.bind(null, e.id)
            return (
              <div key={e.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${ESTADO_BADGE[e.estado] ?? 'badge-gray'}`}>{ESTADO_LABEL[e.estado] ?? e.estado}</span>
                      <span className="text-sm font-semibold text-[var(--ink)]">{TIPO_LABEL[e.tipo] ?? e.tipo}</span>
                      <span className="text-xs text-[var(--gray-500)]">· {MOD_LABEL[e.modulo] ?? e.modulo}</span>
                    </div>
                    <p className="text-xs text-[var(--gray-600)] mt-1">
                      {persona ? `${persona.nombres} ${persona.apellido_paterno} · ` : ''}
                      {new Date(e.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {e.descripcion && <p className="text-sm text-[var(--ink)] mt-2">{e.descripcion}</p>}
                    {e.resolucion && <p className="text-xs text-[var(--gray-600)] mt-1"><strong>Resolución:</strong> {e.resolucion}{e.responsable_nombre ? ` — ${e.responsable_nombre}` : ''}</p>}
                  </div>
                </div>
                {e.estado !== 'resuelta' && e.estado !== 'rechazada' && (
                  <form action={cerrar} className="flex items-end gap-2 mt-3 pt-3 border-t border-[var(--gray-100)] flex-wrap">
                    <div>
                      <label className={LABEL}>Cambiar a</label>
                      <select name="estado" className={INPUT} defaultValue={e.estado === 'abierta' ? 'en_revision' : 'resuelta'}>
                        <option value="en_revision">En revisión</option>
                        <option value="resuelta">Resuelta</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
                    </div>
                    <input name="responsable_nombre" placeholder="Responsable" className={`${INPUT} w-32`} />
                    <input name="resolucion" placeholder="Nota / resolución" className={`${INPUT} flex-1 min-w-[160px]`} />
                    <SubmitButton pendingText="…" className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Guardar</SubmitButton>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
