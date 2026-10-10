# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Estado:** Implemented
> **Depende de:** ninguna (el tema global ya está en `app/globals.css` y `app/layout.tsx`)
> **Fecha:** 2026-10-07
> **Objetivo:** Portar a Next.js App Router las cinco pantallas de `resources/templates/` (biblioteca, detalle, reproductor, acceso y salón de la fama) como maqueta visual navegable con datos mock, sin ningún juego real.

---

## Por qué existe este spec

`resources/templates/` contiene un prototipo en React por CDN con navegación por hash y estado en `useState`. El proyecto real es Next.js 16 (App Router) con TypeScript. Este spec traduce el prototipo a rutas, componentes tipados y datos mock, y no cambia el diseño visual.

---

## Alcance

**Dentro:**

- Cinco rutas del App Router: biblioteca, detalle de juego, reproductor, acceso y salón de la fama.
- `Nav` (con menú móvil) y `Footer` compartidos desde `app/layout.tsx`.
- Datos mock tipados en `lib/games.ts`: `GAMES`, `CATS`, `seededScores`.
- Reproductor con simulación visual: HUD, pantalla CRT, puntuación aleatoria por intervalo, pausa, "FIN" y modal de fin de partida.
- Filtro por búsqueda y categoría en la biblioteca; tabs por juego en el salón.
- Reutilizar las clases CSS ya portadas a `app/globals.css`.
- Estado vacío de la biblioteca ("NO HAY RESULTADOS") y `404` para ids de juego inexistentes.

**Fuera de alcance (para otros specs):**

- Cualquier juego real (lógica, canvas, input de teclado o táctil).
- Sesión de usuario: sin `localStorage` `av_user`, sin estado "logueado", sin cierre de sesión.
- Autenticación real (NextAuth, OAuth Google/GitHub, backend, base de datos).
- Persistencia de puntuaciones (`av_scores` u otra).
- Fila "TU MEJOR MARCA" del salón y menú de usuario del `Nav`.
- Migrar los estilos a utilidades Tailwind.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

Tipos y datos mock portados de `resources/templates/data.jsx` a `lib/games.ts`:

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;        // slug de URL, p. ej. "bloque-buster"
  title: string;
  short: string;     // descripción de tarjeta
  long: string;      // descripción de detalle
  cat: Category;
  cover: string;     // clase CSS existente, p. ej. "cover-bricks"
  color: Accent;
  best: number;      // mejor puntuación global (mock)
  plays: string;     // p. ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;      // "DD/MM/2026"
}

export const GAMES: Game[];                          // los 8 juegos del template
export const CATS: ("TODOS" | Category)[];
export function seededScores(seed: number, count?: number): ScoreRow[];
export function getGame(id: string): Game | undefined;
```

Convenciones:

- Los valores de `GAMES` y `PLAYERS` se copian tal cual del template.
- `seededScores` conserva el algoritmo del template: mismo `seed` produce siempre las mismas filas, así servidor y cliente renderizan igual.
- Números con `toLocaleString("es-ES")`.
- Seeds: detalle usa `id.length * 17 + 3` con 10 filas; salón usa `id.length * 23 + 7` con 12 filas.

---

## Mapa de rutas

| Pantalla del template | Ruta | Archivo | Tipo |
| --- | --- | --- | --- |
| `biblioteca` | `/` | `app/page.tsx` | Server, con isla cliente para filtros |
| `detalle` | `/juegos/[id]` | `app/juegos/[id]/page.tsx` | Server |
| `player` | `/juegos/[id]/jugar` | `app/juegos/[id]/jugar/page.tsx` | Server, con componente cliente |
| `auth` | `/acceso` | `app/acceso/page.tsx` | Server, con formulario cliente |
| `salon` | `/salon` | `app/salon/page.tsx` | Server, con tabs cliente |

Archivos de componentes (`'use client'` solo donde se indica):

- `components/Nav.tsx` (cliente: menú móvil y `usePathname` para el enlace activo).
- `components/Footer.tsx`.
- `components/LibraryBrowser.tsx` (cliente: búsqueda y chips).
- `components/GameCard.tsx` (cliente: efecto tilt con el ratón).
- `components/Leaderboard.tsx` (panel lateral del detalle).
- `components/GamePlayer.tsx` (cliente: simulación, pausa, modal).
- `components/AuthForm.tsx` (cliente: tabs e inputs).
- `components/HallOfFame.tsx` (cliente: tab activa).

Comportamiento de navegación:

- Seleccionar una tarjeta o "JUGAR" lleva a `/juegos/[id]`; "JUGAR AHORA" lleva a `/juegos/[id]/jugar`.
- "SALIR" del reproductor lleva a `/juegos/[id]`; "VOLVER AL VAULT" del modal lleva a `/`.
- El formulario de acceso y "JUGAR COMO INVITADO" navegan a `/` sin guardar nada.
- Los botones Google y GitHub no hacen nada (decorativos).

---

## Plan de implementación

Antes de escribir código, leer la guía de `node_modules/next/dist/docs/01-app/` relevante (rutas dinámicas, `params` y `notFound`).

1. Crear `lib/games.ts` con los tipos, `GAMES`, `CATS`, `PLAYERS`, `seededScores` y `getGame`. Verificación: `npx tsc --noEmit` pasa.
2. Crear `components/Nav.tsx` y `components/Footer.tsx`; montarlos en `app/layout.tsx` dentro de `av-root` con `<main className="av-main">`. Verificación: `npm run dev`, el Nav y el footer se ven sobre la página de plantilla actual y el menú hamburguesa abre y cierra en ancho móvil.
3. Reemplazar `app/page.tsx` por la biblioteca: hero, `LibraryBrowser` (búsqueda y chips) y `GameCard` con tilt. Verificación: filtrar por texto y categoría cambia la rejilla; el estado vacío aparece sin coincidencias.
4. Crear `app/juegos/[id]/page.tsx` con portada, tags, estadísticas, botones y `Leaderboard`; `notFound()` si el id no existe. Verificación: las tarjetas de la biblioteca abren su detalle y `/juegos/xyz` muestra 404.
5. Crear `app/salon/page.tsx` y `components/HallOfFame.tsx`: tabs por juego, podio y tabla, sin fila de usuario. Verificación: cambiar de tab cambia podio y tabla.
6. Crear `app/acceso/page.tsx` y `components/AuthForm.tsx`: tabs "iniciar sesión" y "crear cuenta", campo de correo solo en la segunda, botón de invitado y botones sociales inertes. Verificación: ambos botones de envío llevan a `/` sin escribir en `localStorage`.
7. Crear `app/juegos/[id]/jugar/page.tsx` y `components/GamePlayer.tsx`: HUD, CRT, pausa, "FIN" y modal; guardar puntuación solo muestra el toast. Verificación: la puntuación sube, pausa la detiene, "FIN" abre el modal y "JUGAR DE NUEVO" reinicia.
8. Actualizar `metadata` de cada ruta si procede y eliminar restos de la plantilla de `create-next-app` (imports sin usar). Verificación: `npm run lint` y `npm run build` pasan.

---

## Criterios de aceptación

- [X] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [X] Existen las rutas `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/acceso` y `/salon`, y todas cargan sin errores en la consola del navegador.
- [X] La biblioteca muestra 8 tarjetas con título, descripción, categoría y mejor puntuación.
- [X] Buscar "caida" deja una sola tarjeta; elegir la categoría "SHOOTER" deja exactamente 2.
- [X] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [X] Hacer clic en una tarjeta abre `/juegos/<id>` con la descripción larga y 10 filas de puntuaciones.
- [X] `/juegos/no-existe` y `/juegos/no-existe/jugar` devuelven 404.
- [X] En `/juegos/<id>`, "JUGAR AHORA" lleva a `/juegos/<id>/jugar` y "VOLVER AL VAULT" lleva a `/`.
- [X] En el reproductor la puntuación aumenta sola; "PAUSA" la detiene y muestra "EN PAUSA"; "REANUDAR" la reanuda.
- [X] "FIN" abre el modal con la puntuación final; "GUARDAR PUNTUACIÓN" muestra "PUNTUACIÓN GUARDADA_" y no escribe nada en `localStorage`.
- [X] "JUGAR DE NUEVO" reinicia puntuación, vidas y nivel; "SALIR" lleva a `/juegos/<id>`.
- [X] `/salon` muestra 8 tabs, un podio con 3 posiciones y una tabla de 12 filas; cambiar de tab cambia los datos.
- [X] `/salon` no muestra la fila "TU MEJOR MARCA".
- [X] `/acceso` alterna entre los dos tabs y el campo "Correo electrónico" solo aparece en "CREAR CUENTA".
- [X] Enviar el formulario de acceso o pulsar "JUGAR COMO INVITADO" lleva a `/` y `localStorage` queda vacío.
- [X] El `Nav` aparece en todas las pantallas, marca como activo "Biblioteca" en `/`, `/juegos/*` y "Salón de la Fama" en `/salon`, y siempre muestra "Iniciar Sesión".
- [X] Con ancho menor a 768 px el menú hamburguesa abre el panel lateral y el fondo lo cierra.
- [X] No hay errores de hidratación en la consola al cargar cada ruta.
- [X] Ningún componente usa `style` con colores ni tamaños nuevos que no existan en el template.

---

## Decisiones

- **Sí:** rutas reales del App Router. URLs compartibles y Server Components por defecto; el hash JSON del template no es idiomático en Next.
- **No:** SPA con estado en una sola página. Ignora el framework y complica el layout compartido.
- **Sí:** auth solo visual, sin sesión. Evita inventar un modelo de usuario antes de tener backend.
- **No:** auth real o OAuth. Necesita backend y BD; va en otro spec.
- **Sí:** mock tipado en `lib/games.ts`. Determinista y sin dependencias externas.
- **No:** Route Handlers `/api/*`. No aportan valor mientras los datos son estáticos.
- **Sí:** simular la puntuación en el reproductor. Deja la pantalla completa y probable sin implementar un juego.
- **Sí:** el guardado de puntuación solo cambia estado local. Nada lee `av_scores` todavía, así que persistirlo sería datos huérfanos.
- **Sí:** omitir "TU MEJOR MARCA" y el menú de usuario. Dependen de una sesión que queda fuera de alcance.
- **Sí:** `components/` + `lib/` en la raíz. Coincide con el alias `@/*` y la ausencia de `src/`.
- **Sí:** reutilizar las clases de `app/globals.css`. Ya contiene todas las clases del `styles.css` del template, por lo que se mantiene fidelidad visual.
- **No:** migrar a Tailwind. Más trabajo y riesgo de divergir del diseño.
- **Sí:** `'use client'` solo en componentes con estado o eventos (Nav, filtros, tilt, player, auth, tabs del salón).
- **Sí:** en el reproductor, el nombre por defecto es `INVITADO` y el campo del modal es editable (máx. 10 caracteres, mayúsculas), como en el template.
- **Sí:** cabecera y comentarios de interfaz en español, igual que el template.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Next.js 16 cambia APIs respecto a versiones anteriores (`params` asíncrono, tipos de ruta) | Leer `node_modules/next/dist/docs/` antes del paso 4 y usar `PageProps<"/juegos/[id]">`, que solo existe tras `next dev` o `next build`. |
| Errores de hidratación por `Math.random()` o fechas | Aleatoriedad solo dentro de `useEffect` en `GamePlayer`; `seededScores` es determinista. |
| Efecto tilt y animaciones afectan a rendimiento o accesibilidad | Respetar `prefers-reduced-motion` si el CSS existente ya lo contempla; no añadir animaciones nuevas. |
| Clases CSS del template con nombres globales chocan con otras | Reutilizarlas sin renombrar; cualquier clase nueva lleva el prefijo `av-`. |
| El bucle de nivel del template (`score % 2500 < 100`) puede subir de nivel varias veces seguidas | Mantener la lógica del template; es comportamiento simulado y no se considera un defecto en este spec. |

---

## Qué **no** está en este spec

- Juegos jugables de ningún tipo.
- Sesión de usuario, registro real, OAuth o cualquier backend.
- Persistencia de puntuaciones o ranking real.
- Fila "TU MEJOR MARCA" y menú de usuario.
- Migración a Tailwind o rediseño visual.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
