"use client";

import { claseBoton } from "@/components/ui/Boton";
import { IconoCamara } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import { AVISAR_DESDE, cuandoSeRenueva, lecturaAgotada, lecturasQueQuedan, type EstadoCartel } from "./estadoCartel";
import type { Cupo } from "./acciones";

/** Lo que dice el chip de la tarjeta sobre lo que hace ella misma (ui/Boton en una etiqueta: el control es el recuadro entero). */
const CHIP = `${claseBoton({ variante: "secundario", forma: "pildora", alto: "control", ancho: "contenido" })} ${canon.rehacerCartel}`;

/**
 * La tarjeta del cartel, antes del formulario (docs/rediseno/22 y 23, firmadas por el founder el 2026-09-17).
 * Es lo único que explica la pantalla: el alta de evento ya no lleva frase debajo del título.
 *
 * Todo el recuadro es el control: el campo de archivo lo cubre entero, así el toque cae en él. La cámara
 * metida en el campo del nombre no lo recibía, porque un <label> solo manda el toque a un campo y ese era
 * el del nombre (bitácora 093). Por eso tampoco va nada interactivo dentro: los chips lo dicen, pero quien
 * recibe el toque es la tarjeta.
 *
 * Sin cupo deja de ser la cámara y no hace nada: dice cuándo vuelven las lecturas (OL-307: ya no se piden más). El formulario sigue
 * debajo: llenar a mano nunca se bloquea.
 *
 * El titular y el detalle van juntos en una región viva: si solo lo estuviera el detalle, un lector de
 * pantalla nunca oiría "Leí el cartel" ni "No pude…" (revisión de la bitácora 095).
 */
export default function TarjetaCartel({ cartel, cupo, ocupado, errorCupo = false, onReintentarCupo, onElegir }: { cartel: EstadoCartel; cupo: Cupo | null; ocupado: boolean; errorCupo?: boolean; onReintentarCupo?: () => void; onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const estado = cartel?.estado;
  const agotado = cupo ? lecturaAgotada(cupo) : estado === "sin_cupo";
  const quedan = lecturasQueQuedan(cupo);
  const avisoCupo = quedan !== null && quedan > 0 && quedan <= AVISAR_DESDE ? `Te ${quedan === 1 ? "queda" : "quedan"} ${quedan} ${quedan === 1 ? "lectura" : "lecturas"} este mes.` : null;

  const titular = agotado ? "Se acabaron tus lecturas del mes" : estado === "leyendo" ? "Leyendo el cartel…" : estado === "leido" ? "Leí el cartel" : estado === "fallo" ? (cartel?.titulo ?? "No pude leer el cartel") : "Sube el cartel";
  const detalle = agotado
    ? (estado === "sin_cupo" && cartel?.mensaje ? cartel.mensaje : `Se renuevan ${cuandoSeRenueva()}.`)
    : estado === "leyendo"
      ? "Tarda unos segundos. No cierres la pantalla."
      : ((estado !== "sin_cupo" ? cartel?.mensaje : null) ?? avisoCupo ?? "Leemos el nombre, la fecha, el lugar y el precio.");

  const dentro = (
    <>
      {cartel?.foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
        <img src={cartel.foto} alt="" className={canon.miniaturaCartel} />
      ) : (
        <span className={canon.marcoCartel}><IconoCamara width={24} height={24} /></span>
      )}
      <span className={canon.textoCartel} role="status">
        <b>{errorCupo ? "No pude confirmar tus lecturas" : titular}</b>
        <small>{errorCupo ? "Revisa tu conexión e intenta de nuevo. Puedes seguir a mano." : detalle}</small>
        {!errorCupo && !agotado && avisoCupo && detalle !== avisoCupo && <small>{avisoCupo}</small>}
        {!errorCupo && agotado && (estado === "fallo" || estado === "leido") && <small>{estado === "leido" ? "Leí el cartel." : `${cartel?.titulo ?? "No pude leer el cartel"}.`} {cartel?.mensaje}</small>}
        {estado === "leyendo" && (
          <span className={canon.barritaCartel} aria-hidden="true">
            <span />
          </span>
        )}
        {errorCupo ? <span className={CHIP}>Reintentar</span> : !agotado && estado === "fallo" && <span className={CHIP}>Probar con otra foto</span>}
      </span>
    </>
  );

  // Sin cupo la tarjeta ya no abre la cámara ni hace nada: dice cuándo vuelven las lecturas.
  if (errorCupo) return <button type="button" aria-label="Reintentar consulta de lecturas" className={`${canon.cartel} ${canon.cartelSinCupo} ${canon.cartelFallo}`} onClick={onReintentarCupo} disabled={ocupado}>{dentro}</button>;
  if (agotado) return <div className={`${canon.cartel} ${canon.cartelSinCupo} ${canon.cartelQuieto}`}>{dentro}</div>;

  const nombre = estado === "fallo" ? "Probar con otra foto" : estado === "leido" ? "Cambiar el cartel" : "Sube el cartel";
  return (
    <label className={`${canon.cartel} ${estado === "leido" ? canon.cartelLeido : ""} ${estado === "fallo" ? canon.cartelFallo : ""}`}>
      {dentro}
      <input type="file" accept="image/*" onChange={onElegir} disabled={ocupado} aria-label={nombre} />
    </label>
  );
}
