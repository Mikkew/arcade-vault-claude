// ===== audio.ts — efectos sintetizados con Web Audio para Ranaria =====
// El AudioContext se crea tras el primer gesto del usuario (política de autoplay).
export type Sfx = "hop" | "splat" | "pickup" | "rescue";
export interface RanariaAudio {
  play(sfx: Sfx): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}
const MASTER_VOLUME = 0.4;
export function createAudio(): RanariaAudio {
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
        if (sfx === "hop") tone("square", 380, 620, 0.06, 0.15);
        else if (sfx === "splat") tone("sawtooth", 260, 40, 0.45, 0.35);
        else if (sfx === "pickup") {
          // dos notas que suben: el renacuajo ya va a cuestas
          tone("triangle", 660, 660, 0.08, 0.3);
          tone("triangle", 990, 990, 0.12, 0.3, 0.09);
        } else {
          tone("square", 523, 523, 0.08, 0.25);
          tone("square", 659, 659, 0.08, 0.25, 0.09);
          tone("square", 784, 784, 0.08, 0.25, 0.18);
          tone("square", 1047, 1047, 0.16, 0.25, 0.27);
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
    },
  };
}
