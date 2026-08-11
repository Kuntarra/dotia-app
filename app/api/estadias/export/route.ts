import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { getMarcaCliente, slugCliente } from '@/lib/marca'
import { hoyChile } from '@/lib/fechas'

function fmt(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// Escape CSV: envuelve en comillas si contiene separador, comillas o saltos de línea.
function csv(value: unknown) {
  const s = value == null ? '' : String(value)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q      = searchParams.get('q')?.trim() ?? ''
  const filter = q ? 'todas' : (searchParams.get('filter') ?? 'activas')

  const supabase = await createClient()

  // Solo administradores pueden exportar
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('No autorizado', { status: 403 })

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()

  let guestIds: string[] | null = null
  if (q) {
    const { data: guests } = await admin
      .from('guests')
      .select('id')
      .eq('tenant_id', tenantId)
      .or(`first_name.ilike.%${q}%,last_name_paterno.ilike.%${q}%,rut.ilike.%${q}%`)
      .limit(500)
    guestIds = (guests ?? []).map(g => g.id)
  }

  let query = supabase
    .from('stays')
    .select(`
      shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut, phone),
      rooms(number, type, properties(name)),
      companies(name)
    `)
    .order('checked_in_at', { ascending: false })
    .limit(5000)

  if (guestIds !== null) {
    if (guestIds.length === 0) query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    else query = query.in('guest_id', guestIds)
  } else {
    if (filter === 'activas') query = query.is('checked_out_at', null)
    else if (filter === 'completadas') query = query.not('checked_out_at', 'is', null)
  }

  const { data: stays } = await query

  const headers = ['Huésped', 'RUT', 'Teléfono', 'Empresa', 'Propiedad', 'Habitación', 'Tipo', 'Turno', 'Entrada', 'Salida', 'Estado']
  const rows = (stays ?? []).map(s => {
    const g = s.guests as any
    const r = s.rooms as any
    const c = s.companies as any
    return [
      `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim(),
      g?.rut ?? '',
      g?.phone ?? '',
      c?.name ?? '',
      r?.properties?.name ?? '',
      r?.number ?? '',
      r?.type ?? '',
      s.shift_type ?? '',
      fmt(s.checked_in_at),
      fmt(s.checked_out_at),
      s.checked_out_at ? 'Salió' : 'Alojado',
    ].map(csv).join(';')
  })

  // BOM para que Excel reconozca UTF-8 (acentos/ñ).
  const body = '﻿' + [headers.map(csv).join(';'), ...rows].join('\r\n')
  const fecha = hoyChile()

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="estadias-${slugCliente((await getMarcaCliente()).nombre)}-${fecha}.csv"`,
    },
  })
}
