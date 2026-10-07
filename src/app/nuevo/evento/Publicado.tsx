"use client";

import BotonCompartir from "@/components/BotonCompartir";
import BotonDescargarCartel from "@/components/BotonDescargarCartel";
import { PiePaso } from "@/components/PorPasos";
import RenglonEvento from "@/components/RenglonEvento";
import Boton, { claseBoton } from "@/components/ui/Boton";
import { IconoDescarga, IconoOk } from "@/components/ui/Iconos";
import type { EventoAgenda } from "@/lib/agenda";
import { enlaceAltaEvento } from "@/lib/armazon";
import { hrefCreador } from "@/lib/carteles/origen";
import { compartirEvento, hrefEvento, nombreSitio, type Clase } from "@/lib/eventos";
import type { ReactNode } from "react";
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
  /** La sugerencia al publicar (OL-323: la exposición tras la inauguración, el festival tras el segundo acto), ya armada, bajo la tarjeta. */
  sugerencia?: ReactNode;
  /** Con la sugerencia en punteado a la vista, «Compartir» deja de ser la acción principal (bitácora 323: «Compartir es la acción principal
   *  salvo que haya una sugerencia en punteado»). */
  sugerenciaAbierta?: boolean;
  /** La sugerencia de OL-323 se ve (abierta o ya hecha): «Crea su cartel» va después, en una línea (OL-336). */
  sugerenciaVisible?: boolean;
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
 *
 * A un evento o un taller (OL-323), la sugerencia que encuentre el servidor tras publicar (`SugerenciaPublicado`): la exposición que abre una
 * inauguración o el festival del que es parte. Llega cuando llega, sin mover el foco; mientras está en punteado, «Compartir» pasa a secundario.
 *
 * «Crea su cartel» (OL-324) sale SIEMPRE (OL-336; el founder no la vio: con la sugerencia de OL-323 montada nunca salía), tenga o no cartel. Sola,
 * en punteado; tras otra sugerencia, va después y como secundaria, en una línea quieta (nunca dos cajas). Su botón no es el principal: «Compartir»
 * lo sigue siendo, salvo con la sugerencia de OL-323 abierta. Abre el creador reemplazando «Publicado» (terminar el alta no la deja en el
 * historial): desde el creador y desde la ficha, Atrás lleva adonde mandaba el alta.
 */
export default function Publicado({ evento, conCartel, conSesiones, clase = "puntual", cuando, sinInauguracion, sugerencia, sugerenciaAbierta = false, sugerenciaVisible = false, onOtro }: Props) {
  const { url, texto } = compartirEvento(evento, nombreSitio(evento), conSesiones, cuando);
  const otraSugerencia = sugerenciaVisible || (clase === "exposicion" && sinInauguracion) || clase === "festival";
  const crearCartel = hrefCreador(hrefEvento(evento), "publicado");
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
      {sugerencia}
      {otraSugerencia ? (
        <Boton href={crearCartel} replace prefetch={false} variante="quieto">
          Crear su cartel
        </Boton>
      ) : (
        <section className={styles.sugerencia} aria-labelledby="sugerencia-cartel">
          <h3 id="sugerencia-cartel">Crea su cartel</h3>
          <p>Cuatro diseños con los datos del evento, listos para Instagram, Facebook o WhatsApp.</p>
          <Boton href={crearCartel} replace prefetch={false} variante="secundario">
            Crear cartel
          </Boton>
        </section>
      )}
      <PiePaso>
        <BotonCompartir titulo={evento.titulo} texto={texto} url={url} className={claseBoton({ variante: sugerenciaAbierta ? "secundario" : "primario" })}>
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
