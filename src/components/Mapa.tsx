"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import type { IControl, Map as MapaGL, Marker } from "mapbox-gl";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import type { LugarLista } from "@/lib/lugares";
import styles from "./Mapa.module.css";

type EstadoMapa = "cargando" | "listo" | "sin-token" | "error";
type Punto = { lat: number; lng: number };

type Props = {
  /** "ver": pantalla completa con pins. "elegir": recuadro con un pin que se arrastra (alta/edición). */
  modo?: "ver" | "elegir";
  lugares?: LugarLista[];
  /** Solo en "ver": al tocar un pin (o el mapa, con null). Sin esto, el pin navega a la ficha. */
  onPin?: (lugar: LugarLista | null) => void;
  /** Solo en "ver": id del pin resaltado (el de la tarjeta abierta). */
  elegido?: string | null;
  /** Solo en "ver": la persona en el mapa; `vez` cambia con cada toque al botón de ubicación para volver a centrar. */
  ubicacion?: (Punto & { vez: number }) | null;
  /** Solo en "elegir": posición del pin; null = todavía no hay. */
  valor?: Punto | null;
  onCambio?: (p: Punto) => void;
  /** Solo en "ver": lugar en el que centrar el mapa al abrir. */
  centrarEn?: Punto | null;
  ciudad?: Ciudad;
  /** "pantalla": fijo a toda la pantalla (con panel encima). "caja": llena el contenedor donde se pone. */
  presentacion?: "pantalla" | "caja";
  /** Solo en "ver": abre inclinado, con los edificios en 3D, y un botón 3D/2D para cambiarlo. */
  perspectiva?: boolean;
};

const COLOR_PIN = "#1a1a1a"; // tinta, como los pins de lugares; Mapbox pide el color literal (pin que se arrastra)
/** Inclinación de la perspectiva en el mapa de Lugares (decisión del founder, 2026-09-14). */
const INCLINACION = 50;
/** Pin de lugar: 28×36, relleno o hueco según la clase; el punto blanco lo lleva siempre. */
const PIN_SVG = '<svg viewBox="0 0 28 36" width="28" height="36" aria-hidden="true"><path d="M14 35S3 21 3 13a11 11 0 0 1 22 0c0 8-11 22-11 22z" stroke-width="2"/><circle cx="14" cy="13" r="4"/></svg>';

/** Botón 3D/2D sobre el mapa: inclina o aplana la vista; respeta "reducir movimiento". */
function controlPerspectiva(): IControl {
  let boton: HTMLButtonElement | null = null;
  const pintar = (m: MapaGL) => {
    if (!boton) return;
    const inclinado = m.getPitch() > 5;
    boton.textContent = inclinado ? "2D" : "3D";
    boton.setAttribute("aria-label", inclinado ? "Ver el mapa plano" : "Ver el mapa en perspectiva");
    boton.setAttribute("aria-pressed", String(inclinado));
  };
  return {
    onAdd(m: MapaGL) {
      boton = document.createElement("button");
      boton.type = "button";
      boton.className = styles.perspectiva;
      boton.addEventListener("click", () => {
        const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        m.easeTo({ pitch: m.getPitch() > 5 ? 0 : INCLINACION, duration: sinMovimiento ? 0 : 500 });
      });
      m.on("pitchend", () => pintar(m));
      pintar(m);
      return boton;
    },
    onRemove() {
      boton?.remove();
      boton = null;
    },
  };
}

/** Capa de edificios en 3D (altura real de Mapbox Streets) para estilos clásicos; discreta, del tono del fondo. */
function agregarEdificios(mapa: MapaGL) {
  if (mapa.getLayer("edificios-3d") || !mapa.getSource("composite")) return;
  const capas = mapa.getStyle()?.layers ?? [];
  const primeraEtiqueta = capas.find((c) => c.type === "symbol" && (c.layout as { "text-field"?: unknown } | undefined)?.["text-field"])?.id;
  mapa.addLayer(
    {
      id: "edificios-3d",
      type: "fill-extrusion",
      source: "composite",
      "source-layer": "building",
      filter: ["==", ["get", "extrude"], "true"],
      minzoom: 14,
      paint: {
        "fill-extrusion-color": "#e4e2dc",
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["get", "height"]],
        "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["get", "min_height"]],
        "fill-extrusion-opacity": 0.75,
      },
    },
    primeraEtiqueta,
  );
}

/**
 * Único renderer de mapa de la app (acuerdo del council: "un solo renderer de mapa").
 * Tema claro siempre: si el estilo se basa en Mapbox Standard se fuerza el preset de día.
 */
export default function Mapa({ modo = "ver", lugares = [], onPin, elegido = null, ubicacion = null, valor = null, onCambio, centrarEn = null, ciudad = CIUDAD_INICIAL, presentacion = "pantalla", perspectiva = false }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaGL | null>(null);
  const pinesRef = useRef<Map<string, Marker>>(new Map());
  const yoRef = useRef<Marker | null>(null);
  const onPinRef = useRef(onPin);
  useEffect(() => {
    onPinRef.current = onPin;
  }, [onPin]);
  const encuadradoRef = useRef(false); // el encuadre a los pins se hace una sola vez, al abrir
  const pinElegirRef = useRef<Marker | null>(null);
  const onCambioRef = useRef(onCambio);
  useEffect(() => {
    onCambioRef.current = onCambio;
  }, [onCambio]);
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoMapa>(() => (configPublica().mapboxToken ? "cargando" : "sin-token"));

  // Crear el mapa una vez.
  useEffect(() => {
    const { mapboxToken, mapboxStyle } = configPublica();
    const nodo = contenedor.current;
    if (!mapboxToken || !nodo) return;
    let cancelado = false;
    let mapa: MapaGL | undefined;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      mapboxgl.accessToken = mapboxToken;
      const inicio = centrarEn ?? valor ?? ciudad.centro;
      mapa = new mapboxgl.Map({
        container: nodo,
        style: mapboxStyle,
        center: [inicio.lng, inicio.lat],
        zoom: centrarEn || valor ? 16 : ciudad.zoom,
        language: "es",
        attributionControl: false,
        logoPosition: modo === "ver" ? "top-left" : "bottom-left",
        pitch: perspectiva ? INCLINACION : 0,
      });
      mapaRef.current = mapa;
      mapa.addControl(new mapboxgl.AttributionControl({ compact: true }), modo === "ver" ? "top-right" : "bottom-right");
      if (perspectiva) mapa.addControl(controlPerspectiva(), "top-right");
      mapa.on("style.load", () => {
        const importaStandard = mapa?.getStyle()?.imports?.some((i) => i.id === "basemap");
        if (importaStandard) mapa?.setConfigProperty("basemap", "lightPreset", "day");
        // Edificios en 3D con perspectiva: Mapbox Standard ya los trae; un estilo clásico los dibuja desde su capa de edificios.
        if (perspectiva && !importaStandard && mapa) agregarEdificios(mapa);
      });
      mapa.on("load", () => setEstado("listo"));
      mapa.on("error", (e) => {
        console.error("Mapbox:", e.error);
        setEstado((actual) => (actual === "listo" ? actual : "error"));
      });
      if (modo === "elegir") {
        mapa.on("click", (e) => onCambioRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      } else {
        mapa.on("click", () => onPinRef.current?.(null)); // tocar fuera cierra la tarjeta
      }
    });

    return () => {
      cancelado = true;
      mapa?.remove();
      mapaRef.current = null;
    };
    // El mapa se crea una sola vez; los cambios llegan por los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins de lugares (modo ver): lleno con eventos próximos, hueco sin ellos.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || modo !== "ver") return;
    let cancelado = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      pinesRef.current.forEach((p) => p.remove());
      // Al abrir, el encuadre muestra todos los pins. Con un lugar centrado por la URL no se toca; con cero pins queda la ciudad.
      if (!encuadradoRef.current && !centrarEn && lugares.length > 0) {
        encuadradoRef.current = true;
        const limites = new mapboxgl.LngLatBounds();
        lugares.forEach((l) => limites.extend([l.lng, l.lat]));
        const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const abajo = presentacion === "pantalla" ? Math.round(window.innerHeight * 0.5) + 24 : 72;
        // El encuadre de Mapbox pone la cámara plana; con perspectiva se conserva la inclinación.
        mapa.fitBounds(limites, { padding: { top: 56, left: 48, right: 48, bottom: abajo }, maxZoom: 15, pitch: perspectiva ? INCLINACION : 0, duration: sinMovimiento ? 0 : 600 });
      }
      pinesRef.current = new Map(
        lugares.map((l) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = `${styles.pin} ${l.proximo ? styles.pinLleno : styles.pinHueco}`;
          el.setAttribute("aria-label", l.nombre);
          el.innerHTML = PIN_SVG;
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (onPinRef.current) onPinRef.current(l);
            else router.push(`/lugares/${l.id}`);
          });
          return [l.id, new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([l.lng, l.lat]).addTo(mapa)];
        }),
      );
    });
    return () => {
      cancelado = true;
    };
  }, [estado, modo, lugares, router, centrarEn, presentacion, perspectiva]);

  // El pin de la tarjeta abierta se ve más grande.
  useEffect(() => {
    pinesRef.current.forEach((p, id) => p.getElement().classList.toggle(styles.pinElegido, id === elegido));
  }, [elegido, lugares, estado]);

  // La persona en el mapa (punto azul con halo) y el mapa centrado ahí; cada toque al botón vuelve a centrar.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || modo !== "ver") return;
    if (!ubicacion) {
      yoRef.current?.remove();
      yoRef.current = null;
      return;
    }
    let cancelado = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      if (!yoRef.current) {
        const el = document.createElement("span");
        el.className = styles.yo;
        el.setAttribute("aria-label", "Tu ubicación");
        yoRef.current = new mapboxgl.Marker({ element: el }).setLngLat([ubicacion.lng, ubicacion.lat]).addTo(mapa);
      } else {
        yoRef.current.setLngLat([ubicacion.lng, ubicacion.lat]);
      }
      const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      mapa.flyTo({ center: [ubicacion.lng, ubicacion.lat], zoom: Math.max(mapa.getZoom(), 14), duration: sinMovimiento ? 0 : 600 });
    });
    return () => {
      cancelado = true;
    };
  }, [estado, modo, ubicacion]);

  // Pin que se arrastra (modo elegir).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || modo !== "elegir") return;
    if (!valor) {
      pinElegirRef.current?.remove();
      pinElegirRef.current = null;
      return;
    }
    let cancelado = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      if (!pinElegirRef.current) {
        const pin = new mapboxgl.Marker({ color: COLOR_PIN, draggable: true }).setLngLat([valor.lng, valor.lat]).addTo(mapa);
        pin.on("dragend", () => {
          const p = pin.getLngLat();
          onCambioRef.current?.({ lat: p.lat, lng: p.lng });
        });
        pinElegirRef.current = pin;
        mapa.flyTo({ center: [valor.lng, valor.lat], zoom: Math.max(mapa.getZoom(), 16), duration: 600 });
      } else {
        const actual = pinElegirRef.current.getLngLat();
        if (Math.abs(actual.lat - valor.lat) > 1e-7 || Math.abs(actual.lng - valor.lng) > 1e-7) {
          pinElegirRef.current.setLngLat([valor.lng, valor.lat]);
          mapa.flyTo({ center: [valor.lng, valor.lat], zoom: Math.max(mapa.getZoom(), 16), duration: 600 });
        }
      }
    });
    return () => {
      cancelado = true;
    };
  }, [estado, modo, valor]);

  return (
    <div className={modo !== "ver" ? styles.mapaEmbebido : presentacion === "caja" ? styles.mapaCaja : styles.mapa} aria-label={`Mapa de ${ciudad.nombre}`} role="region">
      <div ref={contenedor} className={styles.lienzo} />
      {estado !== "listo" && (
        <p className={styles.aviso} role="status">
          {estado === "cargando" && "Cargando el mapa…"}
          {estado === "sin-token" && "Falta el token de Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN)."}
          {estado === "error" && "No se pudo cargar el mapa. Revisa el token de Mapbox."}
        </p>
      )}
      {modo === "elegir" && estado === "listo" && (
        <p className={styles.pista}>{valor ? "Arrastra el pin o toca el mapa para ajustar." : "Toca el mapa donde está el lugar."}</p>
      )}
    </div>
  );
}
