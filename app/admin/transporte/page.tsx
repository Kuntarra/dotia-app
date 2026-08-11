import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Bus, Truck, Route, Repeat } from 'lucide-react'
import { Pagination } from '@/app/_components/pagination'
import { puedeGestionar } from '@/lib/rbac'
import { PAGE_SIZE, parsePage, rangeFor, totalPages as totalPagesFor } from '@/lib/pagination'
import { listTraslados } from '@/lib/data/transporte'

const TIPO_LABEL: Record<string, string> = { movilizacion: 'Movilización', diario: 'Diario a faena' }
const ESTADO_BADGE: Record<string, string> = {
  planificado: 'badge-gray', en_curso: 'badge-senal', completado: 'badge-green', cancelado: 'badge-gray',
}

export default async function TransportePage({ searchParams }: { searchParams: Promise<{ page?: string; diario?: string }> }) {
  const { page, diario } = await searchParams
  const pageNum = parsePage(page)
  const { from } = rangeFor(pageNum)
  const supabase = await createClient()
  const { rows: traslados, total } = await listTraslados(supabase, from, PAGE_SIZE)

  const totalPages = totalPagesFor(total)
  const puedeEscribir = await puedeGestionar('transporte')

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Módulo</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Transporte</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">{total} traslados</p>
        </div>
        {puedeEscribir && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/transporte/flota" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
              <Bus size={16} strokeWidth={2.25} /> Flota
            </Link>
            <Link href="/admin/transporte/nuevo" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
              <Plus size={16} strokeWidth={2.25} /> Traslado simple
            </Link>
            <Link href="/admin/transporte/diario" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
              <Repeat size={16} strokeWidth={2.25} /> Traslado diario
            </Link>
            <Link href="/admin/transporte/movilizacion" className="btn-primary">
              <Route size={16} strokeWidth={2.25} /> Nueva movilización
            </Link>
          </div>
        )}
      </div>

      <div className="px-8 pb-8">
        {diario && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Traslado diario creado: <strong>ida</strong> (hotel → faena) y <strong>vuelta</strong> (faena → hotel) del día.</div>}
        {!traslados.length ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-16 text-center">
            <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck size={28} strokeWidth={1.5} stroke="var(--gray-600)" />
            </div>
            <p className="text-sm font-medium text-[var(--gray-600)] mb-1">Aún no hay traslados</p>
            <Link href="/admin/transporte/nuevo" className="text-[var(--ink)] text-sm font-semibold hover:underline">Crear primer traslado →</Link>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">Ruta</th>
                  <th className="px-5 py-3 font-semibold">Proyecto</th>
                  <th className="px-5 py-3 font-semibold">Vehículo</th>
                  <th className="px-5 py-3 font-semibold">Pasajeros</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {traslados.map((t) => {
                  const pax = (t.traslado_pasajeros ?? []).length
                  const veh = t.vehiculos
                  return (
                    <tr key={t.id} className="border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-100)]/50">
                      <td className="px-5 py-3.5 tabular-nums">
                        <Link href={`/admin/transporte/${t.id}`} className="font-medium text-[var(--ink)] hover:underline">
                          {t.fecha ?? '—'}{t.hora ? ` ${(t.hora as string).slice(0,5)}` : ''}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{TIPO_LABEL[t.tipo] ?? t.tipo} · {t.sentido}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)] text-xs">{[t.origen, t.destino].filter(Boolean).join(' → ') || '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{t.proyectos?.nombre ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{veh ? `${veh.tipo}${veh.identificador ? ' · ' + veh.identificador : ''}` : '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{pax}</td>
                      <td className="px-5 py-3.5"><span className={`badge ${ESTADO_BADGE[t.estado] ?? 'badge-gray'}`}>{t.estado}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pageNum} totalPages={totalPages} hrefFor={(p) => `/admin/transporte?page=${p}`} />
      </div>
    </div>
  )
}
