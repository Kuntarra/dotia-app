'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { Search, X } from 'lucide-react'

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const inputRef     = useRef<HTMLInputElement>(null)

  function submit(q: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (q.trim()) {
      params.set('q', q.trim())
    } else {
      params.delete('q')
    }
    // Al buscar, volver siempre a 'todas' para no esconder resultados
    if (q.trim()) params.set('filter', 'todas')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative flex-1 max-w-sm">
      <Search size={15} strokeWidth={1.75}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder="Buscar por nombre o RUT…"
        className="w-full pl-9 pr-9 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        onKeyDown={e => { if (e.key === 'Enter') submit((e.target as HTMLInputElement).value) }}
      />
      {defaultValue && (
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            submit('')
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-700)]"
          aria-label="Limpiar búsqueda"
        >
          <X size={14} strokeWidth={2.25} />
        </button>
      )}
    </div>
  )
}
