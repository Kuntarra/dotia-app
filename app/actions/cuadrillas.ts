'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esAdministrador, puedePlanificar } from '@/lib/rbac'
import { registrarActividad } from './_log'

type ServerClient = Awaited<ReturnType<typeof createClient>>

// La FK no evita referenciar el id de una cuadrilla de OTRA empresa: el
// insert/update no falla por eso (RLS protege lo que puedo escribir, no lo
// que referencio). El select sí respeta RLS, así que confirma visibilidad.
async function cuadrillaValida(supabase: ServerClient, cuadrillaId: string | null): Promise<boolean> {
  if (!cuadrillaId) return true
  const { data } = await supabase.from('cuadrillas').select('id').eq('id', cuadrillaId).maybeSingle()
  return !!data
}

// Crea una cuadrilla (grupo) a nivel de empresa.
export async function crearCuadrilla(formData: FormData) {
  if (!(await esAdministrador())) redirect('/admin/personal?error=' + encodeURIComponent('Solo la administración puede crear cuadrillas.'))
  const supabase = await createClient()
  const nombre = ((formData.get('nombre') as string) || '').trim()
  const back = (formData.get('back') as string) || '/admin/personal'
  if (!nombre) redirect(back + '?error=' + encodeURIComponent('Ponle un nombre a la cuadrilla.'))

  const { data, error } = await supabase.from('cuadrillas').insert({ nombre }).select('id').single()
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))

  await registrarActividad('cuadrilla', data.id, 'crear', { nombre })
  revalidatePath(back)
  redirect(back + '?success=cuadrilla')
}

// Asigna/mueve a la persona a una cuadrilla GLOBAL (persona_directorio). Como
// una persona nunca está en dos proyectos a la vez, la cuadrilla es propia de
// la persona. Se sincroniza a sus dotaciones ACTIVAS para que los flujos
// masivos por cuadrilla (alimentación/colaciones/lavandería/transporte) sigan
// funcionando sin cambios.
export async function moverPersonaCuadrilla(personaId: string, formData: FormData) {
  const back = `/admin/personal/${personaId}`
  if (!(await puedePlanificar())) redirect(back + '?error=' + encodeURIComponent('Solo quien planifica puede mover de cuadrilla.'))
  const supabase = await createClient()

  const cuadrillaId = ((formData.get('cuadrilla_id') as string) || '').trim() || null
  if (!(await cuadrillaValida(supabase, cuadrillaId))) redirect(back + '?error=' + encodeURIComponent('Cuadrilla no válida.'))

  const { error } = await supabase
    .from('persona_directorio')
    .update({ cuadrilla_id: cuadrillaId })
    .eq('persona_id', personaId)
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))

  // Sincroniza las dotaciones activas de la persona (denormalización hacia abajo).
  const { error: errDot } = await supabase
    .from('dotaciones')
    .update({ cuadrilla_id: cuadrillaId })
    .eq('persona_id', personaId)
    .eq('estado', 'activa')
  if (errDot) redirect(back + '?error=' + encodeURIComponent(errDot.message))

  await registrarActividad('cuadrilla', cuadrillaId, 'mover', { persona_id: personaId })
  revalidatePath(back)
  redirect(back + '?success=cuadrilla')
}

// Igual que moverPersonaCuadrilla pero sin redirect: la usa el tablero de
// arrastre (/admin/cuadrillas) para reasignar sin recargar la página.
export async function setCuadrillaPersona(personaId: string, cuadrillaId: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!(await puedePlanificar())) return { ok: false, error: 'No autorizado.' }
  const supabase = await createClient()
  if (!(await cuadrillaValida(supabase, cuadrillaId))) return { ok: false, error: 'Cuadrilla no válida.' }

  const { error } = await supabase
    .from('persona_directorio')
    .update({ cuadrilla_id: cuadrillaId })
    .eq('persona_id', personaId)
  if (error) return { ok: false, error: error.message }

  const { error: errDot } = await supabase
    .from('dotaciones')
    .update({ cuadrilla_id: cuadrillaId })
    .eq('persona_id', personaId)
    .eq('estado', 'activa')
  if (errDot) return { ok: false, error: errDot.message }

  await registrarActividad('cuadrilla', cuadrillaId, 'mover', { persona_id: personaId })
  revalidatePath('/admin/cuadrillas')
  return { ok: true }
}
