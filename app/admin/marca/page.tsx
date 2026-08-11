import { createClient } from '@/lib/supabase/server'
import { getMyTenantId } from '@/lib/tenant'
import { subirLogo } from '@/app/actions/marca'
import { LogoUploader } from '@/app/_components/logo-uploader'
import { Image as ImageIcon } from 'lucide-react'

interface Props { searchParams: Promise<{ logo?: string; error?: string }> }

export default async function MarcaPage({ searchParams }: Props) {
  const { logo, error } = await searchParams
  const supabase = await createClient()
  const { data: empresa } = await supabase.from('tenants').select('name, logo_url, tipo').eq('id', await getMyTenantId()).maybeSingle()
  const esProveedor = empresa?.tipo === 'proveedor'

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Configuración</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)] leading-tight tracking-tight">Marca</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">El logo de tu empresa para tu panel y la comunicación de marca al conectarte</p>
      </div>

      <div className="px-8 pb-8 max-w-2xl space-y-4">
        {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {logo && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Logo actualizado.</div>}

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6">
          <div className="flex items-center gap-2 mb-1.5">
            <ImageIcon size={17} strokeWidth={2} className="text-[var(--brand)]" />
            <h2 className="text-base font-semibold text-[var(--ink)]">Logo de tu empresa</h2>
          </div>
          <p className="text-sm text-[var(--gray-600)] mb-5">
            Sube el logo de <strong>{empresa?.name ?? 'tu empresa'}</strong>. Se mostrará junto al de {esProveedor ? 'los Mandantes' : 'los Proveedores'} con los que te conectes, reforzando tu marca en cada match.
          </p>
          <LogoUploader action={subirLogo} current={empresa?.logo_url ?? null} nombre={empresa?.name ?? 'Tu empresa'} />
        </div>

        <p className="text-xs text-[var(--gray-500)]">Próximamente podrás definir también tus colores de marca aquí.</p>
      </div>
    </div>
  )
}
