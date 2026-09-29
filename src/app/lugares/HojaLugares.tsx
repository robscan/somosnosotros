"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { pedirRecogida } from "@/components/Armazon";
import { alturaSiguiente, destinoAlAsentar, estadoEn, type Detente, type Detentes } from "@/lib/hoja";
import styles from "./HojaLugares.module.css";

/** Desde este ancho la hoja es el panel de la izquierda, sin alturas ni asa (la misma consulta que `HojaLugares.module.css`). */
const PANEL = "(min-width: 792px)";
/** La lista asoma con dos renglones y medio: el tercero sale cortado a propósito, para que se entienda que hay más. */
const RENGLONES_QUE_ASOMAN = 2.5;
/** La ficha abre a foto y datos con esto de lo que sigue asomando debajo (px). */
const ASOMA_DE_LO_SIGUIENTE = 80;
/** Sin desplazamiento durante este tiempo (ms) el gesto se da por terminado y la hoja se asienta. */
const REPOSO_MS = 140;
/** Lo que queda de la hoja por encima del borde del cuerpo cuando se recorta el hueco (px): su sombra. */
const REBORDE = 24;

const enPanel = () => window.matchMedia(PANEL).matches;

/** Lo que la hoja mide de sí misma en el DOM, todo en posiciones de desplazamiento (`y`). */
type Medidas = {
  detentes: Detentes;
  /** Lo que se ve de la hoja recogida (px): la franja de la lista o la cabecera de la ficha. */
  franja: number;
  /** Desde qué `y` la cabecera de la ficha ya no deja ver su portada y se vuelve compacta. */
  compactaDesde: number;
};

/** Cómo está la hoja cuando se asienta: la altura, el desplazamiento y cuánto tapa del mapa por abajo (px). */
export type EstadoHoja = { detente: Detente; y: number; cubre: number };
export type DondeEstaba = { detente: Detente; y: number };

type Manejo = {
  /** Lleva la hoja a una de sus alturas (el «Atrás» de la ficha llena vuelve a la media). */
  irA: (detente: Detente) => void;
  /** Lo que hace el asa: la siguiente altura hacia arriba y, desde la más alta, la más baja. */
  siguiente: () => void;
};
const Contexto = createContext<Manejo | null>(null);

/** Para la ficha que vive dentro de la hoja: sus mandos hablan con la hoja que la contiene. */
export function useHoja(): Manejo {
  const manejo = useContext(Contexto);
  if (!manejo) throw new Error("useHoja solo se usa dentro de HojaLugares");
  return manejo;
}

type Props = {
  /** La cantidad, en la franja que queda a la vista con la hoja recogida. */
  resumen: ReactNode;
  /** La ficha abierta dentro de la hoja, o null. La lista sigue montada, y donde estaba, mientras hay una. */
  ficha: ReactNode | null;
  /** Dónde estaba la hoja al salir de la pantalla: se repone al volver. */
  desde?: DondeEstaba;
  /** La hoja se asentó en una altura: cuál es, cuánto se desplazó y cuánto del mapa tapa. */
  alAsentar: (estado: EstadoHoja) => void;
  /** La lista de lugares. */
  children: ReactNode;
};

/**
 * La hoja de Lugares (docs/rediseno/50, P5b; bloque «8. Lugares» del prototipo firmado): un solo elemento que cubre la pantalla y
 * desplaza, con un hueco transparente arriba (el mapa se ve y se toca a través de él) y el cuerpo blanco que asoma desde abajo.
 * Arrastrar el cuerpo lo sube; cuando su borde llega arriba (llena) el mismo gesto sigue desplazando el contenido, con una sola
 * inercia. Al soltar entre dos alturas se asienta en la más cercana: la lista, recogida (la franja con la cantidad) · asoma · llena;
 * la ficha, recogida (su cabecera) · media (foto y datos) · llena. Nada se cierra al jalar: la ficha solo con su ✕. Llena, la barra y
 * la navegación se van. Desde 792 es el panel de la izquierda, sin hueco ni asa, y desplaza como cualquier panel.
 *
 * La hoja recibe todos los toques —en el iPhone, un desplazador con `pointer-events: none` no desplaza aunque lo de dentro los
 * reciba— y, para que el mapa reciba los del hueco, en reposo se recorta (`clip-path`) lo que queda arriba del cuerpo: el recorte
 * también quita esa zona de la búsqueda de toques. Mientras la hoja se mueve no hay recorte: llegaría con retraso y le cortaría el
 * borde de arriba al cuerpo.
 *
 * La altura y la cabecera compacta de la ficha se pintan en el DOM (`data-hoja` en la hoja, `data-compacta` en la ficha) y no en el
 * estado de React: cambian con cada cuadro del desplazamiento y no deben volver a pintar la lista. Quien la usa solo se entera
 * cuando la hoja se asienta.
 */
export default function HojaLugares({ resumen, ficha, desde, alAsentar, children }: Props) {
  const hoja = useRef<HTMLDivElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const franja = useRef<HTMLDivElement>(null);
  const medidas = useRef<Medidas>({ detentes: {}, franja: 0, compactaDesde: Infinity });
  const reposo = useRef(0);
  const tocando = useRef(false);
  /** La barra y la navegación están recogidas (la hoja llena). */
  const recogida = useRef(false);
  /** Dónde estaba la lista cuando se abrió la ficha, para volver ahí al cerrarla. */
  const antes = useRef<DondeEstaba | null>(null);
  /** Un desplazamiento que se repone en cuanto el contenido alcanza a darlo (la ficha llega por la red). */
  const pendiente = useRef<number | null>(null);
  const habiaFicha = useRef(false);
  const alAsentarActual = useRef(alAsentar);
  useLayoutEffect(() => {
    alAsentarActual.current = alAsentar;
  });

  /** Las alturas, medidas en el DOM: el hueco de arriba (lo que la hoja sube hasta cubrir la pantalla) y lo que asoma de cada una. */
  const medir = useCallback((): Medidas => {
    const h = hoja.current!;
    const c = cuerpo.current!;
    const arribaDelCuerpo = c.getBoundingClientRect().top;
    const llena = Math.round(arribaDelCuerpo - h.getBoundingClientRect().top + h.scrollTop);
    const abajoDe = (el: Element) => el.getBoundingClientRect().bottom - arribaDelCuerpo;
    const abierta = c.querySelector<HTMLElement>("[data-ficha-hoja]");
    if (abierta) {
      const cabecera = abierta.querySelector("header")!;
      const alto = cabecera.offsetHeight;
      const primero = abierta.querySelector("[data-cuerpo] > :first-child") ?? cabecera;
      const media = Math.min(llena, abajoDe(primero) + ASOMA_DE_LO_SIGUIENTE - alto);
      return { detentes: { recogida: 0, media, llena }, franja: alto, compactaDesde: llena + abajoDe(abierta.querySelector("[data-portada]")!) - alto };
    }
    const lista = franja.current!.nextElementSibling;
    const fila = lista?.querySelector("li");
    const asoma = Math.min(llena, fila ? RENGLONES_QUE_ASOMAN * fila.offsetHeight : (lista?.getBoundingClientRect().height ?? 0));
    return { detentes: { recogida: 0, asoma, llena }, franja: franja.current!.offsetHeight, compactaDesde: Infinity };
  }, []);

  /** Pone en el DOM lo que dice el desplazamiento: la altura (para el CSS), la cabecera compacta de la ficha y la barra y la navegación. */
  const pintar = useCallback((y: number) => {
    const { detentes, compactaDesde } = medidas.current;
    const panel = enPanel();
    const detente = estadoEn(y, detentes);
    if (panel) delete hoja.current!.dataset.hoja;
    else hoja.current!.dataset.hoja = detente;
    cuerpo.current!.querySelector("[data-ficha-hoja]")?.toggleAttribute("data-compacta", y >= compactaDesde || (!panel && detente === "recogida"));
    const llena = !panel && detente === "llena";
    if (llena !== recogida.current) {
      recogida.current = llena;
      pedirRecogida(llena);
    }
  }, []);

  /** En reposo, el mapa recibe los toques del hueco (se recorta la hoja desde un poco arriba del cuerpo); en movimiento, no. */
  const recortar = useCallback((enReposo: boolean) => {
    const d = hoja.current!;
    const arriba = Math.round(cuerpo.current!.getBoundingClientRect().top - d.getBoundingClientRect().top - REBORDE);
    d.style.clipPath = enReposo && !enPanel() && arriba > 0 ? `inset(${arriba}px 0 0 0)` : "";
  }, []);

  const avisar = useCallback(() => {
    recortar(true);
    const y = hoja.current!.scrollTop;
    const { detentes, franja: alto } = medidas.current;
    alAsentarActual.current({ detente: estadoEn(y, detentes), y, cubre: enPanel() ? 0 : alto + Math.min(y, detentes.llena ?? y) });
  }, [recortar]);

  const irA = useCallback((y: number) => {
    hoja.current!.scrollTo({ top: y, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  /** El gesto terminó: entre dos alturas la hoja se va a la más cercana; en una (o llena) solo lo avisa. */
  const asentar = useCallback(() => {
    if (tocando.current) return;
    const destino = destinoAlAsentar(hoja.current!.scrollTop, medidas.current.detentes);
    if (destino === null) avisar();
    else irA(destino);
  }, [avisar, irA]);

  const esperarReposo = useCallback(() => {
    window.clearTimeout(reposo.current);
    reposo.current = window.setTimeout(asentar, REPOSO_MS);
  }, [asentar]);

  const manejo = useMemo<Manejo>(
    () => ({
      irA: (detente) => irA(medidas.current.detentes[detente] ?? 0),
      siguiente: () => irA(alturaSiguiente(hoja.current!.scrollTop, medidas.current.detentes)),
    }),
    [irA],
  );

  // Al montar: en el teléfono, asoma (o donde estaba, `desde`, más abajo).
  useLayoutEffect(() => {
    medidas.current = medir();
    const d = hoja.current!;
    if (!enPanel()) d.scrollTop = medidas.current.detentes.asoma ?? 0;
    pintar(d.scrollTop);
    avisar();
  }, [medir, pintar, avisar]);

  // Con la ficha abierta, la hoja sube a foto y datos; al cerrarla, la lista vuelve a donde estaba.
  const conFicha = !!ficha;
  useLayoutEffect(() => {
    if (conFicha === habiaFicha.current) return;
    habiaFicha.current = conFicha;
    const d = hoja.current!;
    medidas.current = medir();
    if (conFicha) {
      antes.current = { detente: (d.dataset.hoja as Detente | undefined) ?? "asoma", y: d.scrollTop };
      d.scrollTop = enPanel() ? 0 : (medidas.current.detentes.media ?? 0);
    } else {
      d.scrollTop = antes.current?.y ?? (enPanel() ? 0 : (medidas.current.detentes.asoma ?? 0));
      antes.current = null;
    }
    pintar(d.scrollTop);
    avisar();
  }, [conFicha, medir, pintar, avisar]);

  // Al volver a la pantalla: la altura y el desplazamiento de antes (memoria de pantalla).
  useLayoutEffect(() => {
    if (!desde) return;
    const d = hoja.current!;
    medidas.current = medir();
    const { detentes } = medidas.current;
    const objetivo = enPanel() || desde.y > (detentes.llena ?? 0) ? desde.y : (detentes[desde.detente] ?? detentes.asoma ?? 0);
    d.scrollTop = objetivo;
    // Con la ficha que aún llega por la red, el contenido no alcanza: se repone al llegar.
    pendiente.current = d.scrollTop < objetivo - 1 ? objetivo : null;
    pintar(d.scrollTop);
    avisar();
  }, [desde, medir, pintar, avisar]);

  // Si cambia el tamaño de la ventana o de lo que hay dentro (la ficha llega, se cargan más renglones), cada altura se vuelve a medir
  // y la hoja se queda en la suya; una hoja llena que se está desplazando no se toca.
  useEffect(() => {
    const d = hoja.current!;
    const c = cuerpo.current!;
    const observador = new ResizeObserver(() => {
      medidas.current = medir();
      const { detentes } = medidas.current;
      if (pendiente.current !== null && d.scrollHeight - d.clientHeight >= pendiente.current) {
        d.scrollTop = pendiente.current;
        pendiente.current = null;
      } else if (!enPanel() && d.scrollTop <= (detentes.llena ?? 0) + 1) {
        const altura = detentes[hoja.current!.dataset.hoja as Detente];
        if (altura !== undefined && Math.abs(altura - d.scrollTop) > 1) irA(altura);
      }
      pintar(d.scrollTop);
      esperarReposo();
    });
    observador.observe(d);
    observador.observe(c);
    return () => observador.disconnect();
  }, [medir, pintar, irA, esperarReposo]);

  useEffect(
    () => () => {
      window.clearTimeout(reposo.current);
      if (recogida.current) pedirRecogida(false);
    },
    [],
  );

  const alSoltar = () => {
    tocando.current = false;
    esperarReposo();
  };

  return (
    <Contexto.Provider value={manejo}>
      <div
        ref={hoja}
        className={styles.hoja}
        data-ficha={conFicha ? "" : undefined}
        role="region"
        aria-label="Lugares"
        onScroll={() => {
          recortar(false);
          pintar(hoja.current!.scrollTop);
          esperarReposo();
        }}
        onTouchStart={() => {
          tocando.current = true;
          pendiente.current = null;
          recortar(false);
        }}
        onTouchEnd={alSoltar}
        onTouchCancel={alSoltar}
        onWheel={() => {
          pendiente.current = null;
        }}
      >
        <div ref={cuerpo} className={styles.cuerpo}>
          <div ref={franja} className={styles.franja}>
            <h2 className={styles.resumen}>{resumen}</h2>
            <button type="button" className={styles.asa} aria-label="Subir o bajar la lista" onClick={manejo.siguiente} />
          </div>
          {children}
          {ficha}
        </div>
      </div>
    </Contexto.Provider>
  );
}
