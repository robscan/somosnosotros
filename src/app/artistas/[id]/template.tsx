import type { ReactNode } from "react";
import EntradaFicha from "@/components/ui/EntradaFicha";
import PantallaConAviso from "@/components/useCanalDeListas";

/**
 * La ficha de un artista comparte un solo aviso abajo y una sola pregunta de avisos entre su lista de fechas y su barra de
 * Seguir (OL-057). Va en `template` y no en `layout` para que cada ficha empiece con el suyo. Entra deslizándose desde
 * la derecha en 220 ms (docs/rediseno/38-transiciones-cargador.md, OL-148).
 */
export default function Plantilla({ children }: { children: ReactNode }) {
  return (
    <EntradaFicha>
      <PantallaConAviso>{children}</PantallaConAviso>
    </EntradaFicha>
  );
}
