import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Destino tras canjear el código: solo rutas internas, para evitar redirecciones abiertas.
const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, base));
    console.error(
      `[auth] exchangeCodeForSession falló: ${error.code ?? error.name} ${error.message}`,
    );
  }
  return NextResponse.redirect(new URL("/acceso/recuperar?error=enlace", base));
}
