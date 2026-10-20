// Estado de error compartido por las páginas que leen el catálogo de Supabase.
export default function CatalogError() {
  return (
    <div
      role="alert"
      style={{
        textAlign: "center",
        padding: 80,
        color: "var(--ink-faint)",
      }}
    >
      <div
        className="pixel"
        style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
      >
        ERROR DE CONEXIÓN
      </div>
      <div>
        No se pudo cargar el catálogo de juegos. Inténtalo de nuevo más tarde.
      </div>
    </div>
  );
}
