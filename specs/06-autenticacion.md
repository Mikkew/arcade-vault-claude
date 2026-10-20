# SPEC 06 — Autenticación con Supabase

> **Estado:** Implemented
> **Depende de:** SPEC 04
> **Fecha:** 2026-10-19
> **Objetivo:** Permitir registro, inicio y cierre de sesión con email y contraseña mediante Supabase Auth, con un perfil público (`profiles.username`) y el estado de sesión visible en la navegación.

---

## Por qué existe este spec

La spec 04 dejó la conexión a Supabase lista pero sin sesión. La spec 08 guardará puntuaciones asociadas a un usuario y el leaderboard necesita mostrar un nombre público sin exponer emails de `auth.users`. Esta spec es el prerrequisito: identidad, perfil y sesión. No toca puntuaciones ni juegos.

---

## Alcance

**Dentro:**

- Registro e inicio de sesión con email + contraseña, en `/acceso`, sustituyendo el comportamiento simulado de `components/AuthForm.tsx`.
- Cierre de sesión.
- Recuperación de contraseña: solicitud por email y pantalla para fijar la nueva contraseña.
- Tabla `profiles` (`id`, `username`, `created_at`) con RLS y un trigger que la rellena al registrarse.
- `proxy.ts` de refresco de sesión, diferido por la spec 04 a esta.
- Ruta de callback para el enlace de recuperación (`/auth/callback`).
- Estado de sesión en `components/Nav.tsx`: con sesión muestra el `username` y `SALIR`; sin sesión, el enlace a `/acceso`.
- Confirmación de email desactivada en desarrollo (configuración del proyecto Supabase).
- Migración SQL versionada en `supabase/migrations/`.

**Fuera de alcance (para otros specs):**

- OAuth (GitHub, Google) y magic link.
- Roles, administradores y paneles.
- Avatar y editar perfil o `username` después del registro.
- Protección de rutas (ninguna página existente exige sesión en esta spec).
- Guardar puntuaciones y leaderboard (spec 08).
- Tabla de juegos (spec 07).
- Activar la confirmación de email en producción.
- Tests automatizados (no hay runner configurado).

---

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_profiles.sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (char_length(username) between 3 and 16 and username ~ '^[A-Za-z0-9_]+$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- lectura pública: el username se muestra en el leaderboard
create policy "profiles_select_public" on public.profiles
  for select to anon, authenticated using (true);
```

- No hay política de `insert`, `update` ni `delete` para clientes: el perfil se crea solo por el trigger.
- Trigger `on_auth_user_created` (función `security definer`, `search_path = ''`) inserta en `profiles` con `username` tomado de `raw_user_meta_data->>'username'`, enviado en `signUp({ options: { data: { username } } })`.
- Si el `username` no cumple el `check` o ya existe, el registro falla y se muestra un error genérico claro.

Tipos en TypeScript:

```ts
// lib/auth.ts
export interface Profile {
  id: string;
  username: string;
}

export async function getCurrentProfile(): Promise<Profile | null>; // servidor
```

---

## Mapa de rutas

| Pantalla / recurso | Ruta                  | Archivo                         | Tipo                  |
| ------------------ | --------------------- | ------------------------------- | --------------------- |
| Acceso             | `/acceso`             | `app/acceso/page.tsx`           | Sin cambio de ruta    |
| Recuperar          | `/acceso/recuperar`   | `app/acceso/recuperar/page.tsx` | Nueva (Server)        |
| Nueva contraseña   | `/acceso/nueva`       | `app/acceso/nueva/page.tsx`     | Nueva (Server)        |
| Callback           | `GET /auth/callback`  | `app/auth/callback/route.ts`    | Route Handler         |
| Refresco de sesión | todas salvo estáticos | `proxy.ts`                      | Proxy (raíz del repo) |

Archivos nuevos:

- `supabase/migrations/<timestamp>_profiles.sql`: tabla, RLS y trigger.
- `lib/auth.ts`: `getCurrentProfile()` basado en `lib/supabase/server.ts`.
- `app/acceso/actions.ts`: Server Actions `signUp`, `signIn`, `signOut`, `requestReset`, `updatePassword`.
- `lib/supabase/proxy.ts` y `proxy.ts`: refresco de sesión con `@supabase/ssr`.
- `components/ForgotForm.tsx` y `components/NewPasswordForm.tsx` (cliente).

Archivos que cambian:

- `components/AuthForm.tsx`: formularios reales con estados de carga y error.
- `components/Nav.tsx`: muestra sesión o enlace de acceso. Si es cliente, recibe el perfil por props desde `app/layout.tsx`.
- `app/layout.tsx`: obtiene el perfil en el servidor y lo pasa a `Nav`.
- `.env.example`: añade `NEXT_PUBLIC_SITE_URL`, para construir el enlace de recuperación.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` las guías de `proxy` (sustituye a `middleware` en esta versión), Server Actions, `cookies()` y `redirect`. Consultar la skill `supabase` y la documentación vigente de `@supabase/ssr` para Next.js. Cargar `supabase-postgres-best-practices` antes de escribir la migración. No asumir firmas de memoria.

1. Escribir la migración de `profiles` y aplicarla con el MCP o CLI de Supabase. Verificación: la tabla existe con RLS activada y un `select` anónimo devuelve filas vacías sin error.
2. Crear `proxy.ts` y `lib/supabase/proxy.ts` con el refresco de sesión. Verificación: `npm run build` pasa y las páginas existentes siguen cargando.
3. Crear `lib/auth.ts` y las Server Actions de `app/acceso/actions.ts`. Verificación: `npx tsc --noEmit` pasa.
4. Conectar `AuthForm` a `signUp` y `signIn`, con validación de `username`, email y contraseña (mínimo 8 caracteres) y mensajes de error. Verificación: registrarse crea una fila en `profiles` y redirige a `/juegos`.
5. Añadir `signOut` y el estado de sesión en `Nav` y `app/layout.tsx`. Verificación: tras iniciar sesión la barra muestra el `username` y `SALIR`; al salir vuelve el enlace de acceso.
6. Crear `/acceso/recuperar`, `/acceso/nueva` y `/auth/callback`. Verificación: la solicitud dispara el email, el enlace abre `/acceso/nueva` con sesión de recuperación y la contraseña nueva permite iniciar sesión.
7. Revisar con `npm run lint`, `npx tsc --noEmit` y `npm run build`, y ejecutar el Security Advisor de Supabase. Verificación: todo pasa sin avisos de seguridad nuevos.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Registrarse con email, contraseña y `username` válidos crea el usuario, su fila en `profiles` y deja la sesión iniciada sin confirmar email.
- [ ] Un `username` repetido, de menos de 3 o más de 16 caracteres, o con símbolos, es rechazado y no crea usuario.
- [ ] Una contraseña de menos de 8 caracteres es rechazada con un mensaje visible.
- [ ] Iniciar sesión con credenciales correctas redirige a `/juegos`; con incorrectas muestra un error genérico que no revela si el email existe.
- [ ] `Nav` muestra el `username` y `SALIR` con sesión, y el enlace a `/acceso` sin ella, también tras recargar la página.
- [ ] `SALIR` cierra la sesión y la navegación vuelve al estado anónimo.
- [ ] La sesión se mantiene al navegar y recargar, y el token se refresca vía `proxy.ts`.
- [ ] La recuperación de contraseña envía el email, el enlace permite fijar una contraseña nueva y con ella se puede iniciar sesión.
- [ ] `profiles` tiene RLS activada; un cliente autenticado no puede insertar, actualizar ni borrar filas de `profiles` directamente.
- [ ] La función del trigger usa `security definer` con `search_path` vacío.
- [ ] Ninguna página muestra ni consulta el email de otros usuarios, y no existe `SUPABASE_SERVICE_ROLE_KEY` en el código.
- [ ] `/`, `/juegos`, `/salon` y `/about` siguen funcionando para usuarios anónimos y sin errores en la consola.
- [ ] No hay errores de hidratación al cargar con y sin sesión.

---

## Decisiones

- **Sí:** email + contraseña. Es lo que ya sugiere `AuthForm` y no requiere proveedores externos.
- **No:** OAuth ni magic link. Añaden configuración externa (apps de proveedor, SMTP) que no aporta al objetivo.
- **Sí:** tabla `profiles` con `username` público. Evita exponer `auth.users` y es lo que el leaderboard muestra.
- **No:** guardar el nombre solo en la metadata de Auth. Queda duplicado en cada puntuación y no se puede consultar con RLS.
- **Sí:** el perfil lo crea un trigger y no el cliente. Garantiza que cada usuario tiene perfil y que no se puede falsear el `id`.
- **Sí:** `username` único, de 3 a 16 caracteres alfanuméricos y guion bajo. Es legible en el ranking y evita suplantaciones por caracteres raros.
- **Sí:** `proxy.ts` entra en esta spec. Sin él, con `@supabase/ssr` los tokens caducan en Server Components. La spec 04 lo difirió explícitamente a la autenticación.
- **Sí:** confirmación de email desactivada en desarrollo, para poder verificar el flujo. Se activa al desplegar y queda fuera de esta spec.
- **Sí:** Server Actions para las operaciones de auth. Las cookies se gestionan en el servidor con `lib/supabase/server.ts`.
- **No:** proteger rutas todavía. Ninguna página actual requiere sesión; la spec 08 solo la exige al guardar.
- **No:** edición de perfil. El `username` es inmutable por ahora para no romper el histórico del ranking.

---

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Next.js 16 renombró `middleware` a `proxy` y su API difiere de lo conocido           | Leer `node_modules/next/dist/docs/` antes del paso 2 y verificar con `npm run build`.       |
| El trigger falla y deja un usuario en `auth.users` sin perfil, o bloquea el registro | Pruebas con `username` válido, repetido e inválido en el paso 4; error genérico al cliente. |
| Enumeración de usuarios por mensajes de error o por la recuperación de contraseña    | Mensajes genéricos en login y en la solicitud de recuperación (responde igual exista o no). |
| Función `security definer` mal configurada abre una escalada de privilegios          | `search_path` vacío, nombres calificados y revisión con el Security Advisor en el paso 7.   |
| El enlace de recuperación apunta a un dominio incorrecto                             | `NEXT_PUBLIC_SITE_URL` y URL de redirección permitida en el proyecto Supabase.              |
| `Nav` pasa a depender de la sesión y el layout deja de poder ser estático            | Aceptado: el layout lee cookies. Revisar que las páginas estáticas sigan funcionando.       |

---

## Qué **no** está en este spec

- OAuth y magic link.
- Roles, administración y avatar.
- Edición de perfil y cambio de `username`.
- Protección de rutas.
- Puntuaciones, leaderboard y tabla de juegos.
- Confirmación de email en producción.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propio spec.
