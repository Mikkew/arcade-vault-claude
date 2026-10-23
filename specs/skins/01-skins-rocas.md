# SKINS · SPEC 01 — Skins de ROCAS (clásico, neón y retro)

> **Estado:** Implemented
> **Depende de:** SPEC 05, SPEC 09, skins/00-sistema-skins
> **Fecha:** 2026-10-22
> **Objetivo:** Que ROCAS ofrezca los skins `clasico`, `neon` y `retro`, todos con contraste medido sobre fondo oscuro, sacando del motor sus colores escritos a mano y llevándolos a `lib/asteroids/palettes.ts`.

---

## Por qué existe este spec

Auditoría de ROCAS (`lib/asteroids/`) a fecha de este spec:

| Juego | `clasico`                | `neon`  | `retro` |
| ----- | ------------------------ | ------- | ------- |
| rocas | cumple (`colores fijos`) | `falta` | `falta` |

El aspecto actual cumple el contraste: el peor color jugable es el propulsor, con 6,22:1. Pero los 9 colores están escritos a mano en `engine.ts` y `entities.ts`, así que un skin no puede cambiarlos (`colores fijos`). `neon` y `retro` no existen porque todavía no hay sistema de skins. Este spec usa la base de `skins/00-sistema-skins` para mover esos colores a una paleta tipada y añadir los dos skins que faltan.

El motor de ROCAS **no tiene OVNIs**, sprites ni HUD propio dibujado en el canvas, salvo el temporizador del triple disparo. Puntuación, vidas y nivel los pinta la plataforma en el DOM, y lo mismo pasa con «EN PAUSA». `audio.ts` no tiene colores.

---

## Alcance

**Dentro:**

- `lib/asteroids/palettes.ts` con el tipo `AsteroidsPalette` y `PALETTES: Record<SkinId, AsteroidsPalette>`.
- Quitar todos los colores, grosores de línea y fuentes escritos a mano en `lib/asteroids/engine.ts` y `lib/asteroids/entities.ts` (lista completa más abajo).
- Los `draw` de las entidades reciben la paleta: `draw(ctx, pal)`.
- `createAsteroidsGame(canvas, callbacks, skin?)` y un `setSkin` real, que sustituye al método vacío de skins/00.
- Brillo (`shadowBlur`) solo en `neon` y scanlines por código solo en `retro`, las dos cosas con `lib/engine/skin-fx.ts`.
- `GAME_REGISTRY.rocas.skins = ["clasico", "neon", "retro"]`.

**Fuera de alcance (para otros specs):**

- Skins de CAÍDA, BLOQUE BUSTER y SERPENTINA. Cada uno lleva su propio spec.
- Cambios en las reglas, la física, los puntos, las vidas, el power-up o el audio de ROCAS.
- Formas o siluetas nuevas por skin (por ejemplo, asteroides rellenos o una nave pixelada). Aquí solo cambian el color, el grosor y los efectos.
- OVNIs u otros enemigos nuevos.
- Cualquier cambio en el selector o en la persistencia: eso es de skins/00.

---

## Modelo de datos

**No hay datos nuevos en la base**, ni migraciones, y `saveScore` no cambia. El único estado nuevo vive en memoria dentro del motor:

```ts
// lib/asteroids/palettes.ts
import type { SkinId } from "@/lib/engine/skins";
import type { SkinFx } from "@/lib/engine/skin-fx";
export interface AsteroidsPalette {
  bg: string; // fondo del canvas (luminancia ≤ 0,05)
  ship: string; // contorno de la nave
  thrust: string; // llama del propulsor
  asteroid: string; // contorno de los asteroides (los tres tamaños)
  bullet: string; // balas
  powerup: string; // rombo del triple disparo
  powerupText: string; // texto "3x" dentro del rombo
  hud: string; // temporizador "3x  N.Ns"
  particleRgb: string; // "r,g,b"; el alfa lo pone la vida de la partícula
  blur: {
    ship: number;
    thrust: number;
    asteroid: number;
    bullet: number;
    powerup: number;
    hud: number;
  }; // px de shadowBlur antes de aplicar fx.glow
  line: { ship: number; asteroid: number; powerup: number; particle: number };
  lineJoin: CanvasLineJoin;
  hudFont: string;
  powerupFont: string;
  fx: SkinFx; // glow y scanlines (skins/00)
}
export const PALETTES: Record<SkinId, AsteroidsPalette>;
```

```ts
// engine.ts
let pal = PALETTES[skin ?? DEFAULT_SKIN];
```

---

## Paletas

Los contrastes se han calculado con la fórmula de luminancia relativa de WCAG 2.x (`node -e`). Cada color se mide contra el `bg` de **su** skin. Los colores con alfa se combinan antes sobre ese `bg`. Para objetos jugables, «≥ 3» significa que cumple WCAG 1.4.11, y para texto o HUD el mínimo es 4,5 (AA).

### Tabla de roles

| Rol           | Tipo                      | clásico                                             | neón                                             | retro                                            |
| ------------- | ------------------------- | --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `bg`          | fondo                     | `#000000` (L = 0,0000)                              | `#05050a` (L = 0,0016)                           | `#031407` (L = 0,0054)                           |
| `ship`        | objeto                    | `#ffffff` — **21,00**                               | `#00f5ff` — **15,02**                            | `#c4ffc4` — **16,67**                            |
| `thrust`      | objeto (parte de la nave) | `rgba(255,130,0,0.85)` → `#d96f00` — **6,22**       | `#f5ff00` — **18,58**                            | `#8fe89a` — **12,81**                            |
| `asteroid`    | objeto                    | `#ffffff` — **21,00**                               | `#ff006e` — **5,30**                             | `#2a9a3e` — **5,23**                             |
| `bullet`      | objeto                    | `#ffffff` — **21,00**                               | `#ffffff` — **20,34**                            | `#c4ffc4` — **16,67**                            |
| `powerup`     | objeto                    | `#00ffff` — **16,75**                               | `#ffcf3a` — **13,79**                            | `#5fd36f` — **9,97**                             |
| `powerupText` | texto (12 px negrita)     | `#00ffff` — **16,75**                               | `#ffcf3a` — **13,79**                            | `#c4ffc4` — **16,67**                            |
| `hud`         | texto (15 px)             | `#00ffff` — **16,75**                               | `#ffcf3a` — **13,79**                            | `#c4ffc4` — **16,67**                            |
| `particleRgb` | decoración                | `255,255,255`: 21,00 con alfa 1 y 5,32 con alfa 0,5 | `255,0,110`: 5,30 con alfa 1 y 1,96 con alfa 0,5 | `31,110,46`: 3,01 con alfa 1 y 1,62 con alfa 0,5 |

Todos los objetos jugables pasan de 3:1 y todos los textos pasan de 4,5:1 en los tres skins. Los tres `bg` tienen luminancia ≤ 0,05. Las partículas son decoración: no tienen mínimo y se dibujan **antes** que todo lo demás, así que nunca tapan un objeto jugable.

### Retro bajo las scanlines

`retro` pinta una línea negra de 1 px con alfa 0,2 cada 3 px sobre todo el frame. En las filas que tapa, el color y el fondo se oscurecen a la vez. Este es el contraste en el peor caso, sobre esas filas:

| Rol                                       | Contraste sin scanline | Contraste bajo scanline (α 0,2) |
| ----------------------------------------- | ---------------------- | ------------------------------- |
| `ship` / `bullet` / `hud` / `powerupText` | 16,67                  | 10,71                           |
| `thrust`                                  | 12,81                  | 8,36                            |
| `powerup`                                 | 9,97                   | 6,60                            |
| `asteroid`                                | 5,23                   | **3,66**                        |
| `particleRgb` (alfa 1)                    | 3,01                   | 2,28 (decoración)               |

Incluso en el peor caso, todos los objetos jugables siguen por encima de 3:1 y todo el texto por encima de 4,5:1.

### Distinción entre elementos

Contraste entre pares de objetos que el jugador tiene que distinguir, junto con el tono (en grados de matiz HSL; «—» significa acromático):

| Par                  | clásico         | neón               | retro                           |
| -------------------- | --------------- | ------------------ | ------------------------------- |
| nave / asteroide     | 1,00 (— / —)    | 2,83 (182° / 334°) | 3,19 (mismo tono)               |
| nave / power-up      | 1,25 (— / 180°) | 1,09 (182° / 45°)  | 1,67 (mismo tono)               |
| asteroide / power-up | 1,25 (— / 180°) | 2,60 (334° / 45°)  | 1,91 (mismo tono)               |
| nave / bala          | 1,00 (— / —)    | 1,35 (182° / —)    | 1,00 (mismo color, a propósito) |

- **neón**: los únicos pares con luminancia parecida tienen tonos opuestos. Nave y power-up son cian y oro, en lados opuestos del eje azul-amarillo, que se conserva en la protanopia y la deuteranopia. Nave y bala son cian saturado y blanco acromático. No hay ningún par rojo-verde.
- **retro**: es monocromo, así que toda la distinción va por luminancia, en cuatro niveles separados: asteroide (L = 0,24), power-up (0,50), propulsor (0,66) y nave/bala (0,87). La bala comparte color con la nave a propósito, porque es «lo tuyo» y se distingue por forma (un punto de 2 px que sale de la nariz).
- **clásico**: nave, asteroides y balas son blancos, igual que en el Asteroids original y que el motor de hoy. Se distinguen por forma, tamaño y movimiento, no por color. Esta es la única excepción al criterio de distinción, y se mantiene para no cambiar el aspecto por defecto (ver _Decisiones_).

### Valores completos de cada skin

| Campo                            | clásico                 | neón                    | retro                     |
| -------------------------------- | ----------------------- | ----------------------- | ------------------------- |
| `blur.ship`                      | 0                       | 10                      | 0                         |
| `blur.thrust`                    | 0                       | 8                       | 0                         |
| `blur.asteroid`                  | 0                       | 8                       | 0                         |
| `blur.bullet`                    | 0                       | 6                       | 0                         |
| `blur.powerup`                   | 0                       | 12                      | 0                         |
| `blur.hud`                       | 0                       | 4                       | 0                         |
| `line.ship` / `line.asteroid`    | 1,5 / 1,5               | 1,5 / 1,5               | 2 / 2                     |
| `line.powerup` / `line.particle` | 2 / 1                   | 2 / 1                   | 2 / 1                     |
| `lineJoin`                       | `"round"`               | `"round"`               | `"miter"`                 |
| `hudFont`                        | `"15px monospace"`      | `"15px monospace"`      | `"bold 15px monospace"`   |
| `powerupFont`                    | `"bold 12px monospace"` | `"bold 12px monospace"` | `"bold 12px monospace"`   |
| `fx.glow`                        | 0                       | 1                       | 0                         |
| `fx.scanlines`                   | `null`                  | `null`                  | `{ alpha: 0.2, step: 3 }` |

`shadowColor` es siempre el mismo color del rol que se dibuja: la nave brilla en cian, los asteroides en magenta, y así con los demás. El `shadowBlur` efectivo es `blur.<rol> × fx.glow`.

Retro usa 6 colores: `#031407`, `#1f6e2e`, `#2a9a3e`, `#5fd36f`, `#8fe89a` y `#c4ffc4`. Son todos de fósforo verde, sin brillo ni degradados.

---

## Colores escritos a mano que hay que llevar a `palettes.ts`

| Archivo:línea                   | Valor actual                                          | Rol en la paleta |
| ------------------------------- | ----------------------------------------------------- | ---------------- |
| `lib/asteroids/engine.ts:248`   | `ctx.fillStyle = "#000"`                              | `bg`             |
| `lib/asteroids/engine.ts:257`   | `ctx.font = "15px monospace"`                         | `hudFont`        |
| `lib/asteroids/engine.ts:260`   | `ctx.fillStyle = "#0ff"` (temporizador «3x»)          | `hud`            |
| `lib/asteroids/entities.ts:51`  | `ctx.fillStyle = "#fff"` (`Bullet.draw`)              | `bullet`         |
| `lib/asteroids/entities.ts:104` | `ctx.strokeStyle = "#fff"` (`Asteroid.draw`)          | `asteroid`       |
| `lib/asteroids/entities.ts:105` | `ctx.lineWidth = 1.5` (asteroide)                     | `line.asteroid`  |
| `lib/asteroids/entities.ts:106` | `ctx.lineJoin = "round"` (asteroide)                  | `lineJoin`       |
| `lib/asteroids/entities.ts:145` | `ctx.strokeStyle = "#0ff"` (`PowerUp.draw`, rombo)    | `powerup`        |
| `lib/asteroids/entities.ts:146` | `ctx.lineWidth = 2` (rombo)                           | `line.powerup`   |
| `lib/asteroids/entities.ts:150` | `ctx.fillStyle = "#0ff"` (texto «3x»)                 | `powerupText`    |
| `lib/asteroids/entities.ts:151` | `ctx.font = "bold 12px monospace"`                    | `powerupFont`    |
| `lib/asteroids/entities.ts:220` | `ctx.strokeStyle = "#fff"` (`Ship.draw`)              | `ship`           |
| `lib/asteroids/entities.ts:221` | `ctx.lineWidth = 1.5` (nave)                          | `line.ship`      |
| `lib/asteroids/entities.ts:222` | `ctx.lineJoin = "round"` (nave)                       | `lineJoin`       |
| `lib/asteroids/entities.ts:237` | `ctx.strokeStyle = "rgba(255, 130, 0, 0.85)"` (llama) | `thrust`         |
| `lib/asteroids/entities.ts:270` | `` `rgba(255,255,255,${alpha})` `` (`Particle.draw`)  | `particleRgb`    |
| `lib/asteroids/entities.ts:271` | `ctx.lineWidth = 1` (partícula)                       | `line.particle`  |

Cuando termine este spec, `grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(" lib/asteroids/engine.ts lib/asteroids/entities.ts` no debe devolver nada salvo la plantilla `` `rgba(${pal.particleRgb},${alpha})` ``.

### Efectos según el skin

- **Brillo** (`withGlow`): solo con `fx.glow > 0`, es decir, solo en `neon`. Se aplica a nave, llama, asteroides, balas, rombo, texto «3x» y temporizador. **Nunca** a las partículas, por rendimiento: una explosión grande llega a crear 15 partículas y una muerte, 14.
- **Scanlines** (`drawScanlines`): solo con `fx.scanlines !== null`, es decir, solo en `retro`. Se dibujan al final de `draw()`, encima de todo, y también encima del temporizador.
- **Parpadeos existentes**: la nave invencible (`entities.ts:215`) y el power-up que caduca (`entities.ts:140`) alternan 8 veces por segundo, lo que da 4 destellos por segundo. Afectan a un objeto de menos de 30 px, no a la pantalla completa, así que no incumplen la regla de destellos. No cambian según el skin. La llama del propulsor (`entities.ts:232`, aleatoria) tampoco cambia.

---

## Plan de implementación

1. **Paletas.** Crear `lib/asteroids/palettes.ts` con `AsteroidsPalette` y `PALETTES` usando los valores exactos de las tablas. `clasico` reproduce los valores actuales tal cual, incluido el texto `"rgba(255, 130, 0, 0.85)"` de la llama. Todavía no lo importa nadie. Verificación: `npx tsc --noEmit`.
2. **Entidades con paleta.** Cambiar `Bullet.draw`, `Asteroid.draw`, `PowerUp.draw`, `Ship.draw` y `Particle.draw` a `draw(ctx, pal: AsteroidsPalette)` y sustituir cada valor de la tabla de colores escritos a mano por su rol. `Bullet.draw` pasa a envolver su dibujo en `save()`/`restore()`, como ya hacen los demás. El brillo todavía no se aplica. En `engine.ts`, `draw()` pasa `PALETTES.clasico`, usa `pal.bg`, `pal.hud` y `pal.hudFont`, y mantiene el orden actual: partículas, asteroides, power-ups, balas, nave. Verificación: `npx tsc --noEmit`, y ROCAS se ve igual que en `main` (comparar capturas de Playwright del mismo momento: inicio, propulsor encendido, power-up en pantalla y explosión).
3. **Skin en el motor.** `createAsteroidsGame(canvas, callbacks, skin?: SkinId)` guarda `let pal = PALETTES[skin ?? DEFAULT_SKIN]`. `setSkin(s)` asigna `pal = PALETTES[s] ?? PALETTES.clasico` y, si el motor está en pausa o destruido, no arranca el bucle. En pausa llama a `draw()` una vez para que el cambio se vea. `restart()` e `initGame()` **no** tocan `pal`. Verificación: `npx tsc --noEmit`. Forzar `skin = "neon"` a mano en local, sin commit: los colores cambian y el juego no se reinicia.
4. **Efectos.** Envolver con `withGlow(ctx, color, pal.blur.<rol> * pal.fx.glow, …)` el trazo de nave, llama, asteroide, bala, rombo, texto «3x» y temporizador, y llamar a `drawScanlines(ctx, W, H, pal.fx.scanlines)` al final de `draw()`. Con `clasico` ninguna de las dos funciones toca el contexto. Verificación: `npm run lint` y `npx tsc --noEmit`. En local, neón brilla y retro muestra scanlines. Medir con el panel de rendimiento del navegador un nivel 6 en neón (9 asteroides grandes que se parten) y comprobar que no baja de 60 fps en un portátil normal.
5. **Registro.** Poner `skins: ["clasico", "neon", "retro"]` en `GAME_REGISTRY.rocas`. A partir de aquí el selector de skins/00 aparece en `/juegos/rocas/jugar`. Verificación: con Playwright, en `/juegos/rocas/jugar`, cambiar entre los tres skins durante la partida, con y sin pausa. La puntuación, las vidas y el nivel del HUD no cambian, y tras recargar se recupera el último skin.
6. **Cierre.** Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores. El `grep` de colores de este spec solo devuelve la plantilla de partículas, y CAÍDA, BLOQUE BUSTER y SERPENTINA se ven igual que en `main`.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Con `clasico`, ROCAS se ve igual que antes: fondo `#000`, nave, asteroides y balas `#fff`, power-up y temporizador `#0ff`, llama `rgba(255, 130, 0, 0.85)`, partículas blancas con alfa y grosores 1,5 / 2 / 1. No hay correcciones de contraste en `clasico` porque ya cumple.
- [ ] `lib/asteroids/palettes.ts` exporta `PALETTES` con las claves `clasico`, `neon` y `retro` y los valores exactos de la tabla de paletas.
- [ ] Las ratios de la tabla de paletas se cumplen: cada objeto jugable ≥ 3:1 y cada texto ≥ 4,5:1 contra el `bg` de su skin, y en `retro` también bajo la scanline.
- [ ] Los tres `bg` tienen luminancia relativa ≤ 0,05.
- [ ] `engine.ts` y `entities.ts` no contienen literales de color salvo la plantilla de partículas (comprobable con el `grep` de este spec).
- [ ] En `neon` hay `shadowBlur > 0` en nave, llama, asteroides, balas, power-up y textos, y `shadowBlur === 0` en partículas. En `clasico` y `retro`, `shadowBlur` es 0 en todo el frame.
- [ ] Solo `retro` dibuja scanlines en el canvas.
- [ ] Al cambiar de skin en mitad de la partida no se reinicia ni cambia la puntuación, y `PAUSA`/`REANUDAR` sigue funcionando.
- [ ] Al cambiar de skin en pausa, el canvas muestra el skin nuevo sin que avance la partida.
- [ ] `JUGAR DE NUEVO` conserva el skin elegido.
- [ ] `GAME_REGISTRY.rocas.skins` es `["clasico", "neon", "retro"]` y el selector aparece en `/juegos/rocas/jugar`.
- [ ] La fila que guarda `saveScore` es idéntica con cualquier skin.
- [ ] Ningún otro juego cambia.

---

## Decisiones

- **Sí:** `clasico` se queda exactamente como hoy y no lleva ninguna corrección de contraste. El peor color jugable, la llama, da 6,22:1. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** en `clasico`, nave, asteroides y balas siguen siendo del mismo blanco (contraste 1,00 entre ellos), aunque el criterio pide distinguir los elementos por algo más que el color. Se distinguen por forma, tamaño y movimiento, como en el original, y cambiarlo rompería la regla de que `clasico` no cambia. Si el usuario prefiere corregirlo, la opción mínima es asteroides en `#c7d0e0` (`--silver`, 13,53:1 sobre `#000`), que dan 1,55:1 frente a la nave. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** neón asigna un token del portal a cada objeto: nave `--cyan`, asteroides `--magenta`, power-up y temporizador `--gold`, propulsor `--yellow`, y las balas en blanco. Cian/verde y oro/amarillo se parecen entre sí, así que de cada pareja solo se usa un color en objetos que el jugador debe distinguir. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** el fondo de neón es `#05050a`, negro casi puro con un leve tinte azul, igual que `--bg` pero más oscuro, para que el brillo destaque más.
- **Sí:** intensidad del brillo moderada: `shadowBlur` de 6 a 12 px y trazos de 1,5 px. Se regula con un solo número (`fx.glow`). **(decidido por skin-designer, pendiente de revisar)**
- **No:** brillo en las partículas. Son decoración, y `shadowBlur` en decenas de trazos por frame es lo más caro del canvas 2D.
- **Sí:** retro es fósforo verde monocromo (6 tonos, P1), porque recuerda a los monitores vectoriales de la época del Asteroids original. **(decidido por skin-designer, pendiente de revisar)**
- **No:** ámbar o una paleta de 8 bits. Son buenas alternativas al verde: el ámbar funcionaría con los mismos cuatro niveles de luminancia, y la de 8 bits exigiría un fondo azul que choca con el CRT negro.
- **Sí:** en retro la bala comparte color con la nave, porque es «lo tuyo» y se distingue por forma.
- **Sí:** las scanlines de retro se dibujan en el canvas (α 0,2 cada 3 px), aunque `.crt-screen::after` ya pone scanlines CSS a todos los juegos. Así el skin se distingue y el contraste se ha medido en el peor caso. Si se ven demasiado oscuras, se puede bajar a α 0,12. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** retro usa trazos de 2 px y uniones en ángulo (`miter`) para dar un aire más «pixel» sin cambiar las siluetas.
- **No:** cambiar formas, tamaños de colisión o radios según el skin. Un skin nunca cambia las reglas.
- **No:** usar Press Start 2P en el canvas. `next/font` le pone a la familia un nombre con hash, y cargarla a mano en el motor añade una dependencia del DOM. Se queda en `monospace`.

---

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadowBlur` baja los fps en niveles altos con neón                        | Brillo solo en objetos jugables y no en partículas, y prueba de rendimiento en el paso 4. Si baja de 60 fps, se reduce `fx.glow`.           |
| `shadowBlur` se queda activo en el contexto                                | Todo dibujo con brillo pasa por `withGlow`, que incluye `save()`/`restore()`. `Bullet.draw` gana su propio `save()`/`restore()`.            |
| Retro se ve demasiado oscuro por las dos capas de scanlines (canvas y CSS) | Contraste medido bajo la scanline del canvas (el peor objeto, el asteroide, da 3,66:1). Si hace falta, se baja `alpha` sin tocar la paleta. |
| Regresión visual en `clasico` al mover los literales                       | El paso 2 compara capturas con `main` antes de añadir ningún skin.                                                                          |
| El magenta de los asteroides de neón (5,30:1) se lee peor que el blanco    | Cumple 3:1 con margen y el brillo magenta lo refuerza. Si molesta en pruebas, se puede subir a `#ff3d8b` (6,09:1), muy cerca del token.               |

---

## Qué **no** está en este spec

- El sistema de skins compartido (tipos, contrato, selector y persistencia): eso es `skins/00-sistema-skins`.
- Skins de CAÍDA, BLOQUE BUSTER y SERPENTINA.
- Siluetas nuevas, sprites, OVNIs o cualquier cambio de jugabilidad en ROCAS.
- Un HUD de puntuación dibujado en el canvas.
