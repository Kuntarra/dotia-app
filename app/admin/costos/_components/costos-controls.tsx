'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { sumarDias } from '@/lib/fechas'
import { ChevronUp, ChevronDown } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

type Proyecto = { id: string; nombre: string }

// Controles del resumen de costos: rango de fechas (con flechas) + proyecto.
// Navega por query params para que la página (server) recalcule el resumen.
export function CostosControls({ desde, hasta, proyecto, proyectos }: { desde: string; hasta: string; proyecto: string; proyectos: Proyecto[] }) {
  const router = useRouter()
  const [d, setD] = useState(desde)
  const [h, setH] = useState(hasta)
  const [p, setP] = useState(proyecto)

  const aplicar = (nd: string, nh: string, np: string) => {
    const qs = new URLSearchParams({ desde: nd, hasta: nh })
    if (np) qs.set('proyecto', np)
    router.push(`/admin/costos?${qs.toString()}`)
  }
  const mover = (campo: 'd' | 'h', dias: number) => {
    const val = sumarDias(campo === 'd' ? d : h, dias)
    if (campo === 'd') { setD(val); aplicar(val, h, p) } else { setH(val); aplicar(d, val, p) }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
      <DateField label="Desde" value={d} onChange={(v) => { setD(v); aplicar(v, h, p) }} onStep={(n) => mover('d', n)} />
      <DateField label="Hasta" value={h} onChange={(v) => { setH(v); aplicar(d, v, p) }} onStep={(n) => mover('h', n)} />
      <div>
        <label className={LABEL}>Proyecto</label>
        <select value={p} onChange={(e) => { setP(e.target.value); aplicar(d, h, e.target.value) }} className={`${INPUT} w-full`}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
        </select>
      </div>
    </div>
  )
}

function DateField({ label, value, onChange, onStep }: { label: string; value: string; onChange: (v: string) => void; onStep: (dias: number) => void }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className={`${INPUT} flex-1`} />
        <div className="flex flex-col">
          <button type="button" onClick={() => onStep(1)} title="Día siguiente" className="px-2 py-0.5 rounded-t-md border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronUp size={14} strokeWidth={2.5} /></button>
          <button type="button" onClick={() => onStep(-1)} title="Día anterior" className="px-2 py-0.5 rounded-b-md border border-t-0 border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronDown size={14} strokeWidth={2.5} /></button>
        </div>
      </div>
    </div>
  )
}
