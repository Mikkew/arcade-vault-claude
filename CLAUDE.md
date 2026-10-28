# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

`arcade-vault` is a retro arcade portal (UI copy in Spanish): home, About with a contact form, a game library and detail pages, an in-browser player, Supabase auth, and a Hall of Fame with real leaderboards. Work so far is tracked by specs 01–10 in `specs/`, plus the subfolders `specs/skins/` (skin system and per-game palettes, all Implemented), `specs/game-jam/<game-id>/` (PAPILLA, implemented; APAGÓN, still Draft) and `specs/mobile/` (written by `mobile-porter`).

Five catalog games have real engines: ROCAS (Asteroids), CAÍDA (Tetris), BLOQUE BUSTER (Arkanoid), SERPENTINA (Snake) and PAPILLA (a Frogger-style race against a CPU toad). All five are playable with touch controls (spec 10). Every other catalog entry still runs a **simulation** in `GamePlayer` and never writes to `scores`.

## Commands

```bash
npm run dev     # dev server at http://localhost:3000 (also regenerates the AGENTS.md block)
npm run build   # production build; also the main type-check step
npm run start   # serve the production build
npm run lint    # runs ESLint directly (flat config); `next lint` no longer exists
npx tsc --noEmit  # standalone type-check
```

There is no test runner. Verify with lint, `tsc`, `build`, and by playing in the browser (the Playwright MCP is available; its output goes to the git-ignored `.playwright-mcp/`).

A PostToolUse hook (`.claude/hooks/format-and-lint.sh`, wired in `.claude/settings.json`) runs after every Write/Edit on project files. It deletes blank lines and trailing whitespace in code files (`.ts/.tsx/.js/.css/.json/.sh`, never Markdown), then runs `eslint --fix` and `prettier --write` through `npx`, so Node must be on the `PATH` (the Playwright MCP needs it too). Unfixable lint errors come back as hook feedback. Do not reintroduce blank lines in code; the hook strips them.

## Environment

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public by design. Read them with literal `process.env.NAME` access, because Next only inlines `NEXT_PUBLIC_*` that way.
- `NEXT_PUBLIC_SITE_URL`: builds the password-reset link. It must also be in Supabase Auth's allowed redirect URLs.
- `RESEND_API_KEY` (server only), plus optional `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` for the About contact form.

Never use `SUPABASE_SERVICE_ROLE_KEY`.

## Stack and conventions

- **Next.js 16.3 (App Router only) + React 19.2.** The APIs differ from older Next.js versions. Before writing framework code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/` covers the App Router: getting-started, guides, api-reference).
- **Typed route helpers are global.** `LayoutProps<"/">` / `PageProps<"/route">` come from types Next generates into `.next/types` (included via `tsconfig.json`). They need no import, and they only resolve after `next dev` or `next build` has run.
- **Middleware is `proxy.ts`** (Next 16 renamed it) at the repo root. It calls `updateSession` in `lib/supabase/proxy.ts` to refresh the Supabase auth cookies on every non-static request.
- **Tailwind CSS v4**, configured CSS-first: there is no `tailwind.config.*`. `app/globals.css` holds the Arcade Vault theme: `:root` tokens (`--bg`, `--ink`, `--cyan`, `--magenta`, `--gold`…) mapped under `@theme inline` to utilities (`bg-bg-2`, `text-cyan`, `font-pixel`, `font-mono`). The theme is dark only. Most UI uses the hand-written component classes in that file (`btn`, `modal`, `crt`, `hud-stat`, `toast-saved`, `av-*`…). Reuse them before adding new styles.
- **Fonts**: Press Start 2P (`--pixel`, used for headings and pixel text), JetBrains Mono and Courier Prime (`--mono`) load through `next/font/google` in `app/layout.tsx`. `<html lang="es">`.
- **Import alias**: `@/*` maps to the repo root (there is no `src/` directory).
- ESLint uses `eslint-config-next` core-web-vitals + typescript presets (`eslint.config.mjs`). Prettier is a dev dependency, run by the hook.
- **TypeScript** everywhere. Code comments are in Spanish.

## Architecture

### Routes (`app/`)

| Route                                           | Purpose                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `/`                                             | Home (spec 02); static content in `lib/home.ts`                         |
| `/about`                                        | About page plus a Resend contact form (`about/actions.ts`, spec 03)     |
| `/juegos`                                       | Library with search and category filter (`LibraryBrowser`)              |
| `/juegos/[id]`                                  | Game detail with its leaderboard                                        |
| `/juegos/[id]/jugar`                            | Player (`GamePlayer`); `actions.ts` has the `saveScore` Server Action   |
| `/salon`                                        | Hall of Fame (`HallOfFame`): top players, recent scores, per-game stats |
| `/acceso`, `/acceso/nueva`, `/acceso/recuperar` | Sign-in/up, new password, password recovery (`acceso/actions.ts`)       |
| `/auth/callback`                                | Supabase auth code exchange                                             |
| `/api/supabase/health`                          | Connectivity check                                                      |

### Supabase

- Clients: `lib/supabase/server.ts` (Server Components/Actions, cookie-based), `lib/supabase/client.ts` (browser), `lib/supabase/proxy.ts` (session refresh).
- On the server, check identity with `supabase.auth.getClaims()`, never `getSession()`. `lib/auth.ts#getCurrentProfile()` returns the signed-in `profiles` row or `null`, and the root layout passes it to `Nav`.
- Data access goes through repos wrapped in `React.cache`: `lib/games-repo.ts` (`listGames`, `getGame`) and `lib/scores-repo.ts` (`getTopScores`, `getRecentScores`, `getTopPlayers`, `getGameStats`). They throw on error, and the caller decides what to render (see `CatalogError`). Plain types and helpers live in `lib/games.ts` and `lib/scores.ts`.
- Schema (`supabase/migrations/`, all tables with RLS): `profiles` (created by the `handle_new_user` trigger on `auth.users`, public read), `games` (catalog, public read, ordered by `sort_order`), `scores` (public read; inserts limited to your own row, `user_id` defaults to `auth.uid()`, score 0–10,000,000), plus the views `game_stats` and `top_players`.
- Migrations are immutable. Add a new timestamped file and never edit an applied one. Inspect the live schema (Supabase MCP `list_tables`) before changing it. Load the `supabase` and `supabase-postgres-best-practices` skills before writing SQL, RLS or Supabase client code.
- Leaderboard rules (spec 08): no seeded or fake scores, no service-role key, and no `auth.users` emails exposed.

### Game engines

- Each game is a React-independent TypeScript engine in `lib/<game>/` (`engine.ts`, `types.ts`, and optionally `audio.ts`, `sprites.ts`, `levels.ts`). It draws on a `<canvas>` and talks to the platform only through the contract in `lib/engine/types.ts`: `CreateEngine(canvas, callbacks)` returns a `GameEngine` (`pause/resume/end/restart/setMuted/setSkin/setInput/destroy`), and the callbacks are `onScore`, `onLives?`, `onLevel?` and `onGameOver`. `setInput(action, pressed)` is the touch input (spec 10): each `TouchAction` (`up/down/left/right/a/b`) must have the same effect as its key.
- `components/games/registry.ts` maps a catalog id to its engine and its player config (canvas label, which HUD stats to show, sound toggle, controls text, skins, and the `touch` layout of on-screen buttons). `GamePlayer` + `GameCanvas` own the HUD, pause, the game-over modal and score saving through `saveScore`. `TouchControls` renders the D-pad and A/B buttons under the CRT, visible only with `(pointer: coarse)`. An id without a registry entry falls back to the simulation.
- ROCAS (`lib/asteroids/`, spec 05) is the reference implementation. The others are `lib/caida/`, `lib/bloque-buster/`, `lib/serpentina/` (spec 09) and `lib/papilla/` (`specs/game-jam/papilla/`).
- **Skins** (`specs/skins/`): `lib/engine/skins.ts` defines `SkinId` (`clasico` default, `neon`, `retro`) and `SKINS`. Each engine that supports them keeps its colors in `lib/<game>/palettes.ts` (`Record<SkinId, Palette>`) and uses the shared glow/scanline helpers in `lib/engine/skin-fx.ts`. The player shows the `SKIN` selector only when the registry lists more than one skin, and `lib/engine/skin-preference.ts` stores the choice per game in `localStorage`. ROCAS, BLOQUE BUSTER and SERPENTINA have all three; CAÍDA and PAPILLA only `clasico`. A skin never changes the rules or the score.
- `references/` holds source material, not app code: `started-games/` (original JS Asteroids/Tetris/Arkanoid to port), `source-assets/` (Snake sprites and audio) and `templates/` (the original JSX/HTML design mockups).

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

Project skills live in `.agents/skills/` (`arcade-game`, `spec`, `spec-impl`, `spec-impl-game`, plus the Supabase ones) and are symlinked into `.claude/skills/`. Third-party ones are pinned in `skills-lock.json`.

- `/arcade-game <id | references folder | description>` (project-authored): creates or ports a game as an engine that follows the contract above, registers it, and connects it to scores and the leaderboard. Use it whenever a game is added, ported or turned from a simulation into a real game. Its references cover the engine contract, the leaderboard foundation and notes on each reference game. Game branches are named after the spec or `game-<id>`.
- `supabase` and `supabase-postgres-best-practices` (from `supabase/agent-skills`): load them before any Supabase or Postgres work. The Supabase MCP server is configured in `.mcp.json` for this project.

## Subagents

- `game-planner` (`.claude/agents/game-planner.md`): decides which game to add next or turn from a simulation into a real game, and scores the candidates against the engine contract, the leaderboard and the catalog balance. It writes no code. Its persistent memory of past suggestions and the user's decisions lives in `.claude/agent-memory/game-planner/`.
- `game-jam` (`.claude/agents/game-jam.md`): takes a theme, designs one game from it and writes three Draft specs to `specs/game-jam/<game-id>/` (`01-catalogo`, `02-motor`, `03-pulido`), modeled on specs 07 and 09. It writes no code.
- `skin-designer` (`.claude/agents/skin-designer.md`): checks that every real game in the registry offers three skins, `clasico` (the default), `neon` and `retro`, and measures each palette's contrast on the dark background (WCAG: 4.5:1 for text/HUD, 3:1 for game objects). It writes Draft specs to `specs/skins/`: `00-sistema-skins` for the shared skin system, then one spec per game that falls short. It writes no code.
- `mobile-porter` (`.claude/agents/mobile-porter.md`): audits the portal on mobile, both in the browser and installed as a PWA (overflow at 360 px, touch targets, legibility, safe areas, viewport, manifest and icons), using spec 10 as its reference. It writes Draft specs to `specs/mobile/`. It writes no code.

## Spec-driven workflow

- `/spec <feature>` designs a spec through clarifying questions and saves it to `specs/` (numbered `NN-name`, with an `> **Estado:**` line). It does not write code.
- `/spec-impl <NN-spec-name>` implements a spec whose status is "Approved". It creates and switches to a branch named after the spec (unless `specs/.spec-config.yml` sets `AutoCreateBranch: false`), then implements step by step, pausing for diff review.
- `/spec-impl-game <NN-spec-name | game-jam/<id>/NN-name>` is `/spec-impl` for game specs: it reads `spec-impl`'s SKILL.md and runs the same phases (it also finds specs in subfolders, and `specs/game-jam/<id>/` specs use the `game-<id>` branch). After the last step it runs `skin-designer` and, once that finishes, `mobile-porter` on the new game. Both only write Draft specs.

New features are expected to go through `/spec` and then `/spec-impl`. When a spec exists for the work, follow it. Work happens on branches and merges into `main` through PRs; never commit features straight to `main`.
