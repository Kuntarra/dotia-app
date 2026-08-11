'use client'

import { crearTarifa } from '@/app/actions/costos'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

// Módulos facturables + unidad sugerida (editable por el usuario).
const MODS: { k: string; label: string; unidad: string }[] = [
  { k: 'hotel', label: 'Alojamiento', unidad: 'cama/noche' },
  { k: 'transporte', label: 'Transporte', unidad: 'pasajero' },
  { k: 'alimentacion', label: 'Alimentación', unidad: 'ración' },
  { k: 'colaciones', label: 'Colaciones', unidad: 'colación' },
  { k: 'lavanderia', label: 'Lavandería', unidad: 'bolsa' },
]

export function TarifaForm({ hoy }: { hoy: string }) {
  return (
    <form action={crearTarifa} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div>
        <label className={LABEL}>Módulo</label>
        <select name="modulo" className={`${INPUT} w-full`} defaultValue="hotel"
          onChange={(e) => {
            const u = MODS.find((m) => m.k === e.target.value)?.unidad ?? ''
            const input = e.currentTarget.form?.elements.namedItem('unidad') as HTMLInputElement | null
            if (input && !input.dataset.touched) input.value = u
          }}>
          {MODS.map((m) => <option key={m.k} value={m.k}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL}>Unidad</label>
        <input name="unidad" defaultValue="cama/noche" className={`${INPUT} w-full`}
          onInput={(e) => { e.currentTarget.dataset.touched = '1' }} />
      </div>
      <div>
        <label className={LABEL}>Tarifa (CLP)</label>
        <input name="tarifa_clp" type="number" min="0" step="1" required placeholder="0" className={`${INPUT} w-full`} />
      </div>
      <div>
        <label className={LABEL}>Vigente desde</label>
        <div className="flex gap-2">
          <input name="vigencia_desde" type="date" defaultValue={hoy} className={`${INPUT} flex-1`} />
          <button type="submit" className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg whitespace-nowrap">Guardar</button>
        </div>
      </div>
    </form>
  )
}
