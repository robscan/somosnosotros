"use client";

import type { CSSProperties, ReactNode } from "react";
import { claseBotonIcono } from "@/components/ui/BotonIcono";
import Casilla from "@/components/ui/Casilla";
import FotoSubida from "@/components/ui/FotoSubida";
import { IconoCamara, IconoLapiz, IconoOk } from "@/components/ui/Iconos";
import Opcion from "@/components/ui/Opcion";
import styles from "./PasoCartel.module.css";

/**
 * El camino con cartel del alta de evento por pasos (OL-302 y OL-307; prototipos firmados `publicar-por-pasos.html`, bitácora 323, y
 * `cartel-sin-lectura.html`, bitácora 334): el primer paso, la espera mientras se sube y se lee, la fila del cartel ya guardado sobre la
 * primera pregunta y la cabeza de «Revisa» con el cartel. Lo que sube y lee es `useLeerCartel`; aquí solo se pinta.
 */

/** Lo que dice la casilla «Lectura automática»: marcada, apagada (se acabaron las del mes) y qué la acompaña debajo. Sin servicio de lectura no hay casilla. */
export type CasillaLectura = { marcada: boolean; agotada: boolean; detalle: string | null; onCambio: (marcada: boolean) => void };

/**
 * Empieza con lo que se tiene (igual en todos los casos: el cartel se sube siempre): un marco con el recuadro «Sube el cartel» —todo él es
 * el control, y el campo de archivo, escondido, lo cubre (en el iPhone ofrece cámara o carrete)— y, como su última fila, la casilla
 * «Lectura automática» si hay servicio de lectura; fuera del marco, con más aire, «No tengo cartel». Si el cartel no se pudo subir, lo dice
 * debajo del marco (`error`) y el recuadro sigue igual para volver a intentarlo. Al editar (OL-319) la otra salida no es «No tengo cartel» sino
 * «Quitar el cartel» si el evento tiene uno (`sinCartel`), y ninguna si no lo tiene (Atrás vuelve a «Revisa»); debajo va lo que quien edita
 * agregue (`children`: la dirección de una imagen, para la administración).
 */
export function PasoInicio({ casilla, error, onElegir, onSinCartel, sinCartel = "No tengo cartel", children }: { casilla: CasillaLectura | null; error: string | null; onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void; onSinCartel: () => void; sinCartel?: string | null; children?: ReactNode }) {
  return (
    <>
      <div className={styles.marco}>
        <label className={styles.subir}>
          <IconoCamara />
          <b>Sube el cartel</b>
          <small>Será la portada del evento</small>
          <input type="file" accept="image/*" onChange={onElegir} aria-label="Sube el cartel" />
        </label>
        {casilla && <Casilla enMarco titulo="Lectura automática" detalle={casilla.detalle} marcada={casilla.marcada && !casilla.agotada} disabled={casilla.agotada} onCambio={casilla.onCambio} />}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {sinCartel && <Opcion titulo={sinCartel} onClick={onSinCartel} className={styles.otraPuerta} />}
      {children}
    </>
  );
}

/** La espera: el cartel elegido, chico y al centro, con la espera de subida de toda la app (`FotoSubida`, OL-353), y qué pasa («Leyendo el
 *  cartel…» si se lee; «Subiendo el cartel…» si solo se guarda). Sin pie. */
export function PasoEspera({ foto, leyendo }: { foto: string | null; leyendo: boolean }) {
  return (
    <div className={styles.leyendo} aria-busy="true">
      <FotoSubida src={null} vista={foto} />
      <p role="status">{leyendo ? "Leyendo el cartel…" : "Subiendo el cartel…"}</p>
    </div>
  );
}

/** La fila chica sobre la primera pregunta cuando el cartel quedó guardado sin leer: la miniatura y el sello «Cartel guardado» (con «no pude leerlo» si la lectura falló). */
export function CartelGuardado({ foto, noPude }: { foto: string; noPude: boolean }) {
  return (
    <div className={styles.guardado}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
      <img src={foto} alt="" />
      <span>
        <IconoOk width={14} height={14} strokeWidth={2.4} />
        {noPude ? "Cartel guardado · no pude leerlo" : "Cartel guardado"}
      </span>
    </div>
  );
}

/** La cabeza de «Revisa» con cartel: la miniatura, el sello «Leído del cartel» (si de él salieron datos) y el nombre (`children`). Al editar
 *  (OL-319 y OL-349) lleva dos lápices, sin letreros: uno al centro de la miniatura («Cambiar cartel»: toda la miniatura es el toque) y otro en
 *  la esquina de arriba a la derecha del nombre («Cambiar nombre»: todo el nombre es el toque). Cada uno es un botón transparente del tamaño de
 *  lo que cubre, con el círculo del canon dibujado dentro (`claseBotonIcono`). Sin cartel, al editar, la miniatura es el símbolo SN de siempre.
 *  `className` y `style` son de quien la pone (la entrada de «Revisa»). */
export function CabezaCartel({ foto, leido, children, editar, className, style }: { foto: string; leido: boolean; children: ReactNode; editar?: { onCartel: () => void; onNombre: () => void }; className?: string; style?: CSSProperties }) {
  const lapiz = (
    <span className={claseBotonIcono({ relieve: "elevado" })}>
      <IconoLapiz width={20} height={20} />
    </span>
  );
  return (
    <div className={[styles.cabeza, editar && styles.editable, className].filter(Boolean).join(" ")} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
      <img src={foto} alt="" />
      {leido && (
        <span className={styles.sello}>
          <IconoOk width={16} height={16} />
          Leído del cartel
        </span>
      )}
      {children}
      {editar && (
        <>
          <button type="button" className={styles.cambiarCartel} aria-label="Cambiar cartel" onClick={editar.onCartel}>
            {lapiz}
          </button>
          <button type="button" className={styles.cambiarNombre} aria-label="Cambiar nombre" onClick={editar.onNombre}>
            {lapiz}
          </button>
        </>
      )}
    </div>
  );
}
