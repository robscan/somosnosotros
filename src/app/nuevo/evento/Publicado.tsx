"use client";

import BotonCompartir from "@/components/BotonCompartir";
import BotonDescargarCartel from "@/components/BotonDescargarCartel";
import { PiePaso } from "@/components/PorPasos";
import RenglonEvento from "@/components/RenglonEvento";
import Boton, { claseBoton } from "@/components/ui/Boton";
import { IconoDescarga, IconoOk } from "@/components/ui/Iconos";
import type { EventoAgenda } from "@/lib/agenda";
import { compartirEvento, nombreSitio } from "@/lib/eventos";
import styles from "./Publicado.module.css";

type Props = {
  /** El evento como quedó, armado con lo publicado: lo que pinta la tarjeta es lo que verá la gente en la agenda. */
  evento: EventoAgenda;
  /** Tiene cartel (el que se subió en el primer paso): se ofrece descargarlo. */
  conCartel: boolean;
  /** «Publicar otro»: vuelve al primer paso con todo vacío. */
  onOtro: () => void;
};

/**
 * «Publicado» (OL-304; prototipo firmado `publicar-por-pasos.html`, bitácora 323: «el final es el momento que se recuerda»): la confirmación
 * grande —un sello de palomita que crece, «Evento publicado»—, el evento como quedó en la tarjeta de siempre de las listas (toca y abre la
 * ficha; con cartel, lleva su miniatura) y el pie con lo que sigue: «Compartir» (el mismo texto que arma la ficha), «Descargar el cartel» si
 * lo tiene y «Publicar otro», quieto, que no compite con compartir. Aquí iría, en punteado, la única sugerencia que la fase siguiente suma
 * (exposición o festival que el cartel también anuncia): todavía no hay modelo de datos para publicarla.
 */
export default function Publicado({ evento, conCartel, onOtro }: Props) {
  const { url, texto } = compartirEvento(evento, nombreSitio(evento));
  return (
    <>
      <div className={styles.final}>
        <span className={styles.sello} aria-hidden="true">
          <IconoOk />
        </span>
        <h2 tabIndex={-1}>Evento publicado</h2>
        <p>Ya está en la agenda. Así lo ve la gente:</p>
      </div>
      <ul className={styles.tarjeta}>
        <RenglonEvento evento={evento} conDia />
      </ul>
      <PiePaso>
        <BotonCompartir titulo={evento.titulo} texto={texto} url={url} className={claseBoton()}>
          Compartir
        </BotonCompartir>
        {conCartel && <BotonDescargarCartel id={evento.id} titulo={evento.titulo} className={claseBoton({ variante: "secundario" })} icono={<IconoDescarga width={20} height={20} />} precargar />}
        <Boton type="button" variante="quieto" onClick={onOtro}>
          Publicar otro
        </Boton>
      </PiePaso>
    </>
  );
}
