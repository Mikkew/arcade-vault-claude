// ===== types.ts — tipos y constantes del motor de Serpentina (Snake) =====
export interface Cell {
  x: number; // columna
  y: number; // fila
}
export type Dir = "up" | "down" | "left" | "right";
export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
// Cuadrícula: 20×15 celdas de 40 px = resolución lógica 800×600
export const COLS = 20;
export const ROWS = 15;
export const CELL = 40; // px
export const W = COLS * CELL;
export const H = ROWS * CELL;
export const MAX_DT = 0.1; // s
export const START_LENGTH = 3; // segmentos
export const FRUITS_PER_LEVEL = 5;
export const MAX_LEVEL = 10;
export const BASE_TICK = 150; // ms entre pasos en el nivel 1
export const TICK_STEP = 10; // ms que se acorta el paso por nivel
export const MIN_TICK = 60; // ms
export const FRUIT_POINTS = 10; // por nivel: comer en el nivel n suma 10·n
export const MAX_INPUT_QUEUE = 2; // giros pendientes
export const SPRITE_URL = "/games/serpentina/fruits.png";
export const FRUIT_PADDING = 3; // px entre la fruta y el borde de la celda
// Los colores de cada skin viven en palettes.ts
