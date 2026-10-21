// ===== games.ts — tipos y constantes de interfaz (el catálogo vive en Supabase: lib/games-repo.ts) =====

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string; // slug de URL, p. ej. "bloque-buster"
  title: string;
  short: string; // descripción de tarjeta
  long: string; // descripción de detalle
  cat: Category;
  cover: string; // clase CSS existente, p. ej. "cover-bricks"
  color: Accent;
}

export const CATS: ("TODOS" | Category)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
