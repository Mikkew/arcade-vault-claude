import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// Refresca el token de Auth en cada petición y reescribe las cookies, tanto en
// la petición (para los Server Components) como en la respuesta (para el navegador).
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Sin configuración no hay sesión que refrescar: las páginas sin Supabase siguen funcionando.
  if (!url || !key) return NextResponse.next({ request });
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        // Evita que un CDN cachee una respuesta con la sesión de otro usuario.
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });
  // No ejecutar código entre createServerClient y getClaims(): getClaims()
  // valida el token y dispara el refresco cuando ha caducado.
  await supabase.auth.getClaims();
  return supabaseResponse;
}
