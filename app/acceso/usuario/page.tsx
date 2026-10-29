import type { Metadata } from "next";
import { redirect } from "next/navigation";
import UsernameForm from "@/components/UsernameForm";
import { getAuthStatus } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
export const metadata: Metadata = {
  title: "Elige usuario · Arcade Vault",
};
export default async function UsuarioPage({
  searchParams,
}: PageProps<"/acceso/usuario">) {
  const { next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : undefined);
  const auth = await getAuthStatus();
  // Sin sesión no hay a quién asignar el nombre; con perfil ya no hace falta.
  if (auth.status === "anon") {
    redirect(`/acceso?next=${encodeURIComponent(target)}`);
  }
  if (auth.status === "ready") redirect(target);
  return (
    <div className="av-auth-wrap fade-in">
      <UsernameForm next={target} />
    </div>
  );
}
