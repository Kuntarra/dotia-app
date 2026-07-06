// Marca compacta para topbars mobile: símbolo circular + nombre en blanco.
// Más legible que el logo completo SVG en espacios reducidos.

interface MobileBrandProps {
  subtitle?: string   // texto pequeño debajo del nombre (ej: nombre de propiedad)
}

export function MobileBrand({ subtitle }: MobileBrandProps) {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      {/* Símbolo circular */}
      <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-simbolo.png"
          alt="dotia"
          className="w-8 h-8 object-contain"
        />
      </div>

      {/* Nombre */}
      <div className="min-w-0">
        <p className="text-white font-display font-semibold text-sm leading-tight tracking-tight">dotia</p>
        {subtitle && (
          <p className="text-white/45 text-[10px] leading-tight truncate max-w-[140px]">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
