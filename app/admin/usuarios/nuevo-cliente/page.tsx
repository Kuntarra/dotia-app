import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from "lucide-react"
import { createClientUser } from '@/app/actions/users'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function NuevoClienteUserPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/usuarios" className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Nuevo usuario cliente</h1>
          <p className="text-sm text-[var(--gray-600)]">El usuario podrá consultar el personal alojado de su empresa</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createClientUser} className="space-y-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Datos del usuario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="full_name" className={LABEL}>Nombre completo *</label>
              <input id="full_name" name="full_name" type="text" required placeholder="Pedro Soto Ramírez" className={INPUT} />
            </div>
            <div>
              <label htmlFor="email" className={LABEL}>Correo electrónico *</label>
              <input id="email" name="email" type="email" required placeholder="pedro@minera.cl" className={INPUT} />
            </div>
            <div>
              <label htmlFor="password" className={LABEL}>Contraseña temporal *</label>
              <input id="password" name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Empresa asociada</h2>
          {!companies?.length ? (
            <p className="text-sm text-[var(--gray-600)]">No hay empresas registradas. <Link href="/admin/clientes/nuevo" className="text-[var(--ink)] underline">Crear empresa</Link></p>
          ) : (
            <div>
              <label htmlFor="company_id" className={LABEL}>Empresa *</label>
              <select id="company_id" name="company_id" required className={INPUT}>
                <option value="">Seleccionar empresa…</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Crear usuario cliente
          </button>
          <Link href="/admin/usuarios" className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)] transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
