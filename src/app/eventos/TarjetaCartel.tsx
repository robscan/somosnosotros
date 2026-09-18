"use client";

import { IconoCamara, IconoOk } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import { AVISAR_DESDE, cuandoSeRenueva, type EstadoCartel } from "./estadoCartel";
import type { Cupo } from "./acciones";

/**
 * La tarjeta del cartel, antes del formulario (docs/rediseno/22 y 23, firmadas por el founder el 2026-09-17).
 * Es lo único que explica la pantalla: el alta de evento ya no lleva frase debajo del título.
 *
 * Todo el recuadro es el control: el campo de archivo lo cubre entero, así el toque cae en él. La cámara
 * metida en el campo del nombre no lo recibía, porque un <label> solo manda el toque a un campo y ese era
 * el del nombre (bitácora 093). Por eso tampoco va nada interactivo dentro: los chips lo dicen, pero quien
 * recibe el toque es la tarjeta.
 *
 * Sin cupo deja de ser la cámara y pasa a ser un botón con una sola salida, pedir más; ya pedida, no hace
 * nada, para que no se pueda pedir cuarenta veces. El formulario sigue debajo: llenar a mano nunca se bloquea.
 *
 * El titular y el detalle van juntos en una región viva: si solo lo estuviera el detalle, un lector de
 * pantalla nunca oiría "Leí el cartel" ni "No pude…" (revisión de la bitácora 095).
 */
export default function TarjetaCartel({ cartel, cupo, ocupado, pidiendo, onElegir, onPedir }: { cartel: EstadoCartel; cupo: Cupo | null; ocupado: boolean; pidiendo: boolean; onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void; onPedir: () => void }) {
  const estado = cartel?.estado;
  const sinCupo = estado === "sin_cupo";
  const pedida = estado === "pedida";
  const quedan = cupo && !cupo.sinTope ? cupo.tope - cupo.usadas : null;

  const titular = sinCupo ? "Se acabaron tus lecturas del mes" : pedida ? "Ya pedimos más para ti" : estado === "leyendo" ? "Leyendo el cartel…" : estado === "leido" ? "Leí el cartel" : estado === "fallo" ? (cartel?.titulo ?? "No pude leer el cartel") : "Sube el cartel";
  const detalle = sinCupo
    ? (cartel?.mensaje ?? `Se renuevan ${cuandoSeRenueva()}.`)
    : pedida
      ? "Te escribimos en cuanto lo revisemos."
      : estado === "leyendo"
        ? "Tarda unos segundos. No cierres la pantalla."
        : (cartel?.mensaje ?? (quedan !== null && quedan <= AVISAR_DESDE ? `Te quedan ${quedan} ${quedan === 1 ? "lectura" : "lecturas"} este mes.` : "Leemos el nombre, la fecha, el lugar y el precio."));

  const dentro = (
    <>
      {cartel?.foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
        <img src={cartel.foto} alt="" className={canon.miniaturaCartel} />
      ) : (
        <span className={canon.marcoCartel}>{pedida ? <IconoOk width={24} height={24} /> : <IconoCamara width={24} height={24} />}</span>
      )}
      <span className={canon.textoCartel} role="status">
        <b>{titular}</b>
        <small>{detalle}</small>
        {estado === "leyendo" && (
          <span className={canon.barritaCartel} aria-hidden="true">
            <span />
          </span>
        )}
        {estado === "fallo" && <span className={canon.rehacerCartel}>Probar con otra foto</span>}
        {sinCupo && <span className={canon.rehacerCartel}>{pidiendo ? "Pidiendo…" : "Pedir más"}</span>}
      </span>
    </>
  );

  // Sin cupo la tarjeta ya no abre la cámara: es un botón. Ya pedida no hace nada.
  if (sinCupo) {
    return (
      <button type="button" className={`${canon.cartel} ${canon.cartelSinCupo}`} onClick={onPedir} disabled={pidiendo}>
        {dentro}
      </button>
    );
  }
  if (pedida) return <div className={`${canon.cartel} ${canon.cartelPedida}`}>{dentro}</div>;

  const nombre = estado === "fallo" ? "Probar con otra foto" : estado === "leido" ? "Cambiar el cartel" : "Sube el cartel";
  return (
    <label className={`${canon.cartel} ${estado === "leido" ? canon.cartelLeido : ""} ${estado === "fallo" ? canon.cartelFallo : ""}`}>
      {dentro}
      <input type="file" accept="image/*" onChange={onElegir} disabled={ocupado} aria-label={nombre} />
    </label>
  );
}
