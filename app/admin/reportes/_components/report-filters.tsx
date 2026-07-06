'use client'

import { useRouter } from 'next/navigation'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const SELECT = 'px-3 py-2 rounded-lg bg-[#0A5B45] border border-white/20 text-white text-sm focus:outline-none'

interface Props {
  periodo:         string
  mes:             number
  anio:            number
  filtroEmpresa:   string
  filtroPropiedad: string
  filtroProyecto:  string
  empresas:    { id: string; name: string }[]
  propiedades: { id: string; name: string }[]
  proyectos:   { id: string; name: string; company_id: string }[]
}

export function ReportFilters({
  periodo, mes, anio,
  filtroEmpresa, filtroPropiedad, filtroProyecto,
  empresas, propiedades, proyectos,
}: Props) {
  const router = useRouter()
  const now    = new Date()
  const years  = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      periodo, mes: String(mes), anio: String(anio),
      empresa: filtroEmpresa, propiedad: filtroPropiedad, proyecto: filtroProyecto,
      ...overrides,
    })
    router.push('/admin/reportes?' + params.toString())
  }

  // Proyectos visibles según la empresa seleccionada
  const proyectosVisibles = filtroEmpresa === 'todas'
    ? proyectos
    : proyectos.filter(p => p.company_id === filtroEmpresa)

  return (
    <div className="flex flex-wrap gap-2 items-center">

      {/* 1. Empresa */}
      <select
        value={filtroEmpresa}
        onChange={e => navigate({ empresa: e.target.value, proyecto: 'todos', propiedad: 'todas' })}
        className={SELECT}
      >
        <option value="todas">Todas las empresas</option>
        {empresas.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      {/* 2. Proyecto */}
      <select
        value={filtroProyecto}
        onChange={e => navigate({ proyecto: e.target.value })}
        className={SELECT}
        disabled={proyectosVisibles.length === 0}
      >
        <option value="todos">
          {proyectosVisibles.length === 0 ? 'Sin proyectos' : 'Todos los proyectos'}
        </option>
        {proyectosVisibles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* 3. Tipo período */}
      <select value={periodo} onChange={e => navigate({ periodo: e.target.value })} className={SELECT}>
        <option value="mensual">Mensual</option>
        <option value="anual">Anual</option>
        <option value="todo">Todo el tiempo</option>
      </select>

      {/* 4. Mes — solo en período mensual */}
      {periodo === 'mensual' && (
        <select value={mes} onChange={e => navigate({ mes: e.target.value })} className={SELECT}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      )}

      {/* 5. Año */}
      {(periodo === 'mensual' || periodo === 'anual') && (
        <select value={anio} onChange={e => navigate({ anio: e.target.value })} className={SELECT}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}

    </div>
  )
}
