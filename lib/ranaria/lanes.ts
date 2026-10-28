// ===== lanes.ts — carriles, objetos móviles, inversión y colisiones de Ranaria =====
// Las posiciones se integran paso a paso: invertir el sentido solo cambia el
// signo de la velocidad y ningún objeto salta de sitio.
import {
  CELL,
  COLS,
  DIFFICULTY_CAP,
  FROG_HIT,
  HOME_ROW,
  LANE_DEFS,
  NORTH_ROW,
  SPAN,
  SPEED_STEP,
  TURTLE_CYCLE_MS,
  TURTLE_PHASE_STEP,
  TURTLE_SINK_AT,
  TURTLE_UNDER_AT,
  VEHICLE_INSET,
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
    const objects: LaneObject[] = [];
    for (let i = 0; i < def.count; i++) {
      objects.push({
        x: wrap(offset + i * (SPAN / def.count)),
        length: def.length,
        dives: def.dives && i % 2 === 0,
        phase: i * TURTLE_PHASE_STEP,
      });
    }
    return { def, speed: def.speed * factor, objects };
  });
}
// Velocidad con el signo de la inversión (px/s)
export const effectiveSpeed = (lane: Lane, reversed: boolean) =>
  reversed ? -lane.speed : lane.speed;
export function advanceLanes(
  lanes: Lane[],
  reversed: boolean,
  dtMs: number,
): void {
  for (const lane of lanes) {
    const dx = (effectiveSpeed(lane, reversed) * dtMs) / 1000;
    for (const o of lane.objects) o.x = wrap(o.x + dx);
  }
}
export const laneAt = (lanes: Lane[], row: number) =>
  lanes.find((l) => l.def.row === row);
export function turtleState(obj: LaneObject, clock: number): TurtleState {
  if (!obj.dives) return "up";
  const t = (clock + obj.phase) % TURTLE_CYCLE_MS;
  if (t < TURTLE_SINK_AT) return "up";
  if (t < TURTLE_UNDER_AT) return "sinking";
  return "under";
}
export function roadHit(lane: Lane, x: number): boolean {
  const left = x - FROG_HIT / 2;
  const right = x + FROG_HIT / 2;
  return lane.objects.some(
    (o) => left < o.x + o.length - VEHICLE_INSET && right > o.x + VEHICLE_INSET,
  );
}
export function riverSupport(
  lane: Lane,
  x: number,
  clock: number,
): LaneObject | null {
  for (const o of lane.objects) {
    if (x >= o.x && x <= o.x + o.length && turtleState(o, clock) !== "under")
      return o;
  }
  return null;
}
export const colCenter = (col: number) => col * CELL + CELL / 2;
export const snapX = (x: number) =>
  colCenter(Math.min(COLS - 1, Math.max(0, Math.round((x - CELL / 2) / CELL))));
const isRiverRow = (row: number) =>
  LANE_DEFS.some((d) => d.row === row && d.kind === "river");
// Casilla de destino de un salto. Fuera del río la x se ajusta a la cuadrícula
// y no sale de las columnas; en el río conserva la x continua.
export function hopTarget(frog: Frog, move: Move): { row: number; x: number } {
  let { row, x } = frog;
  if (move === "up") row = Math.max(NORTH_ROW, row - 1);
  else if (move === "down") row = Math.min(HOME_ROW, row + 1);
  else if (move === "left") x -= CELL;
  else if (move === "right") x += CELL;
  if (!isRiverRow(row)) x = snapX(x);
  return { row, x };
}
