import { PropertyType } from '@/lib/types'
import { Hotel, House, Building2 } from 'lucide-react'

const ICONS: Record<PropertyType, { icon: React.ReactNode; bg: string; fg: string }> = {
  hotel: {
    bg: 'bg-[var(--brand)]',
    fg: 'text-[var(--senal)]',
    icon: <Hotel className="w-full h-full" strokeWidth={1.6} />,
  },
  hostal: {
    bg: 'bg-[var(--senal)]',
    fg: 'text-[var(--ink)]',
    icon: <House className="w-full h-full" strokeWidth={1.6} />,
  },
  departamento: {
    bg: 'bg-[var(--brand-light)]',
    fg: 'text-[var(--senal-light)]',
    icon: <Building2 className="w-full h-full" strokeWidth={1.6} />,
  },
}

interface Props {
  type: PropertyType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { wrapper: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  md: { wrapper: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7' },
  lg: { wrapper: 'w-20 h-20 rounded-3xl', icon: 'w-10 h-10' },
}

export function PropertyIcon({ type, size = 'md', className = '' }: Props) {
  const { bg, fg, icon } = ICONS[type] ?? ICONS.hotel
  const { wrapper, icon: iconSize } = SIZES[size]

  return (
    <div className={`${wrapper} ${bg} flex items-center justify-center shrink-0 shadow-sm ${className}`}>
      <div className={`${iconSize} ${fg}`}>
        {icon}
      </div>
    </div>
  )
}
