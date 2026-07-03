import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/rbac'
import { modulosActivosTenant } from '@/lib/tenant'
import { hoyChile } from '@/lib/fechas'
import { EstadoControls } from './_components/estado-controls'
import { Bus, BedDouble, UtensilsCrossed, Package, Shirt, LayoutGrid, FolderKanban, Check, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

type ServerClient = Awaited<ReturnType<typeof createClient>>
const cnt = (q: { count: number | null }) => q.count ?? 0

async function countTraslado(s: ServerClient, pid: string, fecha: string, soloEmbarcados: boolean) {
  let q = s.from('traslado_pasajeros').select('id, traslados!inner(proyecto_id, fecha)', { count: 'exact', head: true })
    .eq('traslados.proyecto_id', pid).eq('traslados.fecha', fecha)
  if (soloEmbarcados) q = q.not('subio_at', 'is', null)
  return cnt(await q)
}
async function countPorDotacion(s: ServerClient, tabla: 'plan_alimentacion' | 'lavanderia_bolsas', pid: string, campoFecha: string, fecha: string) {
  return cnt(await s.from(tabla).select('id, dotaciones!inner(proyecto_id)', { count: 'exact', head: true })
    .eq('dotaciones.proyecto_id', pid).eq(campoFecha, fecha))
}

export default async function EstadoPage({ searchParams }: { searchParams: Promise<{ proyecto?: string; fecha?: string }> }) {
  await requireAdminPage()
  const sp = await searchParams
  const supabase = await createClient()
  const fecha = sp.fecha || hoyChile()

  const [{ data: proyectos }, modulosActivos] = await Promise.all([
    supabase.from('proyectos').select('id, nombre').order('created_at', { ascending: false }),
    modulosActivosTenant(),
  ])
  const proyectoSel = proyectos?.find((p) => p.id === sp.proyecto) ?? proyectos?.[0] ?? null

  type Tile = { key: string; label: string; Icon: LucideIcon; total: number; sub?: string; href: string }
  const tiles: Tile[] = []

  if (proyectoSel) {
    const pid = proyectoSel.id
    const act = (k: string) => modulosActivos.includes(k as never)

    if (act('transporte')) {
      const [plan, emb] = await Promise.all([countTraslado(supabase, pid, fecha, false), countTraslado(supabase, pid, fecha, true)])
      tiles.push({ key: 'transporte', label: 'Transporte', Icon: Bus, total: plan, sub: `${emb} embarcados`, href: '/admin/transporte' })
    }
    if (act('hotel')) {
      const noche = cnt(await supabase.from('stays').select('id', { count: 'exact', head: true })
        .eq('project_id', pid).lte('checked_in_at', fecha + 'T23:59:59')
        .or(`checked_out_at.is.null,checked_out_at.gte.${fecha}`))
      tiles.push({ key: 'hotel', label: 'Alojamiento', Icon: BedDouble, total: noche, sub: 'estadías esa noche', href: '/admin/estadias' })
    }
    if (act('alimentacion')) {
      const n = await countPorDotacion(supabase, 'plan_alimentacion', pid, 'fecha', fecha)
      tiles.push({ key: 'alimentacion', label: 'Alimentación', Icon: UtensilsCrossed, total: n, sub: 'planes del día', href: '/admin/alimentacion' })
    }
    if (act('colaciones')) {
      const [tot, entr] = await Promise.all([
        cnt(await supabase.from('colaciones').select('id', { count: 'exact', head: true }).eq('proyecto_id', pid).eq('fecha', fecha)),
        cnt(await supabase.from('colaciones').select('id', { count: 'exact', head: true }).eq('proyecto_id', pid).eq('fecha', fecha).eq('entregada', true)),
      ])
      tiles.push({ key: 'colaciones', label: 'Colaciones', Icon: Package, total: tot, sub: `${entr} entregadas`, href: '/admin/colaciones' })
    }
    if (act('lavanderia')) {
      const n = await countPorDotacion(supabase, 'lavanderia_bolsas', pid, 'fecha_entrega', fecha)
      tiles.push({ key: 'lavanderia', label: 'Lavandería', Icon: Shirt, total: n, sub: 'entregas del día', href: '/admin/lavanderia' })
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[var(--navy)] flex items-center justify-center shrink-0">
          <LayoutGrid size={19} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Estado</h1>
          <p className="text-sm text-[var(--gray-600)]">Panorámica del proyecto en un día: qué hay en cada servicio.</p>
        </div>
      </div>

      {!proyectos?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <FolderKanban size={24} strokeWidth={1.5} className="text-[var(--gray-600)] mx-auto mb-3" />
          <p className="text-sm text-[var(--gray-600)]">Aún no hay proyectos.</p>
        </div>
      ) : (
        <>
          <EstadoControls proyectos={proyectos} proyecto={proyectoSel?.id ?? ''} fecha={fecha} />

          {!tiles.length ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center text-sm text-[var(--gray-600)]">
              No hay módulos activos para mostrar el estado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiles.map((t) => (
                <Link key={t.key} href={t.href} className="premium-card p-5 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--navy)]/5 flex items-center justify-center shrink-0 group-hover:bg-[var(--navy)]/10 transition-colors">
                      <t.Icon size={18} strokeWidth={2} className="text-[var(--navy)]" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--ink)]">{t.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-[var(--ink)] tabular-nums leading-none">{t.total}</p>
                  {t.sub && <p className="text-xs text-[var(--gray-600)] mt-1.5 inline-flex items-center gap-1"><Check size={12} strokeWidth={2.5} className="text-emerald-500" /> {t.sub}</p>}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
