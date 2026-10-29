"use server";
import { revalidatePath } from "next/cache";
import { getAuthStatus } from "@/lib/auth";
import { getGame } from "@/lib/games-repo";
import { createClient } from "@/lib/supabase/server";
export type SaveScoreResult =
  { ok: true } | { ok: false; reason: "unauthenticated" | "invalid" | "error" };
// Mismo rango que el check de public.scores.
const MAX_SCORE = 10_000_000;
// El puntaje lo envía el cliente (falsificable, aceptado en la spec): aquí solo
// se valida sesión, juego y rango. La identidad sale de la sesión, no del
// argumento: user_id lo rellena la base con auth.uid().
export async function saveScore(
  gameId: string,
  score: number,
): Promise<SaveScoreResult> {
  if (
    typeof gameId !== "string" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return { ok: false, reason: "invalid" };
  }
  // Sin sesión o sin perfil (OAuth sin username, spec 11) no se guarda.
  const auth = await getAuthStatus();
  if (auth.status !== "ready") return { ok: false, reason: "unauthenticated" };
  let game;
  try {
    game = await getGame(gameId);
  } catch (e) {
    console.error(`[scores] ${e instanceof Error ? e.message : e}`);
    return { ok: false, reason: "error" };
  }
  if (!game) return { ok: false, reason: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, score });
  if (error) {
    console.error(
      `[scores] No se pudo guardar la puntuación: ${error.message}`,
    );
    return { ok: false, reason: "error" };
  }
  // Páginas que muestran rankings, recientes, top jugadores, best y plays.
  revalidatePath("/");
  revalidatePath("/juegos");
  revalidatePath("/salon");
  revalidatePath(`/juegos/${gameId}`);
  return { ok: true };
}
