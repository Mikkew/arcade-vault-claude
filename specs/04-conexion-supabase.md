# SPEC 04 — Conexión a Supabase

> **Estado:** Implemented
> **Depende de:** SPEC 03
> **Fecha:** 2026-10-16
> **Objetivo:** Conectar la aplicación Next.js a Supabase mediante clientes de navegador y de servidor con `@supabase/ssr`, sin crear tablas ni código que las requiera.

---

## Por qué existe este spec

El proyecto ya tiene el servidor MCP de Supabase configurado (`.mcp.json`) y las skills `supabase` y `supabase-postgres-best-practices`, pero la aplicación aún no se comunica con ningún proyecto de Supabase. Esta spec deja solo la infraestructura de conexión (paquetes, variables de entorno y helpers de cliente) para que futuras specs (auth, puntuaciones, etc.) la reutilicen. No define esquema, tablas, migraciones ni consultas.

---

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Helper de cliente de navegador en `lib/supabase/client.ts`.
- Helper de cliente de servidor en `lib/supabase/server.ts`, basado en las cookies de Next.js.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example`.
- Route Handler `app/api/supabase/health/route.ts` que verifica la conexión sin consultar tablas.

**Fuera de alcance (para otros specs):**

- Crear tablas, esquemas, migraciones, políticas RLS, funciones o cualquier SQL.
- Cualquier consulta a tablas (`.from(...)`) o código que presuponga que existen.
- Autenticación (registro, login, sesión, `AuthForm` real) y `proxy.ts` de refresco de sesión.
- `SUPABASE_SERVICE_ROLE_KEY` y cliente admin.
- Generar tipos de base de datos (`supabase gen types`).
- Sustituir los datos mock de `lib/games.ts` y `lib/home.ts`.
- Storage, Realtime y Edge Functions.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

Esta feature no introduce datos ni tablas. No se persiste nada en la base de datos.

Variables de entorno (la URL y la publishable key son públicas por diseño):

| Variable                               | Uso                           |
| -------------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key del proyecto. |

Firmas de los helpers:

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>;
```

Respuesta del health check:

```ts
// GET /api/supabase/health
{
  ok: true;
} // 200
{
  ok: false;
} // 500, sin detalles internos
```

---

## Mapa de rutas

| Recurso      | Ruta                       | Archivo                            | Tipo          |
| ------------ | -------------------------- | ---------------------------------- | ------------- |
| Health check | `GET /api/supabase/health` | `app/api/supabase/health/route.ts` | Route Handler |

Archivos nuevos:

- `lib/supabase/client.ts`: `createBrowserClient` de `@supabase/ssr`.
- `lib/supabase/server.ts`: `createServerClient` de `@supabase/ssr` con el almacén de cookies de Next.js.
- `app/api/supabase/health/route.ts`: llama a `supabase.auth.getSession()` y responde `{ ok }`.

Archivos que cambian:

- `.env.example`: añade las dos variables sin valores.
- `package.json` y `package-lock.json`: dependencias nuevas.

No se modifica ninguna página, componente ni estilo existente.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` las guías de variables de entorno, `cookies()` y Route Handlers, y consultar la documentación vigente de `@supabase/ssr` para Next.js (o la skill `supabase`). No asumir firmas de memoria.

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`, y añadir las dos variables a `.env.example` sin valores. Verificación: `npm run build` pasa y `.env.local` sigue ignorado por git.
2. Crear `lib/supabase/client.ts` y `lib/supabase/server.ts`. Ambos fallan con un error claro si falta alguna variable de entorno. Verificación: `npx tsc --noEmit` pasa.
3. Crear `app/api/supabase/health/route.ts` con `auth.getSession()`, sin `.from(...)`. Verificación: con `.env.local` configurado, `GET /api/supabase/health` devuelve `{ "ok": true }`.
4. Revisar con `npm run lint` y `npm run build`, y confirmar que no hay referencias a tablas ni SQL en el código. Verificación: ambos comandos pasan.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y exportan `createClient`.
- [ ] Con las variables configuradas en `.env.local`, `GET /api/supabase/health` responde 200 con `{ "ok": true }`.
- [ ] Con las variables ausentes o inválidas, el health check responde 500 con `{ "ok": false }` sin exponer URL, claves ni el error interno.
- [ ] No existe en el repositorio ninguna llamada `.from(`, ningún archivo `.sql` ni carpeta de migraciones creados por esta spec.
- [ ] `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores, y `.env.local` sigue ignorado por git.
- [ ] No se usa ni se menciona `SUPABASE_SERVICE_ROLE_KEY` en el código.
- [ ] `/`, `/juegos`, `/salon`, `/acceso` y `/about` siguen funcionando sin cambios y sin errores en la consola.

---

## Decisiones

- **Sí:** `@supabase/ssr` con cliente de navegador y de servidor. Es el patrón oficial para App Router y evita rehacer los helpers al añadir auth.
- **No:** solo `@supabase/supabase-js`. No gestiona cookies y habría que migrarlo después.
- **No:** `proxy.ts` de refresco de sesión. Sin auth no hay sesión que refrescar; se añade en la spec de autenticación.
- **Sí:** publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Es la clave actual de Supabase y es segura para el navegador cuando se usa RLS.
- **No:** anon key legacy. Se usaría solo si el proyecto no tuviera publishable key.
- **No:** service role key ni cliente admin. Salta RLS y nada en esta spec la necesita.
- **Sí:** health check con `auth.getSession()`. Valida URL y clave sin tocar tablas, tal como se pidió.
- **No:** consultar una tabla para probar. Contradice el requisito de no depender de tablas.
- **Sí:** error genérico hacia el cliente en el health check. Evita filtrar configuración.
- **Sí:** helpers en `lib/supabase/`, junto a `lib/games.ts` y `lib/home.ts`.

---

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| La API de `@supabase/ssr` o de Next.js 16 difiere de lo que conozco (`cookies()` asíncrono, etc.) | Leer `node_modules/next/dist/docs/` y la documentación vigente de Supabase antes del paso 2. |
| El health check queda como endpoint público permanente                                            | Solo devuelve `{ ok }`; puede eliminarse cuando exista la primera funcionalidad real.        |
| Faltan las variables en `.env.local` o en despliegue                                              | Los helpers lanzan un error claro y el health check responde 500 genérico.                   |
| Se filtra una clave sensible al repositorio                                                       | Solo se usan claves públicas, `.env*` está ignorado y `.env.example` no lleva valores.       |
| Un `.from(...)` colado asume tablas inexistentes                                                  | Criterio de aceptación explícito y revisión en el paso 4.                                    |

---

## Qué **no** está en este spec

- Tablas, esquemas, migraciones, RLS y SQL.
- Autenticación y refresco de sesión con `proxy.ts`.
- Service role key y cliente admin.
- Tipos generados de la base de datos.
- Reemplazo de datos mock por datos reales.
- Storage, Realtime y Edge Functions.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
