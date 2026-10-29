// Destino tras autenticarse: solo rutas internas, para evitar redirecciones abiertas.
export function safeNext(
  value: string | null | undefined,
  fallback = "/juegos",
): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
