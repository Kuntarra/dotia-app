'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
      setLoading(false)
    } else {
      router.push('/login?mensaje=Contraseña actualizada correctamente')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray-100)] px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--navy)] mb-4 shadow-lg">
            <Lock size={26} strokeWidth={1.75} stroke="var(--amber)" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-[-0.01em]">Nueva contraseña</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">dotia</p>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--gray-900)] mb-1.5">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-[var(--gray-900)] mb-1.5">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
