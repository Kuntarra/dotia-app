import Link from 'next/link'
import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--gray-100)]">
      <header className="bg-[var(--navy)] text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/login"
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors mb-6">
            <ArrowLeft size={15} strokeWidth={1.75} />
            Volver
          </Link>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-simbolo.png" alt="dotia" className="w-9 h-9 object-contain" />
            <div className="leading-none">
              <p className="font-display font-semibold text-[17px] tracking-[-0.01em]">dotia</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber-light)] mt-1">
                Trazabilidad de personal
              </p>
            </div>
          </div>
          <h1 className="font-display text-[2rem] font-semibold tracking-[-0.01em] mt-6">{title}</h1>
          <p className="text-white/50 text-sm mt-1">Última actualización: {updated}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <article className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-8 md:p-10
                            space-y-6 text-[15px] leading-relaxed text-[var(--gray-700)]
                            [&_h2]:font-display [&_h2]:text-[var(--ink)] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:mt-2
                            [&_p]:text-[var(--gray-700)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-[var(--gray-700)]
                            [&_strong]:text-[var(--ink)] [&_strong]:font-semibold">
          {children}
        </article>
        <p className="text-center text-xs text-[var(--gray-500)] mt-6">
          © {new Date().getFullYear()} ANVI Spa · dotia
        </p>
      </main>
    </div>
  )
}
