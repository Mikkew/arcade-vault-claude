import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import CatalogError from "@/components/CatalogError";
import Leaderboard from "@/components/Leaderboard";
import { seededScores, type Game } from "@/lib/games";
import { getGame } from "@/lib/games-repo";

export async function generateMetadata({ params }: PageProps<"/juegos/[id]">): Promise<Metadata> {
  const { id } = await params;
  let game: Game | null = null;
  try {
    game = await getGame(id);
  } catch (err) {
    unstable_rethrow(err);
    // Si la consulta falla, la página muestra el error; aquí basta con no poner título.
  }
  if (!game) return {};
  return { title: `${game.title} · Arcade Vault`, description: game.short };
}

export default async function GameDetailPage({ params }: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  let game: Game | null;
  try {
    game = await getGame(id);
  } catch (err) {
    unstable_rethrow(err);
    console.error("[juegos/detalle]", err);
    return <CatalogError />;
  }
  if (!game) notFound();

  const scores = seededScores(id.length * 17 + 3, 10);

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">0</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}
              >
                —
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶&nbsp; JUGAR AHORA
            </Link>
            <Link href="/juegos" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard scores={scores} />
      </aside>
    </div>
  );
}
