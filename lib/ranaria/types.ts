// ===== types.ts — tipos y constantes del motor de Ranaria (rescate de renacuajos de ida y vuelta) =====
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
export type TurtleState = "up" | "sinking" | "under";
export type Rng = () => number;
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
// Resolución lógica 800×600 (4:3 del CRT) y bucle de paso fijo
export const W = 800;
export const H = 600;
export const MAX_DT = 0.1; // s
export const STEP_MS = 1000 / 60;
// Cuadrícula: 16×12 casillas de 50 px
export const CELL = 50;
export const COLS = 16;
export const ROWS = 12;
export const NORTH_ROW = 1; // orilla norte con las charcas
export const POND_COLS = [1, 4, 7, 10, 13]; // cada charca ocupa la columna y la siguiente
export const RIVER_ROWS = [2, 3, 4, 5];
export const MEDIAN_ROW = 6;
export const ROAD_ROWS = [7, 8, 9, 10];
export const HOME_ROW = 11; // estanque de casa: salida y entrega
export const START_COL = 7;
export const LANE_DEFS: LaneDef[] = [
  {
    row: 2,
    kind: "river",
    obj: "turtles3",
    length: 150,
    count: 4,
    speed: -60,
    dives: true,
  },
  {
    row: 3,
    kind: "river",
    obj: "logLong",
    length: 200,
    count: 3,
    speed: 40,
    dives: false,
  },
  {
    row: 4,
    kind: "river",
    obj: "turtles2",
    length: 100,
    count: 5,
    speed: -80,
    dives: true,
  },
  {
    row: 5,
    kind: "river",
    obj: "logMid",
    length: 150,
    count: 4,
    speed: 55,
    dives: false,
  },
  {
    row: 7,
    kind: "road",
    obj: "truck",
    length: 150,
    count: 3,
    speed: -50,
    dives: false,
  },
  {
    row: 8,
    kind: "road",
    obj: "sports",
    length: 50,
    count: 2,
    speed: 150,
    dives: false,
  },
  {
    row: 9,
    kind: "road",
    obj: "car",
    length: 50,
    count: 4,
    speed: -75,
    dives: false,
  },
  {
    row: 10,
    kind: "road",
    obj: "van",
    length: 100,
    count: 3,
    speed: 45,
    dives: false,
  },
];
export const WRAP_MARGIN = 250; // px
export const SPAN = W + 2 * WRAP_MARGIN;
export const SPEED_STEP = 0.15;
export const DIFFICULTY_CAP = 10;
export const MAX_LEVEL = 99;
// Tortugas: a flote, hundiéndose (todavía sostienen) y sumergidas
export const TURTLE_CYCLE_MS = 4500;
export const TURTLE_SINK_AT = 3000;
export const TURTLE_UNDER_AT = 3700;
export const TURTLE_PHASE_STEP = 1100; // ms de desfase por índice de grupo
// Rana
export const FROG_HIT = 30; // px de ancho de la caja de colisión
export const VEHICLE_INSET = 4; // px que se reduce cada vehículo por lado
export const HOP_MS = 120;
export const HOP_COOLDOWN_MS = 120;
export const MAX_INPUT_QUEUE = 2;
export const DYING_MS = 1200;
export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const EXTRA_LIFE_EVERY = 10000;
// Tiempo por viaje (ida y vuelta)
export const TRIP_BASE_MS = 40000;
export const TRIP_STEP_MS = 2000;
export const TRIP_MIN_MS = 22000;
export const tripMs = (level: number): number =>
  Math.max(
    TRIP_MIN_MS,
    TRIP_BASE_MS - TRIP_STEP_MS * (Math.min(level, DIFFICULTY_CAP) - 1),
  );
// Inversión de carriles y rondas
export const FLIP_BANNER_MS = 1000;
export const TADPOLES = 5;
export const ROUND_CLEAR_MS = 2000;
// Puntos
export const STEP_POINTS = 10;
export const PICKUP_POINTS = 50;
export const RESCUE_POINTS = 200;
export const TIME_BONUS_PER_S = 10;
export const ROUND_BONUS = 500; // × nivel
// Barra de tiempo en rojo en los últimos segundos
export const TIME_WARN_MS = 5000;
// Paleta clásica del CRT
export const FROG_COLOR = "#7dff3a";
export const TADPOLE_COLOR = "#0b0b12";
export const BG_COLOR = "#05070d";
export const ASPHALT_COLOR = "#121219";
export const LANE_LINE_COLOR = "rgba(245, 255, 0, 0.55)";
export const RIVER_COLOR = "#061433";
export const GRASS_COLOR = "#0f3a1a";
export const REED_COLOR = "rgba(125, 255, 58, 0.22)";
export const POND_COLOR = "#1a4f9c";
export const LOG_COLOR = "#7a4a22";
export const TURTLE_COLOR = "#1f9e8a";
export const FLIP_COLOR = "#ffd23f";
export const TIME_COLOR = "#00f5ff";
export const TIME_WARN_COLOR = "#ff2b4d";
export const TEXT_COLOR = "#e8e8ff";
