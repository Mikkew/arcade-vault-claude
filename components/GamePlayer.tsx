"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AsteroidsCanvas from "@/components/AsteroidsCanvas";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";
import type { AsteroidsCallbacks, AsteroidsGame } from "@/lib/asteroids/types";
interface GamePlayerProps {
  id: string;
  title: string;
  isLoggedIn: boolean;
}
type SaveStatus = "idle" | "saving" | "saved" | "error" | "unauthenticated";
export default function GamePlayer({ id, title, isLoggedIn }: GamePlayerProps) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const scoreRef = useRef(0);
  // Bloquea el doble clic antes de que React alcance a deshabilitar el botón;
  // se libera al fallar (reintento) y se reinicia con cada partida nueva.
  const savingRef = useRef(false);
  // Solo "rocas" tiene un juego real; los demás conservan la simulación.
  const isRocas = id === "rocas";
  const gameRef = useRef<AsteroidsGame | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const handleReady = useCallback((game: AsteroidsGame | null) => {
    gameRef.current = game;
    game?.setMuted(mutedRef.current); // un motor nuevo hereda la preferencia actual
  }, []);
  const callbacks = useMemo<AsteroidsCallbacks>(
    () => ({
      onScore: setScore,
      onLives: setLives,
      onLevel: setLevel,
      onGameOver: (finalScore) => {
        setScore(finalScore);
        setOver(true);
      },
    }),
    [],
  );
  // Simulación: la puntuación sube sola mientras no haya pausa ni fin de partida.
  // La regla de nivel del template (score % 2500 < 100) se evalúa en cada tick.
  useEffect(() => {
    if (isRocas || over || paused) return;
    const t = setInterval(() => {
      const next = scoreRef.current + Math.floor(10 + Math.random() * 90);
      scoreRef.current = next;
      setScore(next);
      if (next % 2500 < 100) setLevel((l) => l + 1);
    }, 220);
    return () => clearInterval(t);
  }, [isRocas, over, paused]);
  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    if (isRocas) {
      if (next) gameRef.current?.pause();
      else gameRef.current?.resume();
    }
  };
  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    gameRef.current?.setMuted(next);
  };
  const endGame = () => {
    if (isRocas) gameRef.current?.end();
    else setOver(true);
  };
  const handleSave = async () => {
    // Los juegos simulados solo marcan el estado local: no escriben en scores.
    if (!isRocas) {
      setSaveStatus("saved");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const result = await saveScore(id, score);
      if (result.ok) {
        setSaveStatus("saved");
        return;
      }
      setSaveStatus(
        result.reason === "unauthenticated" ? "unauthenticated" : "error",
      );
    } catch {
      setSaveStatus("error");
    }
    savingRef.current = false;
  };
  const restart = () => {
    if (isRocas) {
      // Si se terminó en pausa, el motor sigue pausado: se reanuda antes de reiniciar.
      gameRef.current?.resume();
      gameRef.current?.restart();
    }
    scoreRef.current = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    savingRef.current = false;
    setSaveStatus("idle");
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button type="button" className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={endGame}>
            FIN
          </button>
          {isRocas && (
            <button
              type="button"
              className="btn ghost"
              aria-pressed={muted}
              onClick={toggleMute}
            >
              {muted ? "ACTIVAR SONIDO" : "SILENCIAR"}
            </button>
          )}
          <Link href={`/juegos/${id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          {isRocas ? (
            <AsteroidsCanvas callbacks={callbacks} onReady={handleReady} />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {saveStatus === "saved" ? (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            ) : isRocas && (!isLoggedIn || saveStatus === "unauthenticated") ? (
              <div className="input-row">
                <Link href="/acceso" className="btn yellow">
                  INICIA SESIÓN PARA GUARDAR
                </Link>
              </div>
            ) : (
              <>
                <div className="input-row">
                  {/* Con ROCAS el jugador es el de la sesión: no hay apodo libre. */}
                  {!isRocas && (
                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value.toUpperCase().slice(0, 10))
                      }
                      placeholder="TUS INICIALES"
                    />
                  )}
                  <button
                    type="button"
                    className="btn yellow"
                    disabled={saveStatus === "saving"}
                    onClick={handleSave}
                  >
                    {saveStatus === "saving"
                      ? "GUARDANDO…"
                      : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveStatus === "error" && (
                  <div className="terminal-error" role="alert">
                    ERROR: NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO.
                  </div>
                )}
              </>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
