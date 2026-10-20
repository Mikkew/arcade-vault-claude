// ===== audio.ts — efectos de sonido sintetizados con Web Audio =====
// El AudioContext se crea de forma diferida tras el primer gesto del usuario
// (tecla o clic), por la política de autoplay de los navegadores. Antes no suena nada.
export type Sfx = "shoot" | "explosion" | "powerup" | "shipDeath" | "gameover";
export interface AsteroidsAudio {
  /** `size` (1-3) solo afecta a `explosion`: más grande, más grave y largo. */
  play(sfx: Sfx, size?: number): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}
const MASTER_VOLUME = 0.5;
export function createAudio(): AsteroidsAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let muted = false;
  const unlock = () => {
    if (ctx) return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
    // 1 s de ruido blanco reutilizable para explosiones
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    void ctx.resume();
    removeUnlockListeners();
  };
  function removeUnlockListeners() {
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("pointerdown", unlock);
  }
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);
  // Tono con barrido de frecuencia y envolvente de decaimiento
  const tone = (
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    volume: number,
    delay = 0,
  ) => {
    if (!ctx || !master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + duration);
  };
  // Ruido filtrado con barrido de corte
  const noise = (
    duration: number,
    volume: number,
    cutFrom: number,
    cutTo: number,
    delay = 0,
  ) => {
    if (!ctx || !master || !noiseBuffer) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutFrom, t);
    filter.frequency.exponentialRampToValueAtTime(cutTo, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
    src.stop(t + duration);
  };
  return {
    play(sfx, size = 2) {
      if (muted || !ctx) return;
      switch (sfx) {
        case "shoot":
          tone("square", 880, 220, 0.12, 0.07);
          break;
        case "explosion":
          noise(0.15 + size * 0.1, 0.25, 600 + size * 300, 100);
          break;
        case "powerup":
          tone("triangle", 440, 440, 0.09, 0.12);
          tone("triangle", 660, 660, 0.09, 0.12, 0.08);
          tone("triangle", 880, 880, 0.14, 0.12, 0.16);
          break;
        case "shipDeath":
          noise(0.7, 0.35, 1800, 80);
          tone("sawtooth", 220, 40, 0.6, 0.12);
          break;
        case "gameover":
          // Se retrasa para no pisar la explosión de la nave
          [392, 330, 262, 196].forEach((f, i) =>
            tone("square", f, f * 0.98, 0.28, 0.09, 0.7 + i * 0.28),
          );
          break;
      }
    },
    setMuted(value) {
      muted = value;
      if (ctx && master) {
        // Corta también lo que ya está sonando
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime);
      }
    },
    destroy() {
      removeUnlockListeners();
      if (ctx) void ctx.close();
      ctx = null;
      master = null;
      noiseBuffer = null;
    },
  };
}
