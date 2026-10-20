"use client";
import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type AuthState } from "@/app/acceso/actions";
const initialState: AuthState = { status: "idle" };
export default function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );
  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="mark"></div>
        <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
            marginTop: 6,
          }}
        >
          ELIGE UNA CONTRASEÑA DE 8 CARACTERES O MÁS
        </div>
      </div>
      <form action={formAction} noValidate>
        <div className="field">
          <label htmlFor="new-password">Contraseña nueva</label>
          <input
            id="new-password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="new-confirm">Repite la contraseña</label>
          <input
            id="new-confirm"
            name="confirm"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </div>
        {state.status === "error" && (
          <div className="terminal-error" role="alert">
            <span className="prompt">vault@arcade:~$</span> {state.message}
          </div>
        )}
        <button
          className="btn lg"
          type="submit"
          disabled={pending}
          style={{ width: "100%", marginTop: 8, opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
        </button>
      </form>
      <Link
        href="/acceso/recuperar"
        className="btn ghost"
        style={{ width: "100%", marginTop: 10, textAlign: "center" }}
      >
        SOLICITAR OTRO ENLACE
      </Link>
    </div>
  );
}
