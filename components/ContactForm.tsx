"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendContactMessage, type ContactState } from "@/app/about/actions";

const initialState: ContactState = { status: "idle" };

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);
  // Estado de éxito que el visitante ya cerró con "ENVIAR OTRO MENSAJE".
  const [dismissed, setDismissed] = useState<ContactState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reinicia la animación aunque dos errores seguidos usen la misma clase.
  useEffect(() => {
    const form = formRef.current;
    if (state.status !== "error" || !form) return;
    form.classList.remove("shake");
    void form.offsetWidth;
    form.classList.add("shake");
  }, [state]);

  const showSuccess = state.status === "success" && state !== dismissed;
  const values = state.status === "error" ? state.values : { name: "", email: "", msg: "" };

  return (
    <form ref={formRef} className="contact-form" action={formAction} noValidate>
      {showSuccess ? (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" aria-live="polite">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={() => setDismissed(state)}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="name">NOMBRE</label>
            <input
              id="name"
              name="name"
              defaultValue={values.name}
              maxLength={80}
              autoComplete="name"
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="email">CORREO ELECTRÓNICO</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={values.email}
              maxLength={120}
              autoComplete="email"
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="msg">MENSAJE</label>
            <textarea
              id="msg"
              name="msg"
              rows={5}
              defaultValue={values.msg}
              maxLength={2000}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>

          {/* Honeypot: invisible para personas, los bots lo rellenan. */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
          >
            <label htmlFor="website">Sitio web</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          {state.status === "error" && (
            <div className="terminal-error" role="alert">
              <span className="prompt">vault@arcade:~$</span> {state.message}
            </div>
          )}

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%", opacity: pending ? 0.6 : 1 }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶ ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}
