'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEMO_USERS, DEMO_PASSWORD } from '@/lib/demo'

// Recuerda el correo de la cuenta REAL desde la que se entró a una cuenta de
// switch, para poder volver con un clic (sin pedir la clave otra vez). Solo
// guarda el correo (no es sensible); nunca tokens ni contraseñas.
const SWITCH_ORIGIN_COOKIE = 'sol_switch_origin'

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
  return data ? { ...data, userId: user.id, email: user.email } : null
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

// Login REAL como un usuario de switch (vista 100% fiel: menú + RLS reales).
export async function quickLoginDemo(userId: string) {
  const p = await currentProfile()
  if (!puedeUsarDemo(p)) redirect('/admin')

  // Solo guarda el origen la PRIMERA vez (viniendo de la cuenta real): si ya
  // estoy en una cuenta de switch y salto a otra, no piso el origen guardado.
  if (p && !p.es_cuenta_switch && p.email) {
    const cookieStore = await cookies()
    cookieStore.set(SWITCH_ORIGIN_COOKIE, p.email, { httpOnly: true, path: '/', maxAge: 60 * 60 * 8 })
  }

  const admin = createAdminClient()
  const { data: target } = await admin.from('user_profiles').select('email, tenant_id, es_cuenta_switch').eq('id', userId).maybeSingle()
  if (!target?.email || !target.tenant_id || !target.es_cuenta_switch) redirect('/admin')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: target.email, password: DEMO_PASSWORD })
  if (error) redirect('/admin?demo=error')

  revalidatePath('/', 'layout')
  redirect('/admin')
}

// Vuelve de un clic a la cuenta REAL (sin pedir la clave otra vez): genera un
// magic-link server-side para el correo de origen y lo canjea de inmediato.
// No guarda ni pasa contraseñas ni tokens de sesión, solo el correo.
export async function volverAMiCuenta() {
  const cookieStore = await cookies()
  const origin = cookieStore.get(SWITCH_ORIGIN_COOKIE)?.value

  if (origin) {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: origin })
    if (!error && data?.properties?.hashed_token) {
      const supabase = await createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.properties.hashed_token,
        type: 'magiclink',
      })
      if (!verifyError) {
        cookieStore.delete(SWITCH_ORIGIN_COOKIE)
        revalidatePath('/', 'layout')
        redirect('/admin')
      }
    }
  }

  // Sin origen guardado o algo falló: cierra sesión, vuelve a entrar a mano.
  cookieStore.delete(SWITCH_ORIGIN_COOKIE)
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
