import { createClient } from "@/lib/supabase/server";
export interface Profile {
  id: string;
  username: string;
}
// Perfil del usuario con sesión, o null si es anónimo. Solo servidor.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  // getClaims() valida la firma del token; getSession() no es fiable en el servidor.
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[auth] No se pudo leer el perfil: ${error.message}`);
    return null;
  }
  return profile;
}
