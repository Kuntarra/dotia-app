import { importPersonas } from '@/app/actions/personal'
import { ArrowLeft, Download, Upload, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function ImportarPersonalPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/personal" className="text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Importar personal desde Excel</h1>
          <p className="text-sm text-[var(--gray-600)]">Carga muchas personas de una sola vez</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[var(--ink)] mb-3">Cómo funciona</h2>
        <ol className="text-sm text-[var(--gray-600)] space-y-2 list-decimal pl-5">
          <li>Descarga la plantilla y llénala con tu personal (una persona por fila).</li>
          <li>La primera fila son los títulos de columna; no la borres.</li>
          <li>Sube el archivo. El sistema valida cada RUT y evita duplicados automáticamente.</li>
        </ol>

        <div className="mt-4 rounded-lg bg-[var(--gray-100)] p-4 text-xs text-[var(--gray-600)]">
          <p className="font-semibold text-[var(--ink)] mb-1.5">Columnas reconocidas</p>
          <p><strong>Obligatorias:</strong> RUT · Nombres · Apellido Paterno</p>
          <p><strong>Opcionales:</strong> Apellido Materno · Oficio · Teléfono · Nacionalidad</p>
        </div>

        <a href="/api/personal/plantilla"
           className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
          <Download size={15} strokeWidth={2} />
          Descargar plantilla
        </a>
      </div>

      {/* Subida */}
      <form action={importPersonas} className="bg-[var(--surface)] rounded-xl border border-[var(--gray-200)] p-6">
        <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">Subir archivo</h2>
        <div className="flex items-center gap-3 mb-5 p-4 rounded-lg border-2 border-dashed border-[var(--gray-200)]">
          <FileSpreadsheet size={28} strokeWidth={1.5} className="text-[var(--gray-600)] shrink-0" />
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="text-sm text-[var(--gray-900)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--brand)] file:text-white hover:file:bg-[var(--brand-dark)] file:cursor-pointer"
          />
        </div>
        <button type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
          <Upload size={15} strokeWidth={2.25} />
          Importar
        </button>
      </form>
    </div>
  )
}
