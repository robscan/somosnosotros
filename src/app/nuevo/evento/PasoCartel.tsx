"use client";

import type { ReactNode } from "react";
import Boton, { claseBoton } from "@/components/ui/Boton";
import { IconoCamara, IconoOk } from "@/components/ui/Iconos";
import { cuandoSeRenueva, type EstadoCartel } from "@/app/eventos/estadoCartel";
import styles from "./PasoCartel.module.css";

/**
 * El camino con cartel del alta de evento por pasos (OL-302; prototipo firmado `publicar-por-pasos.html`, bitácora 323): el primer
 * paso, «Leyendo» y la cabeza de «Revisa» con el cartel leído. Lo que sube y lee es `useLeerCartel`; aquí solo se pinta.
 */

/** Lo que dice el chip de un recuadro que es un botón: ui/Boton en una etiqueta, porque el control es el recuadro entero. */
const CHIP = claseBoton({ variante: "secundario", forma: "pildora", alto: "control", ancho: "contenido" });

/**
 * El recuadro del cartel: todo él es el control, y el campo de archivo, escondido, lo cubre (en el iPhone ofrece cámara o carrete). Sin
 * lecturas se vuelve un botón con una sola salida, pedir más; ya pedida, no hace nada; si algo falló, lo dice con su causa y se puede
 * probar con otra foto (los textos son los de la tarjeta del formulario de siempre, `TarjetaCartel`).
 */
function Recuadro({ cartel, pidiendo, onElegir, onPedir }: { cartel: EstadoCartel; pidiendo: boolean; onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void; onPedir: () => void }) {
  const estado = cartel?.estado;
  const agotado = estado === "sin_cupo";
  const pedida = estado === "pedida";
  const fallo = estado === "fallo";
  const titular = agotado ? "Se acabaron tus lecturas del mes" : pedida ? "Ya pedimos más para ti" : fallo ? (cartel?.titulo ?? "No pude leer el cartel") : "Sube el cartel";
  const detalle = agotado ? (cartel?.mensaje ?? `Se renuevan ${cuandoSeRenueva()}.`) : pedida ? "Te escribimos en cuanto lo revisemos." : fallo ? cartel?.mensaje : "Leemos el nombre, la fecha, el lugar y el precio";
  // Todo el recuadro es una región viva: si algo cambia (no se pudo leer, se acabaron las lecturas), el lector de pantalla lo dice.
  const dentro: ReactNode = (
    <>
      {pedida ? <IconoOk /> : <IconoCamara />}
      <b>{titular}</b>
      {detalle && <small>{detalle}</small>}
      {agotado && <span className={CHIP}>{pidiendo ? "Pidiendo…" : "Pedir más lecturas"}</span>}
      {fallo && <span className={CHIP}>Probar con otra foto</span>}
    </>
  );
  if (agotado) {
    return (
      <button type="button" className={`${styles.subir} ${styles.apagado}`} onClick={onPedir} disabled={pidiendo} aria-label="Pedir más lecturas" aria-live="polite">
        {dentro}
      </button>
    );
  }
  if (pedida) return <div className={`${styles.subir} ${styles.apagado} ${styles.quieto}`} aria-live="polite">{dentro}</div>;
  return (
    <label className={`${styles.subir} ${fallo ? styles.fallo : ""}`} aria-live="polite">
      {dentro}
      <input type="file" accept="image/*" onChange={onElegir} aria-label={fallo ? "Probar con otra foto" : "Sube el cartel"} />
    </label>
  );
}

/**
 * Empieza con lo que se tiene: el recuadro del cartel y, del mismo ancho, «No tengo cartel». Sin lectura de cartel en el servidor
 * (`cartelActivo` apagado) no se ofrece el recuadro: solo queda seguir a mano.
 */
export function PasoInicio({ cartelActivo, cartel, pidiendo, onElegir, onPedir, onSinCartel }: { cartelActivo: boolean; cartel: EstadoCartel; pidiendo: boolean; onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void; onPedir: () => void; onSinCartel: () => void }) {
  return (
    <>
      {cartelActivo && <Recuadro cartel={cartel} pidiendo={pidiendo} onElegir={onElegir} onPedir={onPedir} />}
      <Boton type="button" variante="secundario" onClick={onSinCartel}>
        No tengo cartel
      </Boton>
    </>
  );
}

/** «Leyendo»: el cartel elegido, chico y al centro, y qué pasa. Sin pie: dura lo que tarde la lectura. */
export function PasoLeyendo({ foto }: { foto: string | null }) {
  return (
    <div className={styles.leyendo}>
      {/* eslint-disable-next-line @next/next/no-img-element -- la foto recién elegida, del teléfono */}
      {foto && <img src={foto} alt="" />}
      <p role="status">Leyendo el cartel…</p>
    </div>
  );
}

/** La cabeza de «Revisa» con cartel: la miniatura, el sello «Leído del cartel» (si de él salieron datos) y el nombre (`children`). */
export function CabezaCartel({ foto, leido, children }: { foto: string; leido: boolean; children: ReactNode }) {
  return (
    <div className={styles.cabeza}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
      <img src={foto} alt="" />
      {leido && (
        <span className={styles.sello}>
          <IconoOk width={16} height={16} />
          Leído del cartel
        </span>
      )}
      {children}
    </div>
  );
}
