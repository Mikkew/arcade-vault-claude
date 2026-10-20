"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  redirect("/juegos");
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
  redirect("/juegos");
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
