import { createClient } from '@/lib/supabase/server'
import { createTraslado } from '@/app/actions/transporte'
import { listProyectoOptions, listVehiculoOptions } from '@/lib/data/transporte'
import { TIPO_VEHICULO_LABEL } from '@/lib/vehiculos'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function NuevoTrasladoPage({ searchParams }: Props) {
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
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Nuevo traslado</h1>
          <p className="text-sm text-[var(--gray-600)]">Movilización (origen↔proyecto) o diario (hotel↔faena)</p>
        </div>
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <form action={createTraslado} className="space-y-6">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tipo" className={LABEL}>Tipo de traslado</label>
            <select id="tipo" name="tipo" className={INPUT} defaultValue="movilizacion">
              <option value="movilizacion">Movilización (origen ↔ proyecto)</option>
              <option value="diario">Diario a faena (hotel ↔ faena)</option>
            </select>
          </div>
          <div>
            <label htmlFor="sentido" className={LABEL}>Sentido</label>
            <select id="sentido" name="sentido" className={INPUT} defaultValue="ida">
              <option value="ida">Ida</option>
              <option value="vuelta">Vuelta</option>
            </select>
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
            <input id="fecha" name="fecha" type="date" className={INPUT} />
          </div>
          <div>
            <label htmlFor="hora" className={LABEL}>Hora</label>
            <input id="hora" name="hora" type="time" className={INPUT} />
          </div>
          <div>
            <label htmlFor="origen" className={LABEL}>Origen</label>
            <input id="origen" name="origen" className={INPUT} placeholder="Aeropuerto Iquique" />
          </div>
          <div>
            <label htmlFor="destino" className={LABEL}>Destino</label>
            <input id="destino" name="destino" className={INPUT} placeholder="Nombre del hotel" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="conductor_nombre" className={LABEL}>Conductor</label>
            <input id="conductor_nombre" name="conductor_nombre" className={INPUT} placeholder="Nombre del conductor" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="px-6 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">Crear traslado</button>
          <Link href="/admin/transporte" className="px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--ink)] text-sm font-medium rounded-lg border border-[var(--gray-200)]">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
