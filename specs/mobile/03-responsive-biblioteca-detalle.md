# MÓVIL · SPEC 03 — Biblioteca y ficha de juego sin desbordar a 360 px

> **Estado:** Draft
> **Depende de:** SPEC 07, SPEC 08, SPEC 10, mobile/01-viewport-safe-areas
> **Fecha:** 2026-10-27
> **Objetivo:** Que `/juegos` y `/juegos/[id]` no desborden a 360 px con puntuaciones y nombres reales, que sus filtros y su buscador se puedan tocar y enfocar sin zoom en iOS, y que respeten `prefers-reduced-motion`.

---

## Por qué existe este spec

La spec 10 dejó fuera «el resto de páginas». Al auditar las páginas de RANARIA (estático, 2026-10-27; cálculos con `node -e`) salieron fallos que no son de RANARIA sino de las plantillas compartidas, y que RANARIA hace visibles porque sus puntuaciones crecen deprisa (bonus de ronda de 500 × nivel):

- **`.stat-strip` desborda la ficha.** `grid-template-columns: repeat(3, 1fr)` (`globals.css:601`) sin `minmax(0, …)`: cada columna mide al menos su contenido. A 360 px quedan ≈ 98 px por columna. «MEJOR GLOBAL» con un récord de 5 cifras («12.345», Press Start 2P 16 px) pide ≈ 124 px, y con «PARTIDAS» y «DIFICULTAD» la tira suma ≈ 312 px en 296 disponibles. Con récords de 6 cifras, ≈ 328 px. Pintado en `app/juegos/[id]/page.tsx:68`.
- **`.lb-row` desborda el leaderboard.** `grid-template-columns: 36px 1fr 110px` (`globals.css:627`), `1fr` sin `minmax(0, …)` y el nombre sin `overflow-wrap`. Los nombres admiten 16 caracteres `[A-Za-z0-9_]` sin espacios (`supabase/migrations/20261020001939_profiles.sql:6`): en JetBrains Mono 13 px son ≈ 125 px, y a 360 px la columna del nombre tiene ≈ 98 px. La fila empuja la columna del grid de `.av-detail` y la página desborda ≈ 27 px. `body { overflow-x: hidden }` (`globals.css:52`) lo recorta en lugar de mostrar scroll, así que la puntuación queda cortada por la derecha.
- **Buscador con zoom en iOS.** `.av-search input { font-size: 13px }` (`globals.css:328`): iOS Safari hace zoom al enfocarlo.
- **Filtros pequeños.** `.chip` (`globals.css:334`) mide ≈ 40 px de alto con 8 px de separación y texto Press Start 2P de 9 px: por debajo de 44 px y de 10 px.
- **Texto pequeño en las tarjetas y la ficha.** `.card .cover .label` a 8 px (`globals.css:390`), `.detail-tags span` a 9 px (`globals.css:595`), `.card .desc` en mono 12 px (`globals.css:404`), la fecha del leaderboard en mono 10 px (`components/Leaderboard.tsx`, estilo en línea).
- **`:hover` pegado en táctil.** `.card:hover` (`globals.css:375`) inclina y eleva la tarjeta; en táctil el estado se queda tras tocarla y volver atrás.
- **Movimiento.** `.btn.pulse` (`globals.css:272`, el `▶ JUGAR AHORA` de la ficha) y `.fade-in` (`globals.css:1459`) no respetan `prefers-reduced-motion`; el único bloque de movimiento reducido general es el de `.reveal` (`globals.css:1453`).

---

## Alcance

**Dentro:**

- `/juegos`: buscador a 16 px, chips ≥ 44 px, textos de tarjeta legibles, `:hover` solo con puntero fino.
- `/juegos/[id]`: `.stat-strip` y `.lb-row` sin desbordar con récords de hasta 7 cifras y nombres de 16 caracteres; etiquetas legibles.
- `prefers-reduced-motion` para `.btn.pulse`, `.fade-in`, `.flicker` y `.blink`.

**Fuera de alcance (para otros specs):**

- `/salon` (su tabla a 360 px, pendiente desde la spec 10), `/`, `/about` y `/acceso*`: no se auditaron en esta pasada.
- El player (mobile/02) y el canvas (mobile/04).
- Portadas (`cover-*`): son decorativas y no desbordan (`aspect-ratio`).

---

## Modelo de datos

No hay tablas ni columnas nuevas. Solo CSS en `app/globals.css` y, si hace falta, mover el estilo en línea de la fecha de `components/Leaderboard.tsx` a una clase.

---

## Plan de implementación

1. **Ficha sin desbordar.** En `.stat-strip`, columnas con `minmax(0, 1fr)` y valores que se adaptan (por ejemplo `font-size: clamp(…)` o `overflow-wrap: anywhere` en `.v`); en `.lb-row`, `36px minmax(0, 1fr) auto` y el nombre con `overflow-wrap: anywhere` o recorte con elipsis y `title`. Diseño con `/frontend-design`, reutilizando `.stat-strip` y `.lb-row`. Verificación: en `/juegos/ranaria` a 360 px, con un récord de `1.234.567` y un nombre `ABCDEFGHIJKLMNOP` inyectados en DevTools, `document.documentElement.scrollWidth === 360` y la puntuación se ve entera.
2. **Biblioteca táctil.** `.av-search input` a 16 px; `.chip` ≥ 44 px de alto y texto ≥ 10 px; `.card:hover` y su efecto de inclinación solo dentro de `@media (hover: hover) and (pointer: fine)`. Diseño con `/frontend-design`. Verificación: en iOS (o emulación de iPhone) enfocar el buscador no hace zoom; los chips miden ≥ 44 px; tocar la tarjeta de RANARIA, volver atrás y la tarjeta no queda inclinada.
3. **Legibilidad.** A ≤ 600 px, `.card .cover .label`, `.detail-tags span` y las etiquetas en Press Start 2P suben a ≥ 10 px; `.card .desc` y la fecha del leaderboard a ≥ 12 px (texto secundario, no cuerpo). Verificación: inspección de tamaños calculados a 360 px.
4. **Movimiento reducido.** Ampliar el bloque `@media (prefers-reduced-motion: reduce)` de `globals.css` con `.btn.pulse`, `.fade-in`, `.flicker` y `.blink`. Verificación: con `prefers-reduced-motion: reduce` emulado, `▶ JUGAR AHORA` no pulsa.
5. **Verificación final.** `npm run lint`, `npx tsc --noEmit`, `npm run build`; `/juegos` y `/juegos/ranaria` a 360, 390 y 768 px en vertical y a 844×390.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] En escritorio con ratón (`pointer: fine`, ≥ 1280 px) el portal se ve y se juega igual que antes (incluida la inclinación de las tarjetas al pasar el ratón).
- [ ] A 360 px de ancho ninguna ruta del alcance provoca scroll horizontal, también con un récord de 7 cifras en `.stat-strip` y un nombre de 16 caracteres sin espacios en el leaderboard.
- [ ] `/juegos` y `/juegos/ranaria` cumplen lo anterior a 390 y 768 px en vertical y a 844×390.
- [ ] El buscador de `/juegos` tiene `font-size` ≥ 16 px.
- [ ] Los chips de categoría miden ≥ 44 px de alto con ≥ 8 px de separación.
- [ ] Ningún texto de `/juegos` ni `/juegos/[id]` en Press Start 2P baja de 10 px a 360 px.
- [ ] Con `prefers-reduced-motion: reduce`, `.btn.pulse`, `.fade-in`, `.flicker` y `.blink` no animan.
- [ ] Los controles táctiles de la spec 10 siguen funcionando en los juegos reales.
- [ ] Verificación con emulación móvil (390×844 y 360×740, `hasTouch`) y una prueba en un móvil real, con modelo y navegador anotados en el PR.

---

## Decisiones

- **Sí:** arreglar `.stat-strip` y `.lb-row` en la plantilla común, no solo para RANARIA: todas las fichas comparten el mismo fallo.
- **Sí:** el nombre largo del leaderboard se parte (`overflow-wrap: anywhere`) en lugar de recortarse con elipsis, para que el nombre se lea entero en móvil **(decidido por mobile-porter, pendiente de revisar)**.
- **Sí:** `:hover` decorativo solo con `(hover: hover) and (pointer: fine)`. No hay información que solo se vea con `:hover` en estas páginas.
- **Sí:** 12 px como mínimo para texto mono secundario (descripciones cortas, fechas) y 14 px para el cuerpo (`.detail-info p` ya cumple) **(decidido por mobile-porter, pendiente de revisar)**.
- **No:** quitar `overflow-x: hidden` de `body`. Ocultaría el síntoma en otras páginas no auditadas; los desbordamientos se arreglan en su origen.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `overflow-x: hidden` en `body` oculta desbordamientos, que pasan desapercibidos | El criterio usa `scrollWidth` del documento y la comprobación visual de que la puntuación no se recorta. |
| Subir chips a 44 px alarga la barra de filtros en móvil | Se revisa en `/frontend-design`; los chips ya se reparten en filas (`flex-wrap`). |
| Tamaños nuevos por media query cambian el escritorio | Todos los cambios de tamaño van en `@media (max-width: 600px)` o en `pointer: coarse`; criterio de escritorio incluido. |

---

## Qué **no** está en este spec

- `/salon`, home, About y acceso.
- El player y el canvas.
- Cambios en Supabase, `saveScore`, el leaderboard (datos) o lo que se guarda en `scores`.
