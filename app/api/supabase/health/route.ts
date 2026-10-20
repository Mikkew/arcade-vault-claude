import { createClient } from "@/lib/supabase/server";
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[supabase/health]", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
