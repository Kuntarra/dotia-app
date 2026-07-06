'use client'

import { useState } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'

export function LoginForm({ error }: { error?: string }) {
  const [showPwd, setShowPwd] = useState(false)

  return (
    <form action={login} className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={15} strokeWidth={2} className="shrink-0" />
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-[var(--ink)] mb-1.5">
          Correo electrónico
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-500)] pointer-events-none">
            <Mail size={17} strokeWidth={1.75} />
          </span>
          <input
            id="email" name="email" type="email"
            autoComplete="email" required
            placeholder="tu@empresa.cl"
            className="input-premium"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
      </div>

      {/* Contraseña */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="text-sm font-semibold text-[var(--ink)]">
            Contraseña
          </label>
          <Link href="/forgot-password"
            className="text-xs text-[var(--amber-dark)] font-medium hover:text-[var(--amber)] transition-colors py-2 -my-2 inline-block">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-500)] pointer-events-none">
            <Lock size={16} strokeWidth={1.75} />
          </span>
          <input
            id="password" name="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password" required
            placeholder="••••••••"
            className="input-premium"
            style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-500)] hover:text-[var(--ink)] transition-colors">
            {showPwd
              ? <EyeOff size={16} strokeWidth={1.75} />
              : <Eye size={16} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {/* Recordar sesión */}
      <label className="flex items-center gap-2.5 cursor-pointer w-fit py-1">
        <input
          type="checkbox"
          name="remember"
          className="w-[18px] h-[18px] rounded border-[var(--gray-300)] accent-[var(--navy)] cursor-pointer"
        />
        <span className="text-sm text-[var(--gray-600)]">Recordar sesión</span>
      </label>

      {/* Submit */}
      <button type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 px-6
                   bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white
                   text-sm font-semibold rounded-xl transition-all duration-150
                   shadow-[var(--shadow-navy)] hover:shadow-[0_6px_20px_rgb(10_44_74/0.35)]
                   hover:-translate-y-px active:translate-y-0">
        Ingresar
        <ArrowRight size={16} strokeWidth={2.25} />
      </button>

      {/* No tengo cuenta */}
      <p className="text-center text-xs text-[var(--gray-500)] border-t border-[var(--gray-200)] pt-5">
        ¿No tienes una cuenta corporativa?{' '}
        <Link href="mailto:contacto@soleterno.cl"
          className="text-[var(--amber-dark)] font-semibold hover:text-[var(--amber)] transition-colors">
          Contacta con soporte técnico
        </Link>
      </p>
    </form>
  )
}
