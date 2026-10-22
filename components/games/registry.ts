import { createAsteroidsGame } from "@/lib/asteroids/engine";
import { createBloqueBusterGame } from "@/lib/bloque-buster/engine";
import { createCaidaGame } from "@/lib/caida/engine";
import { createSerpentinaGame } from "@/lib/serpentina/engine";
import type { CreateEngine } from "@/lib/engine/types";
export interface GameEntry {
  createEngine: CreateEngine;
  label: string; // aria-label del canvas
  hud: { lives: boolean; level: boolean };
  sound: boolean; // muestra el botón SILENCIAR
  controls: string; // controles bajo el CRT
}
// Los ids sin entrada conservan la simulación.
export const GAME_REGISTRY: Record<string, GameEntry> = {
  rocas: {
    createEngine: createAsteroidsGame,
    label: "Juego Rocas",
    hud: { lives: true, level: true },
    sound: true,
    controls: "← → GIRAR · ↑ IMPULSO · ESPACIO DISPARAR",
  },
  caida: {
    createEngine: createCaidaGame,
    label: "Juego Caída",
    hud: { lives: false, level: true },
    sound: false,
    controls: "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAÍDA",
  },
  "bloque-buster": {
    createEngine: createBloqueBusterGame,
    label: "Juego Bloque Buster",
    hud: { lives: true, level: true },
    sound: true,
    controls: "← → / RATÓN MOVER PALA",
  },
  serpentina: {
    createEngine: createSerpentinaGame,
    label: "Juego Serpentina",
    hud: { lives: false, level: true },
    sound: true,
    controls: "← ↑ ↓ → / WASD GIRAR",
  },
};
