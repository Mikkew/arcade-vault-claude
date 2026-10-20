import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import CatalogError from "@/components/CatalogError";
import HallOfFame from "@/components/HallOfFame";
import type { Game } from "@/lib/games";
import { listGames } from "@/lib/games-repo";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};

export default async function SalonPage() {
  let games: Game[] | null = null;
  try {
    games = await listGames();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[salon]", err);
  }

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      {games ? <HallOfFame games={games} /> : <CatalogError />}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
