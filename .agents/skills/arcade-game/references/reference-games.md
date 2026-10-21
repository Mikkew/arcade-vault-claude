# Juegos de `references/started-games/`

Datos de los juegos de ejemplo y a qué fila del catálogo (`public.games`) corresponde cada uno. Verifica contra el código antes de fiarte: esta tabla es una foto del momento en que se escribió el skill.

| Carpeta | Juego | Id en el catálogo | Estado |
| --- | --- | --- | --- |
| `02-asteroids` | Asteroides | `rocas` | Ya portado (spec 05, `lib/asteroids/`) |
| `03-tetris` | Tetris | `caida` | Simulado: pendiente de portar |
| `04-arkanoid` | Arkanoid | `bloque-buster` | Simulado: pendiente de portar |

Los demás ids (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) no tienen código de referencia: se escriben desde cero con el mismo contrato.

## 03-tetris → `caida`

Archivos: `index.html`, `game.js` (332 líneas), `style.css`.

- **Tablero**: 10×20, bloque de 30 px → canvas lógico 300×600. Hay un segundo canvas (`next-canvas`, 120×120) para la pieza siguiente; en el motor, o se dibuja dentro del mismo canvas ampliando el área lógica, o se renuncia a él. Decide con el usuario si no es evidente.
- **Controles**: ← → mover, ↑ o `X` rotar, ↓ bajar, Espacio caída instantánea, `P` pausa. Hoy usa `e.code`.
- **Puntuación**: líneas × `LINE_SCORES` (100/300/500/800) × nivel, +1 por celda de bajada suave, +2 por celda de caída instantánea. Nivel sube cada 10 líneas; el intervalo de caída baja de 1000 ms hasta un mínimo de 100 ms.
- **Pieza extra**: la `N` ("tuerca", 3×3 hueca) además de las 7 clásicas. Consérvala.
- **Dependencias del DOM a eliminar**: `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, y el botón de tema claro/oscuro con `localStorage` (la plataforma tiene su propio tema; se elimina).
- **Callbacks**: `onScore`, `onLevel`, `onGameOver`. **Sin vidas** (`hud.lives = false`). Las líneas no tienen hueco en el HUD actual: o se ignoran, o se muestran con una extensión del HUD que se diseñe con `/frontend-design`.
- **Sin sonido** en el original (`sound: false`; `setMuted` es no-op).
- Estilos de `style.css` se descartan; la apariencia sale de la plataforma. Los colores de `COLORS` conviene mapearlos a la paleta neón (cian/magenta/verde/amarillo) para que cuadre con el CRT.

## 04-arkanoid → `bloque-buster`

Archivos: `index.html`, `game.js` (268 líneas), `levels.js`, `assets/spritesheet.js`, `assets/spritesheet-breakout.png`, `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3`. Incluye un `skills-lock.json` propio que no forma parte del juego.

- **Canvas**: 800×600 ya fijo. Coincide con el área lógica de ROCAS.
- **Controles**: ← → mueven la pala; también `mousemove` sobre el canvas y `click` (lanzar la bola). `P`/`Escape` pausan. Usa `e.key` hoy; pasa a `e.code`. Convierte las coordenadas del ratón con `getBoundingClientRect` porque el canvas se escala por CSS.
- **Puntuación**: +10 por bloque. Vidas: 3. Niveles definidos en `levels.js` (`LEVELS`, con `speed` por nivel).
- **Recursos**: `spritesheet-breakout.png` y los dos `.mp3` → copiar a `public/games/bloque-buster/` y cargar con `/games/bloque-buster/…`. `spritesheet.js` y `levels.js` se convierten en módulos TS con tipos (`export const LEVELS`, `export const SPRITES`). El PNG se carga con `new Image()` dentro de la fábrica; espera a `onload` antes de empezar a dibujar y no pases a la partida si falla (muestra el juego sin sprites o un error visible, no un lienzo vacío).
- **Audio**: `new Audio(...)` en la raíz del módulo → mover dentro de la fábrica; `setMuted` pone `muted` en ambos; reiniciar `currentTime = 0` antes de `play()` y capturar la promesa rechazada (`.catch(() => {})`) porque el navegador puede bloquear el autoplay.
- **Callbacks**: `onScore`, `onLives`, `onLevel`, `onGameOver`. HUD completo.
- **Dependencias del DOM**: `document.getElementById('game')` y los `<script>` sueltos. El dibujo de `Score:` y las bolas de vida dentro del canvas (líneas ~235–245) se elimina: lo hace el HUD.

## 02-asteroids → `rocas`

Ya está portado y es la referencia. Si el usuario pide rehacerlo o compararlo con el original, el original tiene `favicon.svg` (descartable), 510 líneas en `game.js` y la lógica de power-up de triple disparo. Para cambios en ROCAS usa el spec 05 como fuente.

## Juegos que no están en la carpeta

1. Confirma `id` (kebab-case), `title`, `cat`, `color`, y descripciones `short` / `long` en español.
2. Define el área lógica (4:3 recomendado, 800×600) y los controles.
3. Escribe el motor desde cero con el esqueleto de `engine-contract.md`.
4. Fase 5 del skill: migración que inserta la fila y portada CSS nueva con `/frontend-design`.
