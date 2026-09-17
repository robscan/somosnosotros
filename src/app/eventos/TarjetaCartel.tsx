"use client";

import { IconoCamara } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import type { EstadoCartel } from "./estadoCartel";

/**
 * La tarjeta del cartel, antes del formulario (docs/rediseno/22, firmada por el founder el 2026-09-17).
 * Es lo único que explica la pantalla: el alta de evento ya no lleva frase debajo del título.
 *
 * Todo el recuadro es el control: el campo de archivo lo cubre entero, así el toque cae en él. La cámara
 * metida en el campo del nombre no lo recibía, porque un <label> solo manda el toque a un campo y ese era
 * el del nombre (bitácora 093). Por eso tampoco va nada interactivo dentro: "Probar con otra foto" lo dice,
 * pero quien recibe el toque es la tarjeta.
 *
 * El titular y el detalle van juntos en una región viva: si solo lo estuviera el detalle, un lector de
 * pantalla nunca oiría "Leí el cartel" ni "No pude…" (revisión de la bitácora 095).
 */
export default function TarjetaCartel({ cartel, ocupado, onElegir }: { cartel: EstadoCartel; ocupado: boolean; onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const leyendo = cartel?.estado === "leyendo";
  const leido = cartel?.estado === "leido";
  const fallo = cartel?.estado === "fallo";
  const nombre = fallo ? "Probar con otra foto" : leido ? "Cambiar el cartel" : "Sube el cartel";
  return (
    <label className={`${canon.cartel} ${leido ? canon.cartelLeido : ""} ${fallo ? canon.cartelFallo : ""}`}>
      {cartel?.foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
        <img src={cartel.foto} alt="" className={canon.miniaturaCartel} />
      ) : (
        <span className={canon.marcoCartel}>
          <IconoCamara width={24} height={24} />
        </span>
      )}
      <span className={canon.textoCartel} role="status">
        <b>{leyendo ? "Leyendo el cartel…" : leido ? "Leí el cartel" : fallo ? (cartel.titulo ?? "No pude leer el cartel") : "Sube el cartel"}</b>
        <small>{leyendo ? "Tarda unos segundos. No cierres la pantalla." : (cartel?.mensaje ?? "Leemos el nombre, la fecha, el lugar y el precio.")}</small>
        {leyendo && (
          <span className={canon.barritaCartel} aria-hidden="true">
            <span />
          </span>
        )}
        {fallo && <span className={canon.rehacerCartel}>Probar con otra foto</span>}
      </span>
      <input type="file" accept="image/*" onChange={onElegir} disabled={ocupado} aria-label={nombre} />
    </label>
  );
}
