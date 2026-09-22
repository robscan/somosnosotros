import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import CodigoQr from "@/components/ui/CodigoQr";
import ficha from "@/components/ui/Ficha.module.css";
import Borrar from "@/components/Borrar";
import { formatearLargo } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { qrDelMando } from "@/lib/qr";
import { usuarioActual } from "@/lib/supabase/servidor";
import admin from "../../admin.module.css";
import styles from "../obras.module.css";
import { cargarEstadoGlobalPincel, cargarObra, TOPE_MANDOS_GLOBAL } from "../consultas";
import AccionesObra from "./AccionesObra";
import BorrarPared from "./BorrarPared";
import BotonImprimir from "./BotonImprimir";
import CampoCupo from "./CampoCupo";
import { borrarObra } from "../acciones";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obra = esUuid(id) ? await cargarObra(id) : null;
  return { title: `${obra?.nombre ?? "Obra colectiva"} · Administración · Somos Nosotros`, robots: { index: false, follow: false } };
}

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ error?: string }> };

/** Detalle de una obra colectiva (OL-088): estado, cuándo cierra, cupo de mandos (doc rediseno/34, solo si está
 * abierta), enlaces a la pared y al mando, el QR hacia el mando para imprimir (OL-118, solo abierta), Terminar/Reabrir
 * y Borrar (solo cerrada). */
export default async function DetalleObra({ params, searchParams }: Params) {
  const { id } = await params;
  const { error } = (await searchParams) ?? {};
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/admin/obras-colectivas/${id}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  if (!esUuid(id)) notFound();
  const obra = await cargarObra(id);
  if (!obra) notFound();
  const qr = obra.estado === "abierta" ? await qrDelMando(obra.id) : null;
  // Tope de cupo (OL-121): lo que le queda a ESTA obra es el tope global menos lo que usan las DEMÁS abiertas —
  // su propio cupo actual no cuenta contra sí misma. Si no se pudo leer, no se acota aquí (la base lo exige igual).
  const estadoGlobal = obra.estado === "abierta" ? await cargarEstadoGlobalPincel() : null;
  const tope = estadoGlobal ? Math.max(TOPE_MANDOS_GLOBAL - (estadoGlobal.mandosAbiertos - obra.cupoMandos), obra.cupoMandos) : 20;

  return (
    <main className={`${ficha.pagina} ${styles.fichaObra}`}>
      <Barra volver={{ href: "/admin/obras-colectivas", texto: "Obras colectivas" }} />
      <h1 className={`${admin.titulo} ${styles.nombre}`}>{obra.nombre}</h1>
      <div className={styles.datos}>
        <div className={styles.dato}>
          <span>Lugar</span>
          <b>{obra.lugarNombre}</b>
        </div>
        <div className={styles.dato}>
          <span>Creada</span>
          <b>{formatearLargo(obra.creadoEn, new Date(), null, obra.zona)}</b>
        </div>
        {obra.estado === "cerrada" && obra.cerradoEn ? (
          <div className={styles.dato}>
            <span>Cerrada</span>
            <b>{formatearLargo(obra.cerradoEn, new Date(), null, obra.zona)}</b>
          </div>
        ) : (
          <div className={styles.dato}>
            <span>Cierra</span>
            <b>{formatearLargo(obra.cierraEn, new Date(), null, obra.zona)}</b>
          </div>
        )}
        <div className={styles.dato}>
          <span>Estado</span>
          <b>{obra.estado === "abierta" ? "Abierta" : "Cerrada"}</b>
        </div>
      </div>
      {obra.estado === "abierta" && <CampoCupo id={obra.id} cupo={obra.cupoMandos} tope={tope} />}
      {obra.estado === "abierta" && (
        <div className={styles.acciones}>
          <Boton href={`/obra/${obra.id}/pared`} variante="secundario">
            Abrir la pared
          </Boton>
          <Boton href={`/obra/${obra.id}/mando`} variante="secundario">
            Abrir el mando
          </Boton>
        </div>
      )}
      <AccionesObra id={obra.id} estado={obra.estado} />
      {/* OL-126: limpiar la pared sin cerrar la obra (mensaje `borrar` por el canal; solo aquí). */}
      {obra.estado === "abierta" && <BorrarPared obraId={obra.id} perfilId={actual.perfil.id} />}
      {error === "borrar" && (
        <p className={styles.error} role="alert">
          No se pudo borrar. ¿Sigue cerrada y sigues con sesión de administración?
        </p>
      )}
      {obra.estado === "cerrada" && (
        <Borrar
          que="la obra"
          icono="obra"
          aviso="Se borra la obra y su imagen final, si la tiene."
          accion={borrarObra.bind(null, obra.id)}
        />
      )}
      {qr && (
        <figure className={styles.qr}>
          <CodigoQr svg={qr.svg} alt="Código QR: abre el mando de esta obra" />
          <figcaption>
            <a href={qr.url}>{qr.url}</a>
          </figcaption>
          <BotonImprimir className={styles.imprimir} />
        </figure>
      )}
    </main>
  );
}
