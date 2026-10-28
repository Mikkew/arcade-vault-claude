# MÓVIL · SPEC 01 — Viewport, color de tema, safe-areas y alturas dinámicas

> **Estado:** Draft
> **Depende de:** SPEC 10
> **Fecha:** 2026-10-27
> **Objetivo:** Que todas las páginas declaren un `viewport` explícito con `viewport-fit=cover` y el color de tema del portal, y que las barras y paneles fijos respeten el notch y la barra de gestos usando `env(safe-area-inset-*)` y alturas `dvh`.

---

## Por qué existe este spec

Es la base de los demás specs de `specs/mobile/`. La auditoría móvil de RANARIA (rama `game-ranaria`, auditoría estática del 2026-10-27) encontró que:

- `app/layout.tsx:26-30` solo exporta `metadata`. No hay `export const viewport`, así que Next pone su `<meta name="viewport">` por defecto (`width=device-width, initial-scale=1`) sin `viewport-fit=cover` ni `theme-color`. La barra del navegador en Android sale con el color del sistema, no con el negro del portal (`--bg: #0a0a0f`, `globals.css:24`).
- No hay ni un `env(safe-area-inset-*)` en `app/globals.css`. Hoy no hace falta porque sin `viewport-fit=cover` iOS deja márgenes; en cuanto la PWA use `statusBarStyle: "black-translucent"` (mobile/05) o se active `cover`, el `Nav` fijo (`.av-nav`, `globals.css:139`, `position: sticky`) queda bajo el notch y el panel móvil (`.av-mobile-panel`, `globals.css:206`, `position: fixed`) bajo la barra de gestos.
- No hay ni un `dvh`/`svh`. La única altura de viewport es `.home-hero { min-height: calc(100vh - 60px) }` (`globals.css:1132`), que en móvil cuenta la barra del navegador replegada y deja el hero más alto que la pantalla visible.
- `.modal-bd` (`globals.css:909`) es `position: fixed; inset: 0` sin `overflow-y`; en horizontal (844×390) el modal de FIN DEL JUEGO mide unos 330 px y con la barra del navegador visible sus botones pueden quedar fuera, sin forma de desplazarlos.

---

## Alcance

**Dentro:**

- `export const viewport: Viewport` en `app/layout.tsx` con `width: "device-width"`, `initialScale: 1`, `viewportFit: "cover"`, `themeColor: "#0a0a0f"` y `colorScheme: "dark"`.
- Safe-areas en `.av-nav` (arriba, izquierda y derecha), `.av-mobile-panel` (arriba, abajo y derecha), `.av-main`/`Footer` (abajo, izquierda y derecha), `.modal-bd` (las cuatro) y `.touch-pad` (izquierda y derecha, para el horizontal con notch lateral).
- `.home-hero` con `min-height: calc(100svh - 60px)` y `100vh` como respaldo.
- `.modal-bd` desplazable cuando el modal no cabe (`overflow-y: auto`, alineado arriba si no cabe).

**Fuera de alcance (para otros specs):**

- Distribución del player en vertical y horizontal, objetivos táctiles del HUD (mobile/02).
- Desbordamientos de `/juegos` y `/juegos/[id]` (mobile/03).
- Legibilidad dentro del canvas de RANARIA (mobile/04).
- Manifest, iconos, `appleWebApp` y modo standalone (mobile/05).
- `/salon`, `/about`, `/acceso*` y la home más allá de la altura del hero: no se auditaron en esta pasada.

---

## Modelo de datos

No hay tablas ni columnas nuevas. Solo un export `viewport` (tipo `Viewport` de `next`) y CSS.

Valores:

```ts
// app/layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // las safe-areas las resuelve el CSS
  themeColor: "#0a0a0f", // igual que --bg
  colorScheme: "dark",
};
```

Sin `maximumScale` ni `userScalable: false`: el zoom de la página sigue disponible por accesibilidad. El CRT y la cruceta ya bloquean el doble toque con `touch-action: none` (spec 10).

---

## Plan de implementación

1. **Viewport.** Leer `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` y añadir el export de arriba en `app/layout.tsx`, separado de `metadata`. Verificación: `npx tsc --noEmit`; el HTML servido contiene `viewport-fit=cover` y `<meta name="theme-color" content="#0a0a0f">`, y no contiene `user-scalable=no` ni `maximum-scale`.
2. **Safe-areas de las barras.** Diseñar con `/frontend-design` y reutilizando las clases existentes (`.av-nav`, `.av-mobile-panel`, `.modal-bd`, `.touch-pad`), sin clases nuevas: sumar `env(safe-area-inset-*)` al padding actual con `max()` o `calc()` para que en escritorio (insets a 0) el resultado sea idéntico al de hoy. Ejemplo de intención: `padding-top: calc(14px + env(safe-area-inset-top))` en `.av-nav`. Verificación: con un dispositivo emulado con notch (iPhone 14, vertical y horizontal) el logo y la hamburguesa no quedan bajo el notch; en escritorio el `Nav` mide lo mismo que antes.
3. **Alturas dinámicas.** Cambiar `.home-hero` a `min-height: calc(100vh - 60px)` seguido de `min-height: calc(100svh - 60px)` (el segundo gana donde se entiende). Verificación: en 390×844 emulado el indicador `hero-scroll` se ve sin desplazar con la barra del navegador visible.
4. **Modal desplazable.** En `.modal-bd`, `overflow-y: auto` y padding con safe-areas; el `.modal` centrado cuando cabe y pegado arriba cuando no (`margin: auto` dentro de un contenedor flex permite ambas cosas). Diseño con `/frontend-design`. Verificación: a 844×390 los botones `JUGAR DE NUEVO` y `VOLVER AL VAULT` del modal de FIN DEL JUEGO de RANARIA son alcanzables desplazando el modal.
5. **Verificación final.** `npm run lint`, `npx tsc --noEmit`, `npm run build`, y las comprobaciones de los criterios en emulación y en un móvil real.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `app/layout.tsx` exporta `viewport` con `width: "device-width"`, `initialScale: 1`, `viewportFit: "cover"`, `themeColor: "#0a0a0f"` y sin `maximumScale` ni `userScalable`.
- [ ] El zoom con dos dedos sigue funcionando fuera del CRT y de la cruceta.
- [ ] En Chrome Android la barra del navegador se pinta con `#0a0a0f`.
- [ ] Con notch emulado (vertical y horizontal) ningún elemento de `.av-nav`, `.av-mobile-panel`, `.modal` ni `.touch-pad` queda bajo el notch, las esquinas redondeadas o la barra de gestos.
- [ ] `globals.css` no contiene `100vh` sin un `svh`/`dvh` que lo sustituya en navegadores que lo entienden.
- [ ] A 844×390 el modal de FIN DEL JUEGO se puede desplazar y todos sus botones son pulsables.
- [ ] En escritorio con ratón (`pointer: fine`, ≥ 1280 px) el portal se ve y se juega igual que antes (insets a 0, mismas alturas).
- [ ] A 360 px de ancho ninguna ruta del alcance provoca scroll horizontal.
- [ ] Los controles táctiles de la spec 10 siguen funcionando en los juegos reales (incluido RANARIA).
- [ ] Verificación con emulación móvil (390×844 y 360×740, `hasTouch`) y una prueba en un móvil real, con modelo y navegador anotados en el PR.

---

## Decisiones

- **Sí:** `viewportFit: "cover"` para todo el portal, con las safe-areas resueltas en CSS. Es requisito de `statusBarStyle: "black-translucent"` en la PWA (mobile/05). **No:** dejar `auto` y renunciar a la pantalla completa en iOS.
- **Sí:** `themeColor` único `#0a0a0f`, porque el tema es solo oscuro. **No:** variantes por `prefers-color-scheme`.
- **Sí:** sumar los insets al padding actual (`calc`/`max`) para que en escritorio el resultado sea exactamente el de hoy. **No:** paddings nuevos solo para móvil por ancho.
- **Sí:** no bloquear el zoom de la página (accesibilidad). El bloqueo de gestos sigue limitado a `.crt` y `.touch-pad` como decidió la spec 10.
- **Sí:** `svh` para el hero (altura estable que no salta al replegarse la barra). **No:** `dvh` en el hero, que provocaría saltos de layout al desplazar. El player usa `dvh` en mobile/02 porque ahí sí interesa ajustarse a la barra.
- **Sí:** `colorScheme: "dark"` para que los controles nativos (scrollbars, autocompletado) salgan oscuros **(decidido por mobile-porter, pendiente de revisar)**.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `viewport-fit=cover` sin insets deja contenido bajo el notch en iOS | Los pasos 1 y 2 van en el mismo PR; el criterio de notch emulado lo comprueba. |
| `backdrop-filter` del `Nav` con el padding superior extra se ve como una franja más alta en iOS | Se acepta: es el área del notch, que de otro modo quedaría vacía. Revisar en `/frontend-design`. |
| Navegadores antiguos sin `svh` | Se declara antes la versión `100vh` como respaldo. |
| El `themeColor` no se aplica en iOS Safari (solo en Android/PWA) | Se acepta; en iOS el color lo da `appleWebApp.statusBarStyle` (mobile/05). |

---

## Qué **no** está en este spec

- La distribución del player y el horizontal (mobile/02).
- Páginas de biblioteca y detalle (mobile/03).
- Texto dentro del canvas de RANARIA (mobile/04).
- Manifest, iconos y modo app (mobile/05).
- Cambios en Supabase, `saveScore` o el leaderboard.
