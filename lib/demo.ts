// Switch rápido de vistas: cuentas creadas SOLO para que el super admin
// (Bernardo) previsualice cómo se ve la app como Mandante o como Proveedor,
// en distintos niveles de permiso, sin manejar contraseñas de personal real.
// Viven en tenants reales (Sol Eterno = Mandante; un tenant Proveedor propio),
// marcadas con user_profiles.es_cuenta_switch = true — eso es lo que las
// distingue de personal real, NO el tenant al que pertenecen.
export const DEMO_PASSWORD = 'DemoDotia2026!'

export const SWITCH_TENANTS = {
  mandante: '10000000-0000-0000-0000-000000000001', // Sol Eterno (tenant real)
  proveedor: 'ee100000-0000-0000-0000-000000000001', // Proveedor Faena SpA
} as const

export type DemoNivel = 'admin_modulo' | 'actuador' | 'visor'

export type DemoUserDef = {
  email: string
  fullName: string
  group: 'Mandante' | 'Proveedor'
  label: string
  role: 'admin' | 'modulo'
  tenantId: string
  modulos?: { modulo: string; nivel: DemoNivel }[]
}

// Matriz de las 8 vistas (4 niveles x Mandante/Proveedor). Los sub-usuarios
// (role 'modulo') llevan sus permisos por módulo; el alcance (todo el
// proyecto vs solo el módulo) lo decide tenant.tipo en runtime.
export const DEMO_USERS: DemoUserDef[] = [
  // ── Mandante (Sol Eterno) ──
  { email: 'switch-mandante-admin@soleterno.cl',      fullName: 'Mandante · Admin',           group: 'Mandante', label: 'Admin',                role: 'admin',  tenantId: SWITCH_TENANTS.mandante },
  { email: 'switch-mandante-supervisor@soleterno.cl', fullName: 'Mandante · Supervisor',      group: 'Mandante', label: 'Supervisor de módulo', role: 'modulo', tenantId: SWITCH_TENANTS.mandante, modulos: [{ modulo: 'hotel', nivel: 'admin_modulo' }, { modulo: 'transporte', nivel: 'admin_modulo' }] },
  { email: 'switch-mandante-revisor@soleterno.cl',    fullName: 'Mandante · Revisor',         group: 'Mandante', label: 'Revisor',              role: 'modulo', tenantId: SWITCH_TENANTS.mandante, modulos: [{ modulo: 'hotel', nivel: 'actuador' }, { modulo: 'transporte', nivel: 'actuador' }] },
  { email: 'switch-mandante-visor@soleterno.cl',      fullName: 'Mandante · Visualizador',    group: 'Mandante', label: 'Visualizador',         role: 'modulo', tenantId: SWITCH_TENANTS.mandante, modulos: [{ modulo: 'hotel', nivel: 'visor' }, { modulo: 'transporte', nivel: 'visor' }] },
  // ── Proveedor (Proveedor Faena SpA) ──
  { email: 'switch-proveedor-admin@soleterno.cl',      fullName: 'Proveedor · Admin',          group: 'Proveedor', label: 'Admin',                role: 'admin',  tenantId: SWITCH_TENANTS.proveedor },
  { email: 'switch-proveedor-supervisor@soleterno.cl', fullName: 'Proveedor · Supervisor',     group: 'Proveedor', label: 'Supervisor de módulo', role: 'modulo', tenantId: SWITCH_TENANTS.proveedor, modulos: [{ modulo: 'transporte', nivel: 'admin_modulo' }] },
  { email: 'switch-proveedor-revisor@soleterno.cl',    fullName: 'Proveedor · Revisor',        group: 'Proveedor', label: 'Revisor',              role: 'modulo', tenantId: SWITCH_TENANTS.proveedor, modulos: [{ modulo: 'transporte', nivel: 'actuador' }] },
  { email: 'switch-proveedor-visor@soleterno.cl',      fullName: 'Proveedor · Visualizador',   group: 'Proveedor', label: 'Visualizador',         role: 'modulo', tenantId: SWITCH_TENANTS.proveedor, modulos: [{ modulo: 'transporte', nivel: 'visor' }] },
]
