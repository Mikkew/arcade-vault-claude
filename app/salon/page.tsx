import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import CatalogError from "@/components/CatalogError";
import HallOfFame from "@/components/HallOfFame";
import type { Game } from "@/lib/games";
import { listGames } from "@/lib/games-repo";
import type { ScoreEntry } from "@/lib/scores";
import { getGameStats, getTopScores } from "@/lib/scores-repo";
export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};
const ROWS = 12;
export default async function SalonPage({ searchParams }: PageProps<"/salon">) {
  const { juego } = await searchParams;
  let games: Game[] | null = null;
  try {
    games = await listGames();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[salon]", err);
  }
  // Juego pedido por ?juego=; si no es válido, el que más partidas tiene
  // (a igualdad, el primero del catálogo).
  let selectedId = "";
  let rows: ScoreEntry[] | null = null;
  if (games && games.length > 0) {
    const requested = typeof juego === "string" ? juego : undefined;
    try {
      const stats = await getGameStats();
      const plays = (id: string) =>
        stats.find((s) => s.gameId === id)?.plays ?? 0;
      selectedId = games.some((g) => g.id === requested)
        ? requested!
        : games.reduce((a, b) => (plays(b.id) > plays(a.id) ? b : a)).id;
    } catch (err) {
      unstable_rethrow(err);
      console.error("[salon] estadísticas", err);
      selectedId = games.some((g) => g.id === requested)
        ? requested!
        : games[0].id;
    }
    try {
      rows = await getTopScores(selectedId, ROWS);
    } catch (err) {
      unstable_rethrow(err);
      console.error("[salon] ranking", err);
    }
  }
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      {games ? (
        <HallOfFame games={games} selectedId={selectedId} rows={rows} />
      ) : (
        <CatalogError />
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
