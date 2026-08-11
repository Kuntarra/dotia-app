import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('*, allocations(id), stays(id)')
    .order('name')

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-8 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Empresas</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Clientes</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {companies?.length ?? 0} empresas registradas
          </p>
        </div>
        <Link href="/admin/clientes/nuevo" className="btn-primary shrink-0">
          <Plus size={16} strokeWidth={2.25} />
          Nueva empresa
        </Link>
      </div>
      <div className="px-8 pb-8">

      {!companies?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-16 text-center">
          <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} strokeWidth={1.5} stroke="var(--gray-600)" />
          </div>
          <p className="text-sm font-medium text-[var(--gray-600)] mb-1">No hay empresas registradas</p>
          <Link href="/admin/clientes/nuevo" className="text-[var(--ink)] text-sm font-semibold hover:underline">
            Registrar primera empresa →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company) => {
            const allocations = (company.allocations as { id: string }[]) ?? []
            const activeStays = (company.stays as { id: string }[]) ?? []

            return (
              <Link key={company.id} href={`/admin/clientes/${company.id}`}
                className="premium-card group block p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--senal)] flex items-center justify-center shrink-0">
                      <span className="text-[var(--ink)] text-xs font-black uppercase">
                        {company.name.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--ink)] group-hover:underline leading-tight">
                        {company.name}
                      </h3>
                      {company.rut && (
                        <p className="text-xs text-[var(--gray-600)]">RUT {company.rut}</p>
                      )}
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${company.active ? 'badge-green' : 'badge-gray'}`}>
                    {company.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {company.contact_name && (
                  <p className="text-xs text-[var(--gray-600)] mb-3 truncate">
                    {company.contact_name}
                    {company.contact_phone && ` · ${company.contact_phone}`}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-[var(--gray-100)] text-xs text-[var(--gray-600)]">
                  <span><strong className="text-[var(--ink)]">{allocations.length}</strong> asignaciones</span>
                  <span><strong className="text-[var(--ink)]">{activeStays.length}</strong> estadías</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
