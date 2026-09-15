"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoJSONSource, Map as MapaGL, MapMouseEvent, Marker } from "mapbox-gl";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import type { LugarLista } from "@/lib/lugares";
import styles from "./Mapa.module.css";

type EstadoMapa = "cargando" | "listo" | "sin-token" | "error";
type Punto = { lat: number; lng: number };

type Props = {
  /** "ver": pantalla completa con los lugares. "elegir": recuadro con un pin que se arrastra (alta/edición). */
  modo?: "ver" | "elegir";
  lugares?: LugarLista[];
  /** Solo en "ver": al tocar un lugar (o el mapa, con null). Sin esto, el lugar navega a su ficha. */
  onPin?: (lugar: LugarLista | null) => void;
  /** Solo en "ver": id del lugar resaltado (el de la tarjeta abierta). */
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
};

const COLOR_PIN = "#1a1a1a"; // tinta; Mapbox pide el color literal (pin que se arrastra del alta)
/** Los lugares van en capas del propio mapa (no en elementos encima): círculo y nombre debajo, como las etiquetas de Mapbox. */
const FUENTE_LUGARES = "lugares";
const CAPA_PUNTOS = "lugares-puntos";
const CAPA_NOMBRES = "lugares-nombres";
/** Fuente de los nombres: existe en la cuenta de Mapbox (Noto Sans, la del estilo, da 404; ver OPEN_LOOPS). */
const FUENTE_NOMBRES = ["DIN Pro Medium", "Arial Unicode MS Regular"];
/** Radio del toque alrededor de un punto (el punto mide 10 px; el dedo necesita más). */
const RADIO_TOQUE = 18;

/** Color de una variable de diseño, porque Mapbox pide el valor literal. */
function colorDiseno(nombre: string, reserva: string) {
  if (typeof document === "undefined") return reserva;
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || reserva;
}

function aGeoJSON(lugares: LugarLista[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: lugares.map((l) => ({
      type: "Feature",
      id: l.id,
      geometry: { type: "Point", coordinates: [l.lng, l.lat] },
      properties: { id: l.id, nombre: l.nombre, proximo: !!l.proximo },
    })),
  };
}

/** Punto chico del color de acción con borde blanco; el elegido crece. El nombre va debajo y cede sitio si choca con otro. */
function agregarCapas(mapa: MapaGL, datos: GeoJSON.FeatureCollection) {
  const primario = colorDiseno("--primario", "#0f6b7c");
  const fondo = colorDiseno("--fondo", "#ffffff");
  const texto = colorDiseno("--texto", "#1a1a1a");
  mapa.addSource(FUENTE_LUGARES, { type: "geojson", data: datos, promoteId: "id" });
  mapa.addLayer({
    id: CAPA_PUNTOS,
    type: "circle",
    source: FUENTE_LUGARES,
    paint: {
      "circle-radius": ["case", ["boolean", ["feature-state", "elegido"], false], 8, 5],
      "circle-color": primario,
      "circle-stroke-color": fondo,
      "circle-stroke-width": 1.5,
    },
  });
  mapa.addLayer({
    id: CAPA_NOMBRES,
    type: "symbol",
    source: FUENTE_LUGARES,
    layout: {
      "text-field": ["get", "nombre"],
      "text-font": FUENTE_NOMBRES,
      "text-size": 13,
      "text-anchor": "top",
      "text-offset": [0, 0.6],
      "text-max-width": 9,
      "text-line-height": 1.1,
      "symbol-sort-key": ["case", ["get", "proximo"], 0, 1], // con eventos gana el sitio si dos nombres chocan
    },
    paint: {
      "text-color": texto,
      "text-halo-color": fondo,
      "text-halo-width": 1.5,
    },
  });
}

/** El lugar bajo el toque: se busca en un cuadro alrededor del punto (círculo o nombre) y gana el más cercano. */
function lugarTocado(mapa: MapaGL, e: MapMouseEvent): string | null {
  if (!mapa.getLayer(CAPA_PUNTOS)) return null;
  const { x, y } = e.point;
  const cerca = mapa.queryRenderedFeatures(
    [
      [x - RADIO_TOQUE, y - RADIO_TOQUE],
      [x + RADIO_TOQUE, y + RADIO_TOQUE],
    ],
    { layers: [CAPA_PUNTOS, CAPA_NOMBRES] },
  );
  let mejor: { id: string; d: number } | null = null;
  for (const f of cerca) {
    const id = f.properties?.id as string | undefined;
    const g = f.geometry;
    if (!id || g.type !== "Point") continue;
    const p = mapa.project(g.coordinates as [number, number]);
    const d = Math.hypot(p.x - x, p.y - y);
    if (!mejor || d < mejor.d) mejor = { id, d };
  }
  return mejor?.id ?? null;
}

/**
 * Único renderer de mapa de la app (acuerdo del council: "un solo renderer de mapa").
 * Tema claro siempre: si el estilo se basa en Mapbox Standard se fuerza el preset de día. Plano, sin perspectiva.
 */
export default function Mapa({ modo = "ver", lugares = [], onPin, elegido = null, ubicacion = null, valor = null, onCambio, centrarEn = null, ciudad = CIUDAD_INICIAL, presentacion = "pantalla" }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaGL | null>(null);
  const lugaresRef = useRef<Map<string, LugarLista>>(new Map());
  const yoRef = useRef<Marker | null>(null);
  const onPinRef = useRef(onPin);
  useEffect(() => {
    onPinRef.current = onPin;
  }, [onPin]);
  const encuadradoRef = useRef(false); // el encuadre a los lugares se hace una sola vez, al abrir
  const pinElegirRef = useRef<Marker | null>(null);
  const onCambioRef = useRef(onCambio);
  useEffect(() => {
    onCambioRef.current = onCambio;
  }, [onCambio]);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
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
      });
      mapaRef.current = mapa;
      mapa.addControl(new mapboxgl.AttributionControl({ compact: true }), modo === "ver" ? "top-right" : "bottom-right");
      mapa.on("style.load", () => {
        const importaStandard = mapa?.getStyle()?.imports?.some((i) => i.id === "basemap");
        if (importaStandard) mapa?.setConfigProperty("basemap", "lightPreset", "day");
      });
      mapa.on("load", () => setEstado("listo"));
      mapa.on("error", (e) => {
        console.error("Mapbox:", e.error);
        setEstado((actual) => (actual === "listo" ? actual : "error"));
      });
      if (modo === "elegir") {
        mapa.on("click", (e) => onCambioRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      } else {
        // Tocar un lugar abre su tarjeta (o su ficha); tocar fuera cierra la tarjeta.
        mapa.on("click", (e) => {
          const id = mapa ? lugarTocado(mapa, e) : null;
          const lugar = id ? (lugaresRef.current.get(id) ?? null) : null;
          if (lugar && !onPinRef.current) routerRef.current.push(`/lugares/${lugar.id}`);
          else onPinRef.current?.(lugar);
        });
        // Con ratón, la mano sobre un lugar.
        mapa.on("mousemove", (e) => {
          if (mapa) mapa.getCanvas().style.cursor = lugarTocado(mapa, e) ? "pointer" : "";
        });
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

  // Lugares (modo ver): capas de círculo y nombre; se crean una vez y luego solo cambian los datos.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || modo !== "ver") return;
    lugaresRef.current = new Map(lugares.map((l) => [l.id, l]));
    const datos = aGeoJSON(lugares);
    const fuente = mapa.getSource(FUENTE_LUGARES) as GeoJSONSource | undefined;
    if (fuente) fuente.setData(datos);
    else agregarCapas(mapa, datos);
    // Al abrir, el encuadre muestra todos los lugares. Con uno centrado por la URL no se toca; con cero queda la ciudad.
    if (!encuadradoRef.current && !centrarEn && lugares.length > 0) {
      encuadradoRef.current = true;
      let cancelado = false;
      import("mapbox-gl").then(({ default: mapboxgl }) => {
        if (cancelado) return;
        const limites = new mapboxgl.LngLatBounds();
        lugares.forEach((l) => limites.extend([l.lng, l.lat]));
        const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const abajo = presentacion === "pantalla" ? Math.round(window.innerHeight * 0.5) + 24 : 72;
        mapa.fitBounds(limites, { padding: { top: 56, left: 48, right: 48, bottom: abajo }, maxZoom: 15, duration: sinMovimiento ? 0 : 600 });
      });
      return () => {
        cancelado = true;
      };
    }
  }, [estado, modo, lugares, centrarEn, presentacion]);

  // El lugar de la tarjeta abierta se ve más grande.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || !mapa.getSource(FUENTE_LUGARES)) return;
    mapa.removeFeatureState({ source: FUENTE_LUGARES });
    if (elegido) mapa.setFeatureState({ source: FUENTE_LUGARES, id: elegido }, { elegido: true });
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
