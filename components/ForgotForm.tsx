"use client";
import { useActionState } from "react";
import Link from "next/link";
import { requestReset, type AuthState } from "@/app/acceso/actions";
const initialState: AuthState = { status: "idle" };
export default function ForgotForm({
  linkExpired = false,
}: {
  linkExpired?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    requestReset,
    initialState,
  );
  const email = state.status === "error" ? state.values.email : "";
  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="mark"></div>
        <h2 className="neon-cyan">RECUPERAR ACCESO</h2>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
            marginTop: 6,
          }}
        >
          TE ENVIAMOS UN ENLACE AL CORREO
        </div>
      </div>
      {state.status === "success" ? (
        <div className="terminal-success" aria-live="polite">
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./reset_password
            </div>
            <div className="line dim">
              [OK] Si el correo está registrado, recibirás un enlace para fijar
              una nueva contraseña.
            </div>
          </div>
        </div>
      ) : (
        <form action={formAction} noValidate>
          <div className="field">
            <label htmlFor="reset-email">Correo electrónico</label>
            <input
              id="reset-email"
              name="email"
              type="email"
              placeholder="jugador@vault.gg"
              autoComplete="email"
              maxLength={120}
              defaultValue={email}
              required
            />
          </div>
          {linkExpired && state.status !== "error" && (
            <div className="terminal-error" role="alert">
              <span className="prompt">vault@arcade:~$</span> ERROR: EL ENLACE
              NO ES VÁLIDO O HA CADUCADO. SOLICITA UNO NUEVO.
            </div>
          )}
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
            {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
          </button>
        </form>
      )}
      <Link
        href="/acceso"
        className="btn ghost"
        style={{ width: "100%", marginTop: 10, textAlign: "center" }}
      >
        VOLVER A ACCESO
      </Link>
    </div>
  );
}
