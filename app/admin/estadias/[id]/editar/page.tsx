import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from "lucide-react"
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateStay } from '@/app/actions/stays'

function toDatetimeLocal(iso: string | null) {
  if (!iso) return ''
  // Convierte ISO a formato datetime-local (YYYY-MM-DDTHH:mm)
  return new Date(iso).toISOString().slice(0, 16)
}

function toDateInput(date: string | null) {
  if (!date) return ''
  return date.slice(0, 10)
}

export default async function EditarEstadiePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()

  const { data: stay } = await supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, checked_out_at, estimated_checkout, notes,
      guests(first_name, last_name_paterno),
      rooms(number, properties(name)),
      companies(name)
    `)
    .eq('id', id)
    .single()

  if (!stay) notFound()

  const guest = stay.guests as unknown as { first_name: string; last_name_paterno: string } | null
  const room = stay.rooms as unknown as { number: string; properties: { name: string } | null } | null
  const company = stay.companies as unknown as { name: string } | null

  const action = updateStay.bind(null, id)

  const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow'
  const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/estadias" className="text-[var(--gray-500)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Editar estadía</h1>
          <p className="text-sm text-[var(--gray-600)]">
            {guest?.first_name} {guest?.last_name_paterno} · Hab. {room?.number} · {company?.name}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      <form action={action} className="space-y-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Fechas</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>
                Fecha de entrada *
                <span className="ml-1 text-xs text-amber-600 font-normal">(modificación excepcional)</span>
              </label>
              <input
                name="checked_in_at"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocal(stay.checked_in_at)}
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>Salida estimada</label>
              <input
                name="estimated_checkout"
                type="date"
                defaultValue={toDateInput(stay.estimated_checkout)}
                className={INPUT}
              />
            </div>

            {stay.checked_out_at && (
              <div className="sm:col-span-2">
                <label className={LABEL}>
                  Fecha de salida real
                  <span className="ml-1 text-xs text-[var(--gray-500)] font-normal">(solo si ya hizo check-out)</span>
                </label>
                <input
                  name="checked_out_at"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(stay.checked_out_at)}
                  className={INPUT}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Otros datos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Tipo de turno</label>
              <input
                name="shift_type"
                type="text"
                defaultValue={stay.shift_type ?? ''}
                placeholder="Ej: 7x7, dia, noche"
                className={INPUT}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Observaciones</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={stay.notes ?? ''}
              placeholder="Notas adicionales…"
              className={`${INPUT} resize-none`}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Guardar cambios
          </button>
          <Link
            href="/admin/estadias"
            className="px-6 py-2.5 bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--gray-700)] text-sm font-medium rounded-xl hover:border-[var(--brand)] transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
