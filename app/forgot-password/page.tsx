'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lock, Check } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError('No se pudo enviar el correo. Verifica la dirección ingresada.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray-100)] px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand)] mb-4 shadow-lg">
            <Lock size={26} strokeWidth={1.75} stroke="var(--senal)" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Recuperar contraseña</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">dotia</p>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={24} strokeWidth={2} stroke="#059669" />
              </div>
              <p className="text-sm font-semibold text-[var(--ink)] mb-2">Correo enviado</p>
              <p className="text-sm text-[var(--gray-600)] mb-6">
                Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el enlace para crear una nueva contraseña.
              </p>
              <Link href="/login" className="text-sm text-[var(--ink)] font-semibold hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--gray-600)] mb-6">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--gray-900)] mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@empresa.cl"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </form>

              <div className="text-center mt-4">
                <Link href="/login" className="text-sm text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors">
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
