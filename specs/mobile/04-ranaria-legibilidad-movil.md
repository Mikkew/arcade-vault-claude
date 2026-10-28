# MÓVIL · SPEC 04 — RANARIA legible y con sonido en móvil

> **Estado:** Draft
> **Depende de:** SPEC 10, game-jam/ranaria/01-motor, skins/04-skins-ranaria, mobile/02-responsive-player
> **Fecha:** 2026-10-27
> **Objetivo:** Que la franja superior del canvas de RANARIA (renacuajos y tiempo) y sus rótulos se lean en un móvil de 360 px, sin cambiar lo que se ve en escritorio, y que el sonido arranque con el primer toque en la cruceta.

---

## Por qué existe este spec

RANARIA pinta en el canvas información que la plataforma no muestra en el HUD: los cinco renacuajos (en la charca, a cuestas, rescatado) y la barra de tiempo del viaje. En un móvil esa información se vuelve ilegible. La auditoría (estática, 2026-10-27; cálculos con `node -e`) mide:

| Elemento (`lib/ranaria/engine.ts`) | Tamaño lógico | 360 px (escala 0,365) | 390 px (0,403) | 768 px (0,84) |
| --- | --- | --- | --- | --- |
| «RENACUAJOS» (`:621`, `bold 14px monospace`) | 14 px | **5,1 px** | **5,6 px** | 11,8 px |
| «TIEMPO» (`:641`, `bold 12px monospace`) | 12 px | **4,4 px** | **4,8 px** | 10,1 px |
| Iconos de renacuajo (`:627-633`) | ≈ 12 px | **4,4 px** | **4,8 px** | 10,1 px |
| Barra de tiempo (`:646-648`, alto) | 14 px | **5,1 px** | 5,6 px | 11,8 px |
| «¡A CONTRAMANO!», «¡CHARCA COMPLETA!» (`:654`) | 30 px | **10,9 px** | 12,1 px | 25,2 px |
| Casilla de la cuadrícula | 50 px | 18,3 px | 20,1 px | 42 px |

La escala real a 360 px es 0,365 y no 0,45: la pantalla del CRT mide 292 px (`.av-player` con 24 px de padding y `.crt` con 10 px). mobile/02 la sube a ≥ 320 px (escala ≥ 0,40), pero ni así el texto llega a 6 px. Con un 5 px de alto, el aviso rojo de los últimos 5 s de la barra es lo único que distingue «me queda tiempo» de «me muero», y en un móvil apenas se ve.

Otros hallazgos móviles del juego:

- **Sonido que puede no arrancar en táctil.** `lib/ranaria/audio.ts:14-34` crea el `AudioContext` en el primer `keydown` o `pointerdown` y retira los listeners en esa misma llamada. Según HTML, un `pointerdown` de un dedo **no** da activación de usuario (sí `pointerup`, `touchend` y `click`). Si se entra directamente en `/juegos/ranaria/jugar` (recarga, enlace compartido, PWA abierta en el player), el primer toque en la cruceta crea un contexto suspendido, `resume()` falla y ya no se vuelve a intentar: la partida queda muda. Al venir de la ficha con `▶ JUGAR AHORA`, la activación persistente de la navegación lo evita. iOS además suspende el contexto (`interrupted`) al pasar la PWA a segundo plano. Hay que verificarlo en un dispositivo real; `lib/papilla/audio.ts:53-54` y `lib/serpentina/audio.ts` tienen el mismo patrón.
- **Lo que cumple:** la cruceta de cuatro direcciones (`touch: { dpad: [...] }`) cubre todos los controles de teclado (flechas/WASD); `setInput` encola un salto al pulsar, ignora soltar y A/B, y respeta la cola de 2 y los 120 ms, igual que `keydown` sin `repeat`; las celdas de la cruceta miden `clamp(48px, 14vw, 60px)` = 50 px a 360 px; el CRT y la cruceta bloquean scroll, zoom y menú contextual (spec 10).

Los colores y contrastes de la franja y de los iconos (incluido que «a cuestas» y «rescatado» solo se distinguen por color) los resuelve `specs/skins/04-skins-ranaria.md`; este spec no los repite y usa sus paletas.

---

## Alcance

**Dentro:**

- Modo de franja **compacta** en el motor de RANARIA cuando el canvas se muestra pequeño: iconos y barra más grandes, segundos restantes en número, sin las etiquetas «RENACUAJOS» y «TIEMPO».
- Rótulos `¡A CONTRAMANO!` y `¡CHARCA COMPLETA!` con un tamaño lógico que garantice ≥ 14 px en pantalla.
- Desbloqueo del sonido robusto en táctil y reanudación al volver de segundo plano.

**Fuera de alcance (para otros specs):**

- Colores, contraste y forma de los iconos (skins/04-skins-ranaria).
- Tamaño del CRT, distribución del player y horizontal (mobile/02).
- El mismo problema de texto en canvas y de audio en PAPILLA y SERPENTINA (spec futuro por juego).
- Gestos (deslizar para saltar): la spec 10 los dejó fuera y la cruceta cubre el juego.
- Cambios en reglas, puntuación, velocidad o tiempo del viaje.

---

## Modelo de datos

No hay tablas ni columnas nuevas. No cambia el contrato `GameEngine` ni el registro. Cambios internos en `lib/ranaria/`:

```ts
// lib/ranaria/types.ts (constantes nuevas, nombres orientativos)
export const MIN_CSS_TEXT = 10; // px en pantalla para texto de la franja
export const MIN_CSS_BANNER = 14; // px en pantalla para los rótulos
export const COMPACT_BELOW = 571; // px de ancho CSS del canvas: por debajo, 14 px lógicos < 10 px reales
export const BANNER_FONT_MAX = 44; // px lógicos; «¡CHARCA COMPLETA!» a 44 px ocupa ≈ 450 de 800
```

El motor calcula `uiScale = canvas.clientWidth / W` con un `ResizeObserver` sobre su propio canvas (desconectado en `destroy()`) y deriva:

- `compact = canvas.clientWidth < COMPACT_BELOW`.
- Fuente de la franja en modo compacto: `ceil(MIN_CSS_TEXT / uiScale)` px lógicos (28 px a 360 px), limitada al alto de la fila 0 (50 px).
- Fuente de los rótulos: `clamp(30, ceil(MIN_CSS_BANNER / uiScale), BANNER_FONT_MAX)` (39 px a 360 px, 30 px en escritorio).

En modo normal (escritorio y tablet) la franja se dibuja exactamente como hoy.

---

## Plan de implementación

1. **Medir el canvas.** En `createRanariaGame`, observar el canvas con `ResizeObserver` y guardar `uiScale` y `compact`; desconectar en `destroy()`. Sin `ResizeObserver` (navegador antiguo), `compact = false`. Verificación: `npx tsc --noEmit`; en escritorio a 1280 px nada cambia en pantalla.
2. **Franja compacta.** Diseñar con `/frontend-design` (es UI dentro del canvas) usando los colores de la paleta de skins/04 (`text`, `flip`, `rescued`, aro de «a cuestas»): cinco iconos de renacuajo a ≈ 2× (≥ 8 px reales a 360 px), los segundos restantes como número a ≥ 10 px reales, y la barra de tiempo de ≥ 22 px lógicos de alto (≥ 8 px reales) ocupando el resto de la fila. En los últimos 5 s, además del rojo, el número parpadea o cambia de forma para que el aviso no dependa solo del color. Verificación: captura a 360×740 con emulación: número de segundos, iconos y barra distinguibles; a 1280 px la franja es idéntica a la de hoy.
3. **Rótulos legibles.** `drawBanner` usa la fuente calculada en el modelo de datos y ajusta el alto de la banda a la fuente (sigue centrada en la mediana). Verificación: a 360 px `¡CHARCA COMPLETA!` mide ≥ 14 px reales y no se sale del canvas; a 1280 px se ve a 30 px como hoy.
4. **Sonido en táctil.** En `lib/ranaria/audio.ts`: escuchar también `pointerup` y `touchend`; crear el contexto en el primer gesto pero **no** retirar los listeners hasta que `ctx.state === "running"`; al volver a visible (`visibilitychange`) y en el siguiente gesto, `resume()` si el estado es `suspended` o `interrupted`. Todo protegido con `try/catch`; `destroy()` quita todos los listeners y cierra el contexto. Verificación: cargar `/juegos/ranaria/jugar` directamente en emulación táctil, primer toque en ↑: el salto suena; pasar a otra pestaña y volver, reanudar: sigue sonando.
5. **Verificación final.** `npm run lint`, `npx tsc --noEmit`, `npm run build`; partida completa (una ronda) con la cruceta a 360×740 y a 844×390 emulados, y en un móvil real Android e iOS.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] En escritorio con ratón (`pointer: fine`, ≥ 1280 px) el portal se ve y se juega igual que antes: la franja superior de RANARIA y sus rótulos son idénticos a los actuales.
- [ ] A 360 px de ancho ninguna ruta del alcance provoca scroll horizontal.
- [ ] A 360 px, el tiempo restante se muestra como número a ≥ 10 px reales y la barra mide ≥ 8 px reales de alto.
- [ ] A 360 px, los cinco iconos de renacuajo miden ≥ 8 px reales y siguen las reglas de color y forma de skins/04.
- [ ] En los últimos 5 s el aviso no depende solo del color.
- [ ] A 360 px, `¡A CONTRAMANO!` y `¡CHARCA COMPLETA!` miden ≥ 14 px reales y caben en el canvas.
- [ ] Girar el móvil durante la partida cambia entre franja compacta y normal sin reiniciar la partida ni perder la puntuación.
- [ ] Entrando directamente en `/juegos/ranaria/jugar`, el primer toque en la cruceta activa el sonido (si no está en `SILENCIAR`).
- [ ] Tras pasar a segundo plano y volver, el sonido sigue funcionando.
- [ ] `destroy()` desconecta el `ResizeObserver` y quita todos los listeners de audio.
- [ ] Los controles táctiles de la spec 10 siguen funcionando en los juegos reales, y en RANARIA cada toque de la cruceta es un salto (cola de 2, 120 ms).
- [ ] Una partida jugada solo con la cruceta se guarda con `GUARDAR PUNTUACIÓN` y aparece en el leaderboard de `/juegos/ranaria`.
- [ ] Verificación con emulación móvil (390×844 y 360×740, `hasTouch`) y una prueba en un móvil real, con modelo y navegador anotados en el PR.

---

## Decisiones

- **Sí:** franja compacta decidida por el **ancho mostrado del canvas**, no por el tipo de puntero. La legibilidad depende del tamaño en pantalla; un escritorio con la ventana estrecha también la necesita. No contradice la spec 10: los controles siguen visibles solo por `pointer: coarse`.
- **Sí:** resolverlo dentro del motor, que es quien pinta la franja. **No:** sacar renacuajos y tiempo al HUD del DOM, que exigiría ampliar el contrato `GameEngine` con callbacks nuevos para un solo juego **(decidido por mobile-porter, pendiente de revisar)**.
- **Sí:** en compacto se quitan las palabras «RENACUAJOS» y «TIEMPO» y se muestran los segundos como número. A 28 px lógicos, etiquetas + iconos + barra no caben en 800 px **(decidido por mobile-porter, pendiente de revisar)**.
- **Sí:** umbral `COMPACT_BELOW = 571` px: es el ancho a partir del cual 14 px lógicos dan 10 px reales. Una tablet en vertical (672 px) mantiene la franja normal.
- **Sí:** reintentar el desbloqueo del audio hasta que el contexto esté `running`. **No:** dejarlo en un solo intento.
- **No:** cambiar `W`, `H` ni la cuadrícula 16×12. Cambiaría la jugabilidad y la paridad con escritorio.
- **No:** subir la resolución del canvas por `devicePixelRatio`. A 360 px con DPR 3 el canvas de 800 px ya cubre ≈ 876 píxeles físicos; el problema es el tamaño, no la nitidez.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Este spec y skins/04 tocan la misma función de dibujo de la franja | Depende de skins/04: se implementa después y usa su `Palette`. Si skins/04 aún no está, se aplaza este spec. |
| `ResizeObserver` dispara en cada cambio de `dvh` en Safari iOS | Solo recalcula dos números; no recrea el motor ni toca el estado de la partida. |
| La franja compacta tapa parte de la orilla norte | La franja sigue en la fila 0, que ya es auxiliar; las charcas están en la fila 1 (`NORTH_ROW`). |
| El parpadeo del aviso molesta con `prefers-reduced-motion` | Con movimiento reducido, cambiar de forma (borde o icono) en lugar de parpadear. |
| iOS no da activación de usuario con `pointerdown` | Se escucha `pointerup`/`touchend` y se reintenta en cada gesto hasta que el contexto esté en marcha. |
| El arreglo del audio no llega a PAPILLA y SERPENTINA, que tienen el mismo patrón | Anotado como trabajo futuro en *Fuera de alcance*. |

---

## Qué **no** está en este spec

- Paletas, contraste y skins (skins/04-skins-ranaria).
- Distribución del player, HUD del DOM y horizontal (mobile/02).
- PAPILLA, SERPENTINA y el resto de juegos.
- Cambios en reglas, puntuación, Supabase, `saveScore` o el leaderboard.
