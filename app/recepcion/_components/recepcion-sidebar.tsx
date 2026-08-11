'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/actions/auth'
import { BrandLogo } from '@/app/_components/brand-logo'
import { MobileBrand } from '@/app/_components/mobile-brand'
import { Users, LogIn, LogOut, Menu, X } from 'lucide-react'

const NAV = [
  {
    href: '/recepcion', label: 'Huéspedes', exact: true,
    icon: <Users size={18} strokeWidth={1.75} />,
  },
  {
    href: '/recepcion/checkin', label: 'Check-in', exact: false,
    icon: <LogIn size={18} strokeWidth={1.75} />,
  },
  {
    href: '/recepcion/checkout', label: 'Check-out', exact: false,
    icon: <LogOut size={18} strokeWidth={1.75} />,
  },
]

interface Props {
  fullName: string
  properties: { name: string; city: string }[]
  impersonating?: boolean
}

function LogoBadge({ symbolSize = 25 }: { symbolSize?: number }) {
  return (
    <div className="bg-white rounded-xl px-2.5 py-2 shrink-0 flex items-center justify-center
                    shadow-[0_2px_8px_rgb(0_0_0/0.25)]">
      <BrandLogo symbolSize={symbolSize} />
    </div>
  )
}

function isActiveRoute(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
}

function NavItem({ href, label, exact, icon, onClick }: { href: string; label: string; exact: boolean; icon: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname()
  const active = isActiveRoute(pathname, href, exact)

  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 group
        ${active
          ? 'bg-[var(--senal)]/12 text-[var(--senal)]'
          : 'text-white/55 hover:text-white hover:bg-white/6'
        }`}>
      <span className={`shrink-0 transition-colors ${active ? 'text-[var(--senal)]' : 'text-white/40 group-hover:text-white/70'}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--senal)] shrink-0" />}
    </Link>
  )
}

function SidebarContent({ fullName, properties, onClose }: { fullName: string; properties: Props['properties']; onClose?: () => void }) {
  return (
    <>
      {/* Marca */}
      <div className="px-5 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-simbolo.png" alt="dotia" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-display font-semibold text-[16px] leading-tight tracking-tight">dotia</p>
            <p className="text-white/40 text-[10px] leading-tight">Recepción</p>
          </div>
        </div>
      </div>

      {/* Propiedades asignadas */}
      {properties.length > 0 && (
        <div className="px-4 py-3.5 border-b border-white/8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/25 mb-2">Mis propiedades</p>
          <div className="space-y-1.5">
            {properties.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium leading-tight truncate">{p.name}</p>
                  {p.city && <p className="text-white/35 text-[10px]">{p.city}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
        <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/25">Operaciones</p>
        <div className="space-y-0.5">
          {NAV.map(item => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}
        </div>
      </nav>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
              <span className="text-white/70 text-xs font-bold">
                {(fullName ?? '?').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{fullName}</p>
              <p className="text-white/35 text-[10px]">Recepcionista</p>
            </div>
          </div>
          <form action={logout} className="w-full">
            <button type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
                         text-white/50 hover:text-white hover:bg-white/6
                         text-xs font-medium transition-all">
              <LogOut size={14} strokeWidth={2} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export function RecepcionSidebar({ fullName, properties, impersonating }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[220px] min-h-screen bg-[var(--brand)] flex-col shrink-0 border-r border-white/5">
        <SidebarContent fullName={fullName} properties={properties} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className={`md:hidden fixed ${impersonating ? 'top-8' : 'top-0'} inset-x-0 z-40 h-16 bg-[var(--brand)]/95 backdrop-blur-md border-b border-white/8 flex items-center px-4 gap-3`}>
        <MobileBrand subtitle={properties.length === 1 ? properties[0].name : undefined} />
        <div className="flex-1 min-w-0" />
        <button onClick={() => setOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 rounded-lg transition-all">
          <Menu size={18} strokeWidth={2.25} />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div className={`md:hidden fixed inset-0 z-50 flex transition-all duration-300 ${open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <aside className={`relative w-[260px] max-w-[88vw] bg-[var(--brand)] flex flex-col h-full border-r border-white/8 transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-4 right-4">
            <button onClick={() => setOpen(false)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
              <X size={16} strokeWidth={2.25} />
            </button>
          </div>
          <SidebarContent fullName={fullName} properties={properties} onClose={() => setOpen(false)} />
        </aside>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--brand)]/95 backdrop-blur-md border-t border-white/8"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {NAV.map(item => {
            const active = isActiveRoute(pathname, item.href, item.exact)
            return (
              <Link key={item.href} href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${
                  active ? 'text-[var(--senal)]' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                {active && <span className="absolute top-0 inset-x-3 h-0.5 bg-[var(--senal)] rounded-b-full" />}
                <span>{item.icon}</span>
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </Link>
            )
          })}
          <form action={logout} className="flex-1">
            <button type="submit" className="w-full h-full flex flex-col items-center gap-1 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200">
              <LogOut size={20} strokeWidth={2} />
              <span className="text-[11px] font-medium leading-tight">Salir</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}
