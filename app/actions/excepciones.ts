'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeGestionar, esAdministrador } from '@/lib/rbac'
import { MODULO_KEYS } from '@/lib/modulos'
import { registrarActividad } from './_log'

const BACK = '/admin/excepciones'
const TIPOS_EXCEPCION = ['no_llego', 'sin_planificacion', 'diferencia_cantidad', 'no_entregado'] as const
const ESTADOS_EXCEPCION = ['abierta', 'en_revision', 'resuelta', 'rechazada'] as const
const ESTADO_LABEL: Record<string, string> = { abierta: 'Abierta', en_revision: 'En revisión', resuelta: 'Resuelta', rechazada: 'Rechazada' }

// Transiciones válidas del ciclo de vida (GEN-005: no se borra, conserva
// historial). Una excepción cerrada (resuelta/rechazada) no puede reabrirse.
const TRANSICIONES: Record<string, readonly string[]> = {
  abierta: ['en_revision', 'resuelta', 'rechazada'],
  en_revision: ['resuelta', 'rechazada'],
  resuelta: [],
  rechazada: [],
}

// Crea una excepción (nace 'abierta', GEN-004). La puede registrar quien opera
// el módulo (Control/Supervisor) o la administración.
export async function crearExcepcion(formData: FormData) {
  const modulo = (formData.get('modulo') as string) || ''
  const tipo = (formData.get('tipo') as string) || ''
  if (!MODULO_KEYS.includes(modulo as never)) redirect(BACK + '?error=' + encodeURIComponent('Módulo no válido.'))
  if (!TIPOS_EXCEPCION.includes(tipo as never)) redirect(BACK + '?error=' + encodeURIComponent('Tipo de excepción no válido.'))
  if (!(await puedeGestionar(modulo))) redirect(BACK + '?error=' + encodeURIComponent('No tienes permiso para registrar excepciones en este módulo.'))

  const supabase = await createClient()
  const { data, error } = await supabase.from('excepciones').insert({
    modulo,
    tipo,
    descripcion: ((formData.get('descripcion') as string) || '').trim() || null,
    persona_id: ((formData.get('persona_id') as string) || '') || null,
    proyecto_id: ((formData.get('proyecto_id') as string) || '') || null,
    estado: 'abierta',
  }).select('id').single()
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))

  await registrarActividad('excepcion', data.id, 'crear', { tipo, modulo })
  revalidatePath(BACK)
  redirect(BACK + '?success=creada')
}

// Cambia el estado de una excepción (en revisión / resuelta / rechazada). La
// excepción NO se borra: conserva su historial (GEN-005).
export async function actualizarEstadoExcepcion(id: string, formData: FormData) {
  const estado = (formData.get('estado') as string) || ''
  if (!ESTADOS_EXCEPCION.includes(estado as never)) redirect(BACK + '?error=' + encodeURIComponent('Estado no válido.'))
  const supabase = await createClient()

  const { data: row } = await supabase.from('excepciones').select('modulo, estado').eq('id', id).maybeSingle()
  if (!row) redirect(BACK + '?error=' + encodeURIComponent('Excepción no encontrada.'))
  if (!((await esAdministrador()) || (await puedeGestionar(row.modulo)))) {
    redirect(BACK + '?error=' + encodeURIComponent('No tienes permiso para cambiar esta excepción.'))
  }
  if (!TRANSICIONES[row.estado]?.includes(estado)) {
    redirect(BACK + '?error=' + encodeURIComponent(`Una excepción "${ESTADO_LABEL[row.estado] ?? row.estado}" no puede pasar a "${ESTADO_LABEL[estado] ?? estado}".`))
  }

  const { error } = await supabase
    .from('excepciones')
    .update({
      estado,
      resolucion: ((formData.get('resolucion') as string) || '').trim() || null,
      responsable_nombre: ((formData.get('responsable_nombre') as string) || '').trim() || null,
      actualizada_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))

  await registrarActividad('excepcion', id, 'cambiar_estado', { modulo: row.modulo, estado })
  revalidatePath(BACK)
  redirect(BACK + '?success=actualizada')
}
