'use client'

import { useState } from 'react'
import { asignarPlanilla, asignarPlanillaMasivo } from '@/app/actions/modulos'
import { hoyChile } from '@/lib/fechas'
import { User, Users, UsersRound, UserPlus, X, Minus, Plus } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

type Opt = { id: string; nombre: string }
type Item = { id: string; nombre: string }
type Scope = 'persona' | 'cuadrilla' | 'todos'

const SCOPES: { v: Scope; label: string; Icon: typeof User }[] = [
  { v: 'persona', label: 'Una persona', Icon: User },
  { v: 'cuadrilla', label: 'Una cuadrilla', Icon: UsersRound },
  { v: 'todos', label: 'Todos en faena', Icon: Users },
]

interface Props {
  planillaId: string
  items: Item[]
  dotaciones: Opt[]
  cuadrillas: Opt[]
  entregaMap: Record<string, string>
  sigRotMap: Record<string, string>
}

export function AsignarPlanilla({ planillaId, items, dotaciones, cuadrillas, entregaMap, sigRotMap }: Props) {
  const hoy = hoyChile()
  const [abierto, setAbierto] = useState(false)
  const [scope, setScope] = useState<Scope>('persona')
  const [dotacion, setDotacion] = useState('')
  const [ref, setRef] = useState('')
  const [entrega, setEntrega] = useState(hoy)
  const [sigRot, setSigRot] = useState('')
  const [cant, setCant] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, 1])))

  const onPersona = (id: string) => { setDotacion(id); setEntrega(entregaMap[id] ?? hoy); setSigRot(sigRotMap[id] ?? '') }
  const set = (id: string, v: number) => setCant((c) => ({ ...c, [id]: Math.max(0, v) }))

  if (!items.length) {
    return <p className="text-[11px] text-[var(--gray-500)] mt-3">Agrega ítems a la planilla para poder asignarla.</p>
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--brand)]/30 text-[var(--ink)] text-sm font-semibold hover:bg-[var(--brand)]/5">
        <UserPlus size={15} strokeWidth={2} /> Asignar
      </button>
    )
  }

  const action = scope === 'persona' ? asignarPlanilla : asignarPlanillaMasivo

  return (
    <form action={action} className="mt-4 pt-4 border-t border-[var(--gray-200)] space-y-4">
      <input type="hidden" name="planilla_id" value={planillaId} />
      <input type="hidden" name="scope" value={scope} />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--ink)]">Asignar planilla</span>
        <button type="button" onClick={() => setAbierto(false)} className="text-[var(--gray-500)] hover:text-[var(--gray-700)]"><X size={16} /></button>
      </div>

      {/* Alcance */}
      <div>
        <span className={LABEL}>Aplicar a</span>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map(({ v, label, Icon }) => (
            <button type="button" key={v} onClick={() => { setScope(v); setRef('') }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${scope === v ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
              <Icon size={15} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Persona: selector + fechas editables */}
      {scope === 'persona' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Persona</label>
            <select name="dotacion_id" required value={dotacion} onChange={(e) => onPersona(e.target.value)} className={`${INPUT} w-full`}>
              <option value="" disabled>Selecciona…</option>
              {dotaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Fecha de entrega</label>
            <input type="date" name="fecha_entrega" value={entrega} onChange={(e) => setEntrega(e.target.value)} className={`${INPUT} w-full`} />
            <p className="text-[11px] text-[var(--gray-500)] mt-1">Normalmente el último día del turno.</p>
          </div>
          <div>
            <label className={LABEL}>Siguiente rotación</label>
            <input type="date" name="fecha_siguiente_rotacion" value={sigRot} onChange={(e) => setSigRot(e.target.value)} className={`${INPUT} w-full`} />
            <p className="text-[11px] text-[var(--gray-500)] mt-1">Devolución; confírmala con el huésped.</p>
          </div>
        </div>
      )}

      {/* Cuadrilla / Todos: selector + fecha de referencia (calcula turno por persona) */}
      {scope !== 'persona' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scope === 'cuadrilla' ? (
            <div>
              <label className={LABEL}>Cuadrilla</label>
              <select name="ref" required value={ref} onChange={(e) => setRef(e.target.value)} className={`${INPUT} w-full`}>
                <option value="" disabled>Selecciona…</option>
                {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {!cuadrillas.length && <p className="text-[11px] text-[var(--gray-500)] mt-1">No hay cuadrillas creadas.</p>}
            </div>
          ) : (
            <div>
              <label className={LABEL}>Alcance</label>
              <div className="px-3 py-2 rounded-lg bg-[var(--brand)]/5 text-sm text-[var(--ink)] font-medium">Todas las personas en faena en la fecha</div>
            </div>
          )}
          <div>
            <label className={LABEL}>Fecha de referencia (del turno)</label>
            <input type="date" name="fecha_ref" defaultValue={hoy} className={`${INPUT} w-full`} />
            <p className="text-[11px] text-[var(--gray-500)] mt-1">Entrega y devolución se calculan del turno de cada persona.</p>
          </div>
        </div>
      )}

      {/* Cantidades (iguales para todos en masivo) */}
      <div>
        <label className={LABEL}>Cantidades de la bolsa{scope !== 'persona' ? ' (para cada persona)' : ''}</label>
        <div className="rounded-xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)]">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-[var(--gray-700)]">{it.nombre}</span>
              <input type="hidden" name="item_nombre" value={it.nombre} />
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => set(it.id, (cant[it.id] ?? 0) - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]"><Minus size={14} /></button>
                <input name="item_cantidad" type="number" min={0} value={cant[it.id] ?? 0} onChange={(e) => set(it.id, parseInt(e.target.value || '0', 10))} className={`${INPUT} w-16 text-center`} />
                <button type="button" onClick={() => set(it.id, (cant[it.id] ?? 0) + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]"><Plus size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">
        {scope === 'persona' ? 'Grabar asignación' : 'Asignar a todos'}
      </button>
    </form>
  )
}
