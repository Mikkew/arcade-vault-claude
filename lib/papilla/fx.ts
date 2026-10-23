// ===== fx.ts — manchas, partículas, burbujas, textos y sacudida de Papilla =====
// Todo dibujado por código y avanzado solo en update(), así PAUSA lo congela.
import {
  FLOAT_TEXT_MS,
  FLOAT_TEXT_RISE,
  MAX_PARTICLES,
  MAX_SPLATS,
  PARTICLE_LIFE_MS,
  PARTICLE_SPEED,
  SHAKE_MS,
  SHAKE_PX,
  SPLAT_PARTICLES,
  TEXT_COLOR,
  type Rng,
} from "./types";
export interface Splat {
  x: number;
  y: number; // px
  color: string; // "#00ff88" rana, "#ff006e" sapo
  seed: number; // forma irregular reproducible
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number; // px/s
  life: number; // ms restantes
  color: string;
  bubble: boolean; // burbuja de ahogado: sube y se dibuja hueca
}
export interface FloatText {
  x: number;
  y: number;
  text: string; // "+100 ¡PAPILLA!", "+200", "¡CHOF!"
  life: number; // ms
  color: string;
}
interface Ring {
  x: number;
  y: number;
  life: number; // ms
  delay: number; // ms antes de empezar a crecer
}
interface Flash {
  x: number;
  y: number;
  color: string;
  life: number; // ms
}
const RING_MS = 700;
const FLASH_MS = 450;
// Generador determinista para que cada mancha conserve su forma
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createFx(rng: Rng) {
  let splats: Splat[] = [];
  let particles: Particle[] = [];
  let texts: FloatText[] = [];
  let rings: Ring[] = [];
  let flashes: Flash[] = [];
  let shake = 0;
  const addParticle = (p: Particle) => {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(p);
  };
  const burst = (x: number, y: number, color: string) => {
    for (let i = 0; i < SPLAT_PARTICLES; i++) {
      const a = rng() * Math.PI * 2;
      const v = PARTICLE_SPEED * (0.4 + rng() * 0.6);
      addParticle({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: PARTICLE_LIFE_MS * (0.6 + rng() * 0.4),
        color,
        bubble: false,
      });
    }
  };
  const drawSpiralEye = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#05070d";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 4; t += 0.3) {
      const r = (t / (Math.PI * 4)) * 4;
      const px = x + Math.cos(t) * r;
      const py = y + Math.sin(t) * r;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };
  return {
    // Mancha persistente (carretera) o solo salpicadura (seto, nenúfar, tiempo)
    splat(x: number, y: number, color: string, persistent: boolean) {
      if (persistent) {
        if (splats.length >= MAX_SPLATS) splats.shift();
        splats.push({ x, y, color, seed: Math.floor(rng() * 1e9) });
      }
      burst(x, y, color);
      texts.push({ x, y: y - 14, text: "¡CHOF!", life: FLOAT_TEXT_MS, color });
    },
    drown(x: number, y: number) {
      for (let i = 0; i < 10; i++)
        addParticle({
          x: x + (rng() - 0.5) * 24,
          y: y + (rng() - 0.5) * 10,
          vx: (rng() - 0.5) * 20,
          vy: -30 - rng() * 50,
          life: PARTICLE_LIFE_MS,
          color: "#9fe8ff",
          bubble: true,
        });
      for (let i = 0; i < 3; i++)
        rings.push({ x, y, life: RING_MS, delay: i * 150 });
    },
    text(x: number, y: number, text: string, color = TEXT_COLOR) {
      texts.push({ x, y, text, life: FLOAT_TEXT_MS, color });
    },
    flash(x: number, y: number, color: string) {
      flashes.push({ x, y, color, life: FLASH_MS });
    },
    shake() {
      shake = SHAKE_MS;
    },
    update(dt: number) {
      const s = dt / 1000;
      for (const p of particles) {
        p.life -= dt;
        p.x += p.vx * s;
        p.y += p.vy * s;
        if (!p.bubble) {
          p.vx *= 0.92;
          p.vy *= 0.92;
        }
      }
      particles = particles.filter((p) => p.life > 0);
      for (const t of texts) t.life -= dt;
      texts = texts.filter((t) => t.life > 0);
      for (const r of rings) {
        if (r.delay > 0) r.delay -= dt;
        else r.life -= dt;
      }
      rings = rings.filter((r) => r.life > 0);
      for (const f of flashes) f.life -= dt;
      flashes = flashes.filter((f) => f.life > 0);
      shake = Math.max(0, shake - dt);
    },
    // Las manchas se borran al empezar la ronda siguiente
    clearRound() {
      splats = [];
    },
    clearAll() {
      splats = [];
      particles = [];
      texts = [];
      rings = [];
      flashes = [];
      shake = 0;
    },
    shakeOffset(): { x: number; y: number } {
      if (shake <= 0) return { x: 0, y: 0 };
      const k = (shake / SHAKE_MS) * SHAKE_PX;
      return { x: (rng() * 2 - 1) * k, y: (rng() * 2 - 1) * k };
    },
    // Debajo de los vehículos y con opacidad 0,6 para no tapar el tráfico
    drawUnder(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      for (const sp of splats) {
        const r = seeded(sp.seed);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 13, 0, Math.PI * 2);
        for (let i = 0; i < 6; i++) {
          const a = r() * Math.PI * 2;
          const d = 6 + r() * 10;
          ctx.moveTo(sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d);
          ctx.arc(
            sp.x + Math.cos(a) * d,
            sp.y + Math.sin(a) * d,
            4 + r() * 6,
            0,
            Math.PI * 2,
          );
        }
        for (let i = 0; i < 4; i++) {
          const a = r() * Math.PI * 2;
          const d = 20 + r() * 6;
          const px = sp.x + Math.cos(a) * d;
          const py = sp.y + Math.sin(a) * d;
          ctx.moveTo(px, py);
          ctx.arc(px, py, 1.5 + r() * 1.5, 0, Math.PI * 2);
        }
        ctx.fill();
        drawSpiralEye(ctx, sp.x - 6, sp.y - 3);
        drawSpiralEye(ctx, sp.x + 6, sp.y - 4);
      }
      ctx.restore();
    },
    drawOver(ctx: CanvasRenderingContext2D) {
      ctx.save();
      for (const f of flashes) {
        const k = f.life / FLASH_MS;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 60);
        g.addColorStop(0, f.color);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = k * 0.8;
        ctx.fillStyle = g;
        ctx.fillRect(f.x - 60, f.y - 60, 120, 120);
      }
      for (const r of rings) {
        if (r.delay > 0) continue;
        const k = 1 - r.life / RING_MS;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = "#9fe8ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, 6 + k * 28, 3 + k * 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / PARTICLE_LIFE_MS);
        if (p.bubble) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
      }
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const t of texts) {
        const k = 1 - t.life / FLOAT_TEXT_MS;
        ctx.globalAlpha = Math.min(1, (t.life / FLOAT_TEXT_MS) * 2);
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.fillText(t.text, t.x, t.y - k * FLOAT_TEXT_RISE);
      }
      ctx.restore();
    },
  };
}
export type PapillaFx = ReturnType<typeof createFx>;
