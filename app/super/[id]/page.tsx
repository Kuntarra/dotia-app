import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/super'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateTenant, toggleTenantActive, markTenantPaid, updateTenantModulos, convertirEnSocio } from '@/app/actions/tenants'
import { subirLogoSuper } from '@/app/actions/marca'
import { LogoUploader } from '@/app/_components/logo-uploader'
import { ArrowLeft, Building2, BedDouble, Users, CheckCircle2, Boxes, Star, ImageIcon } from 'lucide-react'

import { MODULOS as MODULOS_DEF } from '@/lib/modulos'

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow'
const LABEL = 'block text-xs font-semibold text-[var(--gray-600)] mb-1.5'
const CLP = (n: number | null) => n == null ? '—' : '$' + Math.round(n).toLocaleString('es-CL')

export default async function OperadorDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  await requireSuperAdmin()
  const { id } = await params
  const { success } = await searchParams
  const admin = createAdminClient()

  const { data: t } = await admin.from('tenants').select('*').eq('id', id).single()
  if (!t) notFound()

  const [{ count: companies }, { count: properties }, { count: users }, { count: activeStays }, { count: personasUsadas }] = await Promise.all([
    admin.from('companies').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    admin.from('properties').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    admin.from('user_profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    admin.from('stays').select('*', { count: 'exact', head: true }).eq('tenant_id', id).is('checked_out_at', null),
    admin.from('persona_directorio').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
  ])

  const { data: modRows } = await admin.from('tenant_modulos').select('modulo, activo').eq('tenant_id', id)
  const modActivos = new Set((modRows ?? []).filter((m) => m.activo).map((m) => m.modulo))

  const updateWithId = updateTenant.bind(null, id)
  const toggleWithId = toggleTenantActive.bind(null, id, !t.active)
  const markPaidWithId = markTenantPaid.bind(null, id)
  const updateModulosWithId = updateTenantModulos.bind(null, id)
  const convertirWithId = convertirEnSocio.bind(null, id)
  const subirLogoWithId = subirLogoSuper.bind(null, id)

  return (
    <div className="max-w-3xl">
      <Link href="/super" className="inline-flex items-center gap-1.5 text-sm text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors mb-6">
        <ArrowLeft size={15} strokeWidth={1.75} /> Volver al panel
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-tight">{t.name}</h2>
          <p className="text-sm text-[var(--gray-600)] mt-0.5">{t.rut ?? 'sin RUT'} · {t.active ? 'Activo' : 'Suspendido'}</p>
        </div>
        <form action={toggleWithId}>
          <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${t.active ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            {t.active ? 'Suspender' : 'Reactivar'}
          </button>
        </form>
      </div>

      {success && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={15} strokeWidth={2.25} /> {success === 'socio' ? '¡Convertido en ★ Socio Dotia! Sus vínculos pasaron a activos.' : success === 'logo' ? 'Logo actualizado.' : 'Cambios guardados.'}
        </div>
      )}

      {/* Embudo: convertir Invitado en Socio Dotia */}
      {t.es_invitado && (
        <div className="bg-gradient-to-br from-[var(--senal)]/10 to-white rounded-xl border border-[var(--senal)]/40 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-[var(--senal-dark)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Convertir Invitado en ★ Socio Dotia</h3>
          </div>
          <p className="text-xs text-[var(--gray-600)] mb-1">Hoy es <strong>○ Invitado</strong> (acceso limitado, sin plan). Al convertir, deja de ser invitado, sus vínculos pasan a <strong>★ Socio Dotia</strong> y entra al cobro mensual.</p>
          {t.solicito_socio_at && <p className="text-xs text-[var(--senal-dark)] font-medium mb-3">★ Este proveedor solicitó ser Socio el {new Date(t.solicito_socio_at).toLocaleDateString('es-CL')}.</p>}
          <form action={convertirWithId} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end mt-3">
            <div>
              <label className={LABEL}>Cupo de personas *</label>
              <input name="limite_personas" type="number" min="1" max="10000" required defaultValue={100} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Monto mensual (CLP)</label>
              <input name="monthly_amount" type="number" min="0" step="1000" className={INPUT} placeholder="200000" />
            </div>
            <div>
              <label className={LABEL}>Día de cobro (1–28)</label>
              <input name="billing_day" type="number" min="1" max="28" className={INPUT} placeholder="1" />
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--senal)] hover:brightness-95 text-[var(--ink)] text-sm font-bold"><Star size={15} /> Convertir en Socio</button>
          </form>
        </div>
      )}

      {/* Uso actual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <Building2 size={15} strokeWidth={1.75} />, label: 'Empresas', value: companies ?? 0 },
          { icon: <BedDouble size={15} strokeWidth={1.75} />, label: 'Propiedades', value: properties ?? 0 },
          { icon: <Users size={15} strokeWidth={1.75} />, label: 'Usuarios', value: users ?? 0 },
          { icon: <CheckCircle2 size={15} strokeWidth={1.75} />, label: 'Activos', value: activeStays ?? 0 },
        ].map(k => (
          <div key={k.label} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--senal)]/12 text-[var(--senal-dark)] flex items-center justify-center mb-2">{k.icon}</div>
            <p className="font-display text-xl font-semibold text-[var(--ink)] leading-none">{k.value}</p>
            <p className="text-xs text-[var(--gray-600)] mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Estado de pago + acción rápida */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[var(--gray-600)]">Estado de pago</p>
          <p className="font-display text-lg font-semibold text-[var(--ink)] mt-0.5">
            {t.payment_status === 'al_dia' ? 'Al día' : t.payment_status === 'pendiente' ? 'Pendiente' : 'Moroso'}
            <span className="text-sm font-normal text-[var(--gray-500)] ml-2">
              {t.monthly_amount ? `· ${CLP(t.monthly_amount)}/mes` : ''} {t.paid_until ? `· pagado hasta ${t.paid_until}` : ''}
            </span>
          </p>
        </div>
        <form action={markPaidWithId}>
          <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
            Marcar pagado (este mes)
          </button>
        </form>
      </div>

      {/* Logo / marca de la empresa */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={16} strokeWidth={2} className="text-[var(--brand)]" />
          <h3 className="text-sm font-bold text-[var(--ink)]">Logo de la empresa</h3>
        </div>
        <p className="text-xs text-[var(--gray-600)] mb-4">Se muestra en su panel y, al hacer match, junto al de la otra empresa (comunicación de marca).</p>
        <LogoUploader action={subirLogoWithId} current={t.logo_url} nombre={t.name} />
      </div>

      {/* Tipo de empresa + módulos contratados */}
      <form action={updateModulosWithId} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Boxes size={16} strokeWidth={2} className="text-[var(--ink)]" />
          <h3 className="text-sm font-bold text-[var(--ink)]">Tipo de empresa y módulos contratados</h3>
        </div>
        <div>
          <label className={LABEL}>Tipo de empresa</label>
          <select name="tipo" defaultValue={t.tipo ?? 'empresa_proyecto'} className={INPUT}>
            <option value="empresa_proyecto">Mandante (usa la plataforma completa)</option>
            <option value="proveedor">Proveedor (solo los módulos que contrate)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Módulos contratados</label>
          <p className="text-xs text-[var(--gray-500)] mb-3">Marca lo que esta empresa puede usar. Su admin y sus sub-usuarios solo verán los módulos activos.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {MODULOS_DEF.map((m) => (
              <label key={m.k} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] cursor-pointer hover:bg-[var(--gray-100)] transition-colors">
                <input type="checkbox" name={`mod_${m.k}`} defaultChecked={modActivos.has(m.k)} className="w-4 h-4 accent-[var(--brand)]" />
                <span className="text-sm font-medium text-[var(--ink)]">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Guardar módulos</button>
        </div>
      </form>

      {/* Edición de datos + facturación */}
      <form action={updateWithId} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--ink)]">Datos y facturación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre del cliente</label>
            <input name="name" defaultValue={t.name} className={INPUT} />
          </div>
          <div><label className={LABEL}>RUT</label><input name="rut" defaultValue={t.rut ?? ''} className={INPUT} /></div>
          <div><label className={LABEL}>Contacto</label><input name="contact_name" defaultValue={t.contact_name ?? ''} className={INPUT} /></div>
          <div><label className={LABEL}>Correo</label><input name="contact_email" type="email" defaultValue={t.contact_email ?? ''} className={INPUT} /></div>
          <div><label className={LABEL}>Teléfono</label><input name="contact_phone" defaultValue={t.contact_phone ?? ''} className={INPUT} /></div>
          <div><label className={LABEL}>Monto mensual (CLP)</label><input name="monthly_amount" type="number" min="0" step="1000" defaultValue={t.monthly_amount ?? ''} className={INPUT} /></div>
          <div><label className={LABEL}>Día de cobro (1–28)</label><input name="billing_day" type="number" min="1" max="28" defaultValue={t.billing_day ?? ''} className={INPUT} /></div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Cupo de personas contratado (máx. 10.000)</label>
            <input name="limite_personas" type="number" min="1" max="10000" defaultValue={t.limite_personas ?? 100} className={INPUT} />
            <p className="text-[11px] text-[var(--gray-500)] mt-1">
              En uso: <strong className="text-[var(--ink)]">{personasUsadas ?? 0}</strong> de {t.limite_personas ?? 100} personas
              {(personasUsadas ?? 0) > (t.limite_personas ?? 100) && <span className="text-red-600"> · ¡cupo superado!</span>}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Estado de pago</label>
            <select name="payment_status" defaultValue={t.payment_status} className={INPUT}>
              <option value="al_dia">Al día</option>
              <option value="pendiente">Pendiente</option>
              <option value="moroso">Moroso</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Notas internas</label>
            <textarea name="notes" defaultValue={t.notes ?? ''} rows={3} className={INPUT} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Guardar cambios</button>
        </div>
      </form>
    </div>
  )
}
