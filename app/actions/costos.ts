'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esAdministrador } from '@/lib/rbac'
import { MODULO_KEYS } from '@/lib/modulos'
import { registrarActividad } from './_log'

const BACK = '/admin/costos'

// Cargar tarifas es de ADMINISTRACIÓN (Titular/Admin): define el precio con que
// se factura al cliente. Ver el resumen es de puedeVerCostos() (gate de la
// página). La RLS de costos_tarifas ya exige admin del tenant para escribir;
// este guard lo refuerza en el servidor.
export async function crearTarifa(formData: FormData) {
  if (!(await esAdministrador())) redirect(BACK + '?error=' + encodeURIComponent('Solo la administración puede cargar tarifas.'))
  const supabase = await createClient()

  const modulo = (formData.get('modulo') as string) || ''
  const unidad = ((formData.get('unidad') as string) || '').trim()
  const tarifa = parseInt((formData.get('tarifa_clp') as string) || '', 10)
  const vigencia = ((formData.get('vigencia_desde') as string) || '').trim() || null

  if (!MODULO_KEYS.includes(modulo as never)) redirect(BACK + '?error=' + encodeURIComponent('Módulo no válido.'))
  if (!unidad) redirect(BACK + '?error=' + encodeURIComponent('Indica la unidad (ej. cama/noche, ración).'))
  if (!Number.isFinite(tarifa) || tarifa < 0) redirect(BACK + '?error=' + encodeURIComponent('La tarifa debe ser un monto válido en CLP.'))

  const { data, error } = await supabase
    .from('costos_tarifas')
    .insert({ modulo, unidad, tarifa_clp: tarifa, ...(vigencia ? { vigencia_desde: vigencia } : {}) })
    .select('id')
    .single()
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))

  await registrarActividad('costo', data.id, 'crear', { modulo, unidad, tarifa_clp: tarifa })

  revalidatePath(BACK)
  redirect(BACK + '?success=tarifa')
}

// Desactiva una tarifa (no se borra: conserva historial de precios).
export async function desactivarTarifa(id: string) {
  if (!(await esAdministrador())) redirect(BACK + '?error=' + encodeURIComponent('Solo la administración puede cambiar tarifas.'))
  const supabase = await createClient()
  const { data, error } = await supabase.from('costos_tarifas').update({ activa: false }).eq('id', id).select('id')
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))
  if (!data?.length) redirect(BACK + '?error=' + encodeURIComponent('No se encontró la tarifa o no tienes permiso.'))
  await registrarActividad('costo', id, 'desactivar')
  revalidatePath(BACK)
  redirect(BACK + '?success=baja')
}
