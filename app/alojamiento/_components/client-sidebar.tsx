'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { BrandLogo } from '@/app/_components/brand-logo'
import { MobileBrand } from '@/app/_components/mobile-brand'
import { Home, History, BarChart3, LogOut } from 'lucide-react'

const NAV = [
  {
    href: '/alojamiento', label: 'Inicio', exact: true,
    icon: <Home size={19} strokeWidth={1.75} />,
  },
  {
    href: '/alojamiento/historial', label: 'Historial', exact: false,
    icon: <History size={19} strokeWidth={1.75} />,
  },
  {
    href: '/alojamiento/reporte', label: 'Reportes', exact: false,
    icon: <BarChart3 size={19} strokeWidth={1.75} />,
  },
]

interface Props {
  companyName: string
  fullName: string
  impersonating?: boolean
}

function BrandCard({ symbolSize = 28 }: { symbolSize?: number }) {
  return (
    <div className="bg-white rounded-xl px-3 py-2 shrink-0 flex items-center justify-center
                    shadow-[0_2px_8px_rgb(0_0_0/0.20)]">
      <BrandLogo symbolSize={symbolSize} />
    </div>
  )
}

export function ClientSidebar({ companyName, fullName, impersonating }: Props) {
  const pathname = usePathname()

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 min-h-screen bg-[var(--navy)] flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-simbolo.png" alt="dotia" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-display font-semibold text-[16px] leading-tight tracking-tight">dotia</p>
              <p className="text-white/40 text-[10px] leading-tight truncate">{companyName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item) ? 'bg-[var(--amber)]/15 text-[var(--amber)] font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              {item.icon}{item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white text-sm font-medium truncate">{fullName}</p>
          <p className="text-white/40 text-xs mb-3">Cliente</p>
          {!impersonating && (
            <form action={logout}>
              <button type="submit" className="text-xs text-white/50 hover:text-white transition-colors">Cerrar sesión →</button>
            </form>
          )}
        </div>
      </aside>

      {/* ── Mobile: top bar ────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-16 bg-[var(--navy)]/95 backdrop-blur-md border-b border-white/10 flex items-center px-4 gap-3 shadow-lg">
        <MobileBrand subtitle={companyName} />
        <div className="flex-1 min-w-0" />
        <p className="text-white/50 text-xs truncate max-w-[30%]">{fullName}</p>
      </div>

      {/* ── Mobile: bottom navigation ──────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--navy)]/95 backdrop-blur-md border-t border-white/10"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {NAV.map(item => {
            const active = isActive(item)
            return (
              <Link key={item.href} href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${
                  active ? 'text-[var(--amber)]' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                {active && <span className="absolute top-0 inset-x-3 h-0.5 bg-[var(--amber)] rounded-b-full" />}
                {item.icon}
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </Link>
            )
          })}
          {!impersonating && (
            <form action={logout} className="flex-1">
              <button type="submit" className="w-full h-full flex flex-col items-center gap-1 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200">
                <LogOut size={20} strokeWidth={2} />
                <span className="text-[11px] font-medium leading-tight">Salir</span>
              </button>
            </form>
          )}
        </div>
      </nav>
    </>
  )
}
