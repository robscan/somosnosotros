"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification, GeoJSONSource, Map as MapaGL, MapMouseEvent, Marker, SymbolLayerSpecification } from "mapbox-gl";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { diaPin } from "@/lib/fechas";
import { hrefLugar, type LugarLista } from "@/lib/lugares";
import { colorDiseno, RADIO_TOQUE, TEXTOS_MAPBOX, type EstadoMapa } from "@/lib/mapa";
import { propiedadesPin, TAMANO_NOMBRE, TAMANO_NOMBRE_ELEGIDO, type ColoresPin, type PropiedadesPin } from "@/lib/pines";
import styles from "./Mapa.module.css";

type Punto = { lat: number; lng: number };

type Props = {
  lugares?: LugarLista[];
  /** Al tocar un lugar. Sin esto, el lugar navega a su ficha. */
  onPin?: (lugar: LugarLista) => void;
  /** Id del lugar de la ficha abierta: el único con aro y sombra, con su nombre siempre a la vista y el resto atenuado (`@/lib/pines`). */
  elegido?: string | null;
  /** La persona en el mapa (punto azul); `vez` cambia con cada toque al botón de ubicación para volver a centrar. */
  ubicacion?: (Punto & { vez: number }) | null;
  /** Puntos que encuadrar; `vez` cambia con cada encuadre nuevo (búsqueda, encuadre inicial, "cercanos" o el lugar cuya ficha se
   *  abre). Uno solo: se acerca a él. */
  encuadre?: { puntos: Punto[]; vez: number } | null;
  /** Lo que una hoja tapa del mapa por abajo (px). Cada encuadre lo deja libre, para que el lugar o los lugares encuadrados no
   *  queden detrás de ella (la hoja de Lugares, que cambia de altura). */
  tapaAbajo?: number;
  ciudad?: Ciudad;
  /** Los lugares que la persona sigue (con sesión), en verde (`--ok`), encima de los demás. El resalte lo lleva el seguido, no el
   *  destacado (docs/rediseno/35, decisión del founder tras firmar, 2026-09-22; el color, corrección del founder, 2026-09-22,
   *  OL-128: "el mismo color de seguidos"). */
  seguidos?: string[];
  /** Los lugares destacados por el administrador (docs/rediseno/20). Van en naranja (`--destacado`) salvo que además sean
   *  seguidos, que gana (OL-146/doc rediseno/37). */
  destacados?: string[];
};

/** Los lugares van en capas del propio mapa (no en elementos encima). De abajo arriba: sombra del elegido, círculos, nombres, nombre del
 *  elegido y, encima de todo, el día de cada pin junto con su huella (ver `agregarCapas`). */
const FUENTE_LUGARES = "lugares";
const CAPA_SOMBRA = "lugares-sombra";
const CAPA_PUNTOS = "lugares-puntos";
const CAPA_NOMBRES = "lugares-nombres";
const CAPA_NOMBRE_ELEGIDO = "lugares-nombre-elegido";
const CAPA_PINES = "lugares-pines";
const HUELLA = "huella-pin";
/** Fuente de los nombres: existe en la cuenta de Mapbox (Noto Sans, la del estilo, da 404; ver OPEN_LOOPS). */
const FUENTE_NOMBRES = ["DIN Pro Bold", "Arial Unicode MS Bold"];
/** Dónde puede ir un nombre, en el orden en que Mapbox lo intenta: `top` es el texto debajo del pin (como siempre), luego encima, a la
 *  derecha y a la izquierda. */
const ANCLAS_NOMBRE: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom", "left", "right"];
/** Una sola lista vacía para el valor por defecto: una nueva en cada render volvería a pintar las capas. */
const SIN_SEGUIDOS: string[] = [];
const SIN_DESTACADOS: string[] = [];

const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lo que las capas leen de cada lugar (`propiedadesPin` más lo que dice el propio lugar). */
type PropiedadesLugar = PropiedadesPin & { id: string; nombre: string; dia: string; elegido: boolean };

/**
 * Tamaño, color, prioridad y opacidad ya calculados por lugar (`@/lib/pines`, OL-146 y P8): así las capas solo leen la propiedad
 * (`["get", "radio"]`, `["get", "colorPunto"]`…) y las reglas se prueban aparte, sin levantar Mapbox. El color del nombre repite el del
 * punto, salvo el destacado (naranja más oscuro, `--destacado-texto`, para que el texto siga con 4.5:1 sobre el fondo del mapa).
 */
function aGeoJSON(lugares: LugarLista[], seguidos: string[], destacados: string[], elegido: string | null, coloresPunto: ColoresPin, coloresTexto: ColoresPin): GeoJSON.FeatureCollection<GeoJSON.Point, PropiedadesLugar> {
  const ahora = new Date();
  const hayElegido = lugares.some((l) => l.id === elegido);
  return {
    type: "FeatureCollection",
    features: lugares.map((l) => {
      const dia = l.proximo ? diaPin(l.proximo.inicio, ahora, l.proximo.zona) : null;
      const estado = { dia, privado: !!l.privado, seguido: seguidos.includes(l.id), destacado: destacados.includes(l.id), elegido: l.id === elegido };
      return {
        type: "Feature",
        id: l.id,
        geometry: { type: "Point", coordinates: [l.lng, l.lat] },
        properties: { id: l.id, nombre: l.nombre, dia: dia ?? "", elegido: estado.elegido, ...propiedadesPin(estado, hayElegido, coloresPunto, coloresTexto) },
      };
    }),
  };
}

/** Los nombres, uno por lugar: en negrita, con halo, del color del pin y con la opacidad que le toque. Mapbox los acomoda alrededor del pin
 *  (`text-variable-anchor`, el que gana el sitio es el de mayor prioridad) y esconde el que no cabe, nunca el pin. El del elegido va en
 *  su propia capa, un punto más grande y con halo más ancho, y con `text-allow-overlap` no se esconde: Mapbox le busca primero un sitio
 *  sin pisar a nadie y, si no lo hay, lo pone en el primero. */
function capaNombres(id: string, filter: ExpressionSpecification, elegido: boolean, fondo: string): SymbolLayerSpecification {
  return {
    id,
    type: "symbol",
    source: FUENTE_LUGARES,
    filter,
    layout: {
      "text-field": ["get", "nombre"],
      "text-font": FUENTE_NOMBRES,
      "text-size": elegido ? TAMANO_NOMBRE_ELEGIDO : TAMANO_NOMBRE,
      "text-variable-anchor": ANCLAS_NOMBRE,
      "text-radial-offset": ["get", "distanciaNombre"],
      "text-justify": "auto",
      "text-max-width": 9,
      "text-line-height": 1.1,
      "text-letter-spacing": 0.01,
      "text-allow-overlap": elegido,
      "symbol-sort-key": ["-", ["get", "prioridad"]], // Mapbox coloca primero la llave menor: la prioridad mayor
    },
    // Negrita y halo ancho: se distinguen de las colonias y calles del estilo (gris, mayúsculas).
    paint: { "text-color": ["get", "colorTexto"], "text-halo-color": fondo, "text-halo-width": elegido ? 3 : 2, "text-opacity": ["get", "opacidad"] },
  };
}

/**
 * El TAMAÑO del círculo dice si hay evento esta semana (mediano con "Hoy" o el día en tres letras, chico sin él) y el COLOR dice qué es el
 * lugar (`@/lib/pines`). Sin aro, salvo en el elegido: crece, lleva un aro blanco ancho y una sombra suave debajo, y los demás bajan a
 * media opacidad. Un nombre nunca cae sobre un pin: los círculos no cuentan para las colisiones de Mapbox, así que la capa de arriba
 * (`CAPA_PINES`) reserva la huella de cada pin —una imagen vacía de 1×1 px estirada a su tamaño— y pinta el día en blanco y negrita al
 * centro del círculo, sin esconderse nunca. Por ir arriba, Mapbox la coloca antes que los nombres: cada nombre busca su sitio alrededor
 * del pin y, si no cabe, se esconde.
 */
function agregarCapas(mapa: MapaGL, datos: GeoJSON.FeatureCollection) {
  const fondo = colorDiseno("--fondo", "#ffffff");
  const esElegido: ExpressionSpecification = ["==", ["get", "elegido"], true];
  mapa.addSource(FUENTE_LUGARES, { type: "geojson", data: datos, promoteId: "id" });
  mapa.addImage(HUELLA, { width: 1, height: 1, data: new Uint8Array(4) });
  mapa.addLayer({
    id: CAPA_SOMBRA,
    type: "circle",
    source: FUENTE_LUGARES,
    filter: esElegido,
    paint: { "circle-radius": ["+", ["get", "huella"], 12], "circle-color": colorDiseno("--texto", "#1a1a1a"), "circle-opacity": 0.55, "circle-blur": 0.7, "circle-translate": [0, 5] },
  });
  mapa.addLayer({
    id: CAPA_PUNTOS,
    type: "circle",
    source: FUENTE_LUGARES,
    layout: { "circle-sort-key": ["get", "prioridad"] }, // el de mayor prioridad, encima
    paint: {
      "circle-radius": ["get", "radio"],
      "circle-color": ["get", "colorPunto"],
      "circle-opacity": ["get", "opacidad"],
      "circle-stroke-color": fondo,
      "circle-stroke-width": ["get", "borde"],
      "circle-stroke-opacity": ["get", "opacidad"],
    },
  });
  mapa.addLayer(capaNombres(CAPA_NOMBRES, ["!=", ["get", "elegido"], true], false, fondo));
  mapa.addLayer(capaNombres(CAPA_NOMBRE_ELEGIDO, esElegido, true, fondo));
  mapa.addLayer({
    id: CAPA_PINES,
    type: "symbol",
    source: FUENTE_LUGARES,
    layout: {
      "icon-image": HUELLA,
      "icon-size": ["*", 2, ["get", "huella"]],
      "icon-allow-overlap": true,
      "text-field": ["get", "dia"],
      "text-font": FUENTE_NOMBRES,
      "text-size": ["get", "tamanoDia"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": fondo, "text-opacity": ["get", "opacidad"] },
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
    { layers: [CAPA_PUNTOS, CAPA_NOMBRES, CAPA_NOMBRE_ELEGIDO] },
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
 * Mapa de los lugares, llenando la caja donde se pone (acuerdo del council: "un solo renderer de mapa" para Lugares).
 * Tema claro siempre: si el estilo se basa en Mapbox Standard se fuerza el preset de día. Plano, sin perspectiva.
 */
export default function Mapa({ lugares = [], onPin, elegido = null, ubicacion = null, encuadre = null, ciudad = CIUDAD_INICIAL, tapaAbajo = 0, seguidos = SIN_SEGUIDOS, destacados = SIN_DESTACADOS }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaGL | null>(null);
  const lugaresRef = useRef<Map<string, LugarLista>>(new Map());
  /** Lo que las capas leen de cada lugar, tal como se calculó la última vez (el pulso toma de aquí el tamaño y el color del elegido). */
  const pinesRef = useRef<Map<string, PropiedadesLugar>>(new Map());
  const yoRef = useRef<Marker | null>(null);
  const onPinRef = useRef(onPin);
  useEffect(() => {
    onPinRef.current = onPin;
  }, [onPin]);
  // Cada encuadre lee la última altura de la hoja sin repetirse cuando ella cambia (la cámara solo se mueve al encuadrar).
  const tapaRef = useRef(tapaAbajo);
  useEffect(() => {
    tapaRef.current = tapaAbajo;
  }, [tapaAbajo]);
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
      mapa = new mapboxgl.Map({
        container: nodo,
        style: mapboxStyle,
        center: [ciudad.centro.lng, ciudad.centro.lat],
        zoom: ciudad.zoom,
        language: "es",
        locale: TEXTOS_MAPBOX,
        attributionControl: false,
        logoPosition: "top-left", // abajo va la hoja de Lugares
      });
      mapaRef.current = mapa;
      mapa.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-left");
      mapa.on("style.load", () => {
        const importaStandard = mapa?.getStyle()?.imports?.some((i) => i.id === "basemap");
        if (importaStandard) mapa?.setConfigProperty("basemap", "lightPreset", "day");
      });
      mapa.on("load", () => setEstado("listo"));
      mapa.on("error", (e) => {
        console.error("Mapbox:", e.error);
        setEstado((actual) => (actual === "listo" ? actual : "error"));
      });
      // Tocar un lugar abre su ficha; tocar fuera no hace nada.
      mapa.on("click", (e) => {
        const id = mapa ? lugarTocado(mapa, e) : null;
        const lugar = id ? lugaresRef.current.get(id) : undefined;
        if (!lugar) return;
        if (onPinRef.current) onPinRef.current(lugar);
        else routerRef.current.push(hrefLugar(lugar));
      });
      // Con ratón, la mano sobre un lugar.
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

  // Lugares: las capas se crean una vez y luego solo cambian los datos, también cuando se abre o se cierra una ficha (`elegido`).
  // El encuadre inicial ya no lo decide el mapa (antes: ajustar a todos los lugares): lo decide quien llama
  // (docs/rediseno/35, "Cómo se decide el encuadre") con el primer valor de `encuadre`.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa) return;
    lugaresRef.current = new Map(lugares.map((l) => [l.id, l]));
    const suave = colorDiseno("--texto-suave", "#5c5c5c"); // los privados (solo los ve el admin) van en gris
    const tinta = colorDiseno("--texto", "#1a1a1a");
    const primario = colorDiseno("--primario", "#6d34c8");
    // El mismo verde de "Sigues" (`BotonIcono` decidido, docs/rediseno): un seguido es la elección de la persona,
    // no la del administrador, y merece su propio color, no el naranja de los destacados (OL-128).
    const seguidoColor = colorDiseno("--ok", "#1f6f43");
    const destacadoColor = colorDiseno("--destacado", "#d35400");
    const destacadoTexto = colorDiseno("--destacado-texto", "#a94400");
    const coloresPunto: ColoresPin = { tinta, primario, destacado: destacadoColor, seguido: seguidoColor, privado: suave };
    const coloresTexto: ColoresPin = { tinta, primario, destacado: destacadoTexto, seguido: seguidoColor, privado: suave };
    const datos = aGeoJSON(lugares, seguidos, destacados, elegido, coloresPunto, coloresTexto);
    pinesRef.current = new Map(datos.features.map((f) => [f.properties.id, f.properties]));
    const fuente = mapa.getSource(FUENTE_LUGARES) as GeoJSONSource | undefined;
    if (fuente) fuente.setData(datos);
    else agregarCapas(mapa, datos);
  }, [estado, lugares, seguidos, destacados, elegido]);

  // Los puntos a encuadrar: uno solo, el mapa se acerca (dejando libre lo que tapa la hoja); varios, se encuadran. Sirve
  // para lo que encontró la búsqueda, el encuadre inicial (lugares de la semana y destacados) y "cercanos" (la
  // persona y los cinco lugares más próximos): quien llama decide qué puntos manda (docs/rediseno/35).
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || !encuadre || encuadre.puntos.length === 0) return;
    const duration = sinMovimiento() ? 0 : 600;
    if (encuadre.puntos.length === 1) {
      const p = encuadre.puntos[0];
      mapa.flyTo({ center: [p.lng, p.lat], zoom: Math.max(mapa.getZoom(), 15), padding: { bottom: tapaRef.current }, duration });
      return;
    }
    let cancelado = false;
    const arriba = 56;
    const abajo = Math.max(72, tapaRef.current + 24);
    // A cada lado, la mitad del nombre más ancho (9 em de 15 px = 135 px) y un poco de aire: el nombre de un pin de los extremos no toca el borde.
    const lado = 72;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      const limites = new mapboxgl.LngLatBounds();
      encuadre.puntos.forEach((p) => limites.extend([p.lng, p.lat]));
      mapa.fitBounds(limites, { padding: { top: arriba, left: lado, right: lado, bottom: abajo }, maxZoom: 15, duration });
    });
    return () => {
      cancelado = true;
    };
  }, [estado, encuadre]);

  // Un pulso al elegir un lugar: un anillo que sale de su pin, se abre y se apaga en medio segundo (`.pulso`). Con movimiento reducido, nada.
  // Para retirarlo: borrar este bloque, `pinesRef` y `.pulso` del CSS.
  useEffect(() => {
    const mapa = mapaRef.current;
    const pin = elegido ? pinesRef.current.get(elegido) : undefined;
    const lugar = elegido ? lugaresRef.current.get(elegido) : undefined;
    if (estado !== "listo" || !mapa || !pin || !lugar || sinMovimiento()) return;
    let cancelado = false;
    let anillo: Marker | undefined;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado) return;
      const el = document.createElement("span");
      el.className = styles.pulso;
      el.style.setProperty("--pulso-lado", `${pin.huella * 2}px`);
      el.style.setProperty("--pulso-color", pin.colorPunto);
      el.addEventListener("animationend", () => anillo?.remove(), { once: true });
      anillo = new mapboxgl.Marker({ element: el }).setLngLat([lugar.lng, lugar.lat]).addTo(mapa);
    });
    return () => {
      cancelado = true;
      anillo?.remove();
    };
  }, [estado, elegido]);

  // La persona en el mapa: punto azul con halo. No centra por su cuenta: quien llama decide la cámara con `encuadre`
  // (junto a los lugares cercanos).
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
