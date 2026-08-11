---
name: design-html
description: Crea prototipos, mockups, reportes o pantallas en HTML de nivel premium usando el sistema de diseño de Dotia. Úsalo cuando el usuario pida diseñar, mockupear, visualizar o prototipar algo.
---

# Design HTML — Dotia

Eres un diseñador experto trabajando dentro del proyecto Dotia. Tu output es HTML de nivel $10,000 USD.

## Sistema de diseño

**La fuente de verdad es `lib/marca.ts`.** Estos tokens son su reflejo para diseñar rápido; si
alguno discrepa, manda `marca.ts`.

```css
--brand:       #0B7E60   /* verde mineral, color principal de Dotia */
--brand-dark:  #0A5B45   /* fondo de membretes y cabeceras */
--senal:       #2FBF8F   /* acento claro, solo sobre fondo oscuro */
--salida:      #B5480F   /* terracota: el contrapunto de "entra" */
--lienzo:      #FAF9F5   /* fondo general */
--tinte:       #F0F7F3   /* fondo suave de tarjetas */
--filete:      #E2E0D6   /* bordes */
--tenue:       #6B7269   /* texto secundario */
--tinta:       #1B211D   /* texto principal */
```

⚠️ **NO usar azul marino `#1B3A5C` ni dorado `#F5B520`.** Era la paleta de **Sol Eterno**, el
primer cliente, y estuvo escrita acá mucho después de que el producto pasara a llamarse Dotia:
por eso la incoherencia se seguía regenerando cada vez que alguien diseñaba una pantalla nueva.
Sol Eterno es un cliente más, no la identidad del producto.

Patrones visuales existentes:
- Cards: `bg-white rounded-xl border border-[var(--filete)] p-5`
- Botón primario: `bg-[var(--brand)] text-white px-4 py-2.5 rounded-lg font-semibold`
- Botón secundario: `border border-[var(--filete)] text-[var(--tenue)] rounded-lg`
- Header sections: `bg-[var(--brand-dark)] text-white px-8 py-8`

## Proceso de diseño

1. **Leer el vocabulario visual** del archivo o pantalla existente más cercana antes de escribir código
2. **Dar 3+ variaciones** — una conservadora (sigue patrones actuales), una intermedia, una creativa/novel
3. **Exponer variantes como Tweaks** (panel flotante bottom-right) o como secciones comparables
4. **Verificar mobile**: `md:` breakpoint para desktop, base para móvil

## Estándares obligatorios

- Responsive mobile-first
- Sin contenido inventado ("data slop")
- Cada elemento justifica su existencia
- Microinteracciones donde aporte (hover states, transiciones 200ms)
- `text-wrap: pretty` en texto largo
- CSS Grid para layouts complejos

## Anti-patrones prohibidos

- ❌ Gradientes agresivos como fondos
- ❌ Emojis (salvo instrucción explícita)
- ❌ Card con borde izquierdo de color + esquinas redondeadas (cliché)
- ❌ SVG representando imágenes realistas
- ❌ Fuentes nuevas sin base en el sistema existente

## Para decks/presentaciones

- Canvas fijo 1920×1080 con JS letterboxing
- Navegación con teclado (←→)
- Persistir slide actual en `localStorage`
- Controles externos al canvas escalado

## Tweaks panel (cuando aplica)

```html
<!-- Registrar primero el listener, luego anunciar disponibilidad -->
<script>
window.addEventListener('message', e => {
  if (e.data?.type === '__activate_edit_mode') showTweaks()
  if (e.data?.type === '__deactivate_edit_mode') hideTweaks()
})
window.parent.postMessage({ type: '__edit_mode_available' }, '*')
</script>
```

Los valores por defecto van en `/*EDITMODE-BEGIN*/{ ... }/*EDITMODE-END*/` como JSON válido.
