"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification, GeoJSONSource, Map as MapaGL, Marker, SymbolLayerSpecification } from "mapbox-gl";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { diaPin } from "@/lib/fechas";
import { hrefLugar, type LugarLista } from "@/lib/lugares";
import { colorDiseno, RADIO_TOQUE, TEXTOS_MAPBOX, type EstadoMapa, type PuntoEnPantalla } from "@/lib/mapa";
import { sinMovimiento } from "@/lib/movimiento";
import { prioridadPin, propiedadesPin, rangosDeDias, RADIO_MEDIANO, TAMANO_DIA, TAMANO_NOMBRE, TAMANO_NOMBRE_ELEGIDO, type ColoresPin, type PropiedadesPin } from "@/lib/pines";
import styles from "./Mapa.module.css";
import PulsacionEnMapa from "./PulsacionEnMapa";
import { useFueraDeVista } from "./useFueraDeVista";

type Punto = { lat: number; lng: number };

type Props = {
  lugares?: LugarLista[];
  /** Al tocar un lugar. Sin esto, el lugar navega a su ficha. */
  onPin?: (lugar: LugarLista) => void;
  /** Id del lugar de la ficha abierta: el único con aro y sombra, con su nombre siempre a la vista (`@/lib/pines`). */
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
  /** Avisa cuando ninguno de los lugares que se ven en el mapa (con una ficha abierta, el suyo) cae en lo que se ve de él —su caja menos lo
   *  que tapa la hoja—, y cuando vuelve alguno: el botón de encuadrar aparece y se va con eso (`useFueraDeVista`). */
  onFuera?: (fuera: boolean) => void;
  /** Sostener el dedo saca una tarjeta que no cabe en lo que la hoja deja ver del mapa: que la hoja se recoja para darle sitio. */
  onDespejar?: () => void;
};

/** Los lugares van en capas del propio mapa (no en elementos encima). De abajo arriba, que es de menor a mayor rango (Mapbox coloca primero la
 *  capa de más arriba y esconde lo que choca con lo ya colocado): sombra del elegido, puntos, nombres, huellas de los puntos, discos con día,
 *  pin del elegido y su nombre (ver `agregarCapas`). */
const FUENTE_LUGARES = "lugares";
const CAPA_SOMBRA = "lugares-sombra";
const CAPA_PUNTOS = "lugares-puntos";
const CAPA_NOMBRES = "lugares-nombres";
const CAPA_HUELLAS = "lugares-huellas";
const CAPA_DISCOS = "lugares-discos";
const CAPA_PIN_ELEGIDO = "lugares-pin-elegido";
const CAPA_NOMBRE_ELEGIDO = "lugares-nombre-elegido";
const HUELLA = "huella-pin";
/** Los discos con día son imágenes, una por color y grosor de aro (`disco|#6d34c8|1.5`): se dibujan la primera vez que una capa las pide. */
const DISCO = "disco|";
/** Fuente de los nombres: existe en la cuenta de Mapbox (Noto Sans, la del estilo, da 404; ver OPEN_LOOPS). */
const FUENTE_NOMBRES = ["DIN Pro Bold", "Arial Unicode MS Bold"];
/** Dónde puede ir un nombre, en el orden en que Mapbox lo intenta: `top` es el texto debajo del pin (como siempre), luego encima, a la
 *  derecha y a la izquierda. */
const ANCLAS_NOMBRE: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom", "left", "right"];
/** Una sola lista vacía para el valor por defecto: una nueva en cada render volvería a pintar las capas. */
const SIN_SEGUIDOS: string[] = [];
const SIN_DESTACADOS: string[] = [];
const NADA = () => {};

/** Lo que las capas leen de cada lugar (`propiedadesPin` más lo que dice el propio lugar). */
type PropiedadesLugar = PropiedadesPin & { id: string; nombre: string; dia: string; elegido: boolean; rango: number };

/**
 * Tamaño, color y prioridad ya calculados por lugar (`@/lib/pines`, OL-146 y P8): así las capas solo leen la propiedad
 * (`["get", "radio"]`, `["get", "colorPunto"]`…) y las reglas se prueban aparte, sin levantar Mapbox. El color del nombre repite el del
 * punto, salvo el destacado (naranja más oscuro, `--destacado-texto`, para que el texto siga con 4.5:1 sobre el fondo del mapa). `rango` es
 * el orden en que los discos con día eligen sitio (`rangosDeDias`): nada depende del zoom ni de lo que se vea, lo decide Mapbox.
 */
function aGeoJSON(lugares: LugarLista[], seguidos: string[], destacados: string[], elegido: string | null, coloresPunto: ColoresPin, coloresTexto: ColoresPin): GeoJSON.FeatureCollection<GeoJSON.Point, PropiedadesLugar> {
  const ahora = new Date();
  const estados = lugares.map((l) => ({ dia: l.proximo ? diaPin(l.proximo.inicio, ahora, l.proximo.zona) : null, privado: !!l.privado, seguido: seguidos.includes(l.id), destacado: destacados.includes(l.id), elegido: l.id === elegido }));
  const rangos = rangosDeDias(lugares.flatMap((l, i) => (estados[i].dia && l.proximo ? [{ id: l.id, prioridad: prioridadPin(estados[i]), inicio: Date.parse(l.proximo.inicio) }] : [])));
  return {
    type: "FeatureCollection",
    features: lugares.map((l, i) => ({
      type: "Feature",
      id: l.id,
      geometry: { type: "Point", coordinates: [l.lng, l.lat] },
      properties: { id: l.id, nombre: l.nombre, dia: estados[i].dia ?? "", elegido: estados[i].elegido, rango: rangos.get(l.id) ?? 0, ...propiedadesPin(estados[i], coloresPunto, coloresTexto) },
    })),
  };
}

/** Un disco con día como imagen, tal como lo pintaba el círculo: del color del pin, con su aro blanco por fuera (`disco|color|aro`). Se dibuja a la
 *  densidad de la pantalla para que quede nítido. */
function dibujarDisco(id: string, fondo: string): { imagen: ImageData; escala: number } {
  const [color, aro] = id.slice(DISCO.length).split("|");
  const radio = RADIO_MEDIANO + Number(aro);
  const escala = Math.min(4, Math.max(2, Math.ceil(window.devicePixelRatio)));
  const lado = Math.ceil(radio * 2) * escala;
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = lado;
  const c = lienzo.getContext("2d")!;
  for (const [relleno, r] of [[fondo, radio], [color, RADIO_MEDIANO]] as const) {
    c.fillStyle = relleno;
    c.beginPath();
    c.arc(lado / 2, lado / 2, r * escala, 0, 2 * Math.PI);
    c.fill();
  }
  return { imagen: c.getImageData(0, 0, lado, lado), escala };
}

/** Los nombres, uno por lugar: en negrita, con halo y del color del pin. Mapbox los acomoda alrededor del pin
 *  (`text-variable-anchor`, el que gana el sitio es el de mayor prioridad) y esconde el que no cabe, nunca el pin. El del elegido va en
 *  su propia capa, un punto más grande y con halo más ancho, y arriba de todas: Mapbox lo coloca primero, sin esconderlo (`text-allow-overlap`),
 *  y todo lo demás cede ante él. */
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
    paint: { "text-color": ["get", "colorTexto"], "text-halo-color": fondo, "text-halo-width": elegido ? 3 : 2 },
  };
}

/**
 * Nada se pinta sobre un letrero, a ningún zoom: lo decide el motor de colisiones de Mapbox, que coloca primero la capa de más arriba y
 * esconde lo que choca con lo ya colocado. Cada lugar es un punto chico de su color (`CAPA_PUNTOS`, que no cede: el lugar nunca desaparece); solo el
 * elegido lleva ahí su disco grande con aro y una sombra suave debajo. Los que tienen evento esta semana llevan encima un disco con su día
 * (`CAPA_DISCOS`: un símbolo con la imagen del disco y el día centrado, que salen los dos o ninguno), que se esconde, y deja ver su punto, si
 * choca con algo de más rango: por su llave de orden (`rango`), el pin del elegido o su nombre. Los círculos no cuentan para las colisiones,
 * así que las huellas de los puntos (`CAPA_HUELLAS`: una imagen vacía de 1×1 px estirada al tamaño del punto) reservan su sitio para que
 * ningún nombre pise un punto. De abajo arriba: sombra del elegido · puntos · nombres · huellas · discos con día · pin del elegido (su huella
 * grande y su día, siempre) · nombre del elegido (siempre: se coloca primero, y debajo de su pin).
 */
function agregarCapas(mapa: MapaGL, datos: GeoJSON.FeatureCollection) {
  const fondo = colorDiseno("--fondo", "#ffffff");
  const esElegido: ExpressionSpecification = ["==", ["get", "elegido"], true];
  const noElegido: ExpressionSpecification = ["!=", ["get", "elegido"], true];
  mapa.on("styleimagemissing", ({ id }) => {
    if (!id.startsWith(DISCO) || mapa.hasImage(id)) return;
    const { imagen, escala } = dibujarDisco(id, fondo);
    mapa.addImage(id, imagen, { pixelRatio: escala });
  });
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
      "circle-stroke-color": fondo,
      "circle-stroke-width": ["get", "borde"],
    },
  });
  mapa.addLayer(capaNombres(CAPA_NOMBRES, noElegido, false, fondo));
  mapa.addLayer({
    id: CAPA_HUELLAS,
    type: "symbol",
    source: FUENTE_LUGARES,
    filter: noElegido,
    layout: { "icon-image": HUELLA, "icon-size": ["*", 2, ["get", "huella"]], "icon-allow-overlap": true },
  });
  mapa.addLayer({
    id: CAPA_DISCOS,
    type: "symbol",
    source: FUENTE_LUGARES,
    filter: ["all", noElegido, ["!=", ["get", "dia"], ""]],
    layout: {
      "icon-image": ["concat", DISCO, ["get", "colorPunto"], "|", ["to-string", ["get", "borde"]]],
      "text-field": ["get", "dia"],
      "text-font": FUENTE_NOMBRES,
      "text-size": TAMANO_DIA,
      "symbol-sort-key": ["get", "rango"], // Mapbox coloca primero la llave menor: el de más rango
    },
    paint: { "text-color": fondo },
  });
  mapa.addLayer({
    id: CAPA_PIN_ELEGIDO,
    type: "symbol",
    source: FUENTE_LUGARES,
    filter: esElegido,
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
    paint: { "text-color": fondo },
  });
  mapa.addLayer(capaNombres(CAPA_NOMBRE_ELEGIDO, esElegido, true, fondo));
}

/** El lugar bajo el dedo o el ratón: se busca en un cuadro alrededor del punto (punto, disco con día o nombre) y gana el más cercano. */
function lugarTocado(mapa: MapaGL, { x, y }: PuntoEnPantalla): string | null {
  if (!mapa.getLayer(CAPA_PUNTOS)) return null;
  const cerca = mapa.queryRenderedFeatures(
    [
      [x - RADIO_TOQUE, y - RADIO_TOQUE],
      [x + RADIO_TOQUE, y + RADIO_TOQUE],
    ],
    { layers: [CAPA_PUNTOS, CAPA_DISCOS, CAPA_NOMBRES, CAPA_NOMBRE_ELEGIDO] },
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
export default function Mapa({ lugares = [], onPin, elegido = null, ubicacion = null, encuadre = null, ciudad = CIUDAD_INICIAL, tapaAbajo = 0, seguidos = SIN_SEGUIDOS, destacados = SIN_DESTACADOS, onFuera, onDespejar = NADA }: Props) {
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
  /** Abrir un lugar, por un toque o por una pulsación larga sobre él: a su ficha (la hoja, en Lugares). */
  function abrirLugar(lugar: LugarLista) {
    if (onPinRef.current) onPinRef.current(lugar);
    else routerRef.current.push(hrefLugar(lugar));
  }
  /** Si hay un lugar registrado bajo ese punto, lo abre y lo dice. */
  function abrirLugarEn(punto: PuntoEnPantalla): boolean {
    const id = mapaRef.current ? lugarTocado(mapaRef.current, punto) : null;
    const lugar = id ? lugaresRef.current.get(id) : undefined;
    if (lugar) abrirLugar(lugar);
    return !!lugar;
  }
  const [estado, setEstado] = useState<EstadoMapa>(() => (configPublica().mapboxToken ? "cargando" : "sin-token"));
  // Lo que cuenta para «¿se ve alguno?»: con una ficha abierta, su lugar; si no, todos los que hay en el mapa.
  const aVer = useMemo(() => (elegido ? lugares.filter((l) => l.id === elegido) : lugares), [lugares, elegido]);
  useFueraDeVista(mapaRef, estado === "listo", aVer, tapaAbajo, onFuera);

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
        if (mapa) abrirLugarEn(e.point);
      });
      // Con ratón, la mano sobre un lugar.
      mapa.on("mousemove", (e) => {
        if (mapa) mapa.getCanvas().style.cursor = lugarTocado(mapa, e.point) ? "pointer" : "";
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
      <PulsacionEnMapa mapa={mapaRef} contenedor={contenedor} listo={estado === "listo"} elegido={elegido} tapaAbajo={tapaAbajo} alDespejar={onDespejar} alLugar={abrirLugarEn} />
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
