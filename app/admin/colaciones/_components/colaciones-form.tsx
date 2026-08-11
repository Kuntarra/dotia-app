'use client'

import { useState } from 'react'
import { aplicarColaciones } from '@/app/actions/modulos'
import { hoyChile, sumarDias } from '@/lib/fechas'
import { User, Users, UsersRound, ChevronUp, ChevronDown } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'
const PUNTOS = [
  ['origen', 'Origen'], ['aeropuerto_llegada', 'Aeropuerto llegada'], ['transporte_ida', 'Transporte ida'],
  ['hotel', 'Hotel'], ['transporte_vuelta', 'Transporte vuelta'], ['aeropuerto_salida', 'Aeropuerto salida'], ['otro', 'Otro'],
] as const

type Opt = { id: string; nombre: string }
type Scope = 'persona' | 'cuadrilla' | 'todos'

const SCOPES: { v: Scope; label: string; Icon: typeof User }[] = [
  { v: 'persona', label: 'Una persona', Icon: User },
  { v: 'cuadrilla', label: 'Una cuadrilla', Icon: UsersRound },
  { v: 'todos', label: 'Todos en faena', Icon: Users },
]

export function ColacionesForm({ dotaciones, cuadrillas }: { dotaciones: Opt[]; cuadrillas: Opt[] }) {
  const hoy = hoyChile()
  const [scope, setScope] = useState<Scope>('persona')
  const [ref, setRef] = useState('')
  const [fecha, setFecha] = useState(hoy)

  const moverDia = (dias: number) => setFecha(sumarDias(fecha, dias))
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })

  return (
    <form action={aplicarColaciones} className="space-y-5">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="ref" value={scope === 'todos' ? '' : ref} />
      <input type="hidden" name="fecha" value={fecha} />

      {/* Alcance */}
      <div>
        <span className={LABEL}>Aplicar a</span>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map(({ v, label, Icon }) => (
            <button type="button" key={v} onClick={() => { setScope(v); setRef('') }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${scope === v ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
              <Icon size={15} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selector */}
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
            <div className="px-3 py-2 rounded-lg bg-[var(--brand)]/5 text-sm text-[var(--ink)] font-medium">Todas las personas en faena ese día</div>
          </>)}
        </div>

        {/* Fecha con flechas */}
        <div>
          <label className={LABEL}>Fecha</label>
          <div className="flex items-center gap-1.5">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy)} className={`${INPUT} flex-1`} />
            <div className="flex flex-col">
              <button type="button" onClick={() => moverDia(1)} title="Día siguiente" className="px-2 py-0.5 rounded-t-md border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronUp size={14} strokeWidth={2.5} /></button>
              <button type="button" onClick={() => moverDia(-1)} title="Día anterior" className="px-2 py-0.5 rounded-b-md border border-t-0 border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronDown size={14} strokeWidth={2.5} /></button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--gray-500)] mt-1 capitalize">{fechaLabel}{fecha === hoy ? ' · hoy' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={LABEL}>Punto de entrega</label>
          <select name="punto_entrega" className={`${INPUT} w-full`} defaultValue="hotel">
            {PUNTOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Sentido</label>
          <select name="sentido" className={`${INPUT} w-full`} defaultValue="entrada">
            <option value="entrada">Entrada (a turno)</option>
            <option value="salida">Salida (de turno)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Cantidad c/u</label>
          <input name="cantidad" type="number" min={1} defaultValue={1} className={`${INPUT} w-full`} />
        </div>
        <div>
          <label className={LABEL}>Contenido (opcional)</label>
          <input name="contenido" className={`${INPUT} w-full`} placeholder="Sándwich + jugo" />
        </div>
      </div>

      <div>
        <button type="submit" className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Generar colaciones</button>
        <p className="text-xs text-[var(--gray-600)] mt-2">Genera una colación por persona en el punto elegido. "Todos en faena" la crea de una vez para quienes están en su turno ese día; luego marcas la entrega por persona.</p>
      </div>
    </form>
  )
}
