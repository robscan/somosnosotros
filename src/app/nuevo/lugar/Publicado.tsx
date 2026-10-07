"use client";

import BotonCompartir from "@/components/BotonCompartir";
import { PiePaso } from "@/components/PorPasos";
import RenglonLugar from "@/components/RenglonLugar";
import Boton, { claseBoton } from "@/components/ui/Boton";
import { IconoOk } from "@/components/ui/Iconos";
import { enlaceAltaEvento } from "@/lib/armazon";
import { compartirLugar, type LugarResumen } from "@/lib/lugares";
import publicado from "../evento/Publicado.module.css";

type Props = {
  /** El lugar como quedó, armado con lo publicado: lo que pinta la tarjeta es lo que verá la gente en Lugares. */
  lugar: Pick<LugarResumen, "id" | "slug" | "nombre" | "tipo" | "direccion" | "portada" | "privado">;
  /** «Publicar otro»: vuelve al primer paso con todo vacío. */
  onOtro: () => void;
};

/**
 * «Publicado» del alta de lugar (prototipo firmado, bitácora 342; el final del canon, como el del evento): el sello, «Lugar publicado», el lugar
 * como quedó en el renglón de las listas (toca y abre su ficha) y una sola sugerencia en punteado, «Publicar un evento aquí», que abre el alta
 * de evento con el lugar ya puesto. En el pie, «Compartir» (el mismo texto que la ficha; no en un lugar privado, que nadie más abre) y
 * «Publicar otro», quieto.
 */
export default function Publicado({ lugar, onOtro }: Props) {
  const { url, texto } = compartirLugar(lugar);
  return (
    <>
      <div className={publicado.final}>
        <span className={publicado.sello} aria-hidden="true">
          <IconoOk />
        </span>
        <h2 tabIndex={-1}>Lugar publicado</h2>
        <p>{lugar.privado ? "Guardado. Solo tú lo ves:" : "Ya está en el directorio. Así lo ve la gente:"}</p>
      </div>
      <ul className={publicado.tarjeta}>
        <RenglonLugar lugar={lugar} />
      </ul>
      <section className={publicado.sugerencia} aria-labelledby="sugerencia-lugar">
        <h3 id="sugerencia-lugar">¿Hay algo próximo en {lugar.nombre}?</h3>
        <p>Publica su primer evento con el lugar ya puesto.</p>
        <Boton href={enlaceAltaEvento({ lugar: lugar.id })} prefetch={false}>
          Publicar un evento aquí
        </Boton>
      </section>
      <PiePaso>
        {!lugar.privado && (
          <BotonCompartir titulo={lugar.nombre} texto={texto} url={url} className={claseBoton({ variante: "secundario" })}>
            Compartir
          </BotonCompartir>
        )}
        <Boton type="button" variante="quieto" onClick={onOtro}>
          Publicar otro
        </Boton>
      </PiePaso>
    </>
  );
}
