import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};

export default function AccesoPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <AuthForm />
    </div>
  );
}
