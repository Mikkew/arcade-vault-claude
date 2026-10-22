# SPEC 09 — Juego SERPENTINA (Snake)

> **Estado:** Implemented
> **Depende de:** SPEC 07, SPEC 08
> **Fecha:** 2026-10-22
> **Objetivo:** Reemplazar la simulación de SERPENTINA por un Snake real sobre canvas, con sprites de frutas, que guarda su puntuación en el leaderboard igual que los demás juegos reales.

---

## Por qué existe este spec

Este spec se escribe **después** de la implementación, que se hizo sin spec en la rama `game-serpentina` con el skill `/arcade-game`. Documenta lo construido y las decisiones que se tomaron sin consultar, para poder revisarlas antes del commit. No hay código de referencia: el motor se escribió desde cero sobre el contrato de `lib/engine/types.ts`. Los únicos recursos de origen son los sprites de `references/source-assets/snake-assets/` (de The Spriters Resource).

---

## Alcance

**Dentro:**

- Motor `lib/serpentina/` independiente de React: `engine.ts`, `types.ts`, `sprites.ts`, `audio.ts`.
- Registro del juego en `components/games/registry.ts` (id `serpentina`).
- Sprite `public/games/serpentina/fruits.png`, copiado de `references/source-assets/snake-assets/fruits.png`.
- Guardado de puntuación vía `saveScore` (spec 08), sin cambios en la base ni en las páginas.
- Sonido sintetizado con Web Audio: comer, subir de nivel y chocar.

**Fuera de alcance (para otros specs):**

- Vidas: una sola vida por partida; el HUD no muestra Vidas.
- Pausa por teclado: solo el botón `PAUSA` de la plataforma.
- Control táctil (deslizar o botones en pantalla).
- Frutas especiales, obstáculos y power-ups.
- Migraciones: la fila `serpentina` ya existe en `public.games` (spec 07) con portada `cover-snake`.

---

## Modelo de datos

Este juego no introduce tablas ni columnas. Reutiliza `public.games` y `public.scores`. El estado vive en memoria dentro del motor:

```ts
interface Cell {
  x: number;
  y: number;
} // columna y fila
type Dir = "up" | "down" | "left" | "right";
// snake: Cell[]  (snake[0] es la cabeza)
// queue: Dir[]   (giros pendientes, máximo 2)
// fruit: Cell, fruitFrame: number (índice en FRUIT_FRAMES)
```

Constantes en `lib/serpentina/types.ts`:

- Cuadrícula de 20×15 celdas de 40 px: resolución lógica 800×600.
- `START_LENGTH = 3`; la serpiente empieza hacia la derecha.
- Paso: `BASE_TICK = 150` ms, `TICK_STEP = 10` ms por nivel, `MIN_TICK = 60` ms.
- Nivel: `1 + floor(frutas / 5)`, con tope `MAX_LEVEL = 10`.
- Puntos: `FRUIT_POINTS × nivel` por fruta (10, 20, 30…).
- Sprite: recortes de la fila `y=136, h=160` de `fruits.png` (3790×442), 21 frutas en `FRUIT_FRAMES`.

Puntuación: entero ≥ 0, más es mejor, muy por debajo del límite de 10.000.000 del `check` de `scores`.

---

## Plan de implementación

1. Copiar `fruits.png` a `public/games/serpentina/`. El sistema sigue igual.
2. Crear `types.ts` y `sprites.ts` con constantes y recortes. Verificación: `npx tsc --noEmit`.
3. Crear `audio.ts` (Web Audio, `AudioContext` diferido al primer gesto). Verificación: `npx tsc --noEmit`.
4. Crear `engine.ts` con bucle por acumulador, cola de giros, comida, niveles, colisiones y dibujo. Verificación: `npx tsc --noEmit` y `npx eslint lib/serpentina`.
5. Registrar `serpentina` en `components/games/registry.ts` (`hud: { lives: false, level: true }`, `sound: true`, controles `← ↑ ↓ → / WASD GIRAR`). A partir de aquí el juego es jugable y guarda.
6. Verificar en el navegador: `/juegos/serpentina/jugar` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `npx eslint lib/serpentina components/games` no devuelve errores.
- [ ] `/juegos/serpentina/jugar` carga sin errores en la consola.
- [ ] La serpiente avanza sola hacia la derecha y gira con flechas y con WASD; no puede girar 180°.
- [ ] Dos giros pulsados dentro del mismo paso se aplican en pasos consecutivos.
- [ ] Comer una fruta alarga la serpiente un segmento y suma `10 × nivel`.
- [ ] Al comer la 5.ª fruta el HUD pasa a nivel 2 y el paso se acorta 10 ms; el nivel no supera 10.
- [ ] Chocar con un muro o con el propio cuerpo abre el modal `FIN DEL JUEGO` con la puntuación final.
- [ ] Entrar en la casilla que la cola libera en ese mismo paso no cuenta como choque.
- [ ] `PAUSA` congela el juego y `REANUDAR` continúa sin salto; `FIN` termina la partida.
- [ ] `JUGAR DE NUEVO` deja puntuación 0, nivel 1 y serpiente de 3 segmentos.
- [ ] Hay un solo `onGameOver` por partida.
- [ ] Con sesión, `GUARDAR PUNTUACIÓN` inserta una fila con `game_id = 'serpentina'`; pulsarlo dos veces no la duplica.
- [ ] La partida aparece en `/juegos/serpentina` y en `/salon` tras recargar.
- [ ] Sin `fruits.png` el juego sigue funcionando con frutas dibujadas como círculos.
- [ ] Los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí:** cuadrícula de 20×15 con celdas de 40 px. Da 800×600 sin escalar el sprite y mantiene la proporción 4:3 del CRT.
- **Sí:** movimiento por pasos de tiempo fijo con acumulador, no por cuadro. La velocidad no depende de los Hz del monitor.
- **Sí:** paso de 150 ms que baja 10 ms por nivel hasta 60 ms. Decisión confirmada.
- **Sí:** `10 × nivel` por fruta, nivel cada 5 frutas con tope 10. Premia sobrevivir sin disparar la puntuación.
- **No:** puntos fijos o nivel sin tope. Se descartaron al confirmar el diseño.
- **Sí:** terminar al chocar con muro o cuerpo, o al llenar el tablero. **No:** muros que atraviesan.
- **Sí:** cola de hasta 2 giros pendientes, comparados con el último giro encolado. Evita perder giros rápidos y los giros de 180°.
- **Sí:** teclas por `KeyboardEvent.code`; WASD además de flechas.
- **Sí:** sonido sintetizado, sin archivos de audio nuevos.
- **No:** vidas, pausa por teclado, táctil ni frutas especiales (ver Alcance).
- **Sí:** la fruta cambia de sprite en cada aparición, distinta de la anterior; es solo estético y no afecta a los puntos.

---

## Riesgos

| Riesgo                                                                   | Mitigación                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `fruits.png` pesa unos 570 KB y se descarga al abrir el juego            | Se carga dentro del motor, solo en `/juegos/serpentina/jugar`; el juego no espera a la imagen. |
| Audio bloqueado por el navegador                                         | `AudioContext` se crea tras el primer gesto y todo `play` va en `try/catch`.                   |
| Licencia de los sprites (The Spriters Resource, de un juego de terceros) | Pendiente de revisar antes de publicar; no se decidió nada.                                    |

---

## Qué **no** está en este spec

- Vidas, pausa por teclado, control táctil, frutas especiales, obstáculos o power-ups.
- Cambios en el esquema de Supabase, en `saveScore` o en las páginas del leaderboard.
- Modos de juego (muros que atraviesan, dos jugadores, velocidad elegible).

Cada uno, si llega, va en su propio spec.
