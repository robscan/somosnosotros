"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification, GeoJSONSource, Map as MapaGL, MapMouseEvent, Marker } from "mapbox-gl";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { diaPin } from "@/lib/fechas";
import { hrefLugar, type LugarLista } from "@/lib/lugares";
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
  /** La persona en el mapa (punto azul); `vez` cambia con cada toque al botón de ubicación para volver a centrar. En "elegir" solo se pinta: el pin es quien centra. */
  ubicacion?: (Punto & { vez: number }) | null;
  /** Solo en "elegir": posición del pin; null = todavía no hay. */
  valor?: Punto | null;
  onCambio?: (p: Punto) => void;
  /** Solo en "ver": lugar en el que centrar el mapa al abrir. */
  centrarEn?: Punto | null;
  /** Solo en "ver": puntos que encuadrar; `vez` cambia con cada encuadre nuevo (búsqueda, encuadre inicial o "cercanos").
   *  Uno solo: se acerca a él. `paraBusqueda` deja más aire arriba, para no tapar la lista de resultados de la lupa. */
  encuadre?: { puntos: Punto[]; vez: number; paraBusqueda?: boolean } | null;
  ciudad?: Ciudad;
  /** "pantalla": fijo a toda la pantalla (con panel encima). "caja": llena el contenedor donde se pone. */
  presentacion?: "pantalla" | "caja";
  /** Solo en "ver": los lugares que la persona sigue (con sesión), en naranja con aro, más grandes y encima. El
   *  resalte lo lleva el seguido, no el destacado (docs/rediseno/35, decisión del founder tras firmar, 2026-09-22). */
  seguidos?: string[];
};

const COLOR_PIN = "#1a1a1a"; // tinta; Mapbox pide el color literal (pin que se arrastra del alta)
/** Los lugares van en capas del propio mapa (no en elementos encima): círculo y nombre debajo, como las etiquetas de Mapbox. */
const FUENTE_LUGARES = "lugares";
const CAPA_ARO = "lugares-aro";
const CAPA_PUNTOS = "lugares-puntos";
const CAPA_DIA = "lugares-dia";
const CAPA_NOMBRES = "lugares-nombres";
/** Fuente de los nombres: existe en la cuenta de Mapbox (Noto Sans, la del estilo, da 404; ver OPEN_LOOPS). */
const FUENTE_NOMBRES = ["DIN Pro Bold", "Arial Unicode MS Bold"];
/** Radio del toque alrededor de un punto (el punto mide 10 px; el dedo necesita más). */
const RADIO_TOQUE = 18;
/** Una sola lista vacía para el valor por defecto: una nueva en cada render volvería a pintar las capas. */
const SIN_SEGUIDOS: string[] = [];

/** Color de una variable de diseño, porque Mapbox pide el valor literal. */
function colorDiseno(nombre: string, reserva: string) {
  if (typeof document === "undefined") return reserva;
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || reserva;
}

function aGeoJSON(lugares: LugarLista[], seguidos: string[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const ahora = new Date();
  return {
    type: "FeatureCollection",
    features: lugares.map((l) => {
      const dia = l.proximo ? diaPin(l.proximo.inicio, ahora, l.proximo.zona) : null;
      return {
        type: "Feature",
        id: l.id,
        geometry: { type: "Point", coordinates: [l.lng, l.lat] },
        properties: { id: l.id, nombre: l.nombre, dia, privado: !!l.privado, seguido: seguidos.includes(l.id) },
      };
    }),
  };
}

/**
 * Punto chico del color de acción con borde blanco; el elegido crece un 30 %. El nombre va debajo y cede sitio si
 * choca con otro. Con evento en los próximos siete días, un círculo más grande lleva "Hoy" o el día en tres letras.
 * El resalte (naranja cempasúchil y un aro) lo lleva el SEGUIDO, no el destacado (decisión del founder tras firmar
 * el doc 35, 2026-09-22: "de cara al usuario es más útil que se resalten los seguidos"); sin sesión, `seguidos`
 * llega vacío y ningún pin lo lleva.
 */
function agregarCapas(mapa: MapaGL, datos: GeoJSON.FeatureCollection) {
  const primario = colorDiseno("--primario", "#0f6b7c");
  const fondo = colorDiseno("--fondo", "#ffffff");
  const suave = colorDiseno("--texto-suave", "#5c5c5c"); // los privados (solo los ve el admin) van en gris
  const seguidoColor = colorDiseno("--destacado", "#d35400");
  const seguidoTexto = colorDiseno("--destacado-texto", "#a94400");
  mapa.addSource(FUENTE_LUGARES, { type: "geojson", data: datos, promoteId: "id" });
  const radioBase: ExpressionSpecification = ["case", ["!=", ["get", "dia"], null], 16, ["get", "seguido"], 7, 5];
  const radio: ExpressionSpecification = ["*", radioBase, ["case", ["boolean", ["feature-state", "elegido"], false], 1.3, 1]];
  // El aro: un círculo sin relleno, un poco más grande, solo en los seguidos (el "borde" de L31, movido al seguido).
  mapa.addLayer({
    id: CAPA_ARO,
    type: "circle",
    source: FUENTE_LUGARES,
    filter: ["==", ["get", "seguido"], true],
    paint: { "circle-radius": ["+", radio, 3.5], "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": seguidoColor, "circle-stroke-width": 1.5 },
  });
  mapa.addLayer({
    id: CAPA_PUNTOS,
    type: "circle",
    source: FUENTE_LUGARES,
    layout: { "circle-sort-key": ["case", ["get", "seguido"], 1, 0] },
    paint: {
      "circle-radius": radio,
      "circle-color": ["case", ["get", "privado"], suave, ["get", "seguido"], seguidoColor, primario],
      "circle-stroke-color": fondo,
      "circle-stroke-width": ["case", ["get", "seguido"], 2, 1.5],
    },
  });
  // "Hoy" o el día en tres letras, en blanco y negrita, al centro del círculo.
  mapa.addLayer({
    id: CAPA_DIA,
    type: "symbol",
    source: FUENTE_LUGARES,
    filter: ["!=", ["get", "dia"], null],
    layout: { "text-field": ["get", "dia"], "text-font": FUENTE_NOMBRES, "text-size": 10, "text-anchor": "center", "symbol-sort-key": ["case", ["get", "seguido"], -1, 0] },
    paint: { "text-color": fondo },
  });
  mapa.addLayer({
    id: CAPA_NOMBRES,
    type: "symbol",
    source: FUENTE_LUGARES,
    layout: {
      "text-field": ["get", "nombre"],
      "text-font": FUENTE_NOMBRES,
      "text-size": 14,
      "text-anchor": "top",
      "text-offset": [0, 0.55],
      "text-max-width": 9,
      "text-line-height": 1.1,
      "text-letter-spacing": 0.01,
      "symbol-sort-key": ["case", ["get", "seguido"], -1, ["!=", ["get", "dia"], null], 0, 1], // un seguido, y luego uno con eventos, gana el sitio si dos nombres chocan
    },
    // Del color de acción, en negrita y con halo ancho: se distinguen de las colonias y calles (gris, mayúsculas).
    paint: {
      "text-color": ["case", ["get", "privado"], suave, ["get", "seguido"], seguidoTexto, primario],
      "text-halo-color": fondo,
      "text-halo-width": 2,
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
export default function Mapa({ modo = "ver", lugares = [], onPin, elegido = null, ubicacion = null, valor = null, onCambio, centrarEn = null, encuadre = null, ciudad = CIUDAD_INICIAL, presentacion = "pantalla", seguidos = SIN_SEGUIDOS }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaGL | null>(null);
  const lugaresRef = useRef<Map<string, LugarLista>>(new Map());
  const yoRef = useRef<Marker | null>(null);
  const onPinRef = useRef(onPin);
  useEffect(() => {
    onPinRef.current = onPin;
  }, [onPin]);
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
        logoPosition: "bottom-left", // arriba van los chips de tipo
      });
      mapaRef.current = mapa;
      mapa.addControl(new mapboxgl.AttributionControl({ compact: true }), modo === "ver" ? "bottom-left" : "bottom-right");
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
          if (lugar && !onPinRef.current) routerRef.current.push(hrefLugar(lugar));
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

  // Lugares (modo ver): capas de círculo, aro, día y nombre; se crean una vez y luego solo cambian los datos.
  // El encuadre inicial ya no lo decide el mapa (antes: ajustar a todos los lugares): lo decide quien llama
  // (docs/rediseno/35, "Cómo se decide el encuadre") con el primer valor de `encuadre`.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || modo !== "ver") return;
    lugaresRef.current = new Map(lugares.map((l) => [l.id, l]));
    const datos = aGeoJSON(lugares, seguidos);
    const fuente = mapa.getSource(FUENTE_LUGARES) as GeoJSONSource | undefined;
    if (fuente) fuente.setData(datos);
    else agregarCapas(mapa, datos);
  }, [estado, modo, lugares, seguidos]);

  // Los puntos a encuadrar: uno solo, el mapa se acerca (dejando sitio a la tarjeta); varios, se encuadran. Sirve
  // para lo que encontró la búsqueda, el encuadre inicial (lugares de la semana y destacados) y "cercanos" (la
  // persona y los cinco lugares más próximos): quien llama decide qué puntos manda (docs/rediseno/35).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || modo !== "ver" || !encuadre || encuadre.puntos.length === 0) return;
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = sinMovimiento ? 0 : 600;
    if (encuadre.puntos.length === 1) {
      const p = encuadre.puntos[0];
      mapa.flyTo({ center: [p.lng, p.lat], zoom: Math.max(mapa.getZoom(), 15), offset: encuadre.paraBusqueda ? [0, -48] : [0, 0], duration });
      return;
    }
    let cancelado = false;
    const arriba = encuadre.paraBusqueda ? 132 : 56;
    const abajo = encuadre.paraBusqueda ? 96 : presentacion === "pantalla" ? Math.round(window.innerHeight * 0.5) + 24 : 72;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      const limites = new mapboxgl.LngLatBounds();
      encuadre.puntos.forEach((p) => limites.extend([p.lng, p.lat]));
      mapa.fitBounds(limites, { padding: { top: arriba, left: 48, right: 48, bottom: abajo }, maxZoom: 15, duration });
    });
    return () => {
      cancelado = true;
    };
  }, [estado, modo, encuadre, presentacion]);

  // El lugar de la tarjeta abierta se ve más grande.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || !mapa.getSource(FUENTE_LUGARES)) return;
    mapa.removeFeatureState({ source: FUENTE_LUGARES });
    if (elegido) mapa.setFeatureState({ source: FUENTE_LUGARES, id: elegido }, { elegido: true });
  }, [elegido, lugares, estado]);

  // La persona en el mapa: punto azul con halo. Ya no centra por su cuenta (antes lo hacía en "ver"): quien llama
  // decide la cámara con `encuadre` (en "ver", junto a los lugares cercanos; en "elegir", el pin manda).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa) return;
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
    });
    return () => {
      cancelado = true;
    };
  }, [estado, ubicacion]);

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
