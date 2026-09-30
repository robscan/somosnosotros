"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Map as MapaGL, Popup } from "mapbox-gl";
import { enlaceDeAlta } from "@/lib/armazon";
import { cabeLaTarjeta, poiBajoElDedo, RADIO_POI } from "@/lib/mapa";
import { sinMovimiento } from "@/lib/movimiento";
import { ANILLO_DESDE_MS, RETENCION_MS, type PuntoEnMapa } from "@/lib/pulsacionLarga";
import Boton from "./ui/Boton";
import BotonIcono from "./ui/BotonIcono";
import { IconoCerrar } from "./ui/Iconos";
import { usePulsacionLarga } from "./usePulsacionLarga";
import styles from "./PulsacionEnMapa.module.css";

/** Dónde quedó una pulsación larga: el sitio del mapa base que había bajo el dedo (con su nombre y su punto) o, si no había, el punto del dedo. */
type Marca = { lat: number; lng: number; nombre: string | null };

type Props = {
  mapa: RefObject<MapaGL | null>;
  contenedor: RefObject<HTMLElement | null>;
  listo: boolean;
  /** El lugar de la ficha abierta: abrir una ficha quita la marca. */
  elegido: string | null;
  /** Lo que la hoja tapa del mapa por abajo (px): la tarjeta va del lado que cabe en lo que se ve. */
  tapaAbajo: number;
  /** La tarjeta no cabe en lo que la hoja deja ver del mapa: que la hoja se recoja para darle sitio. */
  alDespejar: () => void;
  /** Si hay un lugar ya registrado bajo ese punto, lo abre (como con un toque) y dice que sí: nunca se ofrece registrar uno que ya está. */
  alLugar: (punto: PuntoEnMapa) => boolean;
};

/**
 * Registrar un lugar sosteniendo el dedo en el mapa (ajuste del founder, 2026-09-30). Mientras se sostiene, un anillo que crece desde los
 * `ANILLO_DESDE_MS` hasta los `RETENCION_MS` (con «reducir movimiento», ninguno). Al cumplirse, según lo que haya bajo el dedo: un lugar ya
 * registrado se abre como con un toque; un sitio del mapa base (un museo, un parque…) queda marcado en su punto con su nombre; y si no hay nada, el punto
 * del dedo, como «Lugar nuevo». La marca lleva una tarjeta con «Registrar lugar», que abre el alta con el nombre y el punto ya puestos (la sesión se
 * pide ahí, con eso por delante); no se salta directo al alta: una pulsación larga sin querer no debe abrir nada. La marca se va con la ✕, al tocar
 * fuera, al mover el mapa y al abrir una ficha.
 */
export default function PulsacionEnMapa({ mapa, contenedor, listo, elegido, tapaAbajo, alDespejar, alLugar }: Props) {
  const [anillo, setAnillo] = useState<PuntoEnMapa | null>(null);
  const [marca, setMarca] = useState<Marca | null>(null);
  /** La ventanita de Mapbox y su nodo, donde va la tarjeta (React la pinta ahí con un portal). */
  const ventanaRef = useRef<Popup | null>(null);
  /** La marca para la que ya se pidió despejar la hoja (una vez por marca) y lo último que pide despejarla. */
  const despejada = useRef<Marca | null>(null);
  const despejar = useRef(alDespejar);
  useEffect(() => {
    despejar.current = alDespejar;
  }, [alDespejar]);
  const [tarjeta, setTarjeta] = useState<HTMLElement | null>(null);
  const [elegidoVisto, setElegidoVisto] = useState(elegido);
  if (elegido !== elegidoVisto) {
    setElegidoVisto(elegido);
    if (elegido) setMarca(null);
  }

  usePulsacionLarga(contenedor, mapa, {
    listo,
    alAnillo: (punto) => {
      if (!sinMovimiento()) setAnillo(punto);
    },
    alQuitarAnillo: () => setAnillo(null),
    alLarga: ({ x, y }) => {
      const m = mapa.current;
      if (!m || alLugar({ x, y })) return;
      const sitio = poiBajoElDedo(m.queryRenderedFeatures([[x - RADIO_POI, y - RADIO_POI], [x + RADIO_POI, y + RADIO_POI]]), { x, y }, (lng, lat) => m.project([lng, lat]));
      setMarca(sitio ?? { nombre: null, ...m.unproject([x, y]) });
    },
  });

  // La marca y su tarjeta las mantiene Mapbox en su sitio, y la tarjeta se acomoda dentro de la pantalla. La ventanita se cierra sola al mover el mapa
  // y al tocarlo (el clic de soltar la pulsación larga no le llega: se traga en `usePulsacionLarga`), y la marca se va con ella.
  useEffect(() => {
    const m = mapa.current;
    if (!marca || !m) return;
    let cancelado = false;
    let quitar = () => {};
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      const punto = document.createElement("span");
      punto.className = styles.marca;
      punto.style.pointerEvents = "none"; // Mapbox les pone `auto` a los marcadores que no traen el suyo, y el dedo que sostiene está encima
      const donde: [number, number] = [marca.lng, marca.lat];
      const marcador = new mapboxgl.Marker({ element: punto }).setLngLat(donde).addTo(m);
      const contenido = document.createElement("div");
      const ventana = new mapboxgl.Popup({ className: styles.ventana, closeButton: false, closeOnMove: true, maxWidth: "none", offset: punto.offsetHeight / 2 })
        .setLngLat(donde)
        .setDOMContent(contenido)
        .addTo(m);
      ventana.on("close", () => setMarca((actual) => (actual === marca ? null : actual)));
      ventanaRef.current = ventana;
      setTarjeta(contenido);
      quitar = () => {
        ventana.remove();
        marcador.remove();
        ventanaRef.current = null;
      };
    });
    return () => {
      cancelado = true;
      quitar();
      setTarjeta(null);
    };
  }, [mapa, marca]);

  // La ventanita elige de qué lado de la marca va la tarjeta (arriba, o abajo si arriba no cabe) al colocarse, y entonces aún está vacía: con la
  // tarjeta ya pintada se le pide colocarse otra vez, con su tamaño de verdad. Como no sabe de la hoja, aquí se comprueba que quepa en lo que la
  // hoja deja ver del mapa; si no cabe, se pide que la hoja se recoja y, cuando lo haga (`tapaAbajo` cambia), se vuelve a comprobar.
  useLayoutEffect(() => {
    const m = mapa.current;
    const ventana = ventanaRef.current;
    const caja = ventana?.getElement();
    if (!tarjeta || !marca || !m || !ventana || !caja) return;
    ventana.setLngLat([marca.lng, marca.lat]);
    const y = m.project([marca.lng, marca.lat]).y;
    if (!cabeLaTarjeta(y, caja.offsetHeight, m.getContainer().clientHeight, tapaAbajo, Number(ventana.options.offset)) && despejada.current !== marca) {
      despejada.current = marca;
      despejar.current();
    }
  }, [mapa, tarjeta, marca, tapaAbajo]);

  return (
    <>
      {anillo && <span className={styles.anillo} style={{ left: anillo.x, top: anillo.y, "--anillo-dura": `${RETENCION_MS - ANILLO_DESDE_MS}ms` } as CSSProperties} aria-hidden="true" />}
      {tarjeta &&
        marca &&
        createPortal(
          <div role="group" aria-label="Lugar nuevo" className={styles.tarjeta}>
            <b>{marca.nombre ?? "Lugar nuevo"}</b>
            <BotonIcono tamano="control" aria-label="Cerrar" onClick={() => setMarca(null)}>
              <IconoCerrar width={20} height={20} />
            </BotonIcono>
            <Boton href={enlaceDeAlta("lugar", null, marca.nombre, marca).href} prefetch={false} alto="control" ancho="contenido">
              Registrar lugar
            </Boton>
          </div>,
          tarjeta,
        )}
    </>
  );
}
