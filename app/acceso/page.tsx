import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/safe-next";
export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};
export default async function AccesoPage({
  searchParams,
}: PageProps<"/acceso">) {
  const { next, error } = await searchParams;
  // Destino tras entrar; safeNext descarta URLs externas.
  const target = safeNext(typeof next === "string" ? next : undefined);
  return (
    <div className="av-auth-wrap fade-in">
      <AuthForm next={target} oauthError={error === "oauth"} />
    </div>
  );
}
