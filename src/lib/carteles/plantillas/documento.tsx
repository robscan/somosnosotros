import type { CSSProperties, ReactElement } from "react";
import { CAJA_SN, TRAZO_SN } from "../../simboloSN";
import { FORMATOS_DOCUMENTO, type BloqueDocumento, type CifraDocumento, type Documento, type FilaDocumento, type FormatoDocumento, type NombreDocumento } from "../../documentos";
import { ajustar, ajustarRenglon, anchoTexto, partirRenglones, type Fuente } from "../medir";

/**
 * Las páginas de la «Presentación» del artista y del «Informe de actividad» del lugar (OL-396), con el motor del cartel (satori y sharp,
 * `dibujar.ts`): el CSS `.pagina-doc` del prototipo firmado (`curriculo-propuestas.html`, OL-395) en «E sobrio»: blanco, tinta, gris y el violeta
 * solo en los rótulos. El prototipo dibuja la hoja a 96 ppp (carta 816 × 1056); aquí va a 150 ppp (carta 1275 × 1650, A4 1240 × 1754), así que
 * cada medida es la del prototipo × 1,5625 (`K`), redondeada: el cuerpo de 13 px pasa a 20, el nombre de 34 a 53, la foto de 84 a 131.
 *
 * Todo se mide antes de dibujarse (`medir.ts`) y cada texto llega partido en renglones: el alto de cada pieza es exacto y con él se reparten las
 * páginas (`paginas()` del prototipo, que estimaba el alto; aquí se mide). La primera página lleva la cabecera completa (la foto redonda, el
 * rótulo, el nombre, la meta, el símbolo SN y la dirección de la ficha); las demás, la corta («Presentación de Leo Traeger · página 2 de 3»);
 * todas, el pie («Elaborado el **12 oct 2026** con Somos Nosotrxs a partir de lo publicado en la app … Puede estar incompleto.» y «1 / 2»).
 * Un rótulo, un año o la cabecera de dos columnas nunca se quedan solos al pie de una página: bajan con lo que sigue.
 *
 * Una sola letra, la condensada negra que ya hay (wdth 75, wght 800): el prototipo usaba la variable a «wdth 88» en peso regular para el cuerpo y
 * 600-800 para lo marcado; solo existe como archivo la negra condensada (como en «Tu año», OL-394), así que lo que allí iba en peso medio va en la
 * misma y lo suave se distingue por el gris.
 */

/** De px del prototipo (96 ppp) a px de la página (150 ppp). */
export const K = 150 / 96;
const p = (n: number) => Math.round(n * K);

const NEGRA: Fuente = "condensada-negra";

/** Los colores de «E sobrio»: el blanco del papel, la tinta y el gris de la app, el violeta primario en los rótulos y la raya de las filas. */
export const COLORES_DOCUMENTO = { fondo: "#ffffff", tinta: "#1a1a1a", suave: "#5c5c5c", acento: "#6d34c8", raya: "#e3e0d4", crema: "#f4efd6", canceladoFondo: "#fbe7e4", canceladoTinta: "#a3321d" } as const;
const C = COLORES_DOCUMENTO;

const M = { arriba: p(56), lado: p(64), abajo: p(44) };
/** Entre bloques del cuerpo (`.cuerpo-doc { gap: 18px }`). */
const GAP = p(18);
const CUERPO_ARRIBA = p(20);
const LETRA = { cuerpo: p(13), interlineado: 1.35 };
const CABECERA = { foto: p(84), entre: p(20), rotulo: p(11), nombre: p(34), nombreMenor: p(26), meta: p(14), marca: p(11), simbolo: p(52), marcaMax: p(200), abajo: p(18), raya: 3 };
const CORTA = { titulo: p(15), pagina: p(14), abajo: p(10), raya: 2 };
const H2 = { tamano: p(12), espaciado: p(12) * 0.1, abajo: p(6) };
const RESENA = { tamano: p(14), interlineado: 1.45, redes: p(12), entreRedes: p(18), arribaRedes: p(6) };
const ANIO = { tamano: p(14), arriba: p(10), abajo: p(4) };
const FILA = { fecha: p(96), entre: p(14), relleno: p(7), titulo: p(14), detalle: p(12), arribaDetalle: p(2), raya: 2, etiqueta: p(9), etiquetaRelleno: p(5) };
const LISTA = { tamano: p(13), relleno: p(4), entreColumnas: p(32), raya: 2 };
const CIFRAS = { entre: p(12), rellenoV: p(12), rellenoH: p(14), raya: 2, radio: p(10), n: p(40), titulo: p(11), arribaTitulo: p(6), def: p(10.5), arribaDef: p(4) };
const NOTA = { tamano: p(11), interlineado: 1.4 };
const PIE = { tamano: p(10.5), interlineado: 1.4, arriba: p(12), raya: 2, entre: p(16) };

/** Una pieza del cuerpo ya maquetada: su elemento, su alto, el aire antes (si no abre la página) y si debe ir con la que sigue. */
export type Pieza = { el: ReactElement; alto: number; antes: number; conLaSiguiente?: boolean; tipo: BloqueDocumento["tipo"] | "linea" };

/** La geometría de una página: el ancho útil y lo que cabe en el cuerpo de la primera y de las demás. */
export type Maqueta = { formato: FormatoDocumento; ancho: number; alto: number; util: number; paginas: Pieza[][]; cabecera: Cabecera; altoPie: number };

// ===== Medir y partir.

/** El ancho de un texto en la letra del documento. */
const mide = (t: string, tamano: number, espaciado = 0) => anchoTexto(t, NEGRA, tamano, espaciado);

/**
 * Parte un texto en renglones de `ancho` como mucho, por palabras; una palabra que sola no cabe (una dirección larga) se corta por letras. Sin
 * tope de renglones: quien llama decide cuántos usa.
 */
export function partir(texto: string, ancho: number, tamano: number, espaciado = 0): string[] {
  const { renglones } = partirRenglones(texto, ancho, { fuente: NEGRA, tamano, espaciado });
  return renglones.flatMap((r) => {
    if (mide(r, tamano, espaciado) <= ancho) return [r];
    const partes: string[] = [];
    let actual = "";
    for (const letra of r) {
      if (actual && mide(actual + letra, tamano, espaciado) > ancho) {
        partes.push(actual);
        actual = letra;
      } else actual += letra;
    }
    if (actual) partes.push(actual);
    return partes;
  });
}

/** Los renglones, pero no más de `max`: el último se corta con «…». */
function partirHasta(texto: string, ancho: number, tamano: number, max: number, espaciado = 0): string[] {
  const todos = partir(texto, ancho, tamano, espaciado);
  if (todos.length <= max) return todos;
  return ajustar(texto, { fuente: NEGRA, ancho, renglones: max, mayor: tamano, menor: tamano, espaciado }).renglones;
}

/** Un renglón que no se parte: si no cabe, se corta con «…». */
const unRenglon = (texto: string, ancho: number, tamano: number) => ajustarRenglon(texto, { fuente: NEGRA, ancho, mayor: tamano, menor: tamano }).renglones[0] ?? "";

/** Renglones ya partidos, uno por línea y sin que satori los vuelva a partir. Su alto: renglones × tamaño × interlineado. */
function lineas(textos: readonly string[], { tamano, interlineado = LETRA.interlineado, color = C.tinta, espaciado = 0, tachado = false, alinear = "flex-start" }: { tamano: number; interlineado?: number; color?: string; espaciado?: number; tachado?: boolean; alinear?: CSSProperties["alignItems"] }): { el: ReactElement; alto: number } {
  const alto = tamano * interlineado;
  return {
    el: (
      <div style={{ display: "flex", flexDirection: "column", alignItems: alinear }}>
        {textos.map((t, i) => (
          <div key={i} style={{ display: "flex", height: alto, fontSize: tamano, lineHeight: interlineado, letterSpacing: espaciado, color, whiteSpace: "nowrap", ...(tachado ? { textDecoration: "line-through", textDecorationColor: color } : {}) }}>
            {t}
          </div>
        ))}
      </div>
    ),
    alto: textos.length * alto,
  };
}

/** Un rótulo de sección (`h2`): violeta, mayúsculas espaciadas. */
function rotulo(texto: string, ancho: number): { el: ReactElement; alto: number } {
  const t = texto.toLocaleUpperCase("es-MX");
  return lineas([unRenglonEspaciado(t, ancho)], { tamano: H2.tamano, color: C.acento, espaciado: H2.espaciado });
}
const unRenglonEspaciado = (t: string, ancho: number) => ajustarRenglon(t, { fuente: NEGRA, ancho, mayor: H2.tamano, menor: H2.tamano, espaciado: H2.espaciado }).renglones[0] ?? "";

// ===== Las piezas de cada bloque.

function piezasResena(b: Extract<BloqueDocumento, { tipo: "resena" }>, util: number): Pieza[] {
  const piezas: Pieza[] = [];
  const parrafos = (b.texto ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  parrafos.forEach((parrafo, i) => {
    partir(parrafo, util, RESENA.tamano).forEach((renglon, j) => {
      const l = lineas([renglon], { tamano: RESENA.tamano, interlineado: RESENA.interlineado });
      piezas.push({ el: l.el, alto: l.alto, antes: i > 0 && j === 0 ? p(6) : 0, tipo: "linea" });
    });
  });
  // Las redes, una tras otra con su aire, en tantos renglones como hagan falta.
  const filas: string[][] = [];
  let actual: string[] = [];
  let ancho = 0;
  for (const red of b.redes) {
    const texto = unRenglon(red, util, RESENA.redes);
    const w = mide(texto, RESENA.redes);
    if (actual.length && ancho + RESENA.entreRedes + w > util) {
      filas.push(actual);
      actual = [];
      ancho = 0;
    }
    ancho += (actual.length ? RESENA.entreRedes : 0) + w;
    actual.push(texto);
  }
  if (actual.length) filas.push(actual);
  filas.forEach((f) => {
    const alto = RESENA.redes * LETRA.interlineado;
    piezas.push({
      el: (
        <div style={{ display: "flex", flexDirection: "row", height: alto }}>
          {f.map((t, i) => (
            <div key={i} style={{ display: "flex", marginLeft: i ? RESENA.entreRedes : 0, fontSize: RESENA.redes, lineHeight: LETRA.interlineado, color: C.suave, whiteSpace: "nowrap" }}>
              {t}
            </div>
          ))}
        </div>
      ),
      alto,
      antes: RESENA.arribaRedes,
      tipo: "linea",
    });
  });
  // El rótulo «Reseña» va pegado a su párrafo (en el prototipo son una sola sección: solo el margen del rótulo los separa).
  if (piezas[0]) piezas[0].antes = 0;
  return piezas;
}

/** Una fila de evento (`.filas li`): la fecha en gris a la izquierda; el título en negro (tachado y con «Se canceló» si se canceló) y el detalle. */
export function piezaFila(f: FilaDocumento, util: number): Pieza {
  const derecha = util - FILA.fecha - FILA.entre;
  const fecha = lineas(partir(f.cuando, FILA.fecha, LETRA.cuerpo), { tamano: LETRA.cuerpo, color: C.suave });
  const titulo = lineas(partir(f.titulo, derecha, FILA.titulo), { tamano: FILA.titulo, interlineado: 1.25, color: f.cancelado ? C.suave : C.tinta, tachado: f.cancelado });
  const detalle = f.detalle ? lineas(partir(f.detalle, derecha, FILA.detalle), { tamano: FILA.detalle, color: C.suave }) : null;
  const altoEtiqueta = Math.ceil(FILA.etiqueta * 1.6);
  const etiqueta = f.cancelado ? (
    <div style={{ display: "flex", alignSelf: "flex-start", height: altoEtiqueta, alignItems: "center", marginBottom: p(3), padding: `0 ${FILA.etiquetaRelleno}px`, borderRadius: 999, backgroundColor: C.canceladoFondo, color: C.canceladoTinta, fontSize: FILA.etiqueta, letterSpacing: FILA.etiqueta * 0.06, whiteSpace: "nowrap" }}>
      SE CANCELÓ
    </div>
  ) : null;
  const altoDerecha = (etiqueta ? altoEtiqueta + p(3) : 0) + titulo.alto + (detalle ? FILA.arribaDetalle + detalle.alto : 0);
  const alto = Math.ceil(2 * FILA.relleno + Math.max(fecha.alto, altoDerecha) + FILA.raya);
  return {
    el: (
      <div style={{ display: "flex", flexDirection: "row", width: util, height: alto, paddingTop: FILA.relleno, paddingBottom: FILA.relleno, borderBottom: `${FILA.raya}px solid ${C.raya}` }}>
        <div style={{ display: "flex", width: FILA.fecha, marginRight: FILA.entre }}>{fecha.el}</div>
        <div style={{ display: "flex", flexDirection: "column", width: derecha }}>
          {etiqueta}
          {titulo.el}
          {detalle && <div style={{ display: "flex", marginTop: FILA.arribaDetalle }}>{detalle.el}</div>}
        </div>
      </div>
    ),
    alto,
    antes: GAP,
    tipo: "fila",
  };
}

/** Una celda de las dos columnas: el nombre (un renglón, con «…» si no cabe) y «2 veces» en gris. */
function celda(n: NombreDocumento | undefined, ancho: number, alto: number): ReactElement {
  if (!n) return <div style={{ display: "flex", width: ancho, height: alto }} />;
  const veces = n.veces ? mide(n.veces, LISTA.tamano) : 0;
  const nombre = unRenglon(n.nombre, ancho - (veces ? veces + p(12) : 0), LISTA.tamano);
  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: ancho, height: alto, borderBottom: `${LISTA.raya}px solid ${C.raya}`, fontSize: LISTA.tamano, lineHeight: LETRA.interlineado, whiteSpace: "nowrap" }}>
      <div style={{ display: "flex", color: C.tinta }}>{nombre}</div>
      {n.veces && <div style={{ display: "flex", color: C.suave }}>{n.veces}</div>}
    </div>
  );
}

/** Dos listas lado a lado (`.dos-col` con `.lista-doc`): la cabecera con sus rótulos y una pieza por renglón, para que se repartan en páginas. */
function piezasColumnas(b: Extract<BloqueDocumento, { tipo: "columnas" }>, util: number): Pieza[] {
  const ancho = Math.floor((util - LISTA.entreColumnas) / 2);
  const [izq, der] = b.columnas;
  const piezas: Pieza[] = [];
  if (izq.rotulo || der.rotulo) {
    const altoRotulo = H2.tamano * LETRA.interlineado + H2.abajo;
    piezas.push({
      el: (
        <div style={{ display: "flex", flexDirection: "row", width: util, height: altoRotulo }}>
          <div style={{ display: "flex", width: ancho, marginRight: LISTA.entreColumnas }}>{izq.rotulo ? rotulo(izq.rotulo, ancho).el : null}</div>
          <div style={{ display: "flex", width: ancho }}>{der.rotulo ? rotulo(der.rotulo, ancho).el : null}</div>
        </div>
      ),
      alto: altoRotulo,
      antes: GAP,
      conLaSiguiente: true,
      tipo: "columnas",
    });
  }
  const alto = Math.ceil(LISTA.tamano * LETRA.interlineado + 2 * LISTA.relleno + LISTA.raya);
  for (let i = 0; i < Math.max(izq.nombres.length, der.nombres.length); i++) {
    piezas.push({
      el: (
        <div style={{ display: "flex", flexDirection: "row", width: util, height: alto }}>
          <div style={{ display: "flex", marginRight: LISTA.entreColumnas }}>{celda(izq.nombres[i], ancho, alto)}</div>
          {celda(der.nombres[i], ancho, alto)}
        </div>
      ),
      alto,
      antes: i === 0 && !piezas.length ? GAP : 0,
      tipo: "columnas",
    });
  }
  return piezas;
}

/** Una cifra en su caja: el número grande, su nombre en mayúsculas y la definición en gris. */
function caja(c: CifraDocumento, ancho: number, alto: number): ReactElement {
  const interior = ancho - 2 * CIFRAS.rellenoH - 2 * CIFRAS.raya;
  const titulo = lineas(partir(c.titulo.toLocaleUpperCase("es-MX"), interior, CIFRAS.titulo, CIFRAS.titulo * 0.06), { tamano: CIFRAS.titulo, espaciado: CIFRAS.titulo * 0.06 });
  const def = lineas(partir(c.definicion, interior, CIFRAS.def), { tamano: CIFRAS.def, interlineado: 1.3, color: C.suave });
  return (
    <div style={{ display: "flex", flexDirection: "column", width: ancho, height: alto, padding: `${CIFRAS.rellenoV}px ${CIFRAS.rellenoH}px`, border: `${CIFRAS.raya}px solid ${C.tinta}`, borderRadius: CIFRAS.radio }}>
      <div style={{ display: "flex", height: CIFRAS.n, fontSize: CIFRAS.n, lineHeight: 1, color: C.tinta }}>{String(c.n)}</div>
      <div style={{ display: "flex", marginTop: CIFRAS.arribaTitulo }}>{titulo.el}</div>
      <div style={{ display: "flex", marginTop: CIFRAS.arribaDef }}>{def.el}</div>
    </div>
  );
}

/** El periodo y sus cifras (`.cifras-doc`): cuatro cajas iguales, del alto de la más alta. */
function piezaCifras(b: Extract<BloqueDocumento, { tipo: "cifras" }>, util: number): Pieza {
  const n = b.cifras.length;
  const ancho = Math.floor((util - (n - 1) * CIFRAS.entre) / n);
  const interior = ancho - 2 * CIFRAS.rellenoH - 2 * CIFRAS.raya;
  const altoCaja = Math.ceil(
    Math.max(
      ...b.cifras.map(
        (c) => 2 * CIFRAS.raya + 2 * CIFRAS.rellenoV + CIFRAS.n + CIFRAS.arribaTitulo + partir(c.titulo.toLocaleUpperCase("es-MX"), interior, CIFRAS.titulo, CIFRAS.titulo * 0.06).length * CIFRAS.titulo * LETRA.interlineado + CIFRAS.arribaDef + partir(c.definicion, interior, CIFRAS.def).length * CIFRAS.def * 1.3,
      ),
    ),
  );
  const r = rotulo(b.periodo, util);
  const alto = Math.ceil(r.alto + H2.abajo + altoCaja);
  return {
    el: (
      <div style={{ display: "flex", flexDirection: "column", width: util, height: alto }}>
        <div style={{ display: "flex", marginBottom: H2.abajo }}>{r.el}</div>
        <div style={{ display: "flex", flexDirection: "row" }}>
          {b.cifras.map((c, i) => (
            <div key={i} style={{ display: "flex", marginLeft: i ? CIFRAS.entre : 0 }}>
              {caja(c, ancho, altoCaja)}
            </div>
          ))}
        </div>
      </div>
    ),
    alto,
    antes: GAP,
    tipo: "cifras",
  };
}

/** Todas las piezas del cuerpo, en orden. */
export function piezasDe(bloques: readonly BloqueDocumento[], util: number): Pieza[] {
  const piezas: Pieza[] = [];
  let anios = 0;
  for (const b of bloques) {
    if (b.tipo === "rotulo") {
      const r = rotulo(b.texto, util);
      piezas.push({ el: r.el, alto: Math.ceil(r.alto + H2.abajo), antes: GAP, conLaSiguiente: true, tipo: "rotulo" });
    } else if (b.tipo === "anio") {
      const l = lineas([b.texto], { tamano: ANIO.tamano });
      piezas.push({ el: l.el, alto: Math.ceil(l.alto + ANIO.abajo), antes: GAP + (anios++ ? ANIO.arriba : 0), conLaSiguiente: true, tipo: "anio" });
    } else if (b.tipo === "resena") piezas.push(...piezasResena(b, util));
    else if (b.tipo === "fila") piezas.push(piezaFila(b.fila, util));
    else if (b.tipo === "columnas") piezas.push(...piezasColumnas(b, util));
    else if (b.tipo === "cifras") piezas.push(piezaCifras(b, util));
    else {
      const l = lineas(partir(b.texto, util, NOTA.tamano), { tamano: NOTA.tamano, interlineado: NOTA.interlineado, color: C.suave });
      piezas.push({ el: l.el, alto: Math.ceil(l.alto), antes: GAP, tipo: "nota" });
    }
  }
  return piezas;
}

/**
 * El reparto en páginas (`paginas()` del prototipo, con el alto medido): se llena cada página y lo que no cabe pasa a la siguiente; el aire de
 * una pieza no cuenta si abre la página. Un rótulo, un año o la cabecera de las dos columnas van con lo que sigue (toda la cadena hasta la
 * primera pieza que no lo pide): si la cadena no cabe, bajan juntos. Una pieza más alta que una página entera va sola en la suya.
 */
export function repartir(piezas: readonly Pieza[], disponible1: number, disponibleN: number): Pieza[][] {
  const paginas: Pieza[][] = [[]];
  let usado = 0;
  for (let i = 0; i < piezas.length; i++) {
    const pieza = piezas[i];
    const pagina = paginas[paginas.length - 1];
    const tope = paginas.length === 1 ? disponible1 : disponibleN;
    let cadena = (pagina.length ? pieza.antes : 0) + pieza.alto;
    for (let j = i; piezas[j]?.conLaSiguiente && piezas[j + 1]; j++) cadena += piezas[j + 1].antes + piezas[j + 1].alto;
    if (pagina.length && usado + cadena > tope) {
      paginas.push([pieza]);
      usado = pieza.alto;
      continue;
    }
    pagina.push(pieza);
    usado += (pagina.length > 1 ? pieza.antes : 0) + pieza.alto;
  }
  return paginas;
}

// ===== La cabecera, el pie y la página.

/** La cabecera de la primera página ya partida: el ancho del nombre y de la marca y sus renglones. */
type Cabecera = { alto: number; anchoTexto: number; anchoMarca: number; nombre: { tamano: number; renglones: string[] }; meta: string[]; enlace: string[]; rotulo: string };

/** La dirección de la ficha partida tras «/» o «-» para que la marca no se coma el nombre (como mucho tres renglones). */
export function partirEnlace(enlace: string, ancho: number): string[] {
  if (mide(enlace, CABECERA.marca) <= ancho) return [enlace];
  // Primero tras la última barra («…/lugares/» y el slug), si así caben los dos.
  const barra = enlace.lastIndexOf("/") + 1;
  if (barra > 0 && mide(enlace.slice(0, barra), CABECERA.marca) <= ancho && mide(enlace.slice(barra), CABECERA.marca) <= ancho) return [enlace.slice(0, barra), enlace.slice(barra)];
  const trozos = enlace.split(/(?<=[/-])/);
  const renglones: string[] = [];
  let actual = "";
  for (const t of trozos) {
    if (actual && mide(actual + t, CABECERA.marca) > ancho) {
      renglones.push(actual);
      actual = t;
    } else actual += t;
  }
  if (actual) renglones.push(actual);
  return renglones.length <= 3 ? renglones.flatMap((r) => partir(r, ancho, CABECERA.marca)) : [...renglones.slice(0, 2), unRenglon(renglones.slice(2).join(""), ancho, CABECERA.marca)];
}

function medirCabecera(d: Documento, util: number): Cabecera {
  const enlace = partirEnlace(d.enlace, CABECERA.marcaMax);
  const anchoMarca = Math.ceil(Math.max(CABECERA.simbolo, ...enlace.map((r) => mide(r, CABECERA.marca))));
  const anchoTexto = util - CABECERA.foto - 2 * CABECERA.entre - anchoMarca;
  const nombre = ajustar(d.nombre, { fuente: NEGRA, ancho: anchoTexto, renglones: 3, mayor: CABECERA.nombre, menor: CABECERA.nombreMenor });
  const meta = d.meta ? partirHasta(d.meta, anchoTexto, CABECERA.meta, 3) : [];
  const altoTexto = CABECERA.rotulo * LETRA.interlineado + nombre.renglones.length * nombre.tamano * 1.05 + (meta.length ? p(4) + meta.length * CABECERA.meta * LETRA.interlineado : 0);
  const altoMarca = (CABECERA.simbolo * CAJA_SN.alto) / CAJA_SN.ancho + p(4) + enlace.length * CABECERA.marca * LETRA.interlineado;
  return {
    alto: Math.ceil(Math.max(CABECERA.foto, altoTexto, altoMarca) + CABECERA.abajo + CABECERA.raya),
    anchoTexto,
    anchoMarca,
    nombre: { tamano: nombre.tamano, renglones: nombre.renglones },
    meta,
    enlace,
    rotulo: unRenglonEspaciado(d.rotulo.toLocaleUpperCase("es-MX"), anchoTexto),
  };
}

/** El alto de la cabecera corta: el título de la página 2 en adelante y su raya. */
const ALTO_CORTA = Math.ceil(CORTA.titulo * LETRA.interlineado + CORTA.abajo + CORTA.raya);

/** El texto del pie partido en renglones, con «12 oct 2026» en negro: cada renglón es una lista de trozos con su color. */
type Trozo = { texto: string; color: string };
function partirPie(d: Documento, ancho: number): Trozo[][] {
  const palabras: Trozo[] = [];
  const meter = (texto: string, color: string) => texto.split(/\s+/).filter(Boolean).forEach((t) => palabras.push({ texto: t, color }));
  meter("Elaborado el", C.suave);
  meter(d.elaborado, C.tinta);
  meter(`con Somos Nosotrxs a partir de lo publicado en la app${d.reglas ? `; ${d.reglas}` : ""}. Puede estar incompleto.`, C.suave);
  const renglones: Trozo[][] = [];
  let actual: Trozo[] = [];
  let w = 0;
  const espacio = mide(" ", PIE.tamano);
  for (const t of palabras) {
    const ancho1 = mide(t.texto, PIE.tamano);
    if (actual.length && w + espacio + ancho1 > ancho) {
      renglones.push(actual);
      actual = [];
      w = 0;
    }
    w += (actual.length ? espacio : 0) + ancho1;
    actual.push(t);
  }
  if (actual.length) renglones.push(actual);
  // Las palabras seguidas del mismo color, juntas (el espacio va al principio del trozo que sigue).
  return renglones.map((r) => r.reduce<Trozo[]>((acc, t, i) => {
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.color === t.color) ultimo.texto += ` ${t.texto}`;
    else acc.push({ texto: i ? ` ${t.texto}` : t.texto, color: t.color });
    return acc;
  }, []));
}

const ANCHO_NUMERO = () => Math.ceil(mide("99 / 99", PIE.tamano));

/** Mide el documento y reparte sus piezas en páginas. */
export function maquetar(d: Documento, formato: FormatoDocumento): Maqueta {
  const f = FORMATOS_DOCUMENTO[formato];
  const util = f.ancho - 2 * M.lado;
  const cabecera = medirCabecera(d, util);
  const pie = partirPie(d, util - PIE.entre - ANCHO_NUMERO());
  const altoPie = Math.ceil(PIE.raya + PIE.arriba + pie.length * PIE.tamano * PIE.interlineado);
  const resto = f.alto - M.arriba - M.abajo - CUERPO_ARRIBA - altoPie;
  const paginas = repartir(piezasDe(d.bloques, util), resto - cabecera.alto, resto - ALTO_CORTA);
  return { formato, ancho: f.ancho, alto: f.alto, util, paginas, cabecera, altoPie };
}

/** Cuántas páginas salen (lo que dice la hoja: «… listas para enviar: 2 páginas»). */
export const contarPaginas = (d: Documento, formato: FormatoDocumento): number => maquetar(d, formato).paginas.length;

function Simbolo({ ancho, color }: { ancho: number; color: string }) {
  return (
    <svg width={ancho} height={Math.round((ancho * CAJA_SN.alto) / CAJA_SN.ancho)} viewBox={`0 0 ${CAJA_SN.ancho} ${CAJA_SN.alto}`}>
      <path fill={color} d={TRAZO_SN} />
    </svg>
  );
}

function CabeceraCompleta({ d, c, foto }: { d: Documento; c: Cabecera; foto: string | null }) {
  const lado = CABECERA.foto;
  const alto = c.alto - CABECERA.abajo - CABECERA.raya;
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: c.alto, paddingBottom: CABECERA.abajo, borderBottom: `${CABECERA.raya}px solid ${C.tinta}` }}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- no es una página: es el árbol que satori convierte en la imagen de la hoja
        <img src={foto} width={lado} height={lado} alt="" style={{ width: lado, height: lado, borderRadius: lado / 2, objectFit: "cover" }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: lado, height: lado, borderRadius: lado / 2, backgroundColor: C.tinta }}>
          <Simbolo ancho={Math.round(lado * 0.55)} color={C.crema} />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: c.anchoTexto, height: alto, marginLeft: CABECERA.entre, marginRight: CABECERA.entre }}>
        {lineas([c.rotulo], { tamano: CABECERA.rotulo, color: C.acento, espaciado: H2.espaciado * (CABECERA.rotulo / H2.tamano) }).el}
        {lineas(c.nombre.renglones, { tamano: c.nombre.tamano, interlineado: 1.05 }).el}
        {c.meta.length > 0 && <div style={{ display: "flex", marginTop: p(4) }}>{lineas(c.meta, { tamano: CABECERA.meta, color: C.suave }).el}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", width: c.anchoMarca, height: alto }}>
        <Simbolo ancho={CABECERA.simbolo} color={C.tinta} />
        <div style={{ display: "flex", marginTop: p(4) }}>{lineas(c.enlace, { tamano: CABECERA.marca, color: C.suave, alinear: "flex-end" }).el}</div>
      </div>
    </div>
  );
}

function CabeceraCorta({ d, i, n, util }: { d: Documento; i: number; n: number; util: number }) {
  const pagina = `página ${i + 1} de ${n}`;
  const anchoPagina = Math.ceil(mide(pagina, CORTA.pagina));
  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: ALTO_CORTA, paddingBottom: CORTA.abajo, borderBottom: `${CORTA.raya}px solid ${C.tinta}` }}>
      {lineas([unRenglon(d.tituloCorto, util - anchoPagina - p(16), CORTA.titulo)], { tamano: CORTA.titulo }).el}
      {lineas([pagina], { tamano: CORTA.pagina, color: C.suave }).el}
    </div>
  );
}

function Pie({ d, m, i }: { d: Documento; m: Maqueta; i: number }) {
  const renglones = partirPie(d, m.util - PIE.entre - ANCHO_NUMERO());
  const alto = PIE.tamano * PIE.interlineado;
  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", height: m.altoPie, paddingTop: PIE.arriba, borderTop: `${PIE.raya}px solid ${C.tinta}`, fontSize: PIE.tamano, lineHeight: PIE.interlineado }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {renglones.map((r, k) => (
          <div key={k} style={{ display: "flex", flexDirection: "row", height: alto, whiteSpace: "pre" }}>
            {r.map((t, j) => (
              <div key={j} style={{ display: "flex", color: t.color }}>
                {t.texto}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", height: alto, color: C.suave, whiteSpace: "nowrap" }}>{`${i + 1} / ${m.paginas.length}`}</div>
    </div>
  );
}

/**
 * Una página para satori: la cabecera (completa en la primera, corta en las demás), el cuerpo con sus piezas y el pie abajo. Cada `div` con más
 * de un hijo lleva `display: flex` (satori lo exige). `foto`: la de la cabecera ya recortada en cuadrado (data URL) o nada.
 */
export function dibujarPaginaDocumento(d: Documento, m: Maqueta, i: number, foto: string | null): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: m.ancho, height: m.alto, paddingTop: M.arriba, paddingLeft: M.lado, paddingRight: M.lado, paddingBottom: M.abajo, backgroundColor: C.fondo, color: C.tinta, fontFamily: NEGRA, overflow: "hidden" }}>
      {i === 0 ? <CabeceraCompleta d={d} c={m.cabecera} foto={foto} /> : <CabeceraCorta d={d} i={i} n={m.paginas.length} util={m.util} />}
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, paddingTop: CUERPO_ARRIBA, overflow: "hidden" }}>
        {m.paginas[i].map((pieza, k) => (
          <div key={k} style={{ display: "flex", flexShrink: 0, height: pieza.alto, marginTop: k ? pieza.antes : 0 }}>
            {pieza.el}
          </div>
        ))}
      </div>
      <Pie d={d} m={m} i={i} />
    </div>
  );
}
