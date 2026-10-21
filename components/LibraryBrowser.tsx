"use client";

import { useMemo, useState } from "react";
import { CATS, type Game } from "@/lib/games";
import GameCard from "@/components/GameCard";
import type { GameStats } from "@/lib/scores";

// Ignora mayúsculas y tildes: "caida" encuentra "CAÍDA".
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function LibraryBrowser({
  games,
  stats,
}: {
  games: Game[];
  stats: GameStats[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("TODOS");

  const filtered = useMemo(() => {
    const needle = normalize(q);
    return games.filter(
      (g) => (cat === "TODOS" || g.cat === cat) && normalize(g.title).includes(needle),
    );
  }, [games, q, cat]);

  return (
    <>
      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              className={"chip" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            best={stats.find((s) => s.gameId === g.id)?.best ?? 0}
          />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
            >
              {games.length === 0 ? "CATÁLOGO VACÍO" : "NO HAY RESULTADOS"}
            </div>
            <div>
              {games.length === 0
                ? "Todavía no hay juegos disponibles."
                : "Intenta otra búsqueda o categoría."}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
