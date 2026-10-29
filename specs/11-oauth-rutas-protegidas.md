# SPEC 11 — OAuth y rutas protegidas

> **Estado:** Approved
> **Depende de:** SPEC 06, SPEC 08
> **Fecha:** 2026-10-28
> **Objetivo:** Permitir iniciar sesión con GitHub y Google mediante Supabase Auth, con una pantalla para elegir `username` en el primer acceso, y exigir sesión con perfil para jugar en `/juegos/[id]/jugar`, volviendo al juego tras el login.

---

## Por qué existe este spec

La spec 06 dejó fuera OAuth y la protección de rutas. Hoy `AuthForm` muestra los botones GOOGLE y GITHUB, pero no hacen nada. Además, cualquiera puede jugar sin cuenta y solo descubre al final de la partida que no puede guardar la puntuación. Hay otro problema: el trigger `handle_new_user` exige `raw_user_meta_data->>'username'`, y un usuario OAuth no lo trae, así que hoy su registro fallaría.

---

## Alcance

**Dentro:**

- Botones GITHUB y GOOGLE funcionales en `AuthForm` (`signInWithOAuth`, flujo PKCE, retorno por `/auth/callback`).
- Pantalla nueva `/acceso/usuario` para elegir `username` cuando hay sesión pero no hay fila en `profiles`.
- Una migración nueva: el trigger solo crea el perfil si llega un `username`, y una RPC `public.claim_username(text)` crea el perfil del usuario actual.
- Proteger `/juegos/[id]/jugar`: sin sesión, `redirect('/acceso?next=/juegos/<id>/jugar')`; con sesión pero sin perfil, `redirect('/acceso/usuario?next=...')`.
- Parámetro `?next=` en `/acceso` y `/acceso/usuario`, que respetan `signIn`, `signUp`, OAuth y `claim_username`, validado con la misma regla que `safeNext` del callback.
- `Nav` con un tercer estado: con sesión pero sin perfil muestra `ELIGE USUARIO` (enlace a `/acceso/usuario`) y `SALIR`.
- Quitar el botón `JUGAR COMO INVITADO` de `AuthForm`.
- Los botones `JUGAR` del catálogo y del detalle siguen enlazando a `/jugar`; la redirección la hace la página.
- Documentar en la spec la configuración manual de los proveedores (GitHub OAuth App, Google Cloud OAuth client, Supabase Auth Providers y Redirect URLs).
- Vincular cuentas con el mismo email verificado: es el comportamiento automático de Supabase, se documenta y se verifica.

**Fuera de alcance (para otros specs):**

- Magic link y otros proveedores (Discord, Apple…).
- Editar el `username` o el avatar después de elegirlo.
- Proteger otras rutas (`/juegos`, `/juegos/[id]`, `/salon`, `/about` y `/` siguen siendo públicas).
- Protección en `proxy.ts` (sigue limitado a refrescar la sesión).
- Desvincular identidades o gestionar proveedores desde la UI.
- Activar la confirmación de email en producción.
- Usar avatar o nombre del proveedor en el portal.
- Tests automatizados (no hay runner).

---

## Modelo de datos

Migración nueva `supabase/migrations/<timestamp>_oauth_profiles.sql` (la de spec 06 es inmutable):

```sql
-- El trigger solo crea perfil si el registro trae username (email+contraseña).
-- Con OAuth no llega: el perfil lo crea después claim_username().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (id, username)
    values (new.id, new.raw_user_meta_data ->> 'username');
  end if;
  return new;
end;
$$;

-- Crea el perfil del usuario con sesión. Falla si ya tiene uno,
-- si el nombre no cumple el check o si está cogido (unique).
create function public.claim_username(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.profiles (id, username) values (auth.uid(), p_username);
end;
$$;

revoke execute on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;
```

- `profiles` sigue sin políticas de escritura y con los privilegios revocados: la única vía de escritura es el trigger o la RPC.
- Si el usuario ya tiene perfil, la PK hace fallar el insert (`23505`), igual que con un `username` repetido. La action distingue el caso consultando antes el perfil.

TypeScript (`lib/auth.ts`):

```ts
export interface Profile { id: string; username: string } // sin cambios

export type AuthStatus =
  | { status: "anon" }
  | { status: "needs-username"; userId: string }
  | { status: "ready"; profile: Profile };

export async function getAuthStatus(): Promise<AuthStatus>; // servidor, React.cache
// getCurrentProfile() se mantiene, implementada sobre getAuthStatus().
```

Helper compartido `lib/safe-next.ts`: `safeNext(value: string | null | undefined, fallback = "/juegos"): string`, que solo acepta rutas internas (empiezan por `/` y no por `//`). `app/auth/callback/route.ts` pasa a usarlo.

---

## Mapa de rutas

| Pantalla / recurso | Ruta                  | Archivo                        | Tipo                         |
| ------------------ | --------------------- | ------------------------------ | ---------------------------- |
| Acceso             | `/acceso?next=`       | `app/acceso/page.tsx`          | Cambia (lee `searchParams`)  |
| Elegir usuario     | `/acceso/usuario?next=` | `app/acceso/usuario/page.tsx` | Nueva (Server)               |
| Callback           | `GET /auth/callback`  | `app/auth/callback/route.ts`   | Cambia (OAuth + sin perfil)  |
| Jugar              | `/juegos/[id]/jugar`  | `app/juegos/[id]/jugar/page.tsx` | Cambia (redirect sin sesión) |

Archivos nuevos:

- `supabase/migrations/<timestamp>_oauth_profiles.sql`
- `app/acceso/usuario/page.tsx` y `components/UsernameForm.tsx` (cliente, `useActionState`, mismo estilo `auth-card`)
- `lib/safe-next.ts`

Archivos que cambian:

- `app/acceso/actions.ts`: `signInWithProvider(provider, next)` (Server Action: `signInWithOAuth` con `redirectTo: ${NEXT_PUBLIC_SITE_URL}/auth/callback?next=...` y `redirect(data.url)`), `claimUsername`, y `signIn`/`signUp` con un campo oculto `next`.
- `components/AuthForm.tsx`: recibe `next`, conecta los botones de proveedor, añade el input oculto `next` y quita `JUGAR COMO INVITADO`.
- `app/auth/callback/route.ts`: tras canjear el código, si no hay perfil redirige a `/acceso/usuario?next=...`. Si el error viene de OAuth, redirige a `/acceso?error=oauth`, no a `/acceso/recuperar`. Se distinguen con un parámetro `flow=oauth` en `redirectTo`.
- `lib/auth.ts`: `getAuthStatus()`.
- `app/layout.tsx` y `components/Nav.tsx`: pasan y pintan el estado de tres vías.
- `app/juegos/[id]/jugar/page.tsx`: redirect según `getAuthStatus()`; `isLoggedIn` pasa a ser siempre `true` (y se puede simplificar en `GamePlayer`).
- `app/juegos/[id]/jugar/actions.ts`: `saveScore` también devuelve `unauthenticated` si no hay perfil.
- `components/GamePlayer.tsx`: el enlace `INICIA SESIÓN PARA GUARDAR` (sesión caducada a mitad de partida) lleva `?next=` a la página actual.

---

## Configuración manual previa (la hace el usuario)

1. **GitHub**: Settings → Developer settings → OAuth Apps → New. Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Google Cloud**: un OAuth client ID de tipo Web, con el mismo callback de Supabase como Authorized redirect URI y la pantalla de consentimiento configurada.
3. **Supabase** → Authentication → Providers: activar GitHub y Google con su client id y secret.
4. **Supabase** → Authentication → URL Configuration: añadir `http://localhost:3000/auth/callback**` y la URL de producción a las Redirect URLs.

Sin estos pasos, los botones redirigen a un error del proveedor y vuelven a `/acceso?error=oauth`.

---

## Plan de implementación

Antes de escribir código, leer en `node_modules/next/dist/docs/01-app/` las guías de autenticación, `redirect` y `searchParams`. Cargar las skills `supabase` y `supabase-postgres-best-practices`, consultar la documentación vigente de `signInWithOAuth` con `@supabase/ssr` (PKCE) e inspeccionar el esquema con `list_tables`.

1. Escribir y aplicar la migración. Verificación: el registro con contraseña sigue creando el perfil; `select public.claim_username('x')` como `anon` falla por permisos; como `authenticated` sin perfil crea la fila.
2. Crear `lib/safe-next.ts` y `getAuthStatus()`, y usar `safeNext` en el callback. Verificación: `npx tsc --noEmit` pasa.
3. Proteger `/juegos/[id]/jugar` y soportar `?next=` en `/acceso` (`signIn`/`signUp`). Verificación: un anónimo que abre `/juegos/rocas/jugar` acaba en `/acceso?next=/juegos/rocas/jugar` y, tras el login, vuelve a ROCAS.
4. Crear `/acceso/usuario`, `UsernameForm` y `claimUsername`, y añadir el estado `needs-username` en `Nav`, la página de jugar y `saveScore`. Verificación: un usuario sin perfil (creado con la RPC sin llamarla) ve `ELIGE USUARIO` y, al elegir un nombre válido, vuelve a `next`.
5. Conectar los botones de GitHub y Google con `signInWithProvider` y adaptar el callback (sin perfil → `/acceso/usuario`; error → `/acceso?error=oauth`, con el mensaje en `AuthForm`). Quitar `JUGAR COMO INVITADO`. Verificación: con los proveedores configurados, un primer login con GitHub pide el username y un segundo login entra directo.
6. Revisión final: `npm run lint`, `npx tsc --noEmit`, `npm run build` y el Security Advisor de Supabase.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] Un anónimo que abre `/juegos/<id>/jugar` termina en `/acceso?next=/juegos/<id>/jugar` y no ve el juego.
- [ ] Tras iniciar sesión o registrarse con contraseña desde esa URL, se vuelve a `/juegos/<id>/jugar`.
- [ ] Sin `next`, el login sigue llevando a `/juegos`.
- [ ] `next=https://evil.com` o `next=//evil.com` se ignora y lleva a `/juegos`.
- [ ] El primer login con GitHub (y con Google) lleva a `/acceso/usuario`. Al elegir un `username` válido se crea la fila en `profiles` y se vuelve a `next`.
- [ ] El segundo login con el mismo proveedor entra directo, sin pedir el username.
- [ ] En `/acceso/usuario`, un nombre repetido o inválido muestra un error y no crea fila. Con perfil ya creado, la página redirige a `next` o a `/juegos`.
- [ ] Con sesión y sin perfil, `Nav` muestra `ELIGE USUARIO` y `SALIR`; `/juegos/<id>/jugar` redirige a `/acceso/usuario?next=...`, y `saveScore` devuelve `unauthenticated`.
- [ ] Si un email verificado de Google coincide con una cuenta de contraseña existente, se entra a esa misma cuenta y perfil, sin duplicar `profiles`.
- [ ] Un error o cancelación en el proveedor vuelve a `/acceso` con un mensaje visible.
- [ ] `JUGAR COMO INVITADO` ya no aparece.
- [ ] `/`, `/juegos`, `/juegos/<id>`, `/salon` y `/about` siguen siendo accesibles sin sesión.
- [ ] `claim_username` no es ejecutable por `anon`, usa `security definer` con `search_path` vacío, y `profiles` sigue sin privilegios de escritura para clientes.
- [ ] No hay `SUPABASE_SERVICE_ROLE_KEY` en el código, ni avisos nuevos en el Security Advisor.

---

## Decisiones

| Decisión | Alternativa descartada | Por qué |
| --- | --- | --- |
| Pantalla `/acceso/usuario` para elegir el nombre | Autogenerarlo en el trigger desde los metadatos del proveedor | Mantiene la regla de nombres y no impone un nombre que luego no se puede editar |
| RPC `claim_username` con `security definer` | Política RLS de insert para `authenticated` | La tabla sigue cerrada a escrituras directas, como en la spec 06 |
| Proteger solo `/juegos/[id]/jugar` | Proteger todo el portal / no proteger nada | El portal sigue siendo público para descubrir juegos; jugar exige cuenta porque guardar la exige |
| Comprobación en la página con `redirect` | Lista de rutas en `proxy.ts` | Más explícito y cerca de los datos; `proxy` queda como refresco optimista |
| Sin perfil: redirigir solo en rutas protegidas | Forzar `/acceso/usuario` en todo el portal | Menos intrusivo; la `Nav` avisa |
| Volver a `?next=` validado | Ir siempre a `/juegos` | El jugador vuelve al juego que eligió |
| GitHub y Google, configuración manual documentada | Un solo proveedor | Los botones ya existen en la UI; el código es el mismo para ambos |
| Vinculación automática de Supabase por email verificado | Gestión propia de identidades | No requiere código y evita perfiles duplicados |
| `signInWithOAuth` en una Server Action | En el cliente con `lib/supabase/client.ts` | Coherente con el resto de `actions.ts`; el verificador PKCE queda en cookies del servidor |

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Si los proveedores no están configurados, los botones fallan | El error vuelve a `/acceso?error=oauth` con mensaje; la configuración está documentada |
| `redirectTo` no permitido en Supabase | Añadir las Redirect URLs (paso 4 de la configuración); se verifica en local y en producción |
| Usuario OAuth que abandona `/acceso/usuario` | Queda en `needs-username`; la `Nav` y las rutas protegidas lo devuelven ahí |
| Carrera entre dos pestañas reclamando nombre | `unique` y PK en `profiles`: el segundo insert falla con error claro |
| Quitar el modo invitado reduce las partidas casuales | Aceptado: el catálogo, el detalle y el salón siguen siendo públicos |
| Redirección abierta vía `next` | `safeNext` compartido y criterio de aceptación explícito |

---

## Qué **no** está en este spec

Magic link, más proveedores, editar el perfil o el avatar, proteger otras rutas, protección en `proxy.ts`, desvincular identidades, confirmar el email en producción y tests automatizados.
