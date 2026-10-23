# GAME JAM APAGON · SPEC 03 — Sonido, efectos y dificultad de APAGÓN

> **Estado:** Draft
> **Tema:** Ciudad nocturna
> **Depende de:** SPEC 07, SPEC 08, game-jam/apagon/01-catalogo, game-jam/apagon/02-motor
> **Fecha:** 2026-10-22
> **Objetivo:** Dar a APAGÓN el ambiente de ciudad nocturna (skyline que se enciende, chispas, parpadeos y sonido eléctrico sintetizado) y suavizar la curva de dificultad, sin cambiar las reglas de puntuación del spec 02.

---

## Por qué existe este spec

El spec 02 deja el juego completo y guardando, con tres tonos simples. Falta que el tema se note: que tender cable "devuelva la luz" a una ciudad que se ve, y que el ritmo de mecha y corriente se oiga. Todo se dibuja y se sintetiza por código; no hay assets de ciudad en `references/source-assets/`.

---

## Alcance

**Dentro:**

- `lib/apagon/audio.ts` completo con Web Audio: `AudioContext` creado tras el primer gesto (`keydown`/`pointerdown`), cada `play` en `try/catch`, volumen maestro `MASTER_VOLUME = 0.4`, y `setMuted` que pone la ganancia a 0.
- `lib/apagon/effects.ts`: partículas y parpadeos dibujados en el canvas, independientes de la lógica.
- Skyline de la franja superior que se enciende según el progreso del nivel.
- Ajustes de dificultad que no tocan la puntuación (ver Modelo de datos).

**Fuera de alcance (para otros specs):**

- Música de fondo continua.
- Archivos de audio o imágenes nuevos en `public/`.
- Cambios en las reglas o los valores de puntuación del spec 02.
- Ajustes de accesibilidad (modo sin parpadeos), que pueden ir en su propio spec.

---

## Modelo de datos

No hay datos nuevos en Supabase ni cambios en el estado de puntuación. Se añaden al motor:

```ts
// lib/apagon/effects.ts
export interface Spark {
  x: number;
  y: number; // px
  vx: number;
  vy: number; // px/s
  life: number; // s restantes
}
export interface Flash {
  kind: "tower" | "clear" | "blackout";
  left: number; // ms restantes
}
```

Constantes nuevas en `lib/apagon/types.ts`:

- `MAX_SPARKS = 120`; `SPARKS_PER_CELL = 6` al llenar una casilla; `SPARK_LIFE = 0.5` s; `SPARK_GRAVITY = 600` px/s².
- `TOWER_FLASH_MS = 400`, `CLEAR_FLASH_MS = 1200` (dentro de `CLEAR_MS`), `BLACKOUT_FLICKER_MS = 900` con 4 parpadeos antes de abrir el modal.
- `FUSE_WARNING_MS = 3000`: los últimos 3 s de mecha la barra parpadea y suena el tic.
- Skyline: `BUILDINGS = 12` siluetas fijas por partida, con `WINDOWS_LIT = floor(ventanas × min(flowed / target, 1))`.
- Dificultad (solo nivel 1, sin tocar puntos): en el nivel 1 la primera pieza de la cola nunca es un cruce y la central apunta hacia el lado con más casillas libres hasta el borde. **Este ajuste no cambia las reglas de puntuación del spec 02.**

Sonidos (`type Sfx`):

| Sonido     | Cuándo                                 | Síntesis                                            |
| ---------- | -------------------------------------- | --------------------------------------------------- |
| `place`    | Colocar una pieza                      | `square` 440 → 330 Hz, 60 ms                        |
| `replace`  | Reemplazar una pieza                   | ruido filtrado 120 ms + `square` 220 Hz             |
| `denied`   | Colocar donde no se puede              | `square` 110 Hz, 80 ms                              |
| `tick`     | Cada segundo de los últimos 3 de mecha | `triangle` 880 Hz, 30 ms                            |
| `hum`      | Mientras fluye la corriente            | `sawtooth` 60 Hz a volumen 0.05, sube a 90 Hz con F |
| `cell`     | Casilla llena                          | `sine` 660 Hz, 40 ms                                |
| `tower`    | Torre iluminada                        | arpegio `square` 523/659/784 Hz                     |
| `cross`    | Bonus de cruce                         | `sine` 1046 Hz, 120 ms                              |
| `levelUp`  | Nivel superado                         | arpegio ascendente de 5 notas                       |
| `blackout` | Apagón (fin)                           | `sawtooth` 220 → 40 Hz, 700 ms                      |

Efectos visuales:

- Chispas amarillas y blancas en el frente de corriente y al llenar cada casilla.
- Cable iluminado con `shadowBlur` en `#f5ff00` que late suave (±15 % de alfa, 1,2 s).
- Torre: las ventanas de su casilla se encienden con un destello de `TOWER_FLASH_MS`.
- Nivel superado: el skyline entero se enciende de abajo arriba durante `CLEAR_FLASH_MS`.
- Apagón: el tablero parpadea 4 veces y se queda en gris azulado antes del modal.
- Lluvia fina opcional en diagonal sobre el fondo (líneas de 1 px a 8 % de opacidad), solo decorativa.

---

## Plan de implementación

1. Ampliar `lib/apagon/audio.ts` con la tabla de sonidos y conectarlos en `engine.ts`. Verificación: cada sonido se oye en su momento y SILENCIAR los apaga todos, `hum` incluido.
2. Crear `lib/apagon/effects.ts` con chispas (tope `MAX_SPARKS`) y destellos, y llamarlo desde el dibujo. Verificación: `npx tsc --noEmit`; las chispas se congelan con `PAUSA`.
3. Dibujar el skyline que se enciende con `flowed / target` y el destello de nivel superado. Verificación: con `TRAMOS 5/10` está encendida la mitad de las ventanas.
4. Añadir el parpadeo del apagón y el aviso de los últimos 3 s de mecha. Verificación: el modal `FIN DEL JUEGO` aparece después de los 4 parpadeos y `onGameOver` se llama una sola vez.
5. Aplicar los ajustes del nivel 1 y revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`. Verificación: todos los criterios.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] No se crea el `AudioContext` hasta la primera tecla o clic, y no hay avisos de autoplay en la consola.
- [ ] Suenan los 10 sonidos de la tabla en su momento; SILENCIAR los apaga todos y volver a activarlo los recupera.
- [ ] Un fallo de audio (navegador sin Web Audio) no detiene el juego.
- [ ] Nunca hay más de 120 chispas a la vez.
- [ ] `PAUSA` congela chispas, destellos, `hum` y lluvia; `REANUDAR` continúa sin salto.
- [ ] El skyline enciende ventanas en proporción a `TRAMOS` y se enciende entero al superar el nivel.
- [ ] El apagón parpadea 4 veces antes de abrir el modal y `onGameOver` se llama una sola vez.
- [ ] En el nivel 1 la primera pieza nunca es un cruce.
- [ ] Las puntuaciones de una partida son las mismas que con el spec 02 (50/100 por tramo, 250, 500, 500 × nivel).
- [ ] No se añaden archivos a `public/`, no se usa `SUPABASE_SERVICE_ROLE_KEY` ni se siembran puntuaciones.
- [ ] Los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí:** todo el sonido sintetizado **(decidido por game-jam, pendiente de revisar)**. No hay assets de ciudad en `references/source-assets/` y evita peso y licencias.
- **Sí:** zumbido `hum` continuo mientras fluye la corriente **(decidido por game-jam, pendiente de revisar)**. Hace audible la amenaza; si molesta, se baja o se quita sin tocar nada más.
- **Sí:** skyline que se enciende con el progreso. Es la lectura directa del tema: devolver la luz a la ciudad.
- **Sí:** ayuda en el nivel 1 (sin cruce de primera pieza, central apuntando al lado con más espacio) **(decidido por game-jam, pendiente de revisar)**. No cambia puntos, solo evita un arranque injusto.
- **No:** música de fondo. Se solapa con `hum` y con los sonidos de la plataforma.
- **No:** cambiar valores de puntuación. Haría incomparables las partidas guardadas antes y después de este spec.

---

## Riesgos

| Riesgo                                                    | Mitigación                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| El `hum` continuo cansa o se queda sonando tras `FIN`     | Se para en `over`, `pause` y `destroy`; volumen bajo (0.05).                  |
| Los parpadeos molestan a personas sensibles a la luz      | Menos de 3 destellos por segundo; un modo sin parpadeos queda para otro spec. |
| `shadowBlur` en muchas casillas baja los FPS              | Dibujar el brillo una vez por casilla iluminada y limitar las chispas.        |
| El retraso del apagón deja pulsar `FIN` y duplicar el fin | `over` se marca al cortarse la corriente, antes de los parpadeos.             |

---

## Qué **no** está en este spec

- Música de fondo y archivos de audio o imagen.
- Modo sin parpadeos u otras opciones de accesibilidad.
- Cambios en la puntuación, el esquema o las páginas.

Cada uno, si llega, va en su propio spec.
