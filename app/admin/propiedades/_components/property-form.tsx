'use client'

import { INPUT, LABEL } from '@/lib/ui'
import { useState } from 'react'
import Link from 'next/link'
import { City, Property, PropertyType, PROPERTY_TYPE_LABELS, SERVICES_BY_TYPE, Services } from '@/lib/types'
import { PropertyIcon } from '@/app/admin/_components/property-icon'
import { Check } from 'lucide-react'

interface Props {
  action: (formData: FormData) => Promise<void>
  cities: City[]
  property?: Property
  cancelHref: string
  submitLabel: string
}


export function PropertyForm({ action, cities, property, cancelHref, submitLabel }: Props) {
  const [type, setType] = useState<PropertyType>(property?.type ?? 'hotel')
  const [parkingChecked, setParkingChecked] = useState(property?.services?.parking ?? false)

  const services = SERVICES_BY_TYPE[type]
  const currentServices = (property?.services ?? {}) as Partial<Services>

  return (
    <form action={action} className="space-y-6">

      {/* Tipo + preview del ícono */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
        <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Tipo de propiedad</h2>

        <div className="grid grid-cols-3 gap-4">
          {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
            <label
              key={t}
              className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                type === t
                  ? 'border-[var(--brand)] bg-[var(--brand)]/5'
                  : 'border-[var(--gray-200)] hover:border-[var(--gray-200)] hover:bg-[var(--gray-50)]'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
                required
              />
              <PropertyIcon type={t} size="sm" />
              <span className={`text-xs font-semibold ${type === t ? 'text-[var(--ink)]' : 'text-[var(--gray-600)]'}`}>
                {PROPERTY_TYPE_LABELS[t]}
              </span>
              {type === t && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--brand)]" />
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Información general */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
        <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Información general</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="name" className={LABEL}>Nombre *</label>
            <input
              id="name" name="name" type="text" required
              defaultValue={property?.name ?? ''}
              placeholder={`${PROPERTY_TYPE_LABELS[type]} Sol Iquique`}
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="city_id" className={LABEL}>Ciudad *</label>
            <select id="city_id" name="city_id" required defaultValue={property?.city_id ?? ''} className={INPUT}>
              <option value="">Seleccionar ciudad…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="floors" className={LABEL}>Número de pisos</label>
            <input
              id="floors" name="floors" type="number" min="1" max="50"
              defaultValue={property?.floors ?? ''}
              placeholder="4"
              className={INPUT}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address" className={LABEL}>Dirección</label>
            <input
              id="address" name="address" type="text"
              defaultValue={property?.address ?? ''}
              placeholder="Av. Arturo Prat 123, Iquique"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* Servicios contextuales */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
        <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Servicios</h2>

        {/* Aseo siempre incluido en hotel/hostal — sin mostrar */}
        {(type === 'hotel' || type === 'hostal') && (
          <input type="hidden" name="cleaning" value="on" />
        )}

        <div className="space-y-3">
          {services.map((svc) => {
            if (svc.alwaysIncluded) {
              return (
                <div key={svc.key} className="flex items-center gap-3 px-4 py-3 bg-[var(--gray-50)] rounded-lg">
                  <input type="hidden" name={svc.key} value="on" />
                  <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check size={11} strokeWidth={2.5} className="text-white" />
                  </div>
                  <span className="text-sm text-[var(--gray-900)]">{svc.label}</span>
                  <span className="ml-auto text-xs text-emerald-600 font-medium">Siempre incluido</span>
                </div>
              )
            }

            const isParking = svc.key === 'parking'
            const checked = isParking ? parkingChecked : (currentServices[svc.key] ?? false)

            return (
              <div key={svc.key} className="rounded-lg border border-[var(--gray-200)] overflow-hidden">
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--gray-50)] transition-colors">
                  <input
                    type="checkbox"
                    name={svc.key}
                    defaultChecked={checked as boolean}
                    onChange={isParking ? (e) => setParkingChecked(e.target.checked) : undefined}
                    className="w-4 h-4 rounded border-[var(--gray-200)] accent-[var(--brand)] cursor-pointer"
                  />
                  <span className="text-sm text-[var(--gray-900)] font-medium">{svc.label}</span>
                </label>

                {/* Campo de cantidad para estacionamiento */}
                {isParking && parkingChecked && (
                  <div className="px-4 pb-4 pt-1 border-t border-[var(--gray-100)] bg-[var(--gray-50)]">
                    <label className="block text-xs font-medium text-[var(--gray-600)] mb-1.5">
                      Cantidad de estacionamientos disponibles
                    </label>
                    <input
                      name="parking_spots"
                      type="number"
                      min="1"
                      max="500"
                      defaultValue={currentServices.parking_spots ?? 1}
                      placeholder="20"
                      className="w-32 px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)] transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
