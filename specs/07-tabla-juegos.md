# SPEC 07 — Tabla de juegos en Supabase

> **Estado:** Draft
> **Depende de:** SPEC 04
> **Fecha:** 2026-10-19
> **Objetivo:** Mover el catálogo de juegos de `lib/games.ts` a una tabla `games` de Supabase, sembrada con los 8 juegos actuales, y que la biblioteca, el detalle, la página de juego y la home lo lean de ahí.

---

## Por qué existe este spec

El catálogo vive en un arreglo mock (`GAMES` en `lib/games.ts`) que se importa en la biblioteca, el detalle, el reproductor, la home y el salón. La spec 08 necesita una tabla `games` a la que apuntar con una clave foránea desde `scores`. Esta spec crea esa tabla y migra las lecturas del catálogo, sin tocar puntuaciones ni auth. Es la parte de "tabla de juegos" del pedido.

---

## Alcance

**Dentro:**

- Tabla `games` con RLS de solo lectura pública y migración SQL versionada en `supabase/migrations/`.
- Seed de los 8 juegos actuales de `lib/games.ts`, en una migración o archivo de seed reproducible.
- Una capa de acceso `lib/games-repo.ts` (servidor) con `listGames()` y `getGame(id)` basada en `lib/supabase/server.ts`.
- Migrar a esa capa las lecturas del catálogo en: `app/juegos/page.tsx` / `LibraryBrowser`, `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx`, `app/page.tsx` y `components/HallOfFame.tsx`.
- Los campos `best` y `plays` dejan de ser datos mock de la tabla: se muestran como `—` / `0` hasta que la spec 08 los derive de `scores`.
- `lib/games.ts` conserva tipos y constantes de interfaz (`Category`, `Accent`, `CATS`); se retiran `GAMES` y `getGame`.
- Estados de error y vacío si la consulta falla o no hay juegos.

**Fuera de alcance (para otros specs):**

- Tabla `scores`, guardado de puntuaciones y leaderboard real (spec 08).
- Autenticación (spec 06). Esta spec no requiere sesión.
- Escritura de juegos desde la aplicación, panel de administración y RLS de escritura.
- `best` y `plays` calculados (spec 08).
- Los datos mock de `lib/games.ts` para `seededScores`, `PLAYERS` y `lib/home.ts`, que se sustituyen en la 08.
- Generar tipos con `supabase gen types`.
- Imágenes de portada reales: `cover` sigue siendo una clase CSS.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_games.sql
create table public.games (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'green', 'yellow')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games_select_public" on public.games
  for select to anon, authenticated using (true);
```

- `id` es el slug que ya usa la URL (`rocas`, `ranaria`, `bloque-buster`, ...). No cambia.
- `sort_order` conserva el orden actual del arreglo; las consultas ordenan por él.
- No hay políticas de `insert`, `update` ni `delete`: el catálogo se gestiona por migración.

Tipo en TypeScript, sin `best` ni `plays`:

```ts
// lib/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: Accent;
}

// lib/games-repo.ts
export async function listGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
```

---

## Mapa de rutas

| Pantalla   | Ruta                 | Archivo                          | Tipo                                |
| ---------- | -------------------- | -------------------------------- | ----------------------------------- |
| Home       | `/`                  | `app/page.tsx`                   | Lee `listGames()` (Server)          |
| Biblioteca | `/juegos`            | `app/juegos/page.tsx`            | Lee `listGames()` y pasa al cliente |
| Detalle    | `/juegos/[id]`       | `app/juegos/[id]/page.tsx`       | Lee `getGame(id)` (Server)          |
| Jugar      | `/juegos/[id]/jugar` | `app/juegos/[id]/jugar/page.tsx` | Lee `getGame(id)` (Server)          |
| Salón      | `/salon`             | `app/salon/page.tsx`             | Lee `listGames()` para el filtro    |

Archivos nuevos:

- `supabase/migrations/<timestamp>_games.sql`: tabla, RLS y seed (o `supabase/seed.sql` si el proyecto ya usa ese flujo).
- `lib/games-repo.ts`: consultas del catálogo.

Archivos que cambian:

- `lib/games.ts`: se eliminan `GAMES` y `getGame`; `Game` pierde `best` y `plays`.
- `components/LibraryBrowser.tsx`, `components/HallOfFame.tsx`, `components/GameCard.tsx`, `components/MiniCard.tsx`, `components/GamePlayer.tsx`: reciben los juegos por props en lugar de importar `GAMES`; dejan de mostrar `best` y `plays` mock.
- Las páginas de la tabla de rutas.

Antes de tocar nada, buscar con `grep` todos los usos de `GAMES`, `getGame`, `best` y `plays`, porque la lista anterior puede estar incompleta.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` las guías de Server Components, obtención de datos y caché. Cargar `supabase-postgres-best-practices` antes de escribir la migración. Revisar `lib/supabase/server.ts`.

1. Escribir la migración de `games` con RLS y el seed de los 8 juegos tomados de `lib/games.ts` (con `sort_order`). Aplicarla con el MCP o CLI de Supabase. Verificación: `select count(*) from games` devuelve 8 y un `insert` con la publishable key es rechazado.
2. Crear `lib/games-repo.ts` con `listGames()` y `getGame(id)`, con manejo de error explícito. Verificación: `npx tsc --noEmit` pasa.
3. Ajustar `Game` en `lib/games.ts` y migrar `/juegos` (`LibraryBrowser`) a props. Verificación: la biblioteca lista los 8 juegos con filtros por categoría y búsqueda.
4. Migrar `/juegos/[id]` y `/juegos/[id]/jugar`, incluyendo `notFound()` para ids inexistentes. Verificación: `/juegos/rocas` y `/juegos/rocas/jugar` cargan; `/juegos/no-existe` devuelve 404.
5. Migrar la home y `HallOfFame` / `/salon`, retirando `best` y `plays` mock de tarjetas y detalle. Verificación: ninguna pantalla muestra cifras inventadas de mejor puntuación o partidas.
6. Eliminar `GAMES` y `getGame` de `lib/games.ts` y revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`, y el Security Advisor de Supabase. Verificación: todo pasa y `grep -r "GAMES\b" app components` no devuelve nada.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] La tabla `games` existe con RLS activada y contiene los 8 juegos con los mismos `id`, títulos, textos, categoría, `cover` y `color` que tenía `lib/games.ts`.
- [ ] Un cliente anónimo puede leer `games`; un `insert`, `update` o `delete` con la publishable key falla.
- [ ] `/juegos` muestra los 8 juegos en el mismo orden que antes y los filtros por categoría y búsqueda siguen funcionando.
- [ ] `/juegos/[id]` y `/juegos/[id]/jugar` funcionan para los 8 ids, y un id inexistente devuelve 404.
- [ ] La home y `/salon` obtienen los juegos de Supabase.
- [ ] Ninguna pantalla muestra `best` ni `plays` inventados; se ve `—` o `0`.
- [ ] Si la consulta falla, la página muestra un estado de error en lugar de romperse.
- [ ] `lib/games.ts` ya no exporta `GAMES` ni `getGame`, y ningún archivo los importa.
- [ ] `/juegos/rocas/jugar` conserva el juego real y `/juegos/ranaria/jugar` conserva la simulación.
- [ ] No hay errores de hidratación ni en la consola al navegar por `/`, `/juegos`, un detalle, un jugar y `/salon`.
- [ ] No existe ninguna tabla `scores`, política de escritura ni uso de `SUPABASE_SERVICE_ROLE_KEY` creados por esta spec.

---

## Decisiones

- **Sí:** migrar las lecturas del catálogo a Supabase y no solo crear la tabla. Era lo que se pidió; una tabla sin lectores quedaría desfasada de `lib/games.ts`.
- **Sí:** `id` como slug de texto y clave primaria. Ya es el identificador de las URLs y evita una traducción UUID ↔ slug.
- **Sí:** `cover` y `color` como texto con `check`. Son clases CSS existentes y los valores válidos son pocos.
- **Sí:** `sort_order` explícito. Mantiene el orden actual de la biblioteca, que Postgres no garantiza sin `order by`.
- **Sí:** el catálogo se gestiona por migración y no hay RLS de escritura. Son 8 juegos que cambian con el código y no hay panel de administración.
- **No:** columnas `best` y `plays` en `games`. Son datos derivables de `scores` y duplicarlos los desincroniza; la spec 08 los calcula.
- **Sí:** mientras tanto se muestran `—` / `0` y no cifras mock. Mezclar datos falsos con una base real confunde.
- **Sí:** capa `lib/games-repo.ts`, separada de `lib/games.ts` (que queda con tipos y constantes de UI). Evita importar un cliente de servidor desde componentes cliente.
- **No:** `supabase gen types`. Es una herramienta nueva en el flujo; se puede introducir en su propia spec.
- **Sí:** tarjetas y listas reciben los juegos por props desde Server Components, porque `LibraryBrowser` y similares son clientes.
- **No:** migrar `seededScores`, `PLAYERS` ni `lib/home.ts`. Dependen de `scores` y van en la spec 08.

---

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Quedan usos de `GAMES` o de `best` / `plays` sin migrar y rompe el build             | `grep` previo, criterio de aceptación y paso 6.                                                  |
| Los componentes cliente no pueden llamar a `lib/games-repo.ts` (cliente de servidor) | Las páginas Server leen los datos y los pasan por props.                                         |
| Pérdida del orden o de algún texto al sembrar a mano                                 | Generar el seed desde `lib/games.ts` y comparar contra la tabla en la verificación del paso 1.   |
| Next.js 16 cambió las reglas de caché y renderizado de datos                         | Leer `node_modules/next/dist/docs/` antes del paso 2.                                            |
| Si Supabase no responde, el catálogo entero deja de verse                            | Estado de error explícito; el catálogo ya no es estático, y queda aceptado.                      |
| Eliminar `best` / `plays` cambia el aspecto de tarjetas y detalle                    | Mostrar `—` y revisar el diseño en el paso 5 con `/frontend-design` si el layout se desbalancea. |

---

## Qué **no** está en este spec

- Tabla `scores`, guardado y leaderboard real.
- Autenticación.
- Panel de administración y escritura de juegos.
- `best` y `plays` calculados.
- Sustitución de `seededScores`, `PLAYERS` y `lib/home.ts`.
- Tipos generados de la base de datos.
- Portadas con imágenes reales.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
