import Link from 'next/link'
import { ReactNode } from 'react'

interface StatCardProps {
  value:   number | string
  label:   string
  sub?:    string
  href?:   string
  color?:  'navy' | 'amber' | 'green' | 'neutral'
  icon?:   ReactNode
}

export function StatCard({ value, label, sub, href, icon }: StatCardProps) {
  const content = (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6
                    hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5
                    transition-all duration-200 group h-full">
      {icon && (
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgb(11 126 96 / 0.12)', color: 'var(--amber-dark)' }}>
          {icon}
        </div>
      )}
      <p className="font-display text-[2.5rem] font-semibold leading-none text-[var(--ink)] data-number">
        {typeof value === 'number' ? value.toLocaleString('es-CL') : value}
      </p>
      <p className="text-sm font-semibold text-[var(--ink)] mt-2.5 leading-snug">{label}</p>
      {sub && <p className="text-xs text-[var(--gray-600)] mt-1 leading-snug">{sub}</p>}
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }
  return content
}
