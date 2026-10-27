# SPEC 10 — Controles táctiles en móvil

> **Estado:** Implemented
> **Depende de:** SPEC 05, SPEC 08, SPEC 09, skins/00-sistema-skins, game-jam/papilla/02-motor
> **Fecha:** 2026-10-24
> **Objetivo:** Que los cinco juegos reales se puedan jugar en un móvil o tablet táctil con botones en pantalla bajo el CRT, a través de una ampliación del contrato de motores, sin cambiar la experiencia con teclado y ratón.

---

## Por qué existe este spec

Hoy los cinco motores reales (ROCAS, CAÍDA, BLOQUE BUSTER, SERPENTINA y PAPILLA) solo leen `keydown`/`keyup` en `window`, y BLOQUE BUSTER además `mousemove` en el canvas. En un móvil no hay forma de jugar: ninguna tecla llega al motor, la página se desplaza o hace zoom al tocar y el HUD no cabe en 360 px. Este spec añade una capa táctil común en la plataforma y conecta los cinco juegos a ella.

---

## Alcance

**Dentro:**

- Tipo `TouchAction` y método `setInput(action, pressed)` en el contrato `GameEngine` (`lib/engine/types.ts`).
- Disposición táctil por juego en `components/games/registry.ts` (campo `touch`).
- Componente nuevo `components/TouchControls.tsx`: cruceta y botones A/B bajo el CRT, con multitáctil y pulsación mantenida.
- Integración en `GamePlayer`: pinta los controles, suelta las acciones mantenidas al pausar, terminar, reiniciar o desmontar.
- `setInput` implementado en los cinco motores, con el mismo efecto que su tecla equivalente.
- BLOQUE BUSTER: arrastrar el dedo sobre el canvas mueve la pala (`pointermove`/`pointerdown` sustituyen a `mousemove`, que cubrían solo el ratón).
- Vibración corta al pulsar (`navigator.vibrate`), que se apaga con `SILENCIAR`.
- Bloqueo de scroll, zoom, selección y menú de pulsación larga sobre el CRT y los controles.
- HUD compacto: el player no desborda ni hace scroll horizontal a 360 px de ancho.
- `Nav` en móvil (añadido durante la implementación): a ≤840 px se oculta `.av-nav .user-box`, que con sesión desbordaba la barra a 360 px. El usuario y SALIR siguen en el panel móvil.
- Actualizar la referencia del contrato del skill `/arcade-game` y `CLAUDE.md` para que los juegos nuevos implementen `setInput`.

**Fuera de alcance (para otros specs):**

- Gestos (deslizar, tocar el canvas) en cualquier juego salvo el arrastre de pala de BLOQUE BUSTER.
- Controles para los juegos simulados: sin entrada en el registro no se pintan controles.
- Pantalla completa (Fullscreen API) y orientación horizontal forzada o aviso de «gira el dispositivo».
- Botón para mostrar u ocultar los controles a mano; la visibilidad depende solo del tipo de puntero.
- Botón propio de vibración o preferencia guardada en `localStorage`.
- Mandos físicos (Gamepad API).
- Cambios en el resto de páginas (home, biblioteca, salón) más allá de lo que ya resuelven sus media queries.
- Cambios en Supabase, `saveScore` o el leaderboard.

---

## Modelo de datos

No hay tablas ni columnas nuevas. Los cambios son tipos TypeScript.

En `lib/engine/types.ts`:

```ts
// Mando genérico: cruceta + dos botones. Cada juego usa solo las que necesita.
export type TouchAction = "up" | "down" | "left" | "right" | "a" | "b";
export interface GameEngine {
  // …métodos actuales…
  setInput(action: TouchAction, pressed: boolean): void; // pulsar/soltar; ignora acciones que el juego no usa
}
```

En `components/games/registry.ts`:

```ts
export interface TouchLayout {
  dpad: Array<"up" | "down" | "left" | "right">; // flechas visibles de la cruceta
  a?: string; // etiqueta del botón A; sin valor no se pinta
  b?: string; // etiqueta del botón B
}
export interface GameEntry {
  // …campos actuales…
  touch: TouchLayout;
}
```

Mapeo por juego (igual que los controles de teclado actuales):

| Juego         | `dpad`                        | A          | B       | Equivale a                             |
| ------------- | ----------------------------- | ---------- | ------- | -------------------------------------- |
| ROCAS         | `left`, `right`, `up`         | `DISPARAR` | —       | ← → girar, ↑ impulso, Espacio disparar |
| CAÍDA         | `left`, `right`, `down`       | `ROTAR`    | `CAÍDA` | ← → mover, ↓ bajar, ↑/X rotar, Espacio |
| BLOQUE BUSTER | `left`, `right`               | —          | —       | ← → pala (y arrastre sobre el canvas)  |
| SERPENTINA    | `up`, `down`, `left`, `right` | —          | —       | flechas / WASD                         |
| PAPILLA       | `up`, `down`, `left`, `right` | —          | —       | flechas / WASD                         |

Semántica de `setInput` en cada motor:

- **ROCAS:** `left`/`right`/`up` equivalen a mantener `ArrowLeft`/`ArrowRight`/`ArrowUp`. `a` con `pressed=true` marca `justPressed.Space` solo si no estaba ya mantenido (un disparo por pulsación, como con el teclado).
- **CAÍDA:** `left`/`right`/`down` actúan al pulsar y, mientras se mantienen, repiten con retardo inicial de 170 ms y cadencia de 50 ms (sustituye a la autorrepetición del sistema que hoy aprovecha el teclado). `a` rota y `b` hace la caída dura, una vez por pulsación y sin repetición.
- **BLOQUE BUSTER:** `left`/`right` equivalen a mantener las flechas.
- **SERPENTINA y PAPILLA:** cada pulsación encola un giro o salto con las mismas reglas que `keydown` sin `repeat`. Soltar no hace nada.
- En todos: con el juego en pausa o terminado, `pressed=true` se ignora. `clearKeys`/`onBlur` también limpian el estado táctil.

Constantes en `components/TouchControls.tsx`: `VIBRATE_MS = 10`. Constantes en `lib/caida/`: `TOUCH_REPEAT_DELAY = 170`, `TOUCH_REPEAT_RATE = 50` (ms).

---

## Plan de implementación

1. **Contrato.** Añadir `TouchAction` y `setInput` a `lib/engine/types.ts`, con un `setInput` vacío temporal en los cinco motores para que todo compile. Verificación: `npx tsc --noEmit`.
2. **Motores.** Implementar `setInput` en `lib/asteroids`, `lib/caida` (con autorrepetición por temporizador, cancelada en `pause`, `end`, `restart` y `destroy`), `lib/bloque-buster`, `lib/serpentina` y `lib/papilla`, reutilizando la lógica de sus manejadores de teclado. El teclado se comporta igual que antes. Verificación: `npx tsc --noEmit`, `npm run lint` y jugar cada juego con teclado.
3. **Arrastre de pala.** En BLOQUE BUSTER, cambiar `mousemove` por `pointermove` + `pointerdown` en el canvas (ratón, lápiz y dedo), quitados en `destroy()`. Verificación: con ratón la pala sigue al cursor como antes.
4. **Registro.** Añadir `TouchLayout` y el campo `touch` de cada juego en `components/games/registry.ts` según la tabla. Verificación: `npx tsc --noEmit`.
5. **Componente.** Crear `components/TouchControls.tsx`: botones `<button type="button">` con `aria-label` en español (`Arriba`, `Abajo`, `Izquierda`, `Derecha`) y la etiqueta de A/B como texto. Recibe `layout`, `onInput(action, pressed)`, `muted` y `disabled`. Usa `pointerdown` (llama a `releasePointerCapture` para que salir del botón lo suelte), `pointerup`, `pointerleave` y `pointercancel`, y lleva el registro de los pointers activos por acción para el multitáctil. Bloquea `contextmenu` y vibra al pulsar si `!muted`. Verificación: `npx tsc --noEmit`.
6. **Player.** En `GamePlayer`, pintar `TouchControls` bajo el CRT solo si hay entrada en el registro. Conectar `onInput` a `gameRef.current?.setInput`. Al pausar, terminar, reiniciar, cambiar de pestaña (`visibilitychange`) o desmontar, soltar todas las acciones mantenidas. Verificación: con puntero grueso emulado los botones mueven el juego.
7. **CSS.** En `app/globals.css`: estilos `.touch-pad` en el lenguaje Arcade Vault (cruceta a la izquierda y A/B a la derecha, objetivos táctiles de al menos 48 px, estado pulsado visible), ocultos por defecto y visibles con `@media (pointer: coarse)`. `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en `.crt` y `.touch-pad`. HUD compacto en `@media (max-width: 600px)`: estadísticas y acciones en filas que se ajustan, padding del CRT reducido. Diseñarlo con `/frontend-design`. Verificación: sin scroll horizontal a 360 px.
8. **Documentación.** Añadir `setInput` y `touch` a `.agents/skills/arcade-game/references/engine-contract.md` (contrato, ejemplo y checklist) y a la sección _Game engines_ de `CLAUDE.md`.
9. **Verificación final.** `npm run lint`, `npx tsc --noEmit`, `npm run build`. Playwright con emulación móvil (`hasTouch`, 390×844, `isMobile`) en los cinco juegos, más una partida manual en un móvil real.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `GameEngine` declara `setInput(action: TouchAction, pressed: boolean)` y los cinco motores lo implementan.
- [ ] En escritorio con ratón (`pointer: fine`) no se ven los controles táctiles y los cinco juegos se juegan con teclado igual que antes.
- [ ] Con emulación móvil táctil (390×844) se ven la cruceta y los botones de la tabla, y solo esos, bajo el CRT de cada juego real.
- [ ] Los juegos simulados no muestran controles táctiles.
- [ ] ROCAS: mantener ← gira de forma continua, mantener ↑ impulsa, y A dispara una vez por pulsación. Girar y disparar a la vez con dos dedos funciona.
- [ ] CAÍDA: un toque en ← o → mueve una columna. Mantenerlo repite tras unos 170 ms. ↓ mantenido baja de forma continua. A rota y B hace la caída dura una sola vez por pulsación. Pausar con ← mantenido detiene la repetición, y al reanudar la pieza no se mueve.
- [ ] BLOQUE BUSTER: mantener ← o → mueve la pala, y arrastrar el dedo sobre el canvas la mueve a esa posición. Con ratón la pala sigue al cursor.
- [ ] SERPENTINA y PAPILLA: cada toque de la cruceta gira o salta con las mismas reglas que el teclado (sin giros de 180° en SERPENTINA, máximo 2 en cola).
- [ ] Al deslizar el dedo fuera de un botón mantenido, la acción se suelta (la nave deja de girar y la pala se detiene).
- [ ] Al pulsar `PAUSA` con un botón mantenido, al reanudar no queda ninguna acción pegada.
- [ ] Con el juego en pausa o en `FIN DEL JUEGO`, los botones táctiles no afectan a la partida.
- [ ] Tocar o mantener el CRT o los controles no desplaza la página, no hace zoom con doble toque, no selecciona texto y no abre el menú contextual.
- [ ] Con `SILENCIAR` activo no se llama a `navigator.vibrate`. Sin silenciar se llama con 10 ms en cada pulsación. En navegadores sin `vibrate` no hay errores.
- [ ] A 360 px de ancho el player (HUD, CRT y controles) no provoca scroll horizontal y todos los botones del HUD son visibles.
- [ ] Una partida jugada solo con controles táctiles se guarda con `GUARDAR PUNTUACIÓN` y aparece en el leaderboard, como con teclado.
- [ ] `engine-contract.md` y `CLAUDE.md` documentan `setInput` y el campo `touch`.
- [ ] Partida manual completada en un móvil real (anotar modelo y navegador en el PR).

---

## Decisiones

- **Sí:** un solo spec para la plataforma y los cinco juegos. El cambio por motor es pequeño porque la plataforma hace casi todo el trabajo. **No:** spec piloto con un juego, ni carpeta `specs/tactil/` con un spec por juego.
- **Sí:** botones en pantalla (cruceta + A/B). Sirven para los cinco juegos, incluido ROCAS con varias teclas a la vez. **No:** gestos como modelo principal, ni un híbrido distinto por juego.
- **Sí:** ampliar el contrato con `setInput`, obligatorio como `setSkin`. **No:** `KeyboardEvent` sintéticos, que son frágiles con `isEditable` y con las sueltas perdidas. **No:** listeners táctiles propios en cada motor, que duplicarían la lógica cinco veces.
- **Sí:** mando genérico `TouchAction` (`up/down/left/right/a/b`) con etiquetas por juego en el registro. **No:** acciones específicas por juego.
- **Sí:** visibilidad por `@media (pointer: coarse)`, resuelta en CSS, así que no hay desajuste de hidratación. **No:** breakpoint por ancho, ni botón manual.
- **Sí:** vertical con el CRT a todo el ancho y los controles debajo, al estilo Game Boy. Funciona también en horizontal sin forzarlo. **No:** pantalla completa ni horizontal obligatorio.
- **Sí:** los botones se comportan como teclas: mantener cuenta como mantenido y el multitáctil está permitido. Se suelta al salir del botón o con `pointercancel`. **No:** solo toques sueltos.
- **Sí:** autorrepetición propia de CAÍDA para el táctil (170 ms / 50 ms). Es la consecuencia de «como el teclado»: sin ella, mantener ← solo movería una columna.
- **Sí:** arrastre de pala en BLOQUE BUSTER, migrando `mousemove` a eventos `pointer`.
- **Sí:** vibración de 10 ms que sigue a `SILENCIAR`. CAÍDA no tiene sonido ni botón de silencio, así que siempre vibra. **No:** botón de vibración propio.
- **Sí:** bloquear scroll, zoom, selección y menú contextual solo en el CRT y los controles, no en toda la página.
- **Sí:** las simulaciones quedan fuera, sin controles. **No:** controles decorativos.
- **Sí:** el texto de controles de teclado bajo el CRT (`controls` del registro) no cambia.
- **Sí (durante la implementación):** arreglar el desbordamiento del `Nav` con sesión a 360 px. Venía de la spec 06, pero impedía cumplir el criterio de 360 px en el player. **No:** el desbordamiento de `/salon` a 360 px, que viene de su tabla y queda para otro spec.
- **Sí (durante la implementación):** las flechas de la cruceta se dibujan en CSS, no con glifos ▲◀, porque cada sistema los pinta con un tamaño y una fuente distintos.
- **Sí:** verificación con la emulación móvil de Playwright más una prueba en un móvil real.

---

## Riesgos

| Riesgo                                                                                     | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| En táctil el navegador captura el pointer de forma implícita y `pointerleave` no llega     | `releasePointerCapture(e.pointerId)` en `pointerdown`, más `pointercancel`/`pointerup` en el botón.                            |
| Acción pegada si el `pointerup` se pierde (notificación, cambio de app, rotación)          | El player suelta todas las acciones en `visibilitychange`, `blur`, pausa, fin, reinicio y desmontaje.                          |
| `pointer: coarse` falla en portátiles táctiles con ratón o en tablets con teclado          | Se acepta. El teclado sigue funcionando siempre. Un botón manual queda fuera de alcance.                                       |
| iOS Safari no tiene `navigator.vibrate`                                                    | Llamada protegida (`navigator.vibrate?.()` en `try/catch`). Sin vibración, el resto funciona igual.                            |
| `touch-action: none` en el CRT impide desplazar la página si el CRT ocupa toda la pantalla | Solo se aplica al CRT y a los controles. El HUD y el resto de la página siguen desplazables.                                   |
| El temporizador de autorrepetición de CAÍDA sigue vivo tras pausar o destruir              | Se cancela en `pause`, `end`, `restart`, `destroy` y al soltar. Hay un criterio de aceptación que lo comprueba.                |
| Al tocar A/B el botón toma el foco y Espacio en un teclado físico lo activaría             | Los motores ya hacen `preventDefault` de sus teclas. Los botones táctiles no tienen acción de `click`, solo eventos `pointer`. |

---

## Qué **no** está en este spec

- Gestos, pantalla completa, orientación forzada y la Gamepad API.
- Controles para los juegos simulados.
- Preferencias guardadas (mostrar u ocultar controles, vibración).
- Cambios en Supabase, en `saveScore` o en las páginas del leaderboard.

Cada uno, si llega, va en su propio spec.
