// ===== sprites.ts — recortes de fruits.png (fila de pixel art, 3790×442) =====
import type { Frame } from "./types";
const frame = (sx: number, sw: number): Frame => ({ sx, sy: 136, sw, sh: 160 });
export const FRUIT_FRAMES: Frame[] = [
  frame(34, 110), // banana
  frame(186, 150), // naranja
  frame(378, 110), // uvas
  frame(540, 130), // ajo
  frame(712, 130), // berenjena
  frame(894, 110), // fresa
  frame(1066, 110), // cerezas
  frame(1228, 130), // zanahoria
  frame(1400, 130), // seta
  frame(1582, 110), // brócoli
  frame(1734, 150), // sandía
  frame(1906, 150), // pimiento
  frame(2068, 170), // kiwi
  frame(2250, 140), // limón
  frame(2432, 130), // melocotón
  frame(2604, 130), // cacahuete
  frame(2786, 110), // manzana
  frame(2948, 130), // tomate
  frame(3110, 150), // frambuesa
  frame(3454, 150), // piña
  frame(3637, 130), // melón
];
