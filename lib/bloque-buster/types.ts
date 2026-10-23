// ===== types.ts — tipos y constantes del motor de Bloque Buster (Arkanoid) =====
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}
export interface Ball extends Rect {
  vx: number; // px/s
  vy: number; // px/s
}
export interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number; // ms
}
export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export interface LevelDef {
  speed: number; // multiplicador de la velocidad base de la bola
  blocks: { col: number; row: number; color: BlockColor }[];
}
// Resolución lógica del canvas
export const W = 800;
export const H = 600;
export const MAX_DT = 0.05; // s
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_W = 81; // px
export const PADDLE_H = 14; // px
export const PADDLE_Y = 560; // px
export const BALL_SIZE = 16; // px
export const BASE_BALL_VX = 200; // px/s
export const BASE_BALL_VY = -300; // px/s
export const PADDLE_BOUNCE_MARGIN = 8; // px de tolerancia bajo la cara de la pala
export const BLOCK_COLS = 10;
export const BLOCK_W = 64; // px
export const BLOCK_H = 24; // px
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // px
export const BLOCKS_ORIGIN_Y = 80; // px
export const BLOCK_POINTS = 10;
export const START_LIVES = 3;
export const EXPLOSION_DURATION = 150; // ms
export const SPRITE_URL = "/games/bloque-buster/spritesheet-breakout.png";
export const BOUNCE_SOUND_URL = "/games/bloque-buster/ball-bounce.mp3";
export const BREAK_SOUND_URL = "/games/bloque-buster/break-sound.mp3";
// Los colores de cada skin (y los de reserva sin spritesheet) viven en palettes.ts
