'use client'

import { useState, useTransition } from 'react'
import { DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { setCuadrillaPersona } from '@/app/actions/cuadrillas'
import { GripVertical, UsersRound } from 'lucide-react'

type Persona = { id: string; nombre: string; doc: string; col: string }
type Col = { id: string; nombre: string }

const NONE = 'none'

export function CuadrillaBoard({ cuadrillas, personas }: { cuadrillas: Col[]; personas: Persona[] }) {
  const [items, setItems] = useState<Persona[]>(personas)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor))

  const cols: Col[] = [{ id: NONE, nombre: 'Sin cuadrilla' }, ...cuadrillas]

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const personaId = String(e.active.id)
    const destino = e.over ? String(e.over.id) : null
    if (!destino) return
    const persona = items.find((p) => p.id === personaId)
    if (!persona || persona.col === destino) return

    const previo = persona.col
    setItems((prev) => prev.map((p) => (p.id === personaId ? { ...p, col: destino } : p)))
    startTransition(async () => {
      const res = await setCuadrillaPersona(personaId, destino === NONE ? null : destino)
      if (!res.ok) setItems((prev) => prev.map((p) => (p.id === personaId ? { ...p, col: previo } : p)))
    })
  }

  const activa = items.find((p) => p.id === activeId)

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cols.map((c) => (
          <Columna key={c.id} col={c} personas={items.filter((p) => p.col === c.id)} />
        ))}
      </div>
      <DragOverlay>{activa ? <Card persona={activa} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}

function Columna({ col, personas }: { col: Col; personas: Persona[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div ref={setNodeRef}
      className={`rounded-2xl border p-3 min-h-[140px] transition-colors ${isOver ? 'border-[var(--brand)] bg-[var(--brand)]/[0.04]' : 'border-[var(--gray-200)] bg-[var(--surface)]'}`}>
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
          <UsersRound size={14} strokeWidth={2} /> {col.nombre}
        </span>
        <span className="text-xs text-[var(--gray-500)] tabular-nums">{personas.length}</span>
      </div>
      <div className="space-y-2">
        {personas.map((p) => <Card key={p.id} persona={p} />)}
        {!personas.length && <p className="text-xs text-[var(--gray-400)] px-1 py-4 text-center">Arrastra personas aquí</p>}
      </div>
    </div>
  )
}

function Card({ persona, overlay }: { persona: Persona; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: persona.id })
  return (
    <div ref={overlay ? undefined : setNodeRef} {...(overlay ? {} : attributes)} {...(overlay ? {} : listeners)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-[var(--surface)] border-[var(--gray-200)] text-sm cursor-grab active:cursor-grabbing shadow-sm ${isDragging ? 'opacity-40' : ''} ${overlay ? 'shadow-lg ring-2 ring-[var(--brand)]/30' : ''}`}>
      <GripVertical size={14} className="text-[var(--gray-400)] shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-[var(--ink)] truncate">{persona.nombre}</p>
        <p className="text-[11px] text-[var(--gray-500)] tabular-nums">{persona.doc}</p>
      </div>
    </div>
  )
}
