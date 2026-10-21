export interface ScoreEntry {
  rank: number;
  username: string;
  score: number;
  date: string; // "DD/MM/AAAA"
  gameId: string;
}
export interface GameStats {
  gameId: string;
  best: number; // 0 si no hay partidas
  plays: number;
}
// En UTC para que servidor y cliente formateen igual la misma fecha.
export function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getUTCFullYear()}`;
}
