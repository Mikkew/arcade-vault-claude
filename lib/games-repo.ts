import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Accent, Category, Game } from "@/lib/games";
const COLUMNS = "id, title, short, long, cat, cover, color";
interface GameRow {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: Accent;
}
const toGame = (row: GameRow): Game => ({
  id: row.id,
  title: row.title,
  short: row.short,
  long: row.long,
  cat: row.cat,
  cover: row.cover,
  color: row.color,
});
// Ambas funciones lanzan si la consulta falla; quien las llama decide qué mostrar.
// React.cache evita repetir la consulta dentro de una misma petición.
export const listGames = cache(async (): Promise<Game[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(COLUMNS)
    .order("sort_order", { ascending: true })
    .overrideTypes<GameRow[]>();
  if (error) {
    throw new Error(`No se pudo leer el catálogo de juegos: ${error.message}`);
  }
  return data.map(toGame);
});
// null si el juego no existe; lanza si la consulta falla.
export const getGame = cache(
  async (id: string): Promise<Game | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("games")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle<GameRow>();
    if (error) {
      throw new Error(`No se pudo leer el juego "${id}": ${error.message}`);
    }
    return data ? toGame(data) : null;
  },
);
