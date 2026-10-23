// ===== lanes.ts — carriles, objetos móviles y colisiones de Papilla =====
// Las posiciones dependen solo de clock: así el sapo puede mirar al futuro.
import {
  CELL,
  COLS,
  DIFFICULTY_CAP,
  FROG_HIT,
  HOME_ROW,
  LANE_DEFS,
  PAIR_FROM_LEVEL,
  PAIR_GAP,
  PAIR_ROWS,
  SPAN,
  START_ROW,
  SPEED_STEP,
  TURTLE_CYCLE_MS,
  TURTLE_PHASE_STEP,
  TURTLE_SINK_AT,
  TURTLE_UNDER_AT,
  VEHICLE_INSET,
  W,
  WRAP_MARGIN,
  type Frog,
  type Lane,
  type LaneObject,
  type Move,
  type Rng,
  type TurtleState,
} from "./types";
export const speedFactor = (level: number) =>
  1 + SPEED_STEP * (Math.min(level, DIFFICULTY_CAP) - 1);
// Envuelve x dentro de [−WRAP_MARGIN, W + WRAP_MARGIN)
const wrap = (x: number) =>
  ((((x + WRAP_MARGIN) % SPAN) + SPAN) % SPAN) - WRAP_MARGIN;
export function createLanes(level: number, rng: Rng): Lane[] {
  const factor = speedFactor(level);
  return LANE_DEFS.map((def) => {
    // Desfase aleatorio por carril: dos rondas seguidas no repiten patrón
    const offset = rng() * SPAN;
    const paired = level >= PAIR_FROM_LEVEL && PAIR_ROWS.includes(def.row);
    const objects: LaneObject[] = [];
    for (let i = 0; i < def.count; i++) {
      const x = paired
        ? offset +
          Math.floor(i / 2) * (SPAN / Math.ceil(def.count / 2)) +
          (i % 2) * (def.length + PAIR_GAP)
        : offset + i * (SPAN / def.count);
      const dives = def.dives && i % 2 === 0;
      objects.push({
        x: wrap(x),
        length: def.length,
        dives,
        phase: i * TURTLE_PHASE_STEP,
      });
    }
    return { def, speed: def.speed * factor, objects };
  });
}
export const laneAt = (lanes: Lane[], row: number) =>
  lanes.find((l) => l.def.row === row);
export const objectX = (obj: LaneObject, lane: Lane, clock: number) =>
  wrap(obj.x + (lane.speed * clock) / 1000);
export function turtleState(obj: LaneObject, clock: number): TurtleState {
  if (!obj.dives) return "up";
  const t = (clock + obj.phase) % TURTLE_CYCLE_MS;
  if (t < TURTLE_SINK_AT) return "up";
  if (t < TURTLE_UNDER_AT) return "sinking";
  return "under";
}
export function roadHit(lane: Lane, x: number, clock: number): boolean {
  const left = x - FROG_HIT / 2;
  const right = x + FROG_HIT / 2;
  return lane.objects.some((o) => {
    const ox = objectX(o, lane, clock);
    return left < ox + o.length - VEHICLE_INSET && right > ox + VEHICLE_INSET;
  });
}
export function riverSupport(
  lane: Lane,
  x: number,
  clock: number,
): LaneObject | null {
  for (const o of lane.objects) {
    const ox = objectX(o, lane, clock);
    if (x >= ox && x <= ox + o.length && turtleState(o, clock) !== "under")
      return o;
  }
  return null;
}
// ¿Se puede estar en esa casilla en ese instante? La orilla de llegada se
// resuelve aparte, porque depende de los nenúfares.
export function cellSafe(
  lanes: Lane[],
  row: number,
  x: number,
  clock: number,
): boolean {
  if (row <= HOME_ROW) return true;
  const lane = laneAt(lanes, row);
  if (!lane) return true; // mediana y acera
  if (lane.def.kind === "road") return !roadHit(lane, x, clock);
  return x >= 0 && x <= W && riverSupport(lane, x, clock) !== null;
}
// Distancia horizontal del vehículo más cercano de la fila (para la bocina)
export function nearestVehicleGap(
  lane: Lane,
  x: number,
  clock: number,
): number {
  let best = Infinity;
  for (const o of lane.objects) {
    const ox = objectX(o, lane, clock);
    const gap = Math.max(
      ox - (x + FROG_HIT / 2),
      x - FROG_HIT / 2 - (ox + o.length),
      0,
    );
    best = Math.min(best, gap);
  }
  return best;
}
export const colCenter = (col: number) => col * CELL + CELL / 2;
export const snapX = (x: number) =>
  colCenter(Math.min(COLS - 1, Math.max(0, Math.round((x - CELL / 2) / CELL))));
// Casilla de destino de un salto. En tierra y carretera la x se ajusta a la
// cuadrícula y no sale de las columnas; en el río conserva la x continua.
export function hopTarget(frog: Frog, move: Move): { row: number; x: number } {
  let { row, x } = frog;
  if (move === "up") row = Math.max(HOME_ROW, row - 1);
  else if (move === "down") row = Math.min(START_ROW, row + 1);
  else if (move === "left") x -= CELL;
  else if (move === "right") x += CELL;
  const river = LANE_DEFS.some((d) => d.row === row && d.kind === "river");
  if (!river && row > HOME_ROW) x = snapX(x);
  return { row, x };
}
