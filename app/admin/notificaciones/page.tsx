import { createClient } from '@/lib/supabase/server'
import { toggleSubscription, deleteSubscription, sendTestSubscription } from '@/app/actions/digest'
import { SubscriptionForm } from './_components/subscription-form'
import { Clock, Send, Trash2, AlertTriangle, CheckCircle2, Mail } from 'lucide-react'

export const metadata = { title: 'Notificaciones · dotia' }

const WD: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' }

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { ok, error } = await searchParams
  const supabase = await createClient()

  const [{ data: subs, error: dbError }, { data: companies }, { data: properties }, { data: projects }] = await Promise.all([
    supabase.from('report_subscriptions').select('*').order('email', { ascending: true }).order('report_type', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('companies').select('id, name').eq('active', true).order('name'),
    supabase.from('properties').select('id, name').eq('active', true).order('name'),
    supabase.from('projects').select('id, name, companies(name)').eq('active', true).order('name'),
  ])

  const companyName = new Map((companies ?? []).map(c => [c.id, c.name]))
  const propName = new Map((properties ?? []).map(p => [p.id, p.name]))
  const projectName = new Map((projects ?? []).map((p: any) => [p.id, p.name]))

  const scopeLabel = (s: any) =>
    s.scope_type === 'each_project' ? 'Cada proyecto (un correo c/u)'
    : s.scope_type === 'project' ? `Proyecto: ${projectName.get(s.project_id) ?? '—'}`
    : s.scope_type === 'company' ? `Empresa: ${companyName.get(s.company_id) ?? '—'}`
    : s.scope_type === 'property' ? (s.property_ids ?? []).map((id: string) => propName.get(id) ?? '—').join(', ')
    : 'Toda la operación'

  const freqLabel = (s: any) => {
    const hora = `${String(s.send_hour).padStart(2, '0')}:00`
    if (s.frequency === 'weekly') return `Semanal · ${(s.weekdays ?? []).map((d: number) => WD[d]).join(', ')} · ${hora}`
    if (s.frequency === 'monthly') return `Mensual · día ${s.monthday} · ${hora}`
    return `Diario · ${hora}`
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <span className="section-label">Configuración</span>
      <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-[-0.01em]">
        Reportes por correo
      </h1>
      <p className="text-sm text-[var(--gray-600)] mt-1">
        Programa envíos automáticos de movimientos (check-in / check-out) por destinatario, alcance y horario.
      </p>

      {ok && (
        <div className="mt-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle2 size={15} strokeWidth={2.25} className="shrink-0" />{decodeURIComponent(ok)}
        </div>
      )}
      {error && (
        <div className="mt-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle size={15} strokeWidth={2} className="shrink-0" />{decodeURIComponent(error)}
        </div>
      )}

      {dbError ? (
        <div className="mt-6 bg-amber-50/40 rounded-2xl border border-amber-200 p-6">
          <p className="text-sm font-semibold text-[var(--ink)] mb-1">Falta crear la tabla de suscripciones</p>
          <p className="text-xs text-[var(--gray-600)]">
            Ejecuta <code className="font-mono bg-[var(--gray-100)] px-1.5 py-0.5 rounded">supabase/add-report-subscriptions.sql</code> en el editor SQL de Supabase y recarga.
          </p>
        </div>
      ) : (
        <>
          {/* Nueva suscripción */}
          <div className="mt-6 bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-6">
            <p className="text-sm font-semibold text-[var(--ink)] mb-4">Nueva suscripción</p>
            <SubscriptionForm
              companies={(companies ?? []).map(c => ({ id: c.id, name: c.name }))}
              properties={(properties ?? []).map(p => ({ id: p.id, name: p.name }))}
              projects={(projects ?? []).map((p: any) => ({ id: p.id, name: p.name, company: (p.companies as any)?.name ?? '' }))}
            />
          </div>

          {/* Lista */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="section-label !mb-0">Suscripciones</span>
              <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full font-medium">{subs?.length ?? 0}</span>
            </div>

            {!subs?.length ? (
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-10 text-center text-sm text-[var(--gray-500)]">
                Aún no hay suscripciones. Crea la primera arriba.
              </div>
            ) : (
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-sm)] divide-y divide-[var(--gray-100)]">
                {subs.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgb(11 126 96 / 0.12)', color: 'var(--amber-dark)' }}>
                      <Mail size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--ink)] truncate">
                        {s.email}{s.name ? <span className="text-[var(--gray-500)] font-normal"> · {s.name}</span> : null}
                      </p>
                      <p className="text-xs text-[var(--gray-500)] truncate">
                        {scopeLabel(s)} · <span className="text-[var(--amber-dark)] font-medium">{s.report_type === 'full' ? 'Completo' : 'Movimientos'}</span>
                      </p>
                      <p className="text-[11px] text-[var(--gray-400)] mt-0.5 flex items-center gap-1">
                        <Clock size={11} strokeWidth={1.75} />{freqLabel(s)}
                      </p>
                    </div>

                    <form action={sendTestSubscription.bind(null, s.id)}>
                      <button type="submit" title="Enviar prueba ahora"
                        className="text-[var(--gray-500)] hover:text-[var(--ink)] transition-colors p-1.5 rounded-lg hover:bg-[var(--gray-50)]">
                        <Send size={15} strokeWidth={1.75} />
                      </button>
                    </form>
                    <form action={toggleSubscription.bind(null, s.id, !s.active)}>
                      <button type="submit"
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.active ? 'badge badge-green' : 'badge badge-gray'}`}
                        title={s.active ? 'Activa · clic para pausar' : 'Pausada · clic para activar'}>
                        {s.active ? 'Activa' : 'Pausada'}
                      </button>
                    </form>
                    <form action={deleteSubscription.bind(null, s.id)}>
                      <button type="submit" className="text-[var(--gray-400)] hover:text-red-600 transition-colors p-1" title="Eliminar" aria-label="Eliminar">
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
