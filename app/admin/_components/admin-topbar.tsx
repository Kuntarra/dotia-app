'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, HelpCircle, ChevronDown, LogOut, Bell, AlertTriangle, LogIn } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { ThemeToggle } from '@/app/_components/theme-toggle'

type Notif = { title: string; detail: string; href: string; kind: 'alert' | 'info' }

const PAGE_LABELS: Record<string, string> = {
  '/admin':              'Panel de Control',
  '/admin/estadias':     'Estadías',
  '/admin/reportes':     'Reportes',
  '/admin/propiedades':  'Propiedades',
  '/admin/clientes':     'Clientes',
  '/admin/usuarios':     'Usuarios',
}

function getLabel(pathname: string) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  for (const [k, v] of Object.entries(PAGE_LABELS)) {
    if (k !== '/admin' && pathname.startsWith(k + '/')) return v
  }
  return 'Admin'
}

interface Props {
  fullName: string
  role?: string
  notifications?: Notif[]
}

export function AdminTopBar({ fullName, role = 'Administrador', notifications = [] }: Props) {
  const pathname  = usePathname()
  const router    = useRouter()
  const label     = getLabel(pathname)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const alertCount = notifications.length
  const initials  = fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  function onSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const q = (e.target as HTMLInputElement).value.trim()
    if (!q) return
    router.push(`/admin/buscar?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="hidden md:flex h-14 bg-[var(--surface)] border-b border-[var(--gray-200)] items-center px-6 gap-4 shrink-0 sticky top-0 z-30">

      {/* Título de página */}
      <span className="text-sm font-semibold text-[var(--ink)] min-w-0 truncate mr-2">
        {label}
      </span>

      {/* Buscador */}
      <div className="flex-1 max-w-xs">
        <label className="flex items-center gap-2.5 px-3.5 py-2 bg-[var(--gray-100)] rounded-xl
                          border border-transparent hover:border-[var(--gray-200)] transition-colors cursor-text">
          <Search size={15} strokeWidth={1.75} stroke="var(--gray-500)" className="shrink-0" />
          <input
            className="bg-transparent text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-500)]
                       outline-none flex-1 w-full"
            placeholder="Buscar huésped, propiedad o empresa…"
            onKeyDown={onSearch}
          />
        </label>
      </div>

      {/* Acciones */}
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle className="!w-8 !h-8" />
        {/* Notificaciones */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(v => !v)}
            aria-expanded={notifOpen}
            title="Notificaciones"
            className="relative w-8 h-8 rounded-xl flex items-center justify-center text-[var(--gray-500)]
                       hover:bg-[var(--gray-100)] hover:text-[var(--ink)] transition-colors">
            <Bell size={16} strokeWidth={1.75} />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--senal)]
                               text-[var(--ink)] text-[10px] font-bold flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 z-50 bg-[var(--surface)] rounded-xl border border-[var(--gray-200)]
                              shadow-[var(--shadow-lg)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--gray-100)] flex items-center justify-between">
                  <span className="section-label !mb-0">Notificaciones</span>
                  <span className="text-[11px] text-[var(--gray-500)]">{alertCount}</span>
                </div>
                {alertCount === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--gray-500)]">Sin novedades por ahora.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-[var(--gray-100)]">
                    {notifications.map((n, i) => (
                      <Link key={i} href={n.href} onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5
                          ${n.kind === 'alert' ? 'bg-red-50 text-red-600' : 'bg-[var(--senal)]/12 text-[var(--senal-dark)]'}`}>
                          {n.kind === 'alert' ? <AlertTriangle size={14} strokeWidth={2} /> : <LogIn size={14} strokeWidth={2} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--ink)] leading-snug">{n.title}</p>
                          <p className="text-[11px] text-[var(--gray-500)] mt-0.5 leading-snug">{n.detail}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <a
          href="https://wa.me/56982172261"
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--gray-500)]
                     hover:bg-[var(--gray-100)] hover:text-[var(--ink)] transition-colors"
          title="Ayuda y soporte">
          <HelpCircle size={16} strokeWidth={1.75} />
        </a>

        <div className="w-px h-5 bg-[var(--gray-200)] mx-1.5" />

        {/* Perfil con menú */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl
                       hover:bg-[var(--gray-100)] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand)] flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">{initials}</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-[var(--ink)] leading-tight">{fullName}</p>
              <p className="text-[10px] text-[var(--gray-500)] leading-tight">{role}</p>
            </div>
            <ChevronDown size={13} strokeWidth={2} stroke="var(--gray-400)"
              className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 z-50 bg-[var(--surface)] rounded-xl border border-[var(--gray-200)]
                              shadow-[var(--shadow-lg)] overflow-hidden py-1">
                <form action={logout}>
                  <button type="submit"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--gray-700)]
                               hover:bg-[var(--gray-50)] hover:text-[var(--ink)] transition-colors">
                    <LogOut size={15} strokeWidth={1.75} />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
