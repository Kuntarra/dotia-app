'use client'

import { useState } from 'react'
import { Property, Room, Project, PROPERTY_TYPE_LABELS, ROOM_TYPE_LABELS } from '@/lib/types'

interface PropertyWithRooms extends Omit<Property, 'cities'> {
  rooms: Room[]
  cities: { name: string }
}

interface Props {
  action: (formData: FormData) => Promise<void>
  properties: PropertyWithRooms[]
  projects: Project[]
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1.5'

export function AllocationForm({ action, properties, projects }: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState('')

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  const rooms = selectedProperty?.rooms ?? []
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0)

  return (
    <form action={action}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">

        {/* Proyecto */}
        <div className="md:col-span-2">
          <label className={LABEL}>Proyecto *</label>
          <select name="project_id" required className={INPUT}>
            <option value="">Seleccionar proyecto…</option>
            {projects.filter(p => p.active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Propiedad */}
        <div>
          <label className={LABEL}>Propiedad *</label>
          <select
            name="property_id"
            required
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
            className={INPUT}
          >
            <option value="">Seleccionar propiedad…</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {(p.cities as { name: string })?.name} ({PROPERTY_TYPE_LABELS[p.type]})
              </option>
            ))}
          </select>
        </div>

        {/* Habitación */}
        <div>
          <label className={LABEL}>Habitación *</label>
          <select name="room_id" required disabled={!selectedPropertyId} className={INPUT}>
            <option value="">
              {selectedPropertyId ? 'Seleccionar habitación…' : 'Primero elige una propiedad'}
            </option>

            {/* Opción para asignar toda la propiedad */}
            {rooms.length > 0 && (
              <option value={`ALL:${selectedPropertyId}`}>
                ★ Completa — {rooms.length} hab. · {totalCapacity} cupos
              </option>
            )}

            {/* Habitaciones individuales */}
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                Hab. {r.number}
                {r.type ? ` — ${ROOM_TYPE_LABELS[r.type]}` : ''}
                {` · ${r.capacity} cupo${r.capacity !== 1 ? 's' : ''}`}
                {r.floor ? ` · Piso ${r.floor}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Fecha inicio *</label>
          <input name="start_date" type="date" required className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Fecha fin estimada</label>
          <input name="end_date" type="date" className={INPUT} />
        </div>
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
      >
        + Agregar asignación
      </button>
    </form>
  )
}
