// ===== sprites.ts — recortes del spritesheet de Bloque Buster =====
import type { BlockColor, Frame } from "./types";
const frame = (sx: number, sy: number, sw: number, sh: number): Frame => ({
  sx,
  sy,
  sw,
  sh,
});
export const PADDLE_SPRITE = frame(32, 112, 162, 14);
export const BALL_SPRITE = frame(32, 32, 16, 16);
export const BLOCK_SPRITES: Record<BlockColor, Frame> = {
  gray: frame(32, 288, 32, 16),
  red: frame(32, 176, 32, 16),
  yellow: frame(32, 240, 32, 16),
  cyan: frame(32, 192, 32, 16),
  magenta: frame(32, 224, 32, 16),
  hotpink: frame(32, 256, 32, 16),
  green: frame(32, 208, 32, 16),
};
// Fila del spritesheet (sy) de la animación de cada color; 4 cuadros de 32×16
const EXPLOSION_ROW: Record<BlockColor, number> = {
  red: 176,
  cyan: 192,
  green: 208,
  magenta: 224,
  yellow: 240,
  hotpink: 256,
  gray: 176, // el original reutiliza la animación roja
};
export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = Object.fromEntries(
  (Object.keys(EXPLOSION_ROW) as BlockColor[]).map((c) => [
    c,
    [0, 1, 2, 3].map((i) => frame(256 + i * 32, EXPLOSION_ROW[c], 32, 16)),
  ]),
) as Record<BlockColor, Frame[]>;
