# SKINS · SPEC 02 — Skins de BLOQUE BUSTER (clásico, neón y retro)

> **Estado:** Implemented
> **Depende de:** SPEC 09, skins/00-sistema-skins
> **Fecha:** 2026-10-22
> **Objetivo:** Que BLOQUE BUSTER ofrezca los skins `clasico`, `neon` y `retro`, todos con contraste medido sobre fondo oscuro, sacando del motor sus colores escritos a mano y llevándolos a `lib/bloque-buster/palettes.ts`.

---

## Por qué existe este spec

Auditoría de BLOQUE BUSTER (`lib/bloque-buster/`) a fecha de este spec:

| Juego         | `clasico`                     | `neon`  | `retro` |
| ------------- | ----------------------------- | ------- | ------- |
| bloque-buster | `contraste` + `colores fijos` | `falta` | `falta` |

- **`contraste`:** el ladrillo `gray` del spritesheet tiene como color dominante `#323142`, que da **1,65:1** sobre el fondo `#000000` (mínimo 3:1). Solo aparece en la fila superior del nivel 2, pero es un objeto jugable.
- **`colores fijos`:** el fondo, los colores de reserva de los 7 ladrillos, la pala y la bola están escritos a mano en `types.ts` y se usan directamente en `engine.ts`. Un skin no puede cambiarlos.
- `neon` y `retro` no existen porque todavía no hay sistema de skins.

A diferencia de ROCAS, el aspecto `clasico` **no sale de constantes de color, sino del spritesheet** `public/games/bloque-buster/spritesheet-breakout.png`. Las constantes de color solo se usan como reserva si la imagen no carga. Para medir el contraste del clásico se ha muestreado cada recorte de `sprites.ts` píxel a píxel (Python + Pillow, solo lectura) y se ha tomado el **color dominante** de cada sprite como su color de referencia.

Lo que el motor **no tiene**, aunque el Arkanoid original sí: power-ups, cápsulas, láser, ladrillos duros (varios golpes) o indestructibles, enemigos y texto dibujado en el canvas. El ladrillo `gray` es un ladrillo normal de un golpe y 10 puntos, como los demás. Puntuación, vidas, nivel y «EN PAUSA» los pinta la plataforma en el DOM. Tampoco hay `lineWidth` ni `font` en el motor. Los 7 tipos de ladrillo (`BlockColor`) solo se diferencian en el color: todos valen `BLOCK_POINTS = 10` y se rompen al primer golpe.

Además hay una incoherencia de nombres: el tipo `BlockColor` dice `cyan`, `magenta`, `hotpink` y `green`, pero los recortes de `sprites.ts` que usan esos nombres son, en la imagen, **verde azulado, violeta, naranja y azul**. Los colores de reserva (`FALLBACK_COLORS`) siguen los nombres y no la imagen, así que si el spritesheet falla el juego cambia de aspecto por completo. Este spec no renombra el tipo (cambiaría `levels.ts` sin necesidad), pero las paletas siguen lo que el jugador ve en el sprite.

---

## Alcance

**Dentro:**

- `lib/bloque-buster/palettes.ts` con el tipo `BloqueBusterPalette` y `PALETTES: Record<SkinId, BloqueBusterPalette>`.
- Quitar de `types.ts` las constantes `FALLBACK_COLORS`, `PADDLE_COLOR`, `BALL_COLOR` y `BG_COLOR`, y de `engine.ts` todo literal de color (lista completa más abajo).
- Corrección de contraste en `clasico`: velo plateado sobre el sprite del ladrillo `gray`.
- Colores de reserva de `clasico` alineados con lo que muestra el spritesheet.
- Dibujo plano por código para `neon` y `retro` (ladrillos, pala, bola y explosiones) sin usar el spritesheet.
- `createBloqueBusterGame(canvas, callbacks, skin?)` y un `setSkin` real, que sustituye al método vacío de skins/00.
- Brillo (`shadowBlur`) solo en `neon` y scanlines por código solo en `retro`, las dos cosas con `lib/engine/skin-fx.ts`.
- `GAME_REGISTRY["bloque-buster"].skins = ["clasico", "neon", "retro"]`.

**Fuera de alcance (para otros specs):**

- Skins de ROCAS (`skins/01-skins-rocas`), CAÍDA y SERPENTINA.
- Cambios en las reglas, la física, los puntos, las vidas, los niveles o el audio de BLOQUE BUSTER.
- Power-ups, láser, ladrillos duros o indestructibles. Serían jugabilidad nueva y necesitan su propio spec de motor.
- Editar o sustituir el spritesheet. `clasico` sigue usando la imagen actual.
- Renombrar los valores de `BlockColor`.
- Cualquier cambio en el selector o en la persistencia: eso es de skins/00.

---

## Modelo de datos

**No hay datos nuevos en la base**, ni migraciones, y `saveScore` no cambia. El único estado nuevo vive en memoria dentro del motor:

```ts
// lib/bloque-buster/palettes.ts
import type { SkinId } from "@/lib/engine/skins";
import type { SkinFx } from "@/lib/engine/skin-fx";
import type { BlockColor } from "./types";
export interface BloqueBusterPalette {
  bg: string; // fondo del canvas (luminancia ≤ 0,05)
  sprites: boolean; // true: dibuja el spritesheet y usa los colores solo como reserva
  blocks: Record<BlockColor, string>; // color de cada tipo de ladrillo (o reserva en clásico)
  spriteTint: Partial<Record<BlockColor, string>>; // velo sobre el sprite (corrección de contraste)
  paddle: string; // cuerpo de la pala
  paddleAccent: string | null; // extremos de la pala (8 px por lado); null = sin extremos
  ball: string;
  ballShape: "square" | "circle"; // solo dibujo; la colisión sigue siendo AABB 16×16
  blockStyle: "fill" | "outline"; // relleno plano o trazo con relleno translúcido
  blockInset: number; // px de hueco entre ladrillos
  fillAlpha: number; // alfa del relleno interior en estilo "outline"
  line: { block: number; paddle: number; explosion: number }; // grosores de trazo
  blur: { block: number; paddle: number; ball: number }; // px de shadowBlur antes de aplicar fx.glow
  explosion: "sprite" | "fade" | "steps"; // animación de 150 ms del ladrillo roto
  fx: SkinFx; // glow y scanlines (skins/00)
}
export const PALETTES: Record<SkinId, BloqueBusterPalette>;
```

```ts
// engine.ts
let pal = PALETTES[skin ?? DEFAULT_SKIN];
```

---

## Paletas

Los contrastes se han calculado con la fórmula de luminancia relativa de WCAG 2.x (`node -e`). Cada color se mide contra el `bg` de **su** skin. Los colores con alfa se combinan antes sobre ese `bg`. Para objetos jugables el mínimo es 3:1 (WCAG 1.4.11). BLOQUE BUSTER no dibuja texto en el canvas, así que no hay ningún rol con mínimo 4,5:1.

En `clasico` el valor de referencia es el **color dominante del sprite** (el que más píxeles ocupa en el recorte). Entre paréntesis va el color de reserva que se usa si el spritesheet no carga.

### Tabla de roles

| Rol (`BlockColor` → lo que se ve) | Tipo                      | clásico (sprite · reserva)                                               | neón                                                    | retro                  |
| --------------------------------- | ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------- |
| `bg`                              | fondo                     | `#000000` (L = 0,0000)                                                   | `#05050a` (L = 0,0016)                                  | `#000000` (L = 0,0000) |
| `blocks.red` → rojo               | objeto                    | `#c02a3e` — **3,64** · reserva `#c02a3e`                                 | `#ff006e` — **5,30**                                    | `#ff5555` — **6,68**   |
| `blocks.yellow` → amarillo        | objeto                    | `#d9bd4c` — **11,33** · reserva `#d9bd4c`                                | `#f5ff00` — **18,58**                                   | `#ffff55` — **19,69**  |
| `blocks.cyan` → verde azulado     | objeto                    | `#4fc99c` — **10,17** · reserva `#4fc99c`                                | `#00ff88` — **15,17**                                   | `#55ffaa` — **16,27**  |
| `blocks.magenta` → violeta        | objeto                    | `#632ff4` — **3,24** · reserva `#632ff4`                                 | `#b14dff` — **5,21**                                    | `#aa55ff` — **5,45**   |
| `blocks.hotpink` → naranja        | objeto                    | `#fc7d1c` — **8,09** · reserva `#fc7d1c`                                 | `#ff9a1f` — **9,58**                                    | `#ffaa00` — **11,00**  |
| `blocks.green` → azul             | objeto                    | `#44aaf3` — **8,29** · reserva `#44aaf3`                                 | `#45c8ff` — **10,61**                                   | `#55aaff` — **8,58**   |
| `blocks.gray` → piedra            | objeto                    | `#323142` — ~~1,65~~ → con velo `#666979` — **3,86** · reserva `#666979` | `#e6e9ff` — **16,91**                                   | `#aaaaaa` — **9,04**   |
| `spriteTint.gray`                 | corrección                | `rgba(199,208,224,0.35)` (`--silver` al 35 %)                            | —                                                       | —                      |
| `paddle`                          | objeto                    | `#babac5` — **10,92** · reserva `#00f0ff` — **14,91**                    | `#00f5ff` — **15,02**                                   | `#aaaaaa` — **9,04**   |
| `paddleAccent`                    | objeto (parte de la pala) | franjas del sprite `#af2a44` — **3,24** · reserva `null`                 | `#ff006e` — **5,30**                                    | `#ff5555` — **6,68**   |
| `ball`                            | objeto                    | `#babac5` — **10,92** · reserva `#ffffff` — **21,00**                    | `#ffffff` — **20,34**                                   | `#aaaaaa` — **9,04**   |
| relleno interior (`fillAlpha`)    | decoración                | —                                                                        | color al 18 %: de 1,13 (rojo) a 1,59 (bola)             | —                      |
| explosión                         | decoración                | animación del sprite                                                     | trazo del color con alfa 1 → 0 (5,30 → 1,00 en el rojo) | color plano, 4 pasos   |

Todos los objetos jugables pasan de 3:1 en los tres skins, con la corrección del ladrillo `gray` en `clasico`. Los tres `bg` tienen luminancia ≤ 0,05. El peor objeto de cada skin es: `clasico` el violeta y las franjas de la pala (3,24), `neon` el violeta (5,21) y `retro` el violeta (5,45).

En `neon` el objeto es el **trazo** del ladrillo y de la pala; el relleno interior al 18 % es decoración. Aun así, el trazo contrasta con su propio relleno entre 4,42:1 (violeta) y 12,10:1 (amarillo), así que el borde del ladrillo se lee también por dentro.

### Retro bajo las scanlines

`retro` pinta una línea negra de 1 px con alfa 0,2 cada 3 px sobre todo el frame, igual que ROCAS. En las filas que tapa, el color se oscurece al 80 % y el fondo `#000000` no cambia. Contraste en el peor caso:

| Rol                        | Contraste sin scanline | Contraste bajo scanline (α 0,2) |
| -------------------------- | ---------------------- | ------------------------------- |
| `yellow`                   | 19,69                  | 12,29                           |
| `cyan` (verde azulado)     | 16,27                  | 10,24                           |
| `hotpink` (naranja)        | 11,00                  | 7,09                            |
| `gray` / `paddle` / `ball` | 9,04                   | 5,92                            |
| `green` (azul)             | 8,58                   | 5,64                            |
| `red` / `paddleAccent`     | 6,68                   | 4,48                            |
| `magenta` (violeta)        | 5,45                   | **3,75**                        |

Todos los objetos jugables siguen por encima de 3:1 bajo la scanline. Esta medición descartó dos candidatos: el marrón CGA `#aa5500` (2,87 bajo scanline) y el azul claro CGA `#5555ff` (2,94).

### Distinción entre tipos de ladrillo

Regla operativa usada en este spec: dos tipos de ladrillo se distinguen si su contraste mutuo es ≥ 1,5:1, **o** si, con contraste < 1,5:1, sus tonos se separan al menos 45° y su diferencia de color ΔE (CIE76) sigue siendo ≥ 25 con simulación de deuteranopía y de protanopía (Machado 2009, severidad 1). Así la distinción nunca depende solo del eje rojo-verde.

Pares con contraste < 1,5:1 (los únicos que hay que justificar). Formato: contraste · tonos · ΔE normal / deutan / protan.

| Par                      | clásico (sprite dominante)         | neón                              | retro                                       |
| ------------------------ | ---------------------------------- | --------------------------------- | ------------------------------------------- |
| rojo / violeta           | 1,12 · 352°/256° · 116 / 122 / 101 | 1,02 · 334°/274° · 87 / 94 / 69   | 1,23 · 0°/270° · 108 / 114 / 96             |
| rojo / azul              | (≥ 1,5)                            | (≥ 1,5)                           | 1,28 · 0°/210° · 107 / 96 / 70              |
| rojo / piedra            | 1,06 · 352°/— · 67 / 42 / 24 ⚠     | (≥ 1,5)                           | 1,35 · 0°/— · 74 / 43 / 29                  |
| amarillo / verde azulado | 1,11 · 48°/158° · 63 / 49 / 44     | 1,23 · 62°/152° · 72 / 51 / 40    | 1,21 · 60°/150° · 66 / 51 / 48              |
| amarillo / naranja       | 1,40 · 48°/26° · 48 / 14 / 16 ⚠    | (≥ 1,5)                           | (1,79)                                      |
| amarillo / azul          | 1,37 · 48°/205° · 104 / 107 / 104  | (≥ 1,5)                           | (≥ 1,5)                                     |
| amarillo / piedra        | (≥ 1,5)                            | 1,10 · 62°/233° · 108 / 99 / 104  | (≥ 1,5)                                     |
| verde azulado / naranja  | 1,26 · 158°/26° · 104 / 60 / 48    | (≥ 1,5)                           | 1,48 · 150°/40° · 99 / 56 / 43              |
| verde azulado / azul     | 1,23 · 158°/205° · 70 / 58 / 60    | 1,43 · 152°/198° · 99 / 80 / 86   | (≥ 1,5)                                     |
| verde azulado / piedra   | (≥ 1,5)                            | 1,12 · 152°/233° · 95 / 49 / 65   | (≥ 1,5)                                     |
| violeta / piedra         | 1,19 · 256°/— · 103 / 81 / 79      | (≥ 1,5)                           | (≥ 1,5)                                     |
| naranja / azul           | 1,02 · 26°/205° · 123 / 118 / 106  | 1,11 · 33°/198° · 120 / 114 / 103 | 1,28 · 40°/210° · 131 / 132 / 119           |
| naranja / piedra         | (≥ 1,5)                            | (≥ 1,5)                           | 1,22 · 40°/— · 83 / 79 / 74                 |
| azul / piedra            | (≥ 1,5)                            | (1,59)                            | 1,05 · 210°/— · 50 / 54 / 45                |
| violeta / azul           | (≥ 1,5)                            | (≥ 1,5)                           | (1,57; deutan 20, se apoya en el contraste) |

- **neón** y **retro** cumplen la regla en todos los pares. Ningún par de colores con luminancia parecida es rojo frente a verde: los pares más cercanos en luminancia (naranja/azul, rojo/violeta, amarillo/verde azulado) están separados por el eje azul-amarillo, que se conserva en protanopía y deuteranopía.
- **clásico** tiene dos pares por debajo del umbral (⚠), que vienen de la imagen y no de una constante:
  - **amarillo / naranja** (1,40; ΔE deutan 14). En los niveles 2 y 4 son filas contiguas. Los sprites tienen además textura propia (brillo `#eedd9b` frente a `#f7aa73`), pero con daltonismo rojo-verde se parecen.
  - **rojo / piedra** (con el velo, 1,06; ΔE protan 24). No coinciden en ningún nivel: la piedra solo está en la fila 0 del nivel 2, donde no hay ladrillos rojos.
  - Se mantienen para no cambiar el arte del clásico (ver _Decisiones_). Todos los ladrillos se rompen igual y valen lo mismo, así que confundir dos filas no cambia ninguna decisión del jugador.
- **Bola y pala frente a ladrillos**: se distinguen por forma, tamaño, posición y movimiento, no por color. En `retro` la bola, la pala y la piedra comparten `#aaaaaa` a propósito, para no pasar de 8 colores (ver _Decisiones_). En `neon` la bola blanca frente a la piedra `#e6e9ff` da 1,20:1 por la misma razón: la bola nunca se superpone a un ladrillo vivo, porque la colisión lo rompe en ese mismo frame.

### Valores completos de cada skin

| Campo            | clásico                   | neón        | retro                     |
| ---------------- | ------------------------- | ----------- | ------------------------- |
| `sprites`        | `true`                    | `false`     | `false`                   |
| `blockStyle`     | `"fill"` (solo reserva)   | `"outline"` | `"fill"`                  |
| `blockInset`     | 1                         | 3           | 2                         |
| `fillAlpha`      | 1                         | 0,18        | 1                         |
| `ballShape`      | `"square"` (solo reserva) | `"circle"`  | `"square"`                |
| `line.block`     | 0                         | 2           | 0                         |
| `line.paddle`    | 0                         | 2           | 0                         |
| `line.explosion` | 0                         | 2           | 0                         |
| `blur.block`     | 0                         | 8           | 0                         |
| `blur.paddle`    | 0                         | 12          | 0                         |
| `blur.ball`      | 0                         | 10          | 0                         |
| `explosion`      | `"sprite"`                | `"fade"`    | `"steps"`                 |
| `fx.glow`        | 0                         | 1           | 0                         |
| `fx.scanlines`   | `null`                    | `null`      | `{ alpha: 0.2, step: 3 }` |

`shadowColor` es siempre el color del rol que se dibuja: cada ladrillo brilla en su color, la pala en cian y la bola en blanco. El `shadowBlur` efectivo es `blur.<rol> × fx.glow`.

**Neón** usa 9 colores: el fondo, los tokens del portal `--magenta` `#ff006e`, `--yellow` `#f5ff00`, `--green` `#00ff88`, `--cyan` `#00f5ff` e `--ink` `#e6e9ff`, más tres tonos neón que no son token: violeta `#b14dff`, naranja `#ff9a1f` y azul cielo `#45c8ff`, y el blanco de la bola.

**Retro** usa 8 colores de la paleta EGA de 64 (canales 00/55/AA/FF): `#000000`, `#ff5555`, `#ffff55`, `#55ffaa`, `#aa55ff`, `#ffaa00`, `#55aaff` y `#aaaaaa`. Relleno plano, sin brillo ni degradados.

---

## Colores escritos a mano que hay que llevar a `palettes.ts`

| Archivo:línea                             | Valor actual                                                                                    | Rol en la paleta                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `lib/bloque-buster/types.ts:55-64`        | `FALLBACK_COLORS` (`#ff4d4d`, `#ffe600`, `#00f0ff`, `#ff2bd6`, `#ff69b4`, `#39ff14`, `#8a8fa3`) | `blocks` (se elimina la constante) |
| `lib/bloque-buster/types.ts:65`           | `PADDLE_COLOR = "#00f0ff"`                                                                      | `paddle` (reserva de `clasico`)    |
| `lib/bloque-buster/types.ts:66`           | `BALL_COLOR = "#ffffff"`                                                                        | `ball` (reserva de `clasico`)      |
| `lib/bloque-buster/types.ts:67`           | `BG_COLOR = "#000000"`                                                                          | `bg`                               |
| `lib/bloque-buster/engine.ts:12,16,25,29` | imports de `BALL_COLOR`, `BG_COLOR`, `FALLBACK_COLORS`, `PADDLE_COLOR`                          | se quitan                          |
| `lib/bloque-buster/engine.ts:236`         | `ctx.fillStyle = BG_COLOR`                                                                      | `pal.bg`                           |
| `lib/bloque-buster/engine.ts:242`         | `ctx.fillStyle = FALLBACK_COLORS[block.color]`                                                  | `pal.blocks[block.color]`          |
| `lib/bloque-buster/engine.ts:243`         | `fillRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2)` (hueco de 1 px)                  | `pal.blockInset`                   |
| `lib/bloque-buster/engine.ts:248`         | `drawFrame(EXPLOSION_FRAMES[…])` (sin alternativa si no hay imagen)                             | `pal.explosion`                    |
| `lib/bloque-buster/engine.ts:251`         | `ctx.fillStyle = PADDLE_COLOR`                                                                  | `pal.paddle`                       |
| `lib/bloque-buster/engine.ts:255`         | `ctx.fillStyle = BALL_COLOR`                                                                    | `pal.ball`                         |

No hay `strokeStyle`, `shadowColor`, `lineWidth`, `font` ni colores en `sprites.ts` o `levels.ts`. Cuando termine este spec, `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(" lib/bloque-buster/engine.ts lib/bloque-buster/types.ts` no debe devolver nada.

### Corrección en `clasico` (anotada)

1. **Velo sobre la piedra.** Tras dibujar el sprite de un ladrillo, si `pal.spriteTint[block.color]` existe, se pinta encima un `fillRect` del tamaño del ladrillo con ese color. Solo `gray` lo tiene: `rgba(199,208,224,0.35)`. El dominante pasa de `#323142` (1,65) a `#666979` (**3,86**), el tono medio `#646373` de 3,57 a 6,07 y el brillo `#9998ab` de 7,43 a 9,33. La textura del sprite se conserva. La animación de explosión de la piedra (que reutiliza la fila roja del sprite) no lleva velo: es decoración.
2. **Colores de reserva = colores del sprite.** Los de hoy (`FALLBACK_COLORS`) no se parecen a la imagen (el «green» de reserva es lima `#39ff14` y el sprite es azul) y tienen pares indistinguibles con daltonismo: amarillo/lima da ΔE protan **4** y rosa/gris ΔE deutan **12**. En `clasico`, `blocks` pasa a ser el color dominante de cada sprite, con la piedra ya corregida (`#666979`). Pala y bola de reserva se quedan como están (`#00f0ff` y `#ffffff`): cumplen y no se confunden con nada. Esto solo se ve si el spritesheet no carga.

### Efectos según el skin

- **Brillo** (`withGlow`): solo con `fx.glow > 0`, es decir, solo en `neon`. Se aplica al trazo de cada ladrillo, al trazo de la pala (y sus extremos) y a la bola. **Nunca** al relleno interior al 18 % ni a las explosiones.
- **Scanlines** (`drawScanlines`): solo con `fx.scanlines !== null`, es decir, solo en `retro`. Se dibujan al final de `draw()`, encima de todo.
- **Spritesheet**: solo con `sprites: true` (`clasico`). En `neon` y `retro` todo se dibuja por código. La imagen se sigue cargando en todos los skins y `ready` sigue esperando a que cargue o falle, porque el jugador puede volver a `clasico` en mitad de la partida.
- **Explosiones** (150 ms, una vez por ladrillo, siempre dentro de la celda del ladrillo roto, así que no tapan a los vecinos):
  - `sprite`: los 4 cuadros de hoy.
  - `fade`: `strokeRect` del color del ladrillo con grosor `line.explosion`, cuyo margen interior crece de `blockInset` a `h/2` y cuyo alfa baja de 1 a 0. Sin brillo.
  - `steps`: `fillRect` plano del color del ladrillo que encoge hacia el centro en 4 pasos (100 %, 75 %, 50 %, 25 %), sin alfa, sincronizado con el índice de cuadro que ya calcula `engine.ts:247`.
- **Destellos**: ninguna animación del motor parpadea. La explosión dura 150 ms, ocurre una vez y ocupa como mucho una celda de 64×24 px, lejos de la pantalla completa.

---

## Plan de implementación

1. **Paletas.** Crear `lib/bloque-buster/palettes.ts` con `BloqueBusterPalette` y `PALETTES` usando los valores exactos de las tablas. Todavía no lo importa nadie. Verificación: `npx tsc --noEmit`.
2. **Clásico desde la paleta.** En `engine.ts`, `draw()` lee `PALETTES.clasico`: `pal.bg`, `pal.blocks`, `pal.blockInset`, `pal.paddle` y `pal.ball` sustituyen a las constantes de la tabla de colores escritos a mano. Quitar `FALLBACK_COLORS`, `PADDLE_COLOR`, `BALL_COLOR` y `BG_COLOR` de `types.ts`. Añadir el velo `spriteTint` después de `drawFrame` en el bucle de ladrillos. Verificación: `npx tsc --noEmit` y `npm run lint`. En el navegador, BLOQUE BUSTER se ve igual que en `main` salvo la piedra del nivel 2, más clara (comparar capturas de Playwright del nivel 1 y del nivel 2 recién empezado). Para probar la reserva, cambiar `SPRITE_URL` a una ruta rota en local, sin commit: los ladrillos salen con los colores del sprite.
3. **Skin en el motor.** `createBloqueBusterGame(canvas, callbacks, skin?: SkinId)` guarda `let pal = PALETTES[skin ?? DEFAULT_SKIN]`. `setSkin(s)` asigna `pal = PALETTES[s] ?? PALETTES.clasico` y no hace nada más: el bucle de este motor ya llama a `draw()` en cada frame aunque esté en pausa o terminado (`engine.ts:259-265`), así que el cambio se ve al instante sin avanzar la lógica. Si el motor está destruido, `setSkin` no hace nada. `reset()`, `restart()` y `loadLevel()` **no** tocan `pal`. Verificación: `npx tsc --noEmit`. Forzar `skin = "retro"` a mano en local, sin commit: el motor sigue en clásico porque aún no hay dibujo plano, pero no falla ni se reinicia.
4. **Dibujo plano.** Separar `draw()` en `drawBlock`, `drawPaddle`, `drawBall` y `drawExplosion`, que eligen entre sprite y código según `pal.sprites`. Con `sprites: false` los ladrillos se dibujan según `blockStyle` (`fill`: `fillRect` con `blockInset`; `outline`: relleno al `fillAlpha` y `strokeRect` de `line.block`), la pala como rectángulo con los extremos `paddleAccent` de 8 px, la bola según `ballShape` (`circle`: `arc` de radio 8 centrado en la caja de 16×16) y las explosiones según `explosion`. El orden de dibujo no cambia: fondo, ladrillos, explosiones, pala y bola. Verificación: `npm run lint` y `npx tsc --noEmit`. Forzando `neon` y `retro` en local, todo se ve plano y sin sprites, y la colisión es la misma (la bola rebota en el mismo sitio que en `clasico`).
5. **Efectos.** Envolver con `withGlow(ctx, color, pal.blur.<rol> * pal.fx.glow, …)` el trazo de cada ladrillo, la pala y la bola, y llamar a `drawScanlines(ctx, W, H, pal.fx.scanlines)` al final de `draw()`. Con `clasico` ninguna de las dos funciones toca el contexto. Verificación: `npm run lint` y `npx tsc --noEmit`. En local, neón brilla y retro muestra scanlines. Medir con el panel de rendimiento un nivel 1 recién empezado en neón (60 ladrillos, el peor caso) y comprobar que no baja de 60 fps en un portátil normal.
6. **Registro.** Poner `skins: ["clasico", "neon", "retro"]` en `GAME_REGISTRY["bloque-buster"]`. A partir de aquí el selector de skins/00 aparece en `/juegos/bloque-buster/jugar`. Verificación: con Playwright, en `/juegos/bloque-buster/jugar`, cambiar entre los tres skins durante la partida, con y sin pausa. La puntuación, las vidas y el nivel del HUD no cambian, la bola sigue su trayectoria y tras recargar se recupera el último skin.
7. **Cierre.** Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores. El `grep` de colores de este spec no devuelve nada, y ROCAS, CAÍDA y SERPENTINA se ven igual que en `main`.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Con `clasico`, BLOQUE BUSTER se ve igual que antes (mismo spritesheet, fondo `#000000`, mismo hueco y mismo orden de dibujo) salvo las dos correcciones anotadas: el velo `rgba(199,208,224,0.35)` sobre la piedra y los colores de reserva alineados con el sprite.
- [ ] `lib/bloque-buster/palettes.ts` exporta `PALETTES` con las claves `clasico`, `neon` y `retro` y los valores exactos de las tablas.
- [ ] Las ratios de la tabla de paletas se cumplen: cada objeto jugable ≥ 3:1 contra el `bg` de su skin, y en `retro` también bajo la scanline (peor caso: violeta, 3,75:1).
- [ ] Los tres `bg` tienen luminancia relativa ≤ 0,05.
- [ ] En `neon` y `retro` todos los pares de tipos de ladrillo cumplen la regla de distinción de este spec (contraste ≥ 1,5:1, o tonos a ≥ 45° con ΔE ≥ 25 en deutan y protan).
- [ ] `types.ts` ya no exporta `FALLBACK_COLORS`, `PADDLE_COLOR`, `BALL_COLOR` ni `BG_COLOR`, y el `grep` de este spec sobre `engine.ts` y `types.ts` no devuelve nada.
- [ ] Solo `clasico` dibuja el spritesheet. `neon` y `retro` no llaman a `drawImage`.
- [ ] En `neon` hay `shadowBlur > 0` en ladrillos, pala y bola, y `shadowBlur === 0` en rellenos interiores y explosiones. En `clasico` y `retro`, `shadowBlur` es 0 en todo el frame.
- [ ] Solo `retro` dibuja scanlines en el canvas.
- [ ] Las explosiones no salen de la celda del ladrillo roto en ningún skin.
- [ ] Al cambiar de skin en mitad de la partida no se reinicia ni cambia la puntuación, las vidas, el nivel ni la posición de la bola, y `PAUSA`/`REANUDAR` sigue funcionando.
- [ ] Al cambiar de skin en pausa, el canvas muestra el skin nuevo sin que avance la partida.
- [ ] `JUGAR DE NUEVO` conserva el skin elegido.
- [ ] `GAME_REGISTRY["bloque-buster"].skins` es `["clasico", "neon", "retro"]` y el selector aparece en `/juegos/bloque-buster/jugar`.
- [ ] La fila que guarda `saveScore` es idéntica con cualquier skin.
- [ ] Ningún otro juego cambia.

---

## Decisiones

- **Sí:** `clasico` sigue dibujando el spritesheet tal cual. Su contraste se ha medido sobre el color dominante de cada recorte, no sobre las constantes, porque las constantes solo se ven si la imagen falla.
- **Sí:** la piedra (`gray`) de `clasico` se corrige con un velo plateado al 35 % encima del sprite (1,65 → 3,86). Es la corrección más pequeña que no exige editar la imagen; con 25 % se quedaría en 3,04, sin margen. **(decidido por skin-designer, pendiente de revisar)**
- **No:** usar el otro recorte de piedra del spritesheet (`64,288`) o el ladrillo marrón (`32,272`). El primero es aún más oscuro (`#555275` y mucho negro) y el segundo cambiaría el aspecto de la fila.
- **No:** `ctx.filter = "brightness(…)"` para aclarar la piedra. El soporte de `filter` en canvas 2D no es uniforme entre navegadores y el velo da el mismo resultado con `fillRect`.
- **Sí:** en `clasico`, los colores de reserva pasan a ser los dominantes del sprite. Hoy no se parecen a la imagen y amarillo/lima es casi idéntico con protanopía (ΔE 4). Solo se ve si la imagen no carga. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** se aceptan en `clasico` los pares amarillo/naranja (1,40; ΔE deutan 14) y rojo/piedra (1,06; ΔE protan 24) aunque no pasan la regla de distinción. Vienen del arte del spritesheet, todos los ladrillos se comportan igual y cambiarlos rompería que `clasico` no cambia. Si el usuario quiere corregirlo, la opción mínima es un velo `spriteTint.hotpink = "rgba(0,0,0,0.25)"` que oscurece el naranja y lo separa del amarillo por luminancia; habría que medirlo antes de aprobarlo. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** neón usa los tokens del portal donde caben (`--magenta`, `--yellow`, `--green`, `--cyan` para la pala, `--ink` para la piedra) y añade violeta `#b14dff`, naranja `#ff9a1f` y azul cielo `#45c8ff`, porque siete tipos de ladrillo no caben en cinco tokens sin repetir. El primer azul probado (`#3d8bff`) daba ΔE deutan 2 frente al violeta y se descartó. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** en neón cada tipo de ladrillo conserva la familia de color de su sprite (rojo → magenta, verde azulado → verde, violeta → violeta, naranja → naranja, azul → azul cielo, piedra → blanco azulado), para que cambiar de skin no reordene mentalmente las filas.
- **Sí:** neón dibuja ladrillos y pala como trazo de 2 px con relleno interior al 18 % y brillo moderado (`shadowBlur` 8 en ladrillos, 12 en la pala y 10 en la bola), igual que la escala de ROCAS (6–12 px). Se regula con `fx.glow`. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** el fondo de neón es `#05050a`, el mismo que en ROCAS.
- **Sí:** retro usa una paleta EGA de 8 colores (canales 00/55/AA/FF) y **no** el fósforo verde de ROCAS. Arkanoid era un juego de color en monitor raster, y sus conversiones a PC eran EGA. Además, siete tipos de ladrillo en monocromo exigirían siete niveles de luminancia entre 3:1 y ~17:1, separados por menos de 1,3:1 entre vecinos: no se distinguirían. **(decidido por skin-designer, pendiente de revisar)**
- **No:** CGA de 16 colores tal cual. El marrón `#aa5500` (2,87) y el azul claro `#5555ff` (2,94) no llegan a 3:1 bajo la scanline. **No:** PICO-8. Su verde `#00e436` frente al naranja `#ffa300` da ΔE deutan 18 con contraste 1,16.
- **Sí:** en retro la pala, la bola y la piedra comparten `#aaaaaa` para no pasar de 8 colores. Se distinguen por forma y posición, y la pala lleva extremos rojos `#ff5555` como el Vaus original. Si el usuario prefiere un noveno color, la opción es bola y pala en `#ffffff` (21:1, y 13,08:1 bajo scanline). **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** el fondo de retro es `#000000`, el negro EGA. No se usa el `#031407` verdoso de ROCAS porque esta paleta no es de fósforo.
- **Sí:** las scanlines de retro son las mismas que en ROCAS (α 0,2 cada 3 px). La paleta se eligió para que el peor color siga por encima de 3:1 bajo la scanline (violeta, 3,75:1). **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** la bola de neón se dibuja redonda (como el sprite del clásico) y la de retro cuadrada (píxel). Solo cambia el dibujo; la colisión sigue siendo la caja AABB de 16×16.
- **No:** cambiar tamaños, cajas de colisión, velocidades o puntos según el skin. Un skin nunca cambia las reglas.
- **No:** renombrar `BlockColor` para que coincida con la imagen. Es un cambio de motor sin efecto visible; si se quiere, va en otro spec.
- **No:** dejar de cargar el spritesheet en `neon` o `retro`. El jugador puede volver a `clasico` en mitad de la partida y la imagen debe estar lista.

---

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadowBlur` en 60 ladrillos baja los fps en neón                          | Brillo solo en los trazos, nunca en rellenos ni explosiones, y prueba de rendimiento en el paso 5. Si baja de 60 fps, primero se baja `blur.block` a 4; si no basta, se dibujan los ladrillos en un canvas auxiliar que solo se redibuja al romper un ladrillo, cargar nivel o cambiar de skin. |
| `shadowBlur` se queda activo en el contexto                                | Todo dibujo con brillo pasa por `withGlow`, que incluye `save()`/`restore()`.                                                                                                                                                                                                                   |
| Regresión visual en `clasico` al mover las constantes                      | El paso 2 compara capturas con `main` antes de añadir ningún skin. La única diferencia esperada es la piedra.                                                                                                                                                                                   |
| El velo de la piedra se ve «lavado» frente al resto de ladrillos           | Es el mínimo que da margen sobre 3:1. Si no gusta, se puede bajar a 0,30 (3,43:1) sin cambiar nada más.                                                                                                                                                                                         |
| El violeta de retro (3,75:1 bajo scanline) se lee peor que el resto        | Cumple con margen. Si molesta, se puede bajar la scanline a α 0,12 sin tocar la paleta.                                                                                                                                                                                                         |
| Un cambio de skin justo durante una explosión deja un cuadro mezclado      | Las explosiones leen `pal.explosion` en cada frame; como mucho se ve un cuadro de 150 ms con el estilo nuevo.                                                                                                                                                                                   |
| La bola redonda de neón parece que «atraviesa» las esquinas de un ladrillo | La colisión sigue siendo de caja; el círculo inscrito deja como mucho 3,3 px de diferencia en las esquinas de la caja. Si se nota en pruebas, se usa `ballShape: "square"` también en neón.                                                                                                                 |

---

## Qué **no** está en este spec

- El sistema de skins compartido (tipos, contrato, selector y persistencia): eso es `skins/00-sistema-skins`.
- Skins de ROCAS, CAÍDA y SERPENTINA.
- Power-ups, láser, ladrillos duros o indestructibles, enemigos o cualquier cambio de jugabilidad en BLOQUE BUSTER.
- Un spritesheet nuevo o editado para cualquier skin.
- Un HUD de puntuación dibujado en el canvas.
