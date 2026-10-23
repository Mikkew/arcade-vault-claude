// ===== skin-fx.ts — efectos de dibujo compartidos por los skins (brillo y scanlines) =====
export interface SkinFx {
  glow: number; // multiplicador de shadowBlur; 0 = sin brillo
  scanlines: { alpha: number; step: number } | null; // solo retro
}
// Dibuja con brillo de neón; save/restore evita que shadowBlur se quede activo
export function withGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
  draw: () => void,
): void {
  if (blur <= 0) {
    draw();
    return;
  }
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  draw();
  ctx.restore();
}
// Líneas horizontales de 1 px cada `step` px; no hace nada con null
export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: SkinFx["scanlines"],
): void {
  if (!s) return;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${s.alpha})`;
  for (let y = 0; y < h; y += s.step) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}
