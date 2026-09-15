"use client";

import { useEffect } from "react";
import { marcarNovedadesVistas } from "./acciones";

/** Al pintar la sección, la persona ya la vio: se guarda la fecha y el punto de la campana se apaga. */
export default function MarcarVistas() {
  useEffect(() => {
    marcarNovedadesVistas();
  }, []);
  return null;
}
