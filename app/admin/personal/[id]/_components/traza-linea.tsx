'use client'

import { useRouter } from 'next/navigation'
import { hoyChile, sumarDias } from '@/lib/fechas'
import { BedDouble, HardHat, Bus, Check, Circle, TriangleAlert, ChevronLeft, ChevronRight, UtensilsCrossed, Package, Shirt, Moon, User, CalendarDays, Plane, Coffee, type LucideIcon } from 'lucide-react'

type EstadoAct = 'planificado' | 'confirmado' | 'excepcion'
export type Actividad = { label: string; icon: string; estado: EstadoAct }
export type Punto = { key: string; nombre: string; icon: 'aloj' | 'faena' | 'aeropuerto'; actividades: Actividad[] }
export type Tramo = { hay: boolean; confirmado: boolean }
export type EstadoDia = 'trabajo' | 'descanso' | 'sin_info'

const PUNTO_ICON: Record<string, LucideIcon> = { aloj: BedDouble, faena: HardHat, aeropuerto: Plane }
const ACT_ICON: Record<string, LucideIcon> = { pernocta: Moon, comida: UtensilsCrossed, colacion: Package, lavanderia: Shirt, vuelo: Plane }

// Línea de trazabilidad por PUNTO (lugar): riel de recorrido arriba (nodos por
// lugar + persona viajando + bus en cada tramo) y tarjetas alineadas abajo con
// el detalle de actividades y su estado. Cuando el día no tiene servicios,
// distingue descanso CONFIRMADO por la rotación de un día sin información.
export function TrazaLinea({ puntos, tramos, fecha, personaId, estadoDia, turnoLabel, vuelveEl }: {
  puntos: Punto[]; tramos: Tramo[]; fecha: string; personaId: string
  estadoDia: EstadoDia; turnoLabel: string | null; vuelveEl: string | null
}) {
  const router = useRouter()
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })
  const hoy = hoyChile()
  const esHoy = fecha === hoy
  const moverDia = (d: number) => router.push(`/admin/personal/${personaId}?fecha=${sumarDias(fecha, d)}`)
  const totalAct = puntos.reduce((s, p) => s + p.actividades.length, 0)
  const conf = puntos.reduce((s, p) => s + p.actividades.filter((a) => a.estado === 'confirmado').length, 0)

  // Punto "actual" (solo mirando HOY): el primero con algo aún no confirmado;
  // si todo está confirmado, el recorrido terminó y descansa en el último.
  const idxActual = esHoy && puntos.length
    ? (() => {
        const i = puntos.findIndex((p) => p.actividades.some((a) => a.estado !== 'confirmado'))
        return i === -1 ? puntos.length - 1 : i
      })()
    : -1

  const n = puntos.length
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
  // El riel aporta cuando hay recorrido que contar: persona presente (hoy) o
  // más de un lugar que conectar. Un único punto suelto en un día pasado, no.
  const mostrarRiel = idxActual >= 0 || n > 1
  const lugarCompleto = (p: Punto) => p.actividades.length > 0 && p.actividades.every((a) => a.estado === 'confirmado')
  // Un tramo (entre lugar g y g+1) se pinta sólido si ese trayecto ya ocurrió:
  // la persona está más adelante, o el lugar de destino ya se completó.
  const tramoSolido = (g: number) => idxActual > g || lugarCompleto(puntos[g + 1])

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 mb-6">
      {/* ── Encabezado: título + progreso + navegación de día ── */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Línea de trazabilidad</h2>
          <p className="text-xs text-[var(--gray-600)] mt-0.5">Dónde está la persona y qué tiene planificado en cada lugar.</p>
        </div>
        <div className="flex items-center gap-4">
          {totalAct > 0 && (
            <div className="flex items-center gap-2" aria-label={`${conf} de ${totalAct} actividades confirmadas`}>
              <div className="w-20 h-1.5 rounded-full bg-[var(--gray-200)] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${totalAct ? (conf / totalAct) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-semibold text-[var(--ink)] tabular-nums">{conf}/{totalAct}</span>
              <span className="text-xs text-[var(--gray-600)]">confirmadas</span>
            </div>
          )}
          <div className="flex items-center rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] overflow-hidden">
            <button onClick={() => moverDia(-1)} title="Día anterior" aria-label="Día anterior"
              className="p-2 hover:bg-[var(--gray-100)] text-[var(--gray-600)] transition-colors">
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
            <span className="text-xs font-medium text-[var(--ink)] capitalize px-2 min-w-[128px] text-center border-x border-[var(--gray-100)]">
              {fechaLabel}
              {esHoy && <span className="ml-1.5 text-[10px] font-bold uppercase text-[var(--senal-dark)]">hoy</span>}
            </span>
            <button onClick={() => moverDia(1)} title="Día siguiente" aria-label="Día siguiente"
              className="p-2 hover:bg-[var(--gray-100)] text-[var(--gray-600)] transition-colors">
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {!puntos.length ? (
        estadoDia === 'descanso' ? (
          <div className="py-10 text-center">
            <div className="w-11 h-11 rounded-2xl bg-[var(--senal)]/12 flex items-center justify-center mx-auto mb-3">
              <Coffee size={20} strokeWidth={1.75} className="text-[var(--senal-dark)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--ink)]">Día de descanso</p>
            <p className="text-xs text-[var(--gray-600)] mt-1">
              Confirmado por su rotación{turnoLabel ? <> · turno <span className="font-semibold tabular-nums">{turnoLabel}</span></> : null}
            </p>
            {vuelveEl && (
              <p className="text-xs text-[var(--gray-500)] mt-0.5">
                Vuelve el {new Date(vuelveEl + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
            )}
          </div>
        ) : estadoDia === 'trabajo' ? (
          <div className="py-10 text-center">
            <div className="w-11 h-11 rounded-2xl bg-[var(--gray-100)] flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={20} strokeWidth={1.75} className="text-[var(--gray-500)]" />
            </div>
            <p className="text-sm font-medium text-[var(--ink)]">En turno, sin servicios planificados</p>
            <p className="text-xs text-[var(--gray-500)] mt-1">Este día está dentro de su rotación; los servicios que se planifiquen aparecerán aquí.</p>
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="w-11 h-11 rounded-2xl bg-[var(--gray-100)] flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={20} strokeWidth={1.75} className="text-[var(--gray-500)]" />
            </div>
            <p className="text-sm font-medium text-[var(--ink)]">Sin información para este día</p>
            <p className="text-xs text-[var(--gray-500)] mt-1">No hay rotación ni servicios registrados que cubran esta fecha.</p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto pb-1">
          <div style={{ minWidth: `${n * 240}px` }}>

            {/* ── Riel de recorrido: nodos por lugar + persona + bus ── */}
            {mostrarRiel && (
            <div className={`relative ${idxActual >= 0 ? 'h-[78px]' : 'h-12'}`}>
              <div className="absolute bottom-0 inset-x-0 h-10 grid gap-3" style={cols}>
                {puntos.map((p, i) => {
                  const recorrido = (idxActual >= 0 && i < idxActual) || lugarCompleto(p)
                  const actual = i === idxActual
                  return (
                    <div key={p.key} className="relative flex items-center justify-center">
                      {/* Medias líneas del riel: cada mitad hereda el estado de SU tramo */}
                      {i > 0 && (
                        tramoSolido(i - 1)
                          ? <span aria-hidden className="absolute left-[-6px] right-1/2 top-1/2 -translate-y-1/2 h-[2px] bg-emerald-400" />
                          : <span aria-hidden className="absolute left-[-6px] right-1/2 top-1/2 border-t-2 border-dashed border-[var(--gray-300)]" />
                      )}
                      {i < n - 1 && (
                        tramoSolido(i)
                          ? <span aria-hidden className="absolute left-1/2 right-[-6px] top-1/2 -translate-y-1/2 h-[2px] bg-emerald-400" />
                          : <span aria-hidden className="absolute left-1/2 right-[-6px] top-1/2 border-t-2 border-dashed border-[var(--gray-300)]" />
                      )}

                      {/* Nodo del lugar */}
                      {actual ? (
                        <div className="relative z-10 flex flex-col items-center">
                          <span className="absolute bottom-[calc(100%+6px)] whitespace-nowrap px-2.5 py-1 rounded-full bg-[var(--senal)]/12 border border-[var(--senal)]/40 text-[10px] font-bold uppercase tracking-wide text-[var(--senal-dark)]">
                            Aquí, ahora
                          </span>
                          <div className="w-10 h-10 rounded-full bg-[var(--brand)] flex items-center justify-center animate-pin-breathe">
                            <User size={17} strokeWidth={2.25} className="text-[var(--senal-light)]" />
                          </div>
                        </div>
                      ) : recorrido ? (
                        <span className="relative z-10 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[var(--surface)] shadow-sm flex items-center justify-center">
                          <Check size={12} strokeWidth={3} className="text-white" />
                        </span>
                      ) : (
                        <span className="relative z-10 w-6 h-6 rounded-full bg-[var(--surface)] border-2 border-[var(--gray-300)] flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gray-300)]" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bus sobre cada tramo (estado propio por tramo) */}
              {Array.from({ length: n - 1 }, (_, g) => tramos[g]?.hay && (
                <div key={g} className="absolute bottom-0 h-10 flex items-center z-20" style={{ left: `${((g + 1) / n) * 100}%`, transform: 'translateX(-50%)' }}>
                  <span className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border text-[10px] font-semibold shadow-sm
                    ${tramos[g].confirmado ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-[var(--surface)] border-[var(--gray-200)] text-[var(--gray-600)]'}`}>
                    <Bus size={12} strokeWidth={2.25} />
                    {tramos[g].confirmado ? 'Trasladado' : 'Traslado'}
                  </span>
                </div>
              ))}
            </div>
            )}

            {/* ── Tarjetas de lugar, alineadas con los nodos ── */}
            <div className={`grid gap-3 ${mostrarRiel ? 'mt-3' : ''}`} style={cols}>
              {puntos.map((p, i) => {
                const PIcon = PUNTO_ICON[p.icon] ?? BedDouble
                const actual = i === idxActual
                const confP = p.actividades.filter((a) => a.estado === 'confirmado').length
                return (
                  <div key={p.key}
                    className={`rounded-xl border overflow-hidden transition-shadow duration-200
                      ${actual
                        ? 'border-[var(--senal)]/60 bg-[var(--surface)] shadow-[0_1px_2px_rgb(14_34_56/0.04),0_10px_28px_-14px_rgb(224_163_58/0.45)] ring-1 ring-[var(--senal)]/25'
                        : 'border-[var(--gray-200)] bg-[var(--surface)]'}`}>

                    {/* Cabecera del lugar */}
                    <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${actual ? 'border-[var(--senal)]/20 bg-[var(--senal)]/[0.04]' : 'border-[var(--gray-100)] bg-[var(--gray-50)]'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${actual ? 'bg-[var(--brand)]' : 'bg-[var(--brand)]/8'}`}>
                        <PIcon size={15} strokeWidth={2} className={actual ? 'text-[var(--senal-light)]' : 'text-[var(--brand)]'} />
                      </div>
                      <span className="text-sm font-semibold text-[var(--ink)] flex-1 truncate">{p.nombre}</span>
                      <span className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full
                        ${confP === p.actividades.length && p.actividades.length > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-[var(--gray-100)] text-[var(--gray-600)]'}`}>
                        {confP}/{p.actividades.length}
                      </span>
                    </div>

                    {/* Actividades del lugar */}
                    <div className="divide-y divide-[var(--gray-100)]">
                      {p.actividades.map((a, j) => {
                        const AIcon = ACT_ICON[a.icon] ?? Circle
                        return (
                          <div key={j} className="flex items-center gap-2.5 px-4 py-2.5">
                            {a.estado === 'confirmado' ? (
                              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                <Check size={11} strokeWidth={3} className="text-white" />
                              </span>
                            ) : a.estado === 'excepcion' ? (
                              <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                <TriangleAlert size={11} strokeWidth={2.5} className="text-white" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border-2 border-[var(--gray-300)] flex items-center justify-center shrink-0">
                                <span className="w-1 h-1 rounded-full bg-[var(--gray-300)]" />
                              </span>
                            )}
                            <AIcon size={14} strokeWidth={1.75} className="text-[var(--gray-500)] shrink-0" />
                            <span className={`flex-1 min-w-0 text-[13px] font-medium leading-snug ${a.estado === 'planificado' ? 'text-[var(--gray-600)]' : 'text-[var(--ink)]'}`}>
                              {a.label}
                            </span>
                            <span className={`text-[11px] font-medium shrink-0
                              ${a.estado === 'confirmado' ? 'text-emerald-700' : a.estado === 'excepcion' ? 'text-red-600' : 'text-[var(--gray-500)]'}`}>
                              {a.estado === 'confirmado' ? 'Confirmado' : a.estado === 'excepcion' ? 'Excepción' : 'Planificado'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Leyenda compacta ── */}
      {puntos.length > 0 && (
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--gray-100)] flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--gray-600)]">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-flex items-center justify-center"><Check size={8} strokeWidth={3.5} className="text-white" /></span>
            Confirmado
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--gray-600)]">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--gray-300)]" />
            Planificado
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--gray-600)]">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 inline-flex items-center justify-center"><TriangleAlert size={8} strokeWidth={3} className="text-white" /></span>
            Excepción
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--gray-600)] ml-auto">
            <Bus size={12} strokeWidth={2} className="text-[var(--gray-500)]" />
            El bus conecta lugares cuando hay traslado
          </span>
        </div>
      )}
    </div>
  )
}
