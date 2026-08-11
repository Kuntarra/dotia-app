import { CheckCircle2, Package, AlertCircle, Users, ChevronRight, Printer, Building2 } from 'lucide-react'

export type EstadoLav = 'entregada' | 'en_proceso' | 'sin_bolsa'
export type PersonaResumen = { dotacionId: string; nombre: string; estado: EstadoLav; bolsaId: string | null }
export type GrupoResumen = { propiedad: string; personas: PersonaResumen[] }

const META: Record<EstadoLav, { label: string; single: string; color: string; Icon: typeof CheckCircle2 }> = {
  entregada:  { label: 'Entregadas',  single: 'Entregada',  color: '#059669', Icon: CheckCircle2 },
  en_proceso: { label: 'En proceso',  single: 'En proceso', color: '#b45309', Icon: Package },
  sin_bolsa:  { label: 'Sin bolsa',   single: 'Sin bolsa',  color: '#dc2626', Icon: AlertCircle },
}

function cuenta(personas: PersonaResumen[]) {
  return {
    total: personas.length,
    entregada: personas.filter((p) => p.estado === 'entregada').length,
    en_proceso: personas.filter((p) => p.estado === 'en_proceso').length,
    sin_bolsa: personas.filter((p) => p.estado === 'sin_bolsa').length,
  }
}
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

export function ResumenLavanderia({ grupos }: { grupos: GrupoResumen[] }) {
  const all = grupos.flatMap((g) => g.personas)
  const g = cuenta(all)
  const conBolsa = g.entregada + g.en_proceso
  const cobertura = pct(conBolsa, g.total)

  if (!g.total) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-12 text-center">
        <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3"><Users size={24} strokeWidth={1.5} stroke="var(--gray-600)" /></div>
        <p className="text-sm text-[var(--gray-600)]">No hay personas activas en el proyecto todavía.</p>
      </div>
    )
  }

  const kpis: { key: EstadoLav | 'total'; label: string; value: number; sub: string; color: string }[] = [
    { key: 'total', label: 'Personas del proyecto', value: g.total, sub: `${cobertura}% con bolsa registrada`, color: 'var(--brand)' },
    { key: 'en_proceso', label: META.en_proceso.label, value: g.en_proceso, sub: `${pct(g.en_proceso, g.total)}% del total`, color: META.en_proceso.color },
    { key: 'entregada', label: META.entregada.label, value: g.entregada, sub: `${pct(g.entregada, g.total)}% del total`, color: META.entregada.color },
    { key: 'sin_bolsa', label: META.sin_bolsa.label, value: g.sin_bolsa, sub: `${pct(g.sin_bolsa, g.total)}% faltante`, color: META.sin_bolsa.color },
  ]

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} strokeWidth={2} className="text-[var(--ink)]" />
        <h2 className="text-base font-semibold text-[var(--ink)]">Resumen de lavandería</h2>
      </div>

      {/* KPIs del proyecto */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map((k) => (
          <div key={k.key} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4" style={{ borderTop: `3px solid ${k.color}` }}>
            <div className="font-display text-3xl font-semibold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-sm font-medium text-[var(--ink)] mt-0.5">{k.label}</div>
            <div className="text-[11px] text-[var(--gray-500)] mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Barra de cobertura global */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4 mb-6">
        <div className="flex items-center justify-between text-xs text-[var(--gray-600)] mb-2">
          <span className="font-medium text-[var(--ink)]">Cobertura del proyecto</span>
          <span>{conBolsa}/{g.total} con bolsa · <strong style={{ color: cobertura >= 80 ? META.entregada.color : 'var(--senal-dark)' }}>{cobertura}%</strong></span>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--gray-100)] overflow-hidden flex">
          <div style={{ width: `${pct(g.entregada, g.total)}%`, background: META.entregada.color }} />
          <div style={{ width: `${pct(g.en_proceso, g.total)}%`, background: META.en_proceso.color }} />
        </div>
        <div className="flex flex-wrap gap-4 mt-2.5 text-[11px] text-[var(--gray-600)]">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: META.entregada.color }} /> Entregadas</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: META.en_proceso.color }} /> En proceso</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--gray-200)]" /> Sin bolsa</span>
        </div>
      </div>

      {/* Desglose por propiedad */}
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Por propiedad</h3>
      <div className="space-y-3">
        {grupos.map((grupo) => {
          const c = cuenta(grupo.personas)
          const cob = pct(c.entregada + c.en_proceso, c.total)
          const faltantes = grupo.personas.filter((p) => p.estado === 'sin_bolsa')
          return (
            <div key={grupo.propiedad} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] overflow-hidden">
              <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-[12rem]">
                  <div className="w-9 h-9 rounded-lg bg-[var(--brand)]/5 grid place-items-center"><Building2 size={17} strokeWidth={2} className="text-[var(--ink)]" /></div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{grupo.propiedad}</div>
                    <div className="text-[11px] text-[var(--gray-500)]">{c.total} {c.total === 1 ? 'persona' : 'personas'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1.5" style={{ color: META.entregada.color }}><CheckCircle2 size={15} /> <strong>{c.entregada}</strong></span>
                  <span className="inline-flex items-center gap-1.5" style={{ color: META.en_proceso.color }}><Package size={15} /> <strong>{c.en_proceso}</strong></span>
                  <span className="inline-flex items-center gap-1.5" style={{ color: META.sin_bolsa.color }}><AlertCircle size={15} /> <strong>{c.sin_bolsa}</strong></span>
                  <span className="text-[var(--gray-400)]">·</span>
                  <span className="tabular-nums font-semibold" style={{ color: cob >= 80 ? META.entregada.color : 'var(--senal-dark)' }}>{cob}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-[var(--gray-100)] flex">
                <div style={{ width: `${pct(c.entregada, c.total)}%`, background: META.entregada.color }} />
                <div style={{ width: `${pct(c.en_proceso, c.total)}%`, background: META.en_proceso.color }} />
              </div>

              {/* Faltantes clickeables */}
              {!!faltantes.length && (
                <details className="group border-t border-[var(--gray-100)]">
                  <summary className="px-5 py-3 flex items-center gap-2 cursor-pointer list-none text-sm text-red-700 hover:bg-red-50/50">
                    <ChevronRight size={15} className="transition-transform group-open:rotate-90" />
                    <AlertCircle size={15} /> <strong>{faltantes.length}</strong> sin bolsa — ver quiénes faltan
                  </summary>
                  <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2">
                    {faltantes.map((p) => (
                      <span key={p.dotacionId} className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 border border-red-100 text-xs text-red-700">{p.nombre}</span>
                    ))}
                  </div>
                </details>
              )}

              {/* Listado completo con boletas */}
              <details className="group border-t border-[var(--gray-100)]">
                <summary className="px-5 py-3 flex items-center gap-2 cursor-pointer list-none text-sm text-[var(--gray-600)] hover:bg-[var(--gray-50)]">
                  <ChevronRight size={15} className="transition-transform group-open:rotate-90" />
                  Ver las {c.total} personas
                </summary>
                <div className="divide-y divide-[var(--gray-100)] border-t border-[var(--gray-100)]">
                  {grupo.personas.map((p) => {
                    const m = META[p.estado]
                    return (
                      <div key={p.dotacionId} className="px-5 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-sm text-[var(--ink)] font-medium">{p.nombre}</span>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: m.color }}><m.Icon size={14} /> {m.single}</span>
                          {p.bolsaId && (
                            <a href={`/print/lavanderia/${p.bolsaId}`} target="_blank" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--gray-200)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--gray-100)]"><Printer size={12} /> Boleta</a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </details>
            </div>
          )
        })}
      </div>
    </section>
  )
}
