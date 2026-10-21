import type { Metadata } from "next";
import PantallaTuAnio from "@/components/PantallaTuAnio";
import { tituloDePagina } from "@/lib/marca";

export const metadata: Metadata = { title: tituloDePagina("Tu año"), robots: { index: false, follow: false } };

/** «Tu año» de un artista (OL-394): sus fechas pasadas de este año, como imagen para compartir. Solo para quien gestiona su ficha. */
export default async function TuAnioArtista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PantallaTuAnio que="artista" id={id} ruta={`/artistas/${encodeURIComponent(id)}/tu-anio`} />;
}
