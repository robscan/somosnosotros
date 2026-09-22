import { notFound } from "next/navigation";
import { esUuid } from "@/lib/formulario";
import { cargarObraParaPintar } from "../../consultas";
import Pared from "./Pared";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obra = esUuid(id) ? await cargarObraParaPintar(id) : null;
  return { title: `${obra?.nombre ?? "Obra colectiva"} · Somos Nosotros`, robots: { index: false, follow: false } };
}

/**
 * La pared (Fase 2 bloque 3, OL-088): ruta neutra `/obra/[id]/pared` (doc rediseno/25 ajuste 2, no `/pincel/...`).
 * Sin sesión — la RLS de `obras_colectivas` decide qué puede ver quien no tiene cuenta. Pensada para una laptop o
 * TV conectada a un cañón, no para el teléfono de un admin logueado.
 */
export default async function ParedDeObra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const obra = await cargarObraParaPintar(id);
  if (!obra) notFound();
  return <Pared obraId={obra.id} nombre={obra.nombre} abierta={obra.estado === "abierta"} />;
}
