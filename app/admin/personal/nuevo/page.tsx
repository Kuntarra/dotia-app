import { INPUT, LABEL } from '@/lib/ui'
import { createPersona } from '@/app/actions/personal'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}


export default async function NuevaPersonaPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: oficios } = await supabase
    .from('oficios')
    .select('nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/personal" className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Nueva persona</h1>
          <p className="text-sm text-[var(--gray-600)]">Agrega un trabajador a tu directorio de personal</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createPersona} className="space-y-6">
        {/* Identidad */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Identidad</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tipo_documento" className={LABEL}>Tipo de documento *</label>
              <select id="tipo_documento" name="tipo_documento" className={INPUT} defaultValue="rut">
                <option value="rut">RUT</option>
                <option value="pasaporte">Pasaporte</option>
              </select>
            </div>
            <div>
              <label htmlFor="numero_documento" className={LABEL}>Número de documento *</label>
              <input id="numero_documento" name="numero_documento" type="text" required placeholder="12.345.678-9" className={INPUT} />
            </div>
            <div>
              <label htmlFor="nombres" className={LABEL}>Nombres *</label>
              <input id="nombres" name="nombres" type="text" required placeholder="Juan Andrés" className={INPUT} />
            </div>
            <div>
              <label htmlFor="apellido_paterno" className={LABEL}>Apellido paterno *</label>
              <input id="apellido_paterno" name="apellido_paterno" type="text" required placeholder="Pérez" className={INPUT} />
            </div>
            <div>
              <label htmlFor="apellido_materno" className={LABEL}>Apellido materno</label>
              <input id="apellido_materno" name="apellido_materno" type="text" placeholder="Soto" className={INPUT} />
            </div>
            <div>
              <label htmlFor="oficio" className={LABEL}>Oficio / rol</label>
              <input id="oficio" name="oficio" type="text" list="oficios-list" placeholder="Soldador, jornal, mecánico…" className={INPUT} />
              <datalist id="oficios-list">
                {(oficios ?? []).map((o) => (
                  <option key={o.nombre} value={o.nombre} />
                ))}
              </datalist>
              <p className="text-xs text-[var(--gray-600)] mt-1">Si el oficio no existe, se crea automáticamente.</p>
            </div>
          </div>
        </div>

        {/* Contacto y datos HSE */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-5">Contacto y seguridad (HSE)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="telefono" className={LABEL}>Teléfono</label>
              <input id="telefono" name="telefono" type="text" placeholder="+56 9 1234 5678" className={INPUT} />
            </div>
            <div>
              <label htmlFor="nacionalidad" className={LABEL}>Nacionalidad</label>
              <input id="nacionalidad" name="nacionalidad" type="text" placeholder="Chilena" className={INPUT} />
            </div>
            <div>
              <label htmlFor="fecha_nacimiento" className={LABEL}>Fecha de nacimiento</label>
              <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Agregar persona
          </button>
          <Link href="/admin/personal" className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)] transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
