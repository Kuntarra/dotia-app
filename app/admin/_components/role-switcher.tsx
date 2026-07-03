'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { impersonate } from '@/app/actions/impersonate'
import { quickLoginDemo, volverAMiCuenta } from '@/app/actions/demo'
import { Repeat, ChevronDown, Undo2, FlaskConical } from 'lucide-react'

const VIEWS = [
  { label: 'Admin',     href: '/admin',      color: 'bg-[var(--navy)] text-white',         dot: 'bg-[var(--navy)]',  desc: 'Panel administrador' },
  { label: 'Recepción', href: '/recepcion',  color: 'bg-emerald-600 text-white',            dot: 'bg-emerald-500',    desc: 'Vista recepcionista' },
  { label: 'Cliente',   href: '/alojamiento',color: 'bg-[var(--amber)] text-[var(--ink)]', dot: 'bg-[var(--amber)]', desc: 'Portal empresa' },
]

interface User { id: string; full_name: string | null; role: string; email: string | null }
interface DemoModality { id: string; label: string; group: string }

export function RoleSwitcher({ users, demoModalities, enDemo }: { users: User[]; demoModalities: DemoModality[]; enDemo: boolean }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState<'demo' | 'vistas' | 'usuarios'>(demoModalities.length ? 'demo' : 'vistas')
  const pathname = usePathname()

  const current = VIEWS.find(v =>
    v.href === '/admin' ? pathname.startsWith('/admin') : pathname.startsWith(v.href)
  ) ?? VIEWS[0]

  const receptionists = users.filter(u => u.role === 'receptionist')
  const clients       = users.filter(u => u.role === 'client')

  const groups = [...new Set(demoModalities.map(d => d.group))]
  const showTabs = demoModalities.length > 0 && !enDemo

  return (
    <div className="no-print fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--gray-200)] overflow-hidden w-64">

          {/* Banner: estás viendo otra vista (Mandante/Proveedor) */}
          {enDemo && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><FlaskConical size={13} strokeWidth={2.25} /> Estás viendo otra vista</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Cambia de vista abajo o vuelve a tu cuenta.</p>
            </div>
          )}

          {/* Tabs (solo super admin fuera de vista rápida) */}
          {showTabs && (
            <div className="flex border-b border-[var(--gray-100)]">
              {(['demo', 'vistas', 'usuarios'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 text-xs font-semibold py-2.5 capitalize transition-colors ${tab === t ? 'text-[var(--ink)] border-b-2 border-[var(--navy)]' : 'text-[var(--gray-500)] hover:text-[var(--ink)]'}`}>
                  {t === 'demo' ? 'Vista rápida' : t === 'vistas' ? 'Vistas' : 'Usuarios'}
                </button>
              ))}
            </div>
          )}

          {/* ── Vista rápida: saltar a Mandante/Proveedor (login real) ── */}
          {(enDemo || (showTabs && tab === 'demo')) && (
            <div className="max-h-80 overflow-y-auto py-1">
              {groups.map(group => (
                <div key={group}>
                  <p className="text-[10px] font-bold text-[var(--gray-500)] uppercase tracking-wider px-4 pt-3 pb-1">{group}</p>
                  {demoModalities.filter(d => d.group === group).map(d => (
                    <button key={d.id} onClick={() => { setOpen(false); quickLoginDemo(d.id) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <FlaskConical size={13} strokeWidth={2} className="text-amber-700" />
                      </span>
                      <span className="text-sm font-medium text-[var(--ink)]">{d.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              {enDemo && (
                <form action={volverAMiCuenta} className="px-3 pt-2 pb-1">
                  <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--navy)] text-white text-sm font-semibold hover:bg-[var(--navy-dark)] transition-colors">
                    <Undo2 size={14} strokeWidth={2.25} /> Volver a mi cuenta
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── Vistas (rutas) ── */}
          {showTabs && tab === 'vistas' && VIEWS.map(view => {
            const isActive = view.href === '/admin' ? pathname.startsWith('/admin') : pathname.startsWith(view.href)
            return (
              <Link key={view.href} href={view.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors ${isActive ? 'bg-[var(--gray-50)]' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${view.dot}`} style={{ opacity: isActive ? 1 : 0.3 }} />
                <div>
                  <p className={`text-sm font-medium ${isActive ? 'text-[var(--ink)]' : 'text-[var(--gray-900)]'}`}>
                    {view.label}{isActive && <span className="ml-1.5 text-xs text-[var(--gray-500)] font-normal">actual</span>}
                  </p>
                  <p className="text-xs text-[var(--gray-500)]">{view.desc}</p>
                </div>
              </Link>
            )
          })}

          {/* ── Ver como usuario (recepción/cliente, legado) ── */}
          {showTabs && tab === 'usuarios' && (
            <div className="max-h-72 overflow-y-auto">
              {!users.length && <p className="text-xs text-[var(--gray-500)] px-4 py-4">No hay recepcionistas ni clientes creados.</p>}
              {receptionists.length > 0 && (
                <>
                  <p className="text-xs font-bold text-[var(--gray-500)] uppercase tracking-wider px-4 pt-3 pb-1">Recepcionistas</p>
                  {receptionists.map(u => (
                    <button key={u.id} onClick={() => { setOpen(false); impersonate(u.id, '/recepcion') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--gray-50)] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-emerald-700">{(u.full_name ?? u.email ?? '?').slice(0,2).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--ink)] truncate">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-500)] truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {clients.length > 0 && (
                <>
                  <p className="text-xs font-bold text-[var(--gray-500)] uppercase tracking-wider px-4 pt-3 pb-1">Clientes</p>
                  {clients.map(u => (
                    <button key={u.id} onClick={() => { setOpen(false); impersonate(u.id, '/alojamiento') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--gray-50)] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-amber-700">{(u.full_name ?? u.email ?? '?').slice(0,2).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--ink)] truncate">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-500)] truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold transition-all hover:shadow-xl active:scale-95 ${enDemo ? 'bg-amber-500 text-white' : current.color}`}>
        {enDemo ? <FlaskConical size={15} strokeWidth={2} /> : <Repeat size={15} strokeWidth={2} />}
        {enDemo ? 'Vista rápida' : current.label}
        <ChevronDown size={13} strokeWidth={2.25} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
