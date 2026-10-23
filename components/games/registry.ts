import { createAsteroidsGame } from "@/lib/asteroids/engine";
import { createBloqueBusterGame } from "@/lib/bloque-buster/engine";
import { createCaidaGame } from "@/lib/caida/engine";
import { createPapillaGame } from "@/lib/papilla/engine";
import { createSerpentinaGame } from "@/lib/serpentina/engine";
import type { SkinId } from "@/lib/engine/skins";
import type { CreateEngine } from "@/lib/engine/types";
export interface GameEntry {
  createEngine: CreateEngine;
  label: string; // aria-label del canvas
  hud: { lives: boolean; level: boolean };
  sound: boolean; // muestra el botón SILENCIAR
  controls: string; // controles bajo el CRT
  skins: SkinId[]; // skins disponibles; el selector solo aparece con más de uno
}
// Los ids sin entrada conservan la simulación.
export const GAME_REGISTRY: Record<string, GameEntry> = {
  rocas: {
    createEngine: createAsteroidsGame,
    label: "Juego Rocas",
    hud: { lives: true, level: true },
    sound: true,
    controls: "← → GIRAR · ↑ IMPULSO · ESPACIO DISPARAR",
    skins: ["clasico", "neon", "retro"],
  },
  caida: {
    createEngine: createCaidaGame,
    label: "Juego Caída",
    hud: { lives: false, level: true },
    sound: false,
    controls: "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAÍDA",
    skins: ["clasico"],
  },
  "bloque-buster": {
    createEngine: createBloqueBusterGame,
    label: "Juego Bloque Buster",
    hud: { lives: true, level: true },
    sound: true,
    controls: "← → / RATÓN MOVER PALA",
    skins: ["clasico", "neon", "retro"],
  },
  serpentina: {
    createEngine: createSerpentinaGame,
    label: "Juego Serpentina",
    hud: { lives: false, level: true },
    sound: true,
    controls: "← ↑ ↓ → / WASD GIRAR",
    skins: ["clasico", "neon", "retro"],
  },
  papilla: {
    createEngine: createPapillaGame,
    label: "Juego Papilla",
    hud: { lives: true, level: true },
    sound: true,
    controls: "← ↑ ↓ → / WASD SALTAR",
    skins: ["clasico"],
  },
};
