import Link from "next/link";
import type { Game } from "@/lib/games";
import type { ScoreEntry } from "@/lib/scores";
interface HallOfFameProps {
  games: Game[];
  selectedId: string;
  // null: la consulta de puntuaciones falló.
  rows: ScoreEntry[] | null;
}
export default function HallOfFame({
  games,
  selectedId,
  rows,
}: HallOfFameProps) {
  if (games.length === 0) {
    return (
      <div
        style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}
      >
        <div
          className="pixel"
          style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
        >
          CATÁLOGO VACÍO
        </div>
        <div>Todavía no hay juegos disponibles.</div>
      </div>
    );
  }
  const selected = games.find((g) => g.id === selectedId);
  return (
    <>
      <div className="hall-tabs">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            scroll={false}
            className={"chip" + (selectedId === g.id ? " active" : "")}
            aria-current={selectedId === g.id ? "page" : undefined}
          >
            {g.title}
          </Link>
        ))}
      </div>
      {rows === null ? (
        <div className="terminal-error" role="alert">
          ERROR: NO SE PUDO CARGAR EL RANKING. INTÉNTALO DE NUEVO MÁS TARDE.
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--ink-dim)", marginBottom: 12 }}
          >
            SIN PUNTUACIONES
          </div>
          <div style={{ marginBottom: 24 }}>
            Todavía no hay partidas guardadas en{" "}
            {selected?.title ?? "este juego"}.
          </div>
          {selectedId === "rocas" && (
            <Link href="/juegos/rocas/jugar" className="btn yellow">
              JUGAR Y GUARDAR LA PRIMERA
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot entry={rows[1]} className="silver" place="02" />
            <PodiumSlot entry={rows[0]} className="gold" place="01" champion />
            <PodiumSlot entry={rows[2]} className="bronze" place="03" />
          </div>
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.username}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
// Con menos de tres partidas el puesto queda libre.
function PodiumSlot({
  entry,
  className,
  place,
  champion = false,
}: {
  entry: ScoreEntry | undefined;
  className: string;
  place: string;
  champion?: boolean;
}) {
  return (
    <div className={"podium-slot " + className}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {place}
      </div>
      <div className="name">{entry?.username ?? "—"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {entry ? entry.score.toLocaleString("es-ES") : "—"}
      </div>
      <div className="date">{entry?.date ?? ""}</div>
    </div>
  );
}
