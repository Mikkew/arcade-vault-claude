# GAME JAM PAPILLA · SPEC 02 — Motor de PAPILLA

> **Estado:** Approved
> **Tema:** Frogger: cruza la carretera y el río sin convertirse en papilla
> **Depende de:** SPEC 07, SPEC 08, game-jam/papilla/01-catalogo
> **Fecha:** 2026-10-22
> **Objetivo:** Sustituir la simulación de PAPILLA por un motor real sobre canvas (una rana que compite con un sapo de la CPU por cinco nenúfares cruzando carretera y río), registrado en `GAME_REGISTRY` y que guarda su puntuación en el leaderboard como los demás juegos reales.

---

## Por qué existe este spec

Tras el spec 01, `papilla` está en el catálogo pero `/juegos/papilla/jugar` solo simula y no escribe en `scores`. Este spec define el juego real. No hay código de referencia en `references/started-games/` (solo Asteroids, Tetris y Arkanoid) ni assets en `references/source-assets/` (solo los de Snake): el motor se escribe desde cero sobre el contrato de `lib/engine/types.ts`, tomando `lib/serpentina/` como modelo de estructura (cuadrícula, bucle por acumulador, `audio.ts` separado) y `lib/asteroids/` para vidas y colisiones.

**Reglas en una frase:** la rana del jugador y un sapo rival controlado por la CPU salen a la vez desde la acera de abajo; cruzan cuatro carriles de tráfico y cuatro de río saltando casilla a casilla, y el primero que entra en un nenúfar libre se lo queda. Cuando los cinco nenúfares tienen dueño, termina la ronda: si el jugador tiene tres o más, gana un bonus; si los tiene el sapo, el jugador pierde una vida. Morir (atropellado, ahogado, arrastrado fuera de la pantalla, sin tiempo, contra el seto o en un nenúfar ocupado) también cuesta una vida. Sin vidas, fin de la partida.

**El giro respecto a RANARIA y al Frogger clásico:** el rival. El jugador ya no solo esquiva: tiene que decidir entre ir seguro o arriesgar para robarle al sapo el nenúfar al que va, y cada vez que el sapo acaba en papilla suma puntos.

---

## Alcance

**Dentro:**

- Motor `lib/papilla/` independiente de React: `types.ts`, `lanes.ts` (carriles, objetos móviles, colisiones), `rival.ts` (IA del sapo), `engine.ts` (bucle, entrada, reglas y dibujo) y `audio.ts` mínimo (salto, papilla y nenúfar como tonos simples; el resto en el spec 03).
- Registro de `papilla` en `components/games/registry.ts`.
- Control por teclado (flechas y WASD).
- Vidas, tiempo por intento, rondas con dificultad creciente y tope.
- Guardado de puntuación vía `saveScore` (spec 08), sin cambios en la base ni en las páginas.

**Fuera de alcance (para otros specs):**

- Sonido completo, manchas persistentes de papilla, partículas, textos flotantes y variantes de dificultad (`game-jam/papilla/03-pulido`).
- Moscas, cocodrilos, serpientes y bonus en los nenúfares (cambiarían la puntuación; irían en su propio spec).
- Colisión o empujones entre la rana y el sapo: se atraviesan.
- Dos jugadores humanos: el rival es siempre la CPU.
- Pausa por teclado: solo el botón `PAUSA` de la plataforma.
- Control táctil y ratón.
- Migraciones: la fila `papilla` la crea `game-jam/papilla/01-catalogo`.

---

## Modelo de datos

Este juego no introduce tablas ni columnas. Reutiliza `public.games` y `public.scores`. El estado vive en memoria dentro del motor:

```ts
// lib/papilla/types.ts
export type LaneKind = "river" | "road";
export type ObjKind =
  | "turtles3" // tortugas de tres
  | "turtles2" // tortugas de dos
  | "logLong"
  | "logShort"
  | "truck" // camión de la basura
  | "sports" // deportivo
  | "car" // utilitario
  | "cart"; // carrito del súper desbocado
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
  speed: number; // px/s ya multiplicada por la dificultad del nivel
  objects: LaneObject[];
}
export type FrogState = "alive" | "dying" | "home";
export type DeathCause = "road" | "water" | "edge" | "time" | "hedge" | "taken";
export interface Frog {
  x: number; // px, centro horizontal (continuo: los troncos la arrastran)
  row: number; // 0..ROWS-1
  state: FrogState;
  timer: number; // ms restantes de la animación de muerte o de llegada
  bestRow: number; // fila más alta alcanzada en este intento (para STEP_POINTS)
  cause: DeathCause | null;
  hopT: number; // ms restantes de la animación de salto (solo visual)
}
export type SlotOwner = "player" | "rival" | null;
export type Phase = "play" | "roundClear" | "over";
export type Move = "up" | "down" | "left" | "right" | "stay";
export interface PapillaState {
  lanes: Lane[];
  player: Frog;
  rival: Frog;
  slots: SlotOwner[]; // 5 nenúfares, de izquierda a derecha
  timeLeft: number; // ms del intento actual del jugador
  rivalThink: number; // ms hasta la siguiente decisión del sapo
  clock: number; // ms de juego (sin pausas), para el buceo de las tortugas
  input: Move[]; // saltos pendientes, máximo MAX_INPUT_QUEUE
  hopCooldown: number; // ms
  phase: Phase;
  clearLeft: number; // ms de la pausa entre rondas
  roundWinner: "player" | "rival" | null;
  level: number; // = número de ronda
  score: number;
  lives: number;
  nextExtraLife: number; // puntuación a la que se gana la siguiente vida
}
```

Constantes en `lib/papilla/types.ts`:

- **Resolución lógica** `W = 800`, `H = 600` (4:3 del CRT). `MAX_DT = 0.1` s. Paso fijo `STEP_MS = 1000 / 60`.
- **Cuadrícula** `CELL = 50` px, `COLS = 16`, `ROWS = 12` (800×600 exactos).
- **Filas** (de arriba abajo):
  - `0` franja auxiliar: marcador de nenúfares `TÚ n · SAPO n` y barra de tiempo (como la "siguiente pieza" de CAÍDA; la puntuación, las vidas y el nivel los pinta la plataforma).
  - `1` orilla de llegada (`HOME_ROW = 1`): cinco nenúfares de 2 columnas, `SLOT_COLS = [1, 4, 7, 10, 13]` (ocupan 1–2, 4–5, 7–8, 10–11 y 13–14). Las columnas 0, 3, 6, 9, 12 y 15 son seto.
  - `2–5` río (`RIVER_ROWS`). `6` mediana segura (`MEDIAN_ROW`). `7–10` carretera (`ROAD_ROWS`). `11` acera de salida (`START_ROW`).
- **Salida** rana en la columna `PLAYER_START_COL = 5`, sapo en `RIVAL_START_COL = 10`, ambos en la fila 11, centrados en su columna.
- **Carriles** `LANE_DEFS` (nivel 1):

  | Fila | Tipo      | Objeto              | Largo (px) | Cantidad | Velocidad (px/s) | Buceo |
  | ---- | --------- | ------------------- | ---------: | -------: | ---------------: | ----- |
  | 2    | río       | tortugas de tres    |        150 |        4 |              −70 | sí    |
  | 3    | río       | tronco largo        |        250 |        3 |              +45 | no    |
  | 4    | río       | tortugas de dos     |        100 |        5 |              −90 | sí    |
  | 5    | río       | tronco corto        |        150 |        4 |              +65 | no    |
  | 7    | carretera | camión de la basura |        100 |        3 |              −55 | —     |
  | 8    | carretera | deportivo           |         50 |        2 |             +160 | —     |
  | 9    | carretera | utilitario          |         50 |        4 |              −80 | —     |
  | 10   | carretera | carrito del súper   |         50 |        4 |              +50 | —     |

- **Envoltura** `WRAP_MARGIN = 250` px: cada carril mide `SPAN = W + 2 × WRAP_MARGIN = 1300` px y sus objetos se reparten a intervalos de `SPAN / count` con un desfase aleatorio por carril al empezar la ronda. Un objeto que sale por un lado reaparece por el otro.
- **Velocidad por nivel** `speed = def.speed × (1 + SPEED_STEP × (min(nivel, DIFFICULTY_CAP) − 1))`, con `SPEED_STEP = 0.1` y `DIFFICULTY_CAP = 10` (×1,9 como máximo).
- **Tortugas** ciclo `TURTLE_CYCLE_MS = 5000`: a flote de 0 a `TURTLE_SINK_AT = 3500` ms, hundiéndose (parpadean, todavía sostienen) hasta `TURTLE_UNDER_AT = 4300` ms y sumergidas (no sostienen) hasta 5000 ms. Solo bucean los grupos de índice par, con desfase `phase = índice × 1200` ms.
- **Rana** caja de colisión `FROG_HIT = 30` px de ancho centrada en `x`; los vehículos se reducen `VEHICLE_INSET = 4` px por lado. Animación de salto `HOP_MS = 100` (solo visual). Entre saltos `HOP_COOLDOWN_MS = 100`. Cola de entrada `MAX_INPUT_QUEUE = 2`.
- **Tiempo** `ATTEMPT_MS = 30000` por intento del jugador; se repone al reaparecer o al llegar a un nenúfar.
- **Muerte y llegada** `DYING_MS = 1200` de animación de papilla antes de reaparecer; `HOME_MS = 400` en el nenúfar antes de volver a la salida.
- **Vidas** `START_LIVES = 3`, `MAX_LIVES = 5`, vida extra cada `EXTRA_LIFE_EVERY = 10000` puntos.
- **Rival** decide cada `rivalThinkMs = max(RIVAL_MIN_THINK_MS, RIVAL_BASE_THINK_MS − RIVAL_THINK_STEP × (min(nivel, DIFFICULTY_CAP) − 1))` con `RIVAL_BASE_THINK_MS = 650`, `RIVAL_THINK_STEP = 40`, `RIVAL_MIN_THINK_MS = 250`. Probabilidad de error `blunder = max(RIVAL_MIN_BLUNDER, RIVAL_BASE_BLUNDER − RIVAL_BLUNDER_STEP × (min(nivel, DIFFICULTY_CAP) − 1))` con `RIVAL_BASE_BLUNDER = 0.16`, `RIVAL_BLUNDER_STEP = 0.012` y `RIVAL_MIN_BLUNDER = 0.04`. Mira `RIVAL_LOOKAHEAD_MS = 250` hacia delante. Reaparece a los `RIVAL_RESPAWN_MS = 1500`. No tiene vidas ni tiempo.
- **Rondas** pausa entre rondas `ROUND_CLEAR_MS = 2000`; `SLOTS_TO_WIN = 3`. `MAX_LEVEL = 99`.
- **Puntos:**
  - `STEP_POINTS = 10` por cada fila nueva más alta que la rana alcanza en el intento (filas 10 a 2: 90 como máximo por cruce). Bajar y volver a subir no suma.
  - `CLAIM_POINTS = 200` al entrar en un nenúfar libre, más `TIME_BONUS_PER_S = 10` por cada segundo entero que quede del intento (hasta 300).
  - `RIVAL_SPLAT_POINTS = 100` cada vez que el sapo muere, por cualquier causa (`¡PAPILLA DE SAPO!`).
  - `ROUND_WIN_BONUS = 500 × nivel` al ganar la ronda (3 o más nenúfares del jugador).
  - La puntuación nunca baja.

Reglas de colisión (`lanes.ts`):

- Posición de un objeto en el instante `clock`: `x = wrap(x0 + speed × clock / 1000)`, con `wrap` dentro de `[−WRAP_MARGIN, W + WRAP_MARGIN)`. Así el sapo puede predecir el futuro sumando `RIVAL_LOOKAHEAD_MS` a `clock`.
- **Carretera:** la rana muere (`road`) si su caja se solapa con la de cualquier vehículo de su fila.
- **Río:** la rana se sostiene si su centro `x` está dentro de un tronco o de un grupo de tortugas que no esté sumergido; si no, se ahoga (`water`). Mientras se sostiene, se desplaza con el carril (`x += speed × dt`). Si su centro sale de `[0, W]`, muere (`edge`).
- **Tierra** (filas 6 y 11): nunca hay peligro; al aterrizar, `x` se ajusta al centro de la columna más cercana.
- **Llegada:** al saltar a la fila 1, la columna `floor(x / CELL)` decide: nenúfar libre → lo reclama; nenúfar con dueño → muere (`taken`); seto → muere (`hedge`).
- **Tiempo:** si `timeLeft` llega a 0, la rana muere (`time`).
- La rana y el sapo no chocan entre sí. Si los dos entran en el mismo nenúfar en el mismo paso, gana el jugador (se procesa primero).

IA del sapo (`rival.ts`, `decideRival(state, rng): Move`):

1. Elige como objetivo el nenúfar libre cuyo centro esté más cerca de su `x`.
2. Una casilla candidata es segura si lo es en `clock` y en `clock + RIVAL_LOOKAHEAD_MS` según las reglas de arriba.
3. Prioridad: `up` si es segura (en la fila 2, solo si su `x` cae dentro del nenúfar objetivo con 10 px de margen) → lateral hacia el objetivo si es segura → `stay` si es segura → `down` si es segura → el otro lateral → `stay`.
4. Con probabilidad `blunder` ignora lo anterior y elige al azar entre `up`, `left`, `right` y `stay`.
5. `rng` se inyecta (por defecto `Math.random`) para poder reproducir partidas al depurar.

Puntuación: entero ≥ 0, más es mejor. Ejemplo: ganar la ronda 1 con 3 nenúfares llegando con 20 s de sobra cada vez da `3 × (90 + 200 + 200) + 500 = 1970`. Una partida muy larga al tope (ronda 30, 5 nenúfares por ronda con ~10 s de sobra y 5 papillas de sapo por ronda) suma unos `30 × (5 × 390 + 500) + 500 × (1 + 2 + … + 30) = 73.500 + 232.500 = 306.000`, muy por debajo del límite de 10.000.000 del `check` de `scores`.

---

## Plan de implementación

Antes de escribir código, releer `lib/engine/types.ts`, `.agents/skills/arcade-game/references/engine-contract.md`, `lib/serpentina/engine.ts` y `lib/asteroids/engine.ts` (vidas). Usar el skill `/arcade-game papilla` en la rama `game-papilla`.

1. Crear `lib/papilla/types.ts` con los tipos y constantes de arriba (incluida `LANE_DEFS`). Verificación: `npx tsc --noEmit`.
2. Crear `lib/papilla/lanes.ts`: `createLanes(level, rng)`, `objectX(obj, lane, clock)`, `turtleState(obj, clock)` (`"up" | "sinking" | "under"`), `roadHit(lane, x, clock)`, `riverSupport(lane, x, clock)` (devuelve el objeto que sostiene o `null`) y `cellSafe(lanes, row, x, clock)`. Verificación: `npx tsc --noEmit` y `npx eslint lib/papilla`.
3. Crear `lib/papilla/rival.ts` con `decideRival` según la IA de arriba, apoyado en `cellSafe`. Verificación: `npx tsc --noEmit`.
4. Crear `lib/papilla/audio.ts` con el mismo patrón que `lib/serpentina/audio.ts` y tres sonidos (`hop`, `splat`, `claim`). Verificación: `npx tsc --noEmit`.
5. Crear `lib/papilla/engine.ts` (`createPapillaGame: CreateEngine`):
   - Bucle `requestAnimationFrame` con acumulador de `STEP_MS`; `dt` acotado a `MAX_DT`. Todo (carriles, tiempo, rival, animaciones) avanza solo en `update(STEP_MS)`.
   - Entrada por `KeyboardEvent.code`: `ArrowUp/Down/Left/Right` y `KeyW/S/A/D`. `preventDefault` solo para esas teclas y con el foco fuera de campos editables. Se ignora `e.repeat`: un salto por pulsación. Las pulsaciones se encolan (máximo 2) y se consume una por paso si `hopCooldown ≤ 0` y la rana está `alive`.
   - Salto: mueve una casilla (`CELL` px en horizontal, una fila en vertical); no sale de las columnas 0–15 en tierra ni baja de la fila 11. Si la fila nueva supera `bestRow`, suma `STEP_POINTS` y llama a `onScore`. Luego aplica las reglas de colisión de la fila de destino.
   - Cada paso, para la rana y el sapo vivos: arrastre en el río y comprobación de carretera, río y borde. Para la rana, además, `timeLeft −= STEP_MS`.
   - Muerte de la rana: estado `dying` durante `DYING_MS`, `lives − 1` y `onLives`. Al terminar la animación, si `lives > 0` reaparece en la salida con `timeLeft = ATTEMPT_MS` y `bestRow = 11`; si no, `gameOver()`.
   - Muerte del sapo: suma `RIVAL_SPLAT_POINTS`, `onScore`, y reaparece en su salida tras `RIVAL_RESPAWN_MS`.
   - Nenúfar: lo marca con su dueño. Si es la rana, suma `CLAIM_POINTS` y el bonus de tiempo, `onScore`, estado `home` durante `HOME_MS` y vuelve a la salida con el tiempo repuesto. Si es el sapo, vuelve a su salida.
   - Cada vez que la puntuación cruza `nextExtraLife`, `lives = min(lives + 1, MAX_LIVES)`, `onLives` y `nextExtraLife += EXTRA_LIFE_EVERY`.
   - Fin de ronda (los 5 nenúfares con dueño): fase `roundClear` durante `ROUND_CLEAR_MS` con el rótulo `¡RONDA PARA TI!` o `EL SAPO GANA LA RONDA`. Si gana el jugador, suma `ROUND_WIN_BONUS × nivel`; si gana el sapo, `lives − 1` y `onLives` (con 0 vidas, `gameOver()` al acabar la pausa). Después: `level + 1` (tope `MAX_LEVEL`), `onLevel`, carriles nuevos con la velocidad del nivel, nenúfares vacíos, ranas en la salida y tiempo repuesto.
   - `gameOver()` pone `over = true` y llama a `onGameOver(score)` una sola vez, también si `end()` llega durante una animación.
   - `reset()`: nivel 1, puntuación 0, 3 vidas, `nextExtraLife = 10000`, carriles del nivel 1, nenúfares vacíos, ranas en la salida, `clock = 0`; llama a `onScore(0)`, `onLives(3)` y `onLevel(1)`.
   - `pause/resume/end/restart/setMuted/destroy` según el contrato; `pause` vacía la cola de entrada; `resume` y `restart` reponen `last`; `end` es idempotente; `destroy` cancela el `raf`, quita los listeners de `window` y cierra el audio.
   - Dibujo (formas por código, sin imágenes): asfalto gris muy oscuro con líneas de carril amarillas discontinuas, río azul noche, aceras y mediana magenta apagado, seto verde oscuro, nenúfares (vacío, con rana verde o con sapo magenta), vehículos con faros, troncos, tortugas (parpadeo al hundirse), la rana `#00ff88` y el sapo `#ff006e` con ojos, y una mancha simple al morir. Franja superior con `TÚ n · SAPO n` y la barra de tiempo (en rojo en los últimos 5 s).
     Verificación: `npx tsc --noEmit` y `npx eslint lib/papilla`.
6. Registrar `papilla` en `components/games/registry.ts`. A partir de aquí el juego es jugable y guarda:

   ```ts
   papilla: {
     createEngine: createPapillaGame,
     label: "Juego Papilla",
     hud: { lives: true, level: true },
     sound: true,
     controls: "← ↑ ↓ → / WASD SALTAR",
   },
   ```

   Verificación: `/juegos/papilla/jugar` muestra el canvas en lugar de la simulación.

7. Probar en el navegador (Playwright MCP) y revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`. Verificación: todos los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `npx eslint lib/papilla components/games` no devuelve errores.
- [ ] `/juegos/papilla/jugar` carga el canvas real (no la simulación) sin errores en la consola.
- [ ] El HUD muestra Puntuación, Vidas (3) y Nivel (1), y tiene el botón SILENCIAR.
- [ ] Cada pulsación de flecha o WASD hace un solo salto de una casilla; mantener la tecla no repite; las flechas no desplazan la página.
- [ ] La rana no sale por los lados en tierra ni baja de la acera de salida.
- [ ] Tocar un vehículo en la carretera, caer al agua, ser arrastrada fuera de la pantalla, agotar los 30 s, saltar al seto o a un nenúfar ocupado quita una vida y la rana reaparece en la salida tras la animación.
- [ ] Sobre un tronco o unas tortugas a flote la rana se desplaza con ellos; sobre tortugas sumergidas se ahoga; mientras parpadean todavía la sostienen.
- [ ] Cada fila nueva más alta del intento suma 10 puntos; bajar y volver a subir no suma.
- [ ] Entrar en un nenúfar libre suma 200 + 10 por segundo restante, el nenúfar queda con la rana dibujada y el marcador `TÚ` sube en 1.
- [ ] El sapo avanza solo, cruza la carretera y el río, reclama nenúfares (el marcador `SAPO` sube) y a veces muere; cada muerte del sapo suma 100 puntos.
- [ ] Si la rana y el sapo llegan al mismo nenúfar en el mismo paso, se lo queda la rana.
- [ ] Al quedar los 5 nenúfares ocupados, con 3 o más de la rana se suman `500 × nivel` y aparece `¡RONDA PARA TI!`; con 3 o más del sapo aparece `EL SAPO GANA LA RONDA` y se pierde una vida.
- [ ] Tras la pausa de 2 s el HUD pasa al nivel siguiente, los nenúfares se vacían y la velocidad de cada carril es la de `LANE_DEFS` × (1 + 0,1 × (nivel − 1)) (×1,1 en el nivel 2).
- [ ] A partir del nivel 10 la velocidad del tráfico y la del sapo dejan de aumentar.
- [ ] Al llegar a 10.000 puntos se gana una vida, sin pasar nunca de 5.
- [ ] La puntuación nunca baja durante la partida.
- [ ] Con 0 vidas se abre el modal `FIN DEL JUEGO` con la puntuación final.
- [ ] `PAUSA` congela el tráfico, el tiempo, las tortugas y el sapo, y `REANUDAR` continúa sin salto; `FIN` termina la partida.
- [ ] `JUGAR DE NUEVO` deja puntuación 0, 3 vidas, nivel 1, nenúfares vacíos y las dos ranas en la salida.
- [ ] Hay un solo `onGameOver` por partida, también si se pulsa `FIN` durante la animación de la última muerte.
- [ ] Con sesión, `GUARDAR PUNTUACIÓN` inserta una fila con `game_id = 'papilla'`; pulsarlo dos veces no la duplica.
- [ ] La partida aparece en `/juegos/papilla` y en `/salon` tras recargar.
- [ ] `/juegos/ranaria/jugar` sigue con la simulación y no escribe en `scores`.
- [ ] No se usa `SUPABASE_SERVICE_ROLE_KEY` ni se siembran puntuaciones.
- [ ] Los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí:** carrera contra un sapo de la CPU por los nenúfares **(decidido por game-jam, pendiente de revisar)**. Es el giro de mecánica que separa PAPILLA de RANARIA y justifica la categoría VERSUS con un ranking de un solo jugador. **No:** un Frogger en solitario con algún extra (moscas, cocodrilos), porque sería RANARIA con otro nombre.
- **Sí:** la rana y el sapo se atraviesan **(decidido por game-jam, pendiente de revisar)**. Empujarse daría más humor pero complica las colisiones y las reglas de llegada; puede ir en un spec propio.
- **Sí:** cuadrícula de 16×12 con casillas de 50 px **(decidido por game-jam, pendiente de revisar)**. Da 800×600 exactos con franja auxiliar, 4 carriles de río, mediana, 4 de carretera y dos aceras.
- **Sí:** cinco nenúfares de 2 columnas **(decidido por game-jam, pendiente de revisar)**. Simétricos en 16 columnas y algo más permisivos que el clásico, porque además hay que pelear con el sapo.
- **Sí:** 3 vidas, 30 s por intento y vida extra cada 10.000 hasta 5 **(decidido por game-jam, pendiente de revisar)**.
- **Sí:** 10 por fila nueva, 200 por nenúfar + 10/s restante, 100 por papilla de sapo y `500 × nivel` por ronda ganada **(decidido por game-jam, pendiente de revisar)**. Premia llegar rápido y ganar rondas; la papilla de sapo es la gracia gamberra sin dominar la cifra.
- **Sí:** perder una vida si el sapo gana la ronda **(decidido por game-jam, pendiente de revisar)**. Sin castigo el rival sería decorado. **No:** terminar la partida al perder una ronda, demasiado duro para un VERSUS contra la CPU.
- **Sí:** el nivel sube en cada ronda, la gane quien la gane. El nivel es la ronda; así la partida avanza aunque el sapo vaya ganando.
- **Sí:** dificultad con tope en el nivel 10 (tráfico ×1,9, sapo cada 290 ms con un 5 % de errores) y nivel máximo 99. El juego sigue siendo jugable y la puntuación acotada.
- **Sí:** IA del sapo con predicción a 250 ms y errores al azar, con `rng` inyectable. Da un rival creíble que a veces acaba en papilla, sin búsqueda de caminos.
- **Sí:** teclas por `KeyboardEvent.code`, un salto por pulsación y bucle de paso fijo con acumulador. La velocidad no depende de los Hz del monitor.
- **Sí:** todo dibujado con formas en el canvas. No hay sprites de Frogger en `references/source-assets/` y así se evita una cuestión de licencias.
- **No:** ratón ni táctil. Un Frogger se juega con cuatro direcciones y el ratón no aporta nada.
- **Sí:** el motor dibuja el marcador de nenúfares, la barra de tiempo y los rótulos de ronda; no dibuja puntuación, vidas, nivel ni pantalla de fin (los pone la plataforma).

---

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| El sapo es imbatible o inútil y el juego deja de ser divertido      | Todos sus parámetros son constantes en `types.ts`; se ajustan jugando, y el spec 03 puede retocar la curva. |
| El sapo se queda atascado en la mediana sin hueco seguro            | La prioridad incluye `stay` y `down`; el error al azar lo desatasca.                                        |
| `FIN` y la última muerte en el mismo paso disparan dos `onGameOver` | Bandera `over` comprobada en `end()` y en `gameOver()`, como en ROCAS.                                      |
| Saltos perdidos o dobles con pulsaciones rápidas                    | Cola de 2 saltos, `HOP_COOLDOWN_MS` y `e.repeat` ignorado.                                                  |
| Tortugas que se sumergen justo al aterrizar parecen injustas        | Fase de parpadeo de 800 ms en la que todavía sostienen.                                                     |
| Pausar a mitad de un ciclo de buceo provoca un salto al reanudar    | El ciclo usa `clock`, que solo avanza en `update`; `resume` repone `last`.                                  |
| Dos juegos de rana en el catálogo                                   | Ver _Decisiones_ del spec 01; el giro del rival y la categoría VERSUS los diferencian.                      |
| Trampas: el cliente envía la puntuación                             | Aceptado por la spec 08 (RLS y `check` de rango); el tope por diseño queda lejos de 10.000.000.             |

---

## Qué **no** está en este spec

- Manchas persistentes, partículas, textos flotantes, sonidos completos y variantes de dificultad (`game-jam/papilla/03-pulido`).
- Moscas, cocodrilos, serpientes, bonus en nenúfares y empujones entre ranas.
- Pausa por teclado, ratón, control táctil y dos jugadores humanos.
- Cualquier cambio en RANARIA.
- Cambios en el esquema de Supabase, en `saveScore` o en las páginas del leaderboard.

Cada uno, si llega, va en su propio spec.
