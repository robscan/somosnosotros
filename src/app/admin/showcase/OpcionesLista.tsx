"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { IconoFiltros } from "@/components/ui/Iconos";
import type { Vista } from "@/lib/showcase";
import { filtrosDe, nPuestos, type Grupo, type Hechos } from "@/lib/showcaseFiltros";
import { HojaFiltrosShowcase } from "./FiltrosShowcase";

/**
 * La fila de contexto de la lista de candidatos (OL-457): un solo chip, Filtros, como Lugares del front, que cabe entera a 320. Su hoja trae los
 * filtros (lo firmado en OL-443/OL-446) y, al final, «Ordenar por» y «Ver como». La cuenta dice cuántas cosas no están como vienen: los filtros
 * puestos, un orden que no es «Puntaje» y la tabla.
 */
export default function OpcionesLista({ vista, hechos, grupos, hoy }: { vista: Vista; hechos: Hechos[]; grupos: Grupo[]; hoy: string }) {
  const [abierta, setAbierta] = useState(false);
  const puestos = nPuestos(filtrosDe(vista)) + (vista.orden !== "puntaje" ? 1 : 0) + (vista.tabla ? 1 : 0);
  return (
    <>
      <Chip variante="contexto" cuenta={puestos} icono={<IconoFiltros width={16} height={16} />} onClick={() => setAbierta(true)}>
        Filtros
      </Chip>
      {abierta && <HojaFiltrosShowcase vista={vista} hechos={hechos} grupos={grupos} hoy={hoy} onCerrar={() => setAbierta(false)} />}
    </>
  );
}
