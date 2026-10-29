"use client";
import { useActionState } from "react";
import { claimUsername, signOut, type AuthState } from "@/app/acceso/actions";
const initialState: AuthState = { status: "idle" };
// Primer acceso con GitHub o Google: el proveedor no trae username (spec 11).
export default function UsernameForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    claimUsername,
    initialState,
  );
  const username = state.status === "error" ? state.values.username : "";
  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="mark"></div>
        <h2 className="neon-cyan">ELIGE TU USUARIO</h2>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
            marginTop: 6,
          }}
        >
          ASÍ TE VERÁN EN EL SALÓN DE LA FAMA
        </div>
      </div>
      <form action={formAction} noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="claim-username">Usuario</label>
          <input
            id="claim-username"
            name="username"
            placeholder="px_kai"
            autoComplete="username"
            minLength={3}
            maxLength={16}
            defaultValue={username}
            autoFocus
            required
          />
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          3-16 CARACTERES: LETRAS, NÚMEROS Y _. NO SE PUEDE CAMBIAR DESPUÉS.
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
          {pending ? "GUARDANDO…" : "ENTRAR AL VAULT"}
        </button>
      </form>
      <form action={signOut}>
        <button
          type="submit"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
        >
          SALIR
        </button>
      </form>
    </div>
  );
}
