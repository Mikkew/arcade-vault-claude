// ===== palettes.ts — colores, estilos y efectos de cada skin de Serpentina =====
// Contraste medido contra el `bg` de cada skin: ver specs/skins/03-skins-serpentina.md
import type { SkinFx } from "@/lib/engine/skin-fx";
import type { SkinId } from "@/lib/engine/skins";
export interface SerpentinaPalette {
  bg: string; // fondo del canvas (luminancia ≤ 0,05)
  grid: string; // líneas de la cuadrícula (decoración)
  gridLine: number; // px
  body: string; // segmentos del cuerpo: relleno ("fill") o trazo ("outline")
  head: string; // relleno de la cabeza (siempre sólido)
  dead: string; // toda la serpiente tras el game over
  eyes: string; // ojos sobre la cabeza
  bodyStyle: "fill" | "outline";
  bodyFillAlpha: number; // relleno translúcido del cuerpo con "outline"; 1 con "fill"
  line: { body: number }; // trazo del cuerpo con "outline"; 0 con "fill"
  radius: number; // radio de roundRect de los segmentos
  eyeShape: "round" | "square";
  eyeSize: number; // radio (round) o media arista (square), px
  fruit:
    | { mode: "lift"; minContrast: number } // colores originales; aclara los píxeles por debajo de minContrast
    | { mode: "phosphor"; shade: string; base: string; light: string }; // 3 tonos de fósforo según luminancia
  fruitFallback: string; // círculo mientras no ha cargado fruits.png
  fruitGlow: string; // shadowColor de la fruta
  blur: { snake: number; fruit: number }; // px de shadowBlur antes de aplicar fx.glow
  fx: SkinFx; // glow y scanlines (skins/00)
}
export const PALETTES: Record<SkinId, SerpentinaPalette> = {
  // Aspecto de siempre con dos correcciones: cabeza blanca y frutas oscuras aclaradas.
  // Conserva el brillo de 10 px de la serpiente (fx.glow = 1).
  clasico: {
    bg: "#05070d",
    grid: "rgba(57, 255, 20, 0.06)",
    gridLine: 1,
    body: "#39ff14",
    head: "#ffffff", // antes #b6ff9e: 1,15:1 frente al cuerpo
    dead: "#ff2b4d",
    eyes: "#05070d",
    bodyStyle: "fill",
    bodyFillAlpha: 1,
    line: { body: 0 },
    radius: 6,
    eyeShape: "round",
    eyeSize: 3.5,
    fruit: { mode: "lift", minContrast: 3.35 },
    fruitFallback: "#ff2bd6",
    fruitGlow: "#ff2bd6", // sin efecto: blur.fruit es 0
    blur: { snake: 10, fruit: 0 },
    fx: { glow: 1, scanlines: null },
  },
  // Cuerpo en contorno cian con relleno al 22 %, cabeza sólida y fruta con halo dorado
  neon: {
    bg: "#05050a",
    grid: "rgba(0, 245, 255, 0.07)",
    gridLine: 1,
    body: "#00f5ff",
    head: "#ffffff",
    dead: "#ff006e",
    eyes: "#05050a",
    bodyStyle: "outline",
    bodyFillAlpha: 0.22,
    line: { body: 2 },
    radius: 6,
    eyeShape: "round",
    eyeSize: 3.5,
    fruit: { mode: "lift", minContrast: 3.35 },
    fruitFallback: "#ffcf3a",
    fruitGlow: "#ffcf3a",
    blur: { snake: 12, fruit: 10 },
    fx: { glow: 1, scanlines: null },
  },
  // Fósforo verde de ROCAS retro: segmentos cuadrados y frutas en 3 tonos
  retro: {
    bg: "#031407",
    grid: "rgba(95, 211, 111, 0.1)",
    gridLine: 1,
    body: "#2a9a3e",
    head: "#c4ffc4",
    dead: "#5fd36f",
    eyes: "#031407",
    bodyStyle: "fill",
    bodyFillAlpha: 1,
    line: { body: 0 },
    radius: 0,
    eyeShape: "square",
    eyeSize: 3,
    fruit: {
      mode: "phosphor",
      shade: "#2a9a3e",
      base: "#8fe89a",
      light: "#c4ffc4",
    },
    fruitFallback: "#8fe89a",
    fruitGlow: "#8fe89a", // sin efecto: blur.fruit es 0
    blur: { snake: 0, fruit: 0 },
    fx: { glow: 0, scanlines: { alpha: 0.2, step: 3 } },
  },
};
