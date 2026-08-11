import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import Link from 'next/link'

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function AlojamientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('user_profiles')
    .select('role, full_name, company_id')
    .eq('id', user.id)
    .single()

  if (myProfile?.role !== 'client' && myProfile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const cookieStore = await cookies()
  const impersonateId = myProfile?.role === 'admin' ? cookieStore.get('sol_impersonate')?.value : null
  const targetId = impersonateId ?? user.id

  const { data: profile } = impersonateId
    ? await admin.from('user_profiles').select('role, full_name, company_id').eq('id', targetId).single()
    : { data: myProfile }

  const companyId = (profile as any)?.company_id
  if (!companyId) {
    return (
      <div className="p-8">
        <p className="text-sm text-[var(--gray-600)]">Tu cuenta no tiene empresa asociada. Contacta al administrador.</p>
      </div>
    )
  }

  const [{ data: company }, { data: stays }, { data: allocs }] = await Promise.all([
    admin.from('companies').select('name, rut, contact_name, contact_email, contact_phone').eq('id', companyId).eq('tenant_id', tenantId).single(),
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at, estimated_checkout,
      guests(first_name, last_name_paterno, rut, phone),
      rooms(number, type, capacity, properties(name, cities(name)))
    `).eq('company_id', companyId).eq('tenant_id', tenantId).order('checked_in_at', { ascending: false }).limit(50),
    admin.from('allocations').select(`
      rooms(number, type, capacity, properties(name))
    `).eq('company_id', companyId).eq('tenant_id', tenantId),
  ])

  const activos    = (stays ?? []).filter(s => !s.checked_out_at)
  const recientes  = (stays ?? []).filter(s =>  s.checked_out_at).slice(0, 5)
  const totalCamas = (allocs ?? []).reduce((acc, a) => acc + ((a.rooms as any)?.capacity ?? 1), 0)
  const habitaciones = (allocs ?? []).length

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <span className="section-label">Portal de alojamiento</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">{company?.name}</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">dotia · Vista de empresa</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Huéspedes activos',   value: activos.length,    dot: 'bg-emerald-500', num: 'text-emerald-600' },
          { label: 'Habitaciones asig.',  value: habitaciones,       dot: 'bg-[var(--brand)]', num: 'text-[var(--ink)]' },
          { label: 'Camas asignadas',     value: totalCamas,         dot: 'bg-[var(--senal)]', num: 'text-[var(--senal-dark)]' },
          { label: 'Estadías históricas', value: stays?.length ?? 0, dot: 'bg-[var(--gray-300)]', num: 'text-[var(--gray-700)]' },
        ].map(k => (
          <div key={k.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 shadow-[var(--shadow-sm)]
                                        hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-2 h-2 rounded-full mb-3 bg-[var(--senal)]" />
            <p className="font-display text-[2.25rem] font-semibold leading-none tracking-[-0.01em] text-[var(--ink)] data-number">{k.value}</p>
            <p className="text-sm font-medium text-[var(--ink)] mt-2">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Huéspedes activos */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--ink)]">Huéspedes activos ahora</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">{activos.length} en alojamiento</span>
        </div>
        {!activos.length ? (
          <p className="px-6 py-8 text-sm text-[var(--gray-500)] text-center">No hay huéspedes activos en este momento.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                {['Nombre','RUT','Teléfono','Propiedad / Hab.','Turno','Ingreso','Salida estimada'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activos.map(s => {
                const g = s.guests as any
                const r = s.rooms  as any
                return (
                  <tr key={s.id}>
                    <td className="font-semibold text-[var(--ink)]">{g?.first_name} {g?.last_name_paterno}</td>
                    <td className="text-xs text-[var(--gray-500)] font-mono">{g?.rut ?? '—'}</td>
                    <td className="text-xs text-[var(--gray-600)] whitespace-nowrap">{g?.phone ?? '—'}</td>
                    <td>
                      <span className="font-medium text-[var(--ink)]">{r?.properties?.name}</span>
                      <span className="text-[var(--gray-400)] ml-1 text-xs">Hab.{r?.number}</span>
                    </td>
                    <td>{s.shift_type ?? '—'}</td>
                    <td className="whitespace-nowrap">{fmt(s.checked_in_at)}</td>
                    <td className="whitespace-nowrap">{s.estimated_checkout ? fmt(s.estimated_checkout) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Últimas salidas */}
      {recientes.length > 0 && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--ink)]">Últimas salidas</h2>
            <Link href="/alojamiento/historial" className="text-xs text-[var(--ink)] font-semibold hover:underline">Ver todo →</Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                {['Nombre','Propiedad / Hab.','Turno','Ingreso','Salida'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recientes.map(s => {
                const g = s.guests as any
                const r = s.rooms  as any
                return (
                  <tr key={s.id}>
                    <td className="font-medium text-[var(--ink)]">{g?.first_name} {g?.last_name_paterno}</td>
                    <td>
                      <span className="font-medium text-[var(--ink)]">{r?.properties?.name}</span>
                      <span className="text-[var(--gray-400)] ml-1 text-xs">Hab.{r?.number}</span>
                    </td>
                    <td>{s.shift_type ?? '—'}</td>
                    <td className="whitespace-nowrap">{fmt(s.checked_in_at)}</td>
                    <td className="whitespace-nowrap">{s.checked_out_at ? fmt(s.checked_out_at) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
