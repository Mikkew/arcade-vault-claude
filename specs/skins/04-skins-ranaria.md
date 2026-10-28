# SKINS · SPEC 04 — Skins de RANARIA (clásico, neón y retro)

> **Estado:** Approved
> **Depende de:** SPEC 09, skins/00-sistema-skins, game-jam/ranaria/01-motor
> **Fecha:** 2026-10-27
> **Objetivo:** Que RANARIA ofrezca los skins `clasico`, `neon` y `retro`, todos con contraste medido sobre fondo oscuro, moviendo sus colores a `lib/ranaria/palettes.ts` y corrigiendo los cinco fallos de contraste o de distinción del clásico actual.

---

## Por qué existe este spec

Auditoría de RANARIA (`lib/ranaria/`, rama `game-ranaria`, sin commits todavía) a fecha de este spec:

| Juego   | `clasico`                       | `neon`  | `retro` |
| ------- | ------------------------------- | ------- | ------- |
| ranaria | `contraste` (y `colores fijos`) | `falta` | `falta` |

`game-jam/ranaria/01-motor` deja fuera de alcance `neon` y `retro` y encarga a `skin-designer` proponerlos aquí. Hoy `GAME_REGISTRY.ranaria.skins` es `["clasico"]`, `setSkin` es un método vacío (`engine.ts:709`) y no existe `lib/ranaria/palettes.ts`.

`clasico` **no cumple** el criterio de modo oscuro en estos puntos (medidos con la fórmula WCAG, ver _Paletas_):

1. **Los troncos casi no se ven sobre el río.** `LOG_COLOR #7a4a22` sobre `RIVER_COLOR #061433`: **2,45:1**. Los troncos son la plataforma de la que depende cruzar el río.
2. **El renacuajo en la charca está por debajo de 3:1.** `TADPOLE_COLOR #0b0b12` sobre `POND_COLOR #1a4f9c`: **2,47:1**. Y la propia charca, que es la meta, da **1,61:1** sobre la hierba `#0f3a1a`.
3. **La rana se confunde con las tortugas sobre las que viaja.** `FROG_COLOR #7dff3a` sobre `TURTLE_COLOR #1f9e8a`: **2,57:1**.
4. **Iconos «a cuestas» y «rescatado» indistinguibles.** Amarillo `FLIP_COLOR #ffd23f` frente a verde `FROG_COLOR #7dff3a`: **1,12:1**, matices 46° y 100°. Es exactamente el par amarillo/verde que se pierde en deuteranopia y protanopia; hoy solo los separa el color.
5. **Elementos con significado que caen por debajo de 3:1 en parte del tiempo.**
   - Flechas de contramano: `FLIP_COLOR` con `globalAlpha = 0.35 + 0.2·sin(...)` (α 0,15–0,55) dan **1,38–4,60:1** sobre asfalto y río; más de la mitad del ciclo están por debajo de 3:1.
   - Tortuga hundiéndose: alterna α 1 y α 0,35 cada 150 ms; en la fase tenue da **1,70:1** sobre el río, y en esa fase **todavía sostiene a la rana**.

Además, el motor tiene 15 constantes de color en `types.ts` y unos 25 literales de color, alfas y `shadowBlur` sueltos en `engine.ts` (lista completa más abajo), así que un skin no puede cambiarlos (`colores fijos`).

Lo que sí cumple en `clasico`: texto del HUD del canvas (`RENACUAJOS`, `TIEMPO`: **16,71:1**), rótulos `¡A CONTRAMANO!` y `¡CHARCA COMPLETA!` (peor caso **8,26:1** sobre la franja semitransparente), barra de tiempo (**11,71:1** cian, **4,31:1** roja en aviso), los cuatro vehículos sobre el asfalto (**5,83–13,77:1**) y la rana sobre cualquier suelo (**≥ 8,27:1**). La puntuación, las vidas, el nivel y «EN PAUSA» los pinta la plataforma en el DOM, no el canvas.

---

## Alcance

**Dentro:**

- `lib/ranaria/palettes.ts` con el tipo `RanariaPalette` y `PALETTES: Record<SkinId, RanariaPalette>`.
- Quitar de `lib/ranaria/types.ts` las 15 constantes de color (líneas 198–213) y de `lib/ranaria/engine.ts` `VEHICLE_COLORS` y todos los literales de color, alfas de estilo, `shadowBlur`/`shadowColor` y radios de esquina (lista completa más abajo).
- Correcciones en `clasico`: tronco `#9c6430`, tortuga `#1a8574`, charca `#3a7fe0`, aro alrededor del icono «a cuestas», flechas con α 0,45–0,75 y tortuga hundiéndose dibujada hueca en lugar de tenue.
- `createRanariaGame(canvas, callbacks, skin?)` y un `setSkin` real, que sustituye al método vacío.
- Brillo con `withGlow` (en `clasico`, para conservar el brillo actual, y en `neon`) y scanlines solo en `retro`, con `lib/engine/skin-fx.ts`.
- `GAME_REGISTRY.ranaria.skins = ["clasico", "neon", "retro"]`.

**Fuera de alcance (para otros specs):**

- Skins de CAÍDA y PAPILLA (siguen solo con `clasico` y no tienen spec en `specs/skins/` todavía).
- Cambios en las reglas: carriles, velocidades, cajas de colisión (`FROG_HIT`, `VEHICLE_INSET`), ciclo de buceo (`TURTLE_*`), puntos, tiempo, vidas o audio.
- Cambiar la duración del parpadeo de la tortuga (150 ms) o del rótulo.
- Cualquier cambio en el selector, la persistencia o el contrato: eso es de skins/00, ya implementado.
- Controles táctiles (spec 10) y el catálogo (`game-jam/ranaria/01-motor`).

---

## Modelo de datos

**No hay datos nuevos en la base**, ni migraciones, y `saveScore` no cambia. El único estado nuevo vive en memoria dentro del motor:

```ts
// lib/ranaria/palettes.ts
import type { SkinFx } from "@/lib/engine/skin-fx";
import type { SkinId } from "@/lib/engine/skins";
import type { ObjKind } from "./types";
type VehicleKind = Extract<ObjKind, "truck" | "van" | "car" | "sports">;
export interface RanariaPalette {
  bg: string; // fondo del canvas y franja superior (luminancia ≤ 0,05)
  grass: string; // orilla norte, mediana y estanque de casa
  grassEdge: string; // bordes de 2 px de la mediana y el estanque (decoración)
  reed: string; // juncos de la orilla norte (decoración)
  pond: string; // relleno de las 5 charcas (meta)
  pondEdge: string | null; // trazo de la charca; null = sin trazo
  homeWater: string; // franja de agua del estanque de casa
  river: string;
  ripple: string; // ondas del río (decoración)
  asphalt: string;
  laneLine: string; // líneas discontinuas (decoración)
  frog: string;
  frogEye: string;
  frogPupil: string;
  tadpole: string; // renacuajo en la charca y a cuestas
  tadpoleEye: string;
  log: string;
  logGrain: string; // vetas (detalle)
  logRing: string; // anillo del extremo (detalle)
  turtle: string;
  turtleRim: string; // anillo exterior de r = 19 (sombreado)
  turtleScale: string; // escamas (detalle)
  turtleUnder: string; // contorno de las tortugas sumergidas (decoración)
  turtleUnderDash: number[]; // setLineDash; [] = continuo
  vehicles: Record<VehicleKind, string>;
  vehicleGlass: string; // cabina y lunas
  headlight: string;
  beam: string | null; // degradado de los faros; null = sin haz
  flip: string; // flechas, icono «a cuestas» y rótulo ¡A CONTRAMANO!
  arrowAlpha: { base: number; amp: number }; // α = base + amp·sin(clock/150)
  time: string; // barra de tiempo y onda de muerte en el agua
  timeWarn: string; // barra en los últimos 5 s
  timeTrack: string; // carril vacío de la barra
  text: string; // RENACUAJOS, TIEMPO e icono «en la charca»
  rescued: string; // icono «rescatado»
  bannerBg: string; // franja detrás de los rótulos
  style: "fill" | "outline"; // objetos rellenos o trazo + relleno translúcido
  fillAlpha: number; // relleno interior con "outline"; 1 con "fill"
  line: number; // grosor del trazo con "outline" y del aro/tortuga hueca, px
  radius: { vehicle: number; sports: number; log: number }; // roundRect
  blur: { frog: number; object: number; headlight: number; time: number; banner: number; arrow: number }; // px antes de fx.glow
  fx: SkinFx; // glow y scanlines (skins/00)
}
export const PALETTES: Record<SkinId, RanariaPalette>;
```

```ts
// engine.ts
let pal = PALETTES[skin ?? DEFAULT_SKIN];
```

---

## Paletas

Los contrastes se han calculado con la fórmula de luminancia relativa de WCAG 2.x (`node -e`). Cada color se mide contra **la superficie sobre la que se dibuja** en su skin: el `bg` para el HUD de la franja superior, y `grass`, `river`, `asphalt`, `pond`, el tronco o la tortuga para lo que se pinta encima. Los colores con alfa se combinan antes sobre esa superficie. En `retro` la cifra entre paréntesis es el peor caso **bajo la scanline** (línea negra α 0,2 que oscurece por igual objeto y superficie en esa fila, el mismo método que skins/03). Mínimos: **4,5** para texto, **3** para objetos jugables y para gráficos con significado (barra de tiempo, iconos, flechas).

### Superficies (luminancia relativa, todas ≤ 0,05)

| Superficie  | clásico               | neón                  | retro                 |
| ----------- | --------------------- | --------------------- | --------------------- |
| `bg`        | `#05070d` — L 0,0021  | `#05050a` — L 0,0016  | `#000000` — L 0       |
| `grass`     | `#0f3a1a` — L 0,0320  | `#06120c` — L 0,0050  | `#000000` — L 0       |
| `river`     | `#061433` — L 0,0078  | `#050b1f` — L 0,0037  | `#00006c` — L 0,0108  |
| `asphalt`   | `#121219` — L 0,0063  | `#08080f` — L 0,0026  | `#000000` — L 0       |
| `homeWater` | α 0,45 → `#144355` — L 0,0482 | `rgba(0, 245, 255, 0.18)` → `#053b38` — L 0,0345 | `#00006c` — L 0,0108 |

La charca no es superficie: es la meta y se trata como objeto jugable (L 0,215 en clásico).

### Tabla de roles

| Rol                         | Sobre                 | Tipo            | clásico                                                       | neón                                                    | retro                       |
| --------------------------- | --------------------- | --------------- | ------------------------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| `text`                      | `bg`                  | texto           | `#e8e8ff` — **16,71**                                         | `#e6e9ff` — **16,91**                                   | `#fcfcfc` — **20,47** (12,81) |
| `frog`                      | `grass`               | objeto          | `#7dff3a` — **9,90**                                          | `#00ff88` — **14,24**                                   | `#d0ff58` — **18,13** (11,35) |
| `frog`                      | `asphalt`             | objeto          | **14,42**                                                     | **14,89**                                               | **18,13** (11,35)           |
| `frog`                      | `river` / `homeWater` | objeto          | **14,05** / **8,27**                                          | **14,58** / **9,27**                                    | **14,90** (10,00)           |
| `frog`                      | tronco                | objeto          | **3,79** (antes 5,74)                                         | **11,03** (sobre el relleno)                            | **3,50** (3,16)             |
| `frog`                      | tortuga               | objeto          | **3,49** (antes **2,57** ✗)                                   | **9,75** (sobre el relleno)                             | **3,36** (3,07)             |
| `frog`                      | charca                | objeto          | **3,07**                                                      | **3,95**                                                | **3,36** (3,07)             |
| `pond`                      | `grass`               | objeto (meta)   | **`#3a7fe0`** — **3,23** (antes `#1a4f9c`, **1,61** ✗)        | `#037879` — **3,61**; trazo `#00f5ff` **14,10**          | `#009090` — **5,39** (3,70) |
| `tadpole`                   | charca                | objeto          | `#0b0b12` — **4,94** (antes **2,47** ✗)                       | `#05050a` — **3,84**                                    | `#000000` — **5,39** (3,70) |
| `tadpole`                   | rana                  | objeto          | **15,16**                                                     | **15,17**                                               | **18,13** (11,35)           |
| `tadpoleEye`                | renacuajo             | detalle         | `#ffffff` — 19,61                                             | `#ffffff` — 20,34                                       | `#fcfcfc` — 20,47           |
| `log`                       | `river`               | objeto          | **`#9c6430`** — **3,70** (antes `#7a4a22`, **2,45** ✗)        | trazo `#ff9a1f` — **9,21**; relleno α 0,18              | `#a07800` — **4,26** (3,17) |
| `turtle`                    | `river`               | objeto          | **`#1a8574`** — **4,02** (antes `#1f9e8a`, 5,47)              | trazo `#00f5ff` — **14,44**; relleno α 0,18             | `#009090` — **4,43** (3,26) |
| tortuga hundiéndose         | `river`               | objeto          | aro hueco `turtle` — **4,02** (antes α 0,35, **1,70** ✗)      | aro hueco — **14,44**                                   | aro hueco — **4,43** (3,26) |
| `turtleUnder`               | `river`               | decoración      | `rgba(31, 158, 138, 0.35)` — 1,70                             | `rgba(0, 245, 255, 0.35)` — 2,60                        | `#009090` discontinuo `[4, 6]` — 4,43 |
| `vehicles.truck`            | `asphalt`             | objeto          | `#ff8a00` — **7,89**                                          | `#ff006e` — **5,21**                                    | `#f83800` — **5,56** (3,78) |
| `vehicles.van`              | `asphalt`             | objeto          | `#b8c0d0` — **10,20**                                         | `#e6e9ff` — **16,60**                                   | `#fcfcfc` — **20,47** (12,81) |
| `vehicles.car`              | `asphalt`             | objeto          | `#00f5ff` — **13,77**                                         | `#45c8ff` — **10,42**                                   | `#009090` — **5,39** (3,70) |
| `vehicles.sports`           | `asphalt`             | objeto          | `#ff2bd6` — **5,83**                                          | `#b14dff` — **5,11**                                    | `#f83800` — **5,56** (3,78) |
| `flip` (flechas)            | `asphalt` / `river`   | gráfico         | α 0,45–0,75: **3,45–7,61** / **3,37–7,42** (antes 1,38–4,60 ✗) | `#ffcf3a` α 0,45–0,75: **3,38–7,73** / **3,34–7,64**| `#f8b800` α 1: **11,85** (7,57) / **9,74** (6,68) |
| icono «en la charca»        | `bg`                  | gráfico         | contorno `text` — **16,71**                                   | **16,91**                                               | **20,47** (12,81)           |
| icono «a cuestas»           | `bg`                  | gráfico         | `#ffd23f` + aro — **13,95**                                   | `#ffcf3a` + aro — **13,79**                             | `#f8b800` + aro — **11,85** (7,57) |
| icono «rescatado» (`rescued`) | `bg`                | gráfico         | `#7dff3a` — **15,57**                                         | `#00ff88` — **15,17**                                   | `#d0ff58` — **18,13** (11,35) |
| `time`                      | `timeTrack`           | gráfico         | `#00f5ff` sobre `#20222a` — **11,71**                         | `#00f5ff` sobre `#202027` — **11,95**                   | `#fcfcfc` sobre `#00006c` — **16,83** (11,29) |
| `timeWarn`                  | `timeTrack`           | gráfico         | `#ff2b4d` — **4,31**                                          | `#ff006e` — **4,22**                                    | `#f83800` — **4,57** (3,33) |
| `timeTrack`                 | `bg`                  | decoración      | `rgba(232, 232, 255, 0.12)` — 1,27                            | `rgba(230, 233, 255, 0.12)` — 1,26                      | `#00006c` — 1,22            |
| rótulos (`frog` / `flip`)   | `bannerBg` (peor)     | texto           | `rgba(5, 7, 13, 0.78)` — **9,23** / **8,26**                  | `rgba(5, 5, 10, 0.78)` — **8,81** / **8,01**            | `#000000` sólido — **18,13** / **11,85** |
| onda de agua (`time`)       | `river`               | efecto          | **13,42**                                                     | **14,44**                                               | **16,83** (11,29)           |
| mancha de atropello (`frog`) | `asphalt`            | efecto          | **14,42**                                                     | **14,89**                                               | **18,13** (11,35)           |
| `laneLine`                  | `asphalt`             | decoración      | `rgba(245, 255, 0, 0.55)` — 5,69                              | `rgba(230, 233, 255, 0.25)` — 1,95                      | `#a07800` — 5,18            |
| `reed` / `grassEdge`        | `grass`               | decoración      | `rgba(125, 255, 58, 0.22)` — 1,81                             | `rgba(0, 255, 136, 0.18)` — 1,54                        | `#a07800` — 5,18            |
| `ripple`                    | `river`               | decoración      | `rgba(0, 245, 255, 0.08)` — 1,18                              | `rgba(0, 245, 255, 0.10)` — 1,20                        | `#000000` — 1,22            |

✗ = valor actual que incumple. En neón, troncos, tortugas y vehículos son un trazo de 2 px con relleno al 18 % del mismo color; el contraste del objeto es el del trazo y el de la rana encima es contra el relleno combinado (tronco `#32251f`, tortuga `#043547`). El rojo de aviso de la barra (4,31 / 4,22 / 4,57) no es texto: es un gráfico y su mínimo es 3.

Todos los objetos jugables pasan de 3:1 en los tres skins, también bajo la scanline en `retro`; todo el texto pasa de 4,5:1; las cinco superficies tienen luminancia ≤ 0,05.

### Distinción entre elementos

| Par                          | clásico (corregido)                         | neón                                              | retro                                 |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| «a cuestas» / «rescatado»    | 1,12 (46° / 100°) **+ aro** (forma)         | 1,10 (45° / 152°) **+ aro**                        | 1,53 (45° / 77°) **+ aro**            |
| «en la charca» / los otros   | contorno frente a relleno (forma)           | igual                                             | igual                                 |
| rana / tortuga               | 3,49                                        | 9,75 (sólido frente a contorno)                   | 3,36                                  |
| rana / tronco                | 3,79                                        | 11,03                                             | 3,50                                  |
| rana / coche                 | 1,05 (100° / 182°)                          | 1,43 contra el trazo, 10,92 contra el relleno     | 3,36                                  |
| rana / furgoneta             | 1,41 (100° / acromático)                    | 1,12 contra el trazo, 9,63 contra el relleno      | 1,13 (77° / acromático)               |
| tortuga / tronco             | 1,09 (170° / 29°)                           | 1,57 (182° / 33°)                                 | 1,04 (180° / 45°)                     |
| barra normal / aviso         | 2,72 (182° / 350°)                          | 2,83 (182° / 334°)                                | 3,68 (acromático / 14°)               |

- **Iconos de la franja superior.** Es el único par que hoy depende solo del matiz, y además en el eje amarillo-verde. La corrección es de forma y vale para los tres skins: el icono «a cuestas» lleva un aro de 2 px (`line`) del color `flip`, radio 12, alrededor del renacuajo. Así los tres estados se leen sin color: contorno = en la charca, relleno con aro = a cuestas, relleno sin aro = rescatado. El aro enlaza con el resto del lenguaje de contramano (flechas y rótulo en `flip`).
- **Rana y coche en clásico (1,05:1).** Misma luminancia, pero matices separados 82° (verde frente a cian), con el eje azul-amarillo de por medio, que se conserva en deuteranopia y protanopia. La rana además tiene ojos blancos y patas, y el coche es un rectángulo con luna y faros. No se corrige: cambiar el coche cambiaría el tráfico de clásico sin necesidad. Ver _Decisiones_.
- **Rana y furgoneta (1,41 / 1,12 / 1,13).** Verde saturado frente a gris acromático, el mismo criterio aceptado en skins/03 (cabeza blanca frente a cuerpo verde). En neón la rana es sólida y la furgoneta un contorno con relleno oscuro.
- **Tortuga y tronco.** Luminancia parecida pero matiz opuesto (frío frente a cálido, eje azul-amarillo) y forma muy distinta (círculos en fila frente a barra redondeada). Ambos sostienen a la rana; la diferencia que importa, que la tortuga puede hundirse, se avisa con el aro hueco.
- **Río, asfalto y hierba** quedan entre 1,00 y 1,46:1 entre sí en los tres skins. Son superficies fijas (las filas no cambian nunca) separadas por la mediana, y el río se reconoce por las ondas y lo que flota. No es un par que el jugador tenga que distinguir por color.

### Valores completos de cada skin

| Campo             | clásico                                   | neón                                     | retro                         |
| ----------------- | ----------------------------------------- | ---------------------------------------- | ----------------------------- |
| `grassEdge`       | `rgba(125, 255, 58, 0.22)` (= `reed`)     | `rgba(0, 255, 136, 0.35)`                | `#a07800`                     |
| `pondEdge`        | `null`                                    | `#00f5ff`                                | `null`                        |
| `frogEye` / `frogPupil` | `#ffffff` / `#05070d`               | `#ffffff` / `#05050a`                    | `#fcfcfc` / `#000000`         |
| `logGrain`        | `rgba(0, 0, 0, 0.35)`                     | `rgba(255, 154, 31, 0.5)`                | `#000000`                     |
| `logRing`         | `#c08a50`                                 | `#ff9a1f`                                | `#000000`                     |
| `turtleRim`       | `#0e5a4e`                                 | `#00f5ff` (es el trazo)                  | `#009090` (= `turtle`)        |
| `turtleScale`     | `rgba(5, 7, 13, 0.5)`                     | `rgba(0, 245, 255, 0.5)`                 | `#000000`                     |
| `turtleUnderDash` | `[]`                                      | `[]`                                     | `[4, 6]`                      |
| `vehicleGlass`    | `rgba(5, 7, 13, 0.75)`                    | `rgba(5, 5, 10, 0.75)`                   | `#000000`                     |
| `headlight`       | `#fffad0`                                 | `#ffffff`                                | `#fcfcfc`                     |
| `beam`            | `rgba(255, 250, 200, 0.18)`               | `rgba(255, 250, 200, 0.14)`              | `null`                        |
| `arrowAlpha`      | `{ base: 0.6, amp: 0.15 }` (antes 0,35/0,2) | `{ base: 0.6, amp: 0.15 }`             | `{ base: 1, amp: 0 }`         |
| `style`           | `"fill"`                                  | `"outline"`                              | `"fill"`                      |
| `fillAlpha`       | 1                                         | 0,18                                     | 1                             |
| `line`            | 2,5                                       | 2                                        | 2                             |
| `radius`          | `{ vehicle: 5, sports: 10, log: 14 }`     | `{ vehicle: 5, sports: 10, log: 14 }`    | `{ vehicle: 0, sports: 0, log: 0 }` |
| `blur.frog`       | 12                                        | 14                                       | 0                             |
| `blur.object`     | 0                                         | 8                                        | 0                             |
| `blur.headlight`  | 10                                        | 10                                       | 0                             |
| `blur.time`       | 8                                         | 8                                        | 0                             |
| `blur.banner`     | 14                                        | 14                                       | 0                             |
| `blur.arrow`      | 0                                         | 6                                        | 0                             |
| `fx.glow`         | 1                                         | 1                                        | 0                             |
| `fx.scanlines`    | `null`                                    | `null`                                   | `{ alpha: 0.2, step: 3 }`     |

El `shadowBlur` efectivo es `blur.<rol> × fx.glow` y el `shadowColor` es el color de relleno o trazo de ese rol. `clasico` conserva exactamente los brillos de hoy (rana 12, faros 10, barra 8, rótulo 14).

**Retro** usa 8 colores, paleta tipo 8 bits: `#000000`, `#00006c`, `#009090`, `#a07800`, `#d0ff58`, `#f8b800`, `#f83800` y `#fcfcfc`. Sin brillo, sin degradados (sin haz de faros) y sin alfa en el relleno: el rótulo va sobre una franja negra sólida y las flechas son sólidas y fijas.

---

## Colores escritos a mano que hay que llevar a `palettes.ts`

| Archivo:línea                   | Valor actual                                                     | Rol en la paleta                                |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `lib/ranaria/types.ts:198–213`  | `FROG_COLOR` … `TEXT_COLOR` (15 constantes)                      | se borran; cada una pasa a su rol               |
| `lib/ranaria/engine.ts:17–59`   | imports de las 15 constantes                                     | se sustituyen por `PALETTES`                    |
| `lib/ranaria/engine.ts:80–85`   | `VEHICLE_COLORS` (`#ff8a00`, `#b8c0d0`, `#00f5ff`, `#ff2bd6`)    | `vehicles`                                      |
| `lib/ranaria/engine.ts:332`     | `ctx.lineWidth = 2.5` (cola y contorno del renacuajo)            | `line`                                          |
| `lib/ranaria/engine.ts:343`     | `ctx.fillStyle = "#ffffff"` (ojo del renacuajo)                  | `tadpoleEye`                                    |
| `lib/ranaria/engine.ts:351`     | `BG_COLOR` (franja superior)                                     | `bg`                                            |
| `lib/ranaria/engine.ts:354, 392` | `GRASS_COLOR`                                                   | `grass`                                         |
| `lib/ranaria/engine.ts:356`     | `REED_COLOR` (juncos)                                            | `reed`                                          |
| `lib/ranaria/engine.ts:394`     | `REED_COLOR` (bordes de mediana y estanque)                      | `grassEdge`                                     |
| `lib/ranaria/engine.ts:360`     | `POND_COLOR`                                                     | `pond` (corregido a `#3a7fe0`) + `pondEdge`     |
| `lib/ranaria/engine.ts:373, 586` | `TADPOLE_COLOR`                                                 | `tadpole`                                       |
| `lib/ranaria/engine.ts:376`     | `RIVER_COLOR`                                                    | `river`                                         |
| `lib/ranaria/engine.ts:378`     | `"rgba(0, 245, 255, 0.08)"` (ondas)                              | `ripple`                                        |
| `lib/ranaria/engine.ts:399`     | `"rgba(26, 79, 156, 0.45)"` (agua del estanque de casa)          | `homeWater`                                     |
| `lib/ranaria/engine.ts:402`     | `ASPHALT_COLOR`                                                  | `asphalt`                                       |
| `lib/ranaria/engine.ts:404`     | `LANE_LINE_COLOR`                                                | `laneLine`                                      |
| `lib/ranaria/engine.ts:418–421` | degradado con `"rgba(255, 250, 200, 0.18)"`                      | `beam` (con `null` no se dibuja)                |
| `lib/ranaria/engine.ts:428`     | `VEHICLE_COLORS[kind]`                                           | `vehicles[kind]` + `style`/`fillAlpha`/`line`   |
| `lib/ranaria/engine.ts:430`     | radios `10` / `5` de `roundRect`                                 | `radius.sports` / `radius.vehicle`              |
| `lib/ranaria/engine.ts:432`     | `"rgba(5, 7, 13, 0.75)"` (cabina y lunas)                        | `vehicleGlass`                                  |
| `lib/ranaria/engine.ts:442–448` | `shadowColor`/`fillStyle = "#fffad0"`, `shadowBlur = 10` y `= 0` | `headlight`, `withGlow(…, blur.headlight)`      |
| `lib/ranaria/engine.ts:452`     | `LOG_COLOR`                                                      | `log` (corregido a `#9c6430`)                   |
| `lib/ranaria/engine.ts:454`     | radio `14` de `roundRect`                                        | `radius.log`                                    |
| `lib/ranaria/engine.ts:457`     | `"rgba(0, 0, 0, 0.35)"` (vetas)                                  | `logGrain`                                      |
| `lib/ranaria/engine.ts:467`     | `"#c08a50"` (anillo)                                             | `logRing`                                       |
| `lib/ranaria/engine.ts:479`     | `"#0e5a4e"` (anillo exterior)                                    | `turtleRim`                                     |
| `lib/ranaria/engine.ts:483`     | `TURTLE_COLOR`                                                   | `turtle` (corregido a `#1a8574`)                |
| `lib/ranaria/engine.ts:488`     | `"rgba(5, 7, 13, 0.5)"` (escamas)                                | `turtleScale`                                   |
| `lib/ranaria/engine.ts:511`     | `"rgba(31, 158, 138, 0.35)"` (sumergidas)                        | `turtleUnder` + `turtleUnderDash`               |
| `lib/ranaria/engine.ts:529`     | `alpha = 0.35` en la fase tenue del hundimiento                  | se sustituye por el aro hueco (corrección)      |
| `lib/ranaria/engine.ts:539–540` | `globalAlpha = 0.35 + 0.2 * sin(…)`, `FLIP_COLOR`                | `arrowAlpha`, `flip`, `withGlow(…, blur.arrow)` |
| `lib/ranaria/engine.ts:561–563, 573` | `shadowColor`/`fillStyle = FROG_COLOR`, `shadowBlur = 12` y `= 0` | `frog`, `withGlow(…, blur.frog)`         |
| `lib/ranaria/engine.ts:575`     | `"#ffffff"` (ojos de la rana)                                    | `frogEye`                                       |
| `lib/ranaria/engine.ts:579`     | `"#05070d"` (pupilas)                                            | `frogPupil`                                     |
| `lib/ranaria/engine.ts:595`     | `TIME_COLOR` (onda al caer al agua)                              | `time`                                          |
| `lib/ranaria/engine.ts:601`     | `FROG_COLOR` (mancha del atropello)                              | `frog`                                          |
| `lib/ranaria/engine.ts:619`     | `FROG_COLOR` / `FLIP_COLOR` / `TEXT_COLOR` (iconos)              | `rescued` / `flip` + aro / `text`               |
| `lib/ranaria/engine.ts:624, 640` | `TEXT_COLOR`                                                    | `text`                                          |
| `lib/ranaria/engine.ts:643`     | `"rgba(232, 232, 255, 0.12)"`                                    | `timeTrack`                                     |
| `lib/ranaria/engine.ts:645–649` | `TIME_WARN_COLOR`/`TIME_COLOR`, `shadowBlur = 8` y `= 0`         | `timeWarn`/`time`, `withGlow(…, blur.time)`     |
| `lib/ranaria/engine.ts:652`     | `"rgba(5, 7, 13, 0.78)"`                                         | `bannerBg`                                      |
| `lib/ranaria/engine.ts:657–661` | `shadowColor = color`, `shadowBlur = 14` y `= 0`                 | `withGlow(…, blur.banner)`                      |
| `lib/ranaria/engine.ts:664`     | `BG_COLOR` (fondo completo)                                      | `bg`                                            |
| `lib/ranaria/engine.ts:673–674` | `FROG_COLOR` / `FLIP_COLOR` (rótulos)                            | `frog` / `flip`                                 |

Se quedan en el motor porque son geometría o tiempo, no estilo: `CELL`, los tamaños de vehículos (38/34/30 px), los radios de rana, renacuajo, tortuga (19/15/7) y charca, la separación de 14 px de los juncos, el periodo de las ondas, `HOP_MS`, `DYING_MS`, el parpadeo de 150 ms del hundimiento y la fuente `bold 14px/12px/30px monospace`.

Cuando termine este spec, `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(|shadowBlur|shadowColor|_COLOR" lib/ranaria/engine.ts lib/ranaria/types.ts` no debe devolver nada.

### Efectos según el skin

- **Brillo** (`withGlow`): en `clasico`, solo donde ya lo hay hoy (rana 12 px, faros 10, barra de tiempo 8, rótulos 14), para que salga igual. En `neon`, además, trazos de vehículos, troncos, tortugas y charca (8 px) y flechas de contramano (6 px); los vehículos y objetos del río se agrupan por color en un solo path por carril para no pagar una pasada de sombra por objeto. En `retro`, ninguno (`fx.glow = 0`).
- **Estilo de objeto**: `fill` en clásico y retro; `outline` en neón (relleno `fillAlpha` + trazo `line`). La rana, el renacuajo y los iconos son sólidos en los tres.
- **Haz de faros**: degradado en clásico y neón; sin haz en retro (sin degradados).
- **Tortuga hundiéndose** (los tres skins): mantiene el parpadeo de 150 ms, pero la fase «apagada» dibuja solo el aro exterior de la tortuga con trazo `line` en el color `turtle`, sin relleno, en lugar de bajar a α 0,35. Sigue habiendo un cambio fuerte de área iluminada (el aviso) y en ambas fases la plataforma pasa de 3:1.
- **Sumergidas**: contorno de decoración; en retro discontinuo `[4, 6]` para no confundirlo con el aro de una tortuga que todavía sostiene.
- **Flechas de contramano**: pulso suave de α 0,45 a 0,75 (periodo ≈ 0,94 s, como hoy) en clásico y neón; fijas en retro.
- **Scanlines** (`drawScanlines`): solo en `retro`, al final de `draw()`, encima de todo, rótulos incluidos.
- **Destellos**: el único parpadeo es el de la tortuga hundiéndose (150 ms por fase, ≈ 3,3 ciclos/s durante 700 ms). Afecta a un grupo de 100–150 × 38 px, menos del 2 % del canvas, así que no es un destello a pantalla completa. Este spec no añade ninguno y el cambio de skin es un único cambio de colores.

---

## Plan de implementación

1. **Paletas.** Crear `lib/ranaria/palettes.ts` con `RanariaPalette` y `PALETTES` usando los valores exactos de las tablas. Todavía no lo importa nadie. Verificación: `npx tsc --noEmit`.
2. **Motor con paleta, sin correcciones.** En `engine.ts`, todas las funciones de dibujo leen de una variable `pal` que de momento vale una copia de `PALETTES.clasico` con los valores de hoy (`log: "#7a4a22"`, `turtle: "#1f9e8a"`, `pond: "#1a4f9c"`, `arrowAlpha: { base: 0.35, amp: 0.2 }`), la fase tenue con α 0,35 y sin aro en el icono. Se sustituye cada línea de la tabla de colores escritos a mano y los brillos pasan por `withGlow`. Se borran las 15 constantes de color de `types.ts`. Verificación: `npx tsc --noEmit`, `npm run lint`, y RANARIA se ve igual que antes del cambio (capturas de Playwright al inicio, con un renacuajo a cuestas y con el rótulo `¡A CONTRAMANO!`).
3. **Correcciones de clásico.** `pal` pasa a ser `PALETTES.clasico` tal cual (tronco, tortuga, charca y flechas corregidos). `drawTadpole` gana el aro para el estado `carried` de la franja superior y `drawTurtles` dibuja el aro hueco en la fase apagada. Verificación: `npx tsc --noEmit`; en el navegador, los troncos y las charcas se ven más claros, el icono «a cuestas» lleva aro y la tortuga que se hunde alterna entre sólida y aro.
4. **Skin en el motor.** `createRanariaGame(canvas, callbacks, skin?: SkinId)` guarda `let pal = PALETTES[skin ?? DEFAULT_SKIN]`. `setSkin(s)` asigna `pal = PALETTES[s] ?? PALETTES.clasico`. No hace falta redibujar a mano: `frame()` llama a `draw()` también en pausa y tras el game over. `restart()` y `reset()` **no** tocan `pal`. Verificación: `npx tsc --noEmit`; forzando `skin = "neon"` en local (sin commit), los colores cambian y la partida no se reinicia.
5. **Neón y retro.** Implementar el estilo `outline` (relleno translúcido + trazo, un path por carril), `pondEdge`, `beam: null`, `turtleUnderDash`, radios 0 y `drawScanlines(ctx, W, H, pal.fx.scanlines)` al final de `draw()`. Verificación: `npm run lint` y `npx tsc --noEmit`. En local, neón muestra contornos con brillo y la rana sólida; retro muestra 8 colores planos, esquinas rectas y scanlines. En neón, con todos los carriles llenos y el rótulo visible, el panel de rendimiento no baja de 60 fps.
6. **Registro.** Poner `skins: ["clasico", "neon", "retro"]` en `GAME_REGISTRY.ranaria`. A partir de aquí aparece el selector de skins/00 en `/juegos/ranaria/jugar`. Verificación: con Playwright, cambiar entre los tres skins durante la partida, con y sin pausa, con un renacuajo a cuestas: puntuación, vidas, nivel, tiempo y posición de la rana no cambian, y tras recargar se recupera el último skin.
7. **Cierre.** Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores. El `grep` de colores de este spec no devuelve nada, y ROCAS, CAÍDA, BLOQUE BUSTER, SERPENTINA y PAPILLA se ven igual que antes.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Con `clasico`, RANARIA se ve igual que antes salvo las correcciones anotadas: tronco `#9c6430` (antes `#7a4a22`), tortuga `#1a8574` (antes `#1f9e8a`), charca `#3a7fe0` (antes `#1a4f9c`), aro en el icono «a cuestas», flechas con α 0,45–0,75 (antes 0,15–0,55) y aro hueco en la fase apagada de la tortuga que se hunde (antes α 0,35). Todo lo demás (fondo, hierba, río, asfalto, rana, vehículos, barra, rótulos y brillos) no cambia.
- [ ] `lib/ranaria/palettes.ts` exporta `PALETTES` con las claves `clasico`, `neon` y `retro` y los valores exactos de las tablas.
- [ ] Las ratios de la tabla de paletas se cumplen: texto ≥ 4,5:1, cada objeto jugable y gráfico con significado ≥ 3:1 contra la superficie sobre la que se dibuja, y en `retro` también bajo la scanline.
- [ ] Las cinco superficies de cada skin (`bg`, `grass`, `river`, `asphalt`, `homeWater`) tienen luminancia relativa ≤ 0,05.
- [ ] Los tres estados de los iconos se distinguen en escala de grises: contorno, relleno con aro y relleno sin aro.
- [ ] `engine.ts` y `types.ts` no contienen literales de color, constantes `_COLOR` ni `shadowBlur`/`shadowColor` sueltos (comprobable con el `grep` de este spec).
- [ ] En `neon`, vehículos, troncos y tortugas son contornos de 2 px con relleno al 18 % y brillo, y la rana es sólida. En `retro` no hay `shadowBlur` ni degradados en todo el frame, solo aparecen los 8 colores de la paleta y las esquinas son rectas.
- [ ] Solo `retro` dibuja scanlines en el canvas.
- [ ] Al cambiar de skin en mitad de la partida no se reinicia ni cambia la puntuación, las vidas, el nivel ni el tiempo, y `PAUSA`/`REANUDAR` sigue funcionando.
- [ ] Al cambiar de skin en pausa, el canvas muestra el skin nuevo sin que avancen los carriles.
- [ ] `JUGAR DE NUEVO` conserva el skin elegido.
- [ ] `GAME_REGISTRY.ranaria.skins` es `["clasico", "neon", "retro"]` y el selector aparece en `/juegos/ranaria/jugar`.
- [ ] Las cajas de colisión, el ciclo de buceo y los tiempos son idénticos en los tres skins; la fila que guarda `saveScore` es idéntica con cualquier skin.
- [ ] Ningún otro juego cambia.

---

## Decisiones

- **Sí:** corregir el tronco de `clasico` a `#9c6430`. Es el fallo más grave (2,45:1 sobre el río) y es la plataforma más usada. El nuevo marrón queda dentro de la ventana que exige a la vez tronco/río ≥ 3 (3,70) y rana/tronco ≥ 3 (3,79). **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** oscurecer un poco la tortuga de `clasico` a `#1a8574`. Con `#1f9e8a` la rana encima da 2,57:1; con el nuevo tono da 3,49 y la tortuga sigue en 4,02 sobre el río. Es el cambio mínimo que cumple los dos lados. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** aclarar la charca de `clasico` a `#3a7fe0` en vez de añadir un trazo. Un solo valor arregla los tres pares: renacuajo/charca 4,94, charca/hierba 3,23 y rana/charca 3,07 (justo, pero la rana solo pisa la charca un instante, al recoger). **(decidido por skin-designer, pendiente de revisar)**
- **No:** aclarar el renacuajo en lugar de la charca. El renacuajo oscuro es el que contrasta sobre la rana verde (15,16:1) cuando va a cuestas; uno claro fallaría ahí.
- **Sí:** distinguir «a cuestas» de «rescatado» con un aro de forma, igual en los tres skins, en lugar de cambiar colores. En los tres skins los dos tonos (amarillo de contramano y verde de rana) tienen luminancias casi iguales y caen en el eje amarillo-verde; un aro no depende del color y conserva el significado de cada tono. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** subir el pulso de las flechas de contramano a α 0,45–0,75. Con 0,15–0,55 pasan más de la mitad del tiempo por debajo de 3:1; con el nuevo rango el mínimo es 3,37 y el pulso sigue siendo suave. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** la fase apagada de la tortuga que se hunde pasa a ser un aro hueco. Subir el α hasta 3:1 haría casi invisible el aviso (las dos fases se parecerían); el aro mantiene el aviso y la plataforma visible. **(decidido por skin-designer, pendiente de revisar)**
- **No:** cambiar el coche cian de `clasico` aunque dé 1,05:1 contra la rana. Los matices están a 82° y en el eje azul-amarillo, y forma y ojos separan a los dos. Si el usuario lo prefiere, `vehicles.car: "#1fa3ff"` es un cambio de un valor.
- **No:** cambiar el periodo de 150 ms del parpadeo de hundimiento. Es local (< 2 % del canvas) y dura 700 ms; cambiarlo alteraría el aviso que el jugador ya aprende a leer.
- **Sí:** `clasico` conserva todos sus brillos actuales con `fx.glow = 1` (como SERPENTINA en skins/03), aunque pasen por `withGlow`.
- **Sí:** neón con los tokens del portal y el reparto de los otros juegos: rana `--green`, tortugas y barra `--cyan`, contramano `--gold`, camión y aviso `--magenta`. Troncos naranja `#ff9a1f` (el de BLOQUE BUSTER neón) para que lo que flota y es seguro sea cálido frente a la tortuga fría. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** en neón, troncos, tortugas y vehículos son contornos con relleno al 18 %. Así la rana, sólida, contrasta 9,75–13,08:1 contra lo que tiene debajo o al lado, algo imposible con dos sólidos neón (`--green` y `--cyan` tienen la misma luminancia). **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** intensidad del brillo en neón de 14 px para la rana, 8 px para los objetos y 6 px para las flechas, regulable con `fx.glow`. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** retro con una paleta de 8 colores tipo 8 bits (`#000000`, `#00006c`, `#009090`, `#a07800`, `#d0ff58`, `#f8b800`, `#f83800`, `#fcfcfc`) y no fósforo monocromo como ROCAS y SERPENTINA. RANARIA tiene seis familias de objetos que conviven en pantalla; en monocromo la rana sobre la tortuga saldría a 1,7:1. Con estos 8 colores todos los pares rana/plataforma pasan de 3:1 incluso bajo la scanline. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** en retro el río es `#00006c`, más oscuro que el `#0000a8` típico de EGA: con `#0000a8` el tronco daba 2,79:1. Hierba y asfalto son negros; la hierba se reconoce por los juncos y bordes `#a07800`.
- **Sí:** las scanlines de retro son las de ROCAS y SERPENTINA (α 0,2 cada 3 px). El peor objeto bajo la scanline (rana sobre tortuga y sobre charca) da 3,07:1. **(decidido por skin-designer, pendiente de revisar)**
- **No:** cambiar tamaños, cajas de colisión, radios de colisión o tiempos según el skin. Un skin nunca cambia las reglas ni lo que el jugador ve como ocupado; los radios de `roundRect` son solo dibujo.

---

## Riesgos

| Riesgo                                                                         | Mitigación                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadowBlur` por objeto baja los fps en neón (≈ 25 objetos + 4–5 tortugas por grupo) | Un path por carril y color, dentro de un solo `withGlow`; prueba de 60 fps en el paso 5. Si no llega, se baja `blur.object` sin tocar colores.                              |
| Márgenes justos en retro bajo la scanline (3,07 en rana/tortuga y rana/charca)  | Ratios calculadas con los hex exactos. Si el usuario quiere más margen, bajar `fx.scanlines.alpha` a 0,15 sin tocar la paleta.                                                  |
| Rana/charca en clásico queda en 3,07                                            | Solo ocurre al recoger un renacuajo, un instante; si se quiere más margen, `pond: "#3576d4"` da 3,46 (y charca/hierba baja a 2,86, por eso no se eligió).                       |
| Regresión visual en clásico al mover los literales                              | El paso 2 compara capturas antes de aplicar ninguna corrección; las correcciones llegan aisladas en el paso 3.                                                                   |
| El aro del icono se confunde con el contorno «en la charca»                     | El aro es de 12 px de radio y rodea un renacuajo relleno; el hueco es el propio renacuajo en contorno, sin aro. Se comprueba en escala de grises (criterio de aceptación).      |
| Retro se ve oscuro con dos capas de scanlines (canvas y `.crt-screen::after`)   | Contraste medido bajo la scanline del canvas; si hace falta, se baja `alpha` sin tocar la paleta.                                                                                |
| La rama `game-ranaria` aún no está fusionada cuando se implemente este spec      | Implementar sobre `game-ranaria` o después de fusionarla; las líneas citadas son las de la rama a fecha de este spec y pueden moverse.                                          |

---

## Qué **no** está en este spec

- Skins de CAÍDA y PAPILLA.
- Cambios de reglas, colisiones, velocidades, tiempos, puntos o audio de RANARIA.
- Cambios en el selector, la persistencia o el contrato de skins (skins/00).
- Sprites o imágenes nuevas en `public/`.
- Controles táctiles y textos del catálogo.
- Migraciones o cambios en `scores`.
