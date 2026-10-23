# GAME JAM APAGON · SPEC 01 — APAGÓN entra en el catálogo

> **Estado:** Draft
> **Tema:** Ciudad nocturna
> **Depende de:** SPEC 07, SPEC 08
> **Fecha:** 2026-10-22
> **Objetivo:** Añadir APAGÓN (id `apagon`) a `public.games` con una migración nueva y una portada `cover-apagon`, de modo que aparezca en la biblioteca, el detalle y el Salón, jugando de momento con la simulación de `GamePlayer`.

---

## Por qué existe este spec

El tema de la jam es "Ciudad nocturna". El juego resultante es APAGÓN: la ciudad se ha quedado a oscuras y el jugador tiende cable desde la central eléctrica, tramo a tramo, antes de que la corriente vuelva y se encuentre un extremo suelto (mecánica tipo _Pipe Mania_). Es un PUZZLE de tiempo real, la categoría con menos juegos del catálogo (solo CAÍDA).

Para que el motor del spec 02 tenga dónde guardar puntuaciones, `scores.game_id` necesita una fila en `public.games` (clave foránea, spec 08). Este spec crea solo esa fila y su portada. No escribe motor ni toca `scores`.

---

## Alcance

**Dentro:**

- Migración nueva `supabase/migrations/<timestamp>_game_apagon.sql` con el `insert` de la fila `apagon` (`sort_order = 9`, el máximo actual 8 + 1).
- Clase de portada `cover-apagon` (con `::before` y `::after`) en `app/globals.css`, junto a las demás `cover-*`, diseñada con `/frontend-design`.
- Comprobar que `/juegos`, `/juegos/apagon`, `/juegos/apagon/jugar` y el filtro de `/salon` muestran el juego sin cambios en el código de las páginas.
- Mientras no exista el motor, `/juegos/apagon/jugar` usa la simulación de `GamePlayer` (no hay entrada en `GAME_REGISTRY`) y no escribe en `scores`.

**Fuera de alcance (para otros specs):**

- El motor real y su registro (`game-jam/apagon/02-motor`).
- Sonido, efectos y ajustes de dificultad (`game-jam/apagon/03-pulido`).
- Cambios en RLS de `games`: la tabla ya es de lectura pública y no admite escritura desde la app (spec 07).
- Cambios en la home: `app/page.tsx` muestra `games.slice(0, 6)`, y APAGÓN, con `sort_order = 9`, no entra en esa selección.
- Puntuaciones de ejemplo o sembradas (prohibido por la spec 08).
- Portada con imagen real: `cover` sigue siendo una clase CSS.

---

## Modelo de datos

No hay tablas ni columnas nuevas. Solo una fila más en `public.games`:

```sql
-- supabase/migrations/<timestamp>_game_apagon.sql
-- Game jam "Ciudad nocturna": APAGÓN entra en el catálogo.
-- La tabla ya tiene RLS de solo lectura pública (spec 07); no se tocan políticas.
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  (
    'apagon',
    'APAGÓN',
    'Tiende cable y devuelve la luz a la ciudad.',
    'La ciudad se ha quedado a oscuras y la corriente está a punto de volver. Coloca tramos de cable desde la central antes de que la chispa alcance un extremo suelto. Cada nivel pide un recorrido más largo y una mecha más corta.',
    'PUZZLE',
    'cover-apagon',
    'yellow',
    9
  );
```

- `id` cumple `^[a-z0-9]+(-[a-z0-9]+)*$` y no existe en `public.games` (verificado con `select id, title, cat, color, sort_order from public.games order by sort_order;` el 2026-10-22: 8 filas, `sort_order` 1–8), ni en `components/games/registry.ts`, ni en `specs/game-jam/`.
- `cat = 'PUZZLE'` y `color = 'yellow'` pasan los `check` de la tabla.
- `<timestamp>` sigue el formato de las migraciones existentes (`AAAAMMDDhhmmss`, p. ej. `20261020003532_games.sql`) y debe ser posterior a `20261020231900_scores_aggregates.sql`.
- La migración es inmutable una vez aplicada: cualquier corrección del texto va en otra migración con `update`.

Portada `cover-apagon` (idea visual; los valores finales se ajustan con `/frontend-design`):

- **Fondo:** cielo nocturno en degradado vertical, de violeta muy oscuro (`#12002a`) arriba a `#0a0a18` abajo, con un halo amarillo tenue en la base, como el resplandor de una ciudad.
- **`::before` (skyline):** silueta de 5–6 edificios de alturas distintas pegados al borde inferior, en negro azulado (`#05050f`), hechos con varios `linear-gradient` posicionados. Encima, ventanas como puntos de 4×4 px con `repeating-linear-gradient`, casi todas apagadas y unas pocas encendidas en `var(--yellow)`.
- **`::after` (cable):** un trazo de cable de 6 px que sale de la izquierda, sube en codo y cruza hacia un edificio, en `var(--yellow)` con `filter: drop-shadow(0 0 8px …)`, y una chispa blanca (`radial-gradient`) en la punta.

Boceto orientativo (no definitivo):

```css
.cover-apagon {
  background:
    radial-gradient(
      ellipse at 50% 110%,
      rgba(245, 255, 0, 0.18),
      transparent 60%
    ),
    linear-gradient(180deg, #12002a, #0a0a18);
}
.cover-apagon::before {
  content: "";
  position: absolute;
  inset: 0;
  background: /* edificios + ventanas */;
}
.cover-apagon::after {
  content: "";
  position: absolute;
  inset: 0;
  background: /* cable en codo + chispa */;
  filter: drop-shadow(0 0 8px rgba(245, 255, 0, 0.6));
}
```

---

## Mapa de rutas

| Pantalla   | Ruta                   | Archivo                          | Cambio                                                           |
| ---------- | ---------------------- | -------------------------------- | ---------------------------------------------------------------- |
| Biblioteca | `/juegos`              | `app/juegos/page.tsx`            | Ninguno en código; aparece la tarjeta 9 con `cover-apagon`       |
| Detalle    | `/juegos/apagon`       | `app/juegos/[id]/page.tsx`       | Ninguno; leaderboard vacío ("sin partidas")                      |
| Jugar      | `/juegos/apagon/jugar` | `app/juegos/[id]/jugar/page.tsx` | Ninguno; simulación de `GamePlayer`, sin escribir en `scores`    |
| Salón      | `/salon`               | `app/salon/page.tsx`             | Ninguno; APAGÓN aparece en el filtro por juego, sin puntuaciones |
| Home       | `/`                    | `app/page.tsx`                   | Ninguno; no aparece (solo se muestran los 6 primeros por orden)  |

Archivos nuevos:

- `supabase/migrations/<timestamp>_game_apagon.sql`: el `insert` de arriba.

Archivos que cambian:

- `app/globals.css`: bloque `.cover-apagon`, `.cover-apagon::before`, `.cover-apagon::after` tras `.cover-duelo`.

---

## Plan de implementación

Antes de escribir la migración, cargar `supabase` y `supabase-postgres-best-practices` e inspeccionar la tabla con `list_tables` del MCP de Supabase.

1. Añadir `.cover-apagon` en `app/globals.css` con `/frontend-design`. Todavía no la usa nadie, el sistema sigue igual. Verificación: `npm run lint` y `npm run build` pasan.
2. Escribir `supabase/migrations/<timestamp>_game_apagon.sql` con el `insert` y aplicarlo con el MCP o la CLI de Supabase. Verificación: `select id, cat, color, sort_order from public.games where id = 'apagon'` devuelve una fila con `PUZZLE`, `yellow`, `9`, y `select count(*) from public.games` devuelve 9.
3. Revisar las pantallas en el navegador (Playwright MCP). Verificación: `/juegos` muestra 9 tarjetas con APAGÓN al final y el filtro PUZZLE muestra CAÍDA y APAGÓN; `/juegos/apagon` carga con el leaderboard vacío; `/juegos/apagon/jugar` arranca la simulación; `/salon` lista APAGÓN en el filtro.
4. Revisar con `npm run lint`, `npx tsc --noEmit`, `npm run build` y el Security Advisor de Supabase. Verificación: todo pasa y el advisor no muestra avisos nuevos.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Existe una migración nueva `supabase/migrations/<timestamp>_game_apagon.sql`, posterior a las existentes, y ninguna migración anterior ha cambiado.
- [ ] `public.games` tiene 9 filas; la fila `apagon` tiene `title = 'APAGÓN'`, `cat = 'PUZZLE'`, `cover = 'cover-apagon'`, `color = 'yellow'` y `sort_order = 9`.
- [ ] Un `insert`, `update` o `delete` sobre `games` con la publishable key sigue fallando.
- [ ] `/juegos` muestra APAGÓN en novena posición con la portada `cover-apagon` (skyline y cable visibles, no un recuadro vacío).
- [ ] El filtro PUZZLE de `/juegos` devuelve CAÍDA y APAGÓN, y la búsqueda "apag" encuentra APAGÓN.
- [ ] `/juegos/apagon` carga con su texto `long` y un leaderboard vacío; `/juegos/no-existe` sigue devolviendo 404.
- [ ] `/juegos/apagon/jugar` ejecuta la simulación de `GamePlayer` y no inserta ninguna fila en `scores`.
- [ ] `/salon` muestra APAGÓN en el filtro por juego, sin puntuaciones.
- [ ] La home no cambia.
- [ ] `select count(*) from public.scores where game_id = 'apagon'` devuelve 0: no se siembran puntuaciones.
- [ ] Ningún archivo usa `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí:** juego tipo _Pipe Mania_ con la ciudad a oscuras como historia **(decidido por game-jam, pendiente de revisar)**. Convierte "ciudad nocturna" en una mecánica (devolver la luz) y no en una escena. **No:** un _runner_ por azoteas, la otra lectura obvia del tema, porque se parece a CORREDOR (ya sugerido por `game-planner`) y a RANARIA.
- **Sí:** título `APAGÓN` e id `apagon` **(decidido por game-jam, pendiente de revisar)**. Una palabra en mayúsculas, como ROCAS o CAÍDA; el id va sin tilde por el `check` de la tabla.
- **Sí:** categoría `PUZZLE` **(decidido por game-jam, pendiente de revisar)**. Hay 4 ARCADE, 2 SHOOTER, 1 PUZZLE y 1 VERSUS; PUZZLE es la que más equilibra.
- **Sí:** acento `yellow` **(decidido por game-jam, pendiente de revisar)**. Es el color de la electricidad y de las ventanas encendidas. Lo comparten GLOTÓN y ROCAS, pero ningún PUZZLE.
- **Sí:** `sort_order = 9`, al final de la biblioteca. No reordena los juegos existentes.
- **No:** mostrar APAGÓN en la home. Habría que cambiar `sort_order` de otros juegos o la lógica de `slice(0, 6)`; queda fuera de una jam.
- **Sí:** migración nueva con un solo `insert`. Las migraciones son inmutables y la tabla ya tiene RLS.
- **No:** tocar `GamePlayer` ni el registro. Sin entrada en `GAME_REGISTRY`, el id usa la simulación existente.

---

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                    |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| La fila llega a producción antes que la clase CSS y la tarjeta sale sin portada | El paso 1 (CSS) va antes que el paso 2 (migración), y ambos en la misma rama.                 |
| Un juego nuevo que solo simula confunde ("¿por qué no guarda?")                 | Es el mismo estado que GLOTÓN o INVASORES; el spec 02 lo sustituye por el motor real.         |
| La `ó` de `APAGÓN` se codifica mal en la migración                              | Archivo en UTF-8 y comprobación con `select title from public.games where id = 'apagon'`.     |
| `<timestamp>` anterior a una migración ya aplicada                              | Generarlo en el momento con la CLI o con `date +%Y%m%d%H%M%S`, y comprobar `list_migrations`. |
| El skyline de la portada se ve recargado a tamaño de tarjeta                    | Diseñarlo con `/frontend-design` y revisarlo en `/juegos` con la tarjeta real.                |

---

## Qué **no** está en este spec

- El motor de APAGÓN, su registro y el guardado de puntuaciones.
- Sonido, efectos y curva de dificultad.
- Cambios en la home, en RLS o en el esquema.
- Puntuaciones sembradas o de ejemplo.

Cada uno de esos puntos, si llega, va en su propio spec.
