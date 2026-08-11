'use client'

import { useState } from 'react'
import { createMovilizacion } from '@/app/actions/transporte'
import { Plane, Bus, Car, Footprints, MoreHorizontal, Plus, X, ArrowDown } from 'lucide-react'

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

const MODOS = [
  { v: 'vuelo', label: 'Vuelo', Icon: Plane },
  { v: 'bus', label: 'Bus', Icon: Bus },
  { v: 'auto', label: 'Auto', Icon: Car },
  { v: 'caminata', label: 'A pie', Icon: Footprints },
  { v: 'otro', label: 'Otro', Icon: MoreHorizontal },
]

type Tramo = { modo: string; origen: string; destino: string; fecha: string; hora: string }
const nuevoTramo = (origen = ''): Tramo => ({ modo: 'bus', origen, destino: '', fecha: '', hora: '' })

type Opt = { id: string; nombre?: string; tipo?: string; identificador?: string | null }

export function MovilizacionForm({ proyectos, vehiculos }: { proyectos: Opt[]; vehiculos: Opt[] }) {
  const [tramos, setTramos] = useState<Tramo[]>([{ modo: 'vuelo', origen: '', destino: '', fecha: '', hora: '' }])

  const set = (i: number, patch: Partial<Tramo>) =>
    setTramos((arr) => arr.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const add = () => setTramos((arr) => [...arr, nuevoTramo(arr[arr.length - 1]?.destino ?? '')])
  const remove = (i: number) => setTramos((arr) => (arr.length > 1 ? arr.filter((_, j) => j !== i) : arr))

  return (
    <form action={createMovilizacion} className="space-y-6">
      <input type="hidden" name="tramos" value={JSON.stringify(tramos)} />

      {/* Datos generales */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="proyecto_id" className={LABEL}>Proyecto</label>
          <select id="proyecto_id" name="proyecto_id" className={INPUT} defaultValue="">
            <option value="">—</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sentido" className={LABEL}>Sentido</label>
          <select id="sentido" name="sentido" className={INPUT} defaultValue="ida">
            <option value="ida">Ida (origen → proyecto)</option>
            <option value="vuelta">Vuelta (proyecto → origen)</option>
          </select>
        </div>
        <div>
          <label htmlFor="vehiculo_id" className={LABEL}>Vehículo principal (opcional)</label>
          <select id="vehiculo_id" name="vehiculo_id" className={INPUT} defaultValue="">
            <option value="">—</option>
            {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.tipo}{v.identificador ? ` · ${v.identificador}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="conductor_nombre" className={LABEL}>Conductor / responsable (opcional)</label>
          <input id="conductor_nombre" name="conductor_nombre" className={INPUT} placeholder="Nombre" />
        </div>
      </div>

      {/* Tramos encadenados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">Tramos del viaje</h2>
            <p className="text-xs text-[var(--gray-600)]">Encadena los tramos en orden: ej. Vuelo Santiago→Iquique, luego Bus Iquique→Faena.</p>
          </div>
          <button type="button" onClick={add} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-sm font-semibold hover:bg-[var(--gray-100)]">
            <Plus size={15} strokeWidth={2.5} /> Agregar tramo
          </button>
        </div>

        <div className="space-y-3">
          {tramos.map((t, i) => (
            <div key={i}>
              {i > 0 && <div className="flex justify-center -my-1"><ArrowDown size={16} className="text-[var(--gray-400)]" /></div>}
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[var(--gray-500)] uppercase tracking-wide">Tramo {i + 1}</span>
                  {tramos.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-[var(--gray-400)] hover:text-red-600" aria-label="Quitar tramo"><X size={16} strokeWidth={2.25} /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className={LABEL}>Modo</label>
                    <div className="flex gap-1">
                      {MODOS.map(({ v, label, Icon }) => (
                        <button type="button" key={v} onClick={() => set(i, { modo: v })} title={label}
                          className={`flex-1 flex items-center justify-center py-2 rounded-lg border text-xs ${t.modo === v ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--gray-600)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
                          <Icon size={15} strokeWidth={2} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Origen</label>
                    <input className={INPUT} value={t.origen} onChange={(e) => set(i, { origen: e.target.value })} placeholder="Santiago" />
                  </div>
                  <div>
                    <label className={LABEL}>Destino</label>
                    <input className={INPUT} value={t.destino} onChange={(e) => set(i, { destino: e.target.value })} placeholder="Iquique" />
                  </div>
                  <div>
                    <label className={LABEL}>Fecha</label>
                    <input type="date" className={INPUT} value={t.fecha} onChange={(e) => set(i, { fecha: e.target.value })} />
                  </div>
                  <div>
                    <label className={LABEL}>Hora</label>
                    <input type="time" className={INPUT} value={t.hora} onChange={(e) => set(i, { hora: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Crear movilización</button>
        <a href="/admin/transporte" className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)]">Cancelar</a>
      </div>
    </form>
  )
}
