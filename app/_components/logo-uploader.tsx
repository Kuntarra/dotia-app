'use client'

import { useState } from 'react'
import { ImageUp } from 'lucide-react'

export function LogoUploader({ action, current, nombre }: { action: (formData: FormData) => void; current: string | null; nombre: string }) {
  const [preview, setPreview] = useState<string | null>(null)
  const shown = preview ?? current

  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      <div className="w-20 h-20 rounded-xl border border-[var(--gray-200)] bg-[var(--surface-2)] grid place-items-center overflow-hidden shrink-0">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={`Logo de ${nombre}`} className="w-full h-full object-contain" />
        ) : (
          <span className="font-display text-2xl font-semibold text-[var(--gray-500)]">{nombre.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="space-y-2">
        <input
          name="file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required
          onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null) }}
          className="block text-xs text-[var(--gray-600)] file:mr-2 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[var(--gray-100)] file:text-[var(--ink)] file:text-sm file:font-semibold file:cursor-pointer"
        />
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-lg"><ImageUp size={15} strokeWidth={2} /> Guardar logo</button>
        <p className="text-[11px] text-[var(--gray-500)]">PNG, JPG, WEBP o SVG · máx 2 MB · idealmente fondo transparente.</p>
      </div>
    </form>
  )
}
