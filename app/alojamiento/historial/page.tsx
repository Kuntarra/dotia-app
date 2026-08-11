import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function noches(checkin: string, checkout: string | null) {
  const fin = checkout ? new Date(checkout) : new Date()
  const ini = new Date(checkin)
  return Math.max(1, Math.round((fin.getTime() - ini.getTime()) / 86400000))
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const q = params.q?.toLowerCase() ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('user_profiles').select('role, company_id').eq('id', user.id).single()

  if (myProfile?.role !== 'client' && myProfile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const cookieStore = await cookies()
  const impersonateId = myProfile?.role === 'admin' ? cookieStore.get('sol_impersonate')?.value : null
  const targetId = impersonateId ?? user.id

  const { data: profile } = impersonateId
    ? await admin.from('user_profiles').select('company_id').eq('id', targetId).eq('tenant_id', tenantId).single()
    : { data: myProfile }

  const companyId = (profile as any)?.company_id
  if (!companyId) redirect('/alojamiento')

  const { data: staysRaw } = await admin
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(number, type, properties(name))
    `)
    .eq('company_id', companyId)
    .eq('tenant_id', tenantId)
    .order('checked_in_at', { ascending: false })

  const stays = q
    ? (staysRaw ?? []).filter(s => {
        const g = s.guests as any
        const name = `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.toLowerCase()
        return name.includes(q) || (g?.rut ?? '').toLowerCase().includes(q)
      })
    : (staysRaw ?? [])

  const activas    = stays.filter(s => !s.checked_out_at).length
  const completadas = stays.filter(s => s.checked_out_at).length

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Historial de estadías</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {stays.length} registros · {activas} activas · {completadas} completadas
          </p>
        </div>
        {/* Buscador */}
        <form method="GET" className="flex gap-2">
          <input name="q" defaultValue={q} type="text" placeholder="Buscar por nombre o RUT…"
            className="px-3.5 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
          <button type="submit"
            className="px-4 py-2 bg-[var(--brand)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--brand-dark)] transition-colors">
            Buscar
          </button>
        </form>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
        {!stays.length ? (
          <p className="px-6 py-10 text-center text-sm text-[var(--gray-500)]">No se encontraron estadías.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                  {['#','Nombre','RUT','Propiedad','Hab.','Turno','Ingreso','Salida','Noches','Estado'].map((h,i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-[var(--gray-600)] ${i===8?'text-right':'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {stays.map((s, i) => {
                  const g = s.guests as any
                  const r = s.rooms  as any
                  return (
                    <tr key={s.id} className="hover:bg-[var(--gray-50)]">
                      <td className="px-4 py-3 text-xs text-[var(--gray-400)]">{i+1}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--ink)] whitespace-nowrap">{g?.first_name} {g?.last_name_paterno}</td>
                      <td className="px-4 py-3 text-xs text-[var(--gray-500)] font-mono">{g?.rut ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-[var(--gray-700)]">{r?.properties?.name}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{r?.number}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{s.shift_type ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmt(s.checked_in_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{s.checked_out_at ? fmt(s.checked_out_at) : '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--ink)]">{noches(s.checked_in_at, s.checked_out_at)}</td>
                      <td className="px-4 py-3">
                        {s.checked_out_at
                          ? <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-500)] px-2 py-0.5 rounded-full">Completada</span>
                          : <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Activa</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
