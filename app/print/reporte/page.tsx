import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { formatDate as fmt } from "@/lib/format"
import { ROOM_TYPE_LABELS } from "@/lib/types"
import { AutoPrint } from './_auto-print'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const N = '#0B7E60', A = '#2FBF8F', G = '#6C757D'

export default async function ReportePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?:string; anio?:string; empresa?:string; propiedad?:string; periodo?:string }>
}) {
  const params          = await searchParams
  const now             = new Date()
  const periodo         = params.periodo   ?? 'mensual'
  const anio            = parseInt(params.anio ?? String(now.getFullYear()))
  const mes             = parseInt(params.mes  ?? String(now.getMonth() + 1))
  const filtroEmpresa   = params.empresa   ?? 'todas'
  const filtroPropiedad = params.propiedad ?? 'todas'

  let desdeStr: string, hastaStr: string, diasPeriodo: number, tituloPeriodo: string
  if (periodo === 'mensual') {
    const dias = new Date(anio, mes, 0).getDate()
    desdeStr = `${anio}-${String(mes).padStart(2,'0')}-01`
    hastaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
    diasPeriodo = dias; tituloPeriodo = `${MONTHS[mes-1]} ${anio}`
  } else if (periodo === 'anual') {
    desdeStr = `${anio}-01-01`; hastaStr = `${anio}-12-31`
    diasPeriodo = 365; tituloPeriodo = `Año ${anio}`
  } else {
    desdeStr = '2020-01-01'; hastaStr = `${now.getFullYear()}-12-31`
    diasPeriodo = Math.ceil((new Date(hastaStr).getTime() - new Date(desdeStr).getTime()) / 86400000)
    tituloPeriodo = 'Todo el tiempo'
  }

  const periodoInicio = new Date(desdeStr + 'T00:00:00')
  const periodoFin    = new Date(hastaStr + 'T23:59:59')

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const [{ data: staysRaw }, { data: allocsRaw }] = await Promise.all([
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name)),
      companies(id, name)
    `).eq('tenant_id', tenantId).lte('checked_in_at', hastaStr + 'T23:59:59').order('checked_in_at', { ascending: true }),
    admin.from('allocations').select(`room_id, company_id, rooms(id, capacity, properties(id, name)), companies(id, name)`).eq('tenant_id', tenantId),
  ])

  let stays = (staysRaw ?? []).filter(s => { const co = s.checked_out_at ? new Date(s.checked_out_at) : null; return !co || co >= periodoInicio })
  let allocs = allocsRaw ?? []
  if (filtroEmpresa   !== 'todas') { stays = stays.filter(s => (s.companies as any)?.id === filtroEmpresa); allocs = allocs.filter(a => (a.companies as any)?.id === filtroEmpresa) }
  if (filtroPropiedad !== 'todas') { stays = stays.filter(s => (s.rooms as any)?.properties?.id === filtroPropiedad); allocs = allocs.filter(a => (a.rooms as any)?.properties?.id === filtroPropiedad) }

  function noches(s: typeof stays[0]) {
    const ini = Math.max(new Date(s.checked_in_at).getTime(), periodoInicio.getTime())
    const fin = Math.min((s.checked_out_at ? new Date(s.checked_out_at) : periodoFin).getTime(), periodoFin.getTime())
    return Math.max(0, Math.round((fin - ini) / 86400000))
  }

  const nochesH = stays.reduce((a,s) => a + noches(s), 0)
  const habMap  = new Map<string,number>()
  for (const a of allocs) { const r = a.rooms as any; if (r?.id) habMap.set(r.id, r.capacity ?? 1) }
  const camasDisp  = [...habMap.values()].reduce((a,c) => a+c, 0)
  const camasNoche = camasDisp * diasPeriodo
  const camasLibres = Math.max(0, camasNoche - nochesH)
  const ocupPct    = camasNoche > 0 ? Math.round((nochesH / camasNoche) * 100) : 0

  const propMap = new Map<string,{nombre:string;camasNoche:number;usado:number;estadias:number}>()
  for (const a of allocs) {
    const r = a.rooms as any, p = r?.properties
    if (!p?.id) continue
    if (!propMap.has(p.id)) propMap.set(p.id, { nombre: p.name, camasNoche: 0, usado: 0, estadias: 0 })
    propMap.get(p.id)!.camasNoche += (r.capacity ?? 1) * diasPeriodo
  }
  for (const s of stays) {
    const pid = (s.rooms as any)?.properties?.id
    if (pid && propMap.has(pid)) { propMap.get(pid)!.usado += noches(s); propMap.get(pid)!.estadias++ }
  }
  const porPropiedad = [...propMap.values()].map(p => ({ ...p, pct: p.camasNoche > 0 ? Math.round((p.usado/p.camasNoche)*100) : 0 })).sort((a,b)=>b.pct-a.pct)

  const empMap = new Map<string,{nombre:string;estadias:number;noches:number}>()
  for (const s of stays) {
    const c = s.companies as any; if (!c?.id) continue
    if (!empMap.has(c.id)) empMap.set(c.id, { nombre: c.name, estadias: 0, noches: 0 })
    empMap.get(c.id)!.estadias++; empMap.get(c.id)!.noches += noches(s)
  }
  const porEmpresa = [...empMap.values()].sort((a,b)=>b.noches-a.noches)

  const hoy = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#212529;background:#fff;padding:20px}
    table{border-collapse:collapse;width:100%}
    th,td{text-align:left;padding:5px 9px}
    thead th{background:#f1f3f5;font-size:10px;font-weight:700;color:#6C757D;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #dee2e6}
    tbody tr{border-bottom:1px solid #f1f3f5}
    tfoot td{background:#f1f3f5;font-weight:700;border-top:2px solid #dee2e6}
    .badge-ok{background:#d1fae5;color:#065f46;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:600}
    .badge-done{background:#f1f3f5;color:#6C757D;padding:1px 7px;border-radius:20px;font-size:10px}
    @page{size:letter portrait;margin:1.5cm}
    @media print{body{padding:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <AutoPrint />

      {/* Header */}
      <div style={{background:N,color:'#fff',padding:'14px 20px',borderRadius:8,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.5)',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:3}}>Reporte de Ocupación — Sol Eterno</div>
          <div style={{fontSize:24,fontWeight:700}}>{tituloPeriodo}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:2}}>{diasPeriodo} días · {porPropiedad.length} propiedad{porPropiedad.length!==1?'es':''} · Generado el {hoy}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:40,fontWeight:700,color:A,lineHeight:1}}>{ocupPct}%</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.6)'}}>Ocupación del período</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[
          {label:'Noches-huésped',   value:nochesH.toLocaleString('es-CL'),      sub:`Suma de noches de todos los huéspedes`, color:N},
          {label:'Camas-noche disp.',value:camasNoche.toLocaleString('es-CL'),    sub:`${camasDisp} camas × ${diasPeriodo} días`, color:A},
          {label:'Camas-noche libres',value:camasLibres.toLocaleString('es-CL'),  sub:`${100-ocupPct}% sin ocupar`, color:G},
          {label:'Estadías totales', value:stays.length.toString(),               sub:`${stays.filter(s=>!s.checked_out_at).length} activas al cierre`, color:A},
        ].map(k=>(
          <div key={k.label} style={{border:'1px solid #e9ecef',borderTop:`4px solid ${k.color}`,borderRadius:8,padding:'10px 13px'}}>
            <div style={{fontSize:20,fontWeight:700,color:N}}>{k.value}</div>
            <div style={{fontSize:11,fontWeight:600,marginTop:2}}>{k.label}</div>
            <div style={{fontSize:10,color:G,marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        {/* Por propiedad */}
        <div style={{border:'1px solid #e9ecef',borderRadius:8,overflow:'hidden'}}>
          <div style={{background:N,color:'#fff',padding:'7px 12px',fontSize:11,fontWeight:700}}>Ocupación por propiedad</div>
          <div style={{padding:'10px 14px'}}>
            {porPropiedad.map(p=>(
              <div key={p.nombre} style={{marginBottom:9}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontWeight:600,color:N}}>{p.nombre}</span>
                  <span style={{color:G}}>{p.estadias} estadías · {p.usado}/{p.camasNoche} <strong style={{color:p.pct>=70?N:A}}>{p.pct}%</strong></span>
                </div>
                <div style={{height:7,background:'#e9ecef',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${p.pct}%`,background:p.pct>=70?N:A,borderRadius:4}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Por empresa */}
        <div style={{border:'1px solid #e9ecef',borderRadius:8,overflow:'hidden'}}>
          <div style={{background:N,color:'#fff',padding:'7px 12px',fontSize:11,fontWeight:700}}>Resumen por empresa</div>
          <table>
            <thead><tr><th>Empresa</th><th style={{textAlign:'right'}}>Estadías</th><th style={{textAlign:'right'}}>Noches</th><th style={{textAlign:'right'}}>%</th></tr></thead>
            <tbody>
              {porEmpresa.map(e=>(
                <tr key={e.nombre}>
                  <td style={{fontWeight:600,color:N}}>{e.nombre}</td>
                  <td style={{textAlign:'right'}}>{e.estadias}</td>
                  <td style={{textAlign:'right',fontWeight:700,color:N}}>{e.noches}</td>
                  <td style={{textAlign:'right',color:G}}>{nochesH>0?Math.round(e.noches/nochesH*100):0}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td style={{textAlign:'right'}}>{stays.length}</td><td style={{textAlign:'right',color:N}}>{nochesH}</td><td/></tr></tfoot>
          </table>
        </div>
      </div>

      {/* Listado */}
      <div style={{border:'1px solid #e9ecef',borderRadius:8,overflow:'hidden'}}>
        <div style={{background:N,color:'#fff',padding:'7px 12px',fontSize:11,fontWeight:700}}>Listado completo de huéspedes — {stays.length} registros</div>
        <table>
          <thead>
            <tr>{['#','Huésped','RUT','Empresa','Propiedad','Hab.','Tipo','Turno','Entrada','Salida','Noches','Estado'].map(h=>(
              <th key={h} style={{textAlign:h==='Noches'?'right':'left'}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {stays.map((s,i)=>{
              const g=s.guests as any, r=s.rooms as any, c=s.companies as any, n=noches(s)
              return (
                <tr key={s.id}>
                  <td style={{color:G,fontSize:10}}>{i+1}</td>
                  <td style={{fontWeight:600,color:N,whiteSpace:'nowrap'}}>{g?.first_name} {g?.last_name_paterno}</td>
                  <td style={{color:G,fontFamily:'monospace',fontSize:10}}>{g?.rut??'—'}</td>
                  <td>{c?.name}</td>
                  <td style={{fontWeight:600}}>{r?.properties?.name}</td>
                  <td>{r?.number}</td>
                  <td style={{color:G}}>{r?.type?ROOM_TYPE_LABELS[r.type]??r.type:'—'}</td>
                  <td style={{color:G}}>{s.shift_type??'—'}</td>
                  <td style={{whiteSpace:'nowrap'}}>{fmt(s.checked_in_at)}</td>
                  <td style={{whiteSpace:'nowrap'}}>{s.checked_out_at?fmt(s.checked_out_at):'—'}</td>
                  <td style={{textAlign:'right',fontWeight:700,color:N}}>{n}</td>
                  <td>{s.checked_out_at?<span className="badge-done">Completada</span>:<span className="badge-ok">Activa</span>}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr><td colSpan={10}>Total</td><td style={{textAlign:'right'}}>{nochesH}</td><td/></tr></tfoot>
        </table>
      </div>

      <div style={{textAlign:'center',marginTop:12,fontSize:10,color:'#adb5bd'}}>Sol Eterno — Gestión de Alojamientos · {hoy}</div>
    </>
  )
}
