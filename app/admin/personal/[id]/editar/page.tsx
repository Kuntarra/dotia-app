import { createClient } from '@/lib/supabase/server'
import { editarPersona } from '@/app/actions/personal'
import { requireAdminPage } from '@/lib/rbac'
import { SubmitButton } from '@/app/_components/submit-button'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatRut } from '@/lib/rut'

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

interface Props { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }

export default async function EditarPersonaPage({ params, searchParams }: Props) {
  await requireAdminPage()
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: p } = await supabase.from('personas').select('*').eq('id', id).maybeSingle()
  if (!p) notFound()

  const doc = p.tipo_documento === 'rut' ? formatRut(p.numero_documento) : p.numero_documento
  const editar = editarPersona.bind(null, id)

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/personal/${id}`} className="text-[var(--gray-600)] hover:text-[var(--ink)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Editar persona</h1>
          <p className="text-sm text-[var(--gray-600)]">{doc} · el documento no se puede cambiar (es la identidad de la persona).</p>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <form action={editar} className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Nombres *</label>
            <input name="nombres" defaultValue={p.nombres ?? ''} className={INPUT} required />
          </div>
          <div>
            <label className={LABEL}>Apellido paterno *</label>
            <input name="apellido_paterno" defaultValue={p.apellido_paterno ?? ''} className={INPUT} required />
          </div>
          <div>
            <label className={LABEL}>Apellido materno</label>
            <input name="apellido_materno" defaultValue={p.apellido_materno ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Teléfono</label>
            <input name="telefono" defaultValue={p.telefono ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Nacionalidad</label>
            <input name="nacionalidad" defaultValue={p.nacionalidad ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Fecha de nacimiento</label>
            <input name="fecha_nacimiento" type="date" defaultValue={p.fecha_nacimiento ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Contacto de emergencia</label>
            <input name="contacto_emergencia_nombre" defaultValue={p.contacto_emergencia_nombre ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Teléfono de emergencia</label>
            <input name="contacto_emergencia_telefono" defaultValue={p.contacto_emergencia_telefono ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <SubmitButton pendingText="Guardando…" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">
            <Save size={15} strokeWidth={2.25} /> Guardar cambios
          </SubmitButton>
          <Link href={`/admin/personal/${id}`} className="text-sm text-[var(--gray-600)] hover:text-[var(--ink)]">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
