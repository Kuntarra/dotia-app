import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/rbac'
import { crearPunto, desactivarPunto } from '@/app/actions/puntos'
import { SubmitButton } from '@/app/_components/submit-button'
import { MapPin, Building2 } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

export default async function PuntosPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: puntos } = await supabase
    .from('puntos')
    .select('id, nombre, tipo, direccion, property_id')
    .eq('activa', true)
    .order('tipo')
    .order('nombre')

  const lista = puntos ?? []

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shrink-0">
          <MapPin size={19} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Puntos</h1>
          <p className="text-sm text-[var(--gray-600)]">Catálogo de lugares compartido entre módulos. Las propiedades de Alojamiento generan su punto automáticamente.</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 mb-6">
        <form action={crearPunto} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre del punto</label>
            <input name="nombre" placeholder="Aeropuerto Diego Aracena" className={`${INPUT} w-full`} required />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Dirección (opcional)</label>
            <input name="direccion" placeholder="Ruta A-1, Iquique" className={`${INPUT} w-full`} />
          </div>
          <div>
            <button type="submit" className="w-full px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Crear punto</button>
          </div>
        </form>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
              <th className="px-5 py-3 font-semibold">Punto</th>
              <th className="px-4 py-3 font-semibold">Dirección</th>
              <th className="px-4 py-3 font-semibold">Origen</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!lista.length ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-[var(--gray-500)]">Aún no hay puntos.</td></tr>
            ) : lista.map((p) => {
              const derivado = p.tipo === 'propiedad'
              return (
                <tr key={p.id} className="border-b border-[var(--gray-100)] last:border-0">
                  <td className="px-5 py-3 font-medium text-[var(--ink)]">{p.nombre}</td>
                  <td className="px-4 py-3 text-[var(--gray-600)]">{p.direccion ?? '—'}</td>
                  <td className="px-4 py-3">
                    {derivado ? (
                      <span className="inline-flex items-center gap-1.5 badge badge-gray"><Building2 size={12} strokeWidth={2} /> Derivado de propiedad</span>
                    ) : (
                      <span className="badge">Manual</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {derivado ? (
                      <span className="text-xs text-[var(--gray-400)]">Se edita en Alojamiento</span>
                    ) : (
                      <form action={desactivarPunto.bind(null, p.id)}>
                        <SubmitButton pendingText="…" className="text-xs text-[var(--gray-500)] hover:text-red-600 font-medium">Dar de baja</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
