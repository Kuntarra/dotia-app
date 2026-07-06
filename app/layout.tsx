import type { Metadata, Viewport } from 'next'
import { Sora, Manrope } from 'next/font/google'
import './globals.css'
import { AdminOverlay } from './_components/admin-overlay'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'dotia — Trazabilidad de personal en faena',
  description: 'Sigue a cada trabajador por toda la logística en terreno —transporte, alojamiento, alimentación y más— sobre una sola fuente de verdad por persona.',
  appleWebApp: { capable: true, title: 'dotia', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#0B7E60',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${sora.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-parpadeo: aplica el tema guardado antes de pintar. Por defecto claro. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.dataset.theme='dark';}}catch(e){}` }} />
      </head>
      <body className="min-h-screen bg-[var(--gray-50)]">
        {children}
        <AdminOverlay />
      </body>
    </html>
  )
}
