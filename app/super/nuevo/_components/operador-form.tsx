'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createTenant } from '@/app/actions/tenants'
import { AlertTriangle } from 'lucide-react'

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow'
const LABEL = 'block text-xs font-semibold text-[var(--gray-600)] mb-1.5'

export function OperadorForm() {
  // useActionState: al fallar devuelve { error } sin recargar → no se borra lo escrito.
  const [state, formAction, pending] = useActionState(createTenant, null)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle size={15} strokeWidth={2} className="shrink-0" />{state.error}
        </div>
      )}

      {/* Datos del cliente */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
        <h3 className="text-sm font-bold text-[var(--ink)] mb-4">Datos del cliente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre del cliente *</label>
            <input name="name" required className={INPUT} placeholder="Ej: Hospedajes del Norte SpA" />
          </div>
          <div>
            <label className={LABEL}>RUT</label>
            <input name="rut" className={INPUT} placeholder="76.123.456-7" />
          </div>
          <div>
            <label className={LABEL}>Teléfono de contacto</label>
            <input name="contact_phone" className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Correo de contacto (pagos / EDP) <span className="font-normal text-[var(--gray-500)]">— opcional</span></label>
            <input name="contact_email" type="email" className={INPUT} placeholder="Si lo dejas vacío, se usa el del administrador" />
            <p className="text-[11px] text-[var(--gray-500)] mt-1">Dato de contacto para comunicaciones de cobro. Hoy es informativo; el envío de EDP es manual.</p>
          </div>
        </div>
      </div>

      {/* Facturación y cupo */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
        <h3 className="text-sm font-bold text-[var(--ink)] mb-4">Facturación y cupo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Cupo de personas contratado *</label>
            <input name="limite_personas" type="number" min="1" max="10000" required defaultValue={100} className={INPUT} placeholder="500" />
            <p className="text-[11px] text-[var(--gray-500)] mt-1">Máximo de personas que la empresa puede cargar. Define el plan/cobro. Tope del sistema: 10.000.</p>
          </div>
          <div>
            <label className={LABEL}>Monto mensual (CLP)</label>
            <input name="monthly_amount" type="number" min="0" step="1000" className={INPUT} placeholder="200000" />
          </div>
          <div>
            <label className={LABEL}>Día de cobro (1–28)</label>
            <input name="billing_day" type="number" min="1" max="28" className={INPUT} placeholder="1" />
          </div>
        </div>
      </div>

      {/* Administrador inicial */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
        <h3 className="text-sm font-bold text-[var(--ink)] mb-1">Administrador inicial</h3>
        <p className="text-xs text-[var(--gray-600)] mb-4">Esta persona podrá entrar y gestionar la operación de este cliente. Suele ser la misma del contacto.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre del administrador</label>
            <input name="admin_name" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Correo del administrador *</label>
            <input name="admin_email" type="email" required className={INPUT} placeholder="admin@empresa.cl" />
          </div>
          <div>
            <label className={LABEL}>Contraseña inicial *</label>
            <input name="admin_password" type="text" required minLength={6} className={INPUT} placeholder="mín. 6 caracteres" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/super" className="px-5 py-2.5 rounded-lg border border-[var(--gray-300)] text-[var(--gray-700)] text-sm font-semibold hover:bg-[var(--gray-50)] transition-colors">Cancelar</Link>
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
          {pending ? 'Creando cliente…' : 'Crear cliente'}
        </button>
      </div>
    </form>
  )
}
