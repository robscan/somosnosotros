"use client";

import { useEffect } from "react";
import Link from "next/link";
import Boton from "@/components/ui/Boton";

/** Algo falló al cargar una pantalla. Se dice en español, se ofrece reintentar y volver a la agenda. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Pantalla con error:", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="pagina">
      <h1 className="titulo">Algo falló</h1>
      <p className="subtitulo">No se pudo cargar esta pantalla. Suele arreglarse al intentar de nuevo.</p>
      <Boton type="button" onClick={reset}>
        Intentar de nuevo
      </Boton>
      <p style={{ marginTop: "var(--espacio-4)" }}>
        <Link href="/" className="enlace-volver">
          ← Ver la agenda
        </Link>
      </p>
    </main>
  );
}
