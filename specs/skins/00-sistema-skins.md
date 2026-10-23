# SKINS · SPEC 00 — Sistema de skins compartido

> **Estado:** Implemented
> **Depende de:** SPEC 09
> **Fecha:** 2026-10-22
> **Objetivo:** Dar a la plataforma y al contrato de motores un sistema común de skins (`clasico`, `neon`, `retro`) que se elige en el player, se guarda por juego y se aplica en caliente, sin cambiar el aspecto de ningún juego mientras su spec de paletas no se implemente.

---

## Por qué existe este spec

Los cuatro motores reales (ROCAS, CAÍDA, BLOQUE BUSTER, SERPENTINA) dibujan con colores escritos a mano dentro de su código y el contrato de `lib/engine/types.ts` no permite cambiarlos. Para que cada juego ofrezca tres skins hace falta antes una base común: un tipo `SkinId`, la forma en que el motor recibe y cambia el skin, la declaración en el registro, el selector del player y la persistencia de la elección.

Este spec solo crea esa base. **No cambia el aspecto de ningún juego.** Cada juego gana sus paletas `neon` y `retro` en su propio spec (`skins/NN-skins-<game-id>`).

---

## Alcance

**Dentro:**

- `lib/engine/skins.ts`: tipo `SkinId`, lista `SKINS` con los nombres en español, `DEFAULT_SKIN` y el guard `isSkinId`.
- `lib/engine/skin-fx.ts`: utilidades de dibujo compartidas por los motores, que son el brillo de neón (`shadowBlur`/`shadowColor`) y las scanlines de retro.
- `lib/engine/skin-preference.ts`: lectura y escritura de la preferencia por juego en `localStorage`, con `try/catch`, como store externo para `useSyncExternalStore`.
- Cambio en el contrato: `CreateEngine(canvas, callbacks, skin?)` y `GameEngine.setSkin(skin)`.
- Implementación mínima de `setSkin` en los cuatro motores: aceptan el skin y no cambian nada, para que el contrato compile.
- `GameEntry.skins: SkinId[]` en `components/games/registry.ts`. Los cuatro juegos declaran `["clasico"]`.
- `GameCanvas` pasa el skin inicial como tercer argumento.
- `GamePlayer` guarda el skin elegido, lo aplica con `setSkin` y muestra el selector `SKIN: CLÁSICO / NEÓN / RETRO` solo cuando el juego declara más de un skin.

**Fuera de alcance (para otros specs):**

- Las paletas concretas de cada juego y la migración de sus colores a `lib/<juego>/palettes.ts`: un spec por juego (`skins/01-skins-rocas`, y los que vengan para `caida`, `bloque-buster` y `serpentina`).
- Skins para las simulaciones de `GamePlayer` y para las portadas `cover-*`.
- Guardar la preferencia en Supabase o sincronizarla entre dispositivos.
- Un tema claro del portal.

---

## Modelo de datos

**No hay datos nuevos en la base.** No hay migraciones, y `scores`, `saveScore` y las vistas no cambian. El skin es cosmético y nunca viaja al servidor.

Datos en el cliente:

```ts
// lib/engine/skins.ts
export type SkinId = "clasico" | "neon" | "retro";
export const SKINS: readonly { id: SkinId; label: string }[] = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "neon", label: "NEÓN" },
  { id: "retro", label: "RETRO" },
];
export const DEFAULT_SKIN: SkinId = "clasico";
export function isSkinId(v: unknown): v is SkinId;
```

```ts
// lib/engine/types.ts (cambios)
export interface GameEngine {
  // …lo que ya existe…
  setSkin(skin: SkinId): void; // cambia la paleta en caliente; no toca estado ni puntuación
}
export type CreateEngine = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin?: SkinId, // sin valor → "clasico"
) => GameEngine;
```

```ts
// lib/engine/skin-fx.ts
export interface SkinFx {
  glow: number; // multiplicador de shadowBlur; 0 = sin brillo (clásico y retro)
  scanlines: { alpha: number; step: number } | null; // solo retro
}
export function withGlow(
  ctx,
  color: string,
  blur: number,
  draw: () => void,
): void; // save/restore incluidos
export function drawScanlines(
  ctx,
  w: number,
  h: number,
  s: SkinFx["scanlines"],
): void; // no-op con null
```

Persistencia en `localStorage`:

- Clave `av:skin:<game-id>` (por ejemplo `av:skin:rocas`), valor `SkinId` en texto plano.
- Toda lectura y escritura va dentro de `try/catch`, porque en modo privado o con el almacenamiento bloqueado lanza una excepción. Si falla, se usa el estado en memoria.
- Si el valor guardado no pasa `isSkinId` o el juego no lo declara en `skins`, se usa `clasico`.

---

## Plan de implementación

1. **Tipos.** Crear `lib/engine/skins.ts` con `SkinId`, `SKINS`, `DEFAULT_SKIN` e `isSkinId`. No lo importa nadie todavía. Verificación: `npx tsc --noEmit`.
2. **Contrato y motores.** Añadir `setSkin(skin: SkinId): void` a `GameEngine` y el tercer parámetro opcional `skin?: SkinId` a `CreateEngine`. Añadir a cada uno de los cuatro motores (`lib/asteroids/engine.ts`, `lib/caida/engine.ts`, `lib/bloque-buster/engine.ts`, `lib/serpentina/engine.ts`) un `setSkin()` que de momento no hace nada, con un comentario que remita a su spec de skins. Las firmas `create*Game(canvas, callbacks)` siguen siendo compatibles porque el parámetro es opcional. Verificación: `npx tsc --noEmit`, y los cuatro juegos se ven igual en el navegador.
3. **Efectos compartidos.** Crear `lib/engine/skin-fx.ts` con `SkinFx`, `withGlow` y `drawScanlines`. `withGlow` envuelve el dibujo en `save()`/`restore()` para que `shadowBlur` nunca se quede activo en el contexto, y si `blur` vale 0 dibuja sin tocar `shadow*`. `drawScanlines` pinta una línea horizontal de 1 px de `rgba(0,0,0,alpha)` cada `step` px y no hace nada con `null`. Todavía no la usa nadie. Verificación: `npx tsc --noEmit` y `npm run lint`.
4. **Registro.** Añadir `skins: SkinId[]` a `GameEntry` y poner `skins: ["clasico"]` en `rocas`, `caida`, `bloque-buster` y `serpentina`. Verificación: `npx tsc --noEmit`.
5. **Preferencia.** Crear `lib/engine/skin-preference.ts` con `readSkin(gameId, allowed)`, `writeSkin(gameId, skin)` y `subscribeSkin(cb)`. `subscribeSkin` escucha el evento `storage` y los avisos internos de `writeSkin`. Todo va en `try/catch`. Verificación: `npx tsc --noEmit` y `npm run lint`.
6. **GameCanvas.** Añadir la prop `skin: SkinId`, guardarla en una ref (`skinRef`, que se sincroniza en el mismo efecto que `callbacksRef`) y pasar `skinRef.current` como tercer argumento de `createEngine`. **No** se añade `skin` a las dependencias del efecto que crea el motor, porque recrearlo reiniciaría la partida. Verificación: `npx tsc --noEmit`, y los juegos arrancan igual.
7. **GamePlayer.** Leer el skin con `useSyncExternalStore(subscribeSkin, () => readSkin(id, entry.skins), () => DEFAULT_SKIN)`. La instantánea del servidor es `clasico`, así que no hay desajuste de hidratación ni `setState` dentro de un efecto. Mantener una `skinRef` como ya se hace con `mutedRef`, aplicar `game.setSkin(skin)` en `handleReady` y cada vez que cambie el skin, y llamar a `writeSkin` al elegir uno. Verificación: con `skins: ["clasico"]` en todos los juegos no aparece ningún selector y nada cambia; `npm run lint` pasa.
8. **Selector.** Diseñarlo con `/frontend-design`. Es un bloque `hud-stat` con la etiqueta `Skin` y tres botones `btn ghost` pequeños (`CLÁSICO`, `NEÓN`, `RETRO`) con `aria-pressed` en el activo, dentro de `player-hud` y junto a los stats. Se muestra solo si `entry.skins.length > 1` y solo ofrece los skins declarados. Si hace falta CSS nuevo, va en `app/globals.css` y reutiliza los tokens existentes. Para comprobarlo se pone temporalmente `skins: ["clasico", "neon", "retro"]` en un juego, sin hacer commit. Verificación: el selector se ve, cambia `aria-pressed`, escribe `av:skin:<id>` en `localStorage` y la pausa no se pierde.
9. **Cierre.** Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores. Recorrer los cuatro juegos con Playwright y comprobar que se ven igual que en `main`.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `lib/engine/skins.ts` exporta `SkinId`, `SKINS` (con las etiquetas `CLÁSICO`, `NEÓN` y `RETRO`), `DEFAULT_SKIN = "clasico"` e `isSkinId`.
- [ ] `GameEngine` declara `setSkin(skin: SkinId): void` y `CreateEngine` acepta un tercer parámetro opcional `skin?: SkinId`.
- [ ] Los cuatro motores implementan `setSkin` y, con `clasico` o sin skin, se ven igual que antes píxel a píxel.
- [ ] Cada entrada de `GAME_REGISTRY` tiene `skins` con `"clasico"` incluido.
- [ ] Con `skins: ["clasico"]` el player no muestra el selector.
- [ ] Con más de un skin declarado, el selector aparece, marca el activo con `aria-pressed="true"` y solo ofrece los skins declarados.
- [ ] Al cambiar de skin en mitad de la partida no se reinicia ni cambia la puntuación, y `PAUSA`/`REANUDAR` sigue funcionando.
- [ ] La elección se guarda en `localStorage` con la clave `av:skin:<game-id>` y se recupera al recargar.
- [ ] Con `localStorage` bloqueado o con un valor no válido, el juego arranca en `clasico` sin errores en la consola.
- [ ] `JUGAR DE NUEVO` conserva el skin elegido.
- [ ] El skin no aparece en la llamada a `saveScore` ni en ninguna fila de `scores`.
- [ ] Ningún juego cambia de aspecto con este spec.

---

## Decisiones

- **Sí:** el skin llega como tercer parámetro opcional de `CreateEngine` y además existe `setSkin` en `GameEngine`. El parámetro evita que el primer frame salga con `clasico` y después cambie, y `setSkin` permite cambiar en caliente sin recrear el motor ni reiniciar la partida.
- **No:** recrear el motor al cambiar de skin. Reiniciaría la partida y la puntuación.
- **No:** `setSkin?` opcional en el contrato. Con un método obligatorio, todos los motores lo implementan y el player no necesita comprobar si existe. El coste son cuatro métodos vacíos en el paso 2.
- **Sí:** si el motor está en pausa, `setSkin` vuelve a dibujar un frame sin avanzar la lógica, para que el cambio se vea bajo el velo de pausa. Cada spec por juego lo detalla.
- **Sí:** las paletas viven en `lib/<juego>/palettes.ts` como `Record<SkinId, Palette>`, con un tipo `Palette` propio de cada juego. No hay un tipo de paleta global, porque los roles de cada juego son distintos (piezas, ladrillos, asteroides).
- **Sí:** el brillo y las scanlines se implementan una sola vez en `lib/engine/skin-fx.ts` y los usan todos los motores.
- **Sí:** la preferencia se guarda por juego en `localStorage` (`av:skin:<id>`) y no por usuario en Supabase. No necesita sesión ni migración. **(decidido por skin-designer, pendiente de revisar)**
- **Sí:** se lee con `useSyncExternalStore` y la instantánea del servidor es `clasico`. Así no hay desajuste de hidratación y no se hace `setState` dentro de un efecto, que el preset de `react-hooks` podría marcar.
- **Sí:** el selector aparece solo si el juego declara más de un skin. Así este spec puede llegar a `main` sin enseñar opciones que todavía no hacen nada.
- **Sí:** las etiquetas visibles son `CLÁSICO`, `NEÓN` y `RETRO`, con tilde. Los ids no llevan tilde.
- **No:** guardar el skin junto a la puntuación. El skin no afecta a las reglas ni a la puntuación y los leaderboards no lo distinguen.

---

## Riesgos

| Riesgo                                                                                 | Mitigación                                                                                                                          |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `shadowBlur` se queda activo en el contexto y emborrona o ralentiza el resto del frame | `withGlow` siempre hace `save()`/`restore()`; con `glow = 0` no se toca `shadow*`.                                                  |
| Brillo de neón caro con muchas entidades                                               | Cada spec por juego limita el brillo a los objetos jugables, sin partículas, y lo prueba con el peor caso de entidades en pantalla. |
| Las scanlines del canvas se suman a las de `.crt-screen::after`                        | `drawScanlines` usa un alfa bajo y cada spec mide el contraste también bajo la scanline.                                            |
| `localStorage` lanza una excepción (modo privado, cuota llena, bloqueado)              | Todo acceso va en `try/catch` y, si falla, se usa `clasico` o el estado en memoria.                                                 |
| Un frame con `clasico` antes de aplicar la preferencia                                 | El skin se pasa como tercer argumento al crear el motor.                                                                            |
| El cambio de contrato rompe un motor                                                   | Paso 2: los cuatro motores ganan `setSkin` en el mismo commit que el tipo.                                                          |

---

## Qué **no** está en este spec

- Las paletas `neon` y `retro` de cualquier juego, y la retirada de sus colores escritos a mano. Eso va en `skins/01-skins-rocas` y en un spec por cada uno de los otros juegos.
- Skins para las simulaciones o para las portadas del catálogo.
- Preferencia sincronizada en la cuenta del usuario.
- Skins desbloqueables o asociados a logros.
