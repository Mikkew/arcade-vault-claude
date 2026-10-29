import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
// Canjea el código de Supabase: recuperación de contraseña (spec 06) u OAuth
// (spec 11, marcado con flow=oauth en el redirectTo de signInWithProvider).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/");
  const isOAuth = searchParams.get("flow") === "oauth";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (isOAuth) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profileError) {
          console.error(
            `[auth] No se pudo leer el perfil tras OAuth: ${profileError.message}`,
          );
        }
        // Primer acceso con el proveedor: aún no hay perfil, hay que elegir username.
        if (!profile && !profileError) {
          return NextResponse.redirect(
            new URL(`/acceso/usuario?next=${encodeURIComponent(next)}`, base),
          );
        }
      }
      return NextResponse.redirect(new URL(next, base));
    }
    console.error(
      `[auth] exchangeCodeForSession falló: ${error.code ?? error.name} ${error.message}`,
    );
  }
  if (isOAuth) {
    // Cancelación o error del proveedor: llega error/error_description sin code.
    const reason = searchParams.get("error_description");
    if (reason) console.error(`[auth] OAuth devolvió un error: ${reason}`);
    return NextResponse.redirect(
      new URL(`/acceso?error=oauth&next=${encodeURIComponent(next)}`, base),
    );
  }
  return NextResponse.redirect(new URL("/acceso/recuperar?error=enlace", base));
}
