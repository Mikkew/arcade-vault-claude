# Base del leaderboard (destilado de la spec 08)

Fuente de verdad: `specs/08-puntuaciones-leaderboard.md`. Si el spec y este archivo difieren, manda el spec; actualiza este archivo después. Aquí solo está lo necesario para implementar sin releer todo, más las decisiones que el spec deja abiertas.

## Contenido

1. Orden de implementación
2. Migración
3. Tipos y capa de lectura
4. `saveScore`
5. `GamePlayer`
6. Páginas a conectar
7. Decisiones que el spec deja abiertas
8. Verificación de la base

## 1. Orden de implementación

Es el del spec; cada paso tiene su verificación:

1. Migración `scores` (tabla, índices, RLS) y aplicarla. Un `insert` anónimo falla; autenticado con `user_id` ajeno falla; con el propio funciona.
2. Agregados `game_stats` y `top_players` con `security_invoker = true`.
3. `lib/scores.ts` y `lib/scores-repo.ts`.
4. `saveScore` en `app/juegos/[id]/jugar/actions.ts`.
5. `GUARDAR PUNTUACIÓN` en `GamePlayer`.
6. `/juegos/[id]`: leaderboard real, `best` y `plays`.
7. `/salon` (filtro por juego) y home.
8. Retirar mocks (`seededScores`, `PLAYERS`, `RECENT_SCORES`, `TOP_PLAYERS`) y revisar. Antes de borrar nada, `grep` de todos sus usos.

Antes del paso 4, leer en `node_modules/next/dist/docs/01-app/` las guías de Server Actions y de caché/revalidación.

## 2. Migración

Archivo `supabase/migrations/<timestamp>_scores.sql`. Carga `supabase-postgres-best-practices` primero. Base (del spec):

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  score int not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_idx on public.scores (user_id);
create index scores_created_idx on public.scores (created_at desc);

alter table public.scores enable row level security;

create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_own" on public.scores
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
```

Sin políticas de `update`/`delete`: una puntuación es inmutable. Como defensa en profundidad (igual que `games`), retira `update, delete, truncate` a `anon, authenticated`.

Agregados (`game_stats`: `game_id, best, plays`; `top_players`: `user_id, username, best`) como vista con `security_invoker = true` o como función; el spec pide decidirlo tras consultar la skill de Postgres. Preferencia razonable: vistas, porque respetan RLS y se leen con `.from()`. No expongas nada de `auth.users`; el `username` sale de `profiles`.

## 3. Tipos y capa de lectura

```ts
// lib/scores.ts
export interface ScoreEntry { rank: number; username: string; score: number; date: string; /* "DD/MM/AAAA" */ gameId: string }
export interface GameStats { gameId: string; best: number; /* 0 si no hay partidas */ plays: number }

// lib/scores-repo.ts  (servidor, igual de estilo que lib/games-repo.ts)
getTopScores(gameId: string, limit?: number): Promise<ScoreEntry[]>
getRecentScores(limit?: number): Promise<ScoreEntry[]>
getTopPlayers(limit?: number): Promise<{ username: string; best: number }[]>
getGameStats(): Promise<GameStats[]>
```

Sigue el patrón de `lib/games-repo.ts`: `createClient()` de `@/lib/supabase/server`, `React.cache`, lanzar `Error` con mensaje en español si la consulta falla (la página decide qué mostrar, como hace `JugarPage` con `CatalogError`), y límites siempre presentes.

## 4. `saveScore`

`app/juegos/[id]/jugar/actions.ts`, con `"use server"`:

```ts
saveScore(gameId: string, score: number, runId: string):
  Promise<{ ok: true } | { ok: false; reason: "unauthenticated" | "invalid" | "error" }>
```

Validar en este orden: sesión (`getUser()`/`getClaims()` según lo que use `lib/auth.ts`; nunca `getSession()` en servidor), `gameId` existente (`getGame`), `score` entero en `[0, 10_000_000]`, `runId` con formato UUID. Insertar con el cliente del usuario (RLS), sin pasar `user_id` (lo pone el `default auth.uid()`). `revalidatePath` de `/`, `/salon`, `/juegos`, `/juegos/${gameId}`. No loguear el contenido de la sesión.

## 5. `GamePlayer`

- Recibe `isLoggedIn` desde `jugar/page.tsx` (leído en servidor).
- El nombre del HUD y el campo de iniciales: con sesión el `username` viene del perfil y no se acepta un apodo libre (decisión del spec). Retira el input de iniciales para los juegos reales; para simulados puede conservarse.
- Estados del botón `GUARDAR PUNTUACIÓN`: reposo → guardando (deshabilitado) → guardado (`toast-saved`, deshabilitado para siempre en esa partida) → error (mensaje + reintentar, mismo `runId`). Sin sesión: no llama a la acción y muestra un enlace a `/acceso`.
- Solo los juegos reales (los del registro) llaman a `saveScore`. Los simulados conservan `setSaved(true)` local.
- Diseña los mensajes y el enlace con `/frontend-design`, reutilizando las clases del modal existente.

## 6. Páginas a conectar

| Página | Cambio |
| --- | --- |
| `app/juegos/[id]/page.tsx` | `getTopScores(id)` + `best`/`plays` de `getGameStats()`; estado vacío en `Leaderboard` |
| `app/juegos/page.tsx` y tarjetas (`GameCard`, `MiniCard`) | `best`/`plays` por props desde `getGameStats()` |
| `app/salon/page.tsx` | `searchParams` para el filtro por juego; lista de `getTopScores`/`getRecentScores` |
| `app/page.tsx` | `getRecentScores`, `getTopPlayers`; estados vacíos |

Componentes reciben datos por props; las lecturas viven en Server Components. `best` en 0 se muestra como `—`.

## 7. Decisiones que el spec deja abiertas

- **Idempotencia por partida** (el spec pide "doble clic no crea dos filas" y deja el mecanismo al paso 5). Opción recomendada: columna `run_id uuid not null` en `scores` con `unique (user_id, run_id)`; el cliente genera `crypto.randomUUID()` al montar y en cada `restart()`; `saveScore` inserta con `on conflict do nothing` y responde `ok: true` si ya existía. Es una desviación del SQL del spec: aplícala en la migración y anótala en el spec.
- **Vista vs. RPC** para agregados: ver sección 2.
- **Dónde vive el `runId`**: en `GamePlayer` (estado que cambia en `restart`), no dentro del motor; el motor no sabe de guardado.

## 8. Verificación de la base

- Con `execute_sql` (rol anónimo y autenticado simulados) comprueba los tres casos de `insert` y que `update`/`delete` fallan.
- `get_advisors` de seguridad sin hallazgos nuevos (vistas sin `security_invoker` aparecen aquí).
- `grep -rn "seededScores\|RECENT_SCORES\|TOP_PLAYERS\|PLAYERS" app components lib` vacío al terminar.
- No usar `SUPABASE_SERVICE_ROLE_KEY` en ningún sitio.
