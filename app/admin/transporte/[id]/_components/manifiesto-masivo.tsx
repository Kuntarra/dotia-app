'use client'

import { useState } from 'react'
import { UsersRound, Users, Plus } from 'lucide-react'

const INPUT = 'px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'

type Opt = { id: string; nombre: string }
type Scope = 'cuadrilla' | 'todos'

export function ManifiestoMasivo({ action, cuadrillas }: { action: (formData: FormData) => void; cuadrillas: Opt[] }) {
  const [scope, setScope] = useState<Scope>('cuadrilla')
  const [ref, setRef] = useState('')

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="scope" value={scope} />
      <div className="flex flex-wrap gap-2">
        {([['cuadrilla', 'Una cuadrilla', UsersRound], ['todos', 'Todos en faena', Users]] as const).map(([v, label, Icon]) => (
          <button type="button" key={v} onClick={() => { setScope(v); setRef('') }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${scope === v ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
            <Icon size={15} strokeWidth={2} /> {label}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-3">
        {scope === 'cuadrilla' ? (
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Cuadrilla</label>
            <select name="ref" required value={ref} onChange={(e) => setRef(e.target.value)} className={`${INPUT} w-full`}>
              <option value="" disabled>Selecciona…</option>
              {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {!cuadrillas.length && <p className="text-[11px] text-[var(--gray-500)] mt-1">No hay cuadrillas creadas.</p>}
          </div>
        ) : (
          <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--brand)]/5 text-sm text-[var(--ink)] font-medium">Todas las personas en faena en la fecha del traslado</div>
        )}
        <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg whitespace-nowrap"><Plus size={15} strokeWidth={2.25} /> Agregar al manifiesto</button>
      </div>
      <p className="text-[11px] text-[var(--gray-500)]">Solo planifica la lista (quién debería ir). No supera la capacidad del vehículo. El embarque se marca persona por persona abajo.</p>
    </form>
  )
}
