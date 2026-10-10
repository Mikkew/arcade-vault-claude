# SPEC 02 — Home page (landing)

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-08
> **Objetivo:** Portar la landing de `resources/templates/home-about/home.jsx` a `/` como página de inicio con datos mock, y mover la biblioteca de la spec 01 a `/juegos`.

---

## Por qué existe este spec

La spec 01 usó `/` para la biblioteca porque el template original no tenía landing. `resources/templates/home-about/` añade un home (hero, ventajas, juegos, estadísticas, actividad, precios y CTA final) y un `Nav` con enlace "Inicio". Esta spec mueve la biblioteca a `/juegos` para liberar `/` y modifica los enlaces de la spec 01 que apuntaban a `/` como biblioteca. Prevalece sobre los criterios de la spec 01 que mencionan `/` como biblioteca.

---

## Alcance

**Dentro:**

- Nueva página `/` con las seis secciones de `home.jsx`: hero, "¿Por qué Arcade Vault?", "Juegos disponibles ahora", estadísticas, "Actividad en vivo", precios y CTA final.
- Mover la biblioteca actual (`app/page.tsx`) a `app/juegos/page.tsx` sin cambiar su contenido.
- Actualizar el `Nav` con el enlace "Inicio" (`/`) y "Biblioteca" (`/juegos`).
- Actualizar los enlaces de la spec 01 que apuntaban a `/` como biblioteca para que apunten a `/juegos`.
- Datos mock tipados en `lib/home.ts`, copiados tal cual del template.
- Portar a `app/globals.css` las clases CSS del home que faltan, tomadas de `resources/templates/home-about/styles.css`.
- Animación de entrada `.reveal` mediante un componente cliente con `IntersectionObserver`.
- Siluetas pixel decorativas del hero y los cuatro iconos de ventajas como componentes.

**Fuera de alcance (para otros specs):**

- Página "Acerca de" (`about.jsx`) y su formulario de contacto. El `Nav` no muestra "Acerca de" hasta que exista la ruta.
- Sesión de usuario y estado logueado en el `Nav` (`user`, `onSignOut`).
- Datos reales de actividad, ranking o estadísticas; todo es mock fijo.
- Migrar los estilos a utilidades Tailwind.
- Variantes de tema (`Theme variants`) y `GAMEPAD` de `styles.css`.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

Nuevo archivo `lib/home.ts`. Reutiliza `Accent` de `lib/games.ts` y no modifica los tipos existentes.

```ts
import type { Accent } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;
  desc: string;
  color: Accent;
}

export interface StatBlock {
  n: string;          // "12+", "MILES", "GLOBAL"
  u: string;          // unidad
  s: string;          // subtítulo
}

export interface RecentScore {
  player: string;
  game: string;       // nombre mostrado, p. ej. "Caída"
  score: number;
  ago: string;        // texto fijo, p. ej. "hace 2 min"
  color: Accent;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const FEATURES: Feature[];            // 4
export const STATS: StatBlock[];             // 3
export const RECENT_SCORES: RecentScore[];   // 7
export const TOP_PLAYERS: TopPlayer[];       // 5
export const PRICING_PERKS: string[];        // 6
export const FAQ: FaqItem[];                 // 3
```

Convenciones:

- Los textos y valores se copian tal cual de `home.jsx`, incluidas tildes y puntuación.
- Los nombres de juego de `RECENT_SCORES` son texto fijo y no se enlazan con `GAMES`.
- Las puntuaciones se muestran con `toLocaleString("es-ES")`.
- No hay `Math.random()` ni fechas dinámicas en el home.
- Las seis tarjetas de "Juegos disponibles ahora" salen de `GAMES.slice(0, 6)`.

---

## Mapa de rutas

| Pantalla | Ruta | Archivo | Tipo |
| --- | --- | --- | --- |
| Home | `/` | `app/page.tsx` | Server (reemplaza la biblioteca) |
| Biblioteca | `/juegos` | `app/juegos/page.tsx` | Server, con isla cliente (`LibraryBrowser`) |

Componentes nuevos (`'use client'` solo donde se indica):

- `components/RevealObserver.tsx` (cliente, sin UI: añade la clase `in` a los `.reveal` al entrar en pantalla).
- `components/HomeSilhouettes.tsx` (servidor: las 8 siluetas SVG decorativas).
- `components/FeatureIcon.tsx` (servidor: los 4 iconos pixel).
- `components/MiniCard.tsx` (servidor: tarjeta de juego que es un `Link` a `/juegos/[id]`).

Componentes que cambian:

- `components/Nav.tsx`: añade "Inicio" y ajusta la lógica de enlace activo.

Navegación del home:

| Elemento | Destino |
| --- | --- |
| "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →", "INSERTAR MONEDA →" | `/juegos` |
| "CREAR CUENTA", "EMPEZAR GRATIS →" | `/acceso` |
| `MiniCard` | `/juegos/[id]` |
| "VER SALÓN →" | `/salon` |

Enlaces de la spec 01 que cambian de `/` a `/juegos`:

- `app/juegos/[id]/page.tsx`: "VOLVER AL VAULT".
- `components/GamePlayer.tsx`: "VOLVER AL VAULT" del modal.
- `app/salon/page.tsx`: "VOLVER A LA BIBLIOTECA".

Enlaces que se mantienen en `/`: el logo del `Nav` y el destino de `AuthForm` (formulario y "JUGAR COMO INVITADO").

Lógica de activo del `Nav`:

- "Inicio": solo `pathname === "/"`.
- "Biblioteca": `pathname.startsWith("/juegos")`.
- "Salón de la Fama": `pathname.startsWith("/salon")`.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` la guía de Link, Server y Client Components y metadata.

1. Portar a `app/globals.css` las secciones `HOME PAGE` (líneas 930–1070), `ACTIVITY` y `PRICING` de `resources/templates/home-about/styles.css`, sin duplicar reglas que ya existan. Añadir un bloque `@media (prefers-reduced-motion: reduce)` que muestre `.reveal` sin transición. Verificación: `npm run build` pasa y las pantallas de la spec 01 se ven igual.
2. Crear `lib/home.ts` con los tipos y constantes. Verificación: `npx tsc --noEmit` pasa.
3. Mover la biblioteca: crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx` y cambiar a `/juegos` los tres enlaces listados arriba. Actualizar `components/Nav.tsx` con "Inicio", "Biblioteca" y la lógica de activo (escritorio y panel móvil). Verificación: `/juegos` muestra la biblioteca y "VOLVER AL VAULT" lleva a `/juegos`.
4. Crear `HomeSilhouettes`, `FeatureIcon`, `MiniCard` y `RevealObserver`. Verificación: `npx tsc --noEmit` pasa. `MiniCard` usa `Link` y mantiene las clases `mini-card`, `mini-cover`, `cover-bg`, `mini-meta`, `mini-title` y `mini-cat`.
5. Reemplazar `app/page.tsx` por el home con las seis secciones y montar `RevealObserver` una sola vez. Verificación: `/` se ve como el template y todos los botones navegan según la tabla.
6. Revisar con `npm run lint` y `npm run build` y retirar imports sin uso. Verificación: ambos pasan.

---

## Criterios de aceptación

- [X] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [X] `/` muestra, en este orden: hero, "¿POR QUÉ ARCADE VAULT?", "JUEGOS DISPONIBLES AHORA", estadísticas, "ACTIVIDAD EN VIVO", "PRECIOS" y "¿LISTO PARA JUGAR?".
- [X] El hero muestra las 8 siluetas, el título en tres líneas ("EL ARCADE" / "CLÁSICO ESTÁ" / "DE VUELTA") y los botones "EXPLORAR JUEGOS" y "CREAR CUENTA".
- [X] "¿POR QUÉ ARCADE VAULT?" muestra 4 tarjetas, cada una con su icono.
- [X] "JUEGOS DISPONIBLES AHORA" muestra 6 tarjetas, las mismas que los 6 primeros elementos de `GAMES`.
- [X] Las estadísticas muestran 3 bloques ("12+", "MILES", "GLOBAL").
- [X] "ÚLTIMAS PUNTUACIONES" muestra 7 filas y "TOP JUGADORES · HOY" muestra 5, con las puntuaciones formateadas en `es-ES`.
- [X] La tarjeta de precios muestra "$0", 6 ventajas y 3 preguntas frecuentes.
- [X] Cada botón del home navega al destino de la tabla de navegación.
- [X] Hacer clic en una `MiniCard` abre `/juegos/<id>`.
- [X] Las secciones con `.reveal` quedan visibles tras hacer scroll hasta ellas.
- [X] Con `prefers-reduced-motion: reduce` las secciones `.reveal` son visibles sin animación.
- [X] `/juegos` muestra la biblioteca de la spec 01 (8 tarjetas; "SHOOTER" deja 2; búsqueda sin coincidencias muestra "NO HAY RESULTADOS").
- [X] "VOLVER AL VAULT" (detalle y modal del reproductor) y "VOLVER A LA BIBLIOTECA" (salón) llevan a `/juegos`.
- [X] El `Nav` marca "Inicio" solo en `/`, "Biblioteca" en `/juegos` y `/juegos/*`, y "Salón de la Fama" en `/salon`.
- [X] El `Nav` no muestra "Acerca de" y sigue mostrando "Iniciar Sesión".
- [X] El logo del `Nav` y el envío de `/acceso` llevan a `/`.
- [X] Con ancho menor a 768 px el home no tiene scroll horizontal y el menú móvil incluye "Inicio".
- [X] No hay errores de hidratación ni errores en la consola al cargar `/` y `/juegos`.
- [X] El home no escribe nada en `localStorage`.

---

## Decisiones

- **Sí:** home en `/` y biblioteca en `/juegos`. Coincide con el template (Inicio ≠ Biblioteca) y con `/juegos/[id]`, que ya cuelga de `/juegos`.
- **No:** biblioteca en `/biblioteca`. Deja `/juegos/[id]` con una raíz distinta a su listado.
- **No:** home en `/home`. La landing debe ser la página de entrada.
- **Sí:** esta spec prevalece sobre la 01 en los enlaces a `/`. Se documenta aquí en lugar de editar una spec ya aprobada.
- **Sí:** solo el home; "Acerca de" va en otra spec. La petición es "home page" y evita sumar un formulario de contacto.
- **No:** enlace "Acerca de" deshabilitado en el `Nav`. Sería un enlace roto visual sin ruta que lo respalde.
- **Sí:** datos mock en `lib/home.ts`, fijos y tipados. Separa el mock del home del de juegos y facilita sustituirlo por datos reales.
- **No:** derivar actividad y ranking de `GAMES`/`seededScores`. Cambiaría los nombres y tiempos del template y rompería la fidelidad visual.
- **Sí:** copiar las clases del home a `app/globals.css`. Mismo criterio que la spec 01 (clases globales, sin Tailwind).
- **No:** CSS module para el home. Rompe la convención de clases globales.
- **Sí:** `RevealObserver` como único componente cliente nuevo y sin UI. El resto del home queda como Server Component.
- **Sí:** `MiniCard` como `Link` en lugar de `div` con `onClick`. Es navegable por teclado y no necesita JS.
- **Sí:** los `style` inline del template (`transitionDelay`, `animationDelay`, ancho de `tp-fill`) se mantienen porque ya son parte del diseño.
- **Sí:** textos en español, igual que el template y la spec 01.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `.reveal` empieza con `opacity: 0`; sin JS o antes de hidratar el contenido queda oculto | Aceptado para el MVP. Se añade la regla `prefers-reduced-motion` y `RevealObserver` se monta una sola vez en `app/page.tsx`. |
| Secciones ya visibles al cargar no disparan el observer hasta el primer callback | El `IntersectionObserver` notifica el estado inicial al observar, así que las secciones visibles se marcan con `in` en el primer ciclo. |
| Colisión de nombres entre clases nuevas y existentes en `globals.css` | Copiar sin renombrar y revisar duplicados antes de pegar; cualquier clase nueva lleva el prefijo `av-`. |
| Enlaces olvidados que siguen apuntando a `/` como biblioteca | Buscar `href="/"` y `push("/")` en `app/` y `components/` tras el paso 3 y revisarlos uno a uno. |
| `.mini-card` pensado para `div` puede heredar estilos de enlace al ser un `Link` | Ajustar con `display: block; color: inherit; text-decoration: none` en la regla copiada. |
| Next.js 16 cambia APIs respecto a versiones anteriores | Leer `node_modules/next/dist/docs/` antes del paso 4 y no asumir comportamientos de versiones previas. |

---

## Qué **no** está en este spec

- Página "Acerca de" y formulario de contacto.
- Sesión de usuario, menú de usuario y cualquier backend.
- Datos reales de actividad, ranking o estadísticas.
- Migración a Tailwind o rediseño visual.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
