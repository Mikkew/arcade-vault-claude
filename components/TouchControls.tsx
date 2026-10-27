"use client";
import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { TouchLayout } from "@/components/games/registry";
import type { TouchAction } from "@/lib/engine/types";
// Vibración corta por pulsación (Android; iOS no tiene navigator.vibrate)
const VIBRATE_MS = 10;
// La flecha se dibuja en CSS: los glifos ▲◀ cambian de tamaño y de fuente según el sistema
const DPAD_LABELS: Record<TouchLayout["dpad"][number], string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};
interface TouchControlsProps {
  layout: TouchLayout;
  /** Pulsar (`true`) o soltar (`false`) una acción; llega una vez por cambio. */
  onInput: (action: TouchAction, pressed: boolean) => void;
  /** Silenciado también apaga la vibración. */
  muted: boolean;
  /** En pausa o tras el fin de partida: suelta lo mantenido e ignora pulsaciones. */
  disabled: boolean;
}
export default function TouchControls({
  layout,
  onInput,
  muted,
  disabled,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement>(null);
  // Qué acción mantiene cada dedo: permite girar y disparar a la vez
  const pointersRef = useRef(new Map<number, TouchAction>());
  const onInputRef = useRef(onInput);
  useEffect(() => {
    onInputRef.current = onInput;
  });
  const isHeld = (action: TouchAction) =>
    [...pointersRef.current.values()].includes(action);
  // El estado pulsado se pinta en el DOM, sin re-render por cada toque
  const paint = () => {
    padRef.current
      ?.querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((btn) => {
        btn.toggleAttribute(
          "data-pressed",
          isHeld(btn.dataset.action as TouchAction),
        );
      });
  };
  const releaseAll = useCallback(() => {
    const held = new Set(pointersRef.current.values());
    pointersRef.current.clear();
    held.forEach((action) => onInputRef.current(action, false));
    padRef.current
      ?.querySelectorAll("[data-pressed]")
      .forEach((btn) => btn.removeAttribute("data-pressed"));
  }, []);
  // Pausa, fin de partida, pestaña oculta o desmontaje: no queda nada pegado
  useEffect(() => {
    if (disabled) releaseAll();
  }, [disabled, releaseAll]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", releaseAll);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [releaseAll]);
  const press = (
    e: ReactPointerEvent<HTMLButtonElement>,
    action: TouchAction,
  ) => {
    e.preventDefault();
    if (disabled) return;
    // El táctil captura el pointer de forma implícita: sin soltarla, salir del botón no lo suelta
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    const wasHeld = isHeld(action);
    pointersRef.current.set(e.pointerId, action);
    // Un segundo dedo sobre el mismo botón no es una pulsación nueva, como una tecla mantenida
    if (!wasHeld) onInput(action, true);
    if (!muted) {
      try {
        navigator.vibrate?.(VIBRATE_MS);
      } catch {
        // sin vibración, el control funciona igual
      }
    }
    paint();
  };
  const release = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const action = pointersRef.current.get(e.pointerId);
    if (!action) return;
    pointersRef.current.delete(e.pointerId);
    if (!isHeld(action)) onInput(action, false);
    paint();
  };
  // Tapa redonda del botón de arcade con la etiqueta debajo
  const actContent = (label: string) => (
    <>
      <span className="cap" aria-hidden="true" />
      {label}
    </>
  );
  const button = (
    action: TouchAction,
    className: string,
    content: ReactNode,
    label?: string,
  ) => (
    <button
      key={action}
      type="button"
      tabIndex={-1}
      className={`touch-btn ${className}`}
      data-action={action}
      aria-label={label}
      onPointerDown={(e) => press(e, action)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {content}
    </button>
  );
  return (
    <div
      ref={padRef}
      className="touch-pad"
      role="group"
      aria-label="Controles táctiles"
      data-disabled={disabled || undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="touch-dpad">
        {layout.dpad.map((dir) =>
          button(dir, `dir ${dir}`, null, DPAD_LABELS[dir]),
        )}
      </div>
      {(layout.a || layout.b) && (
        <div className="touch-actions">
          {layout.b && button("b", "act b", actContent(layout.b))}
          {layout.a && button("a", "act a", actContent(layout.a))}
        </div>
      )}
    </div>
  );
}
