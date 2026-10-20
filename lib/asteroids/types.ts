// ===== types.ts — tipos y constantes del motor de Asteroides =====
export type Phase = "playing" | "dead" | "gameover";
export interface AsteroidsCallbacks {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
export interface AsteroidsGame {
  pause(): void;
  resume(): void;
  end(): void; // termina la partida y dispara onGameOver
  restart(): void; // partida nueva: score 0, vidas 3, nivel 1
  setMuted(muted: boolean): void;
  destroy(): void; // cancela el loop y quita listeners
}
// Teclas pulsadas, indexadas por `KeyboardEvent.code`
export type Keys = Record<string, boolean | undefined>;
// Resolución lógica del canvas
export const W = 800;
export const H = 600;
export const INITIAL_LIVES = 3;
export const INITIAL_ASTEROIDS = 4; // nivel 1; luego 3 + nivel
export const MAX_DT = 0.05; // s
// Índice = tamaño del asteroide (1, 2, 3)
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32]; // velocidad base, px/s
export const POINTS = [0, 100, 50, 20];
export const BULLET_SPEED = 520; // px/s
export const BULLET_TTL = 1.1; // s
export const SHOOT_COOLDOWN = 0.2; // s
export const TRIPLE_SPREAD = 0.18; // rad
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5; // s de efecto
export const POWERUP_TTL = 12; // s en pantalla
export const POWERUP_GUARANTEED_KILLS = 5;
export const SHIP_ROT = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987;
export const SHIP_NOSE = 21;
export const RESPAWN_DELAY = 2; // s
export const RESPAWN_INVINCIBLE = 3; // s
export const SAFE_DIST = 130; // distancia mínima al centro al crear asteroides
