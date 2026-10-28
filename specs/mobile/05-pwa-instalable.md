# MÓVIL · SPEC 05 — Arcade Vault instalable como app (PWA)

> **Estado:** Draft
> **Depende de:** SPEC 06, SPEC 10, mobile/01-viewport-safe-areas
> **Fecha:** 2026-10-27
> **Objetivo:** Que Arcade Vault se pueda añadir a la pantalla de inicio en Android e iOS y abrirse en modo `standalone` con su nombre, su icono pixel art y el color del portal, sin forzar la orientación y con salida visible en cada página.

---

## Por qué existe este spec

Hoy el portal no es instalable. La auditoría (estática, 2026-10-27) encuentra:

| Pieza | Estado |
| --- | --- |
| `app/manifest.ts` (o `.json`/`.webmanifest`) | **falta** |
| Iconos 192 y 512 px | **falta** |
| Icono `maskable` | **falta** |
| `app/apple-icon.png` (180 px) | **falta** |
| `app/icon.*` | **falta**; solo existe `app/favicon.ico`, el de la plantilla de create-next-app (commit `99b7df1`, 16 y 32 px) |
| `viewport` / `themeColor` | **falta** (lo resuelve mobile/01) |
| `appleWebApp` en `metadata` | **falta** (`app/layout.tsx:26-30`) |
| Service worker / offline | **falta** (no se propone; ver *Decisiones*) |

Para RANARIA y los demás juegos 4:3, la orientación importa: la spec 10 decidió no forzarla y mobile/02 hace jugable el horizontal en teléfonos. El manifest no debe fijar `orientation`.

En modo `standalone` no hay barra del navegador ni botón Atrás en iOS. Todas las páginas auditadas tienen salida: el `Nav` (con la hamburguesa a ≤ 840 px) en todas, `SALIR` en el HUD del player y `VOLVER AL VAULT` en la ficha y en el modal de FIN DEL JUEGO. Con `statusBarStyle: "black-translucent"` el `Nav` queda bajo la barra de estado si no se aplican las safe-areas de mobile/01.

---

## Alcance

**Dentro:**

- `app/manifest.ts` con la convención de metadatos de Next 16.
- Iconos PNG: 192 y 512 (`purpose: "any"`), 512 `maskable`, `app/apple-icon.png` de 180 px y `app/icon.png` para el favicon moderno.
- `appleWebApp` en `metadata` de `app/layout.tsx`.
- Comprobación de salidas en `standalone` y ajustes con `@media (display-mode: standalone)` si hacen falta.
- Comprobación de que el enlace de recuperación y `/auth/callback` caen dentro del `scope`.

**Fuera de alcance (para otros specs):**

- Service worker, caché y página «SIN SEÑAL» sin conexión (si se aprueba, irá en `mobile/06-pwa-offline`).
- Pantallas de arranque de iOS (`startupImage`).
- Notificaciones push, accesos directos (`shortcuts`) y `share_target`.
- Bloqueo de orientación y pantalla completa.

---

## Modelo de datos

No hay tablas ni columnas nuevas.

`app/manifest.ts` (leer antes `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`):

```ts
// Valores; la forma exacta la da MetadataRoute.Manifest
{
  id: "/",
  name: "Arcade Vault · Portal Retro",
  short_name: "Arcade Vault", // 12 caracteres
  description: "Portal retro de juegos arcade con leaderboards y salón de la fama.",
  lang: "es",
  dir: "ltr",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#0a0a0f", // --bg
  theme_color: "#0a0a0f",
  categories: ["games", "entertainment"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  // sin `orientation`: la spec 10 decidió no forzarla
}
```

En `metadata` de `app/layout.tsx`:

```ts
appleWebApp: {
  capable: true,
  title: "Arcade Vault",
  statusBarStyle: "black-translucent",
},
```

Archivos estáticos: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `app/apple-icon.png` (180×180) y `app/icon.png` (32×32 o 48×48). El `matcher` de `proxy.ts:9` ya excluye `.png`, así que los iconos no pasan por `updateSession`; `/manifest.webmanifest` sí pasa (sin extensión de imagen), lo que es inocuo.

---

## Plan de implementación

1. **Icono.** Diseñar con `/frontend-design` un icono pixel art coherente con la marca: el rombo cian/magenta de `.av-nav .logo-mark` (`globals.css:155`) sobre `#0a0a0f`, en una rejilla de píxeles visible, con el motivo dentro del 80 % central para la variante `maskable` (zona segura circular). Exportar las cinco piezas a su tamaño exacto, sin suavizado. Verificación: las cinco imágenes existen con las dimensiones indicadas; en <https://maskable.app> (o equivalente) la variante `maskable` no se recorta con máscara circular ni de «squircle».
2. **Manifest.** Crear `app/manifest.ts` con los valores del modelo de datos. Verificación: `npx tsc --noEmit`; `GET /manifest.webmanifest` devuelve el JSON y el HTML incluye `<link rel="manifest">`.
3. **Favicon e iOS.** Añadir `app/icon.png` y `app/apple-icon.png`; decidir si `app/favicon.ico` se sustituye por uno generado del mismo diseño (recomendado) o se borra. Añadir `appleWebApp` a `metadata`. Verificación: el HTML incluye `apple-touch-icon`, `apple-mobile-web-app-title` y `apple-mobile-web-app-status-bar-style` con `black-translucent`; la pestaña del navegador muestra el icono nuevo.
4. **Standalone.** Instalar en Android (Chrome) e iOS (Safari) y recorrer `/`, `/juegos`, `/juegos/ranaria`, `/juegos/ranaria/jugar`, `/salon`, `/acceso` y `/about`: comprobar que siempre hay una salida visible y que el `Nav` no queda bajo la barra de estado. Si algo lo necesita, compensarlo con `@media (display-mode: standalone)` reutilizando las clases de `globals.css`, diseñado con `/frontend-design`. Verificación: lista de rutas recorridas anotada en el PR.
5. **Auth dentro de la app.** Comprobar que `NEXT_PUBLIC_SITE_URL` (usado en `app/acceso/actions.ts:112-123` y `app/auth/callback/route.ts:10`) tiene el mismo origen que la app instalada, de modo que `/auth/callback?next=/acceso/nueva` cae dentro de `scope: "/"`. Verificación: iniciar sesión, cerrar sesión y guardar una puntuación de RANARIA desde la app instalada sin que se abra el navegador.
6. **Verificación final.** `npm run lint`, `npx tsc --noEmit`, `npm run build`; panel *Application → Manifest* de Chrome DevTools sin errores de instalabilidad; instalación real en Android e iOS.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `app/manifest.ts` declara `name`, `short_name` de ≤ 12 caracteres, `description` en español, `lang: "es"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `background_color` y `theme_color` `#0a0a0f`, y **no** declara `orientation`.
- [ ] Hay iconos PNG de 192 y 512 px, uno de 512 px con `purpose: "maskable"` y el motivo dentro de la zona segura, `app/apple-icon.png` de 180 px y `app/icon.png`.
- [ ] `metadata.appleWebApp` tiene `title` y `statusBarStyle: "black-translucent"`.
- [ ] Lighthouse marca la app como instalable (o, si la versión de Lighthouse ya no tiene la categoría PWA, el panel *Application → Manifest* de Chrome no muestra errores de instalabilidad), y se ha instalado y abierto en Android (Chrome) y en iOS (Safari).
- [ ] En la app instalada, vertical y horizontal funcionan (sin orientación forzada) y RANARIA se juega con la cruceta.
- [ ] En `standalone`, todas las rutas del alcance tienen una salida visible y el `Nav` no queda bajo la barra de estado ni el notch.
- [ ] El login, el logout y guardar una puntuación funcionan dentro de la app instalada sin abrir el navegador.
- [ ] En escritorio con ratón (`pointer: fine`, ≥ 1280 px) el portal se ve y se juega igual que antes (salvo el favicon).
- [ ] A 360 px de ancho ninguna ruta del alcance provoca scroll horizontal.
- [ ] Los controles táctiles de la spec 10 siguen funcionando en los juegos reales.
- [ ] Verificación con emulación móvil (390×844 y 360×740, `hasTouch`) y una prueba en un móvil real, con modelo y navegador anotados en el PR.

---

## Decisiones

- **Sí:** `short_name: "Arcade Vault"` (12 caracteres, cabe bajo el icono en Android e iOS) **(decidido por mobile-porter, pendiente de revisar)**.
- **Sí:** icono pixel art basado en el rombo cian/magenta del `logo-mark`, sobre `#0a0a0f`; su diseño pasa por `/frontend-design` **(decidido por mobile-porter, pendiente de revisar)**. **No:** usar la portada de un juego concreto (RANARIA u otro).
- **Sí:** iconos PNG estáticos en `public/icons/` y `app/`. **No:** iconos generados con `ImageResponse` en `app/icon.tsx`, que pasarían por `proxy.ts` (rutas sin extensión) y añadirían una llamada a Supabase por icono **(decidido por mobile-porter, pendiente de revisar)**.
- **Sí:** `statusBarStyle: "black-translucent"`, para que el fondo oscuro llegue hasta arriba; requiere las safe-areas de mobile/01 **(decidido por mobile-porter, pendiente de revisar)**. **No:** `default` (barra blanca, rompe el tema oscuro) ni `black` (franja negra fija).
- **Sí:** sin `orientation` en el manifest, coherente con la spec 10 y con mobile/02.
- **No:** service worker ni modo offline en esta fase. Chrome ya no exige service worker para instalar, todos los juegos necesitan red para guardar puntuaciones y el riesgo de cachear Server Actions o sesiones no compensa **(decidido por mobile-porter, pendiente de revisar)**. Si se quiere la página «SIN SEÑAL», va en `mobile/06-pwa-offline`, sin cachear `saveScore`, `acceso/actions.ts`, `about/actions.ts`, respuestas de Supabase ni cookies.
- **Sí:** `display: "standalone"`. **No:** `fullscreen`, que en Android oculta la barra de estado y choca con la decisión de la spec 10 de no ir a pantalla completa.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| En iOS, el enlace de recuperación del correo se abre en Safari, no en la app instalada | Se acepta y se documenta: el usuario cambia la contraseña en Safari y vuelve a iniciar sesión en la app. Las cookies de la app instalada en iOS son independientes de las de Safari. |
| `NEXT_PUBLIC_SITE_URL` con otro origen (por ejemplo `www.` frente a sin `www.`) saca el callback del `scope` | Paso 5: comprobar que coincide con el origen de producción y con las URLs de redirección de Supabase Auth. |
| Lighthouse 12+ ya no tiene categoría PWA | Se usa el panel *Application → Manifest* de Chrome como comprobación equivalente, anotada en el PR. |
| Sin service worker, abrir la app sin conexión muestra el error del navegador | Se acepta en esta fase; la página «SIN SEÑAL» queda para `mobile/06-pwa-offline`. |
| Al pasar a segundo plano en iOS standalone, el audio de los juegos se suspende | Lo trata mobile/04 para RANARIA; el resto de juegos, en sus specs. |
| El favicon nuevo cambia la pestaña en escritorio | Es el único cambio visible en escritorio y es intencionado. |

---

## Qué **no** está en este spec

- Service worker, caché y página sin conexión.
- `startupImage`, push, `shortcuts` y `share_target`.
- Pantalla completa y orientación forzada.
- Cambios en Supabase, `saveScore`, el leaderboard o lo que se guarda en `scores`.
