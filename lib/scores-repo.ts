import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatScoreDate, type GameStats, type ScoreEntry } from "@/lib/scores";
interface ScoreRow {
  game_id: string;
  score: number;
  created_at: string;
  profiles: { username: string } | null;
}
interface GameStatsRow {
  game_id: string;
  best: number;
  plays: number;
}
interface TopPlayerRow {
  username: string;
  best: number;
}
const SCORE_COLUMNS = "game_id, score, created_at, profiles(username)";
const toEntry = (row: ScoreRow, i: number): ScoreEntry => ({
  rank: i + 1,
  username: row.profiles?.username ?? "—",
  score: row.score,
  date: formatScoreDate(row.created_at),
  gameId: row.game_id,
});
// Todas las funciones lanzan si la consulta falla; quien las llama decide qué
// mostrar. React.cache evita repetir la consulta dentro de una misma petición.
// Mejores puntuaciones de un juego, de mayor a menor.
export const getTopScores = cache(
  async (gameId: string, limit = 10): Promise<ScoreEntry[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scores")
      .select(SCORE_COLUMNS)
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit)
      .overrideTypes<ScoreRow[]>();
    if (error) {
      throw new Error(
        `No se pudo leer el ranking de "${gameId}": ${error.message}`,
      );
    }
    return data.map(toEntry);
  },
);
// Últimas puntuaciones de cualquier juego. `rank` es la posición en la lista.
export const getRecentScores = cache(
  async (limit = 7): Promise<ScoreEntry[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scores")
      .select(SCORE_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit)
      .overrideTypes<ScoreRow[]>();
    if (error) {
      throw new Error(
        `No se pudieron leer las puntuaciones recientes: ${error.message}`,
      );
    }
    return data.map(toEntry);
  },
);
// Mejor puntuación por jugador, de mayor a menor.
export const getTopPlayers = cache(
  async (limit = 5): Promise<{ username: string; best: number }[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("top_players")
      .select("username, best")
      .order("best", { ascending: false })
      .limit(limit)
      .overrideTypes<TopPlayerRow[]>();
    if (error) {
      throw new Error(`No se pudo leer el top de jugadores: ${error.message}`);
    }
    return data.map((row) => ({ username: row.username, best: row.best }));
  },
);
// Una entrada por juego del catálogo; sin partidas: best = 0 y plays = 0.
export const getGameStats = cache(async (): Promise<GameStats[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_stats")
    .select("game_id, best, plays")
    .overrideTypes<GameStatsRow[]>();
  if (error) {
    throw new Error(`No se pudieron leer las estadísticas: ${error.message}`);
  }
  return data.map((row) => ({
    gameId: row.game_id,
    best: row.best,
    plays: row.plays,
  }));
});
