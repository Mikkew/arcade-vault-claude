import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import CatalogError from "@/components/CatalogError";
import GamePlayer from "@/components/GamePlayer";
import type { Game } from "@/lib/games";
import { getGame } from "@/lib/games-repo";

export async function generateMetadata({ params }: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  let game: Game | null = null;
  try {
    game = await getGame(id);
  } catch (err) {
    unstable_rethrow(err);
    // Si la consulta falla, la página muestra el error; aquí basta con no poner título.
  }
  if (!game) return {};
  return { title: `Jugando ${game.title} · Arcade Vault`, description: game.short };
}

export default async function JugarPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  let game: Game | null;
  try {
    game = await getGame(id);
  } catch (err) {
    unstable_rethrow(err);
    console.error("[juegos/jugar]", err);
    return <CatalogError />;
  }
  if (!game) notFound();

  return <GamePlayer id={game.id} title={game.title} />;
}
