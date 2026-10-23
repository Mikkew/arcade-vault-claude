// ===== types.ts — tipos y constantes del motor de Papilla (Frogger contra un sapo) =====
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
  x: number; // px, borde izquierdo en clock = 0 (puede estar fuera de 0..W)
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
export type TurtleState = "up" | "sinking" | "under";
export type Rng = () => number;
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
// Resolución lógica 800×600 (4:3 del CRT) y bucle de paso fijo
export const W = 800;
export const H = 600;
export const MAX_DT = 0.1; // s
export const STEP_MS = 1000 / 60;
// Cuadrícula: 16×12 casillas de 50 px
export const CELL = 50;
export const COLS = 16;
export const ROWS = 12;
export const HOME_ROW = 1;
export const SLOT_COLS = [1, 4, 7, 10, 13]; // cada nenúfar ocupa la columna y la siguiente
export const RIVER_ROWS = [2, 3, 4, 5];
export const MEDIAN_ROW = 6;
export const ROAD_ROWS = [7, 8, 9, 10];
export const START_ROW = 11;
export const PLAYER_START_COL = 5;
export const RIVAL_START_COL = 10;
export const LANE_DEFS: LaneDef[] = [
  {
    row: 2,
    kind: "river",
    obj: "turtles3",
    length: 150,
    count: 4,
    speed: -70,
    dives: true,
  },
  {
    row: 3,
    kind: "river",
    obj: "logLong",
    length: 250,
    count: 3,
    speed: 45,
    dives: false,
  },
  {
    row: 4,
    kind: "river",
    obj: "turtles2",
    length: 100,
    count: 5,
    speed: -90,
    dives: true,
  },
  {
    row: 5,
    kind: "river",
    obj: "logShort",
    length: 150,
    count: 4,
    speed: 65,
    dives: false,
  },
  {
    row: 7,
    kind: "road",
    obj: "truck",
    length: 100,
    count: 3,
    speed: -55,
    dives: false,
  },
  {
    row: 8,
    kind: "road",
    obj: "sports",
    length: 50,
    count: 2,
    speed: 160,
    dives: false,
  },
  {
    row: 9,
    kind: "road",
    obj: "car",
    length: 50,
    count: 4,
    speed: -80,
    dives: false,
  },
  {
    row: 10,
    kind: "road",
    obj: "cart",
    length: 50,
    count: 4,
    speed: 50,
    dives: false,
  },
];
export const WRAP_MARGIN = 250; // px
export const SPAN = W + 2 * WRAP_MARGIN;
export const SPEED_STEP = 0.1;
export const DIFFICULTY_CAP = 10;
export const MAX_LEVEL = 99;
// Desde este nivel los coches de las filas 9 y 10 van de dos en dos (spec 03)
export const PAIR_FROM_LEVEL = 4;
export const PAIR_ROWS = [9, 10];
export const PAIR_GAP = 30; // px entre los dos coches de una pareja
// Tortugas: a flote, hundiéndose (todavía sostienen) y sumergidas
export const TURTLE_CYCLE_MS = 5000;
export const TURTLE_SINK_AT = 3500;
export const TURTLE_UNDER_AT = 4300;
export const TURTLE_PHASE_STEP = 1200; // ms de desfase por índice de grupo
// Rana
export const FROG_HIT = 30; // px de ancho de la caja de colisión
export const VEHICLE_INSET = 4; // px que se reduce cada vehículo por lado
export const HOP_MS = 100;
export const HOP_COOLDOWN_MS = 100;
export const MAX_INPUT_QUEUE = 2;
export const ATTEMPT_MS = 30000;
export const DYING_MS = 1200;
export const HOME_MS = 400;
export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const EXTRA_LIFE_EVERY = 10000;
// Sapo rival
export const RIVAL_BASE_THINK_MS = 650;
export const RIVAL_THINK_STEP = 40;
export const RIVAL_MIN_THINK_MS = 250;
export const RIVAL_BASE_BLUNDER = 0.16;
export const RIVAL_BLUNDER_STEP = 0.012;
export const RIVAL_MIN_BLUNDER = 0.04;
export const RIVAL_LOOKAHEAD_MS = 250;
export const RIVAL_SAMPLE_MS = 50; // paso al comprobar el tramo hasta la próxima decisión
export const RIVAL_RESPAWN_MS = 1500;
export const RIVAL_SLOT_MARGIN = 10; // px dentro del nenúfar para saltar a él
// Rondas
export const ROUND_CLEAR_MS = 2000;
export const SLOTS_TO_WIN = 3;
// Puntos
export const STEP_POINTS = 10;
export const CLAIM_POINTS = 200;
export const TIME_BONUS_PER_S = 10;
export const RIVAL_SPLAT_POINTS = 100;
export const ROUND_WIN_BONUS = 500; // × nivel
// Efectos (spec 03)
export const MAX_SPLATS = 12;
export const SPLAT_PARTICLES = 18;
export const PARTICLE_LIFE_MS = 600;
export const PARTICLE_SPEED = 220; // px/s
export const MAX_PARTICLES = 200;
export const FLOAT_TEXT_MS = 900;
export const FLOAT_TEXT_RISE = 40; // px
export const SHAKE_MS = 180;
export const SHAKE_PX = 4;
export const TAUNT_MS = 1200;
export const RIVAL_TAUNTS = ["¡MÍO!", "CROAC JE JE", "LENTA…", "¡TE GANÉ!"];
export const TIME_WARN_MS = 5000;
export const HORN_COOLDOWN_MS = 2000;
// Paleta neón del CRT
export const PLAYER_COLOR = "#00ff88";
export const RIVAL_COLOR = "#ff006e";
export const BG_COLOR = "#05070d";
export const ASPHALT_COLOR = "#121219";
export const LANE_LINE_COLOR = "rgba(245, 255, 0, 0.55)";
export const RIVER_COLOR = "#061433";
export const BANK_COLOR = "#2a0f24";
export const HEDGE_COLOR = "#0d3a1c";
export const PAD_COLOR = "#14572c";
export const LOG_COLOR = "#7a4a22";
export const TURTLE_COLOR = "#1f9e8a";
export const TIME_COLOR = "#00f5ff";
export const TIME_WARN_COLOR = "#ff2b4d";
export const TEXT_COLOR = "#e8e8ff";
