# MÓVIL · SPEC 02 — Player en móvil: HUD táctil, todo en pantalla y horizontal jugable

> **Estado:** Draft
> **Depende de:** SPEC 10, mobile/01-viewport-safe-areas
> **Fecha:** 2026-10-27
> **Objetivo:** Que en `/juegos/[id]/jugar` el HUD, el CRT y los controles táctiles quepan en la pantalla visible del móvil, en vertical y en horizontal, con botones del HUD de al menos 44 px y sin texto ilegible.

---

## Por qué existe este spec

La spec 10 dejó el player sin scroll horizontal a 360 px y con la cruceta a ≥ 48 px, pero la auditoría móvil de RANARIA (estática, 2026-10-27; cálculos con `node -e`) encontró lo siguiente en el player, común a los seis juegos reales:

- **Botones del HUD por debajo de 44 px.** `@media (max-width: 600px)` deja `.hud-actions .btn` en `padding: 10px 12px; font-size: 8px` (`globals.css:858`): unos 34 px de alto. `PAUSA`, `FIN`, `SILENCIAR` y `SALIR` incumplen el mínimo táctil, y su texto en Press Start 2P a 8 px incumple el mínimo de 10 px. El selector de skins (`.skin-picker .btn`, `globals.css:664`, 8 px y `padding: 7px 10px`) está igual.
- **Texto de 6 px.** `.crt-bottom` baja a `font-size: 6px` a ≤ 600 px (`globals.css:861`): «SEÑAL OK · RANARIA · CRT-83 · 60 HZ · CARGA · 1MB» es ilegible.
- **El CRT es pequeño en vertical.** A 360 px, `.av-player` mantiene `padding: 0 24px` (`globals.css:646`) y `.crt` `padding: 10px`: la pantalla mide 292×219 px, el 36,5 % del canvas lógico de 800×600. Es la causa de fondo de la ilegibilidad del texto de RANARIA (mobile/04).
- **La cruceta no cabe en la primera pantalla a 360×740.** Estimación en vertical: `Nav` ≈ 56 + margen 32 + HUD en tres filas ≈ 150 + CRT ≈ 286 + mando ≈ 190 ≈ 746 px, frente a ≈ 684 px visibles en Chrome Android con la barra. La fila ↓ de la cruceta queda bajo el borde y hay que desplazar la página antes de jugar. Con `touch-action: none` en `.crt` y `.touch-pad` (decisión de la spec 10), solo se puede desplazar tocando el HUD.
- **El horizontal no se puede jugar en un teléfono.** A 844×390 el CRT mide 748×561 px (más alto que la pantalla) y el mando queda debajo, a unos 800 px del borde superior. La spec 10 decidió «vertical… funciona también en horizontal sin forzarlo», pero en un teléfono en horizontal no se puede jugar sin desplazar la página continuamente.
- **Interrupciones.** El motor congela la partida cuando la pestaña se oculta (el `requestAnimationFrame` se detiene), pero al volver de una llamada o de otra app la partida sigue al instante, sin pausa. En RANARIA eso es una muerte casi segura en mitad de la autopista.

---

## Alcance

**Dentro:**

- HUD del player a ≤ 600 px: botones de acción y de skin con objetivo táctil ≥ 44 px de alto y texto ≥ 10 px.
- `.crt-bottom` a ≤ 600 px: sin texto por debajo de 10 px (se queda el LED y se ocultan los rótulos decorativos).
- Más ancho para el CRT en vertical: menos padding lateral de `.av-player` y `.crt` a ≤ 600 px.
- Vertical (`pointer: coarse`): HUD + CRT + mando caben en `100dvh` a 360×740 y 390×844 sin desplazar, con el `Nav` incluido o desplazando solo hasta el inicio del player.
- Horizontal en teléfono (`(pointer: coarse) and (orientation: landscape) and (max-height: 540px)`): cruceta a la izquierda del CRT, A/B a la derecha, CRT dimensionado por la altura disponible en `dvh`, HUD en una fila compacta.
- Pausa automática al ocultar la página (`visibilitychange`) solo con puntero grueso.

**Fuera de alcance (para otros specs):**

- Texto e iconos dentro del canvas de RANARIA (mobile/04) y de PAPILLA (mismo problema, spec futuro).
- Pantalla completa (Fullscreen API) y bloqueo de orientación: siguen fuera, como decidió la spec 10.
- Gestos sobre el canvas, mandos físicos y botón para ocultar los controles (spec 10, *Fuera de alcance*).
- Simulaciones: no tienen mando; solo heredan el HUD compacto.

---

## Modelo de datos

No hay tablas ni columnas nuevas. No cambia el contrato `GameEngine` ni el registro. Los cambios son CSS en `app/globals.css` y marcado en `components/GamePlayer.tsx` (como mucho, un contenedor alrededor de `.crt` y `TouchControls` para poder colocarlos en fila en horizontal).

Medidas objetivo:

| Contexto | Pantalla del CRT | Mando |
| --- | --- | --- |
| 360×740 vertical | ≥ 320 px de ancho (hoy 292) | completo en `100dvh` |
| 390×844 vertical | ≥ 350 px de ancho (hoy 322) | completo en `100dvh` |
| 844×390 horizontal | alto = espacio libre en `100dvh` tras el HUD (≈ 280–300 px), ancho = alto × 4/3 | cruceta a la izquierda (3 × 48 px), A/B a la derecha |
| ≥ 1280 px con ratón | igual que hoy | oculto |

---

## Plan de implementación

1. **HUD táctil.** Diseñar con `/frontend-design` reutilizando `.btn`, `.hud-stat`, `.hud-actions` y `.skin-picker`: a ≤ 600 px los botones del HUD miden ≥ 44 px de alto con ≥ 8 px de separación y su texto ≥ 10 px; si no caben en una fila, se reparten en una rejilla de dos columnas con `minmax(0, 1fr)`. Verificación: a 360 px, medir con DevTools la caja de `PAUSA`, `FIN`, `SILENCIAR`, `SALIR` y de los botones de skin de ROCAS: todas ≥ 44 px de alto; sin scroll horizontal.
2. **Pie del CRT.** A ≤ 600 px, `.crt-bottom` conserva el LED `SEÑAL OK` a ≥ 10 px y oculta los otros dos rótulos (decorativos). Verificación: ningún texto del player por debajo de 10 px en Press Start 2P.
3. **CRT más ancho en vertical.** A ≤ 600 px, reducir el padding lateral de `.av-player` y `.crt` (por ejemplo 12 px y 6 px) respetando las safe-areas de mobile/01. Verificación: a 360 px la pantalla del CRT mide ≥ 320 px; sin scroll horizontal.
4. **Todo en una pantalla (vertical).** Con `pointer: coarse` y vertical, el HUD compacto + CRT + mando caben en `100dvh`. Si no caben con el `Nav`, el CRT limita su ancho con `min(100%, calc((100dvh - <HUD> - <mando>) * 4 / 3))` y queda centrado. Diseño con `/frontend-design`. Verificación: a 360×740 y 390×844 emulados, con la barra del navegador visible, las cuatro flechas de la cruceta de RANARIA son pulsables sin desplazar la página tras desplazar el `Nav` fuera.
5. **Horizontal jugable.** Con `(pointer: coarse) and (orientation: landscape) and (max-height: 540px)`: el `Nav` deja de ser `sticky` en el player, el HUD pasa a una fila de ≤ 56 px, y el CRT se coloca entre la cruceta (izquierda) y A/B (derecha), con su alto calculado en `dvh`. Los juegos sin A/B (RANARIA, PAPILLA, SERPENTINA, BLOQUE BUSTER) dejan el lado derecho vacío o centran la cruceta a la izquierda; se decide en `/frontend-design`. Al montar en horizontal, el player se desplaza a la vista (`scrollIntoView({ block: "start" })`). Verificación: a 844×390 emulado, HUD, CRT completo y cruceta visibles a la vez; partida de RANARIA de un minuto sin tocar el scroll.
6. **Pausa al ocultar.** En `GamePlayer`, si `matchMedia("(pointer: coarse)")` y la página pasa a oculta durante la partida, pausar como `PAUSA` (mismo estado, mismo texto «EN PAUSA»). Al volver, la partida sigue en pausa hasta que el jugador pulse `REANUDAR`. Verificación: en emulación táctil, cambiar de pestaña con RANARIA en marcha y volver: aparece «EN PAUSA» y el temporizador del viaje no ha bajado.
7. **Verificación final.** `npm run lint`, `npx tsc --noEmit`, `npm run build`; los seis juegos reales en emulación vertical y horizontal; partida en un móvil real.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] En escritorio con ratón (`pointer: fine`, ≥ 1280 px) el portal se ve y se juega igual que antes, incluido que cambiar de pestaña **no** pausa la partida.
- [ ] A 360 px de ancho ninguna ruta del alcance provoca scroll horizontal.
- [ ] A ≤ 600 px, todos los botones del HUD (acciones y skins) miden ≥ 44 px de alto con ≥ 8 px de separación.
- [ ] Ningún texto del player (fuera del canvas) usa Press Start 2P por debajo de 10 px.
- [ ] A 360 px la pantalla del CRT mide ≥ 320 px de ancho.
- [ ] A 360×740 y 390×844 (`hasTouch`), tras desplazar el `Nav`, el HUD, el CRT y toda la cruceta caben a la vez en la pantalla visible.
- [ ] A 844×390 (`hasTouch`) se ven a la vez el HUD, el CRT completo y la cruceta, y se juega una partida de RANARIA sin desplazar la página.
- [ ] Con puntero grueso, ocultar la página pausa la partida y al volver sigue en pausa; con ratón no cambia nada.
- [ ] Los controles táctiles de la spec 10 siguen funcionando en los juegos reales (ROCAS con dos dedos, CAÍDA con autorrepetición, arrastre de pala en BLOQUE BUSTER, cola de saltos en RANARIA y PAPILLA).
- [ ] Verificación con emulación móvil (390×844 y 360×740, `hasTouch`) y una prueba en un móvil real, con modelo y navegador anotados en el PR.

---

## Decisiones

- **Sí:** objetivo táctil de 44 px de alto con 8 px de separación para el HUD (no 48), porque cuatro botones de 48 px no caben en dos filas a 360 px sin ocupar casi un cuarto de pantalla **(decidido por mobile-porter, pendiente de revisar)**. La cruceta sigue en 48–60 px (spec 10).
- **Sí:** ocultar los rótulos decorativos de `.crt-bottom` a ≤ 600 px y dejar solo el LED. **No:** subirlos a 10 px, que los partiría en tres líneas **(decidido por mobile-porter, pendiente de revisar)**.
- **Sí:** distribución propia para teléfonos en horizontal. **No** deshace la spec 10: sigue sin forzarse la orientación ni la pantalla completa, y los controles siguen visibles solo por `pointer: coarse`. La condición de orientación y alto solo decide **dónde** van, no **si** se ven. Se marca para revisión porque la spec 10 dijo que el horizontal «funciona sin forzarlo» y aquí se reconoce que en un teléfono no es así **(decidido por mobile-porter, pendiente de revisar)**.
- **Sí:** `dvh` en el player (se adapta a la barra del navegador que aparece y desaparece). **No:** `100vh`.
- **Sí:** el `Nav` deja de ser `sticky` solo en el player en horizontal, para dar el alto al CRT. Sigue habiendo salida visible con `SALIR` en el HUD.
- **Sí:** pausa automática al ocultar la página solo con puntero grueso, para no cambiar el escritorio **(decidido por mobile-porter, pendiente de revisar)**. **No:** pausa en `blur` de la ventana, que en móvil salta con el teclado o las notificaciones.
- **Sí:** el texto de controles de teclado bajo el CRT no cambia (decisión de la spec 10), aunque en táctil no aporte.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| En horizontal, la barra de Safari iOS aparece y desaparece y cambia `dvh` durante la partida | El CRT usa `dvh` y el canvas escala por CSS sin recrear el motor; no se reinicia la partida. Verificar en dispositivo. |
| `orientation: landscape` también es cierto en tablets y en escritorio táctil | La condición incluye `max-height: 540px` y `pointer: coarse`; una tablet en horizontal mantiene el diseño vertical. |
| Con la cruceta a la izquierda y A/B a la derecha, el pulgar tapa parte del CRT | Los controles quedan fuera del CRT, a los lados; el diseño se revisa con `/frontend-design` en ROCAS y CAÍDA, que usan A/B. |
| `scrollIntoView` al montar molesta si el usuario ya había desplazado | Solo se hace una vez al montar y solo en horizontal de teléfono. |
| La pausa automática interfiere con la pausa manual | Usa el mismo estado `paused` que `PAUSA`; si ya estaba en pausa, no hace nada. |
| Se rompe el arrastre de pala de BLOQUE BUSTER al cambiar el tamaño del CRT | El arrastre usa coordenadas relativas al canvas; criterio de controles de la spec 10 incluido. |

---

## Qué **no** está en este spec

- Texto e iconos dentro del canvas (mobile/04 para RANARIA).
- Pantalla completa, orientación forzada, gestos y Gamepad API.
- Cambios en los motores, en el contrato `GameEngine`, en Supabase, `saveScore` o el leaderboard.
