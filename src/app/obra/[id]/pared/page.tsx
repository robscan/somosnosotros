import { notFound, redirect } from "next/navigation";
import { esUuid } from "@/lib/formulario";
import { qrDelMando } from "@/lib/qr";
import { usuarioActual } from "@/lib/supabase/servidor";
import { cargarObraParaPintar, cargarPincelActivo } from "../../consultas";
import Pared from "./Pared";
import styles from "./pared.module.css";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obra = esUuid(id) ? await cargarObraParaPintar(id) : null;
  return { title: `${obra?.nombre ?? "Obra colectiva"} · Somos Nosotros`, robots: { index: false, follow: false } };
}

/**
 * La pared (Fase 2 bloque 3, OL-088): ruta neutra `/obra/[id]/pared` (doc rediseno/25 ajuste 2, no `/pincel/...`).
 * Exige sesión (revisión del gestor, 2026-09-21): el canal es privado (`realtime.messages` con RLS a
 * `authenticated`), así que sin sesión la suscripción se rechaza igual. Hoy la abre el admin en la laptop o TV
 * del cañón, con su propia cuenta; un enlace público sin sesión (cualquiera ve pintar en vivo) queda para
 * después, como decisión del founder (doc rediseno/34).
 */
export default async function ParedDeObra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/obra/${id}/pared`);
  // Interruptor «Pincel apagado» (OL-121): se comprueba antes de leer la obra, para no abrir el canal si está
  // apagado. Sin controles, sin QR: solo el aviso.
  if (!(await cargarPincelActivo())) {
    return (
      <main className={styles.cerrada}>
        <p>Pincel está apagado por ahora.</p>
      </main>
    );
  }
  const obra = await cargarObraParaPintar(id);
  if (!obra) notFound();
  const abierta = obra.estado === "abierta";
  // El QR hacia el mando (OL-118) se dibuja aquí, en el servidor; cerrada la obra, la pared ya no invita a entrar.
  const qr = abierta ? (await qrDelMando(obra.id)).svg : null;
  return <Pared obraId={obra.id} nombre={obra.nombre} abierta={abierta} cupo={obra.cupoMandos} qr={qr} />;
}
