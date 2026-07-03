'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esAdministrador } from '@/lib/rbac'
import { registrarActividad } from './_log'

const BACK = '/admin/puntos'

// Punto MANUAL del catálogo compartido. Los puntos derivados de una propiedad
// se sincronizan solos desde Alojamiento y no se crean/editan aquí.
export async function crearPunto(formData: FormData) {
  if (!(await esAdministrador())) redirect(BACK + '?error=' + encodeURIComponent('Solo la administración puede crear puntos.'))
  const supabase = await createClient()

  const nombre = ((formData.get('nombre') as string) || '').trim()
  const direccion = ((formData.get('direccion') as string) || '').trim() || null
  if (!nombre) redirect(BACK + '?error=' + encodeURIComponent('Ponle un nombre al punto.'))

  const { data, error } = await supabase
    .from('puntos')
    .insert({ nombre, direccion, tipo: 'manual' })
    .select('id')
    .single()
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))

  await registrarActividad('punto', data.id, 'crear', { nombre })
  revalidatePath(BACK)
  redirect(BACK + '?success=creado')
}

export async function desactivarPunto(id: string) {
  if (!(await esAdministrador())) redirect(BACK + '?error=' + encodeURIComponent('Solo la administración puede cambiar puntos.'))
  const supabase = await createClient()
  // Solo puntos manuales: los derivados se gestionan desde su propiedad.
  const { data, error } = await supabase.from('puntos').update({ activa: false }).eq('id', id).eq('tipo', 'manual').select('id')
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))
  if (!data?.length) redirect(BACK + '?error=' + encodeURIComponent('No se encontró el punto o no se puede desactivar (solo puntos manuales).'))
  await registrarActividad('punto', id, 'desactivar')
  revalidatePath(BACK)
  redirect(BACK + '?success=baja')
}
