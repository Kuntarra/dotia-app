import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderKanban } from 'lucide-react'

const ESTADO_BADGE: Record<string, string> = {
  planificado: 'badge-gray',
  activo: 'badge-green',
  suspendido: 'badge-senal',
  cerrado: 'badge-gray',
}

export default async function ProyectosPage() {
  const supabase = await createClient()

  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('*, cities(name), dotaciones(id)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Dotación</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Proyectos</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {proyectos?.length ?? 0} {(proyectos?.length ?? 0) === 1 ? 'proyecto' : 'proyectos'}
          </p>
        </div>
        <Link href="/admin/proyectos/nuevo" className="btn-primary shrink-0">
          <Plus size={16} strokeWidth={2.25} />
          Nuevo proyecto
        </Link>
      </div>

      <div className="px-8 pb-8">
        {!proyectos?.length ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-16 text-center">
            <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderKanban size={28} strokeWidth={1.5} stroke="var(--gray-600)" />
            </div>
            <p className="text-sm font-medium text-[var(--gray-600)] mb-1">Aún no hay proyectos</p>
            <Link href="/admin/proyectos/nuevo" className="text-[var(--ink)] text-sm font-semibold hover:underline">
              Crear primer proyecto →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {proyectos.map((p) => {
              const dotaciones = (p.dotaciones as { id: string }[]) ?? []
              const ciudad = (p.cities as { name: string } | null)?.name
              return (
                <Link key={p.id} href={`/admin/proyectos/${p.id}`} className="premium-card group block p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-[var(--ink)] group-hover:underline leading-tight">
                      {p.nombre}
                    </h3>
                    <span className={`badge shrink-0 ${ESTADO_BADGE[p.estado] ?? 'badge-gray'}`}>
                      {p.estado}
                    </span>
                  </div>
                  {(p.faena || ciudad) && (
                    <p className="text-xs text-[var(--gray-600)] mb-3 truncate">
                      {[p.faena, ciudad].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="flex items-center gap-4 pt-3 border-t border-[var(--gray-100)] text-xs text-[var(--gray-600)]">
                    <span><strong className="text-[var(--ink)]">{dotaciones.length}</strong> personas</span>
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
