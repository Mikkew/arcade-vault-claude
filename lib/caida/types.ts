// ===== types.ts — tipos y constantes del motor de Caída (Tetris) =====
export type Board = number[][];
export interface Piece {
  type: number; // índice en PIECES / COLORS
  shape: number[][];
  x: number; // columna de la esquina superior izquierda
  y: number; // fila de la esquina superior izquierda
}
// Resolución lógica del canvas
export const W = 800;
export const H = 600;
export const MAX_DT = 0.05; // s
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30; // px
export const BOARD_X = 120; // px, esquina del tablero
export const BOARD_Y = 0; // px
export const PANEL_X = 460; // px, panel lateral (siguiente y líneas)
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const LINES_PER_LEVEL = 10;
export const BASE_DROP_MS = 1000; // ms por fila en nivel 1
export const DROP_STEP_MS = 90; // ms menos por nivel
export const MIN_DROP_MS = 100; // ms
export const SOFT_DROP_POINTS = 1; // por celda
export const HARD_DROP_POINTS = 2; // por celda
export const KICKS = [0, -1, 1, -2, 2];
// Autorrepetición táctil de ← → ↓ (el teclado usa la del sistema)
export const TOUCH_REPEAT_DELAY = 170; // ms hasta la primera repetición
export const TOUCH_REPEAT_RATE = 50; // ms entre repeticiones
// Índice = tipo de pieza (0 = vacío): I, O, T, S, Z, J, L, N (tuerca)
export const PIECES: (number[][] | null)[] = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  [[2, 2], [2, 2]],
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]],
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]],
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]],
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]],
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]],
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]],
];
// Paleta neón de la plataforma
export const COLORS: (string | null)[] = [
  null,
  "#00f5ff", // I
  "#f5ff00", // O
  "#ff006e", // T
  "#00ff88", // S
  "#ff5c8a", // Z
  "#4d8dff", // J
  "#ffa23a", // L
  "#c7d0e0", // N
];
export const GRID_LINE = "rgba(0, 245, 255, 0.12)";
export const FRAME_COLOR = "rgba(0, 245, 255, 0.45)";
export const LABEL_COLOR = "#8a8fb5";
export const VALUE_COLOR = "#e6e9ff";
