"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp, type AuthState } from "@/app/acceso/actions";

const initialState: AuthState = { status: "idle" };

function ErrorLine({ state }: { state: AuthState }) {
  if (state.status !== "error") return null;
  return (
    <div className="terminal-error" role="alert">
      <span className="prompt">vault@arcade:~$</span> {state.message}
    </div>
  );
}

function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const email = state.status === "error" ? state.values.email : "";

  return (
    <form action={formAction} noValidate>
      <div className="field">
        <label htmlFor="in-email">Correo electrónico</label>
        <input
          id="in-email"
          name="email"
          type="email"
          placeholder="jugador@vault.gg"
          autoComplete="email"
          maxLength={120}
          defaultValue={email}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="in-password">Contraseña</label>
        <input
          id="in-password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <ErrorLine state={state} />

      <button
        className="btn lg"
        type="submit"
        disabled={pending}
        style={{ width: "100%", marginTop: 8, opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "ENTRANDO…" : "ENTRAR AL VAULT"}
      </button>

      <div style={{ marginTop: 12, textAlign: "center" }}>
        <Link
          href="/acceso/recuperar"
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          ¿HAS OLVIDADO TU CONTRASEÑA?
        </Link>
      </div>
    </form>
  );
}

function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const values =
    state.status === "error" ? state.values : { username: "", email: "" };

  return (
    <form action={formAction} noValidate>
      <div className="field">
        <label htmlFor="up-username">Usuario</label>
        <input
          id="up-username"
          name="username"
          placeholder="px_kai"
          autoComplete="username"
          minLength={3}
          maxLength={16}
          defaultValue={values.username}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="up-email">Correo electrónico</label>
        <input
          id="up-email"
          name="email"
          type="email"
          placeholder="jugador@vault.gg"
          autoComplete="email"
          maxLength={120}
          defaultValue={values.email}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="up-password">Contraseña</label>
        <input
          id="up-password"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
      </div>

      <ErrorLine state={state} />

      <button
        className="btn lg"
        type="submit"
        disabled={pending}
        style={{ width: "100%", marginTop: 8, opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "CREANDO…" : "CREAR Y JUGAR"}
      </button>
    </form>
  );
}

export default function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="mark"></div>
        <h2 className="neon-cyan">ARCADE VAULT</h2>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
            marginTop: 6,
          }}
        >
          ACCESO AL SISTEMA · v2.6
        </div>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={tab === "in" ? "on" : ""}
          onClick={() => setTab("in")}
        >
          INICIAR SESIÓN
        </button>
        <button
          type="button"
          className={tab === "up" ? "on" : ""}
          onClick={() => setTab("up")}
        >
          CREAR CUENTA
        </button>
      </div>

      {tab === "in" ? <SignInForm /> : <SignUpForm />}

      <button
        type="button"
        className="btn ghost"
        style={{ width: "100%", marginTop: 10 }}
        onClick={() => router.push("/")}
      >
        JUGAR COMO INVITADO
      </button>

      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        <button className="btn ghost" type="button">
          ◆&nbsp; GOOGLE
        </button>
        <button className="btn ghost" type="button">
          ▣&nbsp; GITHUB
        </button>
      </div>

      <div
        style={{
          marginTop: 18,
          textAlign: "center",
          fontSize: 11,
          color: "var(--ink-faint)",
          letterSpacing: "0.1em",
        }}
      >
        AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
      </div>
    </div>
  );
}
