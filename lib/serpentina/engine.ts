// ===== engine.ts — bucle, estado, entrada y dibujo de Serpentina (Snake) =====
// Independiente de React. Se comunica con el HUD de la plataforma por callbacks.
import { drawScanlines, withGlow } from "@/lib/engine/skin-fx";
import { DEFAULT_SKIN } from "@/lib/engine/skins";
import type { CreateEngine } from "@/lib/engine/types";
import { createAudio } from "./audio";
import { PALETTES } from "./palettes";
import { FRUIT_FRAMES, STRIP_Y, buildFruitStrip } from "./sprites";
import {
  BASE_TICK,
  CELL,
  COLS,
  FRUIT_PADDING,
  FRUIT_POINTS,
  FRUITS_PER_LEVEL,
  H,
  MAX_DT,
  MAX_INPUT_QUEUE,
  MAX_LEVEL,
  MIN_TICK,
  ROWS,
  SPRITE_URL,
  START_LENGTH,
  TICK_STEP,
  W,
  type Cell,
  type Dir,
  type Frame,
} from "./types";
const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
export const createSerpentinaGame: CreateEngine = (canvas, callbacks, skin) => {
  // Paleta del skin activo; restart() y reset() no la tocan
  let pal = PALETTES[skin ?? DEFAULT_SKIN];
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  canvas.width = W;
  canvas.height = H;
  let raf = 0;
  let last = 0;
  let paused = false;
  let over = false;
  let destroyed = false;
  let acc = 0; // ms acumulados hacia el siguiente paso
  let snake: Cell[] = []; // snake[0] es la cabeza
  let dir: Dir = "right";
  let queue: Dir[] = [];
  let fruit: Cell = { x: 0, y: 0 };
  let fruitFrame = 0;
  let eaten = 0;
  let score = 0;
  let level = 1;
  const audio = createAudio();
  // Sin spritesheet las frutas se pintan como círculos: el juego no espera a la imagen
  let sheet: HTMLImageElement | null = null;
  // Tiras de frutas recoloreadas, una por modo ("lift" | "phosphor")
  const strips = new Map<string, HTMLCanvasElement>();
  const ensureStrip = () => {
    if (!sheet || strips.has(pal.fruit.mode)) return;
    try {
      strips.set(pal.fruit.mode, buildFruitStrip(sheet, pal.fruit, pal.bg));
    } catch {
      // Canvas contaminado u otro fallo: se dibuja la imagen original
    }
  };
  const img = new Image();
  img.onload = () => {
    if (destroyed) return;
    sheet = img;
    ensureStrip();
  };
  img.src = SPRITE_URL;
  const isEditable = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable ||
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement);
  const tickMs = () => Math.max(MIN_TICK, BASE_TICK - (level - 1) * TICK_STEP);
  const spawnFruit = (): boolean => {
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    if (free.length === 0) return false;
    fruit = free[Math.floor(Math.random() * free.length)];
    // Otra fruta distinta de la anterior
    let next = fruitFrame;
    while (next === fruitFrame)
      next = Math.floor(Math.random() * FRUIT_FRAMES.length);
    fruitFrame = next;
    return true;
  };
  const gameOver = () => {
    if (over) return;
    over = true;
    queue = [];
    audio.play("crash");
    callbacks.onGameOver(score);
  };
  const reset = () => {
    const startX = Math.floor(COLS / 4);
    const startY = Math.floor(ROWS / 2);
    snake = Array.from({ length: START_LENGTH }, (_, i) => ({
      x: startX - i,
      y: startY,
    }));
    dir = "right";
    queue = [];
    acc = 0;
    eaten = 0;
    score = 0;
    level = 1;
    spawnFruit();
    callbacks.onScore(score);
    callbacks.onLevel?.(level);
  };
  const turn = (wanted: Dir) => {
    // Se compara con el último giro pendiente para poder encadenar dos giros rápidos
    const ref = queue.length ? queue[queue.length - 1] : dir;
    if (wanted === ref || wanted === OPPOSITE[ref]) return;
    if (queue.length < MAX_INPUT_QUEUE) queue.push(wanted);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const wanted = KEY_DIR[e.code];
    if (!wanted || isEditable(e.target)) return;
    e.preventDefault(); // evita el scroll de la página
    if (paused || over || e.repeat) return;
    turn(wanted);
  };
  const onBlur = () => {
    queue = [];
  };
  const step = () => {
    const turn = queue.shift();
    if (turn) dir = turn;
    const head = snake[0];
    const next = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y };
    const eating = next.x === fruit.x && next.y === fruit.y;
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS)
      return gameOver();
    // La cola se libera en el mismo paso, salvo que la serpiente crezca
    const body = eating ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === next.x && s.y === next.y)) return gameOver();
    snake.unshift(next);
    if (!eating) {
      snake.pop();
      return;
    }
    eaten++;
    score += FRUIT_POINTS * level;
    callbacks.onScore(score);
    const newLevel = Math.min(
      MAX_LEVEL,
      1 + Math.floor(eaten / FRUITS_PER_LEVEL),
    );
    if (newLevel !== level) {
      level = newLevel;
      callbacks.onLevel?.(level);
      audio.play("levelUp");
    } else audio.play("eat");
    if (!spawnFruit()) gameOver(); // tablero lleno: partida perfecta
  };
  const update = (dt: number) => {
    acc += dt * 1000;
    while (acc >= tickMs() && !over) {
      acc -= tickMs();
      step();
    }
  };
  const drawFruit = () => {
    const px = fruit.x * CELL;
    const py = fruit.y * CELL;
    const box = CELL - FRUIT_PADDING * 2;
    const blur = pal.blur.fruit * pal.fx.glow;
    if (!sheet) {
      ctx.fillStyle = pal.fruitFallback;
      ctx.beginPath();
      ctx.arc(px + CELL / 2, py + CELL / 2, box / 2, 0, Math.PI * 2);
      withGlow(ctx, pal.fruitGlow, blur, () => ctx.fill());
      return;
    }
    const f: Frame = FRUIT_FRAMES[fruitFrame];
    const strip = strips.get(pal.fruit.mode);
    const source = strip ?? sheet;
    // Conserva la proporción del recorte dentro de la celda
    const scale = Math.min(box / f.sw, box / f.sh);
    const dw = f.sw * scale;
    const dh = f.sh * scale;
    ctx.imageSmoothingEnabled = false;
    withGlow(ctx, pal.fruitGlow, blur, () =>
      ctx.drawImage(
        source,
        f.sx,
        strip ? f.sy - STRIP_Y : f.sy,
        f.sw,
        f.sh,
        px + (CELL - dw) / 2,
        py + (CELL - dh) / 2,
        dw,
        dh,
      ),
    );
  };
  const drawEyes = (head: Cell) => {
    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    const d = DELTA[dir];
    // Los ojos se separan en el eje perpendicular a la marcha
    const px = -d.y;
    const py = d.x;
    ctx.fillStyle = pal.eyes;
    const r = pal.eyeSize;
    for (const side of [-1, 1]) {
      const ex = cx + d.x * 7 + px * side * 7;
      const ey = cy + d.y * 7 + py * side * 7;
      if (pal.eyeShape === "square") {
        ctx.fillRect(ex - r, ey - r, r * 2, r * 2);
        continue;
      }
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const draw = () => {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = pal.gridLine;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
    }
    ctx.stroke();
    drawFruit();
    const color = over ? pal.dead : pal.body;
    const blur = pal.blur.snake * pal.fx.glow;
    const segment = (i: number) => {
      const s = snake[i];
      const inset = i === 0 ? 2 : 4;
      ctx.roundRect(
        s.x * CELL + inset,
        s.y * CELL + inset,
        CELL - inset * 2,
        CELL - inset * 2,
        pal.radius,
      );
    };
    if (pal.bodyStyle === "outline") {
      // El cuerpo es un solo path: dos pasadas de sombra por frame, no dos por segmento
      ctx.beginPath();
      for (let i = snake.length - 1; i >= 1; i--) segment(i);
      withGlow(ctx, color, blur, () => {
        ctx.globalAlpha = pal.bodyFillAlpha;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = pal.line.body;
        ctx.strokeStyle = color;
        ctx.stroke();
      });
      // La cabeza siempre es sólida
      ctx.beginPath();
      segment(0);
      ctx.fillStyle = over ? pal.dead : pal.head;
      withGlow(ctx, color, blur, () => ctx.fill());
    } else {
      // Segmento a segmento, de la cola a la cabeza, dentro de un único brillo
      withGlow(ctx, color, blur, () => {
        for (let i = snake.length - 1; i >= 0; i--) {
          ctx.fillStyle = over ? pal.dead : i === 0 ? pal.head : pal.body;
          ctx.beginPath();
          segment(i);
          ctx.fill();
        }
      });
    }
    // Los ojos van sin brillo
    drawEyes(snake[0]);
    // Scanlines del skin retro, encima de todo
    drawScanlines(ctx, W, H, pal.fx.scanlines);
  };
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (!paused && !over) update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);
  reset();
  last = performance.now();
  raf = requestAnimationFrame(frame);
  return {
    pause() {
      paused = true;
      queue = [];
    },
    resume() {
      paused = false;
      last = performance.now();
    },
    end() {
      gameOver();
    },
    restart() {
      over = false;
      paused = false;
      reset();
      last = performance.now();
    },
    setMuted(m) {
      audio.setMuted(m);
    },
    // El bucle sigue dibujando en pausa y tras el game over: no hace falta redibujar
    setSkin(s) {
      if (destroyed) return;
      pal = PALETTES[s] ?? PALETTES.clasico;
      ensureStrip();
    },
    // Cada toque de la cruceta es un giro; soltar no hace nada
    setInput(action, down) {
      if (!down || paused || over || action === "a" || action === "b") return;
      turn(action);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      img.onload = null;
      strips.clear();
      audio.destroy();
    },
  };
};
