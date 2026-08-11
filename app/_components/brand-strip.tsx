import { Handshake } from 'lucide-react'

type Marca = { nombre: string; logo: string | null; rol?: string }

function LogoBox({ m, size = 'md' }: { m: Marca; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14'
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${dim} rounded-xl border border-[var(--gray-200)] bg-[var(--surface)] grid place-items-center overflow-hidden shrink-0`}>
        {m.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.logo} alt={`Logo ${m.nombre}`} className="w-full h-full object-contain p-1" />
        ) : (
          <span className="font-display text-lg font-semibold text-[var(--gray-500)]">{m.nombre.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0">
        {m.rol && <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{m.rol}</div>}
        <div className="text-sm font-semibold text-[var(--ink)] truncate">{m.nombre}</div>
      </div>
    </div>
  )
}

// Tira de marcas para comunicar el match: Plataforma · una empresa · sus socios.
export function BrandStrip({ propia, socios, rolPropia, rolSocios }: { propia: Marca; socios: Marca[]; rolPropia: string; rolSocios: string }) {
  return (
    <div className="bg-gradient-to-br from-[var(--brand)]/[0.04] to-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 mb-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* Plataforma */}
        <div className="flex items-center gap-2.5">
          <div className="w-14 h-14 rounded-xl bg-[var(--brand)] grid place-items-center shrink-0">
            <span className="font-display text-lg font-bold text-white">D</span>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Plataforma</div>
            <div className="text-sm font-semibold text-[var(--ink)]">Dotia</div>
          </div>
        </div>

        <LogoBox m={{ ...propia, rol: rolPropia }} />

        {socios.length > 0 && <Handshake size={20} className="text-[var(--senal-dark)]" />}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {socios.map((s, i) => <LogoBox key={i} m={{ ...s, rol: rolSocios }} size="sm" />)}
        </div>
      </div>
    </div>
  )
}
