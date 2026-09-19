"use client";

import { Chip, Chips } from "./ui/Chip";
import { ORDEN_LETRAS } from "@/lib/indice";

/**
 * Tira de letras horizontal, dentro de la lista, justo antes del primer renglón — no pegada al header ni fija al
 * hacer scroll (corrección del founder, 2026-09-19: el índice lateral daba doble toque y su zona de toque no
 * alcanzaba). Es un filtro, no un salto: por defecto la A, sin «Todos»; las letras sin elementos se ven apagadas
 * y no se pueden tocar (chips de ui/Chip, que ya cumplen el mínimo de 44×44 px y no dan zoom con doble toque).
 */
export default function TiraLetras({ letra, presentes, onSeleccionar }: { letra: string; presentes: ReadonlySet<string>; onSeleccionar: (letra: string) => void }) {
  return (
    <Chips ariaLabel="Filtrar por letra">
      {ORDEN_LETRAS.map((l) => (
        <Chip key={l} activo={letra === l} onClick={() => onSeleccionar(l)} disabled={!presentes.has(l)} ariaLabel={l === "#" ? "Números y símbolos" : `Letra ${l}`}>
          {l}
        </Chip>
      ))}
    </Chips>
  );
}
