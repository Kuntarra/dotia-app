import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/types'

const ROLE_COLORS: Record<string, string> = {
  admin:        'badge badge-brand',
  receptionist: 'badge badge-green',
  client:       'badge badge-senal',
}

export default async function UsuariosPage() {
  const adminClient = createAdminClient()
  const tenantId = await getMyTenantId()

  const [{ data: profiles }, { data: rp }] = await Promise.all([
    adminClient
      .from('user_profiles')
      .select('*, companies(name)')
      .eq('tenant_id', tenantId)
      .order('role')
      .order('full_name'),
    adminClient
      .from('receptionist_properties')
      .select('user_id, properties(name)')
      .eq('tenant_id', tenantId),
  ])

  // Agrupar propiedades por user_id
  const propsByUser = (rp ?? []).reduce<Record<string, string[]>>((acc, row) => {
    const name = (row.properties as unknown as { name: string } | null)?.name
    if (!name) return acc
    if (!acc[row.user_id]) acc[row.user_id] = []
    acc[row.user_id]!.push(name)
    return acc
  }, {})

  const grouped = (profiles ?? []).reduce<Record<string, typeof profiles>>((acc, p) => {
    const role = p.role ?? 'client'
    if (!acc[role]) acc[role] = []
    acc[role]!.push(p)
    return acc
  }, {})

  const roleOrder = ['admin', 'receptionist', 'client']

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-8 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Gestión</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Usuarios</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">{profiles?.length ?? 0} usuarios registrados</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/admin/usuarios/nuevo-recepcionista"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] border border-[var(--gray-300)] hover:border-[var(--brand)] text-[var(--ink)] text-sm font-semibold rounded-xl transition-all hover:-translate-y-px shadow-[var(--shadow-xs)]">
            <Plus size={15} strokeWidth={2.25} />
            Recepcionista
          </Link>
          <Link href="/admin/usuarios/nuevo-cliente" className="btn-primary">
            <Plus size={15} strokeWidth={2.25} />
            Cliente
          </Link>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-8">
        {roleOrder.map(role => {
          const users = grouped[role]
          if (!users?.length) return null

          return (
            <div key={role}>
              <div className="flex items-center gap-3 mb-4">
                <span className="section-label !mb-0">{ROLE_LABELS[role]}s</span>
                <div className="flex-1 h-px bg-[var(--gray-200)]" />
                <span className="text-xs text-[var(--gray-500)] font-medium">{users.length}</span>
              </div>

              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-xs)]">
                {users.map((user, i) => {
                  const props = propsByUser[user.id] ?? []
                  const company = user.companies as { name: string } | null

                  return (
                    <Link
                      key={user.id}
                      href={role !== 'admin' ? `/admin/usuarios/${user.id}` : '#'}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-[var(--gray-50)] transition-colors ${i > 0 ? 'border-t border-[var(--gray-100)]' : ''} ${role === 'admin' ? 'pointer-events-none' : 'group'}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                        ${role === 'admin' ? 'bg-[var(--brand)]' : role === 'receptionist' ? 'bg-emerald-100 group-hover:bg-emerald-200' : 'bg-[var(--senal)]/15 group-hover:bg-[var(--senal)]/25'}`}>
                        <span className={`text-xs font-bold
                          ${role === 'admin' ? 'text-white' : role === 'receptionist' ? 'text-emerald-700' : 'text-[var(--senal-dark)]'}`}>
                          {(user.full_name ?? user.email ?? '?').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--ink)] truncate">{user.full_name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-600)] truncate">{user.email ?? '—'}</p>
                        {props.length > 0 && (
                          <p className="text-xs text-[var(--gray-600)] mt-0.5 truncate">
                            {props.join(' · ')}
                          </p>
                        )}
                        {company && (
                          <p className="text-xs text-[var(--gray-600)] mt-0.5">{company.name}</p>
                        )}
                      </div>
                      <span className={`shrink-0 ${ROLE_COLORS[role] ?? 'badge badge-gray'}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
