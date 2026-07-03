import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/terminos', '/privacidad']

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  receptionist: '/recepcion',
  client: '/alojamiento',
  // Sub-usuario asignado directo a un módulo: aterriza en /admin, que ya lo
  // redirige a su módulo (redirigirSubusuario en admin/page.tsx). Sin esta
  // entrada caía al fallback '/alojamiento', que lo rebotaba a /login por no
  // ser 'client' -> loop infinito de redirects.
  modulo: '/admin',
}

export async function proxy(request: NextRequest) {
  // Las rutas de cron se autentican con su propio Bearer (CRON_SECRET).
  // No deben pasar por el guardia de sesión: el cron llega sin cookies y
  // sería redirigido a /login (307), por lo que el envío nunca se ejecuta.
  if (request.nextUrl.pathname.startsWith('/api/cron/')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          const sessionOnly = request.cookies.get('se_remember')?.value === '0'
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts =
              sessionOnly && name.startsWith('sb-')
                ? { ...options, maxAge: undefined, expires: undefined }
                : options
            supabaseResponse.cookies.set(name, value, opts)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'client'
    const home = ROLE_HOME[role] ?? '/alojamiento'

    const url = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
