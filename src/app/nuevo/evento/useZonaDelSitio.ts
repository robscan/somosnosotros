"use client";

import { useEffect, useState } from "react";
import { zonaDelPunto } from "@/app/eventos/acciones";
import { ZONA_INICIAL, zonaSegura } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import type { Sitio } from "./pasos";

/** El punto que decide la zona de un sitio que no es del directorio: el público, o el exacto si es reservado. */
const puntoDe = ({ modo, otro }: Sitio) => (modo === "reservado" ? otro.privadoPunto : modo === "otro" ? otro.sitioPunto : null);
const claveDe = (sitio: Sitio): string => {
  const p = puntoDe(sitio);
  return p ? `${p.lat},${p.lng}` : "";
};

/**
 * La zona horaria en que se leen y se guardan las horas de un evento que se edita (OL-319), la misma que usará el servidor al guardar
 * (`zonaDelEvento` de las acciones): la del lugar del directorio, si es en uno; si no, la del punto del sitio, que se le pide al servidor cada
 * vez que el punto cambia (mientras llega, la de antes); sin punto, la de la ciudad inicial, salvo un sitio reservado cuya dirección ya se
 * retiró, que conserva la del evento. Es la regla del formulario de editar de siempre. `zonaEvento` es la guardada; `zonaSitio`, la del punto
 * con que se abrió (el servidor ya la calculó).
 */
export function useZonaDelSitio(sitio: Sitio, lugar: LugarResumen | undefined, { zonaEvento, zonaSitio }: { zonaEvento: string; zonaSitio: string }): string {
  const clave = claveDe(sitio);
  const [delPunto, setDelPunto] = useState(() => ({ clave, zona: zonaSitio }));
  useEffect(() => {
    if (!clave || clave === delPunto.clave) return;
    const [lat, lng] = clave.split(",").map(Number);
    let vigente = true;
    zonaDelPunto(lat, lng)
      .then((zona) => {
        if (vigente) setDelPunto({ clave, zona });
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [clave, delPunto.clave]);
  if (sitio.modo === "lugar") return zonaSegura(lugar?.zona ?? zonaEvento);
  if (clave) return zonaSegura(delPunto.zona);
  return sitio.modo === "reservado" && sitio.otro.direccionRetirada ? zonaSegura(zonaEvento) : ZONA_INICIAL;
}
