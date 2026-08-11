'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/actions/auth'
import { MobileBrand } from '@/app/_components/mobile-brand'
import { LayoutGrid, CalendarDays, BarChart3, Building2, Briefcase, Users, LogOut, Menu, X, Bell, IdCard, FolderKanban, Bus, UtensilsCrossed, Package, Shirt, ShieldCheck, Link2, CalendarRange, Image as ImageIcon, Activity, Coins, MapPin, TriangleAlert } from 'lucide-react'

// `modulo` = clave del módulo (user_modulos) para filtrar el menú de sub-usuarios.
// `adminOnly` = visible solo para admin. Ítems sin ninguna marca = siempre visibles.
type NavItemDef = { href: string; label: string; exact: boolean; icon: React.ReactNode; modulo?: string; adminOnly?: boolean; proveedorOnly?: boolean; superOnly?: boolean }

const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
  {
    label: 'Operaciones',
    items: [
      { href: '/admin',            label: 'Dashboard',   exact: true,  icon: <DashIcon />, adminOnly: true },
      { href: '/admin/conectados', label: 'Conectados',  exact: false, icon: <Link2 size={18} strokeWidth={1.75} />, proveedorOnly: true },
      { href: '/admin/estado',     label: 'Estado',      exact: false, icon: <DashIcon />, adminOnly: true },
      { href: '/admin/excepciones', label: 'Excepciones', exact: false, icon: <ExcepcionIcon />, adminOnly: true },
      { href: '/admin/reportes',   label: 'Reportes',    exact: false, icon: <ChartIcon />, adminOnly: true },
      { href: '/admin/costos',     label: 'Costos',      exact: false, icon: <CostosIcon />, adminOnly: true },
    ],
  },
  {
    label: 'Dotación',
    items: [
      { href: '/admin/dotia',      label: 'Operación',  exact: true,  icon: <DashIcon />,     adminOnly: true },
      { href: '/admin/personal',   label: 'Personal',   exact: false, icon: <PersonalIcon />, modulo: 'personal' },
      { href: '/admin/proyectos',  label: 'Proyectos',  exact: false, icon: <ProyectoIcon />, adminOnly: true },
      { href: '/admin/planificacion', label: 'Planificación', exact: false, icon: <PlanIcon />, adminOnly: true },
      { href: '/admin/turnos',     label: 'Turnos',     exact: false, icon: <TurnosIcon />, adminOnly: true },
      { href: '/admin/puntos',     label: 'Puntos',     exact: false, icon: <PuntosIcon />, adminOnly: true },
      { href: '/admin/cuadrillas', label: 'Cuadrillas', exact: false, icon: <UserIcon />,   adminOnly: true },
    ],
  },
  {
    label: 'Módulos',
    items: [
      { href: '/admin/transporte',  label: 'Transporte',   exact: false, icon: <TransporteIcon />,  modulo: 'transporte' },
      { href: '/admin/estadias',    label: 'Alojamiento',  exact: false, icon: <BuildIcon />,        modulo: 'hotel' },
      { href: '/admin/alimentacion', label: 'Alimentación', exact: false, icon: <AlimentacionIcon />, modulo: 'alimentacion' },
      { href: '/admin/colaciones',  label: 'Colaciones',   exact: false, icon: <ColacionIcon />,     modulo: 'colaciones' },
      { href: '/admin/lavanderia',  label: 'Lavandería',   exact: false, icon: <LavanderiaIcon />,   modulo: 'lavanderia' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/marca',         label: 'Marca',         exact: false, icon: <MarcaIcon />,     adminOnly: true },
      { href: '/admin/usuarios',      label: 'Usuarios',      exact: false, icon: <UserIcon />,      adminOnly: true },
      { href: '/admin/roles',         label: 'Roles',         exact: false, icon: <RolesIcon />,     adminOnly: true },
      { href: '/admin/notificaciones', label: 'Notificaciones', exact: false, icon: <BellSideIcon />, adminOnly: true },
    ],
  },
  {
    label: 'Super Admin',
    items: [
      { href: '/admin/clientes', label: 'Clientes',     exact: false, icon: <BriefIcon />, superOnly: true },
      { href: '/super',          label: 'Consola SaaS', exact: false, icon: <DashIcon />,  superOnly: true },
      { href: '/super/actividad', label: 'Registro de actividad', exact: false, icon: <ActivityIcon />, superOnly: true },
    ],
  },
]

// Filtra los grupos según el rol y los módulos permitidos.
// - adminOnly: solo el admin (Configuración, Proyectos, Reportes…).
// - modulo: visible si está en `allowedModulos` (= comprados por la empresa,
//   y para sub-usuarios además asignados). Aplica también al admin: un admin
//   de un proveedor solo ve los módulos que su empresa compró.
// - neutros (Dashboard): siempre.
function visibleGroups(role: string, allowedModulos: string[] | null, tenantTipo: string, isSuper: boolean) {
  const allowed = new Set(allowedModulos ?? [])
  return NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (it.superOnly) return isSuper
        if (it.proveedorOnly) return tenantTipo === 'proveedor'
        // Ítem que pertenece a un módulo pero solo para el admin (ej. Propiedades
        // = parte de Hotel): requiere ser admin Y tener el módulo activo.
        if (it.adminOnly && it.modulo) return role === 'admin' && allowed.has(it.modulo)
        if (it.adminOnly) return role === 'admin'
        if (it.modulo) return allowed.has(it.modulo)
        return true
      }),
    }))
    .filter((g) => g.items.length > 0)
}

function BrandSection({ nombre, logo }: { nombre: string; logo: string | null }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-white/8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white/10 grid place-items-center">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={nombre} className="w-full h-full object-contain" />
          ) : (
            <span className="text-white font-display font-semibold text-lg">{nombre.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white font-display font-semibold text-[16px] leading-tight tracking-tight truncate">{nombre}</p>
          <p className="text-white/40 text-[10px] leading-tight">Powered by Dotia</p>
        </div>
      </div>
    </div>
  )
}

function NavItem({ href, label, exact, icon, onClose }: { href: string; label: string; exact: boolean; icon: React.ReactNode; onClose?: () => void }) {
  const pathname = usePathname()
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link href={href} onClick={onClose}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 group
        ${active
          ? 'bg-[var(--senal)]/12 text-[var(--senal)] '
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

function SidebarContent({ fullName, role, allowedModulos, tenantTipo, isSuper, tenantNombre, tenantLogo, onClose }: { fullName: string; role: string; allowedModulos: string[] | null; tenantTipo: string; isSuper: boolean; tenantNombre: string; tenantLogo: string | null; onClose?: () => void }) {
  const groups = visibleGroups(role, allowedModulos, tenantTipo, isSuper)
  return (
    <>
      <BrandSection nombre={tenantNombre} logo={tenantLogo} />

      {/* Navegación agrupada */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto sidebar-scroll">
        {groups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/25">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.href} href={item.href} label={item.label} exact={item.exact} icon={item.icon} onClose={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario + Cerrar sesión */}
      <div className="px-4 py-3 border-t border-white/8 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
            <span className="text-white/70 text-xs font-bold">
              {(fullName ?? '?').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{fullName}</p>
            <p className="text-white/35 text-[10px]">{role === 'admin' ? 'Administrador' : 'Usuario'}</p>
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
    </>
  )
}

export function AdminSidebar({ fullName, role, allowedModulos, tenantTipo, isSuper, tenantNombre, tenantLogo }: { fullName: string; role: string; allowedModulos: string[] | null; tenantTipo: string; isSuper: boolean; tenantNombre: string; tenantLogo: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[220px] min-h-screen bg-[var(--brand)] flex-col shrink-0 border-r border-white/5">
        <SidebarContent fullName={fullName} role={role} allowedModulos={allowedModulos} tenantTipo={tenantTipo} isSuper={isSuper} tenantNombre={tenantNombre} tenantLogo={tenantLogo} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-16 bg-[var(--brand)]/95 backdrop-blur-md border-b border-white/8 flex items-center px-4 gap-3">
        <MobileBrand />
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
          <SidebarContent fullName={fullName} role={role} allowedModulos={allowedModulos} tenantTipo={tenantTipo} isSuper={isSuper} tenantNombre={tenantNombre} tenantLogo={tenantLogo} onClose={() => setOpen(false)} />
        </aside>
      </div>

      {/* ── Mobile bottom nav ── */}
      <BottomNav onOpenDrawer={() => setOpen(true)} />
    </>
  )
}

function BottomNav({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pathname = usePathname()
  const BOTTOM_NAV = [
    { href: '/admin',          label: 'Dashboard', exact: true,  icon: <DashIcon /> },
    { href: '/admin/estadias', label: 'Estadías',  exact: false, icon: <StayIcon /> },
    { href: '/admin/reportes', label: 'Reportes',  exact: false, icon: <ChartIcon /> },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--brand)]/95 backdrop-blur-md border-t border-white/8"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {BOTTOM_NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${
                active ? 'text-[var(--senal)]' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              {active && <span className="absolute top-0 inset-x-3 h-0.5 bg-[var(--senal)] rounded-b-full" />}
              <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
              <span className="text-[11px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}
        <button onClick={onOpenDrawer}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200">
          <Menu size={20} strokeWidth={2} />
          <span className="text-[11px] font-medium leading-tight">Más</span>
        </button>
      </div>
    </nav>
  )
}

/* ── Iconos (Lucide, set consistente) ── */
const ICON = { size: 18, strokeWidth: 1.75 } as const
function DashIcon()  { return <LayoutGrid {...ICON} /> }
function StayIcon()  { return <CalendarDays {...ICON} /> }
function ChartIcon() { return <BarChart3 {...ICON} /> }
function BuildIcon() { return <Building2 {...ICON} /> }
function BriefIcon() { return <Briefcase {...ICON} /> }
function UserIcon()  { return <Users {...ICON} /> }
function BellSideIcon() { return <Bell {...ICON} /> }
function PersonalIcon() { return <IdCard {...ICON} /> }
function ProyectoIcon() { return <FolderKanban {...ICON} /> }
function PlanIcon() { return <CalendarRange {...ICON} /> }
function TransporteIcon() { return <Bus {...ICON} /> }
function AlimentacionIcon() { return <UtensilsCrossed {...ICON} /> }
function ColacionIcon() { return <Package {...ICON} /> }
function LavanderiaIcon() { return <Shirt {...ICON} /> }
function RolesIcon() { return <ShieldCheck {...ICON} /> }
function ActivityIcon() { return <Activity {...ICON} /> }
function CostosIcon() { return <Coins {...ICON} /> }
function TurnosIcon() { return <CalendarRange {...ICON} /> }
function PuntosIcon() { return <MapPin {...ICON} /> }
function ExcepcionIcon() { return <TriangleAlert {...ICON} /> }
function MarcaIcon() { return <ImageIcon {...ICON} /> }
