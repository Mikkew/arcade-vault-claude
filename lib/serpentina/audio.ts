// ===== audio.ts — efectos sintetizados con Web Audio para Serpentina =====
// El AudioContext se crea tras el primer gesto del usuario (política de autoplay).
export type Sfx = "eat" | "levelUp" | "crash";
export interface SerpentinaAudio {
  play(sfx: Sfx): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}
const MASTER_VOLUME = 0.4;
export function createAudio(): SerpentinaAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
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
  return {
    play(sfx) {
      if (muted) return;
      try {
        if (sfx === "eat") tone("square", 520, 880, 0.09, 0.25);
        else if (sfx === "levelUp") {
          tone("square", 440, 440, 0.08, 0.25);
          tone("square", 660, 660, 0.08, 0.25, 0.09);
          tone("square", 880, 880, 0.14, 0.25, 0.18);
        } else tone("sawtooth", 300, 50, 0.5, 0.35);
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
    },
  };
}
