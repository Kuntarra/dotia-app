import { LoginForm } from './_components/login-form'
import { MapPin } from 'lucide-react'

interface Props {
  searchParams: Promise<{ error?: string }>
}

function Lockup({ size = 56, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-simbolo.png" alt="dotia" width={size} height={size}
        className="object-contain select-none" draggable={false} style={{ height: size, width: size }} />
      <div className="text-left leading-none">
        <div className="font-display font-semibold tracking-[-0.01em]"
          style={{ fontSize: size * 0.42, color: dark ? '#fff' : 'var(--navy)' }}>dotia</div>
        <div className="font-semibold uppercase mt-1.5"
          style={{ fontSize: Math.max(8, size * 0.13), letterSpacing: '0.22em', color: 'var(--amber)' }}>
          Trazabilidad de personal
        </div>
      </div>
    </div>
  )
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-dvh flex">

      {/* ── Panel izquierdo — identidad de marca ── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
        style={{ background: 'radial-gradient(ellipse 190% 120% at 50% -10%, #17654E 0%, transparent 52%), linear-gradient(160deg, #12241C 0%, #14201B 52%, #0B2C22 100%)' }}
      >
        {/* Halos verdes */}
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgb(47 191 143 / 0.10), transparent 65%)' }} />
        <div className="absolute -bottom-32 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgb(47 191 143 / 0.07), transparent 65%)' }} />

        {/* Patrón de puntos */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="login-dots" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-dots)" />
        </svg>

        {/* Marca arriba */}
        <div className="relative px-14 pt-12">
          <Lockup size={52} dark />
        </div>

        {/* Contenido — centrado */}
        <div className="relative flex flex-col justify-center flex-1 px-14 pb-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 mb-7 self-start">
            <span className="w-6 h-px bg-[var(--amber)]" />
            <span className="text-[var(--amber-light)] text-[11px] font-semibold tracking-[0.24em] uppercase">
              Sistema de gestión corporativo
            </span>
          </div>

          {/* Headline editorial */}
          <h1 className="font-display text-white font-medium leading-[1.08] tracking-[-0.015em] mb-6"
            style={{ fontSize: 'clamp(2.4rem, 4vw, 3.3rem)', maxWidth: '15ch' }}>
            Sabes dónde está cada persona.{' '}
            <span style={{ color: 'var(--amber-light)', fontStyle: 'italic' }}>Siempre.</span>
          </h1>

          <p className="text-white/55 text-[15px] font-light leading-relaxed" style={{ maxWidth: '42ch' }}>
            Si alguien no está donde debería, lo sabe al instante —no al día siguiente—. Transporte,
            alojamiento y alimentación coordinados sobre una sola fuente de verdad por persona.
          </p>

          {/* Ciudades */}
          <div className="flex items-center gap-6 mt-12 pt-7 border-t border-white/12">
            {['Iquique', 'Antofagasta', 'Calama'].map(c => (
              <div key={c} className="flex items-center gap-1.5">
                <MapPin size={12} strokeWidth={2} className="text-[var(--amber)] opacity-75" />
                <span className="text-white/55 text-xs font-medium tracking-wide">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative px-14 pb-9 text-white/20 text-[10px] font-semibold tracking-[0.24em] uppercase">
          dotia · Trazabilidad de personal
        </p>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex-1 flex items-center justify-center bg-[var(--surface)] px-8 py-12">
        <div className="w-full max-w-[392px]">

          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-10">
            <Lockup size={48} />
          </div>

          {/* Encabezado */}
          <div className="mb-6">
            <h2 className="font-display text-[var(--ink)] font-semibold tracking-[-0.015em] leading-tight"
              style={{ fontSize: '2.1rem' }}>
              Bienvenido de nuevo
            </h2>
            <p className="text-[15px] text-[var(--gray-600)] mt-2 leading-relaxed font-light">
              Ingrese sus credenciales para acceder al panel de gestión.
            </p>
          </div>

          {/* Formulario */}
          <LoginForm error={error} />

          {/* Footer */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-5 text-xs">
              <a href="/terminos" className="text-[var(--gray-500)] hover:text-[var(--ink)] transition-colors">Términos</a>
              <a href="/privacidad" className="text-[var(--gray-500)] hover:text-[var(--ink)] transition-colors">Privacidad</a>
            </div>
            <p className="text-xs text-[var(--gray-500)] mt-3">
              © {new Date().getFullYear()} dotia · Trazabilidad de personal
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
