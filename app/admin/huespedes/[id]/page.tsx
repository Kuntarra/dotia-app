import Link from 'next/link'
import { ROOM_TYPE_LABELS } from "@/lib/types"
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { ArrowLeft, Phone, Building2, CalendarDays, Moon, MapPin } from 'lucide-react'

export const metadata = { title: 'Huésped · dotia' }


function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function nights(inIso: string, outIso: string | null) {
  const ini = new Date(inIso).getTime()
  const fin = (outIso ? new Date(outIso) : new Date()).getTime()
  return Math.max(0, Math.ceil((fin - ini) / 86400000))
}

export default async function HuespedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  const tenantId = await getMyTenantId()

  const { data: guest } = await admin
    .from('guests')
    .select('id, first_name, last_name_paterno, last_name_materno, rut, phone, companies(name)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!guest) notFound()

  const { data: stays } = await admin
    .from('stays')
    .select('id, shift_type, checked_in_at, checked_out_at, estimated_checkout, rooms(number, type, properties(name)), companies(name)')
    .eq('guest_id', id)
    .eq('tenant_id', tenantId)
    .order('checked_in_at', { ascending: false })

  const list = stays ?? []
  const nombre = `${guest.first_name ?? ''} ${guest.last_name_paterno ?? ''} ${guest.last_name_materno ?? ''}`.trim()
  const initials = nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const totalNoches = list.reduce((a, s) => a + nights(s.checked_in_at, s.checked_out_at), 0)
  const propiedades = new Set(list.map(s => (s.rooms as any)?.properties?.name).filter(Boolean))
  const activa = list.find(s => !s.checked_out_at)
  const empresa = (guest.companies as any)?.name ?? '—'

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link href="/admin/estadias"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors mb-6">
        <ArrowLeft size={15} strokeWidth={1.75} />
        Volver a estadías
      </Link>

      {/* Cabecera */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[var(--brand)] flex items-center justify-center shrink-0">
          <span className="text-white text-lg font-bold">{initials || '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-[1.7rem] font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">{nombre || '—'}</h1>
            {activa
              ? <span className="badge badge-green">Alojado actualmente</span>
              : <span className="badge badge-gray">Sin estadía activa</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-[var(--gray-600)]">
            {guest.rut && <span className="font-mono">{guest.rut}</span>}
            {guest.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} strokeWidth={1.75} />{guest.phone}</span>}
            <span className="inline-flex items-center gap-1.5"><Building2 size={13} strokeWidth={1.75} />{empresa}</span>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <Stat icon={<CalendarDays size={16} strokeWidth={1.75} />} value={list.length} label={`Estadía${list.length !== 1 ? 's' : ''}`} />
        <Stat icon={<Moon size={16} strokeWidth={1.75} />} value={totalNoches} label="Noches totales" />
        <Stat icon={<MapPin size={16} strokeWidth={1.75} />} value={propiedades.size} label={`Propiedad${propiedades.size !== 1 ? 'es' : ''}`} />
      </div>

      {/* Historial */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="section-label !mb-0">Historial de estadías</span>
          <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full font-medium">{list.length}</span>
        </div>

        {list.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center text-sm text-[var(--gray-500)]">
            Esta persona aún no tiene estadías registradas.
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-sm)] divide-y divide-[var(--gray-100)]">
            {list.map((s, i) => {
              const r = s.rooms as any
              const n = nights(s.checked_in_at, s.checked_out_at)
              const isActive = !s.checked_out_at
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--gray-50)] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-display font-semibold text-sm"
                    style={{ background: 'rgb(11 126 96 / 0.12)', color: 'var(--senal-dark)' }}>
                    {list.length - i}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">
                      {r?.properties?.name ?? '—'} · Hab. {r?.number ?? '—'}
                      {r?.type && <span className="text-xs font-normal text-[var(--gray-500)]"> · {ROOM_TYPE_LABELS[r.type] ?? r.type}</span>}
                    </p>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5">
                      {fmt(s.checked_in_at)} → {s.checked_out_at ? fmt(s.checked_out_at) : 'En curso'}
                      {s.shift_type && <span> · Turno {s.shift_type}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-base font-semibold text-[var(--ink)] tabular-nums">{n}</p>
                    <p className="text-[10px] text-[var(--gray-500)] uppercase tracking-wide">noche{n !== 1 ? 's' : ''}</p>
                  </div>
                  {isActive
                    ? <span className="badge badge-green shrink-0">Activa</span>
                    : <span className="badge badge-gray shrink-0">Completada</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'rgb(11 126 96 / 0.12)', color: 'var(--senal-dark)' }}>
        {icon}
      </div>
      <p className="font-display text-[2rem] font-semibold leading-none text-[var(--ink)] tabular-nums">{value}</p>
      <p className="text-sm font-medium text-[var(--ink)] mt-2">{label}</p>
    </div>
  )
}
