"use client";

import { useState } from "react";
import Campo from "./ui/Campo";

/**
 * Pegar la dirección de una imagen (https) en vez de subir un archivo. Solo lo ve el administrador:
 * sirve para las fichas importadas (museos, artistas del CAPO), cuya imagen vive en otro sitio.
 */
export default function CampoImagenUrl({ valor, onCambio }: { valor: string | null; onCambio: (url: string | null) => void }) {
  const [texto, setTexto] = useState(valor && !valor.includes("/storage/v1/object/public/") ? valor : "");
  const [error, setError] = useState<string | undefined>(undefined);
  function cambiar(v: string) {
    const t = v.trim();
    setTexto(v);
    if (!t) {
      setError(undefined);
      return;
    }
    if (!/^https:\/\/[^\s]+$/.test(t)) {
      setError("Tiene que empezar por https://");
      return;
    }
    setError(undefined);
    onCambio(t);
  }
  return <Campo etiqueta="O pega la dirección de una imagen" name="imagen_url" value={texto} onChange={(e) => cambiar(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="none" autoComplete="off" ayuda="Solo el administrador. Una imagen que ya está publicada en otro sitio." error={error} />;
}
