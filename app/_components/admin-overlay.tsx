import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { RoleSwitcher } from '@/app/admin/_components/role-switcher'
import { DEMO_USERS } from '@/lib/demo'

export async function AdminOverlay() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_super_admin, tenant_id, es_cuenta_switch')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  // es_cuenta_switch marca la CUENTA puntual (no el tenant): así el personal
  // real de Sol Eterno nunca cae en "modo demo" solo por compartir tenant con
  // la cuenta Mandante del switcher.
  const enDemo = !!profile.es_cuenta_switch
  const esAdmin = profile.role === 'admin'

  // El conmutador se muestra al super admin, a un admin (para impersonar
  // recepción/cliente) o a quien esté DENTRO de una cuenta de switch (para salir/saltar).
  if (!esAdmin && !profile.is_super_admin && !enDemo) return null

  const admin = createAdminClient()

  // Modalidades de switch: une la matriz estática con los IDs reales (por email).
  let demoModalities: { id: string; label: string; group: string }[] = []
  if (profile.is_super_admin || enDemo) {
    const { data: rows } = await admin
      .from('user_profiles')
      .select('id, email')
      .eq('es_cuenta_switch', true)
    const byEmail = new Map((rows ?? []).map((r) => [r.email, r.id]))
    demoModalities = DEMO_USERS.flatMap((u) => {
      const id = byEmail.get(u.email)
      return id ? [{ id, label: u.label, group: u.group as string }] : []
    })
  }

  // Usuarios legado (recepción/cliente) para la impersonación clásica.
  let users: { id: string; full_name: string | null; role: string; email: string | null }[] = []
  if (esAdmin && !enDemo) {
    const tenantId = await getMyTenantId()
    const { data } = await admin
      .from('user_profiles')
      .select('id, full_name, role, email')
      .eq('tenant_id', tenantId)
      .neq('id', user.id)
      .in('role', ['receptionist', 'client'])
      .order('role')
      .order('full_name')
    users = data ?? []
  }

  return <RoleSwitcher users={users} demoModalities={demoModalities} enDemo={enDemo} />
}
