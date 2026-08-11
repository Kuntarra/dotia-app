import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Property, PROPERTY_TYPE_LABELS } from '@/lib/types'
import { PropertyIcon } from '@/app/admin/_components/property-icon'
import { Plus, Building2, ArrowRight } from 'lucide-react'

export default async function PropiedadesPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('*, cities(id, name), rooms(id, capacity)')
    .order('name')

  const CITY_ORDER = ['Iquique', 'Antofagasta', 'Calama']

  const grouped = (properties ?? []).reduce<Record<string, Property[]>>((acc, p) => {
    const city = (p.cities as { name: string } | null)?.name ?? 'Sin ciudad'
    if (!acc[city]) acc[city] = []
    acc[city].push(p as unknown as Property)
    return acc
  }, {})

  const sortedCities = Object.keys(grouped).sort((a, b) => {
    const ai = CITY_ORDER.indexOf(a)
    const bi = CITY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const totalProps = properties?.length ?? 0
  const totalCapacity = (properties ?? []).reduce((sum, p) => {
    const rooms = p.rooms as { capacity: number }[] | null ?? []
    return sum + rooms.reduce((s, r) => s + r.capacity, 0)
  }, 0)

  return (
    <div>
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-8 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Inventario</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Propiedades</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {totalProps} propiedades · {totalCapacity} cupos totales
          </p>
        </div>
        <Link href="/admin/propiedades/nueva" className="btn-primary shrink-0">
          <Plus size={16} strokeWidth={2.25} />
          Nueva propiedad
        </Link>
      </div>

      <div className="px-8 pb-8">
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-16 text-center">
          <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} strokeWidth={1.5} stroke="var(--gray-600)" />
          </div>
          <p className="text-[var(--gray-600)] text-sm font-medium mb-1">No hay propiedades registradas</p>
          <p className="text-[var(--gray-600)] text-xs mb-4">Comienza agregando tu primera propiedad</p>
          <Link href="/admin/propiedades/nueva" className="text-[var(--ink)] text-sm font-semibold hover:underline">
            Crear primera propiedad →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedCities.map(city => { const props = grouped[city]!; return (
            <div key={city}>
              <div className="flex items-center gap-3 mb-5">
                <span className="section-label !mb-0">{city}</span>
                <div className="flex-1 h-px bg-[var(--gray-200)]" />
                <span className="text-xs text-[var(--gray-500)] font-medium">{props.length} {props.length === 1 ? 'propiedad' : 'propiedades'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {props.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
                {/* Card "Expandir Portafolio" */}
                <Link href="/admin/propiedades/nueva"
                  className="rounded-2xl border-2 border-dashed border-[var(--gray-300)] hover:border-[var(--brand)]/40
                             hover:bg-[var(--brand-5)] transition-all duration-200 group
                             flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[160px]">
                  <div className="w-11 h-11 rounded-xl bg-[var(--gray-100)] group-hover:bg-[var(--brand)] group-hover:text-white
                                  flex items-center justify-center text-[var(--gray-500)] transition-all duration-200">
                    <Building2 size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--brand-light)] transition-colors">
                      Expandir Portafolio
                    </p>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5 leading-snug">
                      Registrar nueva propiedad en {city}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )})}
        </div>
      )}
      </div>
    </div>
  )
}

function PropertyCard({ property: p }: { property: Property & { rooms?: { capacity: number }[]; cities?: { name: string } } }) {
  const rooms = (p.rooms ?? []) as { capacity: number }[]
  const capacity = rooms.reduce((s, r) => s + r.capacity, 0)

  return (
    <Link href={`/admin/propiedades/${p.id}`}
      className="premium-card group block overflow-hidden">
      {/* Banda superior amber si activa */}
      {p.active && <div className="h-0.5 bg-[var(--senal)]" />}
      <div className="px-6 pt-5 pb-4 flex items-start gap-4">
        <PropertyIcon type={p.type} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[var(--gray-500)] uppercase tracking-[0.12em] mb-0.5">
            {PROPERTY_TYPE_LABELS[p.type]}
          </p>
          <h3 className="text-[15px] font-bold text-[var(--ink)] group-hover:text-[var(--brand-light)] leading-tight truncate transition-colors">
            {p.name}
          </h3>
          {p.address && (
            <p className="text-xs text-[var(--gray-600)] mt-1 truncate leading-snug">{p.address}</p>
          )}
        </div>
        <span className={`badge shrink-0 ${p.active ? 'badge-green' : 'badge-gray'}`}>
          {p.active ? 'Activa' : 'Inactiva'}
        </span>
      </div>
      <div className="px-6 py-3.5 border-t border-[var(--gray-100)] bg-[var(--gray-50)] flex items-center gap-6">
        <Stat label="Hab." value={rooms.length} />
        <Stat label="Cupos" value={capacity} />
        {p.floors ? <Stat label="Pisos" value={p.floors} /> : null}
        <div className="ml-auto text-[var(--gray-400)] group-hover:text-[var(--ink)] transition-colors">
          <ArrowRight size={14} strokeWidth={2} />
        </div>
      </div>
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-[var(--ink)]">{value}</p>
      <p className="text-xs text-[var(--gray-600)]">{label}</p>
    </div>
  )
}
