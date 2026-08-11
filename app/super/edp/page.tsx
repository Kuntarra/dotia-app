import { requireSuperAdmin } from '@/lib/super'
import { createAdminClient } from '@/lib/supabase/admin'
import { emitirEDP, setEdpEstado } from '@/app/actions/edp'
import { FileText, Check } from 'lucide-react'

const CLP = (n: number | null) => (n == null ? '—' : '$' + Math.round(n).toLocaleString('es-CL'))
const ESTADO_BADGE: Record<string, string> = {
  emitido: 'bg-amber-100 text-amber-700', facturado: 'bg-blue-100 text-blue-700', pagado: 'bg-emerald-100 text-emerald-700',
}
const ESTADO_LABEL: Record<string, string> = { emitido: 'EDP emitido', facturado: 'Facturado', pagado: 'Pagado' }

function periodoActual() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

export default async function EdpPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireSuperAdmin()
  const { success, error } = await searchParams
  const admin = createAdminClient()

  const [{ data: tenants }, { data: edps }] = await Promise.all([
    admin.from('tenants').select('id, name, monthly_amount').eq('active', true).order('name'),
    admin.from('edp').select('*, tenants(name)').order('emitido_at', { ascending: false }).limit(100),
  ])

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-[1.9rem] font-semibold text-[var(--ink)] tracking-tight leading-tight">Estados de Pago (EDP)</h2>
        <p className="text-sm text-[var(--gray-600)] mt-1">Emite el aviso de cobro del período; la factura va con desfase (~30 días).</p>
      </div>

      {success && <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">EDP emitido correctamente.</div>}
      {error && <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

      {/* Emitir EDP */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 mb-8 shadow-[var(--shadow-xs)]">
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Emitir EDP del período</h3>
        <form action={emitirEDP} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Cliente</label>
            <select name="tenant_id" required className="w-full px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {(tenants ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} · {CLP(t.monthly_amount)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Período</label>
            <input name="periodo" defaultValue={periodoActual()} placeholder="2026-06" className="w-full px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Monto (opcional)</label>
            <input name="monto" type="number" placeholder="usa el mensual" className="w-full px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">
            <FileText size={15} strokeWidth={2.25} /> Emitir EDP
          </button>
        </form>
        <p className="text-xs text-[var(--gray-600)] mt-2">Si no pones monto, se usa el cobro mensual del cliente. La factura se estima a +30 días.</p>
      </div>

      {/* Historial de EDP */}
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Historial ({edps?.length ?? 0})</h3>
      {!edps?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center text-sm text-[var(--gray-600)]">Aún no se ha emitido ningún EDP</div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-xs)]">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th><th>Período</th><th>Monto</th><th>Factura est.</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {edps.map((e) => {
                const facturar = setEdpEstado.bind(null, e.id, 'facturado')
                const pagar = setEdpEstado.bind(null, e.id, 'pagado')
                return (
                  <tr key={e.id}>
                    <td className="font-semibold text-[var(--ink)]">{(e.tenants as unknown as { name: string } | null)?.name ?? '—'}</td>
                    <td className="text-[var(--gray-600)] tabular-nums">{e.periodo}</td>
                    <td className="font-semibold text-[var(--ink)]">{CLP(e.monto)}</td>
                    <td className="text-[var(--gray-600)] tabular-nums">{e.factura_fecha ?? '—'}</td>
                    <td><span className={`badge ${ESTADO_BADGE[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span></td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {e.estado === 'emitido' && <form action={facturar}><button className="text-xs font-semibold text-blue-700 hover:underline">Marcar facturado</button></form>}
                        {e.estado !== 'pagado' && <form action={pagar}><button className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"><Check size={12} strokeWidth={2.5} /> Pagado</button></form>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
