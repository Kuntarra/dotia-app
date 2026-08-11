import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from "lucide-react"
import { createReceptionist } from '@/app/actions/users'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function NuevoRecepcionistaPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, type, cities(name)')
    .eq('active', true)
    .order('name')

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/usuarios" className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Nuevo recepcionista</h1>
          <p className="text-sm text-[var(--gray-600)]">El usuario podrá hacer check-in y check-out en las propiedades asignadas</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createReceptionist} className="space-y-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Datos del usuario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="full_name" className={LABEL}>Nombre completo *</label>
              <input id="full_name" name="full_name" type="text" required placeholder="Ana García López" className={INPUT} />
            </div>
            <div>
              <label htmlFor="email" className={LABEL}>Correo electrónico *</label>
              <input id="email" name="email" type="email" required placeholder="ana@empresa.cl" className={INPUT} />
            </div>
            <div>
              <label htmlFor="password" className={LABEL}>Contraseña temporal *</label>
              <input id="password" name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-1">Propiedades asignadas</h2>
          <p className="text-xs text-[var(--gray-600)] mb-5">El recepcionista solo verá y gestionará estas propiedades</p>

          {!properties?.length ? (
            <p className="text-sm text-[var(--gray-600)]">No hay propiedades activas. Crea una propiedad primero.</p>
          ) : (
            <div className="space-y-2">
              {properties.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--gray-50)] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="property_ids"
                    value={p.id}
                    className="w-4 h-4 rounded border-[var(--gray-200)] accent-[var(--brand)] cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{p.name}</p>
                    <p className="text-xs text-[var(--gray-600)]">{(p.cities as unknown as { name: string } | null)?.name}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-light)] text-white text-sm font-semibold rounded-lg transition-colors">
            Crear recepcionista
          </button>
          <Link href="/admin/usuarios" className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)] transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
