# SPEC 08 — Puntuaciones y leaderboard

> **Estado:** Approved
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-19
> **Objetivo:** Guardar en Supabase la puntuación de ROCAS de usuarios con sesión y mostrar el leaderboard real en el detalle de cada juego, en el Salón de la Fama y en la home, con `best` y `plays` derivados de la tabla `scores`.

---

## Por qué existe este spec

La spec 05 dejó ROCAS jugable sin persistir nada, la 06 aporta identidad (`profiles`) y la 07 el catálogo (`games`). Falta cerrar el circuito: guardar la partida al terminar y leer rankings reales. Hoy `seededScores`, `PLAYERS`, `RECENT_SCORES` y `TOP_PLAYERS` son datos inventados; esta spec los sustituye por consultas.

---

## Alcance

**Dentro:**

- Tabla `scores` con RLS y migración SQL versionada en `supabase/migrations/`.
- Guardar la puntuación desde el modal `FIN DEL JUEGO` de ROCAS con `GUARDAR PUNTUACIÓN`, solo con sesión iniciada. Sin sesión, el modal ofrece ir a `/acceso`.
- Capa de lectura `lib/scores-repo.ts` (servidor): top por juego, puntuaciones recientes, top jugadores, y `best` y `plays` por juego.
- Leaderboard real en `/juegos/[id]`, sustituyendo `seededScores`.
- `/salon` con datos reales y filtro por juego, sustituyendo el mock de `HallOfFame`.
- Home: puntuaciones recientes y top jugadores reales, sustituyendo `RECENT_SCORES` y `TOP_PLAYERS`.
- `best` y `plays` de las tarjetas y del detalle, calculados desde `scores`.
- Estados vacíos para juegos sin partidas y estados de error.

**Fuera de alcance (para otros specs):**

- Guardar puntuaciones de los juegos simulados (solo `rocas` es real).
- Sembrar puntuaciones ficticias.
- Prevención de trampas del lado servidor más allá de RLS y restricciones de rango (el puntaje lo envía el cliente).
- Realtime y actualización en vivo del ranking.
- Paginación infinita, historial personal del jugador y perfil público.
- Editar o borrar puntuaciones.
- Cambios a la jugabilidad de ROCAS.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_scores.sql
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

- No hay políticas de `update` ni `delete`: una puntuación es inmutable.
- Para las agregaciones se define una vista o función de lectura (`game_stats`: `game_id`, `best`, `plays`; y `top_players`: `user_id`, `username`, `total`/`best`), con `security_invoker = true`. La forma final (vista o RPC) se decide en el paso 2 tras consultar la skill de Postgres.

Tipos en TypeScript:

```ts
// lib/scores.ts
export interface ScoreEntry {
  rank: number;
  username: string;
  score: number;
  date: string; // "DD/MM/AAAA"
  gameId: string;
}

export interface GameStats {
  gameId: string;
  best: number; // 0 si no hay partidas
  plays: number;
}

// lib/scores-repo.ts (servidor)
export async function getTopScores(
  gameId: string,
  limit?: number,
): Promise<ScoreEntry[]>;
export async function getRecentScores(limit?: number): Promise<ScoreEntry[]>;
export async function getTopPlayers(
  limit?: number,
): Promise<{ username: string; best: number }[]>;
export async function getGameStats(): Promise<GameStats[]>;
```

Escritura: Server Action `saveScore(gameId, score)` en `app/juegos/[id]/jugar/actions.ts`. Devuelve `{ ok: true }` o `{ ok: false, reason: "unauthenticated" | "invalid" | "error" }`.

---

## Mapa de rutas

| Pantalla / recurso | Ruta                 | Archivo                            | Tipo                              |
| ------------------ | -------------------- | ---------------------------------- | --------------------------------- |
| Detalle            | `/juegos/[id]`       | `app/juegos/[id]/page.tsx`         | Server, lee top del juego         |
| Jugar              | `/juegos/[id]/jugar` | `app/juegos/[id]/jugar/page.tsx`   | Sin cambio de ruta                |
| Guardado           | Server Action        | `app/juegos/[id]/jugar/actions.ts` | Nueva                             |
| Salón              | `/salon`             | `app/salon/page.tsx`               | Server, filtro por `searchParams` |
| Home               | `/`                  | `app/page.tsx`                     | Server                            |

Archivos nuevos:

- `supabase/migrations/<timestamp>_scores.sql`: tabla, índices, RLS y agregados.
- `lib/scores.ts` y `lib/scores-repo.ts`.
- `app/juegos/[id]/jugar/actions.ts`: `saveScore`.

Archivos que cambian:

- `components/GamePlayer.tsx`: `GUARDAR PUNTUACIÓN` llama a `saveScore` solo para `rocas`; muestra guardando, guardado, error y "inicia sesión". Recibe `isLoggedIn` por props.
- `components/Leaderboard.tsx`, `components/HallOfFame.tsx`, `components/GameCard.tsx`, `components/MiniCard.tsx`: reciben datos por props.
- `app/juegos/[id]/jugar/page.tsx`, `app/juegos/[id]/page.tsx`, `app/page.tsx`, `app/salon/page.tsx`.
- `lib/games.ts` y `lib/home.ts`: se retiran `seededScores`, `PLAYERS`, `RECENT_SCORES`, `TOP_PLAYERS` y los tipos que queden sin uso.

Antes de tocar nada, buscar con `grep` todos los usos de esos datos mock.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` las guías de Server Actions, caché y revalidación (`revalidatePath`). Cargar `supabase-postgres-best-practices` antes de la migración y consultar la skill `supabase` para RLS.

1. Escribir la migración de `scores` con índices y RLS, y aplicarla. Verificación: un `insert` anónimo falla, uno autenticado con `user_id` ajeno falla, y uno propio funciona.
2. Definir y crear los agregados (`game_stats`, `top_players`) con `security_invoker`. Verificación: devuelven `best` y `plays` correctos para filas de prueba y no exponen emails.
3. Crear `lib/scores.ts` y `lib/scores-repo.ts`. Verificación: `npx tsc --noEmit` pasa.
4. Crear `saveScore` con validación (sesión, `gameId` existente, entero en rango) y `revalidatePath` de las páginas afectadas. Verificación: `npx tsc --noEmit` pasa.
5. Conectar `GUARDAR PUNTUACIÓN` en `GamePlayer` para `rocas`, con todos los estados. Verificación: jugar una partida con sesión crea una fila en `scores` con el `user_id` correcto; sin sesión no inserta y ofrece `/acceso`.
6. Sustituir el mock en `/juegos/[id]` (leaderboard) y mostrar `best` y `plays` reales. Verificación: la partida guardada aparece en el top de ROCAS; los demás juegos muestran el estado vacío.
7. Sustituir el mock en `/salon` (con filtro por juego) y en la home. Verificación: ranking, recientes y top jugadores coinciden con la base.
8. Retirar los mocks restantes y revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`, y el Security Advisor. Verificación: todo pasa y `grep -rn "seededScores\|RECENT_SCORES\|TOP_PLAYERS" app components lib` no devuelve nada.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `scores` tiene RLS activada: lectura pública, `insert` solo con `user_id = auth.uid()`, y `update` y `delete` fallan para todos los clientes.
- [ ] Una puntuación negativa o mayor que 10.000.000 es rechazada por la base.
- [ ] Con sesión, terminar una partida de ROCAS y pulsar `GUARDAR PUNTUACIÓN` inserta una fila con el `game_id` `rocas`, el `user_id` del jugador y la puntuación final correcta.
- [ ] Sin sesión, el modal no intenta guardar y ofrece ir a `/acceso`.
- [ ] Pulsar `GUARDAR PUNTUACIÓN` dos veces para la misma partida no crea dos filas.
- [ ] Un fallo al guardar muestra un mensaje de error y permite reintentar.
- [ ] `/juegos/rocas` muestra el top real ordenado de mayor a menor, con `username`, puntuación y fecha, y la partida recién guardada aparece tras recargar.
- [ ] Los juegos sin partidas muestran un estado vacío en el leaderboard, `best` en 0 o `—` y `plays` en 0.
- [ ] `/salon` lista puntuaciones reales y el filtro por juego cambia el resultado.
- [ ] La home muestra puntuaciones recientes y top jugadores reales, o estado vacío.
- [ ] `best` y `plays` de las tarjetas coinciden con `max(score)` y `count(*)` de `scores` para cada juego.
- [ ] Ninguna pantalla ni consulta expone emails de `auth.users`.
- [ ] No existen en el código `seededScores`, `PLAYERS`, `RECENT_SCORES` ni `TOP_PLAYERS`, y no se insertaron puntuaciones ficticias.
- [ ] Los demás juegos (`ranaria`, etc.) conservan la simulación y su botón de guardado no escribe en `scores`.
- [ ] No hay errores de hidratación ni en la consola al jugar, guardar y recorrer las páginas.
- [ ] No se usa `SUPABASE_SERVICE_ROLE_KEY`.

---

## Decisiones

- **Sí:** guardar solo con sesión, como se eligió. La identidad viene de la spec 06 y no se acepta un apodo libre.
- **No:** `user_id` nullable ni puntuaciones anónimas. Se ensucia el ranking y se complica la RLS.
- **Sí:** `user_id` con `default auth.uid()` y la política `with check`. El cliente no decide de quién es la puntuación.
- **Sí:** `scores` inmutable (sin `update` ni `delete`). Un ranking editable invita al fraude y no hay caso de uso.
- **Sí:** `check` de rango en la base. Es la defensa mínima contra valores absurdos desde un cliente manipulado.
- **No:** validación anti-trampas real (replays, firmas, servidor autoritativo). El puntaje lo calcula el navegador, así que es falsificable; se acepta y se declara. Merece su propia spec si el ranking importa.
- **Sí:** `best` y `plays` derivados con `max` y `count`, sin columnas redundantes. No se desincronizan.
- **Sí:** vista o función con `security_invoker` para los agregados. Respeta la RLS y no filtra datos.
- **No:** sembrar puntuaciones ficticias. Mezclar datos falsos con reales invalida el ranking; los estados vacíos son parte del diseño.
- **Sí:** Server Action para guardar. Mantiene la sesión en cookies y permite `revalidatePath`.
- **Sí:** el botón se deshabilita tras guardar con éxito, y la acción es idempotente por partida. Evita duplicados por doble clic.
- **Sí:** solo ROCAS guarda. Es el único juego real; los simulados no generan partidas verdaderas.
- **Sí:** lecturas en Server Components, pasando datos por props, igual que en la spec 07.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El puntaje lo envía el cliente y se puede falsificar                         | Aceptado y documentado. `check` de rango y RLS limitan el daño; el anti-trampas queda para otra spec.                                                       |
| Doble envío por doble clic o reintento tras un error de red                  | Botón deshabilitado, idempotencia por partida (por ejemplo, un identificador de partida generado al reiniciar el motor). Definir el mecanismo en el paso 5. |
| Las agregaciones (`max`, `count`, top jugadores) son lentas con muchas filas | Índices `(game_id, score desc)` y `(user_id)`; límites en las consultas. Revisar con `EXPLAIN` si crece.                                                    |
| Una vista sin `security_invoker` se salta la RLS                             | Declararlo en la migración y revisar el Security Advisor en el paso 8.                                                                                      |
| Los rankings quedan cacheados y no muestran la partida recién guardada       | `revalidatePath` en `saveScore`; leer la guía de caché de Next.js 16 antes del paso 4.                                                                      |
| Un `username` falso o ofensivo en el ranking                                 | Fuera de alcance; el formato lo limita en la spec 06. Moderación en una spec futura.                                                                        |
| Quitar los mocks vacía visualmente home y `/salon` en un entorno sin datos   | Estados vacíos diseñados con `/frontend-design`; la verificación incluye una base vacía.                                                                    |
| `scores.game_id` depende de que la 07 esté aplicada                          | Declarado en `Depende de`; el paso 1 falla de forma clara si falta `games`.                                                                                 |

---

## Qué **no** está en este spec

- Guardado de los juegos simulados.
- Puntuaciones sembradas o ficticias.
- Anti-trampas con servidor autoritativo.
- Realtime, paginación infinita, historial y perfil público.
- Edición o borrado de puntuaciones.
- Moderación de nombres.
- Cambios de jugabilidad de ROCAS.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
