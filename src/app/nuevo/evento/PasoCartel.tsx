"use client";

import type { ReactNode } from "react";
import Casilla from "@/components/ui/Casilla";
import { IconoCamara, IconoOk } from "@/components/ui/Iconos";
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
 * debajo del marco (`error`) y el recuadro sigue igual para volver a intentarlo.
 */
export function PasoInicio({ casilla, error, onElegir, onSinCartel }: { casilla: CasillaLectura | null; error: string | null; onElegir: (e: React.ChangeEvent<HTMLInputElement>) => void; onSinCartel: () => void }) {
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
      <Opcion titulo="No tengo cartel" onClick={onSinCartel} className={styles.otraPuerta} />
    </>
  );
}

/** La espera: el cartel elegido, chico y al centro, y qué pasa («Leyendo el cartel…» si se lee; «Subiendo el cartel…» si solo se guarda). Sin pie. */
export function PasoEspera({ foto, leyendo }: { foto: string | null; leyendo: boolean }) {
  return (
    <div className={styles.leyendo}>
      {/* eslint-disable-next-line @next/next/no-img-element -- la foto recién elegida, del teléfono */}
      {foto && <img src={foto} alt="" />}
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
