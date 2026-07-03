'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEMO_USERS, DEMO_PASSWORD } from '@/lib/demo'

// Perfil de la sesión actual (real, sin impersonación).
async function currentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('role, is_super_admin, tenant_id, es_cuenta_switch')
    .eq('id', user.id)
    .single()
  return data ? { ...data, userId: user.id } : null
}

// El switch lo puede usar el super admin o quien YA está logueado con una
// cuenta de switch (para saltar de una vista a otra). es_cuenta_switch marca
// la cuenta puntual, no el tenant: así el personal real de Sol Eterno nunca
// ve el banner ni el switcher, aunque comparta tenant con la cuenta Mandante.
function puedeUsarDemo(p: { is_super_admin: boolean | null; es_cuenta_switch: boolean | null } | null): boolean {
  if (!p) return false
  return !!p.is_super_admin || !!p.es_cuenta_switch
}

// Crea (idempotente) los usuarios demo de todas las modalidades.
export async function seedDemoUsers() {
  const p = await currentProfile()
  if (!p?.is_super_admin) redirect('/admin')

  const admin = createAdminClient()
  for (const u of DEMO_USERS) {
    const { data: existing } = await admin.from('user_profiles').select('id').eq('email', u.email).maybeSingle()
    let userId = existing?.id ?? null

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { role: u.role, full_name: u.fullName, tenant_id: u.tenantId },
      })
      if (error || !data.user) continue
      userId = data.user.id
    }

    await admin.from('user_profiles').upsert({
      id: userId, role: u.role, full_name: u.fullName, email: u.email, tenant_id: u.tenantId, es_cuenta_switch: true,
    })

    // Permisos por módulo (service-role: tenant_id explícito, el trigger no aplica).
    if (u.modulos?.length) {
      await admin.from('user_modulos').delete().eq('user_id', userId).is('proyecto_id', null)
      await admin.from('user_modulos').insert(
        u.modulos.map((m) => ({ user_id: userId!, modulo: m.modulo, nivel: m.nivel, tenant_id: u.tenantId })),
      )
    }
  }

  revalidatePath('/admin')
  redirect('/admin?demo=sembrado')
}

// Login REAL como un usuario demo (vista 100% fiel: menú + RLS reales).
export async function quickLoginDemo(userId: string) {
  if (!puedeUsarDemo(await currentProfile())) redirect('/admin')

  const admin = createAdminClient()
  const { data: target } = await admin.from('user_profiles').select('email, tenant_id, es_cuenta_switch').eq('id', userId).maybeSingle()
  if (!target?.email || !target.tenant_id || !target.es_cuenta_switch) redirect('/admin')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: target.email, password: DEMO_PASSWORD })
  if (error) redirect('/admin?demo=error')

  revalidatePath('/', 'layout')
  redirect('/admin')
}

// Salir del modo demo: cierra sesión (la cuenta real del super admin nunca se
// swapea por clave, así que se vuelve a entrar manualmente).
export async function exitDemo() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
