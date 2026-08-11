import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, Building2, Briefcase, ArrowRight, Search } from 'lucide-react'

export const metadata = { title: 'Buscar · dotia' }

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const q = (await searchParams).q?.trim() ?? ''

  let guests: any[] = []
  let properties: any[] = []
  let companies: any[] = []

  if (q) {
    // RLS aísla por empresa automáticamente (sin llave maestra ni filtro manual).
    const supabase = await createClient()
    const like = `%${q}%`
    const [g, p, c] = await Promise.all([
      supabase.from('guests')
        .select('id, first_name, last_name_paterno, rut')
        .or(`first_name.ilike.${like},last_name_paterno.ilike.${like},rut.ilike.${like}`)
        .limit(12),
      supabase.from('properties')
        .select('id, name, cities(name)')
        .ilike('name', like)
        .limit(8),
      supabase.from('companies')
        .select('id, name')
        .ilike('name', like)
        .limit(8),
    ])
    guests = g.data ?? []
    properties = p.data ?? []
    companies = c.data ?? []
  }

  const total = guests.length + properties.length + companies.length

  return (
    <div className="px-8 py-8 max-w-4xl">
      <span className="section-label">Búsqueda</span>
      <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-[-0.01em]">
        {q ? <>Resultados para <span className="italic text-[var(--senal-dark)]">“{q}”</span></> : 'Buscar'}
      </h1>
      <p className="text-sm text-[var(--gray-600)] mt-1">
        {q ? `${total} coincidencia${total !== 1 ? 's' : ''} en huéspedes, propiedades y empresas` : 'Escribe en la barra superior para buscar.'}
      </p>

      {q && total === 0 && (
        <div className="mt-8 bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-16 text-center">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={24} strokeWidth={1.5} stroke="var(--gray-500)" />
          </div>
          <p className="text-sm font-semibold text-[var(--ink)] mb-1">Sin resultados para “{q}”</p>
          <p className="text-xs text-[var(--gray-600)]">Prueba con otro nombre, RUT, propiedad o empresa.</p>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {/* Huéspedes */}
        {guests.length > 0 && (
          <ResultGroup icon={<Users size={15} strokeWidth={1.75} />} title="Huéspedes" count={guests.length}>
            {guests.map(g => {
              const nombre = `${g.first_name ?? ''} ${g.last_name_paterno ?? ''}`.trim()
              return (
                <ResultRow key={g.id}
                  href={`/admin/huespedes/${g.id}`}
                  title={nombre || '—'} meta={g.rut ?? ''} />
              )
            })}
          </ResultGroup>
        )}

        {/* Propiedades */}
        {properties.length > 0 && (
          <ResultGroup icon={<Building2 size={15} strokeWidth={1.75} />} title="Propiedades" count={properties.length}>
            {properties.map(p => (
              <ResultRow key={p.id}
                href={`/admin/propiedades/${p.id}`}
                title={p.name} meta={(p.cities as any)?.name ?? ''} />
            ))}
          </ResultGroup>
        )}

        {/* Empresas */}
        {companies.length > 0 && (
          <ResultGroup icon={<Briefcase size={15} strokeWidth={1.75} />} title="Empresas" count={companies.length}>
            {companies.map(c => (
              <ResultRow key={c.id} href={`/admin/clientes/${c.id}`} title={c.name} meta="" />
            ))}
          </ResultGroup>
        )}
      </div>
    </div>
  )
}

function ResultGroup({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgb(11 126 96 / 0.12)', color: 'var(--senal-dark)' }}>{icon}</span>
        <h2 className="font-display text-base font-semibold text-[var(--ink)]">{title}</h2>
        <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full font-medium">{count}</span>
      </div>
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden divide-y divide-[var(--gray-100)] shadow-[var(--shadow-sm)]">
        {children}
      </div>
    </section>
  )
}

function ResultRow({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--gray-50)] transition-colors group">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ink)] truncate">{title}</p>
        {meta && <p className="text-xs text-[var(--gray-500)] truncate">{meta}</p>}
      </div>
      <ArrowRight size={15} strokeWidth={2}
        className="text-[var(--gray-400)] group-hover:text-[var(--ink)] group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  )
}
