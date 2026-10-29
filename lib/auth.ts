import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
export interface Profile {
  id: string;
  username: string;
}
// anon: sin sesión. needs-username: sesión OAuth sin fila en profiles (spec 11).
export type AuthStatus =
  | { status: "anon" }
  | { status: "needs-username"; userId: string }
  | { status: "ready"; profile: Profile };
// Estado de sesión y perfil del usuario actual. Solo servidor; una consulta por petición.
export const getAuthStatus = cache(async (): Promise<AuthStatus> => {
  const supabase = await createClient();
  // getClaims() valida la firma del token; getSession() no es fiable en el servidor.
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return { status: "anon" };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[auth] No se pudo leer el perfil: ${error.message}`);
    return { status: "anon" };
  }
  return profile
    ? { status: "ready", profile }
    : { status: "needs-username", userId: id };
});
// Perfil del usuario con sesión, o null si es anónimo o aún no tiene perfil. Solo servidor.
export async function getCurrentProfile(): Promise<Profile | null> {
  const auth = await getAuthStatus();
  return auth.status === "ready" ? auth.profile : null;
}
