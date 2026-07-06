'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { puedeGestionar } from '@/lib/rbac'
import { getMyTenantId } from '@/lib/tenant'
import { registrarActividad } from './_log'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gestion.soleterno.cl'
const enc = encodeURIComponent

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'proveedor'
}

// Invitación del MANDANTE a un PROVEEDOR no registrado: crea su cuenta stub
// (tipo proveedor, solo el módulo invitado), la vincula al proyecto como
// "○ Invitado" y le envía por correo el acceso + el código del proyecto.
export async function invitarProveedor(proyectoId: string, formData: FormData) {
  const back = `/admin/proyectos/${proyectoId}`
  const supabase = await createClient()

  const email = ((formData.get('inv_email') as string) || '').trim().toLowerCase()
  const nombre = ((formData.get('inv_nombre') as string) || '').trim()
  const rut = ((formData.get('inv_rut') as string) || '').trim()
  const modulo = (formData.get('inv_modulo') as string) || ''
  if (!email || !nombre || !rut || !modulo) redirect(back + '?error=' + enc('Completa correo, nombre, RUT y módulo del proveedor.'))
  if (!(await puedeGestionar(modulo))) redirect(back + '?error=' + enc('No tienes permiso en ese módulo.'))

  // El proyecto debe ser mío (RLS lo acota); traigo datos para el correo.
  const { data: proyecto } = await supabase.from('proyectos').select('id, nombre, codigo').eq('id', proyectoId).maybeSingle()
  if (!proyecto) redirect(back + '?error=' + enc('Proyecto no encontrado.'))

  const admin = createAdminClient()
  const { data: yaU } = await admin.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (yaU) redirect(back + '?error=' + enc('Ya existe una cuenta con ese correo. Pídele que ingrese el código del proyecto en su panel, o vincúlalo por RUT.'))

  const tempPass = 'Dotia-' + Math.random().toString(36).slice(2, 8) + Math.floor(Math.random() * 90 + 10)
  let slug = slugify(nombre)
  const { data: ex } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (ex) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  // 1) Cuenta del proveedor (tenant tipo proveedor)
  const { data: tenant, error: tErr } = await admin.from('tenants').insert({
    name: nombre, slug, rut, tipo: 'proveedor', limite_personas: 100, es_invitado: true,
  }).select('id').single()
  if (tErr || !tenant) redirect(back + '?error=' + enc('No se pudo crear la cuenta del proveedor.'))

  // 2) Usuario administrador del proveedor (tenant_id viaja en metadata)
  const { data: created, error: uErr } = await admin.auth.admin.createUser({
    email, password: tempPass, email_confirm: true,
    user_metadata: { role: 'admin', full_name: nombre, tenant_id: tenant.id },
  })
  if (uErr || !created.user) {
    await admin.from('tenants').delete().eq('id', tenant.id) // rollback
    redirect(back + '?error=' + enc('No se pudo crear el acceso (correo inválido o ya usado).'))
  }
  await admin.from('user_profiles').upsert({ id: created.user.id, role: 'admin', full_name: nombre, email, tenant_id: tenant.id })

  // 3) Solo el módulo invitado queda activo para el proveedor
  await admin.from('tenant_modulos').insert({ tenant_id: tenant.id, modulo, activo: true })

  // 4) Vínculo como Invitado (estado stub). Con cliente RLS para que el trigger
  //    set_tenant_id ponga el tenant del Mandante dueño del proyecto.
  const { error: vErr } = await supabase.from('proyecto_proveedores').insert({
    proyecto_id: proyectoId, proveedor_rut: rut, proveedor_nombre: nombre,
    tenant_proveedor_id: tenant.id, modulo, estado: 'stub',
  })
  if (vErr) redirect(back + '?error=' + enc(vErr.message))

  // 5) Correo con el acceso + el código del proyecto (no bloquea si falta API key)
  await enviarCorreoInvitacion({ email, nombre, tempPass, proyecto: proyecto.nombre, codigo: proyecto.codigo })

  await registrarActividad('proveedor', proyectoId, 'invitar', { email, nombre, rut, modulo })

  revalidatePath(back)
  redirect(back + '?invitado=' + enc(nombre))
}

// El proveedor INVITADO solicita convertirse en Socio (deja registrado su
// interés; el super admin lo convierte luego en /super). No cobra ni cambia nada
// del acceso por sí solo.
export async function solicitarSocio() {
  const tenantId = await getMyTenantId()
  const admin = createAdminClient()
  await admin.from('tenants').update({ solicito_socio_at: new Date().toISOString() }).eq('id', tenantId)
  revalidatePath('/admin/conectados')
  redirect('/admin/conectados?socio=solicitado')
}

async function enviarCorreoInvitacion(p: { email: string; nombre: string; tempPass: string; proyecto: string; codigo: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // sin API key, la cuenta igual quedó creada
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const from = process.env.DIGEST_FROM || 'dotia <onboarding@resend.dev>'
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#212529">
        <div style="background:#0B7E60;color:#fff;padding:18px 22px;border-radius:10px">
          <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6)">Invitación a un proyecto</div>
          <div style="font-size:20px;font-weight:700;margin-top:2px">${p.proyecto}</div>
        </div>
        <p style="margin:18px 2px">Hola ${p.nombre}, te invitaron a participar como proveedor en el proyecto <strong>${p.proyecto}</strong> a través de la plataforma de gestión de personal en terreno.</p>
        <div style="border:1px solid #e9ecef;border-radius:10px;padding:14px 18px;margin:6px 2px">
          <p style="margin:0 0 8px"><strong>Tu acceso:</strong></p>
          <p style="margin:2px 0">Sitio: <a href="${SITE_URL}/login">${SITE_URL}/login</a></p>
          <p style="margin:2px 0">Correo: <strong>${p.email}</strong></p>
          <p style="margin:2px 0">Contraseña temporal: <strong>${p.tempPass}</strong></p>
          <p style="margin:2px 0">Código del proyecto: <strong style="letter-spacing:.15em">${p.codigo}</strong></p>
        </div>
        <p style="margin:14px 2px;font-size:13px;color:#6C757D">Inicia sesión y cambia tu contraseña. Verás el personal del proyecto donde te contrataron y podrás registrar tu servicio.</p>
      </div>`
    await resend.emails.send({ from, to: [p.email], subject: `Invitación al proyecto ${p.proyecto}`, html })
  } catch {
    // no bloquear el flujo por un fallo de correo
  }
}
