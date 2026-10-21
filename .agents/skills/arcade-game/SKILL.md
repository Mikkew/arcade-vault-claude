---
name: arcade-game
description: Crea un juego nuevo para Arcade Vault (o porta uno de references/started-games/) y lo integra en la plataforma con puntuaciones y leaderboard en Supabase (spec 08). Úsalo siempre que el usuario pida crear, portar, añadir o integrar un juego, convertir un juego de references/started-games (tetris, arkanoid, asteroids) a TypeScript, conectar un juego a GUARDAR PUNTUACIÓN / scores / leaderboard / salón de la fama, o reemplazar la simulación de un juego del catálogo por uno real, aunque no diga "skill" ni mencione la spec.
argument-hint: <id-del-juego | carpeta-en-references | descripción del juego>
---

# /arcade-game — Crear o portar un juego e integrarlo con su leaderboard

Un juego de Arcade Vault es **un motor TypeScript independiente de React** montado sobre un `<canvas>`, que habla con la plataforma solo por callbacks (puntuación, vidas, nivel, fin de partida). La plataforma pone el HUD, la pausa, el modal `FIN DEL JUEGO`, el guardado de la puntuación y los rankings. Ese reparto es lo que permite añadir un juego sin tocar nada del resto: el motor nunca sabe de Supabase, y la plataforma nunca sabe de las reglas del juego.

ROCAS (`lib/asteroids/`, spec 05) es la implementación de referencia de ese patrón. Léela antes de escribir un motor nuevo.

## Entradas posibles

El argumento puede ser:

- **Una carpeta de `references/started-games/`** (`02-asteroids`, `03-tetris`, `04-arkanoid`): se porta el código existente. Notas por juego en `references/reference-games.md`.
- **Un juego que no está en esa carpeta** (una descripción, otro repositorio, "hazme un Snake"): se escribe desde cero siguiendo el mismo contrato de motor.
- **Un id del catálogo** (`caida`, `bloque-buster`, `serpentina`…): hoy es una simulación; se reemplaza por el juego real.

Si el argumento no deja claro cuál de las tres es, o a qué fila del catálogo corresponde, pregunta una sola vez con `AskUserQuestion`; no adivines.

## Reglas del proyecto que este skill respeta

- **Antes de escribir código de Next.js**, lee la guía relevante en `node_modules/next/dist/docs/01-app/` (AGENTS.md: esta versión rompe APIs conocidas). Server Actions y `revalidatePath` son las que más se usan aquí.
- **Toda UI nueva** (estados vacíos, mensajes de guardado, cubierta de un juego nuevo, controles) se diseña con `/frontend-design` (lo exige CLAUDE.md). Reutiliza primero las clases CSS existentes de `app/globals.css` (`btn`, `modal`, `toast-saved`, `crt`, `hud-stat`…).
- **Las funcionalidades pasan por `/spec` y luego `/spec-impl`.** Si no existe un spec para este juego, recomiéndalo en una frase; si el usuario prefiere ir directo, sigue. La rama de trabajo debe llamarse como el spec o `game-<id>`; no trabajes en `main`.
- **Las migraciones son inmutables y versionadas** en `supabase/migrations/<timestamp>_<nombre>.sql`. Nunca edites una migración ya aplicada; añade otra. Antes de escribir SQL carga `supabase-postgres-best-practices`, y `supabase` para RLS. Inspecciona el esquema real con `list_tables` antes de cambiarlo.
- **Sin `SUPABASE_SERVICE_ROLE_KEY`, sin puntuaciones sembradas o ficticias, sin emails de `auth.users` expuestos.** Son criterios de aceptación de la spec 08, y romperlos invalida el ranking.
- No hay test runner. La verificación es `npm run lint`, `npx tsc --noEmit`, `npm run build` y jugar de verdad en el navegador.

## Flujo

Sigue las fases en orden. Cada una tiene una comprobación; si falla, arréglala antes de avanzar.

### Fase 0 — Reconocer el terreno

Comprueba el estado actual en vez de asumirlo, porque este skill se usa varias veces en la vida del proyecto y el repositorio cambia entre usos:

1. `git status` y rama actual. Si estás en `main`, crea la rama (`game-<id>`) o la del spec.
2. ¿Existe la **base del leaderboard**? Busca `lib/scores-repo.ts`, `app/juegos/[id]/jugar/actions.ts` y una migración `*_scores.sql`; confirma en la base con `list_tables` que `public.scores` existe.
3. ¿Qué juegos tienen ya motor real? Mira el registro de juegos (`components/games/registry.tsx` si ya existe) o, si todavía no existe, `GamePlayer.tsx` (hoy `isRocas`).
4. ¿Existe una fila para este juego en `public.games`? Cruza con `lib/games-repo.ts`.
5. Lee `specs/08-puntuaciones-leaderboard.md` y su `Estado`.

Con eso decides qué fases hacen falta:

| Situación | Qué hacer |
| --- | --- |
| No existe la base del leaderboard | Fase 1 completa. Es trabajo de una sola vez. |
| Existe la base, pero `GamePlayer` sigue con `isRocas` | Saltar a Fase 2 (la generalización es parte de añadir el segundo juego real). |
| Existe todo, el juego ya está en el catálogo | Fases 3, 4 y 6. |
| El juego no está en el catálogo | Añade la Fase 5. |

Resume al usuario en 3–5 líneas qué encontraste y qué vas a hacer antes de editar archivos.

### Fase 1 — Base del leaderboard (solo si falta)

La spec 08 define tabla `scores`, agregados, capa de lectura, Server Action `saveScore` y sustitución de los mocks. Implementarla es independiente de cualquier juego concreto, pero sin ella `GUARDAR PUNTUACIÓN` no persiste nada, así que un juego "integrado" no estaría terminado.

Lee `references/leaderboard-foundation.md`: destila el contrato de la spec (SQL, firmas, estados de UI, páginas a conectar, orden de pasos) y apunta las decisiones que la spec deja abiertas (idempotencia por partida, vista vs. RPC). Si la spec 08 sigue en `Draft`, dilo al usuario y sugiere pasarla a `Approved` o ejecutar `/spec-impl 08-puntuaciones-leaderboard`; si responde que sigas, implementa siguiendo esa referencia y anota en la spec las decisiones que tomes.

Comprobación: los pasos 1–4 de la spec (migración con RLS verificada, agregados, repo, `saveScore`) pasan `npx tsc --noEmit`.

### Fase 2 — Contrato de motor común y registro de juegos

Hoy `GamePlayer` y `AsteroidsCanvas` están atados a Asteroides. Para el segundo juego real, extrae lo común en vez de copiar y pegar un `isTetris` al lado de `isRocas`; cada `if` por id que dejes crecerá con cada juego y tocarlos todos es lo que se rompe después.

Lee `references/engine-contract.md` y haz, una sola vez:

- Tipos genéricos `GameCallbacks` / `GameEngine` (p. ej. `lib/engine/types.ts`); `AsteroidsCallbacks` y `AsteroidsGame` pasan a ser alias o se reemplazan.
- Un componente canvas genérico que reciba la fábrica del motor (`createEngine(canvas, callbacks)`), conservando la protección contra Strict Mode.
- Un registro `id → { createEngine, hud, controls, canvas }` que `GamePlayer` consulta. Un id sin entrada sigue usando la simulación, así que los juegos no portados no cambian.
- Renombrar la clase CSS `asteroids-canvas` a una genérica (`game-canvas`), o añadir la nueva junto a ella.

Comprobación: ROCAS se comporta exactamente igual que antes (juega una partida, pausa, silencio, reinicio) y los juegos simulados también.

### Fase 3 — El motor

Crea `lib/<id>/` con `engine.ts` (la fábrica), `types.ts` y los módulos que haga falta (`entities.ts`, `audio.ts`, `levels.ts`…). Sigue la lista de verificación de `references/engine-contract.md`; los puntos que más fallan al portar:

- **Cero globales y cero `document.getElementById`.** El motor recibe el `canvas` y los callbacks. Todo lo que el original escribía en el DOM (puntuación, líneas, nivel, overlay de game over, botón de reinicio, selector de tema) lo sustituye la plataforma o se elimina.
- **Todo lo que se registra se limpia en `destroy()`**: `requestAnimationFrame`, `keydown`/`keyup`, `blur`, listeners del canvas, `AudioContext` y temporizadores. React Strict Mode monta dos veces; un listener que sobrevive duplica los movimientos.
- **Teclado en `KeyboardEvent.code`**, con `preventDefault` solo para las teclas del juego y solo si el foco no está en un campo editable (el modal tiene un `<input>`).
- **Resolución lógica fija** (`canvas.width/height`) con escalado por CSS al contenedor. Convierte las coordenadas del ratón con `getBoundingClientRect` si el juego usa puntero.
- **Puntuación = entero ≥ 0 y ≤ 10.000.000**, y "más es mejor". Es lo que acepta el `check` de la base. Un juego donde gana el menor tiempo necesita su propia spec; avísalo y detente.
- **Un solo `onGameOver(finalScore)` por partida**, y `restart()` deja el motor como recién creado (puntuación, vidas, nivel, fase, entrada, temporizadores).
- `pause`/`resume` congelan el reloj de verdad (usa un `dt` acotado con `MAX_DT` para que reanudar no dispare un salto enorme).
- **Recursos** (sprites, sonidos) van a `public/games/<id>/…` y se cargan con rutas absolutas `/games/<id>/…`. Los sonidos pueden fallar a cargar o estar bloqueados por el navegador: nunca debe lanzar una excepción dentro del loop.

Comprobación: `npx tsc --noEmit` y `npm run lint` pasan, y `grep -n "document\.\|window\." lib/<id>` solo devuelve usos de listeners limpiados en `destroy()`.

### Fase 4 — Integración en la plataforma

1. Crea el wrapper `components/<Nombre>Canvas.tsx` si el registro lo necesita (o usa el genérico).
2. Registra el juego en el registro: fábrica del motor, qué estadísticas muestra el HUD (Vidas y Nivel solo si el juego las tiene; Tetris no tiene vidas), texto de controles y si soporta silencio.
3. Verifica que `app/juegos/[id]/jugar/page.tsx` funciona para el id sin cambios (el juego sale de `games-repo`).
4. Conecta el guardado: `saveScore` ya valida por `gameId`, así que un juego en el catálogo funciona automáticamente. Lo único específico del juego es que `GamePlayer` lo trate como "real" (guarda) y no como simulado (no escribe en `scores`), que es lo que consulta el registro.
5. Idempotencia: el identificador de partida cambia en cada `restart()` y no en cada render (ver `references/leaderboard-foundation.md`).

### Fase 5 — Alta en el catálogo (solo si el juego es nuevo)

Añade una migración nueva que inserte la fila en `public.games` (`id` en kebab-case, `cat` de `ARCADE|PUZZLE|SHOOTER|VERSUS`, `color` de `cyan|magenta|green|yellow`, `sort_order` siguiente). `cover` debe ser una clase CSS que exista: si el juego necesita portada nueva, créala en `app/globals.css` con `/frontend-design`, siguiendo `.cover-tetro` / `.cover-rocas`. Aplica con `apply_migration` y confirma con `list_tables`.

Los juegos de `references/started-games/` ya tienen fila en el catálogo (ver `references/reference-games.md`); no insertes duplicados.

### Fase 6 — Verificación de extremo a extremo

No des el juego por terminado solo porque compila; los fallos reales de un motor aparecen jugando.

1. `npm run lint`, `npx tsc --noEmit`, `npm run build`.
2. Arranca `npm run dev` y juega en el navegador con Playwright MCP (carga la skill `run` si necesitas patrones): cargar `/juegos/<id>/jugar`, mover/disparar con el teclado, pausa y reanudar, `FIN`, `JUGAR DE NUEVO`, y comprobar que no hay errores en la consola ni de hidratación.
3. **Sin sesión**: el modal no intenta guardar y ofrece `/acceso`.
4. **Con sesión**: termina una partida, pulsa `GUARDAR PUNTUACIÓN`, y confirma con `execute_sql` que hay una fila con el `game_id`, el `user_id` correcto y la puntuación final. Pulsa dos veces y confirma que no se duplica.
5. `/juegos/<id>` muestra la partida en el leaderboard tras recargar; `/salon` la lista y el filtro por juego funciona; la home la refleja; `best` y `plays` de la tarjeta coinciden con `max(score)` y `count(*)`.
6. Los demás juegos conservan su simulación y su botón no escribe en `scores`.
7. `get_advisors` (seguridad) sin hallazgos nuevos, y ningún email expuesto.

`scores` es inmutable por diseño, así que la partida de prueba queda como dato real de la cuenta usada. Díselo al usuario y pregunta si quiere que la elimines con SQL administrativo; no lo hagas por tu cuenta y no inventes datos para "poblar" el ranking.

### Cierre

Informa en pocas líneas: qué juego quedó integrado, archivos creados y modificados, migraciones aplicadas, qué se verificó y qué no (por ejemplo, si no pudiste probar con sesión), y decisiones que conviene anotar en el spec. No hagas commit ni push salvo que el usuario lo pida.

## Archivos de referencia

| Archivo | Cuándo leerlo |
| --- | --- |
| `references/leaderboard-foundation.md` | Fase 1 y fase 4: SQL, firmas, `saveScore`, estados de UI, páginas a conectar. |
| `references/engine-contract.md` | Fases 2 y 3: tipos del contrato, esqueleto de motor, canvas genérico, registro, lista de porteo. |
| `references/reference-games.md` | Cuando la entrada es un juego de `references/started-games/`: controles, puntuación, dependencias del DOM y del catálogo por juego. |
