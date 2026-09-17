import type { ReactNode } from "react";
import PantallaConAviso from "@/components/useCanalDeListas";

/**
 * La ficha de un artista comparte un solo aviso abajo y una sola pregunta de avisos entre su lista de fechas y su barra de
 * Seguir (OL-057). Va en `template` y no en `layout` para que cada ficha empiece con el suyo.
 */
export default function Plantilla({ children }: { children: ReactNode }) {
  return <PantallaConAviso>{children}</PantallaConAviso>;
}
