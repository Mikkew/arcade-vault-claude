"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthStatus } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
export type AuthState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      values: { username: string; email: string };
    };
const MIN_PASSWORD = 8;
// bcrypt ignora lo que pasa de 72 bytes.
const MAX_PASSWORD = 72;
const MAX_EMAIL = 120;
// Misma regla que el check de public.profiles.
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};
const failWith =
  (values: { username: string; email: string }) =>
  (message: string): AuthState => ({ status: "error", message, values });
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = {
    username: field(formData, "username").trim(),
    email: field(formData, "email").trim(),
  };
  const password = field(formData, "password");
  const fail = failWith(values);
  if (!USERNAME_RE.test(values.username)) {
    return fail(
      "ERROR: EL USUARIO DEBE TENER 3-16 CARACTERES (LETRAS, NÚMEROS Y _).",
    );
  }
  if (values.email.length > MAX_EMAIL || !EMAIL_RE.test(values.email)) {
    return fail("ERROR: CORREO NO VÁLIDO.");
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return fail(
      `ERROR: LA CONTRASEÑA DEBE TENER ENTRE ${MIN_PASSWORD} Y ${MAX_PASSWORD} CARACTERES.`,
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password,
    options: { data: { username: values.username } },
  });
  // Mensaje único: no distingue usuario repetido de correo repetido ni de otros fallos.
  if (error) {
    console.error(
      `[auth] signUp falló: ${error.code ?? error.name} ${error.message}`,
    );
    return fail(
      "ERROR: NO SE PUDO CREAR LA CUENTA. PRUEBA OTRO USUARIO O CORREO.",
    );
  }
  // Sin sesión: la confirmación de email está activa, o el correo ya existía.
  if (!data.session) {
    return fail(
      "ERROR: NO SE PUDO INICIAR SESIÓN. PRUEBA A ENTRAR CON TU CORREO Y CONTRASEÑA.",
    );
  }
  revalidatePath("/", "layout");
  // Vuelve a la página que pidió el login (?next=), validada contra redirecciones abiertas.
  redirect(safeNext(field(formData, "next")));
}
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = { username: "", email: field(formData, "email").trim() };
  const password = field(formData, "password");
  const fail = failWith(values);
  if (!values.email || !password) {
    return fail("ERROR: FALTAN CAMPOS OBLIGATORIOS.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password,
  });
  // Error genérico: no revela si el correo existe.
  if (error) {
    return fail("ERROR: CORREO O CONTRASEÑA INCORRECTOS.");
  }
  revalidatePath("/", "layout");
  redirect(safeNext(field(formData, "next")));
}
const OAUTH_PROVIDERS = ["github", "google"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
const isOAuthProvider = (value: string): value is OAuthProvider =>
  (OAUTH_PROVIDERS as readonly string[]).includes(value);
// GitHub o Google (spec 11). El proveedor llega del botón pulsado (name="provider").
// Flujo PKCE: el verificador queda en una cookie y /auth/callback canjea el código.
export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = field(formData, "provider");
  const next = safeNext(field(formData, "next"));
  const back = `/acceso?error=oauth&next=${encodeURIComponent(next)}`;
  if (!isOAuthProvider(provider)) redirect(back);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error(
      "[auth] Falta NEXT_PUBLIC_SITE_URL para construir la URL de retorno de OAuth.",
    );
    redirect(back);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback?flow=oauth&next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    console.error(
      `[auth] signInWithOAuth(${provider}) falló: ${error?.code ?? error?.name} ${error?.message}`,
    );
    redirect(back);
  }
  redirect(data.url);
}
// Primer acceso con OAuth: crea el perfil con el username elegido (spec 11).
export async function claimUsername(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = { username: field(formData, "username").trim(), email: "" };
  const next = safeNext(field(formData, "next"));
  const fail = failWith(values);
  if (!USERNAME_RE.test(values.username)) {
    return fail(
      "ERROR: EL USUARIO DEBE TENER 3-16 CARACTERES (LETRAS, NÚMEROS Y _).",
    );
  }
  const auth = await getAuthStatus();
  if (auth.status === "anon") {
    return fail("ERROR: TU SESIÓN HA CADUCADO. VUELVE A ENTRAR.");
  }
  // Ya tiene perfil (otra pestaña, o volvió atrás): no hay nada que reclamar.
  if (auth.status === "ready") redirect(next);
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_username", {
    p_username: values.username,
  });
  if (error) {
    // 23505: el nombre ya existe (unique) o el perfil se creó en otra pestaña.
    if (error.code === "23505") {
      return fail("ERROR: ESE USUARIO YA ESTÁ COGIDO. PRUEBA OTRO.");
    }
    console.error(
      `[auth] claim_username falló: ${error.code ?? error.name} ${error.message}`,
    );
    return fail("ERROR: NO SE PUDO GUARDAR EL USUARIO. INTÉNTALO DE NUEVO.");
  }
  revalidatePath("/", "layout");
  redirect(next);
}
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error(`[auth] signOut falló: ${error.message}`);
  revalidatePath("/", "layout");
  redirect("/");
}
export async function requestReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = { username: "", email: field(formData, "email").trim() };
  const fail = failWith(values);
  if (values.email.length > MAX_EMAIL || !EMAIL_RE.test(values.email)) {
    return fail("ERROR: CORREO NO VÁLIDO.");
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error(
      "[auth] Falta NEXT_PUBLIC_SITE_URL para construir el enlace de recuperación.",
    );
    return fail(
      "ERROR: NO SE PUDO ENVIAR EL CORREO. INTÉNTALO DE NUEVO MÁS TARDE.",
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/acceso/nueva`,
  });
  // Responde igual exista o no el correo, para no permitir enumerar usuarios.
  if (error)
    console.error(
      `[auth] resetPasswordForEmail falló: ${error.code ?? error.name} ${error.message}`,
    );
  return { status: "success" };
}
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = { username: "", email: "" };
  const password = field(formData, "password");
  const confirm = field(formData, "confirm");
  const fail = failWith(values);
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return fail(
      `ERROR: LA CONTRASEÑA DEBE TENER ENTRE ${MIN_PASSWORD} Y ${MAX_PASSWORD} CARACTERES.`,
    );
  }
  if (password !== confirm) {
    return fail("ERROR: LAS CONTRASEÑAS NO COINCIDEN.");
  }
  const supabase = await createClient();
  // Requiere la sesión de recuperación que crea /auth/callback.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return fail("ERROR: EL ENLACE HA CADUCADO. SOLICITA UNO NUEVO.");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error(
      `[auth] updateUser falló: ${error.code ?? error.name} ${error.message}`,
    );
    return fail("ERROR: NO SE PUDO CAMBIAR LA CONTRASEÑA. INTÉNTALO DE NUEVO.");
  }
  revalidatePath("/", "layout");
  redirect("/juegos");
}
