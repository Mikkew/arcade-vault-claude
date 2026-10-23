# GAME JAM PAPILLA · SPEC 01 — PAPILLA entra en el catálogo

> **Estado:** Approved
> **Tema:** Frogger: cruza la carretera y el río sin convertirse en papilla
> **Depende de:** SPEC 07, SPEC 08
> **Fecha:** 2026-10-22
> **Objetivo:** Añadir PAPILLA (id `papilla`) a `public.games` con una migración nueva y una portada `cover-papilla`, de modo que aparezca en la biblioteca, el detalle y el Salón, jugando de momento con la simulación de `GamePlayer`.

---

## Por qué existe este spec

El tema de la jam es "Frogger: cruza la carretera y el río sin convertirse en papilla". El catálogo ya tiene un Frogger, RANARIA (`ranaria`, ARCADE, `green`, `cover-rana`), que sigue simulado. PAPILLA es otro juego: una **carrera contra un sapo rival controlado por la CPU** por los cinco nenúfares del otro lado. Quien llega primero se queda el nenúfar; quien se queda tres gana la ronda. El tono es gamberro (camiones de la basura, manchas de papilla en el asfalto, el sapo que se burla) y la categoría es VERSUS, no ARCADE.

Para que el motor del spec 02 tenga dónde guardar puntuaciones, `scores.game_id` necesita una fila en `public.games` (clave foránea, spec 08). Este spec crea solo esa fila y su portada. No escribe motor ni toca `scores`.

---

## Alcance

**Dentro:**

- Migración nueva `supabase/migrations/<timestamp>_game_papilla.sql` con el `insert` de la fila `papilla` (`sort_order = 9`, el máximo actual 8 + 1; ver _Decisiones_ sobre APAGÓN).
- Clase de portada `cover-papilla` (con `::before` y `::after`) en `app/globals.css`, junto a las demás `cover-*`, diseñada con `/frontend-design`.
- Comprobar que `/juegos`, `/juegos/papilla`, `/juegos/papilla/jugar` y el filtro de `/salon` muestran el juego sin cambios en el código de las páginas.
- Mientras no exista el motor, `/juegos/papilla/jugar` usa la simulación de `GamePlayer` (no hay entrada en `GAME_REGISTRY`) y no escribe en `scores`.

**Fuera de alcance (para otros specs):**

- El motor real y su registro (`game-jam/papilla/02-motor`).
- Sonido, efectos y ajustes de dificultad (`game-jam/papilla/03-pulido`).
- Cambios en RANARIA: sigue simulada, con su fila, su portada `cover-rana` y su `sort_order = 7` intactos.
- Cambios en RLS de `games`: la tabla ya es de lectura pública y no admite escritura desde la app (spec 07).
- Cambios en la home: `app/page.tsx` muestra `games.slice(0, 6)`, y PAPILLA, con `sort_order = 9`, no entra en esa selección.
- Puntuaciones de ejemplo o sembradas (prohibido por la spec 08).
- Portada con imagen real: `cover` sigue siendo una clase CSS.

---

## Modelo de datos

No hay tablas ni columnas nuevas. Solo una fila más en `public.games`:

```sql
-- supabase/migrations/<timestamp>_game_papilla.sql
-- Game jam "Frogger: cruza la carretera y el río sin convertirse en papilla".
-- PAPILLA entra en el catálogo. La tabla ya tiene RLS de solo lectura pública
-- (spec 07); no se tocan políticas.
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  (
    'papilla',
    'PAPILLA',
    'Cruza antes que el sapo. O acaba en papilla.',
    'Una rana con prisa y un sapo tramposo se disputan los cinco nenúfares del otro lado. Esquiva camiones de la basura, salta de tronco en tortuga y llega primero. Si te aplastan, que al menos sea con estilo.',
    'VERSUS',
    'cover-papilla',
    'magenta',
    9
  );
```

- `id` cumple `^[a-z0-9]+(-[a-z0-9]+)*$` y no existe en `public.games` (verificado con `select id, title, cat, color, sort_order from public.games order by sort_order;` el 2026-10-22: 8 filas, `sort_order` 1–8), ni en `components/games/registry.ts`, ni en `specs/game-jam/` (solo existe `apagon`). `grep -ri papilla` en el repositorio no devuelve nada.
- `cat = 'VERSUS'` y `color = 'magenta'` pasan los `check` de la tabla.
- `<timestamp>` sigue el formato de las migraciones existentes (`AAAAMMDDhhmmss`, p. ej. `20261020003532_games.sql`) y debe ser posterior a la última migración aplicada (hoy `20261020231900_scores_aggregates.sql`).
- La migración es inmutable una vez aplicada: cualquier corrección del texto va en otra migración con `update`.
- El valor de `sort_order` se recalcula justo antes de aplicar: `select max(sort_order) + 1 from public.games;`. Si APAGÓN (`game-jam/apagon`) se aplicó antes, será `10`.

Portada `cover-papilla` (idea visual; los valores finales se ajustan con `/frontend-design`). Tiene que leerse a primera vista como "atropello cómico", no como "estanque", para no confundirse con `cover-rana` (franjas cian de agua y un círculo verde):

- **Fondo:** asfalto nocturno, degradado vertical de `#1a0614` arriba a `#0a0a18` abajo, con un halo magenta muy tenue en el centro, como una farola de neón rosa.
- **`::before` (carretera):** dos líneas de carril discontinuas horizontales en `var(--yellow)` al 70 % de opacidad (`repeating-linear-gradient(90deg, …)` de 18 px de trazo y 14 px de hueco, 3 px de alto) al 30 % y al 70 % de la altura, y una huella de neumático diagonal que cruza el centro: una banda de 22 px en `rgba(0,0,0,0.55)` con un patrón de tacos (`repeating-linear-gradient(45deg, …)`).
- **`::after` (la papilla):** una mancha irregular en el centro hecha con 5–6 `radial-gradient` superpuestos de radios distintos en `var(--magenta)` y un núcleo `var(--green)` (la rana), con dos ojos blancos de 5 px y pupilas negras "en espiral" (un `radial-gradient` con anillo), y salpicaduras sueltas de 3–4 px alrededor. `filter: drop-shadow(0 0 10px rgba(255,0,110,0.6))`. Si `/frontend-design` prefiere que la huella pase por encima de la mancha, se dibuja en `::after` sobre ella.

Boceto orientativo (no definitivo):

```css
.cover-papilla {
  background:
    radial-gradient(
      ellipse at 50% 45%,
      rgba(255, 0, 110, 0.16),
      transparent 60%
    ),
    linear-gradient(180deg, #1a0614, #0a0a18);
}
.cover-papilla::before {
  content: "";
  position: absolute;
  inset: 0;
  background: /* líneas de carril discontinuas + huella de neumático */;
}
.cover-papilla::after {
  content: "";
  position: absolute;
  inset: 0;
  background: /* mancha magenta + núcleo verde + ojos + salpicaduras */;
  filter: drop-shadow(0 0 10px rgba(255, 0, 110, 0.6));
}
```

---

## Mapa de rutas

| Pantalla   | Ruta                    | Archivo                          | Cambio                                                                 |
| ---------- | ----------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| Biblioteca | `/juegos`               | `app/juegos/page.tsx`            | Ninguno en código; aparece una tarjeta más con `cover-papilla`         |
| Detalle    | `/juegos/papilla`       | `app/juegos/[id]/page.tsx`       | Ninguno; leaderboard vacío ("sin partidas")                            |
| Jugar      | `/juegos/papilla/jugar` | `app/juegos/[id]/jugar/page.tsx` | Ninguno; simulación de `GamePlayer`, sin escribir en `scores`          |
| Salón      | `/salon`                | `app/salon/page.tsx`             | Ninguno; PAPILLA aparece en el filtro por juego, sin puntuaciones      |
| Home       | `/`                     | `app/page.tsx`                   | Ninguno; no aparece (solo se muestran los 6 primeros por `sort_order`) |

Archivos nuevos:

- `supabase/migrations/<timestamp>_game_papilla.sql`: el `insert` de arriba.

Archivos que cambian:

- `app/globals.css`: bloque `.cover-papilla`, `.cover-papilla::before`, `.cover-papilla::after` tras `.cover-duelo` (o tras `.cover-apagon` si ya existe).

---

## Plan de implementación

Antes de escribir la migración, cargar `supabase` y `supabase-postgres-best-practices` e inspeccionar la tabla con `list_tables` del MCP de Supabase. Trabajar en la rama `game-papilla`.

1. Añadir `.cover-papilla` en `app/globals.css` con `/frontend-design`. Todavía no la usa nadie, el sistema sigue igual. Verificación: `npm run lint` y `npm run build` pasan.
2. Recalcular `sort_order` con `select max(sort_order) + 1 from public.games;`, escribir `supabase/migrations/<timestamp>_game_papilla.sql` con el `insert` y aplicarlo con el MCP o la CLI de Supabase. Verificación: `select id, cat, color, sort_order from public.games where id = 'papilla'` devuelve una fila con `VERSUS`, `magenta` y el `sort_order` calculado, y `select count(*) from public.games` ha subido en 1.
3. Revisar las pantallas en el navegador (Playwright MCP). Verificación: `/juegos` muestra PAPILLA al final con su portada; el filtro VERSUS muestra DUELO PIXEL y PAPILLA; `/juegos/papilla` carga con el leaderboard vacío; `/juegos/papilla/jugar` arranca la simulación; `/salon` lista PAPILLA en el filtro.
4. Revisar con `npm run lint`, `npx tsc --noEmit`, `npm run build` y el Security Advisor de Supabase. Verificación: todo pasa y el advisor no muestra avisos nuevos.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Existe una migración nueva `supabase/migrations/<timestamp>_game_papilla.sql`, posterior a las existentes, y ninguna migración anterior ha cambiado.
- [ ] `public.games` tiene una fila más que antes; la fila `papilla` tiene `title = 'PAPILLA'`, `cat = 'VERSUS'`, `cover = 'cover-papilla'`, `color = 'magenta'` y `sort_order` = máximo anterior + 1.
- [ ] La fila `ranaria` no ha cambiado (`select * from public.games where id = 'ranaria'` devuelve lo mismo que antes).
- [ ] Un `insert`, `update` o `delete` sobre `games` con la publishable key sigue fallando.
- [ ] `/juegos` muestra PAPILLA en última posición con la portada `cover-papilla` (carretera y mancha visibles, no un recuadro vacío) y se distingue a simple vista de la tarjeta de RANARIA.
- [ ] El filtro VERSUS de `/juegos` devuelve DUELO PIXEL y PAPILLA, y la búsqueda "papi" encuentra PAPILLA.
- [ ] `/juegos/papilla` carga con su texto `long` y un leaderboard vacío; `/juegos/no-existe` sigue devolviendo 404.
- [ ] `/juegos/papilla/jugar` ejecuta la simulación de `GamePlayer` y no inserta ninguna fila en `scores`.
- [ ] `/salon` muestra PAPILLA en el filtro por juego, sin puntuaciones.
- [ ] La home no cambia.
- [ ] `select count(*) from public.scores where game_id = 'papilla'` devuelve 0: no se siembran puntuaciones.
- [ ] Ningún archivo usa `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí:** un Frogger nuevo y no convertir RANARIA en real **(decidido por game-jam, pendiente de revisar)**. Es lo que pidió el usuario para esta jam. El catálogo tendrá **dos juegos de rana**; se acepta porque PAPILLA cambia la categoría (VERSUS contra la CPU, no ARCADE en solitario), la mecánica central (carrera por los nenúfares contra un rival) y el tono (gamberro frente al clásico de RANARIA). **Alternativa:** convertir RANARIA en real con `/arcade-game ranaria` y descartar PAPILLA, o hacer RANARIA real más adelante reutilizando `lib/papilla/lanes.ts`. Si el usuario prefiere un solo juego de rana, lo menos costoso es aplicar los specs 02–03 a `ranaria` quitando el rival.
- **Sí:** título `PAPILLA` e id `papilla` **(decidido por game-jam, pendiente de revisar)**. Sale directo del lema, es una palabra en mayúsculas como ROCAS o CAÍDA y no contiene "rana", lo que ayuda a no confundirlo con RANARIA.
- **Sí:** categoría `VERSUS` **(decidido por game-jam, pendiente de revisar)**. Hay 4 ARCADE (con RANARIA), 2 SHOOTER, 1 PUZZLE (2 si entra APAGÓN) y 1 VERSUS, y ese VERSUS (DUELO PIXEL) está simulado y es a dos jugadores locales, que casa mal con un leaderboard por usuario. Un VERSUS contra la CPU sí tiene ranking con sentido. **No:** ARCADE, porque duplicaría el hueco de RANARIA.
- **Sí:** acento `magenta` **(decidido por game-jam, pendiente de revisar)**. Es el color de la papilla de la portada, solo lo usa CAÍDA y ningún VERSUS, y separa el juego del `green` de RANARIA.
- **Sí:** `sort_order` = máximo actual + 1 (9 hoy), al final de la biblioteca. No reordena los juegos existentes. APAGÓN (`game-jam/apagon/01-catalogo`) también propone 9; el que se aplique segundo usa 10, por eso el paso 2 lo recalcula.
- **No:** mostrar PAPILLA en la home. Habría que cambiar `sort_order` de otros juegos o la lógica de `slice(0, 6)`; queda fuera de una jam.
- **Sí:** migración nueva con un solo `insert`. Las migraciones son inmutables y la tabla ya tiene RLS.
- **No:** tocar `GamePlayer` ni el registro. Sin entrada en `GAME_REGISTRY`, el id usa la simulación existente.

---

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Dos juegos de rana en el catálogo confunden al usuario                          | Categoría, color, portada y texto distintos; la decisión queda pendiente de revisar, con alternativa.  |
| La fila llega a producción antes que la clase CSS y la tarjeta sale sin portada | El paso 1 (CSS) va antes que el paso 2 (migración), y ambos en la misma rama.                          |
| `sort_order` choca con APAGÓN si ambas jams se implementan a la vez             | Se recalcula con `max + 1` en el paso 2; `sort_order` no es único, solo afecta al orden.               |
| Un juego nuevo que solo simula confunde ("¿por qué no guarda?")                 | Es el mismo estado que RANARIA o INVASORES; el spec 02 lo sustituye por el motor real.                 |
| La portada de "atropello" resulta desagradable en vez de cómica                 | Estilo caricatura: mancha neón, ojos en espiral, nada de rojo sangre; revisión con `/frontend-design`. |
| `<timestamp>` anterior a una migración ya aplicada                              | Generarlo en el momento con la CLI o con `date +%Y%m%d%H%M%S`, y comprobar `list_migrations`.          |

---

## Qué **no** está en este spec

- El motor de PAPILLA, su registro y el guardado de puntuaciones.
- Sonido, efectos y curva de dificultad.
- Cualquier cambio en RANARIA.
- Cambios en la home, en RLS o en el esquema.
- Puntuaciones sembradas o de ejemplo.

Cada uno de esos puntos, si llega, va en su propio spec.
