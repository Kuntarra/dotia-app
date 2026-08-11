// Resumen y reportes por correo (Resend). Sistema de suscripciones programables.
// Reconexión Git verificada.
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { PRODUCTO, PRODUCTO_BAJADA, PALETA, getMarcaClientePorId, slugCliente, type Membrete } from '@/lib/marca'
import { MODULOS } from '@/lib/modulos'

// El resumen de movimientos habla de estadías, o sea del módulo Hotel.
const MODULO_HOTEL = MODULOS.find(m => m.k === 'hotel')!.label

const TZ = 'America/Santiago'
// Colores tomados de la paleta única de Dotia. Los nombres viejos (NAVY, GOLD)
// se conservan como alias locales para no reescribir 40 plantillas de golpe,
// pero ya no apuntan al azul y dorado de Sol Eterno.
const NAVY = PALETA.marcaProfunda   // fondo del membrete y titulares
const GOLD = PALETA.senal           // acento sobre verde profundo
const GOLDD = PALETA.salida         // terracota: "sale", frente al verde de "entra"
const INK = PALETA.tinta, MUTED = PALETA.tenue, LINE = PALETA.filete, CREAM = PALETA.lienzo

export type Scope = {
  scope_type: 'all' | 'company' | 'property' | 'project' | 'each_project'
  company_id?: string | null
  property_ids?: string[] | null
  project_id?: string | null
  tenant_id: string   // operador dueño de la suscripción (aislamiento multi-tenant)
}
export type Subscription = Scope & {
  id: string
  email: string
  name: string | null
  report_type: 'movements' | 'full'
  frequency: 'daily' | 'weekly' | 'monthly'
  weekdays: number[] | null
  monthday: number | null
  send_hour: number
  active: boolean
  last_sent_at: string | null
}

export type Movimiento = {
  nombre: string; rut: string; telefono: string
  empresa: string; propiedad: string; habitacion: string; turno: string; hora: string
}

// ── Helpers de zona horaria de Chile ───────────────────────────
function chileMidnightUTC(y: number, m: number, d: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const asCL = new Date(guess.toLocaleString('en-US', { timeZone: TZ }))
  const offset = asCL.getTime() - guess.getTime()
  return new Date(guess.getTime() - offset)
}
function ymdInChile(date: Date) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return {
    y: +p.find(x => x.type === 'year')!.value,
    m: +p.find(x => x.type === 'month')!.value,
    d: +p.find(x => x.type === 'day')!.value,
  }
}
const fmtDate = (d: Date) => d.toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
const horaCL = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

// Ventana del período según frecuencia (hasta el final de ayer, Chile).
function periodRange(freq: Subscription['frequency'], ref = new Date()) {
  const today = ymdInChile(ref)
  const endUTC = chileMidnightUTC(today.y, today.m, today.d)
  const days = freq === 'weekly' ? 7 : freq === 'monthly' ? 30 : 1
  const startUTC = new Date(endUTC.getTime() - days * 24 * 3600 * 1000)
  const lastDay = new Date(endUTC.getTime() - 12 * 3600 * 1000)
  const periodLabel =
    freq === 'daily'
      ? fmtDate(lastDay)
      : `${fmtDate(new Date(startUTC.getTime() + 12 * 3600 * 1000))} – ${fmtDate(lastDay)}`
  const periodWord = freq === 'daily' ? 'del día' : freq === 'weekly' ? 'de la semana' : 'del mes'
  return { startISO: startUTC.toISOString(), endISO: endUTC.toISOString(), periodLabel, periodWord }
}

function mapMov(s: any, iso: string): Movimiento {
  const g = s.guests as any, r = s.rooms as any, c = s.companies as any
  return {
    nombre: `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim() || '—',
    rut: g?.rut || '—',
    telefono: g?.phone || '—',
    empresa: c?.name || '—',
    propiedad: r?.properties?.name || '—',
    habitacion: r?.number || '—',
    turno: s.shift_type || '—',
    hora: horaCL(iso),
  }
}

export async function scopeLabel(scope: Scope): Promise<string> {
  const admin = createAdminClient()
  if (scope.scope_type === 'project' && scope.project_id) {
    const { data } = await admin.from('projects').select('name, companies(name)').eq('id', scope.project_id).eq('tenant_id', scope.tenant_id).single()
    const emp = (data?.companies as any)?.name
    return data?.name ? `Proyecto: ${data.name}${emp ? ` (${emp})` : ''}` : 'Proyecto'
  }
  if (scope.scope_type === 'company' && scope.company_id) {
    const { data } = await admin.from('companies').select('name').eq('id', scope.company_id).eq('tenant_id', scope.tenant_id).single()
    return data?.name ? `Empresa: ${data.name}` : 'Empresa'
  }
  if (scope.scope_type === 'property' && scope.property_ids?.length) {
    const { data } = await admin.from('properties').select('name').eq('tenant_id', scope.tenant_id).in('id', scope.property_ids)
    const names = (data ?? []).map(p => p.name)
    return names.length ? `Propiedades: ${names.join(', ')}` : 'Propiedades'
  }
  return 'Toda la operación'
}

// Aplica el filtro de alcance a una query de stays.
export async function buildScopeFilter(scope: Scope) {
  const admin = createAdminClient()
  let roomIds: string[] | null = null
  if (scope.scope_type === 'property' && scope.property_ids?.length) {
    const { data: rooms } = await admin.from('rooms').select('id').eq('tenant_id', scope.tenant_id).in('property_id', scope.property_ids)
    roomIds = (rooms ?? []).map(r => r.id)
  }
  return (q: any) => {
    // Aislamiento multi-tenant: SIEMPRE acotar al operador de la suscripción
    q = q.eq('tenant_id', scope.tenant_id)
    if (scope.scope_type === 'company' && scope.company_id) q = q.eq('company_id', scope.company_id)
    if (scope.scope_type === 'project') {
      // null project_id → filtro imposible para no filtrar toda la operación por accidente
      q = scope.project_id ? q.eq('project_id', scope.project_id) : q.eq('id', '00000000-0000-0000-0000-000000000000')
    }
    if (roomIds) q = roomIds.length ? q.in('room_id', roomIds) : q.eq('id', '00000000-0000-0000-0000-000000000000')
    return q
  }
}

export type DigestData = {
  periodLabel: string
  periodWord: string
  scopeText: string
  // Nombre del cliente dueño de la operación, para el membrete. Viaja en los
  // datos porque el correo se arma sin sesión (lo dispara el cron).
  cliente: string
  checkins: Movimiento[]
  checkouts: Movimiento[]
}

const SEL = `shift_type, checked_in_at, checked_out_at, guests(first_name, last_name_paterno, rut, phone), rooms(number, properties(name)), companies(name)`

export async function getDigestData(scope: Scope, freq: Subscription['frequency'], ref = new Date()): Promise<DigestData> {
  const admin = createAdminClient()
  const { startISO, endISO, periodLabel, periodWord } = periodRange(freq, ref)
  const applyScope = await buildScopeFilter(scope)

  const [{ data: ins }, { data: outs }] = await Promise.all([
    applyScope(admin.from('stays').select(SEL).gte('checked_in_at', startISO).lt('checked_in_at', endISO)).order('checked_in_at'),
    applyScope(admin.from('stays').select(SEL).gte('checked_out_at', startISO).lt('checked_out_at', endISO)).order('checked_out_at'),
  ])

  return {
    periodLabel, periodWord,
    scopeText: await scopeLabel(scope),
    cliente: (await getMarcaClientePorId(scope.tenant_id)).nombre,
    checkins:  ((ins  ?? []) as any[]).map(s => mapMov(s, s.checked_in_at)),
    checkouts: ((outs ?? []) as any[]).map(s => mapMov(s, s.checked_out_at)),
  }
}

// ── Sistema visual del correo (letterhead editorial) ──────────────
const SERIF = "Georgia, 'Times New Roman', Times, serif"

function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;font-size:1px;line-height:1px;color:${CREAM}">${text}</div>`
}

// Membrete de cuatro niveles, del más general al más específico:
//
//   dotia                    HOTEL     ← producto (discreto) · módulo (chip)
//   SOL ETERNO                         ← el cliente, protagonista
//   ─────                              ← filete dorado
//   HOTEL VIVAR 2                      ← el lugar o alcance
//
// La jerarquía se sostiene con tamaño y peso, no con cuatro líneas iguales: el
// ojo cae primero en el cliente, y los otros tres niveles lo sitúan sin competir.
// Tablas y estilos en línea porque los clientes de correo no soportan flexbox.
function letterhead(m: Membrete): string {
  const modulo = m.modulo
    ? `<td align="right" style="vertical-align:middle">
         <span style="display:inline-block;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};font-weight:700;border:1px solid rgba(47,191,143,.45);border-radius:999px;padding:5px 12px;white-space:nowrap">${m.modulo}</span>
       </td>`
    : ''
  const lugar = m.lugar
    ? `<div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55)">${m.lugar}</div>`
    : `<div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55)">${PRODUCTO_BAJADA}</div>`
  return `<tr><td style="background:${NAVY};padding:26px 36px 28px;border-radius:18px 18px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle">
        <span style="font-family:${SERIF};font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.5)">${PRODUCTO}</span>
      </td>
      ${modulo}
    </tr></table>
    <div style="font-family:${SERIF};font-size:27px;letter-spacing:.14em;color:#ffffff;margin-top:22px;line-height:1.15">${m.cliente.toUpperCase()}</div>
    <div style="width:36px;height:2px;background:${GOLD};margin:14px 0 11px;font-size:0;line-height:0">&nbsp;</div>
    ${lugar}
  </td></tr>`
}

// Título del reporte dentro del cuerpo blanco (serif, capitalizado).
function reportTitle(title: string, periodLabel: string): string {
  return `<div style="padding:26px 36px 0">
    <div style="font-family:${SERIF};font-size:23px;color:${NAVY}">${title}</div>
    <div style="font-size:13px;color:${MUTED};margin-top:3px">${periodLabel}</div>
  </div>`
}

// Banda de indicadores (pills serif).
function statBand(items: { value: number | string; label: string; accent: string }[]): string {
  return `<div style="padding:18px 36px 2px">
    <table cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr>
      ${items.map(it => `<td style="padding-right:10px">
        <table cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px"><tr>
          <td style="padding:12px 18px">
            <div style="font-family:${SERIF};font-size:24px;color:${it.accent};line-height:1">${it.value}</div>
            <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${MUTED};margin-top:5px">${it.label}</div>
          </td></tr></table></td>`).join('')}
    </tr></table>
  </div>`
}

// Colofón: acá va el PRODUCTO, no el cliente. El wordmark ya dice quién lo
// generó, así que la línea de abajo no lo repite: solo qué es y cuándo salió.
function mailFooter(): string {
  return `<div style="padding:24px 36px 30px">
    <div style="height:1px;background:${LINE};margin:0 0 16px;font-size:0;line-height:0">&nbsp;</div>
    <div style="font-family:${SERIF};font-size:13px;letter-spacing:.16em;color:${NAVY}">${PRODUCTO.toUpperCase()}</div>
    <div style="font-size:11px;color:${MUTED};margin-top:5px">${PRODUCTO_BAJADA} · Reporte generado automáticamente el ${fmtDate(new Date())}</div>
  </div>`
}

// Envoltorio común: fondo cálido, contenedor centrado, membrete + cuerpo blanco + pie.
function shell(membrete: Membrete, preheaderText: string, body: string, width = 660): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${CREAM};-webkit-font-smoothing:antialiased;font-family:-apple-system,Helvetica,Arial,sans-serif">
    ${preheader(preheaderText)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:28px 12px"><tr><td align="center">
      <table width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%">
        ${letterhead(membrete)}
        <tr><td style="background:#ffffff;border:1px solid ${LINE};border-top:none;border-radius:0 0 18px 18px">
          ${body}
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}

// Etiqueta de sección con filete de marca.
function sectionLabel(text: string): string {
  return `<div style="margin:0 0 14px">
    <span style="display:inline-block;width:14px;height:3px;border-radius:2px;background:${PALETA.marca};vertical-align:middle;margin-right:9px"></span>
    <span style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${NAVY};vertical-align:middle">${text}</span>
  </div>`
}

// Agrupa movimientos por propiedad (cada uno con sus check-ins y check-outs).
export function propertyGroups(checkins: Movimiento[], checkouts: Movimiento[]) {
  const map = new Map<string, { ins: Movimiento[]; outs: Movimiento[] }>()
  for (const m of checkins)  { const e = map.get(m.propiedad) ?? { ins: [], outs: [] }; e.ins.push(m);  map.set(m.propiedad, e) }
  for (const m of checkouts) { const e = map.get(m.propiedad) ?? { ins: [], outs: [] }; e.outs.push(m); map.set(m.propiedad, e) }
  return [...map.entries()]
    .map(([propiedad, v]) => ({ propiedad, ...v }))
    .sort((a, b) => (b.ins.length + b.outs.length) - (a.ins.length + a.outs.length) || a.propiedad.localeCompare(b.propiedad))
}

// Lista de nombres de un movimiento (sin columna propiedad, ya agrupada).
function movList(rows: Movimiento[], accent: string): string {
  if (!rows.length) return `<div style="padding:8px 2px;font-size:12px;color:${MUTED};font-style:italic">— sin registros —</div>`
  const head = ['Hora', 'Nombre', 'RUT', 'Teléfono', 'Empresa', 'Hab.', 'Turno']
  const cell = 'padding:8px 12px'
  const body = rows.map((m, i) => `
    <tr style="background:${i % 2 ? PALETA.lienzo : '#ffffff'}">
      <td style="${cell};color:${MUTED};white-space:nowrap;font-variant-numeric:tabular-nums">${m.hora}</td>
      <td style="${cell};color:${INK};font-weight:600">${m.nombre}</td>
      <td style="${cell};color:${MUTED};font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;white-space:nowrap">${m.rut}</td>
      <td style="${cell};color:${MUTED}">${m.telefono}</td>
      <td style="${cell};color:${INK}">${m.empresa}</td>
      <td style="${cell};color:${MUTED}">${m.habitacion}</td>
      <td style="${cell};color:${MUTED}">${m.turno}</td>
    </tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid ${LINE};border-top:2px solid ${accent};border-radius:8px;overflow:hidden;font-size:12.5px">
    <tr style="background:${CREAM}">
      ${head.map(h => `<th style="text-align:left;padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${MUTED};border-bottom:1px solid ${LINE}">${h}</th>`).join('')}
    </tr>
    ${body}
  </table>`
}

// Sub-encabezado de sección dentro de la tarjeta (Check-in / Check-out).
function movSub(label: string, accent: string, n: number): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:14px 0 9px"><tr>
    <td style="width:9px;height:9px;border-radius:50%;background:${accent};font-size:0;line-height:0">&nbsp;</td>
    <td style="padding-left:10px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${NAVY}">${label}</td>
    <td style="padding-left:8px;font-size:12px;color:${MUTED}">${n}</td>
  </tr></table>`
}

// Tarjeta por propiedad: nombre + lista de check-ins y check-outs.
function propertyCard(g: { propiedad: string; ins: Movimiento[]; outs: Movimiento[] }): string {
  return `<div style="border:1px solid ${LINE};border-radius:12px;overflow:hidden;margin:0 0 16px">
    <div style="background:${CREAM};padding:13px 16px;border-bottom:1px solid ${LINE}">
      <span style="font-family:${SERIF};font-size:15px;font-weight:700;color:${NAVY}">${g.propiedad}</span>
      <span style="float:right;font-size:11px;color:${MUTED};padding-top:3px">${g.ins.length} in · ${g.outs.length} out</span>
    </div>
    <div style="padding:2px 16px 16px">
      ${movSub('Check-in', NAVY, g.ins.length)}
      ${movList(g.ins, NAVY)}
      ${movSub('Check-out', GOLDD, g.outs.length)}
      ${movList(g.outs, GOLDD)}
    </div>
  </div>`
}

export function renderDigestHtml(data: DigestData): string {
  const groups = propertyGroups(data.checkins, data.checkouts)
  const body = `
    ${reportTitle(`Movimientos ${data.periodWord}`, data.periodLabel)}
    ${statBand([
      { value: data.checkins.length, label: 'Check-ins', accent: NAVY },
      // El acento claro (senal) es ilegible como número sobre blanco: sobre
      // fondo claro el contrapunto del verde es la terracota.
      { value: data.checkouts.length, label: 'Check-outs', accent: GOLDD },
    ])}
    <div style="padding:24px 36px 8px">
      ${sectionLabel('Movimientos por propiedad')}
      ${groups.length
        ? groups.map(propertyCard).join('')
        : `<div style="border:1px solid ${LINE};border-radius:12px;padding:28px 24px;text-align:center;margin:0 0 16px">
            <div style="font-family:${SERIF};font-size:15px;color:${NAVY};margin-bottom:10px;font-weight:700">Sin actividad registrada</div>
            <p style="color:${MUTED};font-size:13px;line-height:1.7;margin:0">No se registraron ingresos ni salidas de personal<br>en los alojamientos asignados durante este período.</p>
          </div>`}
    </div>
    ${mailFooter()}`
  const pre = `${data.checkins.length} check-in · ${data.checkouts.length} check-out — ${data.periodLabel}`
  return shell({ modulo: MODULO_HOTEL, cliente: data.cliente, lugar: data.scopeText }, pre, body)
}

// Cuerpo de presentación para el reporte completo (el detalle va en el PDF adjunto).
function renderIntroHtml(data: DigestData): string {
  const body = `
    ${reportTitle(`Reporte ${data.periodWord}`, data.periodLabel)}
    <div style="padding:22px 36px 0">
      <p style="font-size:15px;color:${INK};line-height:1.65;margin:0 0 20px">
        Adjuntamos el <strong style="color:${NAVY}">reporte completo de ocupación</strong> en PDF: los indicadores del período con su comparación, el desglose por propiedad y por empresa, y el listado íntegro de huéspedes.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;background:${CREAM}"><tr>
        <td style="padding:16px 18px;width:1px;vertical-align:middle">
          <div style="font-family:${SERIF};font-size:11px;font-weight:700;letter-spacing:.1em;color:#ffffff;background:${NAVY};padding:8px 11px;border-radius:7px">PDF</div>
        </td>
        <td style="padding:16px 18px 16px 6px;vertical-align:middle">
          <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED}">Documento adjunto</div>
          <div style="font-family:${SERIF};font-size:15px;color:${NAVY};margin-top:3px">reporte-${slugCliente(data.cliente)}.pdf</div>
        </td>
      </tr></table>
    </div>
    ${mailFooter()}`
  const pre = `Reporte ${data.periodWord} de ocupación — ${data.periodLabel} (PDF adjunto)`
  return shell({ modulo: MODULO_HOTEL, cliente: data.cliente, lugar: data.scopeText }, pre, body, 560)
}

function resend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}
const FROM = process.env.DIGEST_FROM || `${PRODUCTO} <contacto@dotia.cl>`

// Enviar una suscripción concreta (o una prueba con ventana diaria).
// `config: true` marca un error de CONFIGURACIÓN (permanente, ej. el scope
// apunta a una empresa borrada): no tiene sentido reintentarlo ni volver a
// intentarlo mañana — el cron desactiva la suscripción y avisa una sola vez.
export async function sendSubscription(sub: Subscription, opts?: { test?: boolean; ref?: Date }): Promise<{ ok: boolean; reason?: string; config?: boolean }> {
  const r = resend()
  if (!r) return { ok: false, reason: 'Falta RESEND_API_KEY' }

  // Validar que el scope esté completo antes de continuar
  if (sub.scope_type === 'project' && !sub.project_id) return { ok: false, config: true, reason: 'Suscripción de proyecto sin project_id configurado.' }
  if (sub.scope_type === 'company' && !sub.company_id) return { ok: false, config: true, reason: 'Suscripción de empresa sin company_id configurado.' }
  if (sub.scope_type === 'property' && (!sub.property_ids || sub.property_ids.length === 0)) return { ok: false, config: true, reason: 'Suscripción de propiedades sin property_ids configurados.' }

  // Fan-out: una suscripción "cada proyecto" → un correo por proyecto activo.
  if (sub.scope_type === 'each_project') {
    const admin = createAdminClient()
    const { data: projects } = await admin.from('projects').select('id').eq('tenant_id', sub.tenant_id).eq('active', true).order('name')
    if (!projects?.length) return { ok: false, reason: 'No hay proyectos activos' }
    let okAll = true
    let lastReason: string | undefined
    for (const p of projects) {
      const res = await sendSubscription({ ...sub, scope_type: 'project', project_id: p.id }, opts)
      if (!res.ok) { okAll = false; lastReason = res.reason }
    }
    return okAll ? { ok: true } : { ok: false, reason: lastReason }
  }

  const freq = sub.frequency
  const data = await getDigestData(sub, freq, opts?.ref)

  let subject: string
  let html: string
  let attachments: { filename: string; content: Buffer }[] | undefined

  if (sub.report_type === 'full') {
    // Reporte completo → PDF gráfico adjunto + correo de presentación corto.
    const { renderReportPdf } = await import('@/lib/email/report-pdf')
    const pdf = await renderReportPdf(sub, freq, opts?.ref)
    const slug = data.scopeText.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'general'
    const fechaArchivo = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(opts?.ref ?? new Date()).replace(/\//g, '-')
    subject = `dotia · Reporte ${data.periodWord} — ${data.scopeText}`
    html = renderIntroHtml(data)
    attachments = [{ filename: `reporte-${slugCliente(data.cliente)}-${slug}-${fechaArchivo}.pdf`, content: pdf }]
  } else {
    const hasMovements = data.checkins.length > 0 || data.checkouts.length > 0
    subject = hasMovements
      ? `dotia · Movimientos ${data.periodWord} (${data.scopeText}) — ${data.checkins.length} in / ${data.checkouts.length} out`
      : `dotia · Sin actividad ${data.periodWord} (${data.scopeText})`
    html = renderDigestHtml(data)
  }

  const { error } = await r.emails.send({ from: FROM, to: [sub.email], subject, html, attachments })
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

// ── Confiabilidad: reintentos y alertas ───────────────────────────
// Destinatario de las alertas de fallo (configurable; por defecto el dueño).
const ALERT_TO = process.env.ALERT_EMAIL || 'bernardovillablanca@gmail.com'

// Reintenta un envío ante fallos transitorios (hiccup de Resend, timeout, etc.).
// Los errores de configuración NO se reintentan: son permanentes.
async function sendWithRetry(sub: Subscription, opts: { ref?: Date }, attempts = 3): Promise<{ ok: boolean; reason?: string; config?: boolean; tries: number }> {
  let last: { ok: boolean; reason?: string; config?: boolean } = { ok: false, reason: 'sin intentos' }
  for (let i = 1; i <= attempts; i++) {
    try {
      last = await sendSubscription(sub, opts)
    } catch (e: any) {
      last = { ok: false, reason: e?.message || String(e) }
    }
    if (last.ok || last.config) return { ...last, tries: i }
    if (i < attempts) await new Promise(r => setTimeout(r, 1500 * i))
  }
  return { ...last, tries: attempts }
}

// Avisa por correo al dueño cuando algo falla (no rompe el flujo si falla el aviso).
async function sendAlert(subject: string, lines: string[]): Promise<void> {
  const r = resend()
  if (!r) return
  const body = `
    ${reportTitle('Alerta del sistema de correos', fmtDate(new Date()))}
    <div style="padding:22px 36px 0">
      <p style="font-size:15px;color:${INK};line-height:1.6;margin:0 0 16px">Se detectó un problema en el envío automático de resúmenes:</p>
      <div style="border:1px solid ${LINE};border-left:2px solid ${PALETA.salida};border-radius:8px;padding:14px 18px;background:${PALETA.salidaTinte}">
        ${lines.map(l => `<div style="font-size:13px;color:${INK};margin:3px 0;font-family:Consolas,monospace">${l}</div>`).join('')}
      </div>
    </div>
    ${mailFooter()}`
  try {
    // La alerta es interna (va al dueño del sistema), así que el membrete lleva
    // el producto y no un cliente: no es el reporte de nadie.
    await r.emails.send({ from: FROM, to: [ALERT_TO], subject: `⚠️ ${PRODUCTO.toLowerCase()} · ${subject}`, html: shell({ cliente: PRODUCTO, lugar: 'Alerta del sistema' }, subject, body, 560) })
  } catch { /* el aviso es best-effort */ }
}

// Recorre las suscripciones activas y envía las que "tocan" hoy (Chile).
// El plan Hobby solo permite UN cron diario, así que no filtramos por hora:
// a la corrida diaria salen todas las suscripciones cuyo día corresponde.
// (El campo send_hour queda para cuando se pase a Pro con cron horario.)
// Cada corrida queda registrada en `digest_runs` y, si hay fallos, se avisa por correo.
export async function runDueSubscriptions(ref = new Date()): Promise<{ checked: number; sent: number; failed: number; details: any[]; error?: string }> {
  const admin = createAdminClient()
  try {
    const { data: subs } = await admin.from('report_subscriptions').select('*').eq('active', true)

    const D = +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit' }).format(ref)
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(ref)
    const W = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[wd]

    const details: any[] = []
    let sent = 0, failed = 0
    for (const s of (subs ?? []) as Subscription[]) {
      if (s.frequency === 'weekly' && !(s.weekdays ?? []).includes(W)) continue
      if (s.frequency === 'monthly' && s.monthday !== D) continue
      if (s.last_sent_at && ref.getTime() - new Date(s.last_sent_at).getTime() < 12 * 3600 * 1000) continue

      const res = await sendWithRetry(s, { ref })
      if (res.ok) {
        sent++
        await admin.from('report_subscriptions').update({ last_sent_at: ref.toISOString() }).eq('id', s.id)
      } else {
        failed++
        // Configuración rota (ej. su empresa fue borrada): desactivar para no
        // alertar todos los días por algo que no va a sanar solo.
        if (res.config) {
          await admin.from('report_subscriptions').update({ active: false }).eq('id', s.id)
          res.reason = `${res.reason} La suscripción quedó DESACTIVADA: revísala en Reportes.`
        }
      }
      details.push({ id: s.id, email: s.email, ok: res.ok, reason: res.reason, tries: res.tries })
    }

    await admin.from('digest_runs').insert({ checked: subs?.length ?? 0, sent, failed, ok: failed === 0, details })

    if (failed > 0) {
      const fails = details.filter(d => !d.ok)
      await sendAlert(`${failed} envío(s) fallaron en el resumen diario`,
        fails.map(d => `• ${d.email}: ${d.reason ?? 'error desconocido'} (tras ${d.tries} intentos)`))
    }

    return { checked: subs?.length ?? 0, sent, failed, details }
  } catch (e: any) {
    // Fallo total de la corrida: registrar y avisar, sin tumbar el endpoint.
    const msg = e?.message || String(e)
    try { await admin.from('digest_runs').insert({ checked: 0, sent: 0, failed: 0, ok: false, error: msg }) } catch { /* noop */ }
    await sendAlert('El cron del resumen diario FALLÓ por completo', [msg])
    return { checked: 0, sent: 0, failed: 0, details: [], error: msg }
  }
}
