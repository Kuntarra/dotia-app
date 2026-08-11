import { INPUT, LABEL } from '@/lib/ui'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from "lucide-react"
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { City, Room, Property, PropertyType, PROPERTY_TYPE_LABELS, PROPERTY_TYPE_COLORS, ROOM_TYPE_LABELS } from '@/lib/types'
import { PropertyIcon } from '@/app/admin/_components/property-icon'
import { PropertyForm } from '../_components/property-form'
import { updateProperty, togglePropertyActive } from '@/app/actions/properties'
import { createRoom, deleteRoom } from '@/app/actions/rooms'
import { DeletePropertyButton } from '../_components/delete-property-button'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}


export default async function PropiedadDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { success, error } = await searchParams
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*, cities(id, name), rooms(*)')
    .eq('id', id)
    .single()

  if (!property) notFound()

  const { data: cities } = await supabase.from('cities').select('*').order('name')

  const rooms = (property.rooms ?? []) as Room[]
  const city = property.cities as City | null

  const updateWithId = updateProperty.bind(null, id)
  const createRoomWithId = createRoom.bind(null, id)
  const toggleActive = togglePropertyActive.bind(null, id, !property.active)

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/propiedades" className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <PropertyIcon type={property.type as PropertyType} size="sm" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">{property.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROPERTY_TYPE_COLORS[property.type as keyof typeof PROPERTY_TYPE_COLORS]}`}>
                {PROPERTY_TYPE_LABELS[property.type as keyof typeof PROPERTY_TYPE_LABELS]}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                property.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--gray-200)] text-[var(--gray-600)]'
              }`}>
                {property.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <p className="text-sm text-[var(--gray-600)]">{city?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <form action={toggleActive}>
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors">
              {property.active ? 'Desactivar' : 'Activar'}
            </button>
          </form>
          <DeletePropertyButton id={id} />
        </div>
      </div>

      {success && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Propiedad {success} correctamente.
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Formulario edición */}
      <div className="mb-10">
        <PropertyForm
          action={updateWithId}
          cities={cities as City[]}
          property={property as unknown as Property}
          cancelHref="/admin/propiedades"
          submitLabel="Guardar cambios"
        />
      </div>

      {/* Habitaciones */}
      <div id="habitaciones">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">
            Habitaciones
            <span className="ml-2 text-sm font-normal text-[var(--gray-600)]">
              ({rooms.length} registradas · {rooms.reduce((s, r) => s + r.capacity, 0)} cupos)
            </span>
          </h2>
        </div>

        {rooms.length > 0 ? (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Número</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Piso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Capacidad</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {rooms.map((room) => {
                  const deleteRoomAction = deleteRoom.bind(null, room.id, id)
                  return (
                    <tr key={room.id} className="hover:bg-[var(--gray-50)]">
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">{room.number}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">
                        {room.type ? ROOM_TYPE_LABELS[room.type as keyof typeof ROOM_TYPE_LABELS] : '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{room.floor ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{room.capacity}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteRoomAction}>
                          <button type="submit" className="text-xs text-red-500 hover:text-red-700 transition-colors">
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-8 text-center mb-4">
            <p className="text-sm text-[var(--gray-600)]">No hay habitaciones registradas.</p>
          </div>
        )}

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5">
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Agregar habitación</h3>
          <form action={createRoomWithId}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className={LABEL}>Número *</label>
                <input name="number" type="text" required placeholder="101" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Tipo</label>
                <select name="type" className={INPUT}>
                  <option value="">—</option>
                  <option value="single">Individual</option>
                  <option value="double">Doble</option>
                  <option value="triple">Triple</option>
                  <option value="suite">Suite</option>
                  <option value="shared">Compartido</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Piso</label>
                <input name="floor" type="number" min="1" placeholder="1" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Capacidad *</label>
                <input name="capacity" type="number" min="1" required defaultValue="1" className={INPUT} />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
              + Agregar habitación
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
