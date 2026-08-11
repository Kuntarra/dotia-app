import { createClient } from '@/lib/supabase/server'
import { modulosActivosTenant } from '@/lib/tenant'
import { MODULO_RUTA, type ModuloKey } from '@/lib/modulos'
import Link from 'next/link'
import { formatRut } from '@/lib/rut'
import { CalendarRange, FolderKanban, Bus, BedDouble, UtensilsCrossed, Package, Shirt, Check, type LucideIcon } from 'lucide-react'

// Hoja de planificación: por cada proyecto, una matriz Persona × Módulo que
// muestra qué tiene planificado cada persona en cada servicio contratado.

type Col = { key: ModuloKey; label: string; Icon: LucideIcon; table: 'traslado_pasajeros' | 'stays' | 'plan_alimentacion' | 'colaciones' | 'lavanderia_bolsas' }
const MOD_COLS: Col[] = [
  { key: 'transporte',   label: 'Transporte',   Icon: Bus,             table: 'traslado_pasajeros' },
  { key: 'hotel',        label: 'Hotel',        Icon: BedDouble,       table: 'stays' },
  { key: 'alimentacion', label: 'Alimentación', Icon: UtensilsCrossed, table: 'plan_alimentacion' },
  { key: 'colaciones',   label: 'Colaciones',   Icon: Package,         table: 'colaciones' },
  { key: 'lavanderia',   label: 'Lavandería',   Icon: Shirt,           table: 'lavanderia_bolsas' },
]

async function countsPorDotacion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: Col['table'],
  dotIds: string[],
): Promise<Map<string, number>> {
  const m = new Map<string, number>()
  if (!dotIds.length) return m
  const { data } = await supabase.from(table).select('dotacion_id').in('dotacion_id', dotIds)
  for (const r of (data ?? []) as { dotacion_id: string | null }[]) {
    if (r.dotacion_id) m.set(r.dotacion_id, (m.get(r.dotacion_id) ?? 0) + 1)
  }
  return m
}

export default async function PlanificacionPage({ searchParams }: { searchParams: Promise<{ proyecto?: string }> }) {
  const { proyecto: proyectoParam } = await searchParams
  const supabase = await createClient()

  const [{ data: proyectos }, modulosActivos] = await Promise.all([
    supabase.from('proyectos').select('id, nombre, faena, estado').order('created_at', { ascending: false }),
    modulosActivosTenant(),
  ])

  const cols = MOD_COLS.filter((c) => modulosActivos.includes(c.key))
  const proyectoSel = proyectos?.find((p) => p.id === proyectoParam) ?? proyectos?.[0] ?? null

  // Dotaciones (personal) del proyecto seleccionado + sus datos de planificación.
  let dotaciones: {
    id: string
    turno_dias_trabajo: number | null
    turno_dias_descanso: number | null
    personas: { nombres: string; apellido_paterno: string; numero_documento: string; tipo_documento: string } | null
    oficios: { nombre: string } | null
    cuadrillas: { nombre: string } | null
  }[] = []
  const counts: Record<string, Map<string, number>> = {}

  if (proyectoSel) {
    const { data } = await supabase
      .from('dotaciones')
      .select('id, turno_dias_trabajo, turno_dias_descanso, personas(nombres, apellido_paterno, numero_documento, tipo_documento), oficios(nombre), cuadrillas(nombre)')
      .eq('proyecto_id', proyectoSel.id)
      .order('created_at', { ascending: false })
    dotaciones = (data ?? []) as typeof dotaciones
    const dotIds = dotaciones.map((d) => d.id)
    const results = await Promise.all(cols.map((c) => countsPorDotacion(supabase, c.table, dotIds)))
    cols.forEach((c, i) => { counts[c.key] = results[i] })
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shrink-0">
          <CalendarRange size={19} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em] leading-tight">Planificación</h1>
          <p className="text-sm text-[var(--gray-600)]">Hoja de planificación por persona y módulo · nivel proyecto</p>
        </div>
      </div>

      {!proyectos?.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FolderKanban size={24} strokeWidth={1.5} className="text-[var(--gray-600)]" />
          </div>
          <p className="text-sm text-[var(--gray-600)]">Aún no hay proyectos.</p>
          <Link href="/admin/proyectos/nuevo" className="text-[var(--ink)] text-sm font-semibold hover:underline mt-1 inline-block">Crear el primer proyecto →</Link>
        </div>
      ) : (
        <>
          {/* Selector de proyecto */}
          <div className="flex flex-wrap gap-2 mb-5">
            {proyectos.map((p) => {
              const activo = p.id === proyectoSel?.id
              return (
                <Link key={p.id} href={`/admin/planificacion?proyecto=${p.id}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activo ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
                  {p.nombre}
                </Link>
              )
            })}
          </div>

          {/* Matriz Persona × Módulo */}
          {!dotaciones.length ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
              <p className="text-sm text-[var(--gray-600)] mb-1">Nadie asignado a <strong>{proyectoSel?.nombre}</strong> todavía.</p>
              <Link href={`/admin/proyectos/${proyectoSel?.id}`} className="text-[var(--ink)] text-sm font-semibold hover:underline">Asignar personal al proyecto →</Link>
            </div>
          ) : (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                    <th className="px-5 py-3 font-semibold">Persona</th>
                    <th className="px-4 py-3 font-semibold">Turno</th>
                    <th className="px-4 py-3 font-semibold">Cuadrilla</th>
                    {cols.map((c) => (
                      <th key={c.key} className="px-4 py-3 font-semibold text-center">
                        <span className="inline-flex items-center gap-1.5"><c.Icon size={14} strokeWidth={2} /> {c.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dotaciones.map((d) => {
                    const p = d.personas
                    const turno = d.turno_dias_trabajo ? `${d.turno_dias_trabajo}x${d.turno_dias_descanso ?? 0}` : '—'
                    const doc = p ? (p.tipo_documento === 'rut' ? formatRut(p.numero_documento) : p.numero_documento) : ''
                    return (
                      <tr key={d.id} className="border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-100)]/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-[var(--ink)]">{p ? `${p.nombres} ${p.apellido_paterno}` : '—'}</p>
                          <p className="text-xs text-[var(--gray-600)] tabular-nums">{doc}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--gray-600)]">{turno}</td>
                        <td className="px-4 py-3.5 text-[var(--gray-600)]">{d.cuadrillas?.nombre ?? '—'}</td>
                        {cols.map((c) => {
                          const n = counts[c.key]?.get(d.id) ?? 0
                          return (
                            <td key={c.key} className="px-4 py-3.5 text-center">
                              <Link href={MODULO_RUTA[c.key]} title={`Planificar ${c.label}`}
                                className={`inline-flex items-center justify-center gap-1 min-w-[2.25rem] px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${n > 0 ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]'}`}>
                                {n > 0 ? <><Check size={12} strokeWidth={2.5} /> {n}</> : '+'}
                              </Link>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-[var(--gray-500)] mt-3">
            Cada celda muestra lo planificado de esa persona en ese módulo (verde = tiene registros). Toca <strong>+</strong> para planificar en el módulo. Para el detalle de una persona, ábrela en <Link href="/admin/personal" className="text-[var(--ink)] font-semibold hover:underline">Personal</Link>.
          </p>
        </>
      )}
    </div>
  )
}
