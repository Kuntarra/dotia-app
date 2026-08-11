import { createClient } from '@/lib/supabase/server'
import { formatRut } from '@/lib/rut'
import { notFound } from 'next/navigation'
import { AutoPrint } from './_auto-print'
import { PRODUCTO, PALETA, getMarcaCliente } from '@/lib/marca'
import { MODULOS } from '@/lib/modulos'

const MODULO_LAVANDERIA = MODULOS.find(m => m.k === 'lavanderia')!.label

const N = PALETA.marca, A = PALETA.senal, G = PALETA.gris600

function fmt(d: string | null | undefined) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
}

interface Props { params: Promise<{ id: string }> }

export default async function BoletaLavanderiaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const cliente = (await getMarcaCliente()).nombre

  const { data: bolsa } = await supabase
    .from('lavanderia_bolsas')
    .select('id, dotacion_id, fecha_entrega, fecha_siguiente_rotacion, created_at, personas(nombres, apellido_paterno, apellido_materno, tipo_documento, numero_documento, telefono), lavanderia_planillas(nombre), lavanderia_bolsa_items(nombre, cantidad)')
    .eq('id', id)
    .maybeSingle()
  if (!bolsa) notFound()

  const { data: stay } = bolsa.dotacion_id
    ? await supabase
        .from('stays')
        .select('rooms(number, properties(name))')
        .eq('dotacion_id', bolsa.dotacion_id)
        .is('checked_out_at', null)
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const p = bolsa.personas as { nombres: string; apellido_paterno: string; apellido_materno: string | null; tipo_documento: string | null; numero_documento: string; telefono: string | null } | null
  const planilla = bolsa.lavanderia_planillas as { nombre: string } | null
  const items = ((bolsa.lavanderia_bolsa_items as { nombre: string; cantidad: number }[]) ?? [])
  const room = stay?.rooms as { number: string; properties: { name: string } | null } | null
  const nombre = p ? [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ') : '—'
  const doc = p ? (p.tipo_documento === 'pasaporte' ? p.numero_documento : formatRut(p.numero_documento)) : '—'
  const total = items.reduce((a, it) => a + (it.cantidad || 0), 0)
  const entrega = bolsa.fecha_entrega ?? (bolsa.created_at ? bolsa.created_at.slice(0, 10) : null)
  const hoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{font-family:Arial,Helvetica,sans-serif;color:${PALETA.gris900};background:#fff}
    .sheet{width:100%}
    .copia{padding:6mm 8mm;height:139mm;overflow:hidden;page-break-inside:avoid;break-inside:avoid;display:flex;flex-direction:column}
    .copia--top{border-bottom:1px dashed ${PALETA.gris500}}
    table{border-collapse:collapse;width:100%}
    th,td{text-align:left;padding:3px 8px;font-size:11px}
    thead th{background:${PALETA.gris100};font-size:9px;font-weight:700;color:${G};text-transform:uppercase;letter-spacing:.04em}
    tbody tr{border-bottom:1px solid ${PALETA.gris100}}
    tfoot td{background:${PALETA.gris100};font-weight:700}
    .fl{font-size:8px;color:${G};text-transform:uppercase;letter-spacing:.04em;font-weight:700}
    .fv{font-size:11px;color:${N};font-weight:600}
    @page{size:letter portrait;margin:0}
    @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `

  const dosCols = items.length > 8
  const mid = Math.ceil(items.length / 2)
  const colA = dosCols ? items.slice(0, mid) : items
  const colB = dosCols ? items.slice(mid) : []

  const ColTabla = ({ rows }: { rows: typeof items }) => (
    <div style={{ border: `1px solid ${PALETA.gris200}`, borderRadius: 7, overflow: 'hidden' }}>
      <table>
        <thead><tr><th>Ítem</th><th style={{ textAlign: 'right' }}>Cant.</th></tr></thead>
        <tbody>
          {rows.map((it, i) => (
            <tr key={i}><td style={{ fontWeight: 600, color: N }}>{it.nombre}</td><td style={{ textAlign: 'right', fontWeight: 700, color: N }}>{it.cantidad}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const Boleta = ({ label, top }: { label: string; top?: boolean }) => (
    <div className={`copia${top ? ' copia--top' : ''}`}>
      {/* Header */}
      <div style={{ background: N, color: '#fff', padding: '8px 14px', borderRadius: 7, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{PRODUCTO} · {MODULO_LAVANDERIA} · {cliente}</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{planilla?.nombre ?? 'Bolsa de ropa'}</div>
        </div>
        <span style={{ background: A, color: N, fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{label}</span>
      </div>

      {/* Persona */}
      <div style={{ border: `1px solid ${PALETA.gris200}`, borderRadius: 7, padding: '8px 12px', marginBottom: 7 }}>
        <div style={{ marginBottom: 6 }}><span className="fl">Nombre</span><div className="fv" style={{ fontSize: 13 }}>{nombre}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div><span className="fl">RUT / Doc.</span><div className="fv" style={{ fontFamily: 'monospace' }}>{doc}</div></div>
          <div><span className="fl">Teléfono</span><div className="fv">{p?.telefono || '—'}</div></div>
          <div><span className="fl">Propiedad</span><div className="fv">{room?.properties?.name ?? '—'}</div></div>
          <div><span className="fl">Habitación</span><div className="fv">{room?.number ?? '—'}</div></div>
        </div>
      </div>

      {/* Fechas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 7, marginBottom: 7 }}>
        <div style={{ border: `1px solid ${PALETA.gris200}`, borderRadius: 7, padding: '7px 11px' }}>
          <span className="fl">Fecha de entrega</span><div className="fv" style={{ fontSize: 12 }}>{fmt(entrega)}</div>
        </div>
        <div style={{ border: `1px solid ${A}`, background: '#fffaf0', borderRadius: 7, padding: '7px 11px' }}>
          <span className="fl" style={{ color: '#9a6b14' }}>Siguiente rotación · confirmar con huésped</span>
          <div className="fv" style={{ fontSize: 12 }}>{fmt(bolsa.fecha_siguiente_rotacion)}</div>
          <div style={{ fontSize: 8, color: G, marginTop: 1 }}>Ante cambios, el huésped debe avisar con antelación.</div>
        </div>
      </div>

      {/* Contenido (2 columnas si hay muchos ítems, para cuadrar en media hoja) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: dosCols ? '1fr 1fr' : '1fr', gap: 8, flex: 1, alignContent: 'start' }}>
          <ColTabla rows={colA} />
          {dosCols && <ColTabla rows={colB} />}
        </div>
        <div style={{ background: PALETA.gris100, fontWeight: 700, fontSize: 11, color: N, padding: '5px 12px', borderRadius: 6, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</span>
          <span>Total de prendas: {total}</span>
        </div>
      </div>

      {/* Firmas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 10 }}>
        {['Entrega (recepción)', 'Recibe conforme (huésped)'].map((l) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ borderTop: `1px solid ${PALETA.gris500}`, paddingTop: 3, fontSize: 9, color: G }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="sheet">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <AutoPrint />
      <Boleta label="Para ingresar a la bolsa" top />
      <Boleta label="Recepción" />
    </div>
  )
}
