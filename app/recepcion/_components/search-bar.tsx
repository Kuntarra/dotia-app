'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { Search, X } from 'lucide-react'

export function RecepcionSearchBar({ defaultValue }: { defaultValue?: string }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const inputRef     = useRef<HTMLInputElement>(null)

  function submit(q: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (q.trim()) params.set('q', q.trim())
    else          params.delete('q')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative w-full sm:w-64">
      <Search size={15} strokeWidth={1.75}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder="Nombre, RUT o Nº habitación…"
        className="w-full pl-9 pr-8 py-2 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        onKeyDown={e => { if (e.key === 'Enter') submit((e.target as HTMLInputElement).value) }}
      />
      {defaultValue && (
        <button
          type="button"
          onClick={() => { if (inputRef.current) inputRef.current.value = ''; submit('') }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-700)]"
        >
          <X size={14} strokeWidth={2.25} />
        </button>
      )}
    </div>
  )
}
