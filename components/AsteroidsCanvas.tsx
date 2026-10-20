"use client";
import { useEffect, useRef } from "react";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import type { AsteroidsCallbacks, AsteroidsGame } from "@/lib/asteroids/types";
interface AsteroidsCanvasProps {
  callbacks: AsteroidsCallbacks;
  /** Recibe el motor al montar y `null` al desmontar. */
  onReady: (game: AsteroidsGame | null) => void;
}
export default function AsteroidsCanvas({
  callbacks,
  onReady,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Siempre se llama a la última versión de las props sin recrear el motor.
  const callbacksRef = useRef(callbacks);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    callbacksRef.current = callbacks;
    onReadyRef.current = onReady;
  });
  // El motor se crea solo dentro del efecto y destroy() lo limpia (Strict Mode monta dos veces).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createAsteroidsGame(canvas, {
      onScore: (v) => callbacksRef.current.onScore(v),
      onLives: (v) => callbacksRef.current.onLives(v),
      onLevel: (v) => callbacksRef.current.onLevel(v),
      onGameOver: (v) => callbacksRef.current.onGameOver(v),
    });
    onReadyRef.current(game);
    return () => {
      game.destroy();
      onReadyRef.current(null);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="asteroids-canvas"
      aria-label="Juego Rocas"
    />
  );
}
