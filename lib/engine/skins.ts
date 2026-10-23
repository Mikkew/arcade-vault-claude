// ===== skins.ts — skins comunes a todos los motores de juego =====
export type SkinId = "clasico" | "neon" | "retro";
// Etiquetas visibles en el selector del player (los ids no llevan tilde)
export const SKINS: readonly { id: SkinId; label: string }[] = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "neon", label: "NEÓN" },
  { id: "retro", label: "RETRO" },
];
export const DEFAULT_SKIN: SkinId = "clasico";
export function isSkinId(v: unknown): v is SkinId {
  return SKINS.some((s) => s.id === v);
}
