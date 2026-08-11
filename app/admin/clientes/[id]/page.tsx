import { INPUT, LABEL } from '@/lib/ui'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from "lucide-react"
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Property, Room, Project, PROPERTY_TYPE_LABELS } from '@/lib/types'
import { updateCompany, toggleCompanyActive } from '@/app/actions/companies'
import { createAllocation, deleteAllocation } from '@/app/actions/allocations'
import { createProject, toggleProjectActive, deleteProject } from '@/app/actions/projects'
import { AllocationForm } from '../_components/allocation-form'
import { DeleteCompanyButton } from '../_components/delete-company-button'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

const LABEL_SM = 'block text-xs font-medium text-[var(--gray-600)] mb-1.5'

export default async function ClienteDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { success, error } = await searchParams
  const supabase = await createClient()

  const { data: company } = await supabase.from('companies').select('*').eq('id', id).single()
  if (!company) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', id)
    .order('created_at')

  const { data: allocations } = await supabase
    .from('allocations')
    .select('*, projects(id, name), rooms(id, number, type, floor, capacity, properties(id, name, type, cities(name)))')
    .eq('company_id', id)
    .order('start_date', { ascending: false })

  const { data: properties } = await supabase
    .from('properties')
    .select('*, cities(name), rooms(*)')
    .eq('active', true)
    .order('name')

  const updateWithId      = updateCompany.bind(null, id)
  const toggleActive      = toggleCompanyActive.bind(null, id, !company.active)
  const createAllocWithId = createAllocation.bind(null, id)
  const createProjectWithId = createProject.bind(null, id)

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-CL') : '—'

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/clientes" className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-[var(--senal)] flex items-center justify-center shrink-0">
            <span className="text-[var(--ink)] text-xs font-black uppercase">{company.name.slice(0, 2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">{company.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                company.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--gray-200)] text-[var(--gray-600)]'
              }`}>
                {company.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            {company.rut && <p className="text-sm text-[var(--gray-600)]">RUT {company.rut}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <form action={toggleActive}>
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors">
              {company.active ? 'Desactivar' : 'Activar'}
            </button>
          </form>
          <DeleteCompanyButton id={id} />
        </div>
      </div>

      {success && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Empresa {success} correctamente.
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Datos empresa */}
      <form action={updateWithId} className="space-y-6 mb-10">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Datos de la empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="name" className={LABEL}>Nombre *</label>
              <input id="name" name="name" type="text" required defaultValue={company.name} className={INPUT} />
            </div>
            <div>
              <label htmlFor="rut" className={LABEL}>RUT empresa</label>
              <input id="rut" name="rut" type="text" defaultValue={company.rut ?? ''} placeholder="76.543.210-K" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="contact_name" className={LABEL}>Nombre del contacto</label>
              <input id="contact_name" name="contact_name" type="text" defaultValue={company.contact_name ?? ''} className={INPUT} />
            </div>
            <div>
              <label htmlFor="contact_phone" className={LABEL}>Teléfono</label>
              <input id="contact_phone" name="contact_phone" type="text" defaultValue={company.contact_phone ?? ''} className={INPUT} />
            </div>
            <div>
              <label htmlFor="contact_email" className={LABEL}>Correo</label>
              <input id="contact_email" name="contact_email" type="email" defaultValue={company.contact_email ?? ''} className={INPUT} />
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Guardar cambios
          </button>
        </div>
      </form>

      {/* Proyectos */}
      <div id="proyectos" className="mb-10">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-4">
          Proyectos
          <span className="ml-2 text-sm font-normal text-[var(--gray-600)]">({projects?.length ?? 0})</span>
        </h2>

        {projects && projects.length > 0 && (
          <div className="space-y-2 mb-4">
            {projects.map((project) => {
              const projectAllocations = (allocations ?? []).filter(
                a => (a.projects as { id: string } | null)?.id === project.id
              )
              const toggleProj = toggleProjectActive.bind(null, project.id, id, !project.active)
              const deleteProj = deleteProject.bind(null, project.id, id)

              return (
                <div key={project.id} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--ink)]">{project.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          project.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--gray-100)] text-[var(--gray-600)]'
                        }`}>
                          {project.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-xs text-[var(--gray-600)] mt-0.5">{project.description}</p>
                      )}
                      <p className="text-xs text-[var(--gray-600)] mt-1">
                        {projectAllocations.length} habitación{projectAllocations.length !== 1 ? 'es' : ''} asignada{projectAllocations.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={toggleProj}>
                        <button type="submit" className="text-xs px-2.5 py-1 rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors">
                          {project.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>
                      <form action={deleteProj}>
                        <button type="submit" className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Agregar proyecto */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5">
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Agregar proyecto</h3>
          <form action={createProjectWithId}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className={LABEL_SM}>Nombre del proyecto *</label>
                <input name="name" type="text" required placeholder="Proyecto Collahuasi" className={INPUT} />
              </div>
              <div>
                <label className={LABEL_SM}>Descripción</label>
                <input name="description" type="text" placeholder="Faena norte, turno 7x7" className={INPUT} />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
              + Agregar proyecto
            </button>
          </form>
        </div>
      </div>

      {/* Asignaciones */}
      <div id="asignaciones">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-4">
          Asignaciones de habitaciones
          <span className="ml-2 text-sm font-normal text-[var(--gray-600)]">({allocations?.length ?? 0})</span>
        </h2>

        {allocations && allocations.length > 0 ? (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Proyecto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Propiedad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Habitación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Período</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {allocations.map((alloc) => {
                  const room = alloc.rooms as (Room & { properties: (Property & { cities: { name: string } }) | null }) | null
                  const prop = room?.properties
                  const proj = alloc.projects as { id: string; name: string } | null
                  const deleteAllocAction = deleteAllocation.bind(null, alloc.id, id)

                  return (
                    <tr key={alloc.id} className="hover:bg-[var(--gray-50)]">
                      <td className="px-4 py-3">
                        {proj ? (
                          <span className="text-xs font-medium bg-[var(--senal)]/20 text-[var(--ink)] px-2 py-0.5 rounded-full">
                            {proj.name}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--gray-600)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--ink)]">{prop?.name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-600)]">
                          {(prop?.cities as { name: string } | null)?.name}
                          {prop?.type ? ` · ${PROPERTY_TYPE_LABELS[prop.type as keyof typeof PROPERTY_TYPE_LABELS]}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--ink)]">Hab. {room?.number ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-600)]">{room?.capacity} cupo{(room?.capacity ?? 0) !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--gray-600)]">
                        {formatDate(alloc.start_date)} → {formatDate(alloc.end_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteAllocAction}>
                          <button type="submit" className="text-xs text-red-500 hover:text-red-700 transition-colors">Eliminar</button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-8 text-center mb-4">
            <p className="text-sm text-[var(--gray-600)]">No hay habitaciones asignadas. Primero agrega un proyecto.</p>
          </div>
        )}

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5">
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Asignar habitación</h3>
          {!projects?.length ? (
            <p className="text-sm text-[var(--gray-600)]">Debes crear al menos un proyecto antes de asignar habitaciones.</p>
          ) : (
            <AllocationForm
              action={createAllocWithId}
              properties={properties as unknown as Parameters<typeof AllocationForm>[0]['properties']}
              projects={(projects ?? []) as Project[]}
            />
          )}
        </div>
      </div>
    </div>
  )
}
