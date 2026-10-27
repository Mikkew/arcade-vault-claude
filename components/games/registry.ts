import { createAsteroidsGame } from "@/lib/asteroids/engine";
import { createBloqueBusterGame } from "@/lib/bloque-buster/engine";
import { createCaidaGame } from "@/lib/caida/engine";
import { createPapillaGame } from "@/lib/papilla/engine";
import { createSerpentinaGame } from "@/lib/serpentina/engine";
import type { SkinId } from "@/lib/engine/skins";
import type { CreateEngine, TouchAction } from "@/lib/engine/types";
// Controles táctiles bajo el CRT; solo se ven con puntero grueso (móvil, tablet)
export interface TouchLayout {
  dpad: Exclude<TouchAction, "a" | "b">[]; // flechas visibles de la cruceta
  a?: string; // etiqueta del botón A; sin valor no se pinta
  b?: string; // etiqueta del botón B
}
export interface GameEntry {
  createEngine: CreateEngine;
  label: string; // aria-label del canvas
  hud: { lives: boolean; level: boolean };
  sound: boolean; // muestra el botón SILENCIAR
  controls: string; // controles bajo el CRT
  skins: SkinId[]; // skins disponibles; el selector solo aparece con más de uno
  touch: TouchLayout;
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
    touch: { dpad: ["left", "right", "up"], a: "DISPARAR" },
  },
  caida: {
    createEngine: createCaidaGame,
    label: "Juego Caída",
    hud: { lives: false, level: true },
    sound: false,
    controls: "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAÍDA",
    skins: ["clasico"],
    touch: { dpad: ["left", "right", "down"], a: "ROTAR", b: "CAÍDA" },
  },
  "bloque-buster": {
    createEngine: createBloqueBusterGame,
    label: "Juego Bloque Buster",
    hud: { lives: true, level: true },
    sound: true,
    controls: "← → / RATÓN MOVER PALA",
    skins: ["clasico", "neon", "retro"],
    touch: { dpad: ["left", "right"] },
  },
  serpentina: {
    createEngine: createSerpentinaGame,
    label: "Juego Serpentina",
    hud: { lives: false, level: true },
    sound: true,
    controls: "← ↑ ↓ → / WASD GIRAR",
    skins: ["clasico", "neon", "retro"],
    touch: { dpad: ["up", "down", "left", "right"] },
  },
  papilla: {
    createEngine: createPapillaGame,
    label: "Juego Papilla",
    hud: { lives: true, level: true },
    sound: true,
    controls: "← ↑ ↓ → / WASD SALTAR",
    skins: ["clasico"],
    touch: { dpad: ["up", "down", "left", "right"] },
  },
};
