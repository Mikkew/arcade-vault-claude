# GAME JAM APAGON · SPEC 02 — Motor de APAGÓN

> **Estado:** Draft
> **Tema:** Ciudad nocturna
> **Depende de:** SPEC 07, SPEC 08, game-jam/apagon/01-catalogo
> **Fecha:** 2026-10-22
> **Objetivo:** Sustituir la simulación de APAGÓN por un motor real sobre canvas (tender cable antes de que llegue la corriente), registrado en `GAME_REGISTRY` y que guarda su puntuación en el leaderboard como los demás juegos reales.

---

## Por qué existe este spec

Tras el spec 01, `apagon` está en el catálogo pero `/juegos/apagon/jugar` solo simula y no escribe en `scores`. Este spec define el juego real. No hay código de referencia en `references/started-games/` ni assets en `references/source-assets/`: el motor se escribe desde cero sobre el contrato de `lib/engine/types.ts`, tomando `lib/serpentina/` como modelo de estructura (cuadrícula, bucle por acumulador, `audio.ts` separado).

**Reglas en una frase:** la central eléctrica de la ciudad está en una casilla del tablero; el jugador coloca tramos de cable que salen de una cola de 5 piezas, y cuando se agota la mecha la corriente empieza a recorrer el cable; si llega a un extremo suelto, a un borde o a un tramo que no encaja, se corta. Si para entonces ha recorrido los tramos que pide el nivel, la ciudad se enciende y se pasa al siguiente; si no, apagón y fin de la partida.

---

## Alcance

**Dentro:**

- Motor `lib/apagon/` independiente de React: `types.ts`, `board.ts` (piezas, conexiones y generación del tablero), `engine.ts` (bucle, entrada, flujo y dibujo) y `audio.ts` mínimo (los tres sonidos básicos del spec 03 pueden empezar aquí como tonos simples).
- Registro de `apagon` en `components/games/registry.ts`.
- Control por teclado (flechas/WASD y Espacio/Enter) y por ratón (apuntar y clic) sobre el canvas.
- Niveles: tramo objetivo creciente, mecha más corta y corriente más rápida, con edificios-torre que dan bonus y obras que bloquean casillas.
- Guardado de puntuación vía `saveScore` (spec 08), sin cambios en la base ni en las páginas.

**Fuera de alcance (para otros specs):**

- Sonido completo, partículas, parpadeos y ajustes finos de dificultad (`game-jam/apagon/03-pulido`).
- Vidas: una sola partida continua; el HUD no muestra Vidas.
- Pausa por teclado: solo el botón `PAUSA` de la plataforma.
- Control táctil.
- Piezas especiales (bombas, depósitos, tramos de sentido único).
- Migraciones: la fila `apagon` la crea `game-jam/apagon/01-catalogo`.

---

## Modelo de datos

Este juego no introduce tablas ni columnas. Reutiliza `public.games` y `public.scores`. El estado vive en memoria dentro del motor:

```ts
// lib/apagon/types.ts
export type Side = "n" | "e" | "s" | "w";
// h: horizontal, v: vertical, codos por los lados que une, x: cruce
export type PieceKind = "h" | "v" | "ne" | "nw" | "se" | "sw" | "x";
export type TileRole = "free" | "station" | "tower" | "blocked";
export interface Cell {
  col: number;
  row: number;
}
export interface Tile {
  role: TileRole;
  piece: PieceKind | null; // null = casilla vacía (o central/obra)
  passes: number; // veces que la corriente la ha recorrido (0, 1; 2 solo en cruce)
  lit: boolean; // la corriente ya la ha llenado (no se puede reemplazar)
}
export interface FlowFront {
  cell: Cell; // casilla que se está llenando
  from: Side; // lado por el que entró la corriente
  to: Side; // lado por el que saldrá
  progress: number; // 0..1 dentro de la casilla
}
export type Phase = "fuse" | "flow" | "clear" | "over";
export interface ApagonState {
  tiles: Tile[][]; // [row][col]
  station: Cell;
  stationExit: Side;
  queue: PieceKind[]; // queue[0] es la siguiente pieza
  cursor: Cell;
  phase: Phase;
  fuseLeft: number; // ms hasta que arranca la corriente
  front: FlowFront | null;
  fast: boolean; // ACELERAR pulsado: la corriente va a FAST_FLOW_MS
  placeCooldown: number; // ms de bloqueo tras reemplazar una pieza
  flowed: number; // tramos recorridos en el nivel
  target: number; // tramos que pide el nivel
  level: number;
  score: number;
  clearLeft: number; // ms de la pausa entre niveles
}
```

Conexiones (`board.ts`):

```ts
export const CONNECTS: Record<PieceKind, Side[]> = {
  h: ["e", "w"],
  v: ["n", "s"],
  ne: ["n", "e"],
  nw: ["n", "w"],
  se: ["s", "e"],
  sw: ["s", "w"],
  x: ["n", "e", "s", "w"], // el cruce une n↔s y e↔w, nunca gira
};
export const OPPOSITE: Record<Side, Side> = { n: "s", s: "n", e: "w", w: "e" };
```

Constantes en `lib/apagon/types.ts`:

- **Resolución lógica** `W = 800`, `H = 600` (4:3 del CRT). `MAX_DT = 0.1` s. Paso fijo `STEP_MS = 1000 / 60`.
- **Tablero** `COLS = 10`, `ROWS = 7`, `CELL = 64` px (640×448), con origen `BOARD_X = 144`, `BOARD_Y = 128`.
- **Cola** `QUEUE_SIZE = 5` piezas, columna en `QUEUE_X = 40`, `QUEUE_Y = 128`, ranuras de 64 px separadas `QUEUE_GAP = 8` px. La pieza `queue[0]` va abajo y resaltada.
- **Franja superior** (`y` 0–112): skyline decorativo, barra de la mecha y contador `TRAMOS n/objetivo`. Son paneles auxiliares dentro del canvas (como la "siguiente pieza" de CAÍDA); la puntuación y el nivel los pinta la plataforma.
- **Pesos de piezas** `PIECE_WEIGHTS = { h: 2, v: 2, ne: 2, nw: 2, se: 2, sw: 2, x: 1 }` (13 en total).
- **Mecha** `BASE_FUSE_MS = 15000`, `FUSE_STEP_MS = 1000` por nivel, `MIN_FUSE_MS = 6000`.
- **Corriente** `BASE_FLOW_MS = 2000` ms por casilla, `FLOW_STEP_MS = 150` por nivel, `MIN_FLOW_MS = 700`; con ACELERAR `FAST_FLOW_MS = 120`.
- **Objetivo** `BASE_TARGET = 10` tramos, `TARGET_STEP = 2` por nivel, `MAX_TARGET = 24`.
- **Reemplazo** `REPLACE_MS = 700` ms de bloqueo para colocar tras sustituir una pieza no iluminada.
- **Torres** `towers = min(1 + floor((nivel − 1) / 3), 3)`: casillas con un tramo fijo recto (`h` o `v`), que no se puede reemplazar.
- **Obras** `blocked = min(nivel − 1, 6)`: casillas donde no se puede colocar nada (0 en el nivel 1).
- **Dificultad con tope** `DIFFICULTY_CAP = 10`: a partir del nivel 10 la mecha, la corriente, el objetivo, las torres y las obras no cambian. El nivel sigue subiendo hasta `MAX_LEVEL = 99`.
- **Pausa entre niveles** `CLEAR_MS = 1500`.
- **Puntos:**
  - `CELL_POINTS = 50` por casilla que la corriente termina de llenar; `FAST_CELL_POINTS = 100` si la llena con ACELERAR activo.
  - `CROSS_BONUS = 500` cuando la corriente cruza un cruce `x` por segunda vez.
  - `TOWER_BONUS = 250` cuando la corriente termina de llenar una torre.
  - `LEVEL_BONUS = 500 × nivel` al superar el nivel.
  - La puntuación nunca baja: reemplazar o dejar piezas sin usar no resta.

Generación del tablero (`board.ts`, `createBoard(level, rng)`):

- La central va en una casilla aleatoria a distancia ≥ 2 del borde, con `stationExit` aleatorio entre los 4 lados.
- Torres y obras en casillas aleatorias que no estén en el borde, no sean la central ni la casilla vecina por `stationExit`, ni sean vecinas entre sí. Si en 50 intentos no caben todas, se colocan las que hayan cabido.
- `rng` se inyecta (por defecto `Math.random`) para poder reproducir un tablero al depurar.

Puntuación: entero ≥ 0, más es mejor. Ejemplo: superar el nivel 1 recorriendo justo 10 tramos a velocidad normal da `10 × 50 + 500 = 1000`. Una partida muy larga al tope (nivel 30, ~24 tramos acelerados por nivel) suma unos 30 × 2400 (tramos) + 30 × 3 × 250 (torres) + 500 × (1 + 2 + … + 30) (bonus de nivel) = 72.000 + 22.500 + 232.500 = 327.000, muy por debajo del límite de 10.000.000 del `check` de `scores`.

---

## Plan de implementación

Antes de escribir código, releer `lib/engine/types.ts`, `.agents/skills/arcade-game/references/engine-contract.md` y `lib/serpentina/engine.ts`. Usar el skill `/arcade-game apagon` en la rama `game-apagon`.

1. Crear `lib/apagon/types.ts` con los tipos y constantes de arriba. Verificación: `npx tsc --noEmit`.
2. Crear `lib/apagon/board.ts`: `CONNECTS`, `OPPOSITE`, `randomPiece(rng)` con `PIECE_WEIGHTS`, `exitFor(piece, from)` (devuelve el lado de salida o `null` si la pieza no tiene `from`) y `createBoard(level, rng)`. Verificación: `npx tsc --noEmit` y `npx eslint lib/apagon`.
3. Crear `lib/apagon/audio.ts` con el mismo patrón que `lib/serpentina/audio.ts` y tres sonidos (`place`, `levelUp`, `blackout`). Verificación: `npx tsc --noEmit`.
4. Crear `lib/apagon/engine.ts` (`createApagonGame: CreateEngine`):
   - Bucle `requestAnimationFrame` con acumulador de `STEP_MS`; `dt` acotado a `MAX_DT`.
   - Entrada por `KeyboardEvent.code`: `ArrowUp/Down/Left/Right` y `KeyW/A/S/D` mueven el cursor una casilla (sin salir del tablero); `Space` y `Enter` colocan; `KeyF` activa ACELERAR. `preventDefault` solo para esas teclas y con el foco fuera de campos editables. Ratón: `pointermove` sobre el canvas mueve el cursor a la casilla bajo el puntero (coordenadas escaladas a 800×600) y `pointerdown` coloca.
   - Colocar: en una casilla `free` vacía, pone `queue[0]` y repone la cola. En una `free` con pieza no iluminada, la reemplaza y activa `placeCooldown = REPLACE_MS`. En la central, una torre, una obra o una casilla iluminada no hace nada. Con `placeCooldown > 0` o en las fases `clear`/`over` no hace nada.
   - Fase `fuse`: resta `fuseLeft`; al llegar a 0, o al pulsar ACELERAR, pasa a `flow` con el frente en la casilla vecina a la central por `stationExit`.
   - Fase `flow`: avanza `progress` a razón de `1 / flowMs` (o `1 / FAST_FLOW_MS`). Al entrar en una casilla, si está vacía, es una obra o su pieza no tiene el lado de entrada, se corta la corriente. Al llegar a 1, la casilla queda `lit`, suma `passes`, suma los puntos (`CELL_POINTS`/`FAST_CELL_POINTS`, `TOWER_BONUS`, `CROSS_BONUS` en el segundo paso por un cruce), `flowed + 1`, llama a `onScore`, y el frente pasa a la vecina por `to`. Salir del tablero también corta.
   - Corte: si `flowed ≥ target`, suma `LEVEL_BONUS × nivel`, llama a `onScore`, pasa a `clear` y tras `CLEAR_MS` genera el tablero del nivel siguiente (llama a `onLevel`, vacía la cola y la rellena, `fast = false`). Si `flowed < target`, pasa a `over` y llama a `onGameOver(score)` una sola vez.
   - `reset()`: nivel 1, puntuación 0, tablero nuevo, cola llena, cursor en la central; llama a `onScore(0)` y `onLevel(1)`.
   - `pause/resume/end/restart/setMuted/destroy` según el contrato; `resume` y `restart` reponen `last`; `end` es idempotente; `destroy` cancela el `raf` y quita los listeners de `window` y del canvas, y cierra el audio.
   - Dibujo: fondo, tablero con rejilla, central, torres, obras, piezas (cable apagado en gris azulado `#2a3350`, iluminado en `#f5ff00` con brillo), el frente de corriente avanzando dentro de su casilla, cursor y cola. Barra de la mecha y `TRAMOS n/objetivo` en la franja superior.
     Verificación: `npx tsc --noEmit` y `npx eslint lib/apagon`.
5. Registrar `apagon` en `components/games/registry.ts`. A partir de aquí el juego es jugable y guarda:

   ```ts
   apagon: {
     createEngine: createApagonGame,
     label: "Juego Apagón",
     hud: { lives: false, level: true },
     sound: true,
     controls: "← ↑ ↓ → / RATÓN APUNTAR · ESPACIO / CLIC COLOCAR · F ACELERAR",
   },
   ```

   Verificación: `/juegos/apagon/jugar` muestra el canvas en lugar de la simulación.

6. Probar en el navegador (Playwright MCP) y revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`. Verificación: todos los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `npx eslint lib/apagon components/games` no devuelve errores.
- [ ] `/juegos/apagon/jugar` carga el canvas real (no la simulación) sin errores en la consola.
- [ ] El HUD muestra Puntuación y Nivel, no Vidas, y tiene el botón SILENCIAR.
- [ ] Las flechas y WASD mueven el cursor una casilla y no lo sacan del tablero de 10×7; Espacio y Enter no desplazan la página.
- [ ] Mover el ratón sobre el canvas lleva el cursor a la casilla bajo el puntero y el clic coloca la pieza.
- [ ] Colocar en una casilla vacía pone la pieza de la cola resaltada, y la cola se repone hasta 5.
- [ ] Colocar sobre una pieza no iluminada la reemplaza, y durante 700 ms no se puede colocar otra.
- [ ] No se puede colocar sobre la central, una torre, una obra ni una casilla ya iluminada.
- [ ] En el nivel 1 la corriente arranca a los 15 s y llena una casilla cada 2 s; la barra de la mecha llega a 0 a la vez que arranca.
- [ ] Pulsar F durante la mecha hace arrancar la corriente al momento; pulsarlo durante el flujo la acelera a 120 ms por casilla.
- [ ] Cada casilla que la corriente termina de llenar suma 50 puntos (100 con F activo) y el contador `TRAMOS` sube en 1.
- [ ] Pasar por una torre suma 250 más; cruzar un cruce por segunda vez suma 500 más.
- [ ] Si la corriente se corta con `TRAMOS` ≥ 10 en el nivel 1, suma 500, el HUD pasa a nivel 2 y aparece un tablero nuevo con objetivo 12, mecha de 14 s y una obra.
- [ ] Si la corriente se corta con menos tramos de los que pide el nivel, se abre el modal `FIN DEL JUEGO` con la puntuación final.
- [ ] La corriente se corta al llegar a una casilla vacía, a una obra, a un tramo que no encaja o al borde del tablero.
- [ ] A partir del nivel 10, mecha, velocidad, objetivo, torres y obras dejan de cambiar.
- [ ] La puntuación nunca baja durante la partida.
- [ ] `PAUSA` congela la mecha y la corriente, y `REANUDAR` continúa sin salto; `FIN` termina la partida.
- [ ] `JUGAR DE NUEVO` deja puntuación 0, nivel 1, tablero nuevo y la mecha completa.
- [ ] Hay un solo `onGameOver` por partida, también si se pulsa `FIN` justo cuando se corta la corriente.
- [ ] Con sesión, `GUARDAR PUNTUACIÓN` inserta una fila con `game_id = 'apagon'`; pulsarlo dos veces no la duplica.
- [ ] La partida aparece en `/juegos/apagon` y en `/salon` tras recargar.
- [ ] No se usa `SUPABASE_SERVICE_ROLE_KEY` ni se siembran puntuaciones.
- [ ] Los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí:** mecánica tipo _Pipe Mania_ con cola de 5 piezas **(decidido por game-jam, pendiente de revisar)**. Es un PUZZLE en tiempo real que no duplica CAÍDA (no hay gravedad ni líneas) y se puntúa de forma comparable.
- **Sí:** tablero de 10×7 con casillas de 64 px **(decidido por game-jam, pendiente de revisar)**. Deja sitio a la cola a la izquierda y a la mecha arriba dentro de 800×600.
- **Sí:** mecha de 15 s y corriente a 2 s por casilla en el nivel 1, que bajan 1 s y 150 ms por nivel hasta 6 s y 700 ms **(decidido por game-jam, pendiente de revisar)**. Da tiempo a entender el juego en el nivel 1 y aprieta hacia el 10.
- **Sí:** objetivo de 10 tramos, +2 por nivel con tope 24 **(decidido por game-jam, pendiente de revisar)**.
- **Sí:** 50 por tramo, 100 con ACELERAR, 250 por torre, 500 por cruce doble y 500 × nivel al superarlo **(decidido por game-jam, pendiente de revisar)**. Premia arriesgar (acelerar, cruces) sin disparar la cifra.
- **No:** restar puntos por reemplazar o por piezas sin usar, como el original. La puntuación que baja confunde en un ranking; el castigo es el bloqueo de 700 ms.
- **Sí:** una sola partida sin vidas **(decidido por game-jam, pendiente de revisar)**, como CAÍDA y SERPENTINA. Un fallo es un apagón y termina.
- **Sí:** dificultad con tope en el nivel 10 y nivel máximo 99. El juego sigue siendo jugable y la puntuación acotada.
- **Sí:** torres (bonus) y obras (bloqueo) colocadas al azar lejos del borde y de la salida de la central. Hacen que cada tablero sea distinto sin necesitar niveles diseñados a mano.
- **Sí:** ratón además de teclado. En un juego de colocar piezas apuntar con el ratón es lo natural.
- **Sí:** teclas por `KeyboardEvent.code` y bucle de paso fijo con acumulador. La velocidad no depende de los Hz del monitor.
- **No:** vidas, pausa por teclado, táctil ni piezas especiales (ver Alcance).
- **Sí:** el motor dibuja la cola, la mecha y el contador de tramos; no dibuja puntuación, nivel ni pantalla de fin (los pone la plataforma).

---

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                        |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| La central queda encerrada por torres u obras y el nivel es imposible           | Las torres y obras nunca van en el borde, ni junto a la salida de la central, ni juntas entre sí. |
| `FIN` y el corte de la corriente en el mismo paso disparan dos `onGameOver`     | Bandera `over` comprobada en `end()` y en el corte, como en ROCAS.                                |
| El clic o Espacio colocan pieza a la vez que activan un botón de la plataforma  | `preventDefault` en las teclas del juego y `pointerdown` solo en el canvas.                       |
| Coordenadas del ratón erróneas al escalar el canvas en el CRT                   | Convertir con `getBoundingClientRect()` y la escala `W / rect.width`, `H / rect.height`.          |
| La fuente pixel no está cargada al dibujar `TRAMOS` y sale con otra fuente      | Usar `font-family` con alternativa `monospace`; es un texto auxiliar.                             |
| ACELERAR durante la mecha hace que un jugador rápido gane puntos dobles fáciles | Es el riesgo/recompensa buscado: arrancar antes deja menos tiempo para tender cable.              |
| Trampas: el cliente envía la puntuación                                         | Aceptado por la spec 08 (RLS y `check` de rango); el tope por diseño queda lejos de 10.000.000.   |

---

## Qué **no** está en este spec

- Partículas, parpadeos, sonidos completos y variantes de dificultad (`game-jam/apagon/03-pulido`).
- Vidas, pausa por teclado, control táctil y piezas especiales.
- Cambios en el esquema de Supabase, en `saveScore` o en las páginas del leaderboard.
- Modos de juego (contrarreloj, tablero fijo diario, dos jugadores).

Cada uno, si llega, va en su propio spec.
