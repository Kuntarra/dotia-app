'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esAdministrador } from '@/lib/rbac'
import { registrarActividad } from './_log'

const BACK = '/admin/turnos'

// Catálogo de tipos de turno reutilizables (NxN, horas 8/12, jornada).
export async function crearTipoTurno(formData: FormData) {
  if (!(await esAdministrador())) redirect(BACK + '?error=' + encodeURIComponent('Solo la administración puede crear turnos.'))
  const supabase = await createClient()

  const nombre = ((formData.get('nombre') as string) || '').trim()
  const diasTrabajo = parseInt((formData.get('dias_trabajo') as string) || '', 10)
  const diasDescanso = parseInt((formData.get('dias_descanso') as string) || '0', 10)
  const horasRaw = (formData.get('horas') as string) || ''
  const horas = horasRaw ? parseInt(horasRaw, 10) : null
  const jornada = ((formData.get('jornada') as string) || 'dia')

  if (!nombre) redirect(BACK + '?error=' + encodeURIComponent('Ponle un nombre al turno (ej. 14x14 día).'))
  if (!Number.isFinite(diasTrabajo) || diasTrabajo < 1) redirect(BACK + '?error=' + encodeURIComponent('Días de trabajo debe ser 1 o más.'))
  if (!['dia', 'noche', 'rotativa'].includes(jornada)) redirect(BACK + '?error=' + encodeURIComponent('Jornada no válida.'))

  const { data, error } = await supabase
    .from('tipos_turno')
    .insert({
      nombre,
      dias_trabajo: diasTrabajo,
      dias_descanso: Number.isFinite(diasDescanso) ? diasDescanso : 0,
      horas,
      jornada,
    })
    .select('id')
    .single()
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))

  await registrarActividad('tipo_turno', data.id, 'crear', { nombre, dias_trabajo: diasTrabajo, dias_descanso: diasDescanso, jornada })

  revalidatePath(BACK)
  redirect(BACK + '?success=creado')
}

export async function desactivarTipoTurno(id: string) {
  if (!(await esAdministrador())) redirect(BACK + '?error=' + encodeURIComponent('Solo la administración puede cambiar turnos.'))
  const supabase = await createClient()
  const { data, error } = await supabase.from('tipos_turno').update({ activa: false }).eq('id', id).select('id')
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))
  if (!data?.length) redirect(BACK + '?error=' + encodeURIComponent('No se encontró el turno o no tienes permiso.'))
  await registrarActividad('tipo_turno', id, 'desactivar')
  revalidatePath(BACK)
  redirect(BACK + '?success=baja')
}
