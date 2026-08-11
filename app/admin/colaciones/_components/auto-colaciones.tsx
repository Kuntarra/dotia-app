'use client'

import { useRouter } from 'next/navigation'
import { hoyChile, sumarDias } from '@/lib/fechas'
import { User, Users, UsersRound, ChevronUp, ChevronDown, CalendarRange, CalendarDays } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

type Opt = { id: string; nombre: string }
type Modo = 'inicio_fin' | 'todos'
type Scope = 'persona' | 'cuadrilla' | 'todos'

const MODOS: { v: Modo; label: string; desc: string; Icon: typeof CalendarRange }[] = [
  { v: 'inicio_fin', label: 'Inicio y fin de turno', desc: 'Una de entrada el día que parte el turno y una de salida el día que termina.', Icon: CalendarRange },
  { v: 'todos', label: 'Todos los días del turno', desc: 'Una colación por cada día que la persona está en faena.', Icon: CalendarDays },
]

const SCOPES: { v: Scope; label: string; Icon: typeof User }[] = [
  { v: 'todos', label: 'Todos en faena', Icon: Users },
  { v: 'cuadrilla', label: 'Una cuadrilla', Icon: UsersRound },
  { v: 'persona', label: 'Una persona', Icon: User },
]

interface Props {
  fecha: string
  modo: Modo
  scope: Scope
  refId: string
  dotaciones: Opt[]
  cuadrillas: Opt[]
}

export function AutoColaciones({ fecha, modo, scope, refId, dotaciones, cuadrillas }: Props) {
  const router = useRouter()

  const push = (next: Partial<{ fecha: string; modo: Modo; scope: Scope; ref: string }>) => {
    const p = new URLSearchParams()
    p.set('sugfecha', next.fecha ?? fecha)
    p.set('sugmodo', next.modo ?? modo)
    p.set('sugscope', next.scope ?? scope)
    const r = next.ref !== undefined ? next.ref : refId
    if (r) p.set('sugref', r)
    router.push(`/admin/colaciones?${p.toString()}`)
  }

  const moverDia = (dias: number) => push({ fecha: sumarDias(fecha, dias) })
  const hoy = hoyChile()
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })

  return (
    <div className="space-y-5">
      {/* Modo de cálculo */}
      <div>
        <span className={LABEL}>Qué generar</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {MODOS.map(({ v, label, desc, Icon }) => (
            <button type="button" key={v} onClick={() => push({ modo: v })}
              className={`text-left px-4 py-3 rounded-xl border transition-colors ${modo === v ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><Icon size={15} strokeWidth={2} /> {label}</span>
              <span className={`block text-[11px] leading-snug mt-1 ${modo === v ? 'text-white/80' : 'text-[var(--gray-500)]'}`}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alcance */}
        <div>
          <span className={LABEL}>Aplicar a</span>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map(({ v, label, Icon }) => (
              <button type="button" key={v} onClick={() => push({ scope: v, ref: '' })}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${scope === v ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
                <Icon size={15} strokeWidth={2} /> {label}
              </button>
            ))}
          </div>
          {scope === 'persona' && (
            <select value={refId} onChange={(e) => push({ ref: e.target.value })} className={`${INPUT} w-full mt-2`}>
              <option value="" disabled>Selecciona persona…</option>
              {dotaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          )}
          {scope === 'cuadrilla' && (<>
            <select value={refId} onChange={(e) => push({ ref: e.target.value })} className={`${INPUT} w-full mt-2`}>
              <option value="" disabled>Selecciona cuadrilla…</option>
              {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {!cuadrillas.length && <p className="text-[11px] text-[var(--gray-500)] mt-1">No hay cuadrillas creadas.</p>}
          </>)}
        </div>

        {/* Fecha de referencia */}
        <div>
          <span className={LABEL}>Fecha de referencia</span>
          <div className="flex items-center gap-1.5">
            <input type="date" value={fecha} onChange={(e) => push({ fecha: e.target.value || fecha })} className={`${INPUT} flex-1`} />
            <div className="flex flex-col">
              <button type="button" onClick={() => moverDia(1)} title="Día siguiente" className="px-2 py-0.5 rounded-t-md border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronUp size={14} strokeWidth={2.5} /></button>
              <button type="button" onClick={() => moverDia(-1)} title="Día anterior" className="px-2 py-0.5 rounded-b-md border border-t-0 border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronDown size={14} strokeWidth={2.5} /></button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--gray-500)] mt-1 capitalize">{fechaLabel}{fecha === hoy ? ' · hoy' : ''}</p>
        </div>
      </div>
    </div>
  )
}
