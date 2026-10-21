"use client";

import { useRef, useState, useTransition } from "react";
import Limpiar from "@/components/ui/Limpiar";
import { guardarNotas } from "../acciones";
import campo from "@/components/ui/Campo.module.css";
import limpiar from "@/components/ui/Limpiar.module.css";

/**
 * Las notas privadas del consejo (OL-426): un campo de varias líneas con su ✕ que se guarda al salir de él. Solo administración: nunca salen de
 * aquí (la primera línea va en la tarjeta del candidato y en el CSV para el consejo, que también son de Administración). Debajo, si se guardó.
 */
export default function NotasFicha({ artistaId, slug, notas }: { artistaId: string; slug: string; notas: string }) {
  const [texto, setTexto] = useState(notas);
  const guardadas = useRef(notas);
  const [estado, setEstado] = useState<"quieto" | "guardado" | "error">("quieto");
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();

  function guardar() {
    const ahora = texto.trim();
    if (ahora === guardadas.current.trim()) return;
    iniciar(async () => {
      const r = await guardarNotas(artistaId, ahora, slug);
      if (!r.ok) {
        setError(r.error);
        return setEstado("error");
      }
      guardadas.current = ahora;
      setEstado("guardado");
    });
  }
  const ayuda = enCamino ? "Guardando…" : estado === "guardado" ? "Guardado. Solo administración: nunca salen de aquí." : "Solo administración. Nunca salen de aquí; se guardan al salir del campo.";
  return (
    <div className={campo.campo} data-ayuda="notas">
      <label htmlFor="campo-notas" className={campo.etiqueta}>
        Notas privadas
      </label>
      <span className={limpiar.caja}>
        <textarea
          id="campo-notas"
          name="notas"
          className={`${campo.control} ${campo.area}`}
          value={texto}
          maxLength={4000}
          aria-describedby="campo-notas-ayuda"
          aria-invalid={estado === "error"}
          onChange={(e) => {
            setTexto(e.target.value);
            if (estado !== "quieto") setEstado("quieto");
          }}
          onBlur={guardar}
        />
        <Limpiar visible={texto.length > 0} etiqueta="Borrar las notas" />
      </span>
      {estado === "error" ? (
        <p id="campo-notas-ayuda" className={campo.error} role="alert">
          {error}
        </p>
      ) : (
        <p id="campo-notas-ayuda" className={campo.ayuda} role="status">
          {ayuda}
        </p>
      )}
    </div>
  );
}
