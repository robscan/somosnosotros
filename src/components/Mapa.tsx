"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import styles from "./Mapa.module.css";

type EstadoMapa = "cargando" | "listo" | "sin-token" | "error";

/**
 * Único renderer de mapa de la app (acuerdo del council: "un solo renderer de mapa").
 * Ocupa toda la pantalla; el panel inferior va encima.
 */
export default function Mapa() {
  const contenedor = useRef<HTMLDivElement>(null);
  // Sin token no hay nada que cargar: se sabe desde el primer render.
  const [estado, setEstado] = useState<EstadoMapa>(() =>
    configPublica().mapboxToken ? "cargando" : "sin-token",
  );

  useEffect(() => {
    const { mapboxToken, mapboxStyle } = configPublica();
    const nodo = contenedor.current;
    if (!mapboxToken || !nodo) return;

    let mapa: import("mapbox-gl").Map | undefined;
    let cancelado = false;

    // mapbox-gl toca `window` al cargarse: se importa solo en el navegador.
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      mapboxgl.accessToken = mapboxToken;
      mapa = new mapboxgl.Map({
        container: nodo,
        style: mapboxStyle,
        center: [CIUDAD_INICIAL.centro.lng, CIUDAD_INICIAL.centro.lat],
        zoom: CIUDAD_INICIAL.zoom,
        language: "es",
        attributionControl: false,
        logoPosition: "top-left",
      });
      mapa.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-right");
      mapa.on("load", () => setEstado("listo"));
      mapa.on("error", (e) => {
        console.error("Mapbox:", e.error);
        setEstado((actual) => (actual === "listo" ? actual : "error"));
      });
    });

    return () => {
      cancelado = true;
      mapa?.remove();
    };
  }, []);

  return (
    <div className={styles.mapa} aria-label={`Mapa de ${CIUDAD_INICIAL.nombre}`} role="region">
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
