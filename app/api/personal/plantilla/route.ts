import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { PALETA } from '@/lib/marca'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Era 'FF0A2C4A', el azul marino de Sol Eterno. ARGB = opacidad + hex sin '#'.
const NAVY = 'FF' + PALETA.marca.replace('#', '').toUpperCase()

export async function GET() {
  // Guarda de rol admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })
  const { data: prof } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'admin') return new Response('No autorizado', { status: 403 })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Dotia'
  wb.created = new Date()

  const ws = wb.addWorksheet('Personal')
  const cols = ['RUT', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Oficio', 'Teléfono', 'Nacionalidad']
  const header = ws.getRow(1)
  cols.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { vertical: 'middle' }
  })
  header.height = 20

  // Fila de ejemplo
  ws.getRow(2).values = ['12.345.678-9', 'Juan Andrés', 'Pérez', 'Soto', 'Soldador', '+56 9 1234 5678', 'Chilena']

  ;[16, 18, 18, 18, 16, 18, 14].forEach((w, i) => (ws.getColumn(i + 1).width = w))
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-personal-dotia.xlsx"',
    },
  })
}
