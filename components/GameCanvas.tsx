"use client";
import { useEffect, useRef } from "react";
import type {
  CreateEngine,
  GameCallbacks,
  GameEngine,
} from "@/lib/engine/types";
import type { SkinId } from "@/lib/engine/skins";
interface GameCanvasProps {
  /** Referencia estable (la exporta el registro), no se crea en el render. */
  createEngine: CreateEngine;
  callbacks: GameCallbacks;
  label: string;
  /** Skin con el que nace el motor; los cambios posteriores van por setSkin. */
  skin: SkinId;
  /** Recibe el motor al montar y `null` al desmontar. */
  onReady: (game: GameEngine | null) => void;
}
export default function GameCanvas({
  createEngine,
  callbacks,
  label,
  skin,
  onReady,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Siempre se llama a la última versión de las props sin recrear el motor.
  const callbacksRef = useRef(callbacks);
  const onReadyRef = useRef(onReady);
  const skinRef = useRef(skin);
  useEffect(() => {
    callbacksRef.current = callbacks;
    onReadyRef.current = onReady;
    skinRef.current = skin;
  });
  // El motor se crea solo dentro del efecto y destroy() lo limpia (Strict Mode monta dos veces).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createEngine(
      canvas,
      {
        onScore: (v) => callbacksRef.current.onScore(v),
        onLives: (v) => callbacksRef.current.onLives?.(v),
        onLevel: (v) => callbacksRef.current.onLevel?.(v),
        onGameOver: (v) => callbacksRef.current.onGameOver(v),
      },
      skinRef.current,
    );
    onReadyRef.current(game);
    return () => {
      game.destroy();
      onReadyRef.current(null);
    };
    // `skin` no va en las dependencias: recrear el motor reiniciaría la partida.
  }, [createEngine]);
  return <canvas ref={canvasRef} className="game-canvas" aria-label={label} />;
}
