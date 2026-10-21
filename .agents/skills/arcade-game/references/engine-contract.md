# Contrato de motor y registro de juegos

Basado en la spec 05 (ROCAS) y en `lib/asteroids/`. Léelo junto con `lib/asteroids/engine.ts`, que es el ejemplo vivo.

## Contenido

1. Tipos del contrato
2. Esqueleto de un motor
3. Canvas genérico
4. Registro de juegos y cambios en `GamePlayer`
5. Lista de verificación de porteo
6. Errores típicos

## 1. Tipos del contrato

`lib/engine/types.ts` (o el nombre que ya tenga el repo si alguien lo extrajo antes):

```ts
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
  destroy(): void; // cancela loop, quita listeners, cierra audio
}

export type CreateEngine = (canvas: HTMLCanvasElement, callbacks: GameCallbacks) => GameEngine;
```

`onLives` y `onLevel` son opcionales para no obligar a un Tetris (sin vidas) a mentir. El HUD decide qué mostrar según el registro.

## 2. Esqueleto de un motor

```ts
// lib/<id>/engine.ts
import { W, H, MAX_DT } from "./types";
import type { CreateEngine } from "@/lib/engine/types";

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

export const createXGame: CreateEngine = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  canvas.width = W;
  canvas.height = H;

  let raf = 0;
  let last = 0;
  let paused = false;
  let over = false;
  // …estado de la partida

  const isEditable = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable || t instanceof HTMLInputElement ||
     t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code) || isEditable(e.target)) return;
    e.preventDefault(); // evita scroll y que Espacio active un botón enfocado
    // …
  };
  const onKeyUp = (e: KeyboardEvent) => { /* … */ };
  const onBlur = () => { /* soltar todas las teclas */ };

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (!paused && !over) update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  };

  const reset = () => { /* estado inicial + callbacks onScore(0)/onLives/onLevel */ };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  reset();
  last = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    pause() { paused = true; },
    resume() { paused = false; last = performance.now(); },
    end() { if (!over) { over = true; callbacks.onGameOver(score); } },
    restart() { over = false; paused = false; reset(); last = performance.now(); },
    setMuted(m) { /* … */ },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      // cerrar AudioContext, limpiar timeouts
    },
  };
};
```

Notas: `resume()` y `restart()` reponen `last` para que el primer `dt` no incluya el tiempo en pausa. `end()` es idempotente. El motor llama a `onGameOver` una sola vez por partida.

## 3. Canvas genérico

Una vez generalizado, sustituye a `AsteroidsCanvas`. Conserva dos detalles del original: las props se leen por ref para no recrear el motor en cada render, y el motor se crea solo dentro del efecto (Strict Mode monta, desmonta y vuelve a montar).

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { CreateEngine, GameCallbacks, GameEngine } from "@/lib/engine/types";

interface GameCanvasProps {
  createEngine: CreateEngine;
  callbacks: GameCallbacks;
  label: string; // aria-label, p. ej. "Juego Rocas"
  onReady: (game: GameEngine | null) => void;
}

export default function GameCanvas({ createEngine, callbacks, label, onReady }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacksRef = useRef(callbacks);
  const onReadyRef = useRef(onReady);
  useEffect(() => { callbacksRef.current = callbacks; onReadyRef.current = onReady; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createEngine(canvas, {
      onScore: (v) => callbacksRef.current.onScore(v),
      onLives: (v) => callbacksRef.current.onLives?.(v),
      onLevel: (v) => callbacksRef.current.onLevel?.(v),
      onGameOver: (v) => callbacksRef.current.onGameOver(v),
    });
    onReadyRef.current(game);
    return () => { game.destroy(); onReadyRef.current(null); };
  }, [createEngine]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label={label} />;
}
```

`createEngine` debe ser una referencia estable (la exporta el registro, no se crea en el render).

## 4. Registro de juegos y cambios en `GamePlayer`

```ts
// components/games/registry.ts
export interface GameEntry {
  createEngine: CreateEngine;
  label: string;          // aria-label del canvas
  hud: { lives: boolean; level: boolean };
  sound: boolean;         // muestra el botón SILENCIAR
  controls?: string;      // texto breve de controles para mostrar bajo el CRT
}
export const GAME_REGISTRY: Record<string, GameEntry> = {
  rocas: { createEngine: createAsteroidsGame, label: "Juego Rocas", hud: { lives: true, level: true }, sound: true },
};
```

En `GamePlayer`: `const entry = GAME_REGISTRY[id]; const isReal = !!entry;` y sustituye cada `isRocas` por `isReal`. El bloque de simulación y su `game-arena` solo se renderizan si `!isReal`. El HUD oculta Vidas/Nivel según `entry.hud`. `isReal` también decide si `GUARDAR PUNTUACIÓN` llama a `saveScore`.

Si el bundle del motor es grande (Arkanoid con sprites), carga el motor con `next/dynamic` o un `import()` dentro del efecto para que la home y el catálogo no lo descarguen; consulta la guía de lazy loading en `node_modules/next/dist/docs/01-app/` antes de hacerlo.

## 5. Lista de verificación de porteo (JS de referencia → motor TS)

- [ ] `game.js` sin `<script>` globales: todo en módulos con `export`, tipos explícitos, sin `any`.
- [ ] `document.getElementById(...)`, `scoreEl.textContent = …`, overlays HTML, botón de reinicio, selector de tema, `localStorage`: fuera del motor. Lo que sea información (puntuación, líneas, nivel) sale por callbacks.
- [ ] El canvas llega por parámetro; sin `canvas.width = …` fuera de la fábrica.
- [ ] Un único `requestAnimationFrame` activo; `destroy()` lo cancela.
- [ ] Todos los listeners en `window`/`document`/`canvas` se quitan en `destroy()`; las funciones están nombradas para poder quitarlas.
- [ ] `KeyboardEvent.code` en vez de `e.key`; `preventDefault` solo para teclas del juego y con foco fuera de campos editables.
- [ ] Teclas de pausa del original (`P`, `Escape`): decide si se mantienen. La plataforma ya tiene `PAUSA`/`REANUDAR`; si se mantienen, deben avisar con un callback o `GameCallbacks` ampliado, o el HUD quedará desincronizado. Lo más simple es retirarlas.
- [ ] El motor no dibuja su propio HUD (puntuación, vidas, nivel) ni su pantalla de game over; los pinta la plataforma. Los paneles auxiliares (p. ej. "siguiente pieza" de Tetris) pueden dibujarse dentro del mismo canvas si caben en el área lógica.
- [ ] Sonido: sintetizado con Web Audio (`audio.ts`, como ROCAS) o archivos en `public/games/<id>/`; `setMuted` funciona en ambos; un fallo de audio no rompe el loop; `AudioContext` se crea tras un gesto del usuario o se reanuda con `resume()`.
- [ ] Números mágicos a constantes con nombre en `types.ts`, con unidad en el comentario (px/s, s, rad).
- [ ] Comentarios en español, con el estilo del código vecino.

## 6. Errores típicos

- **Movimiento doble o más rápido tras recargar con HMR / Strict Mode**: un listener o loop no se limpió en `destroy()`.
- **Espacio dispara el botón enfocado o desplaza la página**: falta `preventDefault`, o se llama aun escribiendo en el input del modal.
- **Teclas "pegadas" al pausar o cambiar de pestaña**: falta `onBlur` que suelte el estado de teclas, o `clearKeys()` al pausar.
- **Salto enorme tras reanudar**: no se repuso `last` en `resume()` ni se acotó `dt`.
- **`onGameOver` dos veces**: `end()` desde el botón FIN más la muerte natural; protégelo con `over`.
- **Canvas borroso o con proporciones erróneas**: el CSS no usa `width/height: 100%` sobre el contenedor 4:3, o la resolución lógica no coincide con la del original.
- **`window is not defined` en build**: el motor se importó en un Server Component; solo debe llegar desde un componente `"use client"`.
