import type { Metadata } from "next";
import PantallaTuAnio from "@/components/PantallaTuAnio";
import { tituloDePagina } from "@/lib/marca";

export const metadata: Metadata = { title: tituloDePagina("Tu año"), robots: { index: false, follow: false } };

/** «Tu año» de la persona con sesión (OL-394): sus «Voy» que ya pasaron, como imagen para compartir. Se abre desde Mi perfil. */
export default function TuAnioPersona() {
  return <PantallaTuAnio que="persona" ruta="/tu-anio" />;
}
