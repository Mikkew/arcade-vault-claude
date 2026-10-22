// ===== engine.ts — bucle, estado, entrada y dibujo de Bloque Buster (Arkanoid) =====
// Independiente de React. Se comunica con el HUD de la plataforma por callbacks.
import type { CreateEngine } from "@/lib/engine/types";
import { LEVELS } from "./levels";
import {
  BALL_SPRITE,
  BLOCK_SPRITES,
  EXPLOSION_FRAMES,
  PADDLE_SPRITE,
} from "./sprites";
import {
  BALL_COLOR,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BALL_SIZE,
  BG_COLOR,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  BOUNCE_SOUND_URL,
  BREAK_SOUND_URL,
  EXPLOSION_DURATION,
  FALLBACK_COLORS,
  H,
  MAX_DT,
  PADDLE_BOUNCE_MARGIN,
  PADDLE_COLOR,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  SPRITE_URL,
  START_LIVES,
  W,
  type Ball,
  type Block,
  type Explosion,
  type Frame,
  type Rect,
} from "./types";
// Teclas que el motor captura mientras está activo
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
const collideAABB = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const createBloqueBusterGame: CreateEngine = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  canvas.width = W;
  canvas.height = H;
  let raf = 0;
  let last = 0;
  let paused = false;
  let over = false;
  let destroyed = false;
  let muted = false;
  // El juego no avanza hasta que el spritesheet termina de cargar (o falla)
  let ready = false;
  let sheet: HTMLImageElement | null = null;
  const paddle: Rect = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  const keys = { ArrowLeft: false, ArrowRight: false };
  // Sonidos: pueden fallar al cargar o estar bloqueados por el navegador
  let bounceSound: HTMLAudioElement | null = null;
  let breakSound: HTMLAudioElement | null = null;
  try {
    bounceSound = new Audio(BOUNCE_SOUND_URL);
    breakSound = new Audio(BREAK_SOUND_URL);
  } catch {
    // sin audio: el juego sigue funcionando
  }
  const play = (sound: HTMLAudioElement | null) => {
    if (!sound || muted) return;
    try {
      const clone = sound.cloneNode() as HTMLAudioElement;
      void clone.play().catch(() => {});
    } catch {
      // un fallo de audio nunca rompe el loop
    }
  };
  const isEditable = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable ||
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement);
  const clearKeys = () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  };
  const serveBall = () => {
    const { speed } = LEVELS[level - 1];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  };
  const loadLevel = (n: number) => {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    serveBall();
    callbacks.onLevel?.(level);
  };
  const gameOver = () => {
    if (over) return;
    over = true;
    clearKeys();
    callbacks.onGameOver(score);
  };
  const reset = () => {
    score = 0;
    lives = START_LIVES;
    paddle.x = (W - paddle.w) / 2;
    clearKeys();
    loadLevel(1);
    callbacks.onScore(score);
    callbacks.onLives?.(lives);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code) || isEditable(e.target)) return;
    e.preventDefault(); // evita el scroll de la página
    keys[e.code as keyof typeof keys] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) keys[e.code as keyof typeof keys] = false;
  };
  const onBlur = () => clearKeys();
  const onMouseMove = (e: MouseEvent) => {
    if (paused || over) return;
    // El canvas se escala por CSS: convierte a coordenadas lógicas
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = ((e.clientX - rect.left) * W) / rect.width;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  };
  const update = (dt: number) => {
    if (!ready) return;
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebotes en paredes (izquierda, derecha, techo)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      play(bounceSound);
    }
    // Rebote en la pala
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_BOUNCE_MARGIN
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      play(bounceSound);
    }
    // Colisión con bloques (uno por cuadro)
    for (const block of blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      score += BLOCK_POINTS;
      callbacks.onScore(score);
      ball.vy = -ball.vy;
      play(breakSound);
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) loadLevel(level + 1);
        else {
          gameOver(); // completó los 5 niveles
          return;
        }
      }
      break;
    }
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
    // Bola perdida
    if (ball.y > H) {
      lives--;
      callbacks.onLives?.(Math.max(lives, 0));
      if (lives <= 0) gameOver();
      else serveBall();
    }
  };
  const drawFrame = (frame: Frame, r: Rect) => {
    if (!sheet) return false;
    ctx.drawImage(
      sheet,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      r.x,
      r.y,
      r.w,
      r.h,
    );
    return true;
  };
  const draw = () => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    if (!ready) return;
    for (const block of blocks) {
      if (!block.alive) continue;
      if (!drawFrame(BLOCK_SPRITES[block.color], block)) {
        ctx.fillStyle = FALLBACK_COLORS[block.color];
        ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
      }
    }
    for (const exp of explosions) {
      const i = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
      drawFrame(EXPLOSION_FRAMES[exp.color][i], exp);
    }
    if (!drawFrame(PADDLE_SPRITE, paddle)) {
      ctx.fillStyle = PADDLE_COLOR;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    }
    if (!drawFrame(BALL_SPRITE, ball)) {
      ctx.fillStyle = BALL_COLOR;
      ctx.fillRect(ball.x, ball.y, ball.w, ball.h);
    }
  };
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (!paused && !over) update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  };
  // Carga del spritesheet: si falla, el juego arranca con rectángulos de color
  const img = new Image();
  img.onload = () => {
    if (destroyed) return;
    sheet = img;
    ready = true;
    last = performance.now();
  };
  img.onerror = () => {
    if (destroyed) return;
    ready = true;
    last = performance.now();
  };
  img.src = SPRITE_URL;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("mousemove", onMouseMove);
  reset();
  last = performance.now();
  raf = requestAnimationFrame(frame);
  return {
    pause() {
      paused = true;
      clearKeys();
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
      muted = m;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousemove", onMouseMove);
      img.onload = null;
      img.onerror = null;
    },
  };
};
