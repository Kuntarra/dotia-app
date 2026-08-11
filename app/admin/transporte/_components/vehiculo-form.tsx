'use client'

import { useState } from 'react'
import { createVehiculo } from '@/app/actions/transporte'
import { TIPOS_VEHICULO } from '@/lib/vehiculos'

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

export function VehiculoForm() {
  const [tipo, setTipo] = useState(TIPOS_VEHICULO[0].key)
  const cfg = TIPOS_VEHICULO.find((t) => t.key === tipo) ?? TIPOS_VEHICULO[0]
  const [cap, setCap] = useState(cfg.def)

  function onTipo(k: string) {
    setTipo(k)
    const c = TIPOS_VEHICULO.find((t) => t.key === k) ?? TIPOS_VEHICULO[0]
    setCap(c.def) // al cambiar de tipo, sugiere su capacidad por defecto
  }

  return (
    <form action={createVehiculo} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div>
        <label htmlFor="tipo" className={LABEL}>Tipo</label>
        <select id="tipo" name="tipo" className={INPUT} value={tipo} onChange={(e) => onTipo(e.target.value)}>
          {TIPOS_VEHICULO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label htmlFor="identificador" className={LABEL}>Patente / nombre</label>
        <input id="identificador" name="identificador" className={INPUT} placeholder="GHJK-12" />
      </div>
      <div>
        <label htmlFor="capacidad" className={LABEL}>Capacidad <span className="text-[var(--gray-500)] font-normal">(máx {cfg.max})</span></label>
        <input
          id="capacidad" name="capacidad" type="number" min={1} max={cfg.max}
          value={cap}
          onChange={(e) => {
            const v = Number(e.target.value)
            setCap(Number.isFinite(v) ? Math.min(cfg.max, Math.max(1, Math.trunc(v))) : 1)
          }}
          className={INPUT}
        />
      </div>
      <button type="submit" className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Agregar</button>
    </form>
  )
}
