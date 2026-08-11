import { createClient } from '@/lib/supabase/server'
import { createTrasladoDiario } from '@/app/actions/transporte'
import { listProyectoOptions, listVehiculoOptions } from '@/lib/data/transporte'
import { TIPO_VEHICULO_LABEL } from '@/lib/vehiculos'
import { ArrowLeft, Sun, Moon } from 'lucide-react'
import Link from 'next/link'

interface Props { searchParams: Promise<{ error?: string }> }

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function TrasladoDiarioPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const [proyectos, vehiculos] = await Promise.all([
    listProyectoOptions(supabase),
    listVehiculoOptions(supabase),
  ])

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/transporte" className="text-[var(--gray-600)] hover:text-[var(--ink)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Traslado diario hotel ↔ faena</h1>
          <p className="text-sm text-[var(--gray-600)]">Crea de una vez la ida (hotel → faena) y la vuelta (faena → hotel) del día</p>
        </div>
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <form action={createTrasladoDiario} className="space-y-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="hotel" className={LABEL}>Hotel / alojamiento</label>
            <input id="hotel" name="hotel" className={INPUT} placeholder="Nombre del hotel" />
          </div>
          <div>
            <label htmlFor="faena" className={LABEL}>Faena / destino</label>
            <input id="faena" name="faena" className={INPUT} placeholder="Faena Collahuasi" />
          </div>
          <div>
            <label htmlFor="proyecto_id" className={LABEL}>Proyecto</label>
            <select id="proyecto_id" name="proyecto_id" className={INPUT} defaultValue="">
              <option value="">—</option>
              {(proyectos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="vehiculo_id" className={LABEL}>Vehículo</label>
            <select id="vehiculo_id" name="vehiculo_id" className={INPUT} defaultValue="">
              <option value="">—</option>
              {(vehiculos ?? []).map((v) => <option key={v.id} value={v.id}>{TIPO_VEHICULO_LABEL[v.tipo] ?? v.tipo}{v.identificador ? ` · ${v.identificador}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fecha" className={LABEL}>Fecha</label>
            <input id="fecha" name="fecha" type="date" required className={INPUT} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="conductor_nombre" className={LABEL}>Conductor (opcional)</label>
            <input id="conductor_nombre" name="conductor_nombre" className={INPUT} placeholder="Nombre del conductor" />
          </div>
          <div>
            <label htmlFor="hora_ida" className={`${LABEL} inline-flex items-center gap-1.5`}><Sun size={14} className="text-[var(--senal-dark)]" /> Hora ida (hotel → faena)</label>
            <input id="hora_ida" name="hora_ida" type="time" defaultValue="07:00" className={INPUT} />
          </div>
          <div>
            <label htmlFor="hora_vuelta" className={`${LABEL} inline-flex items-center gap-1.5`}><Moon size={14} className="text-[var(--ink)]" /> Hora vuelta (faena → hotel)</label>
            <input id="hora_vuelta" name="hora_vuelta" type="time" defaultValue="19:00" className={INPUT} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg">Crear ida y vuelta</button>
          <Link href="/admin/transporte" className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)]">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
