"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapaGL, Marker } from "mapbox-gl";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import type { LugarResumen } from "@/lib/lugares";
import styles from "./Mapa.module.css";

type EstadoMapa = "cargando" | "listo" | "sin-token" | "error";
type Punto = { lat: number; lng: number };

type Props = {
  /** "ver": pantalla completa con pins. "elegir": recuadro con un pin que se arrastra (alta/edición). */
  modo?: "ver" | "elegir";
  lugares?: LugarResumen[];
  /** Solo en "elegir": posición del pin; null = todavía no hay. */
  valor?: Punto | null;
  onCambio?: (p: Punto) => void;
  /** Solo en "ver": lugar en el que centrar el mapa al abrir. */
  centrarEn?: Punto | null;
};

const COLOR_PIN = "#b3261e";

/**
 * Único renderer de mapa de la app (acuerdo del council: "un solo renderer de mapa").
 * Tema claro siempre: si el estilo se basa en Mapbox Standard se fuerza el preset de día.
 */
export default function Mapa({ modo = "ver", lugares = [], valor = null, onCambio, centrarEn = null }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaGL | null>(null);
  const pinesRef = useRef<Marker[]>([]);
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
      const inicio = centrarEn ?? valor ?? CIUDAD_INICIAL.centro;
      mapa = new mapboxgl.Map({
        container: nodo,
        style: mapboxStyle,
        center: [inicio.lng, inicio.lat],
        zoom: centrarEn || valor ? 16 : CIUDAD_INICIAL.zoom,
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

  // Pins de lugares (modo ver).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || modo !== "ver") return;
    let cancelado = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      pinesRef.current.forEach((p) => p.remove());
      pinesRef.current = lugares.map((l) => {
        const pin = new mapboxgl.Marker({ color: COLOR_PIN }).setLngLat([l.lng, l.lat]).addTo(mapa);
        const el = pin.getElement();
        el.style.cursor = "pointer";
        el.setAttribute("role", "link");
        el.setAttribute("aria-label", l.nombre);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          router.push(`/lugares/${l.id}`);
        });
        return pin;
      });
    });
    return () => {
      cancelado = true;
    };
  }, [estado, modo, lugares, router]);

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
    <div className={modo === "ver" ? styles.mapa : styles.mapaEmbebido} aria-label={`Mapa de ${CIUDAD_INICIAL.nombre}`} role="region">
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
