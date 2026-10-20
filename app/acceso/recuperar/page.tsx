import type { Metadata } from "next";
import ForgotForm from "@/components/ForgotForm";
export const metadata: Metadata = {
  title: "Recuperar acceso · Arcade Vault",
};
export default async function RecuperarPage({
  searchParams,
}: PageProps<"/acceso/recuperar">) {
  const { error } = await searchParams;
  return (
    <div className="av-auth-wrap fade-in">
      <ForgotForm linkExpired={error === "enlace"} />
    </div>
  );
}
