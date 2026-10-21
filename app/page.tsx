import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import CatalogError from "@/components/CatalogError";
import FeatureIcon from "@/components/FeatureIcon";
import HomeSilhouettes from "@/components/HomeSilhouettes";
import MiniCard from "@/components/MiniCard";
import RevealObserver from "@/components/RevealObserver";
import type { Game } from "@/lib/games";
import { listGames } from "@/lib/games-repo";
import { FAQ, FEATURES, PRICING_PERKS, STATS } from "@/lib/home";
import type { ScoreEntry } from "@/lib/scores";
import { getRecentScores, getTopPlayers } from "@/lib/scores-repo";

export default async function Home() {
  let games: Game[] | null = null;
  try {
    games = await listGames();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[home]", err);
  }

  // Cada lectura falla por separado: null = error, [] = sin partidas.
  let recent: ScoreEntry[] | null = null;
  try {
    recent = await getRecentScores();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[home] recientes", err);
  }
  let topPlayers: { username: string; best: number }[] | null = null;
  try {
    topPlayers = await getTopPlayers();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[home] top jugadores", err);
  }
  const gameById = new Map((games ?? []).map((g) => [g.id, g]));

  return (
    <div className="home fade-in">
      <RevealObserver />

      {/* HERO */}
      <section className="home-hero">
        <HomeSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <Link href="/juegos" className="btn xl pulse">
              ▶&nbsp; EXPLORAR JUEGOS
            </Link>
            <Link href="/acceso" className="btn xl magenta">
              ✦&nbsp; CREAR CUENTA
            </Link>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-magenta">{"// 01"}</div>
          <h2 className="section-title">¿POR QUÉ ARCADE VAULT?</h2>
          <div className="section-rule"></div>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div
              key={f.icon}
              className={"feature-card " + f.color}
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <FeatureIcon kind={f.icon} />
              <div className="ft-title pixel">{f.title}</div>
              <div className="ft-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PREVIEW DE JUEGOS */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-cyan">{"// 02"}</div>
          <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
          <div className="section-rule"></div>
        </div>
        {games ? (
          <div className="mini-rail">
            {games.slice(0, 6).map((g) => (
              <MiniCard key={g.id} game={g} />
            ))}
            {games.length === 0 && (
              <div style={{ padding: 24, color: "var(--ink-faint)" }}>
                Todavía no hay juegos disponibles.
              </div>
            )}
          </div>
        ) : (
          <CatalogError />
        )}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/juegos" className="btn lg">
            VER TODOS LOS JUEGOS →
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section className="home-stats reveal">
        <div className="stats-inner">
          {STATS.map((st, i) => (
            <div
              key={st.n}
              className="stat-block"
              style={{ transitionDelay: i * 90 + "ms" }}
            >
              <div className="stat-n neon-yellow">{st.n}</div>
              <div className="stat-u pixel">{st.u}</div>
              <div className="stat-s">{st.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY / LEADERBOARD */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-yellow">{"// 03"}</div>
          <h2 className="section-title">ACTIVIDAD EN VIVO</h2>
          <div className="section-rule"></div>
        </div>
        <div className="activity-grid">
          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
            </div>
            {recent === null ? (
              <ActivityMessage error>
                ERROR: NO SE PUDIERON CARGAR LAS PUNTUACIONES.
              </ActivityMessage>
            ) : recent.length === 0 ? (
              <ActivityMessage>
                Aún no hay partidas guardadas. Juega ROCAS con sesión iniciada para abrir la lista.
              </ActivityMessage>
            ) : (
              <div className="ticker">
                {recent.map((r, i) => {
                  const game = gameById.get(r.gameId);
                  return (
                    <div
                      key={`${r.rank}-${r.gameId}`}
                      className="tick-row"
                      style={{ animationDelay: i * 60 + "ms" }}
                    >
                      <span className={"tk-p neon-" + (game?.color ?? "cyan")}>
                        {r.username}
                      </span>
                      <span className="tk-mid">▸ {game?.title ?? r.gameId}</span>
                      <span className="tk-s">+{r.score.toLocaleString("es-ES")}</span>
                      <span className="tk-t">{r.date}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel neon-magenta">▸ TOP JUGADORES</div>
              <Link href="/salon" className="lb-link">
                VER SALÓN →
              </Link>
            </div>
            {topPlayers === null ? (
              <ActivityMessage error>
                ERROR: NO SE PUDO CARGAR EL TOP DE JUGADORES.
              </ActivityMessage>
            ) : topPlayers.length === 0 ? (
              <ActivityMessage>
                Todavía no hay jugadores en el ranking.
              </ActivityMessage>
            ) : (
              <div className="top-list">
                {topPlayers.map((r, i) => (
                  <div
                    key={r.username}
                    className={
                      "top-row" +
                      (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
                    }
                  >
                    <span className="tp-rk">#{String(i + 1).padStart(2, "0")}</span>
                    <span className="tp-bar">
                      <span
                        className="tp-fill"
                        style={{ width: (r.best / topPlayers[0].best) * 100 + "%" }}
                      ></span>
                    </span>
                    <span className="tp-p">{r.username}</span>
                    <span className="tp-s">{r.best.toLocaleString("es-ES")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-green">{"// 04"}</div>
          <h2 className="section-title">PRECIOS</h2>
          <div className="section-rule"></div>
        </div>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="pc-label pixel">PLAN ÚNICO</div>
            <div className="pc-name pixel">JUGADOR VAULT</div>
            <div className="pc-amount">
              <span className="pc-amount-n">$0</span>
              <span className="pc-amount-u">/ SIEMPRE</span>
            </div>
            <div className="pc-tag">SIN TRUCOS · SIN LETRA PEQUEÑA</div>
            <ul className="pc-list">
              {PRICING_PERKS.map((perk) => (
                <li key={perk}>✔ {perk}</li>
              ))}
            </ul>
            <Link href="/acceso" className="btn xl pulse" style={{ width: "100%" }}>
              EMPEZAR GRATIS →
            </Link>
            <div className="pc-foot">No pedimos tarjeta. Nunca lo haremos.</div>
            <div className="pc-stamp pixel">
              FREE
              <br />
              PLAY
            </div>
          </div>

          <div className="pricing-faq">
            {FAQ.map((item) => (
              <div key={item.q} className="faq-item">
                <div className="faq-q pixel">{item.q}</div>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="home-final reveal">
        <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
        <Link href="/juegos" className="btn xl pulse final-cta">
          INSERTAR MONEDA →
        </Link>
        <div className="final-tag">
          Gratis. Sin registro obligatorio. Empieza en segundos.
        </div>
      </section>
    </div>
  );
}

function ActivityMessage({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : undefined}
      className="mono"
      style={{
        padding: "28px 16px",
        fontSize: 12,
        lineHeight: 1.6,
        textAlign: "center",
        color: error ? "var(--magenta)" : "var(--ink-faint)",
      }}
    >
      {children}
    </div>
  );
}
