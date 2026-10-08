"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Vista } from "@/lib/mapa";
import type { SedeMapa } from "@/lib/mapaSedes";
import { urlMapaFicha, urlMapaSedes, ANCHO_MAPA_FICHA, ALTO_MAPA_FICHA } from "@/lib/mapaEstatico";
import { medirCliente, type DatosDe } from "@/lib/medir";
import { IconoAmpliar } from "./ui/Iconos";
import styles from "./MapaFicha.module.css";

/** La capa con el mapa de verdad: su código, el de Mapbox GL y su hoja de estilos se piden al primer toque, nunca con la ficha. */
const CapaMapa = dynamic(() => import("./CapaMapa"), { ssr: false });

/** La marca de la capa en el estado de su entrada del historial (Next.js y la marca propia de navegación guardan ahí lo suyo con otras llaves). */
const LLAVE_CAPA = "somosnosotrosMapa";
const enCapa = () => (window.history.state as Record<string, unknown> | null)?.[LLAVE_CAPA] === true;

type Props = {
  /** Las sedes con punto: una en un evento, un lugar o un sitio; las de un festival (OL-339). Sin ninguna no hay mapa. */
  sedes: SedeMapa[];
  /** La próxima actividad de la única sede cuando llega en su propia consulta (la ficha de un lugar, OL-161): pone el día en su pin al llegar. */
  proximo?: Promise<SedeMapa["proximo"]>;
  /** Desde qué ficha se abre el mapa (solo para medirlo). */
  ficha: DatosDe<"mapa_abierto">["ficha"];
  /** Lo que es el mapa, para el lector de pantalla: el nombre del sitio o «las sedes de…». */
  alt: string;
};

/**
 * El mapa de la tarjeta «Dónde» de una ficha (OL-089): la imagen estática de Mapbox (sin Mapbox GL ni JS: la sirve el caché del navegador) con un pin por
 * sede, encuadradas todas. Tocarla abre el mapa a pantalla completa (OL-350, `CapaMapa`): el de Lugares con solo esas sedes; arrastrarla no (la página se
 * desplaza). Antes, con una sede, abría Mapas (decisión 5 de OL-348): ahora «Cómo llegar» está en las acciones de la ficha y en la tarjeta de cada pin.
 *
 * Aquí vive lo que el mapa recuerda mientras la ficha sigue en pantalla (founder, 2026-10-08: «El mapa recuerda el pin elegido mientras está en la ficha;
 * al salir la olvida»): el pin elegido, dónde quedó la cámara y si se movió. Es estado de este componente: se va con la ficha, no se guarda en el teléfono.
 *
 * La capa no apila pantallas: al abrirse deja una sola entrada propia en el historial (marcada con `LLAVE_CAPA`), que el Atrás del sistema consume y la
 * cierra; la ✕ y Escape la consumen también (`history.back()`), y abrir una ficha desde la tarjeta la reemplaza (`TarjetaSede` con `reemplazar`), así que
 * nunca queda nada de más. Las hojas de la app no tocan el historial (`ui/Hoja`, `ui/CampoLargo`, el visor del cartel): esta capa es a pantalla completa y
 * tapa la barra con su Atrás, así que el Atrás del sistema tiene que cerrarla (decisión 6 del prototipo firmado, bitácora 379). En Safari del iPhone la
 * entrada se añade con el toque de la persona, que es lo que Safari pide para no saltarla; queda por medir en el iPhone (bitácora 381).
 */
export default function MapaFicha({ sedes, proximo, ficha, alt }: Props) {
  const puntos = sedes.map((s) => s.punto);
  const url = puntos.length > 1 ? urlMapaSedes(puntos) : urlMapaFicha(puntos[0] ?? null);
  const [abierta, setAbierta] = useState(false);
  // La memoria del mapa mientras la ficha está en pantalla.
  const [elegido, setElegido] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [movido, setMovido] = useState(false);
  const [proximoUnico, setProximoUnico] = useState<SedeMapa["proximo"]>(null);

  // Atrás o adelante a una entrada de la capa la abre; a cualquier otra, la cierra. Si la ficha carga sobre una entrada de la capa (se recargó con
  // el mapa abierto), lo abre: esa entrada es el mapa.
  useEffect(() => {
    const alVolver = () => setAbierta(enCapa());
    window.addEventListener("popstate", alVolver);
    if (enCapa()) alVolver();
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  useEffect(() => {
    let vigente = true;
    proximo?.then(
      (p) => vigente && setProximoUnico(p),
      () => {}, // sin el día, el pin queda como punto
    );
    return () => {
      vigente = false;
    };
  }, [proximo]);

  // La única sede con el día de su próxima actividad, si llegó aparte; el mismo arreglo mientras no cambie (el mapa no repinta sus pines por nada).
  const conDia = useMemo(() => (proximoUnico && sedes.length === 1 ? [{ ...sedes[0], proximo: proximoUnico }] : sedes), [sedes, proximoUnico]);

  function abrir() {
    window.history.pushState({ [LLAVE_CAPA]: true }, "");
    setAbierta(true);
    medirCliente("mapa_abierto", { ficha });
  }
  const cerrar = useCallback(() => {
    if (enCapa()) window.history.back(); // el `popstate` la cierra
    else setAbierta(false);
  }, []);

  if (!url) return null;
  return (
    <>
      <button type="button" className={styles.mapa} style={{ aspectRatio: `${ANCHO_MAPA_FICHA} / ${ALTO_MAPA_FICHA}` }} onClick={abrir} aria-label="Ver el mapa" aria-haspopup="dialog">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Mapbox */}
        <img src={url} alt="" loading="lazy" width={ANCHO_MAPA_FICHA} height={ALTO_MAPA_FICHA} />
        <IconoAmpliar className={styles.ampliar} />
      </button>
      {abierta && (
        <CapaMapa
          sedes={conDia}
          etiqueta={`Mapa de ${alt}`}
          elegido={elegido}
          onElegir={setElegido}
          vista={vista}
          alMover={setVista}
          movido={movido}
          onMovido={setMovido}
          onCerrar={cerrar}
        />
      )}
    </>
  );
}
