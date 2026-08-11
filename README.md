# Dotia

Trazabilidad de personal en faena. SaaS multi-tenant: cada empresa cliente vive en el mismo
sistema y ve solo sus datos.

El producto son seis módulos activables por empresa —Personal, Transporte, Hotel, Alimentación,
Colaciones y Lavandería— más el estado de pago (EDP) y el lado proveedor.

En producción: **[app.dotia.cl](https://app.dotia.cl)** · sitio del producto:
**[dotia.cl](https://dotia.cl)**

## Stack

- Next.js (App Router) sobre Vercel
- Supabase: Postgres, Auth con `@supabase/ssr`, y **RLS como frontera real entre clientes**
- Resend para el correo saliente

## Levantar el proyecto

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

Variables de entorno: copiar `.env.example` a `.env.local` y completar.

## Por dónde entrar al código

`lib/` concentra la lógica transversal y es el mejor mapa del dominio:

| Archivo | Qué resuelve |
|---|---|
| `lib/rbac.ts` | permisos por rol |
| `lib/tenant.ts` · `lib/super.ts` | aislamiento multi-tenant y super admin |
| `lib/modulos.ts` | qué módulos tiene activos cada empresa |
| `lib/effective-user.ts` | suplantación y vista rápida |
| `lib/marca.ts` | identidad del producto: paleta, membrete, bajada |
| `lib/database.types.ts` | tipos generados desde Supabase |

## Dos cosas que muerden

- **El aislamiento entre clientes no está en el código de la aplicación, está en las políticas RLS
  de la base de datos.** Una consulta que "funciona" puede estar filtrando datos de otro cliente:
  verificar contra las políticas, no contra el resultado en pantalla.
- **La versión de Next.js instalada tiene cambios incompatibles con lo que un modelo de IA trae de
  memoria.** Antes de escribir código de Next acá, consultar `node_modules/next/dist/docs/`.
  Detalle en [`AGENTS.md`](AGENTS.md).

## Esquema de la base

Las migraciones van en `supabase/migrations/`, con nombre por fecha. El esquema se cambia
**agregando una migración nueva**, nunca editando una ya aplicada.
