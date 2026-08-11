'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Download } from 'lucide-react'

export function PrintButton() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  async function descargar() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        periodo:   searchParams.get('periodo')   ?? 'mensual',
        mes:       searchParams.get('mes')       ?? String(new Date().getMonth() + 1),
        anio:      searchParams.get('anio')      ?? String(new Date().getFullYear()),
        empresa:   searchParams.get('empresa')   ?? 'todas',
        propiedad: searchParams.get('propiedad') ?? 'todas',
      })
      const res  = await fetch('/api/reportes/pdf?' + params.toString())
      const blob = await res.blob()
      const cd   = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const fecha = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()).replace(/\//g, '-')
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      // El nombre bueno viene del servidor con el cliente adentro; esto es solo
      // el respaldo si la cabecera no llega.
      a.download = match?.[1] ?? `reporte-${fecha}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={descargar}
      disabled={loading}
      className="no-print flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
    >
      {loading
        ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        : <Download size={16} strokeWidth={2} />}
      {loading ? 'Generando PDF…' : 'Descargar PDF'}
    </button>
  )
}
