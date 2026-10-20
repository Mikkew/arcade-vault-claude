import { unstable_rethrow } from "next/navigation";
import CatalogError from "@/components/CatalogError";
import LibraryBrowser from "@/components/LibraryBrowser";
import type { Game } from "@/lib/games";
import { listGames } from "@/lib/games-repo";
export default async function Home() {
  let games: Game[] | null = null;
  try {
    games = await listGames();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[juegos]", err);
  }
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      {games ? <LibraryBrowser games={games} /> : <CatalogError />}
    </div>
  );
}
