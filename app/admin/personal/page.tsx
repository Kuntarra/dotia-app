import { createClient } from '@/lib/supabase/server'
import { getCupoPersonas } from '@/lib/tenant'
import Link from 'next/link'
import { Plus, IdCard, Search, Upload } from 'lucide-react'
import { formatRut } from '@/lib/rut'
import { Pagination } from '@/app/_components/pagination'
import { puedeGestionar } from '@/lib/rbac'
import { hoyChile } from '@/lib/fechas'

interface Props {
  searchParams: Promise<{ q?: string; page?: string; success?: string; creadas?: string; reusadas?: string; errores?: string; omitidas?: string }>
}

type Row = {
  persona_id: string
  activa: boolean
  oficio: string | null
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  tipo_documento: string
  numero_documento: string
  total: number
}

const PAGE_SIZE = 50

export default async function PersonalPage({ searchParams }: Props) {
  const { q, page, success, creadas, reusadas, errores, omitidas } = await searchParams
  const huboImport = creadas !== undefined || reusadas !== undefined || errores !== undefined
  const supabase = await createClient()

  const term = (q ?? '').trim()
  const pageNum = Math.max(1, Number(page) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  // Búsqueda + paginación EN LA BASE (escala a miles): función buscar_directorio.
  // "En faena hoy" = la persona tiene una rotación cuyo período contiene hoy
  // (situación Laboral); si está activa pero sin rotación vigente = Descanso.
  const hoy = hoyChile()
  const [{ data }, cupo, { data: faena }] = await Promise.all([
    supabase.rpc('buscar_directorio', { p_q: term, p_limit: PAGE_SIZE, p_offset: offset }),
    getCupoPersonas(),
    supabase.from('rotaciones').select('dotaciones!inner(persona_id)').lte('fecha_inicio', hoy).gte('fecha_fin_esperada', hoy),
  ])
  const rows = (data ?? []) as Row[]
  const total = rows[0]?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const laboralSet = new Set(
    ((faena ?? []) as unknown as { dotaciones: { persona_id: string } | null }[])
      .map((x) => x.dotaciones?.persona_id)
      .filter((id): id is string => !!id),
  )
  // Estado mostrado: Inactivo (fuera de rotación) · Laboral (en faena) · Descanso (días libres).
  const estadoDe = (r: Row): 'inactivo' | 'laboral' | 'descanso' =>
    !r.activa ? 'inactivo' : laboralSet.has(r.persona_id) ? 'laboral' : 'descanso'

  const docLabel = (r: Row) => (r.tipo_documento === 'rut' ? formatRut(r.numero_documento) : r.numero_documento)
  const pageHref = (p: number) => `/admin/personal?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(p) })}`
  const cupoPct = cupo.limite ? Math.min(100, Math.round((cupo.usadas / cupo.limite) * 100)) : 0
  // Semáforo estándar: verde < 75%, ámbar 75–89%, rojo ≥ 90%.
  const cupoColor = cupoPct >= 90 ? 'bg-red-500' : cupoPct >= 75 ? 'bg-[var(--senal)]' : 'bg-emerald-500'
  const puedeEscribir = await puedeGestionar('personal')

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Dotación</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Personal</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {total} {total === 1 ? 'persona' : 'personas'} en tu directorio
          </p>
        </div>
        {puedeEscribir && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/personal/importar" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
              <Upload size={16} strokeWidth={2.25} />
              Importar Excel
            </Link>
            <Link href="/admin/personal/nuevo" className="btn-primary">
              <Plus size={16} strokeWidth={2.25} />
              Nueva persona
            </Link>
          </div>
        )}
      </div>

      <div className="px-8 pb-8">
        {/* Cupo contratado (según el plan) */}
        <div className="mb-6 bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4 max-w-md">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[var(--gray-600)]">Cupo de personas (plan)</span>
            <span className="tabular-nums text-[var(--ink)] font-semibold">{cupo.usadas} / {cupo.limite} · {cupoPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--gray-100)] overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${cupoColor}`} style={{ width: `${cupoPct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-[var(--gray-500)]">{cupo.usadas.toLocaleString('es-CL')} en uso · {cupo.disponibles.toLocaleString('es-CL')} disponibles</span>
            {cupoPct >= 100
              ? <span className="text-[11px] font-semibold text-red-600">Cupo lleno · pide ampliarlo</span>
              : cupoPct >= 90
              ? <span className="text-[11px] font-semibold text-red-600">Cerca del límite</span>
              : cupoPct >= 75
              ? <span className="text-[11px] font-semibold text-amber-700">Uso alto</span>
              : null}
          </div>
        </div>

        {/* Leyenda de estados */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--gray-600)]">
          <span className="font-semibold text-[var(--gray-500)] uppercase tracking-wide">Estados:</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" /> En faena <span className="text-[var(--gray-400)]">(en su turno)</span></span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Descanso <span className="text-[var(--gray-400)]">(días libres)</span></span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--gray-400)]" /> Inactivo <span className="text-[var(--gray-400)]">(fuera de rotación)</span></span>
        </div>

        {success && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            Persona agregada al directorio.
          </div>
        )}
        {huboImport && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            Importación completada: <strong>{creadas ?? 0}</strong> nuevas ·{' '}
            <strong>{reusadas ?? 0}</strong> ya existían
            {Number(errores ?? 0) > 0 && <> · <strong className="text-red-700">{errores} con error</strong> (RUT inválido o datos faltantes)</>}
            {Number(omitidas ?? 0) > 0 && <> · <strong className="text-amber-700">{omitidas} omitidas por cupo</strong></>}.
          </div>
        )}

        {/* Buscador (en BD) */}
        <form className="mb-6 relative max-w-md">
          <Search size={16} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-600)]" />
          <input
            name="q"
            defaultValue={term}
            placeholder="Buscar por nombre o RUT…"
            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
        </form>

        {!rows.length ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-16 text-center">
            <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IdCard size={28} strokeWidth={1.5} stroke="var(--gray-600)" />
            </div>
            <p className="text-sm font-medium text-[var(--gray-600)] mb-1">
              {term ? 'Sin resultados para tu búsqueda' : 'Aún no hay personal registrado'}
            </p>
            {!term && (
              <Link href="/admin/personal/nuevo" className="text-[var(--ink)] text-sm font-semibold hover:underline">
                Registrar primera persona →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">Documento</th>
                    <th className="px-5 py-3 font-semibold">Oficio</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const nombre = `${r.nombres} ${r.apellido_paterno}${r.apellido_materno ? ' ' + r.apellido_materno : ''}`
                    return (
                      <tr key={r.persona_id} className="border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-100)]/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[var(--ink)]">
                          <a href={`/admin/personal/${r.persona_id}`} className="hover:underline">{nombre}</a>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums">{docLabel(r)}</td>
                        <td className="px-5 py-3.5 text-[var(--gray-600)]">{r.oficio ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          {(() => {
                            const e = estadoDe(r)
                            if (e === 'inactivo') return <span className="badge badge-gray">Inactivo</span>
                            if (e === 'laboral')  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> En faena</span>
                            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Descanso</span>
                          })()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination page={pageNum} totalPages={totalPages} hrefFor={pageHref} />
          </>
        )}
      </div>
    </div>
  )
}
