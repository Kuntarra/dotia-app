'use client'

import { useRouter } from 'next/navigation'
import { hoyChile, sumarDias } from '@/lib/fechas'
import { BedDouble, HardHat, Bus, Check, Circle, TriangleAlert, ChevronLeft, ChevronRight, UtensilsCrossed, Package, Shirt, Moon, type LucideIcon } from 'lucide-react'

type EstadoAct = 'planificado' | 'confirmado' | 'excepcion'
export type Actividad = { label: string; icon: string; estado: EstadoAct }
export type Punto = { key: string; nombre: string; icon: 'aloj' | 'faena'; actividades: Actividad[] }

const PUNTO_ICON: Record<string, LucideIcon> = { aloj: BedDouble, faena: HardHat }
const ACT_ICON: Record<string, LucideIcon> = { pernocta: Moon, comida: UtensilsCrossed, colacion: Package, lavanderia: Shirt }

// Línea de trazabilidad por PUNTO (lugar). Bajo cada punto se apilan las
// actividades planificadas de la persona ese día; el transporte conecta puntos.
export function TrazaLinea({ puntos, hayTraslado, trasladoConfirmado, fecha, personaId }: {
  puntos: Punto[]; hayTraslado: boolean; trasladoConfirmado: boolean; fecha: string; personaId: string
}) {
  const router = useRouter()
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })
  const hoy = hoyChile()
  const moverDia = (d: number) => router.push(`/admin/personal/${personaId}?fecha=${sumarDias(fecha, d)}`)
  const totalAct = puntos.reduce((s, p) => s + p.actividades.length, 0)
  const conf = puntos.reduce((s, p) => s + p.actividades.filter((a) => a.estado === 'confirmado').length, 0)

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Línea de trazabilidad</h2>
          <p className="text-xs text-[var(--gray-600)] mt-0.5">Dónde está la persona y qué tiene planificado en cada lugar.</p>
        </div>
        <div className="flex items-center gap-3">
          {totalAct > 0 && <span className="text-xs font-medium text-[var(--gray-600)] tabular-nums">{conf}/{totalAct} confirmadas</span>}
          <div className="flex items-center gap-1.5">
            <button onClick={() => moverDia(-1)} title="Día anterior" className="p-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronLeft size={15} strokeWidth={2.5} /></button>
            <span className="text-xs font-medium text-[var(--ink)] capitalize min-w-[130px] text-center">{fechaLabel}{fecha === hoy ? ' · hoy' : ''}</span>
            <button onClick={() => moverDia(1)} title="Día siguiente" className="p-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronRight size={15} strokeWidth={2.5} /></button>
          </div>
        </div>
      </div>

      {!puntos.length ? (
        <div className="py-8 text-center text-sm text-[var(--gray-500)]">Sin planificación para este día.</div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="flex items-stretch gap-0" style={{ minWidth: `${puntos.length * 200}px` }}>
            {puntos.map((p, i) => {
              const PIcon = PUNTO_ICON[p.icon] ?? BedDouble
              return (
                <div key={p.key} className="flex items-stretch flex-1">
                  {/* Conector de transporte entre puntos */}
                  {i > 0 && (
                    <div className="flex flex-col items-center justify-start pt-5 px-1 shrink-0 w-16">
                      <div className={`w-full h-0.5 ${hayTraslado ? (trasladoConfirmado ? 'bg-sky-500' : 'bg-sky-300') : 'bg-[var(--gray-200)]'}`} />
                      <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-medium ${hayTraslado ? 'text-sky-700' : 'text-[var(--gray-400)]'}`}>
                        <Bus size={12} strokeWidth={2} />
                        {hayTraslado ? (trasladoConfirmado ? 'Trasladado' : 'Traslado') : '—'}
                      </div>
                    </div>
                  )}

                  {/* Punto (lugar) con sus actividades apiladas */}
                  <div className="flex-1 min-w-[150px] rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--navy)]/8 flex items-center justify-center shrink-0">
                        <PIcon size={16} strokeWidth={2} className="text-[var(--navy)]" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--ink)]">{p.nombre}</span>
                    </div>
                    <div className="space-y-1.5">
                      {p.actividades.map((a, j) => {
                        const AIcon = ACT_ICON[a.icon] ?? Circle
                        return (
                          <div key={j} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs
                            ${a.estado === 'confirmado' ? 'bg-emerald-50 text-emerald-800'
                              : a.estado === 'excepcion' ? 'bg-red-50 text-red-700'
                              : 'bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--gray-700)]'}`}>
                            <AIcon size={13} strokeWidth={2} className="shrink-0 opacity-70" />
                            <span className="flex-1 font-medium">{a.label}</span>
                            {a.estado === 'confirmado' ? <Check size={13} strokeWidth={2.5} className="text-emerald-600" />
                              : a.estado === 'excepcion' ? <TriangleAlert size={13} strokeWidth={2} className="text-red-600" />
                              : <span className="text-[10px] text-[var(--gray-400)] font-semibold uppercase">Planif.</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <p className="text-[11px] text-[var(--gray-500)] mt-3">Cada tarjeta es un lugar; debajo, lo planificado ahí. Verde = confirmado · rojo = excepción · borde = planificado. El bus conecta lugares cuando hay traslado.</p>
    </div>
  )
}
