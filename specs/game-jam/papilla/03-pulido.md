# GAME JAM PAPILLA · SPEC 03 — Sonido, efectos y dificultad de PAPILLA

> **Estado:** Approved
> **Tema:** Frogger: cruza la carretera y el río sin convertirse en papilla
> **Depende de:** SPEC 07, SPEC 08, game-jam/papilla/01-catalogo, game-jam/papilla/02-motor
> **Fecha:** 2026-10-22
> **Objetivo:** Dar a PAPILLA su tono gamberro con sonido sintetizado, manchas de papilla, partículas y burlas del sapo, y afinar la curva de dificultad sin cambiar las reglas de puntuación del spec 02.

---

## Por qué existe este spec

El spec 02 deja un juego completo pero sobrio: tres tonos y una mancha simple al morir. El lema del tema ("sin convertirse en papilla") pide que morir sea gracioso y que el rival tenga personalidad. Este spec añade solo presentación y ajustes de ritmo. **No cambia ninguna regla de puntuación** del spec 02: los mismos eventos suman los mismos puntos.

---

## Alcance

**Dentro:**

- `lib/papilla/audio.ts` completo, con Web Audio y la lista de sonidos de abajo.
- `lib/papilla/fx.ts` nuevo: manchas, partículas, burbujas, textos flotantes y sacudida de pantalla, todo dibujado por código.
- Bocadillos del sapo (texto corto en el canvas) al reclamar un nenúfar o al ganar una ronda.
- Variación de patrones de tráfico por ronda dentro de los mismos carriles y velocidades.

**Fuera de alcance (para otros specs):**

- Cualquier cambio en los puntos, las vidas, el tiempo o las condiciones de fin del spec 02.
- Moscas, cocodrilos, serpientes y empujones entre ranas.
- Música de fondo continua y archivos de audio.
- Opciones de accesibilidad (reducir movimiento, desactivar sacudida): irían en un spec de plataforma.

---

## Modelo de datos

No hay tablas ni columnas nuevas. En memoria, dentro del motor:

```ts
// lib/papilla/fx.ts
export interface Splat {
  x: number;
  y: number; // px
  color: string; // "#00ff88" rana, "#ff006e" sapo
  seed: number; // forma irregular reproducible
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number; // px/s
  life: number; // ms restantes
  color: string;
}
export interface FloatText {
  x: number;
  y: number;
  text: string; // "+100 ¡PAPILLA!", "+200", "¡CHOF!"
  life: number; // ms
}
```

Constantes en `lib/papilla/types.ts`:

- `MAX_SPLATS = 12` manchas por ronda (las más antiguas desaparecen); se borran al empezar la ronda siguiente.
- `SPLAT_PARTICLES = 18`, `PARTICLE_LIFE_MS = 600`, `PARTICLE_SPEED = 220` px/s, `MAX_PARTICLES = 200`.
- `FLOAT_TEXT_MS = 900`, subida de 40 px.
- `SHAKE_MS = 180`, `SHAKE_PX = 4`: solo cuando muere la rana del jugador.
- `TAUNT_MS = 1200`: duración del bocadillo del sapo; textos en `RIVAL_TAUNTS = ["¡MÍO!", "CROAC JE JE", "LENTA…", "¡TE GANÉ!"]`.
- `TIME_WARN_MS = 5000`: a partir de aquí suena un tic por segundo.

---

## Plan de implementación

1. Completar `lib/papilla/audio.ts` (mismo patrón que `lib/serpentina/audio.ts`: `AudioContext` creado tras el primer `keydown`/`pointerdown`, `play` en `try/catch`, `setMuted` con ganancia maestra). Sonidos:
   - `hop`: cuadrada corta 600→900 Hz, 50 ms.
   - `splat` ("¡CHOF!"): ráfaga de ruido blanco filtrada paso bajo 1200→200 Hz, 250 ms, más una sierra 180→60 Hz.
   - `drown`: tres "glup" senoidales 400→150 Hz separados 80 ms.
   - `claim`: arpegio cuadrado 523–659–784 Hz, 60 ms cada nota.
   - `rivalClaim` (burla): dos notas triangulares 700 y 520 Hz, "nyeh nyeh".
   - `rivalSplat`: chof agudo (ruido 2400→400 Hz, 150 ms) seguido de un "ding" 1320 Hz.
   - `roundWin` / `roundLose`: fanfarria ascendente de 4 notas / descendente de 3 notas.
   - `tick`: clic de 20 ms en los últimos 5 s.
   - `extraLife`: dos subidas rápidas 880→1760 Hz.
   - `horn`: bocina de dos tonos (cuadrada 350 + 440 Hz, 200 ms) cuando el jugador salta a un carril de carretera con un vehículo a menos de 1 casilla; como mucho una vez cada 2 s.
     Verificación: `npx tsc --noEmit`; con SILENCIAR no suena nada y un fallo de audio no detiene el bucle.
2. Crear `lib/papilla/fx.ts` y conectarlo en `engine.ts`:
   - Muerte en carretera: mancha persistente en el asfalto (círculos irregulares con `seed`, ojos en espiral), 18 partículas y texto `¡CHOF!`; si es la rana, sacudida de pantalla.
   - Ahogado: burbujas que suben durante 600 ms y anillos de onda en el agua.
   - Muerte del sapo: lo mismo en magenta y texto `+100 ¡PAPILLA!`.
   - Nenúfar: destello neón del color del dueño y texto con los puntos ganados.
   - Brillo neón (`shadowBlur`) en faros, rana y sapo; reflejos de faros en el asfalto.
     Verificación: `npx tsc --noEmit` y `npx eslint lib/papilla`; con 12 manchas y 200 partículas el juego no baja de 60 fps en el navegador.
3. Bocadillos del sapo con `RIVAL_TAUNTS` al reclamar un nenúfar y al ganar la ronda. Verificación: aparecen sobre el sapo y desaparecen a los 1,2 s.
4. Variación de tráfico: en cada ronda, el desfase inicial de cada carril se elige con el `rng` y, desde el nivel 4, los coches de las filas 9 y 10 se agrupan de dos en dos (mismo número de objetos y misma velocidad). Verificación: dos rondas seguidas no tienen el mismo patrón y las velocidades siguen las del spec 02.
5. Revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`. Verificación: todos los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] No suena nada antes del primer gesto del usuario ni con SILENCIAR activo.
- [ ] Cada evento de la lista del paso 1 tiene su sonido, y la bocina no suena más de una vez cada 2 s.
- [ ] Morir en la carretera deja una mancha que sigue ahí hasta el final de la ronda, con un máximo de 12.
- [ ] Ahogarse muestra burbujas y ondas, no una mancha.
- [ ] La muerte del sapo muestra `+100 ¡PAPILLA!` y suma exactamente 100 puntos, como en el spec 02.
- [ ] La sacudida solo ocurre cuando muere la rana del jugador.
- [ ] El sapo muestra un bocadillo al reclamar un nenúfar y al ganar la ronda.
- [ ] Los puntos, las vidas, el tiempo y las condiciones de fin coinciden con el spec 02 (mismos criterios de puntuación).
- [ ] `PAUSA` congela también partículas, textos y bocadillos.
- [ ] `JUGAR DE NUEVO` borra manchas, partículas y textos.
- [ ] No se usa `SUPABASE_SERVICE_ROLE_KEY` ni se siembran puntuaciones.
- [ ] Los demás juegos conservan su comportamiento.

---

## Decisiones

- **Sí:** manchas persistentes de papilla en el asfalto **(decidido por game-jam, pendiente de revisar)**. Es la firma visual del tema y cuenta, de paso, cuántas veces ha fallado cada uno en la ronda. Solo decoran: no afectan a las colisiones.
- **Sí:** estilo caricatura (neón, ojos en espiral, `¡CHOF!`) **(decidido por game-jam, pendiente de revisar)**. Gamberro pero no desagradable: nada de rojo sangre.
- **Sí:** burlas del sapo en texto y sonido **(decidido por game-jam, pendiente de revisar)**. Le dan personalidad al rival, que es el giro del juego.
- **Sí:** bocina como aviso de peligro. Ayuda a leer el tráfico y refuerza el humor.
- **Sí:** variación de patrones por ronda sin tocar velocidades ni número de objetos. Rompe la memorización sin cambiar la dificultad media ni la puntuación.
- **No:** cambiar ninguna regla de puntuación. Si hiciera falta (p. ej. moscas), iría en un spec propio que lo diga.
- **No:** música continua ni archivos de audio. Todo es sintetizado, como ROCAS y SERPENTINA.

---

## Riesgos

| Riesgo                                             | Mitigación                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Demasiadas partículas o `shadowBlur` bajan los fps | Topes `MAX_SPLATS` y `MAX_PARTICLES`; `shadowBlur` a 0 tras cada grupo de dibujo.        |
| La sacudida marea o molesta                        | 180 ms y 4 px, solo en la muerte propia; una opción para desactivarla iría en otro spec. |
| Audio bloqueado por el navegador                   | `AudioContext` tras el primer gesto y todo `play` en `try/catch`.                        |
| Las manchas tapan vehículos y confunden            | Se dibujan antes que los vehículos y con opacidad 0,6.                                   |

---

## Qué **no** está en este spec

- Cambios en la puntuación, las vidas o las reglas del spec 02.
- Moscas, cocodrilos, serpientes y empujones entre ranas.
- Música de fondo, archivos de audio y opciones de accesibilidad.
- Cualquier cambio en RANARIA, en el esquema de Supabase o en las páginas.

Cada uno, si llega, va en su propio spec.
