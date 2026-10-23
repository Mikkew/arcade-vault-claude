// ===== sprites.ts — recortes de fruits.png (fila de pixel art, 3790×442) =====
import type { SerpentinaPalette } from "./palettes";
import type { Frame } from "./types";
// Fila de fruits.png que usan todos los recortes
export const STRIP_Y = 136;
export const STRIP_H = 160;
const frame = (sx: number, sw: number): Frame => ({
  sx,
  sy: STRIP_Y,
  sw,
  sh: STRIP_H,
});
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
// ── Recoloreado de la tira de frutas según el skin ──
// Luminancia relativa WCAG en espacio lineal
const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (c: number) =>
  255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const luminance = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;
const parseHex = (hex: string): [number, number, number] => {
  const h =
    hex.length === 4
      ? [...hex.slice(1)].map((c) => c + c).join("")
      : hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
};
// Aclara, conservando el matiz, los píxeles opacos con contraste < minContrast sobre bg.
// Escala en lineal; si un canal satura, mezcla poco a poco hacia blanco.
export function liftPixels(
  data: Uint8ClampedArray,
  bg: string,
  minContrast: number,
): void {
  const lbg = luminance(
    ...(parseHex(bg).map(toLinear) as [number, number, number]),
  );
  const target = minContrast * (lbg + 0.05) - 0.05;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    let c = [toLinear(data[i]), toLinear(data[i + 1]), toLinear(data[i + 2])];
    if (luminance(c[0], c[1], c[2]) >= target) continue;
    for (let n = 0; n < 40; n++) {
      const l = luminance(c[0], c[1], c[2]);
      if (l >= target) break;
      if (l > 0) c = c.map((v) => Math.min(1, (v * target) / l));
      else c = [target, target, target];
      if (luminance(c[0], c[1], c[2]) < target)
        c = c.map((v) => v + (1 - v) * 0.05);
    }
    // Redondeo hacia arriba para no perder el margen al pasar a 8 bits
    data[i] = Math.min(255, Math.ceil(toSrgb(c[0])));
    data[i + 1] = Math.min(255, Math.ceil(toSrgb(c[1])));
    data[i + 2] = Math.min(255, Math.ceil(toSrgb(c[2])));
  }
}
// Reduce cada recorte a 3 tonos de fósforo según la luminancia de cada píxel
// frente a la del color dominante del recorte; el alfa queda en 0 o 255.
export function phosphorPixels(
  data: Uint8ClampedArray,
  width: number,
  frames: Frame[],
  tones: { shade: string; base: string; light: string },
): void {
  const [shade, base, light] = [tones.shade, tones.base, tones.light].map(
    parseHex,
  );
  const lumAt = (i: number) =>
    luminance(toLinear(data[i]), toLinear(data[i + 1]), toLinear(data[i + 2]));
  for (const f of frames) {
    // Color dominante: el más repetido entre los píxeles opacos del recorte
    const counts = new Map<number, number>();
    let dom = -1;
    let domCount = 0;
    for (let y = 0; y < f.sh; y++)
      for (let x = f.sx; x < f.sx + f.sw; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128) continue;
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        const c = (counts.get(key) ?? 0) + 1;
        counts.set(key, c);
        if (c > domCount) [dom, domCount] = [key, c];
      }
    const ldom =
      dom < 0
        ? 0
        : luminance(
            toLinear(dom >> 16),
            toLinear((dom >> 8) & 255),
            toLinear(dom & 255),
          );
    for (let y = 0; y < f.sh; y++)
      for (let x = f.sx; x < f.sx + f.sw; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128) {
          data[i + 3] = 0;
          continue;
        }
        const l = lumAt(i);
        const tone = l < 0.85 * ldom ? shade : l > 1.15 * ldom ? light : base;
        data[i] = tone[0];
        data[i + 1] = tone[1];
        data[i + 2] = tone[2];
        data[i + 3] = 255;
      }
  }
}
// Tira de STRIP_H px recoloreada en un canvas fuera de pantalla; los recortes
// se leen con sy - STRIP_Y. Puede lanzar si la imagen viene de otro origen.
export function buildFruitStrip(
  img: HTMLImageElement,
  fruit: SerpentinaPalette["fruit"],
  bg: string,
): HTMLCanvasElement {
  const strip = document.createElement("canvas");
  strip.width = img.width;
  strip.height = STRIP_H;
  const sctx = strip.getContext("2d");
  if (!sctx) throw new Error("No se pudo obtener el contexto 2D de la tira");
  sctx.drawImage(img, 0, STRIP_Y, img.width, STRIP_H, 0, 0, img.width, STRIP_H);
  const pixels = sctx.getImageData(0, 0, strip.width, strip.height);
  if (fruit.mode === "lift") liftPixels(pixels.data, bg, fruit.minContrast);
  else phosphorPixels(pixels.data, strip.width, FRUIT_FRAMES, fruit);
  sctx.putImageData(pixels, 0, 0);
  return strip;
}
