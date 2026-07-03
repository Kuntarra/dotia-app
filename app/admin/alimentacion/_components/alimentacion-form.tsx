'use client'

import { useState } from 'react'
import { aplicarAlimentacion } from '@/app/actions/modulos'
import { hoyChile, sumarDias } from '@/lib/fechas'
import { User, Users, UsersRound, ChevronUp, ChevronDown, CalendarDays, CalendarRange } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'
const POS = [['hotel', 'Hotel'], ['faena', 'Faena'], ['colacion', 'Colación'], ['no', 'No']] as const

type Opt = { id: string; nombre: string }
type Scope = 'persona' | 'cuadrilla' | 'todos'
type Modo = 'dia' | 'turno'

const SCOPES: { v: Scope; label: string; Icon: typeof User }[] = [
  { v: 'persona', label: 'Una persona', Icon: User },
  { v: 'cuadrilla', label: 'Una cuadrilla', Icon: UsersRound },
  { v: 'todos', label: 'Todos en faena', Icon: Users },
]

function Meal({ name, def, label }: { name: string; def: string; label: string }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <select name={name} className={`${INPUT} w-full`} defaultValue={def}>
        {POS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

export function AlimentacionForm({ dotaciones, cuadrillas }: { dotaciones: Opt[]; cuadrillas: Opt[] }) {
  const hoy = hoyChile()
  const [scope, setScope] = useState<Scope>('persona')
  const [ref, setRef] = useState('')
  const [modo, setModo] = useState<Modo>('dia')
  const [fecha, setFecha] = useState(hoy)
  const [exclPrimer, setExclPrimer] = useState(true)
  const [exclUltimo, setExclUltimo] = useState(true)

  const moverDia = (dias: number) => setFecha(sumarDias(fecha, dias))
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })

  return (
    <form action={aplicarAlimentacion} className="space-y-5">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="ref" value={scope === 'todos' ? '' : ref} />
      <input type="hidden" name="fecha" value={fecha} />
      <input type="hidden" name="modo" value={modo} />

      {/* 1 · Alcance */}
      <div>
        <span className={LABEL}>Aplicar a</span>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map(({ v, label, Icon }) => (
            <button type="button" key={v} onClick={() => { setScope(v); setRef('') }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${scope === v ? 'bg-[var(--navy)] text-white border-[var(--navy)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
              <Icon size={15} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* 2 · A quién (selector) + Cuándo (modo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {scope === 'persona' && (<>
            <label className={LABEL}>Persona</label>
            <select required value={ref} onChange={(e) => setRef(e.target.value)} className={`${INPUT} w-full`}>
              <option value="" disabled>Selecciona…</option>
              {dotaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </>)}
          {scope === 'cuadrilla' && (<>
            <label className={LABEL}>Cuadrilla</label>
            <select required value={ref} onChange={(e) => setRef(e.target.value)} className={`${INPUT} w-full`}>
              <option value="" disabled>Selecciona…</option>
              {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {!cuadrillas.length && <p className="text-[11px] text-[var(--gray-500)] mt-1">No hay cuadrillas creadas.</p>}
          </>)}
          {scope === 'todos' && (<>
            <label className={LABEL}>Alcance</label>
            <div className="px-3 py-2 rounded-lg bg-[var(--navy)]/5 text-sm text-[var(--ink)] font-medium">Todas las personas en faena</div>
          </>)}
        </div>

        <div>
          <span className={LABEL}>Período</span>
          <div className="flex gap-2">
            {([['dia', 'Un día', CalendarDays], ['turno', 'Por turno', CalendarRange]] as const).map(([v, label, Icon]) => (
              <button type="button" key={v} onClick={() => setModo(v)}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${modo === v ? 'bg-[var(--navy)] text-white border-[var(--navy)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
                <Icon size={15} strokeWidth={2} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 · Fecha + (si por turno) exclusiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>{modo === 'turno' ? 'Día de referencia del turno' : 'Fecha'}</label>
          <div className="flex items-center gap-1.5">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy)} className={`${INPUT} flex-1`} />
            <div className="flex flex-col">
              <button type="button" onClick={() => moverDia(1)} title="Día siguiente" className="px-2 py-0.5 rounded-t-md border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronUp size={14} strokeWidth={2.5} /></button>
              <button type="button" onClick={() => moverDia(-1)} title="Día anterior" className="px-2 py-0.5 rounded-b-md border border-t-0 border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronDown size={14} strokeWidth={2.5} /></button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--gray-500)] mt-1 capitalize">{fechaLabel}{fecha === hoy ? ' · hoy' : ''}</p>
        </div>

        {modo === 'turno' && (
          <div>
            <span className={LABEL}>Días del turno a excluir</span>
            <div className="flex flex-col gap-1.5 pt-0.5">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--gray-700)]">
                <input type="checkbox" name="excl_primer" checked={exclPrimer} onChange={(e) => setExclPrimer(e.target.checked)} className="w-4 h-4 accent-[var(--navy)]" />
                Excluir <strong>primer día</strong> (llegada / viaje)
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--gray-700)]">
                <input type="checkbox" name="excl_ultimo" checked={exclUltimo} onChange={(e) => setExclUltimo(e.target.checked)} className="w-4 h-4 accent-[var(--navy)]" />
                Excluir <strong>último día</strong> (regreso / viaje)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 4 · Comidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Meal name="desayuno" def="hotel" label="Desayuno" />
        <Meal name="almuerzo" def="faena" label="Almuerzo" />
        <Meal name="cena" def="hotel" label="Cena" />
      </div>

      <div>
        <button type="submit" className="px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">
          {modo === 'turno' ? 'Aplicar a todo el turno' : 'Aplicar al día'}
        </button>
        <p className="text-xs text-[var(--gray-600)] mt-2">
          {modo === 'turno'
            ? 'Configura de una vez TODOS los días del turno (la rotación que contiene el día de referencia), para todo el alcance. Excluye los días de viaje que difieren.'
            : 'Asigna las comidas de ese único día. Cada comida: hotel, faena, colación o ninguna.'}
        </p>
      </div>
    </form>
  )
}
