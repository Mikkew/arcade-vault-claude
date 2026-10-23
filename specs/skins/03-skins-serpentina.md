# SKINS · SPEC 03 — Skins de SERPENTINA (clásico, neón y retro)

> **Estado:** Approved
> **Depende de:** SPEC 09, skins/00-sistema-skins
> **Fecha:** 2026-10-22
> **Objetivo:** Que SERPENTINA ofrezca los skins `clasico`, `neon` y `retro`, todos con contraste medido sobre fondo oscuro, moviendo sus colores a `lib/serpentina/palettes.ts` y recoloreando el sprite de frutas en el propio canvas.

---

## Por qué existe este spec

Auditoría de SERPENTINA (`lib/serpentina/`) a fecha de este spec:

| Juego      | `clasico`                       | `neon`  | `retro` |
| ---------- | ------------------------------- | ------- | ------- |
| serpentina | `contraste` (y `colores fijos`) | `falta` | `falta` |

`clasico` **no cumple del todo** el criterio de modo oscuro:

1. **Cabeza y cuerpo indistinguibles por color.** La cabeza `#b6ff9e` y el cuerpo `#39ff14` dan **1,15:1** entre sí, con matices de 105° y 111°: la misma luminancia y el mismo tono. Hoy solo se distinguen por los ojos y por un inset de 2 px frente a 4 px.
2. **Una fruta por debajo de 3:1.** El recorte 3 de `FRUIT_FRAMES` (en la imagen son unas **uvas** moradas, `#8b20a0`) tiene una mediana de **2,70:1** sobre `#05070d`, y solo el 39,7 % de sus píxeles opacos llega a 3:1 (mínimo 2,32:1). El recorte 6 (berenjena, `#9823af`) queda justo en el límite, con 3,06:1.

Además, los 6 colores viven como constantes en `types.ts`, pero el color de los ojos (`"#05070d"`), el `shadowBlur`, el radio de los segmentos y el grosor de la rejilla están escritos a mano en `engine.ts`, así que un skin no puede cambiarlos (`colores fijos`). `neon` y `retro` no existen porque todavía no hay sistema de skins.

Lo que **no** tiene SERPENTINA, y por eso no aparece en las paletas: obstáculos (fuera de alcance según SPEC 09), texto o HUD dibujado en el canvas (puntuación y nivel los pinta la plataforma en el DOM, igual que «EN PAUSA»), fuentes, partículas y parpadeos. `audio.ts` no tiene colores.

Observación al margen: los comentarios de `lib/serpentina/sprites.ts` no coinciden con la imagen (el recorte 0, comentado como «banana», es una fruta rojo anaranjada; el 3, comentado como «ajo», son las uvas). En este spec las frutas se citan por **índice** y por lo que se ve en la imagen. Corregir esos comentarios no es parte de este spec.

---

## Alcance

**Dentro:**

- `lib/serpentina/palettes.ts` con el tipo `SerpentinaPalette` y `PALETTES: Record<SkinId, SerpentinaPalette>`.
- Quitar de `lib/serpentina/types.ts` las 6 constantes de color y de `lib/serpentina/engine.ts` todos los colores, desenfoques, grosores y radios escritos a mano (lista completa más abajo).
- Recoloreado del sprite de frutas en el cliente: `lib/serpentina/sprites.ts` gana `buildFruitStrip(img, pal)`, que genera una tira recoloreada en un canvas fuera de pantalla, con caché por variante.
- Corrección de contraste en `clasico`: cabeza `#ffffff` y aclarado de los píxeles de fruta por debajo de 3,35:1.
- `createSerpentinaGame(canvas, callbacks, skin?)` y un `setSkin` real, que sustituye al método vacío de skins/00.
- Brillo con `withGlow` (en `clasico`, para conservar el brillo actual de la serpiente, y en `neon`) y scanlines solo en `retro`, con `lib/engine/skin-fx.ts`.
- `GAME_REGISTRY.serpentina.skins = ["clasico", "neon", "retro"]`.

**Fuera de alcance (para otros specs):**

- Skins de CAÍDA y BLOQUE BUSTER (`skins/02-skins-bloque-buster` se escribe aparte). ROCAS ya tiene `skins/01-skins-rocas`.
- Cambios en las reglas, la velocidad, los puntos, el nivel, la cola de giros o el audio.
- Obstáculos, frutas especiales o power-ups.
- Hojas de sprites nuevas en `public/` o retocar `fruits.png`.
- Corregir los comentarios de nombres de `sprites.ts`.
- Cualquier cambio en el selector o en la persistencia: eso es de skins/00.

---

## Modelo de datos

**No hay datos nuevos en la base**, ni migraciones, y `saveScore` no cambia. El único estado nuevo vive en memoria dentro del motor:

```ts
// lib/serpentina/palettes.ts
import type { SkinId } from "@/lib/engine/skins";
import type { SkinFx } from "@/lib/engine/skin-fx";
export interface SerpentinaPalette {
  bg: string; // fondo del canvas (luminancia ≤ 0,05)
  grid: string; // líneas de la cuadrícula (decoración)
  gridLine: number; // px
  body: string; // segmentos del cuerpo: relleno ("fill") o trazo ("outline")
  head: string; // relleno de la cabeza (siempre sólido)
  dead: string; // toda la serpiente tras el game over
  eyes: string; // ojos sobre la cabeza
  bodyStyle: "fill" | "outline";
  bodyFillAlpha: number; // relleno translúcido del cuerpo con "outline"; 1 con "fill"
  line: { body: number }; // trazo del cuerpo con "outline"; 0 con "fill"
  radius: number; // radio de roundRect de los segmentos
  eyeShape: "round" | "square";
  eyeSize: number; // radio (round) o media arista (square), px
  fruit:
    | { mode: "lift"; minContrast: number } // colores originales; aclara los píxeles por debajo de minContrast
    | {
        mode: "phosphor";
        shade: string;
        base: string;
        light: string;
      }; // 3 tonos de fósforo según luminancia
  fruitFallback: string; // círculo mientras no ha cargado fruits.png
  fruitGlow: string; // shadowColor de la fruta
  blur: { snake: number; fruit: number }; // px de shadowBlur antes de aplicar fx.glow
  fx: SkinFx; // glow y scanlines (skins/00)
}
export const PALETTES: Record<SkinId, SerpentinaPalette>;
```

```ts
// lib/serpentina/sprites.ts (añadidos)
export const STRIP_Y = 136; // fila de FRUIT_FRAMES en fruits.png
export const STRIP_H = 160;
export function buildFruitStrip(
  img: HTMLImageElement,
  fruit: SerpentinaPalette["fruit"],
  bg: string,
): HTMLCanvasElement; // tira de 3790×160 recoloreada; los recortes se leen con sy - STRIP_Y
```

```ts
// engine.ts
let pal = PALETTES[skin ?? DEFAULT_SKIN];
const strips = new Map<string, HTMLCanvasElement>(); // clave: "lift" | "phosphor"
```

---

## Paletas

Los contrastes se han calculado con la fórmula de luminancia relativa de WCAG 2.x (`node -e`). Cada color se mide contra el `bg` de **su** skin. Los colores con alfa se combinan antes sobre ese `bg`. Los sprites se han medido píxel a píxel con `sharp` (ya instalado como dependencia de Next) sobre los 21 recortes de `FRUIT_FRAMES`, contando solo los píxeles con alfa ≥ 128. Para objetos jugables, «≥ 3» significa que cumple WCAG 1.4.11. SERPENTINA no dibuja texto en el canvas, así que no hay ningún rol con mínimo de 4,5.

### Tabla de roles

| Rol                | Tipo                 | clásico                                            | neón                                                       | retro                                                                   |
| ------------------ | -------------------- | -------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `bg`               | fondo                | `#05070d` (L = 0,0021)                             | `#05050a` (L = 0,0016)                                     | `#031407` (L = 0,0054)                                                  |
| `grid`             | decoración           | `rgba(57, 255, 20, 0.06)` → `#08160d` — 1,08       | `rgba(0, 245, 255, 0.07)` → `#05161b` — 1,10               | `rgba(95, 211, 111, 0.1)` → `#0c2711` — 1,19                            |
| `body`             | objeto               | `#39ff14` — **14,85**                              | trazo `#00f5ff` — **15,02**                                | `#2a9a3e` — **5,23**                                                    |
| relleno del cuerpo | objeto (interior)    | = `body`                                           | `#00f5ff` α 0,22 → `#043a40` — 1,63 (el borde es el trazo) | = `body`                                                                |
| `head`             | objeto               | **`#ffffff`** — **20,14** (antes `#b6ff9e`, 17,06) | `#ffffff` — **20,34**                                      | `#c4ffc4` — **16,67**                                                   |
| `dead`             | objeto (fin)         | `#ff2b4d` — **5,47**                               | `#ff006e` — **5,30** (relleno α 0,22 → 1,19)               | `#5fd36f` — **9,97**                                                    |
| `eyes`             | detalle de la cabeza | `#05070d` — 20,14 contra la cabeza                 | `#05050a` — 20,34 contra la cabeza                         | `#031407` — 16,67 contra la cabeza                                      |
| fruta (sprite)     | objeto               | original + aclarado; peor píxel **3,35**           | original + aclarado; peor píxel **3,38**                   | 3 tonos: `#2a9a3e` **5,23** · `#8fe89a` **12,81** · `#c4ffc4` **16,67** |
| `fruitFallback`    | objeto (provisional) | `#ff2bd6` — **6,30**                               | `#ffcf3a` — **13,79**                                      | `#8fe89a` — **12,81**                                                   |
| `fruitGlow`        | efecto               | — (sin brillo)                                     | `#ffcf3a`                                                  | — (sin brillo)                                                          |

Todos los objetos jugables pasan de 3:1 en los tres skins y los tres `bg` tienen luminancia ≤ 0,05. La rejilla es decoración, se dibuja antes que todo lo demás y nunca tapa un objeto.

### Las frutas en detalle

Contraste de los píxeles opacos de cada recorte sobre el `bg` de clásico (`#05070d`), **antes** de corregir:

| Recortes                 | Mediana      | Peor píxel | Píxeles ≥ 3:1 |
| ------------------------ | ------------ | ---------- | ------------- |
| **3** (uvas, `#8b20a0`)  | **2,70**     | **2,32**   | **39,7 %**    |
| 6 (berenjena, `#9823af`) | 3,06         | 3,06       | 100 %         |
| 11 (pimiento verde)      | 5,33         | 3,27       | 100 %         |
| 20 (cuenco azul)         | 6,85         | 3,04       | 100 %         |
| resto (17 recortes)      | 4,65 – 15,46 | ≥ 3,45     | 100 %         |

**Corrección (`fruit.mode = "lift"`, `minContrast = 3.35`).** Al cargar la imagen, cada píxel opaco con contraste < 3,35:1 sobre `bg` se escala en espacio lineal, conservando el matiz, hasta llegar a 3,35:1. Si un canal se satura, se mezcla poco a poco hacia blanco y se vuelve a escalar. El margen sobre 3 cubre el redondeo a 8 bits. Resultado medido:

| Recorte      | Píxeles aclarados | Ejemplo                      | Peor píxel después (clásico / neón) |
| ------------ | ----------------- | ---------------------------- | ----------------------------------- |
| 3 (uvas)     | 96,6 %            | `#8b20a0` → `#9f26b7` (290°) | 3,35 / 3,38                         |
| 6            | 76,2 %            | `#9823af` → `#a025b8` (290°) | 3,35 / 3,38                         |
| 11           | 16,8 %            | verdes oscuros de sombra     | 3,36 / 3,39                         |
| 20           | 4,6 %             | sombras del cuenco           | 3,35 / 3,39                         |
| los otros 17 | 0 %               | sin cambios                  | ≥ 3,45 / ≥ 3,48                     |

Neón usa la misma tira aclarada (los 21 recortes ya pasan de 3:1 sobre `#05050a`), con brillo dorado.

**Retro (`fruit.mode = "phosphor"`).** Cada recorte se reduce a tres tonos de fósforo según la luminancia de cada píxel frente a la del color dominante del recorte (el más repetido): menos de 0,85 × L dominante → `shade` (`#2a9a3e`); más de 1,15 × → `light` (`#c4ffc4`); el resto → `base` (`#8fe89a`). El alfa se umbraliza a 0 o 255 (corte en 128) para que el borde quede en píxel duro. Medido sobre los 21 recortes: todos conservan al menos 2 tonos con más del 3 % de sus píxeles, así que ninguna fruta se queda en silueta plana.

### Retro bajo las scanlines

`retro` pinta una línea negra de 1 px con alfa 0,2 cada 3 px sobre todo el frame, igual que ROCAS. Contraste en el peor caso, sobre esas filas:

| Rol                            | Sin scanline | Bajo scanline (α 0,2) |
| ------------------------------ | ------------ | --------------------- |
| `head` / fruta `light`         | 16,67        | 10,71                 |
| fruta `base` / `fruitFallback` | 12,81        | 8,36                  |
| `dead`                         | 9,97         | 6,60                  |
| `body` / fruta `shade`         | 5,23         | **3,66**              |
| `grid`                         | 1,19         | 1,13 (decoración)     |

Incluso en el peor caso, todos los objetos jugables siguen por encima de 3:1.

### Distinción entre elementos

Contraste entre pares que el jugador tiene que distinguir, con el matiz HSL («—» = acromático):

| Par                  | clásico (corregido)                           | neón                                                   | retro                                     |
| -------------------- | --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| cabeza / cuerpo      | **1,36** (— / 111°); antes 1,15 (105° / 111°) | 1,35 con el trazo, **12,47** con el relleno (— / 182°) | **3,19** (mismo tono)                     |
| ojos / cabeza        | 20,14                                         | 20,34                                                  | 16,67                                     |
| fruta verde / cuerpo | 1,65 – 2,79 (frutas 11, 13, 14)               | 1,65 – 2,79 contra el trazo cian                       | `base` 2,45 · `light` 3,19 · `shade` 1,00 |
| cuerpo vivo / muerto | 2,71 (111° / 350°)                            | 2,83 (182° / 334°)                                     | 1,91 (mismo tono)                         |

- **Cabeza y cuerpo.** Es el par que más importa: dice hacia dónde vas. En **retro** se separan por luminancia (3,19:1). En **neón** la cabeza es un bloque blanco sólido y el cuerpo es un contorno cian de 2 px con relleno translúcido, así que la diferencia de área iluminada es enorme (12,47:1 entre los rellenos). En **clásico** la luminancia tiene techo: el cuerpo `#39ff14` ya está en L = 0,72, y ni el blanco puro pasa de 1,36:1. La corrección mínima es cabeza blanca (acromática frente a un verde saturado, que se distingue por saturación y no por matiz), junto con los ojos (20:1) y el inset mayor, que ya existían. Ver _Decisiones_ para la alternativa que oscurece el cuerpo.
- **Fruta y serpiente.** Algunas frutas son verdes (recortes 11, 13 y 14) y quedan cerca del cuerpo en luminancia. Se distinguen por forma: la fruta es una silueta de pixel art aislada en una celda y la serpiente es una cadena de bloques redondeados unidos a una cabeza con ojos. En neón, además, la fruta brilla en oro y la serpiente en cian (eje azul-amarillo, que se conserva en protanopia y deuteranopia). En retro, la fruta es bicolor o tricolor y el cuerpo es plano.
- **Vivo y muerto.** No conviven en pantalla: al morir, toda la serpiente cambia a `dead` y aparece el modal. En clásico y neón el cambio también es de luminancia (2,71 y 2,83), no solo rojo frente a verde. En retro la serpiente pasa a un tono uniforme `#5fd36f`: el cuerpo se aclara y la cabeza pierde su brillo.

### Valores completos de cada skin

| Campo           | clásico                               | neón                                  | retro                                                                       |
| --------------- | ------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `gridLine`      | 1                                     | 1                                     | 1                                                                           |
| `bodyStyle`     | `"fill"`                              | `"outline"`                           | `"fill"`                                                                    |
| `bodyFillAlpha` | 1                                     | 0,22                                  | 1                                                                           |
| `line.body`     | 0                                     | 2                                     | 0                                                                           |
| `radius`        | 6                                     | 6                                     | 0                                                                           |
| `eyeShape`      | `"round"`                             | `"round"`                             | `"square"`                                                                  |
| `eyeSize`       | 3,5                                   | 3,5                                   | 3 (cuadrado de 6 px)                                                        |
| `fruit`         | `{ mode: "lift", minContrast: 3.35 }` | `{ mode: "lift", minContrast: 3.35 }` | `{ mode: "phosphor", shade: "#2a9a3e", base: "#8fe89a", light: "#c4ffc4" }` |
| `blur.snake`    | 10                                    | 12                                    | 0                                                                           |
| `blur.fruit`    | 0                                     | 10                                    | 0                                                                           |
| `fx.glow`       | 1                                     | 1                                     | 0                                                                           |
| `fx.scanlines`  | `null`                                | `null`                                | `{ alpha: 0.2, step: 3 }`                                                   |

El `shadowColor` de la serpiente es `body` (o `dead` tras el game over) para todos los segmentos, cabeza incluida, igual que hoy. El de la fruta es `fruitGlow`. El `shadowBlur` efectivo es `blur.<rol> × fx.glow`.

Retro usa 6 colores, todos de la familia de fósforo verde de ROCAS retro: `#031407`, `#0c2711` (rejilla), `#2a9a3e`, `#5fd36f`, `#8fe89a` y `#c4ffc4`. Sin brillo ni degradados.

---

## Colores escritos a mano que hay que llevar a `palettes.ts`

| Archivo:línea                            | Valor actual                                                                     | Rol en la paleta                        |
| ---------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------- |
| `lib/serpentina/types.ts:31`             | `BG_COLOR = "#05070d"`                                                           | `bg` (se borra la constante)            |
| `lib/serpentina/types.ts:32`             | `GRID_COLOR = "rgba(57, 255, 20, 0.06)"`                                         | `grid`                                  |
| `lib/serpentina/types.ts:33`             | `SNAKE_COLOR = "#39ff14"`                                                        | `body`                                  |
| `lib/serpentina/types.ts:34`             | `SNAKE_HEAD_COLOR = "#b6ff9e"`                                                   | `head` (corregido a `#ffffff`)          |
| `lib/serpentina/types.ts:35`             | `SNAKE_DEAD_COLOR = "#ff2b4d"`                                                   | `dead`                                  |
| `lib/serpentina/types.ts:36`             | `FALLBACK_FRUIT_COLOR = "#ff2bd6"`                                               | `fruitFallback`                         |
| `lib/serpentina/engine.ts:8,11,15,22–24` | imports de las 6 constantes                                                      | se sustituyen por `PALETTES`            |
| `lib/serpentina/engine.ts:182`           | `ctx.fillStyle = FALLBACK_FRUIT_COLOR`                                           | `fruitFallback`                         |
| `lib/serpentina/engine.ts:194`           | `ctx.drawImage(sheet, f.sx, f.sy, …)` (imagen original)                          | tira recoloreada, `sy = f.sy - STRIP_Y` |
| `lib/serpentina/engine.ts:213`           | `ctx.fillStyle = "#05070d"` (ojos, **literal**)                                  | `eyes`                                  |
| `lib/serpentina/engine.ts:216–222`       | `ctx.arc(…, 3.5, …)` (ojos redondos de radio 3,5)                                | `eyeShape`, `eyeSize`                   |
| `lib/serpentina/engine.ts:227`           | `ctx.fillStyle = BG_COLOR`                                                       | `bg`                                    |
| `lib/serpentina/engine.ts:229`           | `ctx.strokeStyle = GRID_COLOR`                                                   | `grid`                                  |
| `lib/serpentina/engine.ts:230`           | `ctx.lineWidth = 1` (rejilla)                                                    | `gridLine`                              |
| `lib/serpentina/engine.ts:242`           | `ctx.shadowColor = over ? SNAKE_DEAD_COLOR : SNAKE_COLOR`                        | `withGlow(ctx, over ? dead : body, …)`  |
| `lib/serpentina/engine.ts:243`           | `ctx.shadowBlur = 10`                                                            | `blur.snake × fx.glow`                  |
| `lib/serpentina/engine.ts:247–251`       | `fillStyle = over ? SNAKE_DEAD_COLOR : i === 0 ? SNAKE_HEAD_COLOR : SNAKE_COLOR` | `dead` / `head` / `body`                |
| `lib/serpentina/engine.ts:258`           | radio `6` de `roundRect`                                                         | `radius`                                |
| `lib/serpentina/engine.ts:262`           | `ctx.shadowBlur = 0`                                                             | desaparece (lo hace `withGlow`)         |

Se quedan en el motor porque son geometría y no estilo: la celda (`CELL`), el inset 2/4 de cabeza y cuerpo (`engine.ts:246`), el desplazamiento de 7 px de los ojos (`engine.ts:217–218`), `FRUIT_PADDING` e `imageSmoothingEnabled = false` (`engine.ts:193`). SERPENTINA no usa fuentes ni dibuja texto en el canvas.

Cuando termine este spec, `grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(|shadowBlur|shadowColor" lib/serpentina/engine.ts lib/serpentina/types.ts` no debe devolver nada.

### Cómo se aplica cada skin al sprite de frutas

| Opción                                                  | Veredicto       | Motivo                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hojas alternativas en `public/` (`fruits-retro.png`, …) | No              | Hay que generarlas con una herramienta fuera del repo y mantenerlas sincronizadas con `FRUIT_FRAMES`; cada skin añade otra descarga de ~580 KB.                                                                                                                                                                |
| Tintado con `globalCompositeOperation = "source-in"`    | No              | Deja la fruta como silueta de un solo color: se pierden las hojas y los rabitos, que son lo que hace reconocible a la cereza o a la zanahoria.                                                                                                                                                                 |
| `ctx.filter` (`brightness`, `sepia`, `hue-rotate`)      | No              | Se aplica en cada frame, su soporte en Safari es reciente y no permite reducir a una paleta exacta de 3 tonos ni aclarar solo los píxeles oscuros.                                                                                                                                                             |
| **Recoloreado una vez en un canvas fuera de pantalla**  | **Recomendada** | Se hace con `getImageData` al cargar la imagen (mismo origen, sin problemas de canvas contaminado), solo sobre la fila de 3790×160 que usa `FRUIT_FRAMES` (~2,4 MB por variante), y se cachea. Cada frame sigue siendo un `drawImage`. Permite tanto el aclarado de clásico como los 3 tonos exactos de retro. |

Solo hay dos variantes de tira: `lift` (clásico y neón la comparten) y `phosphor` (retro). La de `lift` se construye en `img.onload`. La de `phosphor`, la primera vez que se necesita.

### Efectos según el skin

- **Brillo de la serpiente** (`withGlow`): en `clasico` (10 px, el mismo que hoy) y en `neon` (12 px). En clásico se sigue rellenando segmento a segmento, de la cola a la cabeza, dentro de un único `withGlow`, para que salga igual píxel a píxel que hoy. En neón el cuerpo se dibuja como **un solo path** con todos los `roundRect`, con un `fill` con `globalAlpha = bodyFillAlpha` y un `stroke` de `line.body` px, y después la cabeza. Así hay dos pasadas de sombra por frame en lugar de dos por segmento, aunque la serpiente llegue a 300 celdas.
- **Brillo de la fruta**: solo en `neon` (10 px dorados). En clásico no hay, igual que hoy.
- **Ojos**: siempre después de cerrar `withGlow`, sin sombra.
- **Scanlines** (`drawScanlines`): solo en `retro`, al final de `draw()`, encima de todo.
- **Parpadeos**: SERPENTINA no tiene ninguno y este spec no añade ninguno. El cambio de skin es un único cambio de colores, no un destello repetido.

---

## Plan de implementación

1. **Paletas.** Crear `lib/serpentina/palettes.ts` con `SerpentinaPalette` y `PALETTES` usando los valores exactos de las tablas. Todavía no lo importa nadie. Verificación: `npx tsc --noEmit`.
2. **Motor con paleta, sin correcciones.** En `engine.ts`, `draw()`, `drawFruit()` y `drawEyes()` leen de una variable `pal` que de momento vale una copia de `PALETTES.clasico` con `head: "#b6ff9e"` y sin aclarado de frutas (dibuja la imagen original). Se sustituye cada línea de la tabla de colores escritos a mano por su rol y el brillo pasa por `withGlow`. Se borran las 6 constantes de color de `types.ts`. Verificación: `npx tsc --noEmit`, `npm run lint`, y SERPENTINA se ve igual que en `main` (capturas de Playwright del inicio, de una serpiente larga y del game over).
3. **Correcciones de clásico.** Añadir `STRIP_Y`, `STRIP_H` y `buildFruitStrip` a `sprites.ts` con el modo `lift`. En `img.onload` el motor construye la tira `lift` y la guarda en `strips`; `drawFruit` lee de la tira con `sy = f.sy - STRIP_Y`. `pal` pasa a ser `PALETTES.clasico` tal cual, con la cabeza `#ffffff`. Verificación: `npx tsc --noEmit`. En local, forzar `fruitFrame = 3` (sin commit): las uvas se ven algo más claras y con el mismo matiz; el resto de frutas, salvo 6, 11 y 20, no cambia (comparar con `main`).
4. **Skin en el motor.** `createSerpentinaGame(canvas, callbacks, skin?: SkinId)` guarda `let pal = PALETTES[skin ?? DEFAULT_SKIN]`. `setSkin(s)` asigna `pal = PALETTES[s] ?? PALETTES.clasico` y, si la imagen ya cargó y falta la tira de su `fruit.mode`, la construye. No hace falta redibujar a mano: el bucle de `requestAnimationFrame` de SERPENTINA sigue llamando a `draw()` en pausa y tras el game over. `restart()` y `reset()` **no** tocan `pal` ni `strips`, y `destroy()` vacía `strips`. Verificación: `npx tsc --noEmit`. Forzar `skin = "neon"` a mano en local, sin commit: los colores cambian y la partida no se reinicia.
5. **Neón y retro.** Implementar el modo `outline` del cuerpo (un solo path), la forma `square` de los ojos, el modo `phosphor` de `buildFruitStrip` (3 tonos y alfa umbralizado), el brillo de la fruta y `drawScanlines(ctx, W, H, pal.fx.scanlines)` al final de `draw()`. Verificación: `npm run lint` y `npx tsc --noEmit`. En local, neón muestra cuerpo en contorno cian y fruta con halo dorado, y retro muestra bloques cuadrados, frutas en 3 tonos verdes y scanlines. Con una serpiente de 100 segmentos o más en neón, el panel de rendimiento no baja de 60 fps.
6. **Registro.** Poner `skins: ["clasico", "neon", "retro"]` en `GAME_REGISTRY.serpentina`. A partir de aquí el selector de skins/00 aparece en `/juegos/serpentina/jugar`. Verificación: con Playwright, cambiar entre los tres skins durante la partida, con y sin pausa. Puntuación y nivel no cambian, la serpiente sigue en la misma celda, y tras recargar se recupera el último skin.
7. **Cierre.** Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores. El `grep` de colores de este spec no devuelve nada, y ROCAS, CAÍDA y BLOQUE BUSTER se ven igual que en `main`.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Con `clasico`, SERPENTINA se ve igual que antes salvo las dos correcciones anotadas: la cabeza pasa de `#b6ff9e` a `#ffffff`, y los píxeles de fruta por debajo de 3,35:1 (recortes 3, 6, 11 y 20) se aclaran sin cambiar de matiz. Fondo `#05070d`, rejilla `rgba(57, 255, 20, 0.06)`, cuerpo `#39ff14`, muerte `#ff2b4d`, brillo de 10 px y radio 6 no cambian.
- [ ] `lib/serpentina/palettes.ts` exporta `PALETTES` con las claves `clasico`, `neon` y `retro` y los valores exactos de la tabla de paletas.
- [ ] Las ratios de la tabla de paletas se cumplen: cada objeto jugable ≥ 3:1 contra el `bg` de su skin, también cada píxel opaco de fruta en las tiras `lift` y `phosphor`, y en `retro` también bajo la scanline.
- [ ] Los tres `bg` tienen luminancia relativa ≤ 0,05.
- [ ] `engine.ts` y `types.ts` no contienen literales de color ni `shadowBlur`/`shadowColor` sueltos (comprobable con el `grep` de este spec).
- [ ] En `neon` el cuerpo es un contorno de 2 px con relleno translúcido, la cabeza es sólida y la fruta tiene brillo dorado. En `retro` no hay `shadowBlur` en todo el frame, los segmentos son cuadrados y la fruta solo usa `#2a9a3e`, `#8fe89a` y `#c4ffc4`.
- [ ] Solo `retro` dibuja scanlines en el canvas.
- [ ] Al cambiar de skin en mitad de la partida no se reinicia ni cambia la puntuación, y `PAUSA`/`REANUDAR` sigue funcionando.
- [ ] Al cambiar de skin en pausa, el canvas muestra el skin nuevo sin que la serpiente avance.
- [ ] Al cambiar de skin antes de que cargue `fruits.png`, la fruta provisional usa el `fruitFallback` del skin y no hay errores en la consola.
- [ ] `JUGAR DE NUEVO` conserva el skin elegido.
- [ ] `GAME_REGISTRY.serpentina.skins` es `["clasico", "neon", "retro"]` y el selector aparece en `/juegos/serpentina/jugar`.
- [ ] La fila que guarda `saveScore` es idéntica con cualquier skin.
- [ ] Ningún otro juego cambia.

---

## Decisiones

- **Sí:** corregir la cabeza de `clasico` a `#ffffff`. Con `#b6ff9e` la cabeza y el cuerpo dan 1,15:1 con el mismo matiz, lo que incumple el criterio de distinción; en blanco quedan en 1,36:1, acromático frente a verde saturado, y siguen apoyados por los ojos y el inset. Es el cambio más pequeño que se nota. **(decidido por skin-designer, pendiente de revisar)**
- **No:** oscurecer el cuerpo de `clasico`. Es la alternativa más fuerte: cuerpo `#2fd911` (10,60:1 sobre el fondo) con cabeza `#ffffff` da 1,90:1, y con la cabeza original `#b6ff9e` da 1,61:1. Se descarta porque cambia el color de toda la serpiente, que es lo más visible del juego, y `clasico` debe parecerse a lo de hoy. Si el usuario lo prefiere, solo cambian dos valores de la paleta. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** aclarar en `clasico` solo los píxeles de fruta por debajo de 3,35:1, conservando el matiz, en lugar de quitar las uvas de `FRUIT_FRAMES` o de añadir un contorno a todas las frutas. Las uvas son la única fruta que incumple (2,70:1); el aclarado toca 4 de 21 recortes y deja intactos los otros 17. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** recolorear el sprite en el cliente con un canvas fuera de pantalla, una vez por variante. Es la única opción que permite a la vez el aclarado selectivo y la paleta exacta de retro sin añadir archivos a `public/`.
- **Sí:** `clasico` conserva el brillo de 10 px de la serpiente con `fx.glow = 1`, aunque el comentario de `SkinFx` en skins/00 da como ejemplo «0 = sin brillo (clásico y retro)». En ROCAS clásico no había brillo; en SERPENTINA sí lo hay hoy, y quitarlo rompería la regla de que `clasico` no cambia. El brillo pasa por `withGlow` igualmente.
- **Sí:** en neón el cuerpo es un contorno cian de 2 px con relleno al 22 % y la cabeza es un bloque blanco sólido. Así neón cumple «trazos finos» y la cabeza destaca por área iluminada (12,47:1 entre rellenos), algo que con dos colores neón sólidos no se consigue: verde `--green` y cian `--cyan` tienen la misma luminancia (0,73) y el oro `--gold` frente al verde se confunde en deuteranopia. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** neón usa `--cyan` para la serpiente, `--magenta` para la muerte y `--gold` para el brillo y la fruta provisional, igual que el reparto de ROCAS neón (cian = lo tuyo, magenta = peligro, oro = premio). Cian frente a las frutas, casi todas cálidas o verdes, evita confundir la serpiente con la comida. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** intensidad del brillo en neón de 12 px para la serpiente y 10 px para la fruta, regulable con `fx.glow`. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** retro es fósforo verde monocromo con los mismos tonos que ROCAS retro, para que el skin se reconozca entre juegos. La serpiente usa un cuerpo oscuro (`#2a9a3e`) y una cabeza brillante (`#c4ffc4`), 3,19:1 entre ellos, como el punto de luz de un monitor de fósforo. **(decidido por skin-designer, pendiente de revisar)**
- **No:** ámbar o una paleta de 8 bits tipo Game Boy. Con la de Game Boy sobre fondo oscuro solo quedan dos tonos por encima de 3:1, y la cabeza y el cuerpo saldrían a 1,2:1. El ámbar funcionaría con los mismos niveles de luminancia, pero rompería la coherencia con ROCAS retro.
- **Sí:** en retro, la serpiente muerta pasa a un tono uniforme `#5fd36f`. Sin rojo disponible en monocromo, «apagar» la cabeza y aclarar el cuerpo es un cambio visible que no depende del color.
- **Sí:** en retro los segmentos son cuadrados (`radius = 0`) y los ojos son cuadrados de 6 px. Solo cambia el dibujo; la colisión es por celdas y no depende del radio.
- **Sí:** las scanlines de retro son las mismas que en ROCAS (α 0,2 cada 3 px). El peor objeto bajo la scanline, el cuerpo, da 3,66:1. **(decidido por skin-designer, pendiente de revisar)**
- **No:** brillo en la rejilla ni en los ojos. La rejilla es decoración y los ojos tienen que quedar nítidos.
- **No:** cambiar el tamaño de las celdas, el inset de los segmentos o el padding de la fruta según el skin. Un skin nunca cambia las reglas ni lo que el jugador ve como ocupado.

---

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadowBlur` por segmento baja los fps con una serpiente larga en neón                    | En neón el cuerpo es un solo path (dos pasadas de sombra por frame). Clásico mantiene el dibujo por segmento de hoy, que ya funciona. Prueba de 100+ segmentos en el paso 5.                            |
| `getImageData` lanza `SecurityError` si `fruits.png` se sirve algún día desde otro origen | Hoy es del mismo origen (`/games/serpentina/`). `buildFruitStrip` va en `try/catch` y, si falla, el motor usa la imagen original (clásico/neón) o el círculo `fruitFallback` (retro).                   |
| El recoloreado bloquea el hilo al cargar o al cambiar a retro                             | Solo se procesa la fila de 3790×160 (~600 000 píxeles) y una vez por variante. Se mide en el paso 5; si pasa de un frame, se hace en `requestIdleCallback` mostrando mientras tanto el `fruitFallback`. |
| Memoria de las tiras                                                                      | Dos variantes de ~2,4 MB como máximo, liberadas en `destroy()`.                                                                                                                                         |
| El aclarado cambia el aspecto de frutas que ya cumplían                                   | Solo toca píxeles por debajo de 3,35:1; medido: 4 de 21 recortes, y en dos de ellos menos del 17 % de los píxeles.                                                                                      |
| La cabeza blanca de clásico sigue pareciéndose al cuerpo (1,36:1)                         | Se apoya en los ojos (20:1) y el inset; la alternativa del cuerpo `#2fd911` (1,90:1) queda documentada en _Decisiones_.                                                                                 |
| Retro se ve oscuro con dos capas de scanlines (canvas y `.crt-screen::after`)             | Contraste medido bajo la scanline del canvas (peor caso 3,66:1). Si hace falta, se baja `alpha` sin tocar la paleta.                                                                                    |
| Regresión visual en clásico al mover los literales                                        | El paso 2 compara capturas con `main` antes de aplicar ninguna corrección ni skin; las correcciones llegan aisladas en el paso 3.                                                                       |

---

## Qué **no** está en este spec

- El sistema de skins compartido (tipos, contrato, selector y persistencia): eso es `skins/00-sistema-skins`.
- Skins de ROCAS (`skins/01-skins-rocas`), BLOQUE BUSTER (`skins/02`, en paralelo) y CAÍDA.
- Obstáculos, frutas especiales, power-ups o cualquier cambio de jugabilidad en SERPENTINA.
- Hojas de sprites nuevas o retocadas en `public/games/serpentina/`.
- Corregir los nombres de los comentarios de `lib/serpentina/sprites.ts`.
- Un HUD de puntuación dibujado en el canvas.
