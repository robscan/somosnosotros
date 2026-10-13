import type { MouseEvent } from "react";
import { textoDistancia } from "@/lib/agenda";
import { calleCorta, etiquetaTipo, hrefLugar, textoProximo, type LugarResumen, type ProximoEvento } from "@/lib/lugares";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { Chip } from "./ui/Chip";
import { IconoCalendario, IconoPin } from "./ui/Iconos";
import Renglon from "./ui/Renglon";
import styles from "./ui/Renglon.module.css";

type Props = {
  lugar: Pick<LugarResumen, "id" | "slug" | "nombre" | "direccion" | "portada" | "privado"> & { tipo: string; proximo?: ProximoEvento | null; enCurso?: ProximoEvento | null };
  /** Distancia desde el punto de quien mira, cuando la lista se ordena por cercanía. */
  km?: number;
  /** Con botón, "Seguir" o "Sigues" (OL-104, bitácora 139); sin él, el renglón es un enlace simple. */
  boton?: EstadoBotonRenglon;
  /** El botón llega después (la hoja de Lugares lee la cuenta en el teléfono): mientras, su sitio queda guardado (`Renglon`). */
  botonEnEspera?: boolean;
  /** Si se pone, tocar el renglón abre el lugar ahí (la ficha dentro de la hoja de Lugares) en vez de ir a su página; abrirlo con
   *  una tecla (en otra pestaña) sigue su enlace. */
  alAbrir?: () => void;
};

/**
 * Renglón de lugar (OL-057): foto cuadrada, nombre y, en los datos, qué es, su calle (y a cuántos km, si se sabe), su
 * próximo evento y, debajo, lo que tiene abierto de varios días («Exposición hasta el dom 8 de nov»; OL-400, el founder firmó «las dos
 * líneas»). Uno solo para todas las listas de lugares, como RenglonEvento para los eventos.
 */
export default function RenglonLugar({ lugar: l, km, boton, botonEnEspera = false, alAbrir }: Props) {
  function alTocar(e: MouseEvent<HTMLAnchorElement>) {
    if (!alAbrir || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    alAbrir();
  }
  return (
    <Renglon href={hrefLugar(l)} foto={l.portada} titulo={l.nombre} accion={boton && <BotonRenglon {...boton} />} accionEnEspera={botonEnEspera} onClick={alTocar}>
      {l.privado && <Chip variante="estado">Solo tú lo ves</Chip>}
      <span className={styles.envuelve}>
        <IconoPin width={15} height={15} />
        {[etiquetaTipo(l.tipo), calleCorta(l.direccion) || "Sin dirección", km !== undefined && textoDistancia(km)].filter(Boolean).join(" · ")}
      </span>
      {[l.proximo, l.enCurso].map(
        (vida) =>
          vida && (
            <span key={vida.id}>
              <IconoCalendario width={15} height={15} />
              <b>{textoProximo(vida)}</b>
            </span>
          ),
      )}
    </Renglon>
  );
}
