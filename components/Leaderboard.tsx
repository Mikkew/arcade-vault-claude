import type { ScoreEntry } from "@/lib/scores";
interface LeaderboardProps {
  // null: la consulta falló.
  scores: ScoreEntry[] | null;
  // Texto del estado vacío; cada página decide si invita a jugar.
  emptyHint?: string;
}
export default function Leaderboard({ scores, emptyHint }: LeaderboardProps) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {scores === null ? (
        <div className="terminal-error" role="alert" style={{ marginTop: 14 }}>
          ERROR: NO SE PUDO CARGAR EL RANKING. INTÉNTALO DE NUEVO MÁS TARDE.
        </div>
      ) : scores.length === 0 ? (
        <div style={{ padding: "28px 8px", textAlign: "center" }}>
          <div
            className="pixel"
            style={{ fontSize: 12, color: "var(--ink-dim)" }}
          >
            SIN PUNTUACIONES
          </div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              marginTop: 10,
              lineHeight: 1.6,
            }}
          >
            Todavía no hay partidas guardadas en este juego.
            {emptyHint && <> {emptyHint}</>}
          </div>
        </div>
      ) : (
        scores.map((r, i) => (
          <div
            key={r.rank}
            className={
              "lb-row" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.username}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
