'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { puedeGestionar, esAdministrador } from '@/lib/rbac'
import { getMyTenantId } from '@/lib/tenant'
import { registrarActividad } from './_log'
import { hoyChile } from '@/lib/fechas'

// ── Colaciones ─────────────────────────────────────────────────
export async function createColacion(formData: FormData) {
  if (!(await puedeGestionar('colaciones'))) redirect('/admin/colaciones?error=' + encodeURIComponent('No tienes permiso de supervisor en Colaciones.'))
  const supabase = await createClient()
  const cant = parseInt((formData.get('cantidad') as string) || '1', 10)
  const { error } = await supabase.from('colaciones').insert({
    proyecto_id:   (formData.get('proyecto_id') as string) || null,
    dotacion_id:   (formData.get('dotacion_id') as string) || null,
    punto_entrega: (formData.get('punto_entrega') as string) || 'otro',
    sentido:       (formData.get('sentido') as string) || 'entrada',
    fecha:         (formData.get('fecha') as string) || null,
    contenido:     (formData.get('contenido') as string) || null,
    cantidad:      Number.isFinite(cant) ? cant : 1,
  })
  if (error) redirect('/admin/colaciones?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/colaciones')
  redirect('/admin/colaciones?success=1')
}

// Genera una colación por PERSONA para un alcance (persona/cuadrilla/todos en
// faena) en un punto de entrega, en un solo viaje (función SQL masiva).
export async function aplicarColaciones(formData: FormData) {
  if (!(await puedeGestionar('colaciones'))) redirect('/admin/colaciones?error=' + encodeURIComponent('No tienes permiso de supervisor en Colaciones.'))
  const supabase = await createClient()
  const scope = (formData.get('scope') as string) || 'persona'
  const ref = (formData.get('ref') as string) || null
  const fecha = formData.get('fecha') as string
  if (!fecha) redirect('/admin/colaciones?error=' + encodeURIComponent('Falta la fecha.'))
  if ((scope === 'persona' || scope === 'cuadrilla') && !ref) {
    redirect('/admin/colaciones?error=' + encodeURIComponent('Selecciona ' + (scope === 'persona' ? 'una persona' : 'una cuadrilla') + '.'))
  }
  const cant = parseInt((formData.get('cantidad') as string) || '1', 10)
  const { data, error } = await supabase.rpc('aplicar_colaciones_masivo' as never, {
    p_fecha:     fecha,
    p_punto:     (formData.get('punto_entrega') as string) || 'otro',
    p_sentido:   (formData.get('sentido') as string) || 'entrada',
    p_contenido: (formData.get('contenido') as string) || '',
    p_cantidad:  Number.isFinite(cant) ? cant : 1,
    p_scope:     scope,
    p_ref:       ref,
  } as never)
  if (error) redirect('/admin/colaciones?error=' + encodeURIComponent((error as { message: string }).message))
  revalidatePath('/admin/colaciones')
  redirect('/admin/colaciones?generadas=' + (Number(data) || 0))
}

// Automático por TURNO (1 clic): genera las colaciones del día derivadas de las
// rotaciones, no del bus. Modo 'inicio_fin' = colación de entrada el día que
// inicia el turno + de salida el día que termina; 'todos' = una por día en faena.
export async function gestionarColaciones(formData: FormData) {
  if (!(await puedeGestionar('colaciones'))) redirect('/admin/colaciones?error=' + encodeURIComponent('No tienes permiso de supervisor en Colaciones.'))
  const supabase = await createClient()
  const fecha = formData.get('fecha') as string
  const modo = (formData.get('modo') as string) || 'inicio_fin'
  const scope = (formData.get('scope') as string) || 'todos'
  const ref = (formData.get('ref') as string) || null
  if (!fecha) redirect('/admin/colaciones?error=' + encodeURIComponent('Falta la fecha.'))
  if ((scope === 'persona' || scope === 'cuadrilla') && !ref) {
    redirect('/admin/colaciones?error=' + encodeURIComponent('Selecciona ' + (scope === 'persona' ? 'una persona' : 'una cuadrilla') + '.'))
  }
  const { data, error } = await supabase.rpc('gestionar_colaciones_dia' as never, {
    p_fecha: fecha, p_modo: modo, p_scope: scope, p_ref: ref, p_generar: true,
  } as never)
  if (error) redirect('/admin/colaciones?error=' + encodeURIComponent((error as { message: string }).message))
  revalidatePath('/admin/colaciones')
  redirect('/admin/colaciones?generadas=' + (Number(data) || 0))
}

// Lavandería POR TURNO (masivo): asigna una planilla a una cuadrilla o a todos
// los en faena, creando una bolsa por persona con las MISMAS cantidades y las
// fechas de turno calculadas por persona (entrega = fin del turno vigente;
// siguiente rotación = próximo inicio, o fin+descanso si no hay rotación futura).
function addDiasISO(fecha: string, dias: number) {
  const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}
export async function asignarPlanillaMasivo(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const planillaId = (formData.get('planilla_id') as string) || null
  const scope = (formData.get('scope') as string) || 'cuadrilla'
  const ref = (formData.get('ref') as string) || ''
  const fechaRef = (formData.get('fecha_ref') as string) || hoyChile()
  if (scope === 'cuadrilla' && !ref) redirect('/admin/lavanderia?error=' + encodeURIComponent('Selecciona una cuadrilla.'))

  const nombres = formData.getAll('item_nombre') as string[]
  const cantidades = formData.getAll('item_cantidad') as string[]
  const items = nombres
    .map((nombre, i) => ({ nombre, cantidad: parseInt(cantidades[i] || '0', 10) }))
    .filter((it) => it.nombre && Number.isFinite(it.cantidad) && it.cantidad > 0)
  if (!items.length) redirect('/admin/lavanderia?error=' + encodeURIComponent('Indica al menos una cantidad mayor a 0.'))

  // Dotaciones del alcance
  let dots: { id: string; persona_id: string | null; turno_dias_descanso: number | null }[] = []
  if (scope === 'cuadrilla') {
    const { data } = await supabase.from('dotaciones').select('id, persona_id, turno_dias_descanso').eq('cuadrilla_id', ref).eq('estado', 'activa')
    dots = data ?? []
  } else {
    const { data: rots } = await supabase.from('rotaciones').select('dotacion_id').lte('fecha_inicio', fechaRef).gte('fecha_fin_esperada', fechaRef)
    const ids = [...new Set((rots ?? []).map((r) => r.dotacion_id).filter(Boolean))] as string[]
    if (ids.length) {
      const { data } = await supabase.from('dotaciones').select('id, persona_id, turno_dias_descanso').in('id', ids).eq('estado', 'activa')
      dots = data ?? []
    }
  }
  if (!dots.length) redirect('/admin/lavanderia?asignadas=0')

  // Fechas por persona desde sus rotaciones
  const dotIds = dots.map((d) => d.id)
  const { data: rotaciones } = await supabase.from('rotaciones').select('dotacion_id, fecha_inicio, fecha_fin_esperada').in('dotacion_id', dotIds)
  const finVigente: Record<string, string> = {}
  const proximoInicio: Record<string, string> = {}
  const ultimoFin: Record<string, string> = {}
  for (const r of rotaciones ?? []) {
    const id = r.dotacion_id as string
    const ini = r.fecha_inicio as string | null
    const fin = r.fecha_fin_esperada as string | null
    if (ini && fin && ini <= fechaRef && fechaRef <= fin && (!finVigente[id] || fin < finVigente[id])) finVigente[id] = fin
    if (ini && ini > fechaRef && (!proximoInicio[id] || ini < proximoInicio[id])) proximoInicio[id] = ini
    if (fin && (!ultimoFin[id] || fin > ultimoFin[id])) ultimoFin[id] = fin
  }

  const bolsas = dots.map((d) => {
    const fin = finVigente[d.id] ?? ultimoFin[d.id] ?? null
    const sig = proximoInicio[d.id] ?? (fin && d.turno_dias_descanso ? addDiasISO(fin, d.turno_dias_descanso) : null)
    return { dotacion_id: d.id, persona_id: d.persona_id, planilla_id: planillaId, fecha_entrega: fin, fecha_siguiente_rotacion: sig }
  })
  const { data: created, error } = await supabase.from('lavanderia_bolsas').insert(bolsas).select('id')
  if (error || !created) redirect('/admin/lavanderia?error=' + encodeURIComponent(error?.message ?? 'No se pudieron crear las bolsas.'))

  const itemsRows = created.flatMap((b) => items.map((it) => ({ bolsa_id: b.id, nombre: it.nombre, cantidad: it.cantidad })))
  const { error: errItems } = await supabase.from('lavanderia_bolsa_items').insert(itemsRows)
  if (errItems) redirect('/admin/lavanderia?error=' + encodeURIComponent(errItems.message))
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?asignadas=' + created.length)
}

export async function toggleColacionEntregada(id: string, entregada: boolean) {
  if (!(await puedeGestionar('colaciones'))) return
  const supabase = await createClient()
  await supabase.from('colaciones').update({
    entregada,
    entregada_at: entregada ? new Date().toISOString() : null,
  }).eq('id', id)
  revalidatePath('/admin/colaciones')
}

// ── Alimentación ───────────────────────────────────────────────
export async function createPlanAlimentacion(formData: FormData) {
  if (!(await puedeGestionar('alimentacion'))) redirect('/admin/alimentacion?error=' + encodeURIComponent('No tienes permiso de supervisor en Alimentación.'))
  const supabase = await createClient()
  const dotacionId = formData.get('dotacion_id') as string
  if (!dotacionId) redirect('/admin/alimentacion?error=' + encodeURIComponent('Selecciona una persona.'))
  const { error } = await supabase.from('plan_alimentacion').upsert({
    dotacion_id: dotacionId,
    fecha:       formData.get('fecha') as string,
    desayuno:    (formData.get('desayuno') as string) || 'no',
    almuerzo:    (formData.get('almuerzo') as string) || 'no',
    cena:        (formData.get('cena') as string) || 'no',
  }, { onConflict: 'dotacion_id,fecha' })
  if (error) redirect('/admin/alimentacion?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/alimentacion')
  redirect('/admin/alimentacion?success=1')
}

// Aplica el plan de comidas de un día a un alcance (persona/cuadrilla/todos en
// faena) en un solo viaje a la base (función SQL masiva, escala a miles).
export async function aplicarAlimentacion(formData: FormData) {
  if (!(await puedeGestionar('alimentacion'))) redirect('/admin/alimentacion?error=' + encodeURIComponent('No tienes permiso de supervisor en Alimentación.'))
  const supabase = await createClient()
  const scope = (formData.get('scope') as string) || 'persona'
  const ref = (formData.get('ref') as string) || null
  const fecha = formData.get('fecha') as string
  if (!fecha) redirect('/admin/alimentacion?error=' + encodeURIComponent('Falta la fecha.'))
  if ((scope === 'persona' || scope === 'cuadrilla') && !ref) {
    redirect('/admin/alimentacion?error=' + encodeURIComponent('Selecciona ' + (scope === 'persona' ? 'una persona' : 'una cuadrilla') + '.'))
  }
  const modo = (formData.get('modo') as string) || 'dia'
  const comidas = {
    p_desayuno: (formData.get('desayuno') as string) || 'no',
    p_almuerzo: (formData.get('almuerzo') as string) || 'no',
    p_cena:     (formData.get('cena') as string) || 'no',
  }

  // "Por turno" = todos los días de la rotación que contiene la fecha (opcional
  // excluir 1er/último día). "Un día" = solo esa fecha. rpc casteado (función nueva).
  const { data, error } = modo === 'turno'
    ? await supabase.rpc('aplicar_alimentacion_turno' as never, {
        p_fecha: fecha, ...comidas, p_scope: scope, p_ref: ref,
        p_excl_primer: formData.get('excl_primer') === 'on',
        p_excl_ultimo: formData.get('excl_ultimo') === 'on',
      } as never)
    : await supabase.rpc('aplicar_alimentacion_masivo' as never, {
        p_fecha: fecha, ...comidas, p_scope: scope, p_ref: ref,
      } as never)

  if (error) redirect('/admin/alimentacion?error=' + encodeURIComponent((error as { message: string }).message))
  revalidatePath('/admin/alimentacion')
  redirect('/admin/alimentacion?aplicados=' + (Number(data) || 0) + '&modo=' + modo)
}

// ── Lavandería ─────────────────────────────────────────────────
export async function createPrenda(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const nombre = (formData.get('nombre') as string)?.trim()
  if (nombre) await supabase.from('prendas_catalogo').insert({ nombre })
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?success=prenda')
}

export async function createBolsa(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const dotacionId = formData.get('dotacion_id') as string
  if (!dotacionId) redirect('/admin/lavanderia?error=' + encodeURIComponent('Selecciona una persona.'))
  const { data: dot } = await supabase.from('dotaciones').select('persona_id').eq('id', dotacionId).maybeSingle()
  const { error } = await supabase.from('lavanderia_bolsas').insert({
    dotacion_id:   dotacionId,
    persona_id:    dot?.persona_id ?? null,
    entregada_por: (formData.get('entregada_por') as string) || null,
  })
  if (error) redirect('/admin/lavanderia?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?success=bolsa')
}

const FLUJO: Record<string, string> = {
  recepcionada: 'en_lavanderia', en_lavanderia: 'en_proceso', en_proceso: 'entregada', entregada: 'entregada',
}
export async function avanzarBolsa(id: string, estadoActual: string) {
  if (!(await puedeGestionar('lavanderia'))) return
  const supabase = await createClient()
  await supabase.from('lavanderia_bolsas')
    .update({ estado: FLUJO[estadoActual] ?? estadoActual, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin/lavanderia')
}

// ── Lavandería · planillas (plantillas de ropa reutilizables) ──
export async function createPlanilla(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const nombre = (formData.get('nombre') as string)?.trim()
  if (!nombre) redirect('/admin/lavanderia?error=' + encodeURIComponent('Escribe un nombre para la planilla.'))
  const { error } = await supabase.from('lavanderia_planillas').insert({ nombre })
  if (error) redirect('/admin/lavanderia?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?success=planilla')
}

// Genera una planilla desde un Excel: cada fila de la primera columna = un ítem.
// Detecta y omite encabezado si la fila 1 es una palabra conocida. Recomendado
// máximo 24 ítems (la boleta se cuadra a 2 columnas de 12); si excede, avisa.
const PLANILLA_MAX_ITEMS = 24
export async function importPlanilla(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const nombre = (formData.get('nombre') as string)?.trim()
  const file = formData.get('file') as File | null
  if (!nombre) redirect('/admin/lavanderia?error=' + encodeURIComponent('Escribe un nombre para la planilla.'))
  if (!file || file.size === 0) redirect('/admin/lavanderia?error=' + encodeURIComponent('Selecciona un archivo Excel (.xlsx).'))

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load((await file.arrayBuffer()) as any)
  const ws = wb.worksheets[0]
  if (!ws) redirect('/admin/lavanderia?error=' + encodeURIComponent('El archivo no tiene hojas.'))

  const norm = (s: unknown) => (s ?? '').toString().trim()
  const key = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const HEADERS = ['item', 'items', 'prenda', 'prendas', 'nombre', 'articulo', 'ropa', 'descripcion', 'detalle']

  // Columna a leer: la del encabezado conocido; si no hay, la primera.
  let colIdx = 1, startRow = 1
  ws.getRow(1).eachCell((cell, c) => {
    if (startRow === 1 && HEADERS.includes(key(norm(cell.text)))) { colIdx = c; startRow = 2 }
  })

  const seen = new Set<string>()
  const items: string[] = []
  for (let i = startRow; i <= ws.rowCount; i++) {
    const v = norm(ws.getRow(i).getCell(colIdx).text)
    if (!v) continue
    const k = key(v)
    if (seen.has(k)) continue
    seen.add(k)
    items.push(v)
  }
  if (!items.length) redirect('/admin/lavanderia?error=' + encodeURIComponent('No se encontraron ítems en el archivo.'))

  const { data: pl, error: errPl } = await supabase.from('lavanderia_planillas').insert({ nombre }).select('id').single()
  if (errPl || !pl) redirect('/admin/lavanderia?error=' + encodeURIComponent(errPl?.message ?? 'No se pudo crear la planilla.'))
  const { error: errItems } = await supabase.from('lavanderia_planilla_items')
    .insert(items.map((n, i) => ({ planilla_id: pl.id, nombre: n, orden: i })))
  if (errItems) redirect('/admin/lavanderia?error=' + encodeURIComponent(errItems.message))

  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?creada=' + items.length + (items.length > PLANILLA_MAX_ITEMS ? '&aviso=1' : ''))
}

export async function addPlanillaItem(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const planillaId = formData.get('planilla_id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  if (!planillaId || !nombre) redirect('/admin/lavanderia?error=' + encodeURIComponent('Falta el ítem.'))
  const { count } = await supabase.from('lavanderia_planilla_items').select('id', { count: 'exact', head: true }).eq('planilla_id', planillaId)
  const { error } = await supabase.from('lavanderia_planilla_items').insert({ planilla_id: planillaId, nombre, orden: count ?? 0 })
  if (error) redirect('/admin/lavanderia?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?success=item')
}

export async function deletePlanillaItem(id: string) {
  if (!(await puedeGestionar('lavanderia'))) return
  const supabase = await createClient()
  await supabase.from('lavanderia_planilla_items').delete().eq('id', id)
  revalidatePath('/admin/lavanderia')
}

export async function deletePlanilla(id: string) {
  if (!(await puedeGestionar('lavanderia'))) return
  const supabase = await createClient()
  await supabase.from('lavanderia_planillas').delete().eq('id', id)
  revalidatePath('/admin/lavanderia')
}

// Asigna una planilla a una persona = crea una bolsa (con planilla + fechas) y
// su contenido (ítems con cantidades). La bolsa conserva el flujo de estados.
export async function asignarPlanilla(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const planillaId = formData.get('planilla_id') as string
  const dotacionId = formData.get('dotacion_id') as string
  if (!dotacionId) redirect('/admin/lavanderia?error=' + encodeURIComponent('Selecciona una persona.'))
  const nombres = formData.getAll('item_nombre') as string[]
  const cantidades = formData.getAll('item_cantidad') as string[]
  const items = nombres
    .map((nombre, i) => ({ nombre, cantidad: parseInt(cantidades[i] || '0', 10) }))
    .filter((it) => it.nombre && Number.isFinite(it.cantidad) && it.cantidad > 0)
  if (!items.length) redirect('/admin/lavanderia?error=' + encodeURIComponent('Indica al menos una cantidad mayor a 0.'))

  const { data: dot } = await supabase.from('dotaciones').select('persona_id').eq('id', dotacionId).maybeSingle()
  const { data: bolsa, error } = await supabase.from('lavanderia_bolsas').insert({
    dotacion_id:              dotacionId,
    persona_id:               dot?.persona_id ?? null,
    planilla_id:              planillaId || null,
    fecha_entrega:            (formData.get('fecha_entrega') as string) || null,
    fecha_siguiente_rotacion: (formData.get('fecha_siguiente_rotacion') as string) || null,
  }).select('id').single()
  if (error || !bolsa) redirect('/admin/lavanderia?error=' + encodeURIComponent(error?.message ?? 'No se pudo crear la bolsa.'))

  const { error: errItems } = await supabase.from('lavanderia_bolsa_items')
    .insert(items.map((it) => ({ bolsa_id: bolsa.id, nombre: it.nombre, cantidad: it.cantidad })))
  if (errItems) redirect('/admin/lavanderia?error=' + encodeURIComponent(errItems.message))
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?asignada=' + bolsa.id)
}

// ── Vínculos (match proveedor por RUT) ─────────────────────────
export async function createVinculo(proyectoId: string, formData: FormData) {
  const supabase = await createClient()
  const back = `/admin/proyectos/${proyectoId}`
  if (!(await esAdministrador())) redirect(back + '?error=' + encodeURIComponent('Solo la administración puede vincular proveedores.'))
  const rut = ((formData.get('proveedor_rut') as string) || '').trim()
  if (!rut) redirect(back + '?error=' + encodeURIComponent('Ingresa el RUT del proveedor.'))

  // ¿El proveedor ya está en el SaaS? (match por RUT del tenant)
  const { data: tenantProv } = await supabase.from('tenants').select('id, name').eq('rut', rut).maybeSingle()

  const { error } = await supabase.from('proyecto_proveedores').insert({
    proyecto_id:        proyectoId,
    proveedor_rut:      rut,
    proveedor_nombre:   (formData.get('proveedor_nombre') as string) || tenantProv?.name || null,
    tenant_proveedor_id: tenantProv?.id ?? null,
    modulo:             (formData.get('modulo') as string) || 'transporte',
    estado:             tenantProv ? 'activo' : 'stub',
  })
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))
  await registrarActividad('vinculo', proyectoId, 'vincular', {
    proveedor_rut: rut, modulo: (formData.get('modulo') as string) || 'transporte',
    estado: tenantProv ? 'activo' : 'stub',
  })
  revalidatePath(back)
  redirect(back + '?success=vinculo')
}

// Lado PROVEEDOR: se conecta a un proyecto con el CÓDIGO que le envió el
// Mandante. Como el proveedor ya es cliente del SaaS, queda como 'activo'
// (= "Socio Dotia"). El match por RUT (createVinculo) sigue siendo la otra vía.
export async function conectarPorCodigo(formData: FormData) {
  const supabase = await createClient()
  const back = '/admin/conectados'
  const codigo = ((formData.get('codigo') as string) || '').trim().toUpperCase()
  const modulo = (formData.get('modulo') as string) || ''
  if (!codigo) redirect(back + '?error=' + encodeURIComponent('Ingresa el código del proyecto.'))
  if (!modulo) redirect(back + '?error=' + encodeURIComponent('Selecciona el módulo con el que atenderás.'))

  // El proyecto vive en OTRO tenant (el Mandante). Buscar por código requiere
  // saltar el RLS de proyectos (el proveedor aún no está vinculado), así que se
  // resuelve con una función SECURITY DEFINER acotada al código exacto.
  const { data: proy, error: errBusca } = await supabase.rpc('buscar_proyecto_por_codigo' as never, { p_codigo: codigo } as never)
  if (errBusca) redirect(back + '?error=' + encodeURIComponent((errBusca as { message: string }).message))
  const proyecto = (Array.isArray(proy) ? proy[0] : proy) as { id: string; nombre: string; tenant_id: string } | null
  if (!proyecto?.id) redirect(back + '?error=' + encodeURIComponent('No existe un proyecto con ese código. Revísalo con el Mandante.'))

  const tenantId = await getMyTenantId()
  const { data: yo } = await supabase.from('tenants').select('rut, name').eq('id', tenantId).maybeSingle()
  if (!yo?.rut) redirect(back + '?error=' + encodeURIComponent('Tu empresa no tiene RUT registrado. Pídele al administrador del sistema que lo complete.'))

  // El vínculo PERTENECE al Mandante dueño del proyecto (no al proveedor): por
  // eso se inserta con el cliente admin fijando tenant_id = dueño. Si no, el
  // Mandante no vería al proveedor en su proyecto (RLS por tenant_id).
  const admin = createAdminClient()
  const { data: existe } = await admin
    .from('proyecto_proveedores')
    .select('id')
    .eq('proyecto_id', proyecto.id)
    .eq('tenant_proveedor_id', tenantId)
    .eq('modulo', modulo)
    .maybeSingle()
  if (existe) redirect(back + '?conectado=' + encodeURIComponent(proyecto.nombre) + '&ya=1')

  const { error } = await admin.from('proyecto_proveedores').insert({
    proyecto_id:         proyecto.id,
    proveedor_rut:       yo.rut,
    proveedor_nombre:    yo.name,
    tenant_proveedor_id: tenantId,
    modulo,
    estado:              'activo',
    tenant_id:           proyecto.tenant_id, // dueño = Mandante
  })
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))
  await registrarActividad('vinculo', proyecto.id, 'vincular', { via: 'codigo', modulo })
  revalidatePath(back)
  redirect(back + '?conectado=' + encodeURIComponent(proyecto.nombre))
}

// Recursos que el proveedor compromete a este proyecto (ej. 3 buses, 3 sprinters).
export async function addRecursoVinculo(proyectoId: string, vinculoId: string, formData: FormData) {
  const supabase = await createClient()
  const back = `/admin/proyectos/${proyectoId}`
  if (!(await esAdministrador())) redirect(back + '?error=' + encodeURIComponent('Solo la administración puede gestionar recursos del vínculo.'))
  const tipo = ((formData.get('tipo') as string) || '').trim()
  const cant = parseInt((formData.get('cantidad') as string) || '1', 10)
  if (!tipo) redirect(back + '?error=' + encodeURIComponent('Indica el tipo de recurso (ej. Bus, Sprinter).'))

  const { error } = await supabase.from('proyecto_proveedor_recursos').insert({
    vinculo_id: vinculoId,
    tipo,
    cantidad: Number.isFinite(cant) && cant >= 0 ? cant : 1,
    notas: ((formData.get('notas') as string) || '').trim() || null,
  })
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))
  revalidatePath(back)
  redirect(back + '?success=recurso')
}

export async function deleteRecursoVinculo(proyectoId: string, recursoId: string) {
  if (!(await esAdministrador())) redirect(`/admin/proyectos/${proyectoId}?error=` + encodeURIComponent('Solo la administración puede eliminar recursos del vínculo.'))
  const supabase = await createClient()
  await supabase.from('proyecto_proveedor_recursos').delete().eq('id', recursoId)
  revalidatePath(`/admin/proyectos/${proyectoId}`)
}
