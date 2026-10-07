"use client";

import BotonCompartir from "@/components/BotonCompartir";
import BotonDescargarCartel from "@/components/BotonDescargarCartel";
import { PiePaso } from "@/components/PorPasos";
import RenglonEvento from "@/components/RenglonEvento";
import Boton, { claseBoton } from "@/components/ui/Boton";
import { IconoDescarga, IconoOk } from "@/components/ui/Iconos";
import type { EventoAgenda } from "@/lib/agenda";
import { enlaceAltaEvento } from "@/lib/armazon";
import { compartirEvento, hrefEvento, nombreSitio, type Clase } from "@/lib/eventos";
import styles from "./Publicado.module.css";

type Props = {
  /** El evento como quedó, armado con lo publicado: lo que pinta la tarjeta es lo que verá la gente en la agenda. */
  evento: EventoAgenda;
  /** Tiene cartel (el que se subió en el primer paso): se ofrece descargarlo. */
  conCartel: boolean;
  /** Con horario por día (OL-311): el texto de compartir dice «horarios por día» en vez de un solo horario. */
  conSesiones?: boolean;
  /** Cómo ocurre (OL-321): el título del final, la línea de la tarjeta y la sugerencia. */
  clase?: Clase;
  /** La línea de cuándo de la tarjeta y de compartir cuando no es la de un evento («Hasta el dom 30 de nov», «3 sesiones · …», el programa). */
  cuando?: string;
  /** Una exposición que se publicó sin inauguración: se sugiere agregarla. */
  sinInauguracion?: boolean;
  /** «Publicar otro»: vuelve al primer paso con todo vacío. */
  onOtro: () => void;
};

const TITULO: Record<Clase, string> = { puntual: "Evento publicado", exposicion: "Exposición publicada", taller: "Taller publicado", festival: "Festival publicado" };

/**
 * «Publicado» (OL-304; prototipo firmado `publicar-por-pasos.html`, bitácora 323: «el final es el momento que se recuerda»): la confirmación
 * grande —un sello de palomita que crece, «Evento publicado»—, el evento como quedó en la tarjeta de siempre de las listas (toca y abre la
 * ficha; con cartel, lleva su miniatura) y el pie con lo que sigue: «Compartir» (el mismo texto que arma la ficha), «Descargar el cartel» (en la app, «Guardar en Fotos») si
 * lo tiene y «Publicar otro», quieto, que no compite con compartir.
 *
 * Con su clase (OL-321; prototipo `exposicion-festival-taller.html`): «Exposición publicada», «Taller publicado» o «Festival publicado», la
 * tarjeta con su línea («Hasta el dom 30 de nov», el programa registrado) y UNA sugerencia en punteado: a una exposición sin inauguración,
 * «Agregar inauguración» (en editar, donde está su renglón); a un festival, «Agregar otra actividad» (el alta, ya dentro del festival).
 */
export default function Publicado({ evento, conCartel, conSesiones, clase = "puntual", cuando, sinInauguracion, onOtro }: Props) {
  const { url, texto } = compartirEvento(evento, nombreSitio(evento), conSesiones, cuando);
  return (
    <>
      <div className={styles.final}>
        <span className={styles.sello} aria-hidden="true">
          <IconoOk />
        </span>
        <h2 tabIndex={-1}>{TITULO[clase]}</h2>
        <p>Ya está en la agenda. Así lo ve la gente:</p>
      </div>
      <ul className={styles.tarjeta}>
        <RenglonEvento evento={evento} conDia cuando={cuando} />
      </ul>
      {clase === "exposicion" && sinInauguracion && (
        <div className={styles.sugerencia}>
          <h3>¿Tiene inauguración?</h3>
          <p>Publica la apertura como evento, ligado a la exposición.</p>
          <Boton href={`${hrefEvento(evento)}/editar`} variante="secundario">
            Agregar inauguración
          </Boton>
        </div>
      )}
      {clase === "festival" && (
        <div className={styles.sugerencia}>
          <h3>¿Falta algo del programa?</h3>
          <p>Puedes agregar actividades después; la ficha dice cuántas lleva.</p>
          <Boton href={enlaceAltaEvento({ festival: evento.id })} variante="secundario">
            Agregar otra actividad
          </Boton>
        </div>
      )}
      <PiePaso>
        <BotonCompartir titulo={evento.titulo} texto={texto} url={url} className={claseBoton()}>
          Compartir
        </BotonCompartir>
        {conCartel && <BotonDescargarCartel id={evento.id} className={claseBoton({ variante: "secundario" })} icono={<IconoDescarga width={20} height={20} />} iconoListo={<IconoOk width={20} height={20} />} precargar />}
        <Boton type="button" variante="quieto" onClick={onOtro}>
          Publicar otro
        </Boton>
      </PiePaso>
    </>
  );
}
