// ===== palettes.ts — colores, grosores y fuentes de cada skin de Asteroides =====
// Contraste medido contra el `bg` de cada skin: ver specs/skins/01-skins-rocas.md
import type { SkinFx } from "@/lib/engine/skin-fx";
import type { SkinId } from "@/lib/engine/skins";
export interface AsteroidsPalette {
  bg: string; // fondo del canvas (luminancia ≤ 0,05)
  ship: string; // contorno de la nave
  thrust: string; // llama del propulsor
  asteroid: string; // contorno de los asteroides (los tres tamaños)
  bullet: string; // balas
  powerup: string; // rombo del triple disparo
  powerupText: string; // texto "3x" dentro del rombo
  hud: string; // temporizador "3x  N.Ns"
  particleRgb: string; // "r,g,b"; el alfa lo pone la vida de la partícula
  // px de shadowBlur antes de aplicar fx.glow
  blur: {
    ship: number;
    thrust: number;
    asteroid: number;
    bullet: number;
    powerup: number;
    hud: number;
  };
  line: { ship: number; asteroid: number; powerup: number; particle: number };
  lineJoin: CanvasLineJoin;
  hudFont: string;
  powerupFont: string;
  fx: SkinFx; // glow y scanlines (skins/00)
}
const NO_BLUR = {
  ship: 0,
  thrust: 0,
  asteroid: 0,
  bullet: 0,
  powerup: 0,
  hud: 0,
};
export const PALETTES: Record<SkinId, AsteroidsPalette> = {
  // Aspecto original del motor, sin cambios
  clasico: {
    bg: "#000",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    asteroid: "#fff",
    bullet: "#fff",
    powerup: "#0ff",
    powerupText: "#0ff",
    hud: "#0ff",
    particleRgb: "255,255,255",
    blur: NO_BLUR,
    line: { ship: 1.5, asteroid: 1.5, powerup: 2, particle: 1 },
    lineJoin: "round",
    hudFont: "15px monospace",
    powerupFont: "bold 12px monospace",
    fx: { glow: 0, scanlines: null },
  },
  // Tokens del portal con brillo; las partículas nunca brillan
  neon: {
    bg: "#05050a",
    ship: "#00f5ff",
    thrust: "#f5ff00",
    asteroid: "#ff006e",
    bullet: "#ffffff",
    powerup: "#ffcf3a",
    powerupText: "#ffcf3a",
    hud: "#ffcf3a",
    particleRgb: "255,0,110",
    blur: { ship: 10, thrust: 8, asteroid: 8, bullet: 6, powerup: 12, hud: 4 },
    line: { ship: 1.5, asteroid: 1.5, powerup: 2, particle: 1 },
    lineJoin: "round",
    hudFont: "15px monospace",
    powerupFont: "bold 12px monospace",
    fx: { glow: 1, scanlines: null },
  },
  // Fósforo verde monocromo (P1): la distinción va por luminancia
  retro: {
    bg: "#031407",
    ship: "#c4ffc4",
    thrust: "#8fe89a",
    asteroid: "#2a9a3e",
    bullet: "#c4ffc4",
    powerup: "#5fd36f",
    powerupText: "#c4ffc4",
    hud: "#c4ffc4",
    particleRgb: "31,110,46",
    blur: NO_BLUR,
    line: { ship: 2, asteroid: 2, powerup: 2, particle: 1 },
    lineJoin: "miter",
    hudFont: "bold 15px monospace",
    powerupFont: "bold 12px monospace",
    fx: { glow: 0, scanlines: { alpha: 0.2, step: 3 } },
  },
};
