import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/rbac'
import { crearCuadrilla } from '@/app/actions/cuadrillas'
import { SubmitButton } from '@/app/_components/submit-button'
import { formatRut } from '@/lib/rut'
import { UsersRound } from 'lucide-react'
import { CuadrillaBoard } from './_components/cuadrilla-board'

export default async function CuadrillasPage() {
  await requireAdminPage()
  const supabase = await createClient()

  const [{ data: dir }, { data: cuadrillas }] = await Promise.all([
    supabase
      .from('persona_directorio')
      .select('persona_id, cuadrilla_id, personas(nombres, apellido_paterno, tipo_documento, numero_documento)')
      .eq('activa', true),
    supabase.from('cuadrillas').select('id, nombre').eq('activa', true).order('nombre'),
  ])

  const personas = (dir ?? []).map((d) => {
    const p = d.personas as unknown as { nombres: string; apellido_paterno: string; tipo_documento: string; numero_documento: string } | null
    return {
      id: d.persona_id,
      nombre: p ? `${p.nombres} ${p.apellido_paterno}` : d.persona_id,
      doc: p ? (p.tipo_documento === 'rut' ? formatRut(p.numero_documento) : p.numero_documento) : '',
      col: d.cuadrilla_id ?? 'none',
    }
  })

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shrink-0">
          <UsersRound size={19} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Cuadrillas</h1>
          <p className="text-sm text-[var(--gray-600)]">Arrastra personas entre cuadrillas. El cambio se aplica al instante y a sus asignaciones activas.</p>
        </div>
      </div>

      <form action={crearCuadrilla} className="flex items-end gap-2 mb-6 flex-wrap">
        <input type="hidden" name="back" value="/admin/cuadrillas" />
        <div>
          <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Nueva cuadrilla</label>
          <input name="nombre" placeholder="Cuadrilla A" className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" required />
        </div>
        <SubmitButton pendingText="Creando…" className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Crear cuadrilla</SubmitButton>
      </form>

      {!personas.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center text-sm text-[var(--gray-600)]">
          No hay personas activas en el directorio.
        </div>
      ) : (
        <CuadrillaBoard cuadrillas={cuadrillas ?? []} personas={personas} />
      )}
    </div>
  )
}
