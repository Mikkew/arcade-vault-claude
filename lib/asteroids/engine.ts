// ===== engine.ts — bucle, estado, colisiones, entrada y dibujo de Asteroides =====
// Independiente de React. Se comunica con el HUD de la plataforma por callbacks.
import { drawScanlines, withGlow } from "@/lib/engine/skin-fx";
import { DEFAULT_SKIN, type SkinId } from "@/lib/engine/skins";
import { createAudio } from "./audio";
import { PALETTES } from "./palettes";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
} from "./entities";
import {
  H,
  INITIAL_ASTEROIDS,
  INITIAL_LIVES,
  MAX_DT,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_DELAY,
  SAFE_DIST,
  W,
  type AsteroidsCallbacks,
  type AsteroidsGame,
  type Keys,
  type Phase,
} from "./types";
// Teclas que el motor captura mientras está activo
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
  skin?: SkinId,
): AsteroidsGame {
  // Paleta del skin activo; restart() e initGame() no la tocan
  let pal = PALETTES[skin ?? DEFAULT_SKIN];
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  canvas.width = W;
  canvas.height = H;
  // ── Entrada ──
  const keys: Keys = {};
  const justPressed: Keys = {};
  const pressed = (code: string) => {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  };
  const clearKeys = () => {
    for (const code of Object.keys(keys)) keys[code] = false;
    for (const code of Object.keys(justPressed)) justPressed[code] = false;
  };
  const isEditable = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code) || isEditable(e.target)) return;
    e.preventDefault(); // evita scroll y que Espacio active un botón enfocado
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;
    keys[e.code] = false;
  };
  const onVisibility = () => {
    if (document.hidden) clearKeys();
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", onVisibility);
  const audio = createAudio();
  // ── Estado ──
  const ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let phase: Phase = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  // ── Callbacks: solo se notifica cuando el valor cambia ──
  let sentScore: number | null = null;
  let sentLives: number | null = null;
  let sentLevel: number | null = null;
  const notify = () => {
    if (score !== sentScore) {
      sentScore = score;
      callbacks.onScore(score);
    }
    if (lives !== sentLives) {
      sentLives = lives;
      callbacks.onLives?.(lives);
    }
    if (level !== sentLevel) {
      sentLevel = level;
      callbacks.onLevel?.(level);
    }
  };
  // ── Lógica ──
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship.reset();
    ship.tripleShot = 0;
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    phase = "playing";
    clearKeys();
    spawnAsteroids(INITIAL_ASTEROIDS);
    notify();
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function gameOver() {
    if (phase === "gameover") return;
    phase = "gameover";
    audio.play("gameover");
    notify();
    callbacks.onGameOver(score);
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    audio.play("shipDeath");
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      gameOver();
    } else {
      phase = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }
  function update(dt: number) {
    if (phase === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }
    if (phase === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) {
      const shots = ship.tryShoot();
      if (shots.length > 0) {
        bullets.push(...shots);
        audio.play("shoot");
      }
    }
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
        audio.play("powerup");
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          audio.play("explosion", a.size);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (phase === "playing" && asteroids.length === 0) nextLevel();
    notify();
  }
  // ── Dibujo (sin HUD: puntuación, vidas y nivel los pinta la plataforma) ──
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx, pal));
    asteroids.forEach((a) => a.draw(ctx, pal));
    powerUps.forEach((p) => p.draw(ctx, pal));
    bullets.forEach((b) => b.draw(ctx, pal));
    ship.draw(ctx, pal);
    // Temporizador del power-up: el HUD de la plataforma no tiene campo para esto
    if (ship.tripleShot > 0) {
      ctx.font = pal.hudFont;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = pal.hud;
      withGlow(ctx, pal.hud, pal.blur.hud * pal.fx.glow, () =>
        ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26),
      );
    }
    // Scanlines del skin retro, encima de todo (también del temporizador)
    drawScanlines(ctx, W, H, pal.fx.scanlines);
  }
  // ── Bucle ──
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;
  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (rafId === null && !destroyed && !paused) {
      lastTime = null; // primer frame con dt = 0
      rafId = requestAnimationFrame(loop);
    }
  }
  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }
  initGame();
  start();
  return {
    pause() {
      if (paused) return;
      paused = true;
      stop();
      clearKeys();
    },
    resume() {
      if (!paused) return;
      paused = false;
      start();
    },
    end() {
      gameOver();
    },
    restart() {
      initGame();
      if (!paused) start();
    },
    setMuted(muted) {
      audio.setMuted(muted);
    },
    setSkin(s) {
      pal = PALETTES[s] ?? PALETTES.clasico;
      // Sin bucle activo (en pausa) se redibuja un frame para que el cambio se vea
      if (!destroyed && rafId === null) draw();
    },
    destroy() {
      destroyed = true;
      stop();
      audio.destroy();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
