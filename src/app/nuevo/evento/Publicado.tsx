"use client";

import BotonCompartir from "@/components/BotonCompartir";
import BotonDescargarCartel from "@/components/BotonDescargarCartel";
import { PiePaso } from "@/components/PorPasos";
import RenglonEvento from "@/components/RenglonEvento";
import Boton, { claseBoton } from "@/components/ui/Boton";
import { IconoDescarga, IconoOk } from "@/components/ui/Iconos";
import type { EventoAgenda } from "@/lib/agenda";
import { compartirEvento, hrefEvento, nombreSitio } from "@/lib/eventos";
import styles from "./Publicado.module.css";

type Props = {
  /** El evento como quedó, armado con lo publicado: lo que pinta la tarjeta es lo que verá la gente en la agenda. */
  evento: EventoAgenda;
  /** Tiene cartel (el que se subió en el primer paso): se ofrece descargarlo. */
  conCartel: boolean;
  /** Con horario por día (OL-311): el texto de compartir dice «horarios por día» en vez de un solo horario. */
  conSesiones?: boolean;
  /** «Publicar otro»: vuelve al primer paso con todo vacío. */
  onOtro: () => void;
};

/**
 * «Publicado» (OL-304; prototipo firmado `publicar-por-pasos.html`, bitácora 323: «el final es el momento que se recuerda»): la confirmación
 * grande —un sello de palomita que crece, «Evento publicado»—, el evento como quedó en la tarjeta de siempre de las listas (toca y abre la
 * ficha; con cartel, lleva su miniatura) y el pie con lo que sigue: «Compartir» (el mismo texto que arma la ficha), «Descargar el cartel» (en la app, «Guardar en Fotos») si
 * lo tiene y «Publicar otro», quieto, que no compite con compartir. Sin cartel, en punteado, la única sugerencia: «Crea su cartel» (OL-324).
 */
export default function Publicado({ evento, conCartel, conSesiones, onOtro }: Props) {
  const { url, texto } = compartirEvento(evento, nombreSitio(evento), conSesiones);
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
      {/* Sin cartel, la única sugerencia (OL-324): crear uno con los datos que ya tiene. Si otra pieza suma su sugerencia aquí, no van las dos. */}
      {!conCartel && (
        <section className={styles.sugerencia} aria-labelledby="sugerencia-cartel">
          <h3 id="sugerencia-cartel">Crea su cartel</h3>
          <p>Cuatro diseños con los datos del evento, listos para Instagram, Facebook o WhatsApp.</p>
          <Boton href={`${hrefEvento(evento)}/cartel`} prefetch={false}>
            Crear cartel
          </Boton>
        </section>
      )}
      <PiePaso>
        <BotonCompartir titulo={evento.titulo} texto={texto} url={url} className={claseBoton()}>
          Compartir
        </BotonCompartir>
        {conCartel && <BotonDescargarCartel id={evento.id} className={claseBoton({ variante: "secundario" })} icono={<IconoDescarga width={20} height={20} />} precargar />}
        <Boton type="button" variante="quieto" onClick={onOtro}>
          Publicar otro
        </Boton>
      </PiePaso>
    </>
  );
}
