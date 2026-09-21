import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { formatearLargo } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { usuarioActual } from "@/lib/supabase/servidor";
import admin from "../../admin.module.css";
import styles from "../obras.module.css";
import { cargarObra } from "../consultas";
import AccionesObra from "./AccionesObra";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obra = esUuid(id) ? await cargarObra(id) : null;
  return { title: `${obra?.nombre ?? "Obra colectiva"} · Administración · Somos Nosotros`, robots: { index: false, follow: false } };
}

/** Detalle de una obra colectiva (OL-088, Fase 1): estado, cuándo cierra, y Terminar/Reabrir. Sin proyección ni
 * mando en vivo todavía — llegan en la Fase 2. */
export default async function DetalleObra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/admin/obras-colectivas/${id}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  if (!esUuid(id)) notFound();
  const obra = await cargarObra(id);
  if (!obra) notFound();

  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/admin/obras-colectivas", texto: "Obras colectivas" }} />
      <h1 className={admin.titulo}>{obra.nombre}</h1>
      <div className={styles.datos}>
        <div className={styles.dato}>
          <span>Lugar</span>
          <b>{obra.lugarNombre}</b>
        </div>
        <div className={styles.dato}>
          <span>Cierra</span>
          <b>{formatearLargo(obra.cierraEn, new Date(), null, obra.zona)}</b>
        </div>
        <div className={styles.dato}>
          <span>Estado</span>
          <b>{obra.estado === "abierta" ? "Abierta" : "Cerrada"}</b>
        </div>
      </div>
      <AccionesObra id={obra.id} estado={obra.estado} />
      <p className={styles.despues}>La proyección y el mando en vivo llegan en la siguiente fase.</p>
    </main>
  );
}
