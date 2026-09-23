"use client";

import { useEffect } from "react";
import Atras from "@/components/ui/Atras";
import Boton from "@/components/ui/Boton";

/**
 * Algo falló al cargar una pantalla. Se dice en español, se ofrece reintentar y volver a la agenda.
 * Reintentar vuelve a pedir la pantalla al servidor (`retry`), no solo a pintarla con lo que ya falló (`reset`).
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("Pantalla con error:", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="pagina">
      <h1 className="titulo">Algo falló</h1>
      <p className="subtitulo">No se pudo cargar esta pantalla. Suele arreglarse al intentar de nuevo.</p>
      <Boton type="button" onClick={() => retry()}>
        Intentar de nuevo
      </Boton>
      <p style={{ marginTop: "var(--espacio-4)" }}>
        <Atras href="/agenda" texto="Ver la agenda" />
      </p>
    </main>
  );
}
