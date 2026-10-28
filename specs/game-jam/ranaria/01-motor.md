# GAME JAM RANARIA · SPEC 01 — Motor de RANARIA: Renacuajos

> **Estado:** Approved
> **Tema:** Cruza la autopista y el río… y vuelve
> **Depende de:** SPEC 07, SPEC 08, SPEC 10
> **Fecha:** 2026-10-26
> **Objetivo:** Sustituir la simulación de RANARIA (`ranaria`) por un motor real sobre canvas en el que la rana cruza carretera y río para rescatar cinco renacuajos y traerlos de vuelta al estanque, con el tráfico en sentido contrario durante la vuelta. El motor se registra en `GAME_REGISTRY`, admite controles táctiles y guarda su puntuación en el leaderboard como los demás juegos reales.

---

## Por qué existe este spec

RANARIA está en el catálogo desde el spec 07 (`ARCADE`, `green`, `cover-rana`, `sort_order = 7`), pero `/juegos/ranaria/jugar` solo ejecuta la simulación de `GamePlayer` y no escribe en `scores`.

Este spec nace de `specs/game-jam/frogger/01-frogger-core.md`. De él se aprovecha la base de un juego de cruzar carriles: saltos de una casilla, coches y camiones, troncos y tortugas que se sumergen, tres vidas, una barra de tiempo y velocidad creciente por nivel. Se descarta lo que no encaja con el repo: un componente React con bucle propio, rutas `/games` y `/hall-of-fame`, `user_id: null` (el RLS de `scores` lo rechaza) y la ausencia de controles táctiles (la spec 10 los exige).

**Reglas en una frase:** en la orilla norte hay cinco renacuajos perdidos, cada uno en su charca. La rana sale del estanque de abajo, cruza la carretera y el río, recoge uno y tiene que bajarlo al estanque. **En cuanto lleva un renacuajo a cuestas, todos los carriles cambian de sentido**, y vuelven al sentido original al entregarlo. Cinco rescates completan la ronda. Morir (atropellada, ahogada, arrastrada fuera de la pantalla o sin tiempo) cuesta una vida, y el renacuajo que llevaba vuelve a su charca.

**El giro respecto a PAPILLA y al Frogger clásico:** no se llenan bocas ni se compite con un rival. Cada rescate es un viaje de ida y vuelta, y en la vuelta el mapa que acabas de aprender se comporta al revés.

No hay código de referencia en `references/started-games/` ni assets en `references/source-assets/` para este juego. El motor se escribe desde cero sobre el contrato de `lib/engine/types.ts`, tomando `lib/papilla/` como modelo de estructura (cuadrícula 16×12, carriles, colisiones, `setInput`) y `lib/serpentina/audio.ts` para el sonido.

---

## Alcance

**Dentro:**

- Migración nueva `supabase/migrations/<timestamp>_ranaria_texto.sql` que solo actualiza `short` y `long` de la fila `ranaria`. El texto actual habla de "llegar a los nenúfares", que ya no describe el juego.
- Motor `lib/ranaria/` independiente de React: `types.ts`, `lanes.ts` (carriles, movimiento, inversión y colisiones), `audio.ts` (salto, papilla, recoger y entregar) y `engine.ts` (bucle, entrada, reglas y dibujo).
- Registro de `ranaria` en `components/games/registry.ts`, con el skin `clasico` y una cruceta táctil de cuatro direcciones.
- Control por teclado (flechas y WASD) y táctil (`setInput`, spec 10).
- Vidas, tiempo por viaje, rondas con dificultad creciente y tope.
- Guardado de la puntuación vía `saveScore` (`app/juegos/[id]/jugar/actions.ts`, spec 08), sin cambios en `scores` ni en las páginas.

**Fuera de alcance (para otros specs):**

- Skins `neon` y `retro` y su `palettes.ts`. Los propondrá `skin-designer` en `specs/skins/`.
- Partículas, textos flotantes, manchas persistentes y sonido elaborado. Irían en un `02-pulido`.
- Moscas, cocodrilos, serpientes, sapo rival u otros bonus que cambien la puntuación.
- Pausa por teclado: solo el botón `PAUSA` de la plataforma.
- Ratón.
- Cambios en PAPILLA, en el esquema de `scores`, en `saveScore` o en las páginas del leaderboard.
- Puntuaciones sembradas o de ejemplo (prohibidas por la spec 08).

---

## Modelo de datos

No hay tablas ni columnas nuevas. Solo cambia el texto de una fila que ya existe:

```sql
-- supabase/migrations/<timestamp>_ranaria_texto.sql
-- RANARIA pasa de simulación a juego real (game-jam/ranaria/01-motor).
-- Solo se actualiza el texto del catálogo; la fila, su portada, su color,
-- su sort_order y las políticas RLS de games no cambian.
update public.games
set
  short = 'Rescata a los renacuajos. Ida y vuelta.',
  long = 'Cinco renacuajos se han perdido al otro lado de la autopista y el río. Ve a por ellos de uno en uno y tráelos al estanque, pero cuidado: en cuanto llevas uno a cuestas, todo el tráfico cambia de sentido.'
where id = 'ranaria';
```

El estado del juego vive en memoria dentro del motor:

```ts
// lib/ranaria/types.ts
export type LaneKind = "river" | "road";
export type ObjKind =
  | "turtles3" // tortugas de tres
  | "turtles2" // tortugas de dos
  | "logLong" // tronco de 4 casillas
  | "logMid" // tronco de 3 casillas
  | "truck" // camión, 3 casillas
  | "van" // furgoneta, 2 casillas
  | "car" // utilitario
  | "sports"; // deportivo
export interface LaneDef {
  row: number;
  kind: LaneKind;
  obj: ObjKind;
  length: number; // px de cada objeto
  count: number; // objetos en el carril
  speed: number; // px/s en el nivel 1; positivo hacia la derecha
  dives: boolean; // tortugas que se sumergen (grupos pares)
}
export interface LaneObject {
  x: number; // px, borde izquierdo (puede estar fuera de 0..W)
  length: number;
  dives: boolean;
  phase: number; // ms de desfase en el ciclo de buceo
}
export interface Lane {
  def: LaneDef;
  speed: number; // px/s ya multiplicada por la dificultad del nivel (sin el signo de la inversión)
  objects: LaneObject[];
}
export type FrogState = "alive" | "dying";
export type DeathCause = "road" | "water" | "edge" | "time";
export interface Frog {
  x: number; // px, centro horizontal (continuo: los troncos la arrastran)
  row: number; // 0..ROWS-1
  state: FrogState;
  timer: number; // ms restantes de la animación de muerte
  bestUp: number; // fila más alta alcanzada en la ida (para STEP_POINTS)
  bestDown: number; // fila más baja alcanzada en la vuelta (para STEP_POINTS)
  carrying: number | null; // índice de la charca cuyo renacuajo lleva, o null
  cause: DeathCause | null;
  hopT: number; // ms restantes de la animación de salto (solo visual)
}
export type TadpoleState = "waiting" | "carried" | "rescued";
export type Phase = "play" | "roundClear" | "over";
export type Move = "up" | "down" | "left" | "right";
export interface RanariaState {
  lanes: Lane[];
  frog: Frog;
  tadpoles: TadpoleState[]; // 5, una por charca, de izquierda a derecha
  reversed: boolean; // true mientras la rana lleva un renacuajo
  flipBanner: number; // ms restantes del rótulo ¡A CONTRAMANO!
  timeLeft: number; // ms del viaje actual
  clock: number; // ms de juego (sin pausas), para el buceo de las tortugas
  input: Move[]; // saltos pendientes, máximo MAX_INPUT_QUEUE
  hopCooldown: number; // ms
  phase: Phase;
  clearLeft: number; // ms de la pausa entre rondas
  level: number; // = número de ronda
  score: number;
  lives: number;
  nextExtraLife: number; // puntuación a la que se gana la siguiente vida
}
```

Constantes en `lib/ranaria/types.ts`:

- **Resolución lógica:** `W = 800`, `H = 600` (el 4:3 del CRT, como PAPILLA). `MAX_DT = 0.1` s. Paso fijo `STEP_MS = 1000 / 60`.
- **Cuadrícula:** `CELL = 50` px, `COLS = 16`, `ROWS = 12`.
- **Filas** (de arriba abajo):
  - `0`: franja auxiliar con el marcador de renacuajos (cinco iconos: en la charca, a cuestas, rescatado) y la barra de tiempo. La puntuación, las vidas y el nivel los pinta la plataforma.
  - `1`: orilla norte (`NORTH_ROW = 1`). Es tierra segura en todo su ancho. Tiene cinco charcas de 2 columnas en `POND_COLS = [1, 4, 7, 10, 13]` (ocupan 1–2, 4–5, 7–8, 10–11 y 13–14), con un renacuajo cada una al empezar la ronda.
  - `2–5`: río (`RIVER_ROWS`). `6`: mediana segura (`MEDIAN_ROW`). `7–10`: carretera (`ROAD_ROWS`).
  - `11`: estanque de casa (`HOME_ROW = 11`). Es tierra segura, punto de salida y de entrega.
- **Salida:** la rana empieza en la columna `START_COL = 7`, fila 11, centrada en su columna.
- **Carriles** `LANE_DEFS` (nivel 1, sentido de ida):

  | Fila | Tipo      | Objeto           | Largo (px) | Cantidad | Velocidad (px/s) | Buceo |
  | ---- | --------- | ---------------- | ---------: | -------: | ---------------: | ----- |
  | 2    | río       | tortugas de tres |        150 |        4 |              −60 | sí    |
  | 3    | río       | tronco largo     |        200 |        3 |              +40 | no    |
  | 4    | río       | tortugas de dos  |        100 |        5 |              −80 | sí    |
  | 5    | río       | tronco medio     |        150 |        4 |              +55 | no    |
  | 7    | carretera | camión           |        150 |        3 |              −50 | —     |
  | 8    | carretera | deportivo        |         50 |        2 |             +150 | —     |
  | 9    | carretera | utilitario       |         50 |        4 |              −75 | —     |
  | 10   | carretera | furgoneta        |        100 |        3 |              +45 | —     |

- **Envoltura:** `WRAP_MARGIN = 250` px. Cada carril mide `SPAN = W + 2 × WRAP_MARGIN = 1300` px y sus objetos se reparten a intervalos de `SPAN / count`, con un desfase aleatorio por carril al empezar la ronda. Con esas cantidades y largos siempre queda un hueco de al menos una casilla entre objetos. Un objeto que sale por un lado reaparece por el otro.
- **Movimiento:** las posiciones se integran paso a paso, `x += velocidadEfectiva × STEP_MS / 1000`, con `velocidadEfectiva = lane.speed × (reversed ? −1 : 1)`. No se calculan a partir de `clock`, para que la inversión no haga saltar los objetos.
- **Velocidad por nivel:** `lane.speed = def.speed × (1 + SPEED_STEP × (min(nivel, DIFFICULTY_CAP) − 1))`, con `SPEED_STEP = 0.15` y `DIFFICULTY_CAP = 10` (×2,35 como máximo).
- **Tortugas:** ciclo `TURTLE_CYCLE_MS = 4500`. Están a flote de 0 a `TURTLE_SINK_AT = 3000` ms, se hunden (parpadean y todavía sostienen) hasta `TURTLE_UNDER_AT = 3700` ms y están sumergidas (no sostienen) hasta 4500 ms. Solo bucean los grupos de índice par, con desfase `phase = índice × 1100` ms. El ciclo usa `clock`.
- **Rana:** caja de colisión `FROG_HIT = 30` px de ancho centrada en `x`. Los vehículos se reducen `VEHICLE_INSET = 4` px por lado. Animación de salto `HOP_MS = 120` (solo visual: la casilla cambia al empezar el salto). Entre saltos, `HOP_COOLDOWN_MS = 120`. Cola de entrada `MAX_INPUT_QUEUE = 2`.
- **Tiempo por viaje:** `tripMs(nivel) = max(TRIP_MIN_MS, TRIP_BASE_MS − TRIP_STEP_MS × (min(nivel, DIFFICULTY_CAP) − 1))`, con `TRIP_BASE_MS = 40000`, `TRIP_STEP_MS = 2000` y `TRIP_MIN_MS = 22000`. Un viaje es la ida y la vuelta. El tiempo se repone al entregar un renacuajo y al reaparecer.
- **Inversión:** `FLIP_BANNER_MS = 1000` para el rótulo `¡A CONTRAMANO!` al recoger un renacuajo.
- **Muerte:** `DYING_MS = 1200` de animación antes de reaparecer.
- **Vidas:** `START_LIVES = 3`, `MAX_LIVES = 5`, vida extra cada `EXTRA_LIFE_EVERY = 10000` puntos.
- **Rondas:** `TADPOLES = 5`, pausa entre rondas `ROUND_CLEAR_MS = 2000`, `MAX_LEVEL = 99`.
- **Puntos:**
  - `STEP_POINTS = 10` por cada fila nueva más alta en la ida (filas 10 a 1: 100 como máximo) y por cada fila nueva más baja en la vuelta (filas 2 a 11: 100 como máximo). Retroceder y volver a avanzar no suma.
  - `PICKUP_POINTS = 50` al recoger un renacuajo.
  - `RESCUE_POINTS = 200` al entregarlo en el estanque, más `TIME_BONUS_PER_S = 10` por cada segundo entero que quede del viaje.
  - `ROUND_BONUS = 500 × nivel` al rescatar los cinco.
  - La puntuación nunca baja.

Reglas (`lanes.ts` y `engine.ts`):

- **Carretera:** la rana muere (`road`) si su caja se solapa con la de cualquier vehículo de su fila.
- **Río:** la rana se sostiene si su centro `x` está dentro de un tronco o de un grupo de tortugas que no esté sumergido. Si no, se ahoga (`water`). Mientras se sostiene, se desplaza con el carril a su velocidad efectiva. Si su centro sale de `[0, W]`, muere (`edge`).
- **Tierra** (filas 1, 6 y 11): nunca hay peligro. Al aterrizar, `x` se ajusta al centro de la columna más cercana. La rana no sale de las columnas 0–15 ni de las filas 1–11.
- **Recoger:** al aterrizar en la fila 1 sin carga, si la columna `floor(x / CELL)` cae en una charca con su renacuajo en `waiting`, la rana lo recoge: `carrying = índice`, renacuajo `carried`, `reversed = true`, `flipBanner = FLIP_BANNER_MS`, `bestDown = 1`, `PICKUP_POINTS`. En una charca vacía o en la orilla no pasa nada.
- **Entregar:** al aterrizar en la fila 11 con carga: renacuajo `rescued`, `carrying = null`, `reversed = false`, `RESCUE_POINTS` + bonus de tiempo, `timeLeft = tripMs(nivel)` y `bestUp = 11`.
- **Tiempo:** `timeLeft` baja en cada paso de juego con la rana viva. Si llega a 0, la rana muere (`time`).
- **Muerte:** estado `dying` durante `DYING_MS`. Si llevaba un renacuajo, este vuelve a `waiting` y `reversed = false` en el mismo paso. Se resta una vida y se llama a `onLives`. Al terminar la animación, si quedan vidas reaparece en la salida con `timeLeft = tripMs(nivel)`, `bestUp = 11` y `carrying = null`. Si no, `gameOver()`.

La inversión ocurre solo al recoger (fila 1) o al entregar o morir. En los dos primeros casos la rana está en tierra, así que el cambio de sentido nunca la mata.

Puntuación: entero ≥ 0, más es mejor. Ejemplo: completar la ronda 1 entregando cada renacuajo con 15 s de sobra da `5 × (100 + 100 + 50 + 200 + 150) + 500 = 3.500`. Cota: un rescate vale como mucho `100 + 100 + 50 + 200 + 400 = 850`, así que una ronda vale como mucho `4.250 + 500 × nivel`. Llegar al nivel 99 sumaría unos `99 × 4.250 + 500 × (1 + … + 99) = 420.750 + 2.475.000 ≈ 2,9 millones`, muy por debajo del límite de 10.000.000 del `check` de `scores`.

---

## Plan de implementación

Antes de escribir código, releer `lib/engine/types.ts`, `.agents/skills/arcade-game/references/engine-contract.md`, `lib/papilla/` (`types.ts`, `lanes.ts` y `engine.ts`, sobre todo `setInput` y la cola de saltos) y `lib/serpentina/audio.ts`. Usar el skill `/arcade-game ranaria` en la rama `game-ranaria`.

1. **Migración del texto.** Cargar los skills `supabase` y `supabase-postgres-best-practices`, comprobar la fila con `list_tables` / `execute_sql` (solo lectura) y crear `supabase/migrations/<timestamp>_ranaria_texto.sql` con el `update` del modelo de datos. Aplicarla con la Supabase MCP. Verificación: `/juegos` y `/juegos/ranaria` muestran el texto nuevo; portada, color y orden no cambian.
2. **Crear `lib/ranaria/types.ts`** con los tipos y constantes de arriba (incluida `LANE_DEFS` y `tripMs`). Verificación: `npx tsc --noEmit`.
3. **Crear `lib/ranaria/lanes.ts`:** `createLanes(level, rng)`, `advanceLanes(lanes, reversed, dtMs)`, `turtleState(obj, clock)` (`"up" | "sinking" | "under"`), `roadHit(lane, x)` y `riverSupport(lane, x, clock)` (devuelve el objeto que sostiene o `null`). Verificación: `npx tsc --noEmit` y `npx eslint lib/ranaria`.
4. **Crear `lib/ranaria/audio.ts`** con el patrón de `lib/serpentina/audio.ts` y cuatro sonidos: `hop`, `splat`, `pickup` y `rescue`. Verificación: `npx tsc --noEmit`.
5. **Crear `lib/ranaria/engine.ts`** (`createRanariaGame: CreateEngine`):
   - Bucle `requestAnimationFrame` con acumulador de `STEP_MS` y `dt` acotado a `MAX_DT`. Todo (carriles, tiempo, tortugas y animaciones) avanza solo en `update(STEP_MS)`.
   - Entrada por `KeyboardEvent.code`: `ArrowUp/Down/Left/Right` y `KeyW/S/A/D`. `preventDefault` solo para esas teclas y con el foco fuera de campos editables. Se ignora `e.repeat`, así que hay un salto por pulsación. Las pulsaciones se encolan (máximo 2) y se consume una por paso si `hopCooldown ≤ 0`, la rana está `alive` y la fase es `play`. P y Esc no hacen nada.
   - `setInput(action, pressed)`: al pulsar `up/down/left/right` se encola el mismo salto que con la tecla. Soltar y las acciones `a`/`b` se ignoran.
   - Salto: mueve una casilla (`CELL` px en horizontal o una fila en vertical) dentro de los límites, suma `STEP_POINTS` si la fila es nueva en la dirección del viaje (ida sin carga hacia arriba, vuelta con carga hacia abajo), llama a `onScore` y aplica las reglas de la fila de destino (recoger, entregar o colisión).
   - Cada paso con la rana viva: arrastre en el río, comprobación de carretera, río y borde, y `timeLeft −= STEP_MS`.
   - Muerte, recogida y entrega según las reglas de arriba.
   - Cada vez que la puntuación cruza `nextExtraLife`: `lives = min(lives + 1, MAX_LIVES)`, `onLives` y `nextExtraLife += EXTRA_LIFE_EVERY`.
   - Fin de ronda (los 5 renacuajos `rescued`): fase `roundClear` durante `ROUND_CLEAR_MS` con el rótulo `¡CHARCA COMPLETA!`, `ROUND_BONUS` y `onScore`. Después: `level + 1` (tope `MAX_LEVEL`), `onLevel`, carriles nuevos con la velocidad del nivel, renacuajos en `waiting`, `reversed = false`, rana en la salida y `timeLeft = tripMs(level)`.
   - `gameOver()` pone `phase = "over"` y llama a `onGameOver(score)` una sola vez, también si `end()` llega durante la animación de la última muerte.
   - `reset()`: nivel 1, puntuación 0, 3 vidas, `nextExtraLife = 10000`, carriles del nivel 1, renacuajos en `waiting`, `reversed = false`, rana en la salida y `clock = 0`. Llama a `onScore(0)`, `onLives(3)` y `onLevel(1)`.
   - `pause/resume/end/restart/setMuted/setSkin/destroy` según el contrato: `pause` vacía la cola de entrada; `resume` y `restart` reponen `last`; `end` es idempotente; `setSkin` no hace nada (solo hay `clasico`); `destroy` cancela el `raf`, quita los listeners de `window` y cierra el audio.
   - Dibujo con formas, sin imágenes: asfalto gris muy oscuro con líneas de carril discontinuas, río azul noche, mediana y estanque verde oscuro, orilla norte con juncos, charcas azules con un renacuajo negro de cola ondulante, vehículos con faros orientados según su sentido, troncos con vetas, tortugas que parpadean al hundirse, la rana verde brillante con ojos (con el renacuajo dibujado encima cuando lo lleva) y una mancha simple al morir. Mientras `reversed` es true, flechas tenues en los bordes de cada carril indican el sentido nuevo, y durante `flipBanner` se muestra `¡A CONTRAMANO!` en el centro. La franja superior muestra los cinco renacuajos y la barra de tiempo (en rojo en los últimos 5 s).
     Verificación: `npx tsc --noEmit` y `npx eslint lib/ranaria`.
6. **Registrar `ranaria`** en `components/games/registry.ts`. A partir de aquí el juego es jugable y guarda puntuaciones:

   ```ts
   ranaria: {
     createEngine: createRanariaGame,
     label: "Juego Ranaria",
     hud: { lives: true, level: true },
     sound: true,
     controls: "← ↑ ↓ → / WASD SALTAR",
     skins: ["clasico"],
     touch: { dpad: ["up", "down", "left", "right"] },
   },
   ```

   Verificación: `/juegos/ranaria/jugar` muestra el canvas en lugar de la simulación.

7. **Verificación final:** probar en el navegador (Playwright MCP; en móvil, emulación con puntero grueso) y revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`. Verificación: todos los criterios de aceptación.

---

## Criterios de aceptación

- [ ] La migración nueva actualiza `short` y `long` de `ranaria`; `/juegos` y `/juegos/ranaria` muestran el texto nuevo con la misma portada, color y orden.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `/juegos/ranaria/jugar` carga el canvas real (no la simulación) sin errores en la consola.
- [ ] El HUD muestra Puntuación, Vidas (3) y Nivel (1), y tiene el botón SILENCIAR. No aparece el selector de SKIN.
- [ ] La rana aparece centrada en el estanque de casa al empezar.
- [ ] Cada pulsación de flecha o WASD hace un solo salto de una casilla con animación de 120 ms; mantener la tecla no repite; las flechas no desplazan la página.
- [ ] La rana no sale por los lados en tierra, no baja del estanque y no sube más allá de la orilla norte.
- [ ] Los vehículos, troncos y tortugas se mueven en bucle por sus carriles y reaparecen por el lado opuesto.
- [ ] Las tortugas de los grupos pares alternan a flote, parpadeo y sumergidas con el ciclo definido; mientras parpadean todavía sostienen.
- [ ] Tocar un vehículo, caer al agua, ser arrastrada fuera de la pantalla o agotar el tiempo quita una vida, y la rana reaparece en el estanque tras la animación.
- [ ] Sobre un tronco o unas tortugas a flote la rana se desplaza con ellos; sobre tortugas sumergidas se ahoga.
- [ ] Al aterrizar en una charca con renacuajo, la rana lo recoge (+50), lo lleva dibujado encima, el marcador lo muestra a cuestas, aparece `¡A CONTRAMANO!` y **todos los carriles invierten su sentido** sin saltos de posición.
- [ ] Al entregar el renacuajo en el estanque se suman 200 + 10 por segundo restante, el marcador lo muestra rescatado, los carriles vuelven a su sentido original y el tiempo se repone.
- [ ] Si la rana muere cargando, el renacuajo vuelve a su charca y los carriles recuperan su sentido original.
- [ ] Una charca vacía no da nada y no mata.
- [ ] Cada fila nueva de la ida y de la vuelta suma 10 puntos; retroceder y volver a avanzar no suma.
- [ ] Al rescatar los 5 renacuajos se suman `500 × nivel`, aparece `¡CHARCA COMPLETA!` y, tras 2 s, el HUD pasa al nivel siguiente con los renacuajos de vuelta en sus charcas.
- [ ] En el nivel 2 la velocidad de cada carril es la de `LANE_DEFS` × 1,15 y el tiempo por viaje es de 38 s; a partir del nivel 10 ninguno de los dos cambia (×2,35 y 22 s).
- [ ] Al llegar a 10.000 puntos se gana una vida, sin pasar nunca de 5.
- [ ] La puntuación nunca baja durante la partida.
- [ ] Con 0 vidas se abre el modal `FIN DEL JUEGO` con la puntuación final.
- [ ] `PAUSA` congela el tráfico, el tiempo y las tortugas, y `REANUDAR` continúa sin salto; P y Esc no pausan; `FIN` termina la partida.
- [ ] `JUGAR DE NUEVO` deja puntuación 0, 3 vidas, nivel 1, los cinco renacuajos en sus charcas, los carriles en su sentido original y la rana en la salida.
- [ ] Hay un solo `onGameOver` por partida, también si se pulsa `FIN` durante la animación de la última muerte.
- [ ] Con puntero grueso aparece la cruceta de cuatro direcciones bajo el CRT, y cada toque equivale a la tecla correspondiente.
- [ ] Con sesión, `GUARDAR PUNTUACIÓN` inserta una fila con `game_id = 'ranaria'`; pulsarlo dos veces no la duplica.
- [ ] La partida aparece en `/juegos/ranaria` y en `/salon` tras recargar.
- [ ] No se usa `SUPABASE_SERVICE_ROLE_KEY` ni se siembran puntuaciones.
- [ ] PAPILLA y los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí: motor real para RANARIA en lugar de un juego nuevo `frogger`.** La fila ya existe, con portada y orden, y el catálogo no gana un tercer juego del mismo género. **No:** el id `frogger` ni el título FROGGER de la spec de origen.
- **Sí: rescate de ida y vuelta con los carriles invertidos durante la vuelta (pendiente de revisar).** Es el giro que separa RANARIA de PAPILLA (carrera contra el sapo) y del Frogger clásico (llenar bocas): la vuelta obliga a releer un mapa que ya conoces. **No:** llenar bocas en la orilla norte.
- **Sí: la inversión solo ocurre con la rana en tierra o al morir.** Así nunca mata por sorpresa. El rótulo y las flechas dejan claro el cambio.
- **Sí: posiciones integradas paso a paso, no calculadas desde `clock`.** Con una función de `clock`, invertir el sentido haría saltar todos los objetos. **No:** reutilizar `objectX` de PAPILLA tal cual.
- **Sí: morir cargando devuelve el renacuajo a su charca.** Perder el progreso del viaje es el castigo justo; perder también el renacuajo sería demasiado duro.
- **Sí: cuadrícula 16×12 de 50 px (800×600) con tierra segura en las filas 1, 6 y 11 (pendiente de revisar).** Mismo lienzo 4:3 que PAPILLA, así que el CRT y `GameCanvas` no cambian. **No:** el canvas de 640×560 de la spec de origen, que no es 4:3.
- **Sí: 3 vidas, 40 s por viaje (22 s como mínimo), +15 % de velocidad por nivel con tope en el 10 y vida extra cada 10.000 hasta 5 (pendiente de revisar).** El 15 % viene de la spec de origen; el tope mantiene el juego jugable y la puntuación acotada.
- **Sí: 10 por fila nueva en cada sentido, 50 al recoger, 200 + 10/s al entregar y `500 × nivel` por ronda (pendiente de revisar).** Premia completar el viaje deprisa; la recogida suma poco porque lo difícil es la vuelta.
- **Sí: el salto cambia la casilla al empezar y la animación de 120 ms es solo visual.** Es como lo hace PAPILLA y evita estados intermedios en las colisiones.
- **Sí: controles táctiles con cruceta de cuatro direcciones.** La spec 10 los exige para todo juego real. **No:** la exclusión de táctil de la spec de origen.
- **Sí: solo el skin `clasico`.** Igual que CAÍDA y PAPILLA al entrar; `skin-designer` propondrá `neon` y `retro` en `specs/skins/`.
- **Sí: el motor dibuja el marcador de renacuajos, la barra de tiempo y los rótulos; no dibuja puntuación, vidas, nivel ni pantalla de fin.** Los pone la plataforma. **No:** el HUD doble de la spec de origen.
- **Sí: guardado con `saveScore` y sesión iniciada.** **No:** `user_id: null`, `av_player_name` ni inserción directa desde el cliente, que el RLS de `scores` rechaza (spec 08).
- **Sí: todo dibujado con formas en el canvas.** No hay assets para este juego en `references/source-assets/`.

---

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| La inversión desorienta tanto que la vuelta resulta injusta             | Ocurre solo con la rana en tierra, con rótulo de 1 s y flechas en los carriles; las velocidades son constantes en `types.ts` y se ajustan jugando. |
| Objetos que saltan de posición al invertir el sentido                   | Posiciones integradas paso a paso; la inversión solo cambia el signo de la velocidad.                         |
| Se confunde RANARIA con PAPILLA                                         | Categorías distintas (ARCADE frente a VERSUS), objetivo distinto (rescate frente a carrera) y texto de catálogo nuevo. |
| `FIN` y la última muerte en el mismo paso disparan dos `onGameOver`     | Fase `over` comprobada en `end()` y en `gameOver()`, como en ROCAS y PAPILLA.                                  |
| Saltos perdidos o dobles con pulsaciones rápidas o toques               | Cola de 2 saltos, `HOP_COOLDOWN_MS`, `e.repeat` ignorado y `setInput` que solo actúa al pulsar.                |
| Tortugas que se sumergen justo al aterrizar parecen injustas            | Fase de parpadeo de 700 ms en la que todavía sostienen.                                                        |
| Pausar a mitad de un ciclo de buceo provoca un salto al reanudar        | El ciclo usa `clock`, que solo avanza en `update`; `resume` repone `last`.                                     |
| Trampas: el cliente envía la puntuación                                 | Aceptado por la spec 08 (RLS y `check` de rango); la cota del diseño queda lejos de 10.000.000.                |

---

## Qué **no** está en este spec

- Skins `neon` y `retro`.
- Partículas, textos flotantes, manchas persistentes y sonido elaborado.
- Moscas, cocodrilos, serpientes, sapo rival y cualquier bonus que cambie la puntuación.
- Pausa por teclado y ratón.
- Cambios en PAPILLA, en el esquema de Supabase (aparte del texto de `ranaria`), en `saveScore` o en las páginas del leaderboard.
- La spec de origen `specs/game-jam/frogger/01-frogger-core.md`, que no se modifica.

Cada uno, si llega, va en su propio spec.
