// ===== engine.ts — bucle, estado, entrada y dibujo de Bloque Buster (Arkanoid) =====
// Independiente de React. Se comunica con el HUD de la plataforma por callbacks.
import { drawScanlines, withGlow } from "@/lib/engine/skin-fx";
import { DEFAULT_SKIN } from "@/lib/engine/skins";
import type { CreateEngine, TouchAction } from "@/lib/engine/types";
import { LEVELS } from "./levels";
import { PALETTES } from "./palettes";
import {
  BALL_SPRITE,
  BLOCK_SPRITES,
  EXPLOSION_FRAMES,
  PADDLE_SPRITE,
} from "./sprites";
import {
  BASE_BALL_VX,
  BASE_BALL_VY,
  BALL_SIZE,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  BOUNCE_SOUND_URL,
  BREAK_SOUND_URL,
  EXPLOSION_DURATION,
  H,
  MAX_DT,
  PADDLE_BOUNCE_MARGIN,
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
// Cada acción táctil equivale a mantener una de esas teclas
const TOUCH_KEYS: Partial<Record<TouchAction, "ArrowLeft" | "ArrowRight">> = {
  left: "ArrowLeft",
  right: "ArrowRight",
};
const collideAABB = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const createBloqueBusterGame: CreateEngine = (
  canvas,
  callbacks,
  skin,
) => {
  // Paleta del skin activo; reset(), restart() y loadLevel() no la tocan
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
  // Ratón, lápiz o dedo: pointerdown coloca la pala al tocar y pointermove la arrastra
  const onPointer = (e: PointerEvent) => {
    if (paused || over) return;
    // El canvas se escala por CSS: convierte a coordenadas lógicas
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const pointerX = ((e.clientX - rect.left) * W) / rect.width;
    paddle.x = Math.max(0, Math.min(W - paddle.w, pointerX - paddle.w / 2));
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
  // Caja plana: relleno sólido, o trazo con relleno translúcido si `line` > 0.
  // El brillo (`blur`) solo se aplica al trazo, nunca al relleno.
  const drawBox = (r: Rect, color: string, line: number, blur = 0) => {
    if (line <= 0) {
      ctx.fillStyle = color;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      return;
    }
    ctx.save();
    ctx.globalAlpha = pal.fillAlpha;
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    // El trazo se dibuja hacia dentro para no salir de la caja
    ctx.lineWidth = line;
    ctx.strokeStyle = color;
    withGlow(ctx, color, blur * pal.fx.glow, () =>
      ctx.strokeRect(r.x + line / 2, r.y + line / 2, r.w - line, r.h - line),
    );
  };
  const insetRect = (r: Rect, inset: number): Rect => ({
    x: r.x + inset,
    y: r.y + inset,
    w: r.w - inset * 2,
    h: r.h - inset * 2,
  });
  const drawBlock = (block: Block) => {
    if (pal.sprites && drawFrame(BLOCK_SPRITES[block.color], block)) {
      // Velo de corrección de contraste sobre el sprite (solo la piedra en clásico)
      const tint = pal.spriteTint[block.color];
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(block.x, block.y, block.w, block.h);
      }
      return;
    }
    const line = pal.blockStyle === "outline" ? pal.line.block : 0;
    drawBox(
      insetRect(block, pal.blockInset),
      pal.blocks[block.color],
      line,
      pal.blur.block,
    );
  };
  const drawExplosion = (exp: Explosion) => {
    const t = Math.min(exp.elapsed / EXPLOSION_DURATION, 1);
    const i = Math.min(Math.floor(t * 4), 3);
    const color = pal.blocks[exp.color];
    if (pal.explosion === "sprite") {
      if (pal.sprites) drawFrame(EXPLOSION_FRAMES[exp.color][i], exp);
      return;
    }
    if (pal.explosion === "fade") {
      // El margen crece hacia el centro y el trazo se desvanece; nunca sale de la celda
      const m = pal.blockInset + (exp.h / 2 - pal.blockInset) * t;
      const line = pal.line.explosion;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = line;
      ctx.strokeStyle = color;
      ctx.strokeRect(
        exp.x + m + line / 2,
        exp.y + m + line / 2,
        Math.max(0, exp.w - m * 2 - line),
        Math.max(0, exp.h - m * 2 - line),
      );
      ctx.restore();
      return;
    }
    // "steps": rectángulo plano que encoge hacia el centro en 4 pasos
    const scale = 1 - i * 0.25;
    const r = insetRect(exp, pal.blockInset);
    const w = r.w * scale;
    const h = r.h * scale;
    ctx.fillStyle = color;
    ctx.fillRect(r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
  };
  const drawPaddle = () => {
    if (pal.sprites && drawFrame(PADDLE_SPRITE, paddle)) return;
    drawBox(paddle, pal.paddle, pal.line.paddle, pal.blur.paddle);
    if (!pal.paddleAccent) return;
    // Extremos de 8 px, como el Vaus original
    const end = { ...paddle, w: 8 };
    drawBox(end, pal.paddleAccent, pal.line.paddle, pal.blur.paddle);
    drawBox(
      { ...end, x: paddle.x + paddle.w - 8 },
      pal.paddleAccent,
      pal.line.paddle,
      pal.blur.paddle,
    );
  };
  const drawBall = () => {
    if (pal.sprites && drawFrame(BALL_SPRITE, ball)) return;
    ctx.fillStyle = pal.ball;
    const blur = pal.blur.ball * pal.fx.glow;
    if (pal.ballShape === "circle") {
      // Solo dibujo: la colisión sigue siendo la caja de 16×16
      ctx.beginPath();
      ctx.arc(
        ball.x + ball.w / 2,
        ball.y + ball.h / 2,
        ball.w / 2,
        0,
        Math.PI * 2,
      );
      withGlow(ctx, pal.ball, blur, () => ctx.fill());
    } else {
      withGlow(ctx, pal.ball, blur, () =>
        ctx.fillRect(ball.x, ball.y, ball.w, ball.h),
      );
    }
  };
  const draw = () => {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    if (!ready) return;
    for (const block of blocks) if (block.alive) drawBlock(block);
    for (const exp of explosions) drawExplosion(exp);
    drawPaddle();
    drawBall();
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
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerdown", onPointer);
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
    // El bucle dibuja cada frame aunque esté en pausa: el cambio se ve al instante
    setSkin(s) {
      if (destroyed) return;
      pal = PALETTES[s] ?? PALETTES.clasico;
    },
    setInput(action, down) {
      const code = TOUCH_KEYS[action];
      if (!code) return;
      if (down && (paused || over)) return;
      keys[code] = down;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerdown", onPointer);
      img.onload = null;
      img.onerror = null;
    },
  };
};
