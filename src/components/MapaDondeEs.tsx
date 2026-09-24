"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoJSONSource, Map as MapaGL, MapMouseEvent, Marker } from "mapbox-gl";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import type { LugarResumen } from "@/lib/lugares";
import styles from "./MapaDondeEs.module.css";

type Punto = { lat: number; lng: number };
type EstadoMapa = "cargando" | "listo" | "sin-token" | "error";

type Props = {
  /** Lugares registrados de la ciudad, como pines tocables con su nombre (docs/rediseno/43, paso 1). */
  lugares: LugarResumen[];
  /** El pin del evento: null antes de elegir nada. */
  seleccion: Punto | null;
  /** Dónde centrar mientras no hay selección (la ciudad de contexto). */
  centrarEn: Punto;
  ciudad?: Ciudad;
  /** La persona en el mapa (punto azul), si "Estoy aquí" ya se tocó. */
  yo?: (Punto & { vez: number }) | null;
  /** Cuánto del mapa tapa, en px, algo pegado abajo (OL-182: la hoja "Agregar lugar", a media pantalla): el pin
   *  y el centro se recentran con ese margen para quedar siempre en la parte de arriba, visible. 0 sin nada que
   *  tape el mapa. */
  paddingInferior?: number;
  /** Tocar un lugar registrado. */
  onLugar: (id: string) => void;
  /** Tocar un punto de interés del propio estilo de Mapbox (si el estilo lo expone; ver HojaDondeEs.tsx). */
  onPoi: (nombre: string, punto: Punto) => void;
  /** Tocar cualquier otro punto del mapa (o un POI, si el estilo no expone ninguno tocable). */
  onPunto: (punto: Punto) => void;
  /** Soltar el pin tras arrastrarlo. */
  onArrastre: (punto: Punto) => void;
};

const FUENTE = "donde-es-lugares";
const CAPA_PUNTOS = "donde-es-puntos";
const CAPA_NOMBRES = "donde-es-nombres";
/** El dedo necesita más radio que el punto (10 px) para acertar (mismo criterio que Mapa.tsx). */
const RADIO_TOQUE = 18;
const SIN_LUGARES: LugarResumen[] = [];

function colorDiseno(nombre: string, reserva: string) {
  if (typeof document === "undefined") return reserva;
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || reserva;
}

function aGeoJSON(lugares: LugarResumen[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: lugares.map((l) => ({ type: "Feature", id: l.id, geometry: { type: "Point", coordinates: [l.lng, l.lat] }, properties: { id: l.id, nombre: l.nombre } })),
  };
}

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
 * Un punto de interés del propio estilo de Mapbox (una plaza, un parque…), si el estilo lo trae en una capa con
 * nombre reconocible ("poi" en el id de la capa o en su `source-layer`, como en los estilos Streets/Standard de
 * Mapbox). Es "lo que Mapbox exponga en el estilo actual" (encargo OL-173): si la cuenta usa un estilo que no trae
 * ninguna, esto nunca encuentra nada y el toque cae en un punto vacío, sin romperse (ver la nota en HojaDondeEs.tsx
 * sobre qué se pudo comprobar sin token de Mapbox en este entorno).
 */
function poiTocado(mapa: MapaGL, e: MapMouseEvent): { nombre: string; punto: Punto } | null {
  try {
    const features = mapa.queryRenderedFeatures(e.point);
    for (const f of features) {
      if (f.geometry.type !== "Point") continue;
      const esPoi = /poi/i.test(f.layer?.id ?? "") || /poi/i.test((f.layer as { "source-layer"?: string })?.["source-layer"] ?? "");
      if (!esPoi) continue;
      const nombre = (f.properties?.name as string | undefined) ?? (f.properties?.name_es as string | undefined);
      if (!nombre) continue;
      const [lng, lat] = f.geometry.coordinates as [number, number];
      return { nombre, punto: { lat, lng } };
    }
  } catch {
    // El estilo puede no exponer ninguna capa de POI consultable: se trata como "nada encontrado".
  }
  return null;
}

/**
 * El mapa de fondo de "¿Dónde es?" (OL-173): a diferencia de `Mapa.tsx` ("modo ver" con los lugares, "modo elegir"
 * con un pin suelto), esta pantalla necesita las dos cosas a la vez -lugares tocables Y un pin que se mueve a
 * cualquier punto- y ningún modo de `Mapa.tsx` las da juntas. Se escribe aparte, con el mismo patrón (single
 * instancia, capas por datos, tema claro forzado) para no tocar `Mapa.tsx` mientras OL-174 trabaja ahí a la vez
 * (instrucción del gestor). Documentado en la bitácora 208 como algo por unificar más adelante.
 */
export default function MapaDondeEs({ lugares = SIN_LUGARES, seleccion, centrarEn, ciudad = CIUDAD_INICIAL, yo = null, paddingInferior = 0, onLugar, onPoi, onPunto, onArrastre }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaGL | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const yoRef = useRef<Marker | null>(null);
  const arrastrando = useRef(false);
  const paddingAplicado = useRef(0);
  const onLugarRef = useRef(onLugar);
  const onPoiRef = useRef(onPoi);
  const onPuntoRef = useRef(onPunto);
  const onArrastreRef = useRef(onArrastre);
  useEffect(() => {
    onLugarRef.current = onLugar;
    onPoiRef.current = onPoi;
    onPuntoRef.current = onPunto;
    onArrastreRef.current = onArrastre;
  }, [onLugar, onPoi, onPunto, onArrastre]);
  const [estado, setEstado] = useState<EstadoMapa>(() => (configPublica().mapboxToken ? "cargando" : "sin-token"));

  // Crear el mapa una sola vez.
  useEffect(() => {
    const { mapboxToken, mapboxStyle } = configPublica();
    const nodo = contenedor.current;
    if (!mapboxToken || !nodo) return;
    let cancelado = false;
    let mapa: MapaGL | undefined;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      mapboxgl.accessToken = mapboxToken;
      const inicio = seleccion ?? centrarEn;
      mapa = new mapboxgl.Map({
        container: nodo,
        style: mapboxStyle,
        center: [inicio.lng, inicio.lat],
        zoom: seleccion ? 16 : ciudad.zoom,
        language: "es",
        attributionControl: false,
        logoPosition: "bottom-left",
      });
      mapaRef.current = mapa;
      mapa.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      // Tema claro siempre (docs/DEFINICION.md, `Mapa.tsx`): si el estilo se basa en Mapbox Standard, se fuerza el preset de día.
      mapa.on("style.load", () => {
        const importaStandard = mapa?.getStyle()?.imports?.some((i) => i.id === "basemap");
        if (importaStandard) mapa?.setConfigProperty("basemap", "lightPreset", "day");
      });
      mapa.on("load", () => setEstado("listo"));
      mapa.on("error", (e) => {
        console.error("Mapbox:", e.error);
        setEstado((actual) => (actual === "listo" ? actual : "error"));
      });
      mapa.on("click", (e) => {
        if (arrastrando.current || !mapa) return;
        const idLugar = lugarTocado(mapa, e);
        if (idLugar) {
          onLugarRef.current(idLugar);
          return;
        }
        const poi = poiTocado(mapa, e);
        if (poi) {
          onPoiRef.current(poi.nombre, poi.punto);
          return;
        }
        onPuntoRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
      mapa.on("mousemove", (e) => {
        if (mapa) mapa.getCanvas().style.cursor = lugarTocado(mapa, e) ? "pointer" : "";
      });
    });
    return () => {
      cancelado = true;
      mapa?.remove();
      mapaRef.current = null;
    };
    // El mapa se crea una sola vez; los cambios llegan por los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Los lugares registrados: capa de puntos con su nombre, se crea una vez y luego solo cambian los datos.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa) return;
    const datos = aGeoJSON(lugares);
    const fuente = mapa.getSource(FUENTE) as GeoJSONSource | undefined;
    if (fuente) {
      fuente.setData(datos);
      return;
    }
    const primario = colorDiseno("--primario", "#6d34c8");
    const fondo = colorDiseno("--fondo", "#ffffff");
    const tinta = colorDiseno("--texto", "#1a1a1a");
    mapa.addSource(FUENTE, { type: "geojson", data: datos, promoteId: "id" });
    mapa.addLayer({ id: CAPA_PUNTOS, type: "circle", source: FUENTE, paint: { "circle-radius": 7, "circle-color": primario, "circle-stroke-color": fondo, "circle-stroke-width": 1.5 } });
    mapa.addLayer({
      id: CAPA_NOMBRES,
      type: "symbol",
      source: FUENTE,
      layout: { "text-field": ["get", "nombre"], "text-size": 12, "text-anchor": "top", "text-offset": [0, 0.6], "text-max-width": 9 },
      paint: { "text-color": tinta, "text-halo-color": fondo, "text-halo-width": 2 },
    });
  }, [estado, lugares]);

  // El pin del evento: se crea al aparecer la primera selección y luego solo se mueve (arrastrable siempre). El
  // recentrado (nuevo o movido) siempre respeta `paddingInferior` -la hoja "Agregar lugar" (OL-182) no debe tapar
  // el pin- y también se repite si SOLO cambia el padding (la hoja se abre/achica/crece con el mismo punto).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa) return;
    if (!seleccion) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    const padding = { top: 0, bottom: paddingInferior, left: 0, right: 0 };
    let cancelado = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      const primario = colorDiseno("--primario", "#6d34c8");
      if (!pinRef.current) {
        const pin = new mapboxgl.Marker({ color: primario, draggable: true }).setLngLat([seleccion.lng, seleccion.lat]).addTo(mapa);
        pin.on("dragstart", () => { arrastrando.current = true; });
        pin.on("dragend", () => {
          const p = pin.getLngLat();
          // Un toque después: si el arrastre pasó justo sobre un lugar o un POI, el clic del propio mapa no dispara.
          window.setTimeout(() => { arrastrando.current = false; }, 0);
          onArrastreRef.current({ lat: p.lat, lng: p.lng });
        });
        pinRef.current = pin;
        mapa.flyTo({ center: [seleccion.lng, seleccion.lat], zoom: Math.max(mapa.getZoom(), 16), duration: 500, padding });
      } else {
        const actual = pinRef.current.getLngLat();
        const movido = Math.abs(actual.lat - seleccion.lat) > 1e-7 || Math.abs(actual.lng - seleccion.lng) > 1e-7;
        if (movido) pinRef.current.setLngLat([seleccion.lng, seleccion.lat]);
        // Se recentra si el punto cambió, o si solo cambió `paddingInferior` (la hoja acaba de abrirse/crecer):
        // en los dos casos el pin puede quedar tapado si no se ajusta.
        if (movido || paddingInferior !== paddingAplicado.current) {
          mapa.flyTo({ center: [seleccion.lng, seleccion.lat], zoom: Math.max(mapa.getZoom(), 16), duration: 400, padding });
        }
      }
      paddingAplicado.current = paddingInferior;
    });
    return () => {
      cancelado = true;
    };
  }, [estado, seleccion, paddingInferior]);

  // Sin selección todavía (recién se abrió "Agregar lugar", antes de tocar el mapa): el CENTRO por omisión -la
  // ciudad de contexto- también debe quedar visible arriba de la hoja, no a la mitad de la pantalla tapado por
  // ella (doc 43, segunda versión: "el pin y el centro queden en la parte visible").
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || seleccion) return;
    mapa.easeTo({ center: [centrarEn.lng, centrarEn.lat], zoom: ciudad.zoom, padding: { top: 0, bottom: paddingInferior, left: 0, right: 0 }, duration: 300 });
  }, [estado, seleccion, paddingInferior, centrarEn.lat, centrarEn.lng, ciudad.zoom]);

  // La persona en el mapa (punto azul), si ya se ubicó.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa) return;
    if (!yo) {
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
        yoRef.current = new mapboxgl.Marker({ element: el }).setLngLat([yo.lng, yo.lat]).addTo(mapa);
      } else {
        yoRef.current.setLngLat([yo.lng, yo.lat]);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [estado, yo]);

  return (
    <div className={styles.mapa} aria-label={`Mapa de ${ciudad.nombre}`} role="region">
      <div ref={contenedor} className={styles.lienzo} />
      {estado !== "listo" && (
        <p className={styles.aviso} role="status">
          {estado === "cargando" && "Cargando el mapa…"}
          {estado === "sin-token" && "Falta el token de Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN)."}
          {estado === "error" && "No se pudo cargar el mapa. Revisa el token de Mapbox."}
        </p>
      )}
    </div>
  );
}
