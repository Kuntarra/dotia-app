import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/super'
import { LayoutGrid, ArrowLeft } from 'lucide-react'

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const { fullName } = await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-[var(--gray-100)]">
      {/* Barra superior de marca */}
      <header className="bg-[var(--brand)] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[var(--senal)]/20 flex items-center justify-center">
              <LayoutGrid size={18} strokeWidth={2} stroke="var(--senal)" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--senal)]">Consola SaaS</p>
              <h1 className="font-display text-lg font-semibold leading-tight">Super Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/super" className="text-white/80 hover:text-white transition-colors">Clientes</Link>
            <Link href="/super/edp" className="text-white/80 hover:text-white transition-colors">Cobros</Link>
            <Link href="/super/actividad" className="text-white/80 hover:text-white transition-colors hidden sm:inline">Actividad</Link>
            <span className="text-white/60 hidden sm:inline">{fullName}</span>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors">
              <ArrowLeft size={15} strokeWidth={2} />
              Volver a la app
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
