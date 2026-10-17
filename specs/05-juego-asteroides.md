# SPEC 05 — Juego Asteroides en ROCAS

> **Estado:** Draft
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-17
> **Objetivo:** Portar el juego de `references/started-games/02-asteroids/` a TypeScript y ejecutarlo en `/juegos/rocas/jugar`, integrado con el HUD, la pausa y el modal de fin de partida de la plataforma, con efectos de sonido sintetizados.

---

## Por qué existe este spec

`GamePlayer` simula una partida: la puntuación sube sola y el área de juego es decorativa. Este es el primer juego real de la plataforma, así que fija el patrón que seguirán los demás (Tetris, Arkanoid): un motor en módulos TS, independiente de React, que se monta sobre un `<canvas>` y se comunica con el HUD mediante callbacks.

El pedido inicial incluía guardar la puntuación con login. Eso exige autenticación, esquema con RLS y escritura de datos, y se acordó dividirlo en tres specs. Esta es la primera; no persiste nada.

---

## Alcance

**Dentro:**

- Portar `game.js` a módulos TypeScript en `lib/asteroids/`, sin globales ni acceso a `document` en el motor.
- Motor con API `createAsteroidsGame(canvas, callbacks)` que devuelve `{ pause, resume, end, restart, setMuted, destroy }`.
- Mantener la jugabilidad original: nave con rotación, empuje e inercia, disparo con cooldown, asteroides de 3 tamaños que se dividen, power-up de triple disparo, vidas, niveles, invencibilidad al reaparecer y envoltura de pantalla.
- Controles de teclado del original: flechas izquierda/derecha para rotar, arriba para empujar, Espacio para disparar. Se evita el scroll de la página con esas teclas mientras se juega.
- El HUD de la plataforma (`Puntuación`, `Vidas`, `Nivel`) se alimenta de callbacks del motor. El canvas ya no dibuja `SCORE`, `NIVEL` ni las vidas.
- Los botones `PAUSA`/`REANUDAR` y `FIN` del HUD controlan el motor. El motor al quedarse sin vidas dispara el modal `FIN DEL JUEGO` ya existente. `JUGAR DE NUEVO` reinicia el motor.
- Canvas con resolución lógica fija de 800×600 y escalado por CSS al ancho del contenedor.
- Efectos de sonido sintetizados con Web Audio API (disparo, explosión de asteroide, recoger power-up, muerte de la nave y fin de partida) y botón de silencio en el HUD.
- `GamePlayer` usa el motor solo para el juego `rocas`. Los demás juegos conservan la simulación actual.

**Fuera de alcance (para otros specs):**

- Autenticación y sesión de usuario (spec 06 prevista).
- Tabla `scores`, RLS, migraciones y guardar la puntuación en Supabase (spec 07 prevista). `GUARDAR PUNTUACIÓN` sigue cambiando solo estado local, como en la spec 01.
- Leer puntuaciones reales para `/salon` o para el campo `best` de ROCAS.
- Controles táctiles.
- Archivos de audio, música de fondo y persistencia de la preferencia de silencio.
- Tecla de pausa en el teclado.
- Los OVNIs que menciona el texto largo de ROCAS en `lib/games.ts`, que no existen en el juego original.
- Portar Tetris y Arkanoid de `references/started-games/`.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

Estado de la partida, interno al motor (no se persiste):

```ts
// lib/asteroids/types.ts
export type Phase = "playing" | "dead" | "gameover";

export interface AsteroidsCallbacks {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsGame {
  pause(): void;
  resume(): void;
  end(): void; // termina la partida y dispara onGameOver
  restart(): void; // partida nueva: score 0, vidas 3, nivel 1
  setMuted(muted: boolean): void;
  destroy(): void; // cancela el loop y quita listeners
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame;
```

Constantes que se conservan del original:

| Constante            | Valor                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| Resolución lógica    | 800 × 600                                                                     |
| Vidas iniciales      | 3                                                                             |
| Asteroides nivel 1   | 4; luego `3 + nivel`                                                          |
| Radios por tamaño    | `[0, 16, 30, 50]`                                                             |
| Puntos por tamaño    | `[0, 100, 50, 20]`                                                            |
| Velocidad de la bala | 520 px/s, vida 1,1 s                                                          |
| Power-up             | 12 s en pantalla, 5 s de efecto, 15 % de caída y garantizado al 5.º asteroide |

Convenciones:

- Coordenadas con origen arriba a la izquierda.
- Las velocidades se expresan en px/s y se multiplican por `dt`, con `dt` limitado a 0,05 s.
- El motor llama a cada callback solo cuando el valor cambia.

---

## Mapa de rutas

| Pantalla | Ruta                  | Archivo                          | Tipo                           |
| -------- | --------------------- | -------------------------------- | ------------------------------ |
| Jugar    | `/juegos/rocas/jugar` | `app/juegos/[id]/jugar/page.tsx` | Sin cambios (Server → cliente) |

Archivos nuevos:

- `lib/asteroids/types.ts`: tipos y constantes.
- `lib/asteroids/entities.ts`: `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`, recibiendo el contexto de dibujo por parámetro.
- `lib/asteroids/audio.ts`: efectos con Web Audio; crea el `AudioContext` de forma diferida tras el primer gesto del usuario.
- `lib/asteroids/engine.ts`: bucle, estado, colisiones, entrada y `createAsteroidsGame`.
- `components/AsteroidsCanvas.tsx` (cliente): monta el `<canvas>`, crea el motor en `useEffect` y lo destruye al desmontar.

Archivos que cambian:

- `components/GamePlayer.tsx`: para `id === "rocas"` sustituye la simulación por `AsteroidsCanvas` y conecta HUD, pausa, `FIN`, reinicio y silencio.
- `app/globals.css`: clase para el canvas (ancho 100 %, relación 4:3) dentro de `.crt-screen`.

`lib/games.ts` no cambia. El favicon de la referencia no se copia.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components y de ESLint/React vigente (reglas de `useEffect` y refs en React 19.2). Revisar `components/GamePlayer.tsx` y las clases `.crt`, `.crt-screen` y `.game-arena` de `app/globals.css` antes de tocar el layout.

1. Crear `lib/asteroids/types.ts` y `lib/asteroids/entities.ts`, portando las clases del original tipadas. Verificación: `npx tsc --noEmit` pasa.
2. Crear `lib/asteroids/engine.ts` con el bucle, la entrada, las colisiones y el dibujo (sin HUD), y `createAsteroidsGame` con callbacks. Verificación: `npx tsc --noEmit` pasa.
3. Crear `components/AsteroidsCanvas.tsx` y añadir la clase de escalado en `app/globals.css`. Verificación: `npm run build` pasa.
4. Conectar `GamePlayer` para `rocas`: HUD por callbacks, `PAUSA`/`REANUDAR`, `FIN`, modal de fin y `JUGAR DE NUEVO`. Los otros juegos mantienen la simulación. Verificación: en `/juegos/rocas/jugar` la nave se mueve y dispara, y en `/juegos/ranaria/jugar` sigue la simulación.
5. Crear `lib/asteroids/audio.ts`, engancharlo a los eventos del motor y añadir el botón de silencio al HUD. Verificación: se oyen los cinco efectos y el botón los silencia.
6. Revisar con `npm run lint` y `npm run build`, y comprobar que al salir de la página no quedan loops ni listeners activos. Verificación: ambos comandos pasan.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `/juegos/rocas/jugar` muestra el juego en un canvas y no la simulación anterior.
- [ ] La nave rota con las flechas izquierda/derecha, avanza con la flecha arriba y dispara con Espacio, con un cooldown de 0,2 s.
- [ ] Pulsar flechas o Espacio durante la partida no hace scroll de la página.
- [ ] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100, y el valor aparece en `Puntuación` del HUD.
- [ ] Un asteroide grande se divide en dos medianos y uno mediano en dos pequeños; uno pequeño no se divide.
- [ ] Al chocar con un asteroide fuera del periodo de invencibilidad, el HUD baja una vida y la nave reaparece tras 2 s con 3 s de invencibilidad.
- [ ] Al destruir todos los asteroides sube el nivel en el HUD y aparecen `3 + nivel` asteroides.
- [ ] Al llegar a 0 vidas aparece el modal `FIN DEL JUEGO` con la puntuación final correcta.
- [ ] `PAUSA` congela el juego, muestra `EN PAUSA` y `REANUDAR` lo continúa sin saltos.
- [ ] `FIN` abre el modal con la puntuación actual y `JUGAR DE NUEVO` empieza una partida con puntuación 0, 3 vidas y nivel 1.
- [ ] El power-up `3x` activa el disparo triple durante 5 s y el canvas muestra el temporizador.
- [ ] El botón de silencio activa y desactiva todos los sonidos y no se oye nada antes de la primera pulsación de tecla o clic.
- [ ] El canvas dibuja a 800×600 lógicos y, con ancho de ventana menor a 768 px, se escala sin scroll horizontal.
- [ ] Al navegar fuera de `/juegos/rocas/jugar` no quedan listeners de teclado ni un `requestAnimationFrame` activo (comprobable al volver y jugar sin velocidad duplicada).
- [ ] Con la pestaña oculta o la ventana sin foco no queda ninguna tecla "atascada" al volver.
- [ ] `/juegos/ranaria/jugar` y los demás juegos conservan la simulación original.
- [ ] No hay errores de hidratación ni errores en la consola al cargar la página y al jugar una partida completa.
- [ ] No existe ninguna llamada a `.from(`, ni a `lib/supabase/` en los archivos nuevos.

---

## Decisiones

- **Sí:** portar a TypeScript en módulos, con el motor separado de React. Es el patrón que reutilizarán los siguientes juegos y permite controlar pausa, fin y reinicio desde el HUD.
- **No:** iframe a `public/`. No se comunica con el HUD ni con la pausa.
- **No:** pegar `game.js` en un componente. Deja globales sin tipar y es difícil de limpiar al desmontar.
- **Sí:** `lib/asteroids/` como carpeta. No se usa `lib/games/` para no convivir con `lib/games.ts`, que resolvería de forma ambigua en `@/lib/games`.
- **Sí:** reemplazar la simulación de ROCAS. `rocas` ya describe este juego en el catálogo.
- **No:** crear una entrada nueva `asteroids`. Duplicaría el concepto.
- **Sí:** el HUD de la plataforma muestra puntuación, vidas y nivel, y controla pausa y fin. Hace que los botones existentes funcionen de verdad.
- **Sí:** el canvas sigue dibujando el temporizador `3x`. Es información de juego y el HUD de plataforma no tiene un campo para ello.
- **No:** HUD y overlay `GAME OVER` dibujados en el canvas. Se duplicaría la información y los botones no tendrían efecto. La tecla Espacio ya no reinicia: se reinicia desde el modal.
- **Sí:** resolución lógica fija 800×600 escalada por CSS. La física no cambia y se evita el desbordamiento en pantallas pequeñas.
- **Sí:** solo teclado. Es la entrada del original; los controles táctiles son otra superficie de UI.
- **Sí:** sonido sintetizado con Web Audio. Sin archivos ni licencias; el `AudioContext` se crea tras un gesto del usuario por la política de autoplay de los navegadores.
- **No:** archivos `.mp3`/`.wav`. Exigen conseguir y licenciar assets.
- **No:** persistir la preferencia de silencio. Se puede añadir cuando exista un perfil de usuario.
- **Sí:** dividir el pedido original en tres specs: 05 (este juego), 06 (autenticación) y 07 (tabla `scores` y guardado). Auth, esquema con RLS y escritura de datos son dominios distintos y cada uno merece su verificación.
- **No:** guardar puntuación en esta spec. Requiere login, que se eligió, y por eso depende de la 06.
- **No:** tocar `lib/games.ts`. El texto de ROCAS menciona OVNIs que el juego no tiene; se deja para una revisión de contenido.

---

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces en desarrollo               | `destroy()` cancela el loop y quita los listeners; el motor se crea solo dentro del efecto. |
| Listeners de teclado globales que interfieren con el resto de la página | Se registran al montar, se quitan al desmontar y se limpian las teclas en `blur`.           |
| Las flechas y Espacio hacen scroll o activan un botón enfocado          | `preventDefault` sobre esas teclas mientras el motor está activo.                           |
| El navegador bloquea el audio hasta que hay un gesto del usuario        | `AudioContext` diferido a la primera tecla o clic; nada suena antes.                        |
| El `dt` salta tras volver de otra pestaña                               | `dt` limitado a 0,05 s y primer frame con `dt = 0`, como en el original.                    |
| El motor llama a callbacks en cada frame y satura el estado de React    | Se notifica solo cuando cambia el valor.                                                    |
| El borde `.crt-screen` recorta o deforma el canvas                      | Revisar sus estilos antes del paso 3 y ajustar la clase del canvas.                         |
| Next.js 16 o React 19.2 cambian reglas de efectos y refs                | Leer `node_modules/next/dist/docs/` y pasar `npm run lint` en el paso 6.                    |

---

## Qué **no** está en este spec

- Autenticación y sesión de usuario.
- Tabla `scores`, RLS, migraciones y guardado de puntuación.
- Lectura de puntuaciones reales en `/salon` o en el detalle de ROCAS.
- Controles táctiles.
- Audio con archivos, música y persistencia del silencio.
- Tecla de pausa.
- Corrección del texto de ROCAS sobre OVNIs.
- Port de Tetris y Arkanoid.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
