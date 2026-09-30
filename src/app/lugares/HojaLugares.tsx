"use client";

import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type ReactNode, type Ref } from "react";
import { avisarHoja } from "@/components/Armazon";
import { CARRIL } from "@/lib/armazon";
import { alturaAsoma, alturaLlena, alturaSiguiente, cabeceraCompacta, destinoAlAsentar, detenteAlFiltrar, estadoEn, tiempoEnMs, type Detente, type Detentes } from "@/lib/hoja";
import styles from "./HojaLugares.module.css";

/** La lista asoma con dos renglones y medio: el tercero sale cortado a propósito, para que se entienda que hay más. */
const RENGLONES_QUE_ASOMAN = 2.5;
/** Sin desplazamiento durante este tiempo (ms) el gesto se da por terminado y la hoja se asienta. */
const REPOSO_MS = 140;
/** Lo que queda de la hoja por encima del borde del cuerpo cuando se recorta el hueco (px): su sombra. */
const REBORDE = 24;

/** Desde el carril la hoja es el panel de la izquierda, sin alturas ni asa. */
const enPanel = () => window.matchMedia(CARRIL).matches;
/** Quien pidió menos movimiento en su teléfono no ve la hoja entrar ni salir. */
const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lo que se ve del cuerpo de la hoja, del borde de abajo de la pantalla hasta su borde de arriba (px): lo que recorre al entrar o salir. Es
 *  una resta entre la hoja y su cuerpo, que se mueven juntos, así que da lo mismo aunque un movimiento esté a medias. */
const visible = (hoja: HTMLElement, cuerpo: HTMLElement) => hoja.getBoundingClientRect().bottom - cuerpo.getBoundingClientRect().top;

/** Cómo se mueve la hoja, según `globals.css` (`--duracion-<nombre>` y `--curva-<nombre>`): el resorte de la entrada y su recorte, la salida. */
function movimiento(nombre: "resorte" | "salida"): KeyframeAnimationOptions {
  const css = getComputedStyle(document.documentElement);
  return { duration: tiempoEnMs(css.getPropertyValue(`--duracion-${nombre}`)), easing: css.getPropertyValue(`--curva-${nombre}`) };
}

/** Lo que la hoja mide de sí misma en el DOM, todo en posiciones de desplazamiento (`y`). */
type Medidas = {
  detentes: Detentes;
  /** Lo que se ve de la hoja recogida (px): la franja de la lista o la cabecera de la ficha. */
  franja: number;
  /** Desde qué `y` la cabecera de la ficha ya no deja ver su portada y se vuelve compacta. */
  compactaDesde: number;
};

/** Cómo está la hoja cuando se asienta: la altura, el desplazamiento y cuánto tapa del mapa por abajo (px; llena, lo que taparía a media altura). */
export type EstadoHoja = { detente: Detente; y: number; cubre: number };
export type DondeEstaba = { detente: Detente; y: number };

export type Manejo = {
  /** Lleva la hoja a una de sus alturas (el «Atrás» de la ficha llena vuelve a la media). */
  irA: (detente: Detente) => void;
  /** Lo que hace el asa: la siguiente altura hacia arriba y, desde la más alta, la más baja. */
  siguiente: () => void;
  /** Cambió lo que se ve (un filtro, un chip, otra ciudad): la lista recogida sube a asoma para enseñar el resultado, y avisa cómo quedó. */
  mostrarLista: () => void;
  /** Se cierra la ficha: la hoja baja hasta salir por el borde de abajo y solo entonces se llama a `alTerminar` (que la cierra de verdad). Sin
   *  movimiento (el panel, o quien lo pidió reducido), se llama al momento. */
  salir: (alTerminar: () => void) => void;
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
  /** Cambia con cada ficha que entra por un gesto de la persona (un pin, un renglón): la hoja sube desde el borde de abajo hasta su altura.
   *  Sin cambiar (al reponer la pantalla, o al llegar con la ficha ya abierta) la ficha aparece ya en su sitio. */
  entrada?: number;
  /** Dónde estaba la hoja al salir de la pantalla: se repone al volver. */
  desde?: DondeEstaba;
  /** La hoja se asentó en una altura: cuál es, cuánto se desplazó y cuánto del mapa tapa. */
  alAsentar: (estado: EstadoHoja) => void;
  /** La lista se desplazó más de una pantalla desde que la hoja llenó (o dejó de estarlo; nunca con la ficha a la vista): la pantalla ofrece volver
   *  arriba, como cualquier lista. Solo avisa cuando cambia. */
  alLejos?: (lejos: boolean) => void;
  /** Lo que se le puede pedir a la hoja desde fuera (`mostrarLista`, al filtrar). */
  ref?: Ref<Manejo>;
  /** La lista de lugares. */
  children: ReactNode;
};

/**
 * La hoja de Lugares (docs/rediseno/50, P5b; bloque «8. Lugares» del prototipo firmado): un solo elemento que cubre la pantalla y
 * desplaza, con un hueco transparente arriba (el mapa se ve y se toca a través de él) y el cuerpo blanco que asoma desde abajo.
 * Arrastrar el cuerpo lo sube; cuando su borde llega arriba (llena) el mismo gesto sigue desplazando el contenido, con una sola
 * inercia. Al soltar entre dos alturas se asienta en la más cercana: la lista, recogida (la franja con la cantidad) · asoma · llena;
 * la ficha, recogida (su cabecera) · media (foto y datos) · llena. Nada se cierra al jalar: la ficha solo con su ✕. Cada una llena
 * hasta donde le toca: la lista vive bajo sus filtros y llena se detiene justo debajo de la fila de contexto, que se queda siempre a la
 * vista (la barra de la app se recoge y vuelve con su desplazamiento, como en cualquier raíz); la ficha es una página y llena cubre la
 * pantalla. En las dos, llena, la navegación se va. Desde 792 es el panel de la izquierda, sin hueco ni asa, y desplaza como cualquier
 * panel.
 *
 * La hoja recibe todos los toques —en el iPhone, un desplazador con `pointer-events: none` no desplaza aunque lo de dentro los
 * reciba— y, para que el mapa reciba los del hueco, en reposo se recorta (`clip-path`) lo que queda arriba del cuerpo: el recorte
 * también quita esa zona de la búsqueda de toques. Mientras la hoja se mueve no hay recorte: llegaría con retraso y le cortaría el
 * borde de arriba al cuerpo.
 *
 * Con una ficha, la hoja entra y sale con movimiento (docs/rediseno/50, ajuste del founder del 2026-09-30): entra desde el borde de
 * abajo con el resorte «Gentle» de Figma y, al cerrarla, sale hacia él y solo entonces se cierra la ficha; la lista entra igual al
 * volver. Es solo `transform` sobre la hoja entera (nunca alturas ni desplazamiento animados), una animación a la vez: la que empieza
 * cancela la anterior, y si la persona toca la hoja mientras entra, termina de golpe (el gesto gana). Las medidas descuentan lo que la
 * hoja lleve movido (`medir`), así que un movimiento a medias no las falsea.
 *
 * La altura y la cabecera compacta de la ficha se pintan en el DOM (`data-hoja` en la hoja, `data-compacta` en la ficha) y no en el
 * estado de React: cambian con cada cuadro del desplazamiento y no deben volver a pintar la lista. Quien la usa solo se entera
 * cuando la hoja se asienta y cuando la lista pasa de una pantalla desplazada (`alLejos`, el botón de volver arriba).
 */
export default function HojaLugares({ resumen, ficha, entrada, desde, alAsentar, alLejos, ref, children }: Props) {
  const hoja = useRef<HTMLDivElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const franja = useRef<HTMLDivElement>(null);
  const medidas = useRef<Medidas>({ detentes: {}, franja: 0, compactaDesde: Infinity });
  const reposo = useRef(0);
  const tocando = useRef(false);
  /** La entrada o la salida en curso (o la última). */
  const enCurso = useRef<Animation | null>(null);
  /** La ficha se está yendo con su salida: al cerrarse, la lista entra igual desde abajo. */
  const saliendo = useRef(false);
  /** Ya le dijimos al armazón que la hoja llena la ventana: al dejar de llenarla hay que decírselo una vez más. */
  const llenaAvisada = useRef(false);
  /** Dónde estaba la lista cuando se abrió la ficha, para volver ahí al cerrarla. */
  const antes = useRef<DondeEstaba | null>(null);
  /** Un desplazamiento que se repone en cuanto el contenido alcanza a darlo (la ficha llega por la red). */
  const pendiente = useRef<number | null>(null);
  const habiaFicha = useRef(false);
  /** Lo último que se le dijo a la pantalla sobre si la lista está lejos del principio. */
  const lejosAvisada = useRef(false);
  const alAsentarActual = useRef(alAsentar);
  const alLejosActual = useRef(alLejos);
  useLayoutEffect(() => {
    alAsentarActual.current = alAsentar;
    alLejosActual.current = alLejos;
  });

  /** Las alturas, medidas en el DOM: el hueco de arriba (lo que la hoja sube hasta cubrir la pantalla) y lo que asoma de cada una. */
  const medir = useCallback((): Medidas => {
    const h = hoja.current!;
    const c = cuerpo.current!;
    const abierta = c.querySelector<HTMLElement>("[data-ficha-hoja]");
    // La lista llena sube hasta debajo de la fila de contexto: donde empieza `data-techo-hoja`, el mapa, la caja que la pantalla pone bajo la fila.
    const techo = h.parentElement!.querySelector(":scope > [data-techo-hoja]")!;
    const arribaDelCuerpo = c.getBoundingClientRect().top;
    // Una entrada o una salida a medias tiene movida la hoja entera: su borde y el del cuerpo se miden ya movidos y el techo, que no se mueve, no.
    // Lo demás son restas entre cosas de la hoja, que se mueven juntas.
    const movida = new DOMMatrixReadOnly(getComputedStyle(h).transform).m42;
    const llena = alturaLlena({ arribaDelCuerpo: arribaDelCuerpo - movida, y: h.scrollTop, arribaDeLaHoja: h.getBoundingClientRect().top - movida, bajoLaFila: techo.getBoundingClientRect().top, conFicha: !!abierta });
    const abajoDe = (el: Element) => el.getBoundingClientRect().bottom - arribaDelCuerpo;
    const arribaDe = (el: Element) => el.getBoundingClientRect().top - arribaDelCuerpo;
    if (abierta) {
      const cabecera = abierta.querySelector("header")!;
      const alto = cabecera.offsetHeight;
      // La media termina donde empieza lo que sigue a los tres números: la portada y los datos con su aire, sin asomar lo demás.
      const primero = abierta.querySelector("[data-cuerpo] > :first-child") ?? cabecera;
      const siguiente = abierta.querySelector("[data-cuerpo] > :nth-child(2)");
      const media = Math.min(llena, (siguiente ? arribaDe(siguiente) : abajoDe(primero)) - alto);
      return { detentes: { recogida: 0, media, llena }, franja: alto, compactaDesde: llena + abajoDe(abierta.querySelector("[data-portada]")!) - alto };
    }
    const lista = franja.current!.nextElementSibling;
    const fila = lista?.querySelector("li");
    // Lo que el mapa deja libre arriba: los mandos que flotan sobre él (`data-libre`) con el mismo aire arriba y abajo.
    const mando = techo.querySelector("[data-libre]")?.getBoundingClientRect();
    const libre = mando ? 2 * (mando.top - techo.getBoundingClientRect().top) + mando.height : 0;
    const asoma = alturaAsoma(fila ? RENGLONES_QUE_ASOMAN * fila.offsetHeight : (lista?.getBoundingClientRect().height ?? 0), llena, libre);
    return { detentes: { recogida: 0, asoma, llena }, franja: franja.current!.offsetHeight, compactaDesde: Infinity };
  }, []);

  /** Pone en el DOM lo que dice el desplazamiento: la altura (para el CSS) y la cabecera compacta de la ficha; y le cuenta al armazón si la hoja llena. */
  const pintar = useCallback((y: number) => {
    const { detentes, compactaDesde } = medidas.current;
    const panel = enPanel();
    const detente = estadoEn(y, detentes);
    if (panel) delete hoja.current!.dataset.hoja;
    else hoja.current!.dataset.hoja = detente;
    cuerpo.current!.querySelector("[data-ficha-hoja]")?.toggleAttribute("data-compacta", cabeceraCompacta(y, compactaDesde, detente, panel));
    // Más de una pantalla de lista desplazada, sin ficha: desde ahí la pantalla ofrece volver arriba (como una lista de la ventana).
    const lejos = !habiaFicha.current && y - (detentes.llena ?? 0) > window.innerHeight;
    if (lejos !== lejosAvisada.current) {
      lejosAvisada.current = lejos;
      alLejosActual.current?.(lejos);
    }
    // Llena, la navegación se va; con la ficha (una página) se va también la barra, y con la lista, que vive bajo sus filtros, el
    // desplazamiento de la hoja recoge o devuelve la barra, como el de la página en una raíz.
    const llena = !panel && detente === "llena";
    if (llena || llenaAvisada.current) {
      llenaAvisada.current = llena;
      const h = hoja.current!;
      avisarHoja(llena ? { llena, pagina: habiaFicha.current, y: y - (detentes.llena ?? 0), alFinal: y + h.clientHeight >= h.scrollHeight - 4 } : { llena });
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
    // Llena tapa todo el mapa y no se ve: la cámara se encuadra con lo que taparía a media altura (asoma o media), que es con lo que se vuelve
    // a ver. Con la fila siempre a la vista se puede filtrar con la lista llena, y el mapa queda listo para cuando la hoja baje.
    const alturaConMapa = detentes.asoma ?? detentes.media ?? y;
    alAsentarActual.current({ detente: estadoEn(y, detentes), y, cubre: enPanel() ? 0 : alto + Math.min(y, alturaConMapa) });
  }, [recortar]);

  const irA = useCallback((y: number) => {
    hoja.current!.scrollTo({ top: y, behavior: sinMovimiento() ? "auto" : "smooth" });
  }, []);

  /** La hoja sube desde el borde de abajo hasta donde está (el resorte de `globals.css`). Cancela lo que hubiera en curso: una salida a medias
   *  la reemplaza la ficha que entra. */
  const entrar = useCallback(() => {
    const d = hoja.current!;
    enCurso.current?.cancel();
    saliendo.current = false;
    delete d.dataset.sale;
    if (enPanel() || sinMovimiento()) return;
    enCurso.current = d.animate({ transform: [`translateY(${visible(d, cuerpo.current!)}px)`, "translateY(0)"] }, movimiento("resorte"));
  }, []);

  /** La hoja baja hasta salir por el borde de abajo y, ya fuera, llama a `alTerminar`. Mientras baja no recibe toques (los recibe el mapa). */
  const salir = useCallback((alTerminar: () => void) => {
    if (enPanel() || sinMovimiento()) return alTerminar();
    const d = hoja.current!;
    enCurso.current?.cancel();
    saliendo.current = true;
    d.dataset.sale = "";
    enCurso.current = d.animate({ transform: ["translateY(0)", `translateY(${visible(d, cuerpo.current!)}px)`] }, { ...movimiento("salida"), fill: "forwards" });
    enCurso.current.onfinish = alTerminar;
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
      mostrarLista: () => {
        const d = hoja.current!;
        const { detentes } = medidas.current;
        const actual = estadoEn(d.scrollTop, detentes);
        const destino = detenteAlFiltrar(actual);
        // Sin alturas (el panel) o con la ficha a la vista, la lista no sube. Sube de un salto, como la ficha al abrirse: llega a la vez que
        // la lista nueva y sin depender de un desplazamiento animado que un cambio de tamaño o una pausa del navegador podrían torcer.
        if (destino !== actual && !enPanel() && !habiaFicha.current) {
          d.scrollTop = detentes[destino] ?? d.scrollTop;
          pintar(d.scrollTop);
        }
        avisar();
      },
      salir,
    }),
    [irA, pintar, avisar, salir],
  );
  useImperativeHandle(ref, () => manejo, [manejo]);

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
      // La ficha se fue con su salida: la lista entra igual desde abajo, para que no aparezca de golpe.
      if (saliendo.current) entrar();
    }
    pintar(d.scrollTop);
    avisar();
  }, [conFicha, medir, pintar, avisar, entrar]);

  // Una ficha entra por un gesto de la persona: la hoja sube desde el borde de abajo. Va después del efecto de arriba, que ya la puso en su altura.
  const entradaVista = useRef(entrada);
  useLayoutEffect(() => {
    if (entrada === entradaVista.current) return;
    entradaVista.current = entrada;
    entrar();
  }, [entrada, entrar]);

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
      // Al salir de la pantalla el aviso puede llegar con la hoja ya quitada, antes de que esto se desconecte: nada que medir.
      if (!d.isConnected) return;
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
      if (llenaAvisada.current) avisarHoja({ llena: false });
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
          enCurso.current?.finish(); // el gesto gana: una entrada a medias termina de golpe y el dedo sigue desde su altura
          tocando.current = true;
          pendiente.current = null;
          recortar(false);
        }}
        onTouchEnd={alSoltar}
        onTouchCancel={alSoltar}
        onWheel={() => {
          enCurso.current?.finish();
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
