import Barra from "@/components/ui/Barra";
import Cabecera from "@/components/ui/Cabecera";
import { EsqueletoCaja, EsqueletoRenglones } from "@/components/ui/Esqueleto";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "../admin.module.css";
import propios from "./PantallaInstagram.module.css";

/**
 * Administración › Instagram mientras llega (OL-498; acta del council de OL-497, condición 9): su propia espera, con la forma de la pantalla, en
 * vez de la de la portada o las siete barras de las listas. La barra de verdad (Atrás a Administración), la cabecera con el chip de la ciudad,
 * las dos pestañas y el botón de la conexión en gris, y renglones grises de cuatro líneas, como los eventos de la lista.
 */
export default function Loading() {
  return (
    <main className={`${plantilla.paginaContenido} ${styles.listado}`} aria-busy="true" aria-live="polite" aria-label="Cargando">
      <Barra volver={{ href: "/admin", texto: "Administración" }} titulo="Instagram" />
      <Cabecera contexto={<EsqueletoCaja className={propios.esperaChip} />}>
        <div className={propios.tira} aria-hidden="true">
          <div className={propios.esperaPestanas}>
            <EsqueletoCaja className={propios.esperaPestana} />
            <EsqueletoCaja className={propios.esperaPestana} />
          </div>
          <EsqueletoCaja className={propios.esperaBoton} />
        </div>
      </Cabecera>
      <div className={propios.esperaLista} aria-hidden="true">
        <EsqueletoRenglones cantidad={6} lineas={4} />
      </div>
    </main>
  );
}
