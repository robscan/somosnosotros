"use client";

import { Kpi } from "@/components/ui/Kpi";
import { IconoPin } from "@/components/ui/Iconos";
import { avisarUbicacion, useUbicacionFresca } from "@/components/useUbicacionFresca";
import { kpiDistancia } from "@/lib/ficha";
import { distanciaKm, type Punto } from "@/lib/geo";
import { leerUbicacionCercana } from "@/lib/ubicacion";

/**
 * El número «Distancia» de la ficha de un lugar: a cuánto está de quien mira, con la ubicación aproximada que el teléfono ya guardó
 * (la misma que ordena Lugares por cercanía; nunca sale del teléfono). Sin ella dice «—» y, al tocarlo, la pide: siempre tras un
 * toque de la persona, como «Mi ubicación». Si no hay permiso o señal, se queda en «—».
 */
export default function KpiDistancia({ lat, lng }: Punto) {
  const punto = useUbicacionFresca();
  async function pedir() {
    try {
      await leerUbicacionCercana();
      avisarUbicacion();
    } catch {
      // Sin permiso o sin señal: se queda el guion.
    }
  }
  return <Kpi icono={<IconoPin width={16} height={16} />} etiqueta="Distancia" valor={punto ? kpiDistancia(distanciaKm(punto, { lat, lng })) : "—"} alTocar={punto ? undefined : { hace: pedir, nombre: "Calcular la distancia desde tu ubicación" }} />;
}
