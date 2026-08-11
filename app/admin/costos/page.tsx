import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeVerCostos, esAdministrador } from '@/lib/rbac'
import { desactivarTarifa } from '@/app/actions/costos'
import { SubmitButton } from '@/app/_components/submit-button'
import { CostosControls } from './_components/costos-controls'
import { TarifaForm } from './_components/tarifa-form'
import { Coins, TrendingUp } from 'lucide-react'

const LABELS: Record<string, string> = {
  hotel: 'Alojamiento', transporte: 'Transporte', alimentacion: 'Alimentación',
  colaciones: 'Colaciones', lavanderia: 'Lavandería',
}
const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

type ResumenRow = { modulo: string; unidad: string; cantidad_confirmada: number; tarifa_clp: number; subtotal_clp: number }

export default async function CostosPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; proyecto?: string }> }) {
  if (!(await puedeVerCostos())) redirect('/admin')

  const sp = await searchParams
  const hoy = new Date()
  const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const desde = sp.desde || primero.toISOString().slice(0, 10)
  const hasta = sp.hasta || hoy.toISOString().slice(0, 10)
  const proyecto = sp.proyecto || ''

  const supabase = await createClient()
  const puedeEditar = await esAdministrador()

  const [{ data: proyectos }, { data: resumen }, { data: tarifas }] = await Promise.all([
    supabase.from('proyectos').select('id, nombre').order('created_at', { ascending: false }),
    supabase.rpc('costos_resumen', { p_desde: desde, p_hasta: hasta, p_proyecto: proyecto || undefined }),
    supabase.from('costos_tarifas').select('id, modulo, unidad, tarifa_clp, vigencia_desde, activa').eq('activa', true).order('modulo'),
  ])

  const filas = (resumen ?? []) as ResumenRow[]
  const total = filas.reduce((s, r) => s + Number(r.subtotal_clp), 0)
  const faltanTarifas = filas.some((r) => r.tarifa_clp === 0 && r.cantidad_confirmada > 0)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shrink-0">
          <Coins size={19} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Costos</h1>
          <p className="text-sm text-[var(--gray-600)]">Tarifa unitaria × cantidad confirmada, por módulo y período.</p>
        </div>
      </div>

      {/* Controles del período */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 mb-5">
        <CostosControls desde={desde} hasta={hasta} proyecto={proyecto} proyectos={proyectos ?? []} />
      </div>

      {/* Resumen */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
              <th className="px-5 py-3 font-semibold">Módulo</th>
              <th className="px-4 py-3 font-semibold">Unidad</th>
              <th className="px-4 py-3 font-semibold text-right">Cantidad confirmada</th>
              <th className="px-4 py-3 font-semibold text-right">Tarifa</th>
              <th className="px-5 py-3 font-semibold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {!filas.length ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-[var(--gray-500)]">No hay módulos activos con datos en este período.</td></tr>
            ) : filas.map((r) => (
              <tr key={r.modulo} className="border-b border-[var(--gray-100)] last:border-0">
                <td className="px-5 py-3.5 font-medium text-[var(--ink)]">{LABELS[r.modulo] ?? r.modulo}</td>
                <td className="px-4 py-3.5 text-[var(--gray-600)]">{r.unidad}</td>
                <td className="px-4 py-3.5 text-right tabular-nums text-[var(--gray-700)]">{Number(r.cantidad_confirmada).toLocaleString('es-CL')}</td>
                <td className="px-4 py-3.5 text-right tabular-nums text-[var(--gray-700)]">{r.tarifa_clp ? clp(r.tarifa_clp) : <span className="text-[var(--senal-dark)] text-xs">sin tarifa</span>}</td>
                <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-[var(--ink)]">{clp(r.subtotal_clp)}</td>
              </tr>
            ))}
          </tbody>
          {filas.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[var(--gray-200)] bg-[var(--brand)]/[0.03]">
                <td colSpan={4} className="px-5 py-3.5 font-semibold text-[var(--ink)] inline-flex items-center gap-2"><TrendingUp size={16} strokeWidth={2} /> Total del período</td>
                <td className="px-5 py-3.5 text-right tabular-nums font-bold text-[var(--ink)] text-base">{clp(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {faltanTarifas && <p className="text-xs text-[var(--senal-dark)] mb-6">Hay módulos con cantidad confirmada pero sin tarifa cargada: su subtotal es $0 hasta que definas la tarifa abajo.</p>}

      {/* Gestión de tarifas (solo administración) */}
      {puedeEditar && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)] mb-1">Tarifas</h2>
          <p className="text-sm text-[var(--gray-600)] mb-4">Precio unitario con que se calcula cada módulo. Al cambiar una tarifa, carga una nueva con la fecha de vigencia (la anterior se conserva como historial).</p>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 mb-4">
            <TarifaForm hoy={hasta} />
          </div>

          {!!tarifas?.length && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                    <th className="px-5 py-3 font-semibold">Módulo</th>
                    <th className="px-4 py-3 font-semibold">Unidad</th>
                    <th className="px-4 py-3 font-semibold text-right">Tarifa</th>
                    <th className="px-4 py-3 font-semibold">Vigente desde</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {tarifas.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--gray-100)] last:border-0">
                      <td className="px-5 py-3 font-medium text-[var(--ink)]">{LABELS[t.modulo] ?? t.modulo}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{t.unidad}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--gray-700)]">{clp(t.tarifa_clp)}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)] tabular-nums">{t.vigencia_desde}</td>
                      <td className="px-5 py-3 text-right">
                        <form action={desactivarTarifa.bind(null, t.id)}>
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
      )}
    </div>
  )
}
