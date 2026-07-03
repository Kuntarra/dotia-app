'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedePlanificar } from '@/lib/rbac'
import { registrarActividad } from './_log'

// Editar una rotación a mano (marca ajustada_manual = true)
export async function updateRotacion(proyectoId: string, dotId: string, rotId: string, formData: FormData) {
  const back = `/admin/proyectos/${proyectoId}/dotacion/${dotId}`
  if (!(await puedePlanificar())) redirect(back + '?error=' + encodeURIComponent('Solo quien planifica puede editar rotaciones.'))
  const supabase = await createClient()
  const { error } = await supabase.from('rotaciones').update({
    fecha_inicio:       (formData.get('fecha_inicio') as string) || null,
    fecha_fin_esperada: (formData.get('fecha_fin_esperada') as string) || null,
    vuelo_ida_numero:   (formData.get('vuelo_ida_numero') as string) || null,
    vuelo_ida_fecha:    (formData.get('vuelo_ida_fecha') as string) || null,
    vuelo_vuelta_numero:(formData.get('vuelo_vuelta_numero') as string) || null,
    vuelo_vuelta_fecha: (formData.get('vuelo_vuelta_fecha') as string) || null,
    estado_ciclo:       (formData.get('estado_ciclo') as string) || 'planificada',
    ajustada_manual:    true,
  }).eq('id', rotId)
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))
  await registrarActividad('rotacion', rotId, 'editar_rotacion', { dotacion_id: dotId })
  revalidatePath(`/admin/proyectos/${proyectoId}/dotacion/${dotId}`)
}

// Recalcular las rotaciones siguientes a partir de un número
export async function recalcularSiguientes(proyectoId: string, dotId: string, desde: number) {
  if (!(await puedePlanificar())) redirect(`/admin/proyectos/${proyectoId}/dotacion/${dotId}?error=` + encodeURIComponent('Solo quien planifica puede recalcular rotaciones.'))
  const supabase = await createClient()
  await supabase.rpc('recalcular_rotaciones', { p_dotacion_id: dotId, p_desde: desde })
  await registrarActividad('rotacion', dotId, 'recalcular', { desde })
  revalidatePath(`/admin/proyectos/${proyectoId}/dotacion/${dotId}`)
}
