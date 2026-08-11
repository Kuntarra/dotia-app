import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getMyTenantId } from '@/lib/tenant'
import Link from 'next/link'
import { CheckoutButton } from '../_components/checkout-button'
import { RecepcionSearchBar } from '../_components/search-bar'
import { Phone, Clock } from 'lucide-react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; q?: string }>
}) {
  const params      = await searchParams
  const q           = params.q?.trim() ?? ''
  const effectiveId = await getEffectiveUserId()
  const tenantId    = await getMyTenantId()
  const supabase    = createAdminClient()

  // Propiedades asignadas al recepcionista
  const { data: rpRows } = await supabase
    .from('receptionist_properties')
    .select('property_id, properties(id, name)')
    .eq('user_id', effectiveId)
    .eq('tenant_id', tenantId)

  const myProperties = (rpRows ?? []).map(r => {
    const p = r.properties as unknown as { id: string; name: string } | null
    return { id: p?.id ?? r.property_id, name: p?.name ?? r.property_id }
  })

  const selectedPropertyId = params.property ?? null
  const showFilter = myProperties.length > 1

  // Buscar por nombre, RUT o número de habitación
  let guestIds: string[] | null = null
  let roomIds:  string[] | null = null

  if (q) {
    const [{ data: guests }, { data: rooms }] = await Promise.all([
      supabase.from('guests').select('id')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.%${q}%,last_name_paterno.ilike.%${q}%,rut.ilike.%${q}%`)
        .limit(200),
      supabase.from('rooms').select('id')
        .eq('tenant_id', tenantId)
        .ilike('number', `%${q}%`)
        .limit(100),
    ])
    guestIds = (guests ?? []).map(g => g.id)
    roomIds  = (rooms  ?? []).map(r => r.id)
  }

  // Estadías activas
  let query = supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, estimated_checkout, notes,
      guests(id, first_name, last_name_paterno, rut, phone),
      rooms(id, number, floor, property_id, properties(id, name)),
      companies(name)
    `)
    .eq('tenant_id', tenantId)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: true })

  if (guestIds !== null) {
    const allIds = [
      ...guestIds.map(id => `guest_id.eq.${id}`),
      ...(roomIds ?? []).map(id => `room_id.eq.${id}`),
    ]
    if (allIds.length === 0) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      query = query.or(allIds.join(','))
    }
  }

  const { data: staysRaw } = await query

  // Filtrar por propiedad
  const stays = (staysRaw ?? []).filter(s => {
    const room = s.rooms as unknown as { property_id: string } | null
    if (selectedPropertyId && room?.property_id !== selectedPropertyId) return false
    return true
  })

  const nombre = (s: typeof stays[0]) => {
    const g = s.guests as any
    return `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim()
  }

  return (
    <div>
      {/* ── Header premium ── */}
      <div className="mb-6">
        <span className="section-label">Recepción</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Check-out</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          {stays.length} huésped{stays.length !== 1 ? 'es' : ''} pendiente{stays.length !== 1 ? 's' : ''}
          {q && <span className="ml-1 text-[var(--ink)] font-medium">· "{q}"</span>}
        </p>
      </div>

      {/* ── Buscador + filtros ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <RecepcionSearchBar defaultValue={q || undefined} />

        {showFilter && !q && (
          <div className="flex gap-1.5 bg-[var(--surface)] border border-[var(--gray-200)] rounded-xl p-1">
            <Link href="/recepcion/checkout"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !selectedPropertyId
                  ? 'bg-[var(--brand)] text-white shadow-[var(--shadow-xs)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--ink)] hover:bg-[var(--gray-50)]'
              }`}>
              Todos
            </Link>
            {myProperties.map(p => (
              <Link key={p.id} href={`/recepcion/checkout?property=${p.id}`}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPropertyId === p.id
                    ? 'bg-[var(--brand)] text-white shadow-[var(--shadow-xs)]'
                    : 'text-[var(--gray-600)] hover:text-[var(--ink)] hover:bg-[var(--gray-50)]'
                }`}>
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {!stays.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-sm text-[var(--gray-600)]">
            {q
              ? `No se encontró ningún huésped con "${q}".`
              : selectedPropertyId
                ? 'No hay huéspedes activos en esta propiedad.'
                : 'No hay huéspedes activos para hacer check-out.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {stays.map(stay => {
            const guest   = stay.guests   as unknown as { first_name: string; last_name_paterno: string; rut: string | null; phone?: string } | null
            const room    = stay.rooms    as unknown as { number: string; floor: number | null; property_id: string; properties: { name: string } | null } | null
            const company = stay.companies as unknown as { name: string } | null
            const n       = nombre(stay)
            const initials = n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            const isOverdue = stay.estimated_checkout
              ? new Date(stay.estimated_checkout) < new Date()
              : false

            return (
              <div key={stay.id}
                className={`bg-[var(--surface)] rounded-2xl border overflow-hidden shadow-[var(--shadow-xs)]
                            hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200
                            ${isOverdue ? 'border-red-200' : 'border-[var(--gray-200)]'}`}>
                {/* Top accent */}
                <div className={`h-0.5 ${isOverdue ? 'bg-red-400' : 'bg-gradient-to-r from-[var(--brand)] via-[var(--senal)] to-[var(--brand)]'}`} />

                <div className="p-5 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-[var(--brand)]'}`}>
                    <span className={`text-xs font-bold ${isOverdue ? 'text-red-700' : 'text-white'}`}>{initials || '?'}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[var(--ink)] text-sm leading-tight">
                        {q ? <Highlight text={n} q={q} /> : n}
                      </p>
                      {isOverdue && <span className="badge badge-red">Vencido</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                      <span className="text-xs font-medium text-[var(--gray-700)]">
                        Hab.&nbsp;{q && room?.number ? <Highlight text={room.number} q={q} /> : room?.number}
                        {room?.floor != null ? ` · Piso ${room.floor}` : ''}
                      </span>
                      {(!selectedPropertyId || q) && room?.properties?.name && (
                        <span className="text-xs text-[var(--gray-500)]">{room.properties.name}</span>
                      )}
                      {company?.name && <span className="text-xs text-[var(--gray-500)]">{company.name}</span>}
                      {stay.shift_type && <span className="text-[11px] text-[var(--gray-500)]">Turno {stay.shift_type}</span>}
                      {guest?.rut && (
                        <span className="text-[11px] text-[var(--gray-500)] font-mono">
                          {q ? <Highlight text={guest.rut} q={q} /> : guest.rut}
                        </span>
                      )}
                      {guest?.phone && (
                        <span className="text-[11px] text-[var(--gray-500)] flex items-center gap-1">
                          <Phone size={11} strokeWidth={2} />
                          {guest.phone}
                        </span>
                      )}
                    </div>
                    {stay.notes && (
                      <p className="text-[11px] text-[var(--gray-500)] mt-1.5 italic truncate">{stay.notes}</p>
                    )}
                  </div>
                </div>

                <div className={`px-5 py-3 border-t flex items-center justify-between gap-3 ${isOverdue ? 'border-red-100 bg-red-50/60' : 'border-[var(--gray-100)] bg-[var(--gray-50)]'}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
                    <Clock size={12} strokeWidth={2} />
                    {formatDate(stay.checked_in_at)} · {daysAgo(stay.checked_in_at)}
                    {stay.estimated_checkout && (
                      <span className="ml-1">· Salida: {new Date(stay.estimated_checkout).toLocaleDateString('es-CL')}</span>
                    )}
                  </div>
                  <CheckoutButton stayId={stay.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Highlight({ text, q }: { text: string; q: string }) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--senal)]/40 text-[var(--ink)] rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
