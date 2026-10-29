"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/acceso/actions";
import type { AuthStatus } from "@/lib/auth";
export default function Nav({ auth }: { auth: AuthStatus }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isInicio = pathname === "/";
  const isBiblioteca = pathname.startsWith("/juegos");
  const isSalon = pathname.startsWith("/salon");
  const isAbout = pathname.startsWith("/about");
  const isAcceso = pathname.startsWith("/acceso");
  const close = () => setOpen(false);
  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isInicio ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/juegos" className={isBiblioteca ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isSalon ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={isAbout ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {auth.status === "ready" ? (
          <form action={signOut} className="user-box">
            <span className="user-name" title={auth.profile.username}>
              {auth.profile.username}
            </span>
            <button type="submit" className="btn ghost">
              SALIR
            </button>
          </form>
        ) : auth.status === "needs-username" ? (
          // Sesión OAuth sin perfil todavía (spec 11).
          <form action={signOut} className="user-box">
            <Link href="/acceso/usuario" className="btn yellow">
              ELIGE USUARIO
            </Link>
            <button type="submit" className="btn ghost">
              SALIR
            </button>
          </form>
        ) : (
          <Link href="/acceso" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link href="/" className={isInicio ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link
          href="/juegos"
          className={isBiblioteca ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link href="/salon" className={isSalon ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/about" className={isAbout ? "active" : ""} onClick={close}>
          Acerca de
        </Link>
        {auth.status === "ready" ? (
          <form action={signOut} className="user-box">
            <span className="user-name">{auth.profile.username}</span>
            <button type="submit" className="btn ghost">
              SALIR
            </button>
          </form>
        ) : auth.status === "needs-username" ? (
          <form action={signOut} className="user-box">
            <Link href="/acceso/usuario" onClick={close}>
              Elige usuario
            </Link>
            <button type="submit" className="btn ghost">
              SALIR
            </button>
          </form>
        ) : (
          <Link
            href="/acceso"
            className={isAcceso ? "active" : ""}
            onClick={close}
          >
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
