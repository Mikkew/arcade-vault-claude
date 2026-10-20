import type { Metadata } from "next";
import NewPasswordForm from "@/components/NewPasswordForm";
export const metadata: Metadata = {
  title: "Nueva contraseña · Arcade Vault",
};
export default function NuevaPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <NewPasswordForm />
    </div>
  );
}
