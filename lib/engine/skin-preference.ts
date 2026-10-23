// ===== skin-preference.ts — skin elegido por juego, guardado en localStorage =====
// Store externo para useSyncExternalStore. Todo acceso a localStorage va en
// try/catch: en modo privado o con el almacenamiento bloqueado lanza excepción.
import { DEFAULT_SKIN, isSkinId, type SkinId } from "./skins";
const PREFIX = "av:skin:";
// Copia en memoria por si localStorage no está disponible
const memory = new Map<string, SkinId>();
const listeners = new Set<() => void>();
const keyFor = (gameId: string) => `${PREFIX}${gameId}`;
// Skin guardado para el juego, o "clasico" si no hay valor válido y declarado
export function readSkin(gameId: string, allowed: readonly SkinId[]): SkinId {
  let value: unknown = memory.get(gameId);
  try {
    const stored = window.localStorage.getItem(keyFor(gameId));
    if (stored !== null) value = stored;
  } catch {
    // sin almacenamiento: se usa la copia en memoria
  }
  return isSkinId(value) && allowed.includes(value) ? value : DEFAULT_SKIN;
}
export function writeSkin(gameId: string, skin: SkinId): void {
  memory.set(gameId, skin);
  try {
    window.localStorage.setItem(keyFor(gameId), skin);
  } catch {
    // sin almacenamiento: el cambio vive solo en memoria
  }
  listeners.forEach((cb) => cb());
}
// Avisa de cambios propios (writeSkin) y de otras pestañas (evento storage)
export function subscribeSkin(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(PREFIX)) cb();
  };
  listeners.add(cb);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
