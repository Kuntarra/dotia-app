import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getMyTenantId } from '@/lib/tenant'
import Link from 'next/link'
import { CheckoutButton } from './_components/checkout-button'
import { RecepcionSearchBar } from './_components/search-bar'
import { Plus, CheckCircle2, Users, Phone, Clock } from 'lucide-react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function RecepcionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; property?: string; q?: string }>
}) {
  const params       = await searchParams
  const q            = params.q?.trim() ?? ''
  const effectiveId  = await getEffectiveUserId()
  const tenantId     = await getMyTenantId()
  const supabase     = createAdminClient()

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

  let query = supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, estimated_checkout, notes,
      guests(id, first_name, last_name_paterno, rut, phone),
      rooms(id, number, floor, property_id, properties(id, name, cities(name))),
      companies(name)
    `)
    .eq('tenant_id', tenantId)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: false })

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

  const { data: stays } = await query

  const filtered = (stays ?? []).filter(s => {
    const room = s.rooms as unknown as { property_id: string } | null
    if (selectedPropertyId && room?.property_id !== selectedPropertyId) return false
    return true
  })

  const nombre = (s: typeof filtered[0]) => {
    const g = s.guests as unknown as { first_name: string; last_name_paterno: string } | null
    return `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim()
  }

  return (
    <div>
      {/* ── Header premium ── */}
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <span className="section-label">En curso</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">
            Huéspedes activos
          </h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {filtered.length} estadía{filtered.length !== 1 ? 's' : ''} en curso
            {q && <span className="ml-1 text-[var(--ink)] font-medium">· "{q}"</span>}
          </p>
        </div>
        <Link href="/recepcion/checkin" className="btn-primary shrink-0">
          <Plus size={16} strokeWidth={2.25} />
          Nuevo check-in
        </Link>
      </div>

      {/* ── Alertas de éxito ── */}
      {(params.success === '1' || params.success === 'checkout') && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle2 size={15} strokeWidth={2.25} className="shrink-0" />
          {params.success === '1' ? 'Check-in registrado correctamente.' : 'Check-out completado.'}
        </div>
      )}

      {/* ── Buscador + filtros ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <RecepcionSearchBar defaultValue={q || undefined} />

        {showFilter && !q && (
          <div className="flex gap-1.5 bg-[var(--surface)] border border-[var(--gray-200)] rounded-xl p-1">
            <Link href="/recepcion"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !selectedPropertyId
                  ? 'bg-[var(--brand)] text-white shadow-[var(--shadow-xs)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--ink)] hover:bg-[var(--gray-50)]'
              }`}>
              Todos
            </Link>
            {myProperties.map(p => (
              <Link key={p.id} href={`/recepcion?property=${p.id}`}
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

      {/* ── Estado vacío ── */}
      {!filtered.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-16 text-center">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={24} strokeWidth={1.5} stroke="var(--gray-500)" />
          </div>
          <p className="text-sm font-semibold text-[var(--ink)] mb-1">
            {q ? `Sin resultados para "${q}"` : selectedPropertyId ? 'Sin huéspedes en esta propiedad' : 'Sin huéspedes activos'}
          </p>
          <p className="text-xs text-[var(--gray-600)] mb-4">
            {q ? 'Prueba con otro nombre, RUT o número de habitación.' : 'No hay estadías en curso en este momento.'}
          </p>
          {!q && !selectedPropertyId && (
            <Link href="/recepcion/checkin" className="text-sm text-[var(--ink)] font-semibold hover:underline">
              Registrar primer check-in →
            </Link>
          )}
        </div>
      ) : (
        /* ── Grid de tarjetas de huéspedes ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(stay => {
            const guest   = stay.guests   as unknown as { first_name: string; last_name_paterno: string; rut?: string; phone?: string } | null
            const room    = stay.rooms    as unknown as { number: string; floor: number | null; property_id: string; properties: { name: string; cities: { name: string } | null } | null } | null
            const company = stay.companies as unknown as { name: string } | null
            const n       = nombre(stay)
            const initials = n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

            return (
              <div key={stay.id}
                className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden
                           shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)]
                           hover:-translate-y-0.5 transition-all duration-200">
                {/* Top accent */}
                <div className="h-0.5 bg-gradient-to-r from-[var(--brand)] via-[var(--senal)] to-[var(--brand)]" />

                <div className="p-5 flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand)] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{initials || '?'}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--ink)] text-sm leading-tight">
                      {q ? <Highlight text={n} q={q} /> : n}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                      <span className="text-xs font-medium text-[var(--gray-700)]">
                        Hab.&nbsp;{q && room?.number ? <Highlight text={room.number} q={q} /> : room?.number}
                        {room?.floor != null ? ` · Piso ${room.floor}` : ''}
                      </span>
                      {(!selectedPropertyId || q) && room?.properties?.name && (
                        <span className="text-xs text-[var(--gray-500)]">{room.properties.name}</span>
                      )}
                      {company?.name && (
                        <span className="text-xs text-[var(--gray-500)]">{company.name}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {stay.shift_type && (
                        <span className="text-[11px] text-[var(--gray-500)]">Turno {stay.shift_type}</span>
                      )}
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

                {/* Footer */}
                <div className="px-5 py-3 border-t border-[var(--gray-100)] bg-[var(--gray-50)]
                                flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
                    <Clock size={12} strokeWidth={2} />
                    {formatDate(stay.checked_in_at)}
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
      <mark className="bg-[var(--senal)]/40 text-[var(--ink)] rounded px-0.5 not-italic">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
