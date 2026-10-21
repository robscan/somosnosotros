import type { Metadata } from "next";
import PantallaTuAnio from "@/components/PantallaTuAnio";
import { tituloDePagina } from "@/lib/marca";

export const metadata: Metadata = { title: tituloDePagina("Tu año"), robots: { index: false, follow: false } };

/** «Tu año» de un lugar (OL-394): sus eventos pasados de este año, como imagen para compartir. Solo para quien gestiona su ficha. */
export default async function TuAnioLugar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PantallaTuAnio que="lugar" id={id} ruta={`/lugares/${encodeURIComponent(id)}/tu-anio`} />;
}
