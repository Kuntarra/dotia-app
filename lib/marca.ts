import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'
import { getMyTenantId } from './tenant'

// Fuente única de identidad para TODO lo que sale del sistema hacia el cliente:
// correos, PDF, Excel, CSV, boletas y vistas imprimibles.
//
// Antes cada documento escribía "Sol Eterno" a mano. Sol Eterno es el PRIMER
// CLIENTE, no el producto: un segundo cliente descargaba un PDF con el nombre
// de otra empresa en la portada. La regla es separar tres cosas:
//
//   de quién es la operación  → el nombre del cliente, leído de `tenants`
//   qué hace el sistema       → PRODUCTO_BAJADA
//   qué sistema lo generó     → PRODUCTO
//
// La app ya tenía la infraestructura (tenants.name/logo_url/primary_color y la
// pantalla Configuración → Marca); los documentos simplemente no la usaban.

export const PRODUCTO = 'Dotia'

// La bajada vieja decía "Gestión de Alojamientos", que describe UNO de los
// módulos (hay Transporte, Alojamiento, Alimentación, Colaciones y Lavandería,
// más Turnos, Cuadrillas y Puntos): le contaba al lector una fracción del
// producto. Esta es la misma bajada que usan dotia.cl y el título de la app.
export const PRODUCTO_BAJADA = 'Trazabilidad de personal en faena'

// Del cliente, los documentos solo toman el NOMBRE.
//
// Decisión del dueño (2026-08-09): los reportes llevan siempre la identidad de
// Dotia y el cliente aparece únicamente como nombre. La alternativa era vestir
// cada reporte con el logo y los colores del cliente, y se descartó: obligaría
// a cada empresa a configurar su marca antes de poder descargar algo presentable,
// y un cliente que no lo hiciera recibiría un documento roto. `tenants` sí tiene
// `logo_url` y `primary_color` — los usa la barra lateral de la app, que es su
// lugar: ahí el cliente está *dentro de su cuenta*, no leyendo un documento
// generado por el sistema.
export type MarcaCliente = { nombre: string }

// Si no se puede resolver el cliente, el documento sale a nombre del producto.
// Nunca a nombre de otro cliente, que es justamente el defecto que se corrige.
const SIN_CLIENTE: MarcaCliente = { nombre: PRODUCTO }

function aMarca(row: { name: string } | null): MarcaCliente {
  return row?.name ? { nombre: row.name } : SIN_CLIENTE
}

// Marca del cliente del usuario autenticado. Para páginas y Server Actions.
export async function getMarcaCliente(): Promise<MarcaCliente> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', await getMyTenantId())
      .maybeSingle()
    return aMarca(data)
  } catch {
    return SIN_CLIENTE
  }
}

// Marca de un cliente puntual. La usan el cron y los envíos programados, que
// corren sin sesión: ahí el tenant viene de la suscripción, no del usuario.
export async function getMarcaClientePorId(tenantId: string | null | undefined): Promise<MarcaCliente> {
  if (!tenantId) return SIN_CLIENTE
  try {
    const { data } = await createAdminClient()
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .maybeSingle()
    return aMarca(data)
  } catch {
    return SIN_CLIENTE
  }
}

// Los cuatro niveles de identidad que lleva todo documento del sistema, del
// más general al más específico. Antes había uno solo ("SOL ETERNO") haciendo
// de las cuatro cosas a la vez, que es por qué se leía mal:
//
//   producto  Dotia          el sistema que lo generó
//   modulo    Hotel          de qué negocio habla el documento
//   cliente   Sol Eterno     de quién es la operación
//   lugar     Hotel Vivar 2  a qué punto o alcance se refiere
export type Membrete = {
  modulo?: string | null
  cliente: string
  lugar?: string | null
}

// Paleta de Dotia, en un solo lugar para que correos, PDF, Excel y boletas
// salgan del mismo sistema. Son los tokens de dotia.cl y de la app.
//
// Los correos venían en azul marino y dorado, que es la identidad de SOL
// ETERNO: el documento decía Dotia pero estaba vestido con la ropa del primer
// cliente. La app ya se había reskineado a verde (globales.css reapunta
// `--brand` a #0B7E60) y el correo se quedó atrás.
export const PALETA = {
  marca:         '#0B7E60', // verde mineral, color principal
  marcaProfunda: '#0A5B45', // fondo del membrete
  senal:         '#2FBF8F', // acento claro, legible sobre verde profundo
  salida:        '#B5480F', // terracota: el contrapunto para "sale" frente a "entra"
  salidaTinte:   '#FDF4EF', // el mismo terracota rebajado, para fondos de aviso
  tinta:         '#1B211D',
  suave:         '#5B625A',
  tenue:         '#6B7269',
  filete:        '#E2E0D6',
  tinte:         '#F0F7F3', // fondo suave de tarjetas
  lienzo:        '#FAF9F5', // fondo de página

  // Escala neutra para tablas de documentos. Faltaba, y por eso cada PDF traía
  // sus propios grises sueltos (#6C757D, #212529, #e9ecef, #f1f3f5, #dee2e6,
  // #adb5bd): seis tonos fríos del Bootstrap por defecto, ajenos al crema
  // cálido del resto. Estos son los de `globals.css`, la misma escala que ya
  // usa la app en pantalla.
  gris900:       '#1B211D', // texto fuerte de tabla
  gris700:       '#4A4E52', // texto de cuerpo
  gris600:       '#6E6E68', // encabezados de columna
  gris500:       '#A8A89F', // texto de pie, muy secundario
  gris300:       '#DBD5C9', // bordes marcados
  gris200:       '#E8E3D9', // filete de tabla
  gris100:       '#F5F2EC', // fondo de encabezado y totales
  gris50:        '#FBFAF6', // franjas alternas
} as const

// Pie de documento: quién lo generó y cuándo. Va en correos, PDF e impresos.
export function pieGenerado(fecha: string): string {
  return `Generado por ${PRODUCTO} · ${fecha}`
}

// Trozo de nombre de archivo derivado del cliente, para que dos clientes no
// descarguen archivos con el mismo nombre ni con el nombre de un tercero.
export function slugCliente(nombre: string): string {
  return nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cliente'
}
