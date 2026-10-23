// ===== audio.ts — efectos sintetizados con Web Audio para Papilla =====
// El AudioContext se crea tras el primer gesto del usuario (política de autoplay).
export type Sfx =
  | "hop"
  | "splat"
  | "drown"
  | "claim"
  | "rivalClaim"
  | "rivalSplat"
  | "roundWin"
  | "roundLose"
  | "tick"
  | "extraLife"
  | "horn";
export interface PapillaAudio {
  play(sfx: Sfx): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}
const MASTER_VOLUME = 0.4;
export function createAudio(): PapillaAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;
  const unlock = () => {
    if (ctx) return;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_VOLUME;
      master.connect(ctx.destination);
      // Medio segundo de ruido blanco, reutilizado por los "chof"
      noise = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate / 2),
        ctx.sampleRate,
      );
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      void ctx.resume();
    } catch {
      ctx = null;
    }
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);
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
  // Ruido blanco con un paso bajo que baja de frecuencia: el "¡CHOF!"
  const burst = (
    from: number,
    to: number,
    duration: number,
    volume: number,
    delay = 0,
  ) => {
    if (!ctx || !master || !noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
    src.stop(t + duration);
  };
  const notes = (
    type: OscillatorType,
    freqs: number[],
    each: number,
    volume: number,
  ) => freqs.forEach((f, i) => tone(type, f, f, each, volume, i * each));
  return {
    play(sfx) {
      if (muted) return;
      try {
        switch (sfx) {
          case "hop":
            tone("square", 600, 900, 0.05, 0.12);
            break;
          case "splat":
            burst(1200, 200, 0.25, 0.5);
            tone("sawtooth", 180, 60, 0.25, 0.25);
            break;
          case "drown":
            for (let i = 0; i < 3; i++)
              tone("sine", 400, 150, 0.07, 0.3, i * 0.08);
            break;
          case "claim":
            notes("square", [523, 659, 784], 0.06, 0.2);
            break;
          case "rivalClaim":
            tone("triangle", 700, 700, 0.12, 0.3);
            tone("triangle", 520, 520, 0.16, 0.3, 0.14);
            break;
          case "rivalSplat":
            burst(2400, 400, 0.15, 0.4);
            tone("sine", 1320, 1320, 0.2, 0.2, 0.15);
            break;
          case "roundWin":
            notes("square", [523, 659, 784, 1047], 0.1, 0.22);
            break;
          case "roundLose":
            notes("square", [440, 349, 262], 0.14, 0.22);
            break;
          case "tick":
            tone("square", 1800, 1800, 0.02, 0.1);
            break;
          case "extraLife":
            tone("square", 880, 1760, 0.08, 0.2);
            tone("square", 880, 1760, 0.08, 0.2, 0.1);
            break;
          case "horn":
            tone("square", 350, 350, 0.2, 0.12);
            tone("square", 440, 440, 0.2, 0.12);
            break;
        }
      } catch {
        // un fallo de audio nunca rompe el loop
      }
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : MASTER_VOLUME;
    },
    destroy() {
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
      void ctx?.close().catch(() => {});
      ctx = null;
      master = null;
      noise = null;
    },
  };
}
