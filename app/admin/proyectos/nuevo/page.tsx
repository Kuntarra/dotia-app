import { INPUT, LABEL } from '@/lib/ui'
import { createProyecto } from '@/app/actions/proyectos'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}


export default async function NuevoProyectoPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: ciudades } = await supabase.from('cities').select('id, name').order('name')

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/proyectos" className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Nuevo proyecto</h1>
          <p className="text-sm text-[var(--gray-600)]">Define la faena, fechas y estado</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createProyecto} className="space-y-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="nombre" className={LABEL}>Nombre del proyecto *</label>
              <input id="nombre" name="nombre" type="text" required placeholder="Proyecto Collahuasi" className={INPUT} />
            </div>
            <div>
              <label htmlFor="faena" className={LABEL}>Faena / sitio</label>
              <input id="faena" name="faena" type="text" placeholder="Faena Norte" className={INPUT} />
            </div>
            <div>
              <label htmlFor="ciudad_id" className={LABEL}>Ciudad</label>
              <select id="ciudad_id" name="ciudad_id" className={INPUT} defaultValue="">
                <option value="">—</option>
                {(ciudades ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fecha_inicio" className={LABEL}>Fecha de inicio</label>
              <input id="fecha_inicio" name="fecha_inicio" type="date" className={INPUT} />
            </div>
            <div>
              <label htmlFor="fecha_fin_estimada" className={LABEL}>Fecha de término estimada</label>
              <input id="fecha_fin_estimada" name="fecha_fin_estimada" type="date" className={INPUT} />
            </div>
            <div>
              <label htmlFor="estado" className={LABEL}>Estado</label>
              <select id="estado" name="estado" className={INPUT} defaultValue="planificado">
                <option value="planificado">Planificado</option>
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="descripcion" className={LABEL}>Descripción</label>
              <textarea id="descripcion" name="descripcion" rows={2} className={INPUT} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Crear proyecto
          </button>
          <Link href="/admin/proyectos" className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)] transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
