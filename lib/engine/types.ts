// ===== types.ts — contrato común entre los motores de juego y la plataforma =====
export interface GameCallbacks {
  onScore: (score: number) => void;
  onLives?: (lives: number) => void; // solo juegos con vidas
  onLevel?: (level: number) => void; // solo juegos con niveles
  onGameOver: (finalScore: number) => void;
}
export interface GameEngine {
  pause(): void;
  resume(): void;
  end(): void; // termina la partida y dispara onGameOver
  restart(): void; // partida nueva, estado de recién creado
  setMuted(muted: boolean): void; // no-op si no hay sonido
  destroy(): void; // cancela el loop, quita listeners y cierra audio
}
export type CreateEngine = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
