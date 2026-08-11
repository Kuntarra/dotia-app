import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/rbac'
import { crearTipoTurno, desactivarTipoTurno } from '@/app/actions/turnos'
import { SubmitButton } from '@/app/_components/submit-button'
import { CalendarRange } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'
const JORNADA: Record<string, string> = { dia: 'Día', noche: 'Noche', rotativa: 'Rotativa' }

export default async function TurnosPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: tipos } = await supabase
    .from('tipos_turno')
    .select('id, nombre, dias_trabajo, dias_descanso, horas, jornada')
    .eq('activa', true)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shrink-0">
          <CalendarRange size={19} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Turnos</h1>
          <p className="text-sm text-[var(--gray-600)]">Catálogo de tipos de turno reutilizables (NxN, horas, jornada) para asignar a las dotaciones.</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 mb-6">
        <form action={crearTipoTurno} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre</label>
            <input name="nombre" placeholder="14x14 día" className={`${INPUT} w-full`} required />
          </div>
          <div>
            <label className={LABEL}>Días trabajo</label>
            <input name="dias_trabajo" type="number" min={1} placeholder="14" className={`${INPUT} w-full`} required />
          </div>
          <div>
            <label className={LABEL}>Días descanso</label>
            <input name="dias_descanso" type="number" min={0} defaultValue={0} className={`${INPUT} w-full`} />
          </div>
          <div>
            <label className={LABEL}>Horas</label>
            <select name="horas" defaultValue="" className={`${INPUT} w-full`}>
              <option value="">—</option>
              <option value="8">8</option>
              <option value="12">12</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Jornada</label>
            <div className="flex gap-2">
              <select name="jornada" defaultValue="dia" className={`${INPUT} flex-1`}>
                <option value="dia">Día</option>
                <option value="noche">Noche</option>
                <option value="rotativa">Rotativa</option>
              </select>
              <button type="submit" className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Crear</button>
            </div>
          </div>
        </form>
      </div>

      {!tipos?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-sm text-[var(--gray-600)]">Aún no hay tipos de turno. Crea el primero arriba.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Ciclo</th>
                <th className="px-4 py-3 font-semibold">Horas</th>
                <th className="px-4 py-3 font-semibold">Jornada</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} className="border-b border-[var(--gray-100)] last:border-0">
                  <td className="px-5 py-3 font-medium text-[var(--ink)]">{t.nombre}</td>
                  <td className="px-4 py-3 text-[var(--gray-700)] tabular-nums">{t.dias_trabajo}x{t.dias_descanso}</td>
                  <td className="px-4 py-3 text-[var(--gray-600)]">{t.horas ? `${t.horas}h` : '—'}</td>
                  <td className="px-4 py-3 text-[var(--gray-600)]">{JORNADA[t.jornada] ?? t.jornada}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={desactivarTipoTurno.bind(null, t.id)}>
                      <SubmitButton pendingText="…" className="text-xs text-[var(--gray-500)] hover:text-red-600 font-medium">Dar de baja</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
