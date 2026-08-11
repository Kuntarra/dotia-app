'use client'

import { useRouter } from 'next/navigation'
import { hoyChile, sumarDias } from '@/lib/fechas'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Proyecto = { id: string; nombre: string }

export function EstadoControls({ proyectos, proyecto, fecha }: { proyectos: Proyecto[]; proyecto: string; fecha: string }) {
  const router = useRouter()
  const go = (p: string, f: string) => router.push(`/admin/estado?proyecto=${p}&fecha=${f}`)
  const moverDia = (dias: number) => go(proyecto, sumarDias(fecha, dias))
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })
  const hoy = hoyChile()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex flex-wrap gap-2">
        {proyectos.map((p) => (
          <button key={p.id} onClick={() => go(p.id, fecha)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${p.id === proyecto ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
            {p.nombre}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => moverDia(-1)} title="Día anterior" className="p-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronLeft size={16} strokeWidth={2.5} /></button>
        <div className="text-center min-w-[180px]">
          <p className="text-sm font-semibold text-[var(--ink)] capitalize leading-tight">{fechaLabel}</p>
          {fecha === hoy && <p className="text-[11px] text-[var(--senal-dark)] font-medium">hoy</p>}
        </div>
        <button onClick={() => moverDia(1)} title="Día siguiente" className="p-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronRight size={16} strokeWidth={2.5} /></button>
      </div>
    </div>
  )
}
