# Juegos implementados — Arcade Vault

> Generado el 2026-10-22 a partir de la tabla `public.games` y la vista `public.game_stats` de Supabase, contrastado con el registro de motores `components/games/registry.ts`.

El catálogo de Supabase tiene **8 juegos**. **4 tienen un motor real** (TypeScript sobre `<canvas>`, contrato de `lib/engine/types.ts`) y guardan puntuaciones en `public.scores`. Los otros 4 siguen con la simulación de `GamePlayer` y no escriben puntuaciones.

## Resumen

| #   | ID              | Título        | Categoría | Estado       | Motor                | Mejor puntuación | Partidas |
| --- | --------------- | ------------- | --------- | ------------ | -------------------- | ---------------: | -------: |
| 1   | `bloque-buster` | BLOQUE BUSTER | ARCADE    | Implementado | `lib/bloque-buster/` |                0 |        0 |
| 2   | `caida`         | CAÍDA         | PUZZLE    | Implementado | `lib/caida/`         |               60 |        1 |
| 3   | `serpentina`    | SERPENTINA    | ARCADE    | Implementado | `lib/serpentina/`    |                0 |        1 |
| 4   | `gloton`        | GLOTÓN        | ARCADE    | Simulado     | —                    |                0 |        0 |
| 5   | `invasores`     | INVASORES     | SHOOTER   | Simulado     | —                    |                0 |        0 |
| 6   | `rocas`         | ROCAS         | SHOOTER   | Implementado | `lib/asteroids/`     |                0 |        0 |
| 7   | `ranaria`       | RANARIA       | ARCADE    | Simulado     | —                    |                0 |        0 |
| 8   | `duelo-pixel`   | DUELO PIXEL   | VERSUS    | Simulado     | —                    |                0 |        0 |

El orden es el de `sort_order` en el catálogo. Las puntuaciones y partidas vienen de `game_stats` en la fecha de generación.

## Juegos con motor real

### ROCAS

- **ID / ruta:** `rocas` · `/juegos/rocas/jugar`
- **Categoría / acento:** SHOOTER · `yellow` · cubierta `cover-rocas`
- **Descripción:** Pulveriza asteroides en gravedad cero.
- **Detalle:** Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.
- **Origen:** portado de `references/started-games/02-asteroids/` (spec 05). Es la implementación de referencia del contrato de motor.
- **Motor:** `lib/asteroids/` (`engine.ts`, `entities.ts`, `audio.ts`, `types.ts`)
- **HUD:** vidas y nivel · sonido sintetizado (botón SILENCIAR)
- **Controles:** ← → GIRAR · ↑ IMPULSO · ESPACIO DISPARAR
- **Puntuación:** asteroide grande 20, mediano 50, pequeño 100.

### CAÍDA

- **ID / ruta:** `caida` · `/juegos/caida/jugar`
- **Categoría / acento:** PUZZLE · `magenta` · cubierta `cover-tetro`
- **Descripción:** Encaja las piezas antes de que el techo te aplaste.
- **Detalle:** Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.
- **Origen:** portado de `references/started-games/03-tetris/`. Este trabajo introdujo el registro genérico de juegos.
- **Motor:** `lib/caida/` (`engine.ts`, `types.ts`)
- **HUD:** nivel (sin vidas) · sin sonido
- **Controles:** ← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAÍDA
- **Puntuación:** líneas limpiadas a la vez: 1 → 100, 2 → 300, 3 → 500, 4 → 800. Caída suave suma 1 por celda y caída rápida 2 por celda.

### BLOQUE BUSTER

- **ID / ruta:** `bloque-buster` · `/juegos/bloque-buster/jugar`
- **Categoría / acento:** ARCADE · `cyan` · cubierta `cover-bricks`
- **Descripción:** Rebota la pelota y destruye muros de neón.
- **Detalle:** Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?
- **Origen:** portado de `references/started-games/04-arkanoid/`.
- **Motor:** `lib/bloque-buster/` (`engine.ts`, `levels.ts`, `sprites.ts`, `types.ts`)
- **HUD:** vidas y nivel · con sonido
- **Controles:** ← → / RATÓN MOVER PALA
- **Puntuación:** 10 puntos por bloque.

### SERPENTINA

- **ID / ruta:** `serpentina` · `/juegos/serpentina/jugar`
- **Categoría / acento:** ARCADE · `green` · cubierta `cover-snake`
- **Descripción:** Crece sin morder tu propia cola.
- **Detalle:** Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.
- **Origen:** escrito desde cero con el skill `/arcade-game` y documentado después en la spec 09. Usa los sprites de `references/source-assets/snake-assets/`.
- **Motor:** `lib/serpentina/` (`engine.ts`, `sprites.ts`, `audio.ts`, `types.ts`)
- **HUD:** nivel (sin vidas) · con sonido
- **Controles:** ← ↑ ↓ → / WASD GIRAR
- **Puntuación:** cada fruta suma 10 × nivel actual.

## Juegos aún simulados

Están en el catálogo pero no tienen entrada en `GAME_REGISTRY`: el reproductor solo simula la partida y no guarda puntuaciones. Para convertirlos en juegos reales, usa `/arcade-game <id>`.

| ID            | Título      | Categoría | Descripción                                |
| ------------- | ----------- | --------- | ------------------------------------------ |
| `gloton`      | GLOTÓN      | ARCADE    | Devora puntos y escapa de los fantasmas.   |
| `invasores`   | INVASORES   | SHOOTER   | Defiende el planeta de filas alienígenas.  |
| `ranaria`     | RANARIA     | ARCADE    | Cruza la autopista de pixeles.             |
| `duelo-pixel` | DUELO PIXEL | VERSUS    | Dos paletas. Una pelota. Reflejos máximos. |
