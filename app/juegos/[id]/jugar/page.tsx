import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GamePlayer from "@/components/GamePlayer";
import { getGame } from "@/lib/games";

export async function generateMetadata({ params }: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return {};
  return { title: `Jugando ${game.title} · Arcade Vault`, description: game.short };
}

export default async function JugarPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer id={game.id} title={game.title} />;
}
