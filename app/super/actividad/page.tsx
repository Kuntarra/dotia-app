import { requireSuperAdmin } from '@/lib/super'
import { createAdminClient } from '@/lib/supabase/admin'
import { Activity } from 'lucide-react'

const ENTIDADES: { k: string; label: string }[] = [
  { k: 'persona', label: 'Personas' },
  { k: 'acceso', label: 'Accesos' },
  { k: 'dotacion', label: 'Dotaciones' },
  { k: 'rotacion', label: 'Rotaciones' },
  { k: 'tenant_modulos', label: 'Módulos de empresa' },
  { k: 'vinculo', label: 'Vínculos' },
  { k: 'proveedor', label: 'Proveedores' },
]
const ENTIDAD_LABEL: Record<string, string> = Object.fromEntries(ENTIDADES.map((e) => [e.k, e.label]))
const ENTIDAD_BADGE: Record<string, string> = {
  persona: 'badge-brand', acceso: 'badge-senal', dotacion: 'badge-green',
  rotacion: 'badge-gray', tenant_modulos: 'badge-brand', vinculo: 'badge-green', proveedor: 'badge-senal',
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Props { searchParams: Promise<{ entidad?: string; desde?: string; hasta?: string }> }

export default async function ActividadPage({ searchParams }: Props) {
  await requireSuperAdmin()
  const { entidad, desde, hasta } = await searchParams
  const admin = createAdminClient()

  let query = admin
    .from('registro_actividad')
    .select('id, entidad, entidad_id, accion, detalle, actor_nombre, created_at, tenants(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (entidad) query = query.eq('entidad', entidad)
  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta + 'T23:59:59')

  const { data: registros } = await query

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-[1.9rem] font-semibold text-[var(--ink)] tracking-tight leading-tight">Registro de actividad</h2>
        <p className="text-sm text-[var(--gray-600)] mt-1">Bitácora inmutable de acciones administrativas en todas las empresas. Solo Super Admin.</p>
      </div>

      {/* Filtros */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 mb-8 shadow-[var(--shadow-xs)]">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Entidad</label>
            <select name="entidad" className={INPUT} defaultValue={entidad ?? ''}>
              <option value="">Todas</option>
              {ENTIDADES.map((e) => <option key={e.k} value={e.k}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Desde</label>
            <input type="date" name="desde" defaultValue={desde ?? ''} className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta ?? ''} className={INPUT} />
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">
            <Activity size={15} strokeWidth={2.25} /> Filtrar
          </button>
        </form>
      </div>

      <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Movimientos ({registros?.length ?? 0})</h3>
      {!registros?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center text-sm text-[var(--gray-600)]">Sin actividad registrada para el filtro</div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-xs)]">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th><th>Actor</th><th>Empresa</th><th>Entidad</th><th>Acción</th><th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="text-[var(--gray-600)] tabular-nums whitespace-nowrap">{fmtFecha(r.created_at)}</td>
                  <td className="font-semibold text-[var(--ink)]">{r.actor_nombre ?? '—'}</td>
                  <td className="text-[var(--gray-600)]">{(r.tenants as unknown as { name: string } | null)?.name ?? '—'}</td>
                  <td><span className={`badge ${ENTIDAD_BADGE[r.entidad] ?? 'badge-gray'}`}>{ENTIDAD_LABEL[r.entidad] ?? r.entidad}</span></td>
                  <td className="text-[var(--ink)]">{r.accion}</td>
                  <td className="text-xs text-[var(--gray-600)] max-w-xs truncate">{r.detalle ? JSON.stringify(r.detalle) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
