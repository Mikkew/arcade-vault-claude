// ===== palettes.ts — colores, estilos y efectos de cada skin de Bloque Buster =====
// Contraste medido contra el `bg` de cada skin: ver specs/skins/02-skins-bloque-buster.md
// Los nombres de BlockColor no coinciden con el sprite: las paletas siguen lo que se ve.
import type { SkinFx } from "@/lib/engine/skin-fx";
import type { SkinId } from "@/lib/engine/skins";
import type { BlockColor } from "./types";
export interface BloqueBusterPalette {
  bg: string; // fondo del canvas (luminancia ≤ 0,05)
  sprites: boolean; // true: dibuja el spritesheet y usa los colores solo como reserva
  blocks: Record<BlockColor, string>; // color de cada tipo de ladrillo (o reserva en clásico)
  spriteTint: Partial<Record<BlockColor, string>>; // velo sobre el sprite (corrección de contraste)
  paddle: string; // cuerpo de la pala
  paddleAccent: string | null; // extremos de la pala (8 px por lado); null = sin extremos
  ball: string;
  ballShape: "square" | "circle"; // solo dibujo; la colisión sigue siendo AABB 16×16
  blockStyle: "fill" | "outline"; // relleno plano o trazo con relleno translúcido
  blockInset: number; // px de hueco entre ladrillos
  fillAlpha: number; // alfa del relleno interior en estilo "outline"
  line: { block: number; paddle: number; explosion: number }; // grosores de trazo
  blur: { block: number; paddle: number; ball: number }; // px de shadowBlur antes de aplicar fx.glow
  explosion: "sprite" | "fade" | "steps"; // animación de 150 ms del ladrillo roto
  fx: SkinFx; // glow y scanlines (skins/00)
}
export const PALETTES: Record<SkinId, BloqueBusterPalette> = {
  // Spritesheet de siempre; los colores son la reserva si la imagen no carga
  clasico: {
    bg: "#000000",
    sprites: true,
    blocks: {
      red: "#c02a3e",
      yellow: "#d9bd4c",
      cyan: "#4fc99c", // verde azulado en el sprite
      magenta: "#632ff4", // violeta
      hotpink: "#fc7d1c", // naranja
      green: "#44aaf3", // azul
      gray: "#666979", // piedra ya corregida por el velo
    },
    spriteTint: { gray: "rgba(199,208,224,0.35)" }, // --silver al 35 %: 1,65 → 3,86
    paddle: "#00f0ff",
    paddleAccent: null,
    ball: "#ffffff",
    ballShape: "square",
    blockStyle: "fill",
    blockInset: 1,
    fillAlpha: 1,
    line: { block: 0, paddle: 0, explosion: 0 },
    blur: { block: 0, paddle: 0, ball: 0 },
    explosion: "sprite",
    fx: { glow: 0, scanlines: null },
  },
  // Trazo con relleno al 18 % y brillo; tokens del portal donde caben
  neon: {
    bg: "#05050a",
    sprites: false,
    blocks: {
      red: "#ff006e",
      yellow: "#f5ff00",
      cyan: "#00ff88",
      magenta: "#b14dff",
      hotpink: "#ff9a1f",
      green: "#45c8ff",
      gray: "#e6e9ff",
    },
    spriteTint: {},
    paddle: "#00f5ff",
    paddleAccent: "#ff006e",
    ball: "#ffffff",
    ballShape: "circle",
    blockStyle: "outline",
    blockInset: 3,
    fillAlpha: 0.18,
    line: { block: 2, paddle: 2, explosion: 2 },
    blur: { block: 8, paddle: 12, ball: 10 },
    explosion: "fade",
    fx: { glow: 1, scanlines: null },
  },
  // EGA de 8 colores, relleno plano; pala, bola y piedra comparten #aaaaaa
  retro: {
    bg: "#000000",
    sprites: false,
    blocks: {
      red: "#ff5555",
      yellow: "#ffff55",
      cyan: "#55ffaa",
      magenta: "#aa55ff",
      hotpink: "#ffaa00",
      green: "#55aaff",
      gray: "#aaaaaa",
    },
    spriteTint: {},
    paddle: "#aaaaaa",
    paddleAccent: "#ff5555",
    ball: "#aaaaaa",
    ballShape: "square",
    blockStyle: "fill",
    blockInset: 2,
    fillAlpha: 1,
    line: { block: 0, paddle: 0, explosion: 0 },
    blur: { block: 0, paddle: 0, ball: 0 },
    explosion: "steps",
    fx: { glow: 0, scanlines: { alpha: 0.2, step: 3 } },
  },
};
