"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * El cargador de `app/loading.tsx` según la pantalla que se abre (OL-455): `loading.tsx` no recibe la ruta, así que elige aquí. En Inicio va su
 * esqueleto; en las demás, el de siempre (`ui/CargandoRaiz`, el símbolo SN). Las dos llegan ya armadas del servidor; aquí solo se elige una.
 */
export default function CargandoPorRuta({ inicio, otra }: { inicio: ReactNode; otra: ReactNode }) {
  return usePathname() === "/" ? inicio : otra;
}
