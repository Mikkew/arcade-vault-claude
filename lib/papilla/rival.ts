// ===== rival.ts — IA del sapo de Papilla =====
// Sin búsqueda de caminos: mira 250 ms al futuro y a veces se equivoca.
import { cellSafe, hopTarget, laneAt } from "./lanes";
import {
  CELL,
  DIFFICULTY_CAP,
  HOME_ROW,
  RIVAL_BASE_BLUNDER,
  RIVAL_BASE_THINK_MS,
  RIVAL_BLUNDER_STEP,
  RIVAL_LOOKAHEAD_MS,
  RIVAL_MIN_BLUNDER,
  RIVAL_MIN_THINK_MS,
  RIVAL_SAMPLE_MS,
  RIVAL_SLOT_MARGIN,
  RIVAL_THINK_STEP,
  SLOT_COLS,
  type Move,
  type PapillaState,
  type Rng,
} from "./types";
const capped = (level: number) => Math.min(level, DIFFICULTY_CAP) - 1;
export const rivalThinkMs = (level: number) =>
  Math.max(
    RIVAL_MIN_THINK_MS,
    RIVAL_BASE_THINK_MS - RIVAL_THINK_STEP * capped(level),
  );
export const rivalBlunder = (level: number) =>
  Math.max(
    RIVAL_MIN_BLUNDER,
    RIVAL_BASE_BLUNDER - RIVAL_BLUNDER_STEP * capped(level),
  );
export const slotCenter = (i: number) => (SLOT_COLS[i] + 1) * CELL;
export function decideRival(state: PapillaState, rng: Rng = Math.random): Move {
  const { rival, lanes, slots, clock } = state;
  if (rng() < rivalBlunder(state.level)) {
    const moves: Move[] = ["up", "left", "right", "stay"];
    return moves[Math.floor(rng() * moves.length)];
  }
  // Objetivo: el nenúfar libre más cercano
  let target = -1;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] !== null) continue;
    if (
      target < 0 ||
      Math.abs(slotCenter(i) - rival.x) < Math.abs(slotCenter(target) - rival.x)
    )
      target = i;
  }
  if (target < 0) return "stay";
  const goal = slotCenter(target);
  const safe = (move: Move) => {
    const { row, x } = hopTarget(rival, move);
    if (row === HOME_ROW) {
      const left = SLOT_COLS[target] * CELL + RIVAL_SLOT_MARGIN;
      const right = (SLOT_COLS[target] + 2) * CELL - RIVAL_SLOT_MARGIN;
      return x >= left && x <= right;
    }
    // El sapo se queda en la casilla hasta su próxima decisión: se comprueba
    // todo ese tramo (al menos RIVAL_LOOKAHEAD_MS) a intervalos cortos.
    // En el río la casilla viaja con el tronco: se predice dónde estará.
    const lane = laneAt(lanes, row);
    const speed = lane?.def.kind === "river" ? lane.speed : 0;
    const horizon = Math.max(RIVAL_LOOKAHEAD_MS, rivalThinkMs(state.level));
    for (let t = 0; t <= horizon; t += RIVAL_SAMPLE_MS)
      if (!cellSafe(lanes, row, x + (speed * t) / 1000, clock + t))
        return false;
    return cellSafe(lanes, row, x + (speed * horizon) / 1000, clock + horizon);
  };
  const dx = goal - rival.x;
  const toward: Move | null =
    Math.abs(dx) <= RIVAL_SLOT_MARGIN ? null : dx > 0 ? "right" : "left";
  const away: Move = toward === "right" ? "left" : "right";
  const order: Move[] = ["up"];
  if (toward) order.push(toward);
  order.push("stay", "down", toward ? away : "left");
  for (const m of order) if (safe(m)) return m;
  return "stay";
}
