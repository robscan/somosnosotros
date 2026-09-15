"use client";

/** Si falla hasta el layout raíz, esto es lo que se ve: en español y con salida, no la página inglesa de Next. */
export default function ErrorGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Algo se rompió</h1>
        <p style={{ color: "#5c5c5c", marginBottom: 20 }}>No es tu culpa. Vuelve a intentarlo; si sigue igual, vuelve a la agenda.</p>
        <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 20px", borderRadius: 12, border: "none", background: "#0f6b7c", color: "#fff", fontSize: 18, fontWeight: 700, marginRight: 12 }}>
          Intentar de nuevo
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- aquí el layout raíz falló: un enlace plano es lo único seguro */}
        <a href="/" style={{ color: "#1a1a1a" }}>
          Ir a la agenda
        </a>
      </body>
    </html>
  );
}
