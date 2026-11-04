import type { CSSProperties, ReactElement, ReactNode } from "react";
import { contraste, CREMA, NEGRO, type PaletaPortada } from "../../portadasSistema";
import { CAJA_SN, TRAZO_SN } from "../../simboloSN";
import { ajustar, ajustarRenglon, type Ajuste, type Fuente } from "../medir";
import { FORMATOS, MARGEN, type IdFormato } from "../tokens";
import type { Contexto } from "./tipos";
import { pie, renglones, type Bloque } from "./piezas";

/**
 * «Repisa» (OL-505; firmada por el founder el 2026-11-02 sobre la tercera vuelta del prototipo OL-490, bitácora 522): el estilo propio de lo que
 * publica la cuenta @smsnstrsapp. Sale de las portadas del sistema de Inicio (OL-375): un color plano por tarjeta (`paleta()` de
 * `portadasSistema.ts`), la figura apoyada en la línea del título «como un objeto en una repisa», alineada con el margen y libre la esquina del
 * sello de fecha; debajo de la repisa solo el texto, en la tinta (crema o negro), sobre el color plano. Nada de texto encima de una foto.
 *   · Artista: dos aros del mismo color, su foto de perfil adentro y el punto de la tinta (el anidado de Inicio). Sin portada.
 *   · Lugar: tres arcos que comparten la base (la puerta). L2: su portada en el arco de adentro. L1 (sin portada): el arco de adentro en la tinta
 *     y el símbolo SN en el color de la tarjeta. Un sol pequeño en la tinta del lado libre.
 *   · «Esta semana»: tres barras que crecen (el ritmo de Inicio), cada una con el cartel de su evento y su día en una franja de la tinta al pie.
 * Texto: la razón en versalitas («Artista de la semana»), el nombre en la condensada negra (`nombreAjustado`: hasta 64 letras sin cortes), qué es
 * y dónde, la cuenta, la próxima fecha o «Esta semana: N eventos», y el pie (símbolo SN y somosnosotrxs.org). Sin la línea de la descripción
 * (firmado sin ella). En 9:16 ningún texto en lo que tapa Instagram.
 *
 * Puro: recibe las imágenes ya preparadas (data URL, recortadas a la medida de `cajaDeFoto` y `cajasDeCarteles`) y la paleta; `dibujar.ts` las
 * baja, saca el color y las prepara. Lo prueba `destacado.test.ts` con las cajas que da satori.
 */

/** Lo que dice la tarjeta de un artista o de un lugar. */
export type FichaRepisa = {
  tipo: "artista" | "lugar";
  formato: IdFormato;
  nombre: string;
  /** La razón de la publicación, en versalitas arriba del nombre: «Artista de la semana», «Lugar de la semana». */
  razon: string;
  /** «Música · Folk y canción de autor» o «Museo». */
  ceja: string;
  ciudad: string;
  cuenta: string | null;
  /** El artista con fecha: el sello («nov», «7») y la línea («Sáb 7 de nov, 7:00 pm · Monterrey»). */
  proxima?: { mes: string; dia: string; texto: string } | null;
  /** El lugar con eventos esa semana: «Esta semana: 2 eventos». */
  semana?: string | null;
};

/** Lo que dice la portada de «Esta semana». */
export type SemanaRepisa = {
  formato: IdFormato;
  ciudad: string;
  /** «Del viernes 30 de octubre al domingo 1 de noviembre». */
  titulo: string;
  /** Hasta tres: «Vie 30 · 5:30 pm · Aurora Co-Lab» y su título. */
  eventos: { cuando: string; titulo: string }[];
  /** El día al pie de cada barra («Vie 30»), uno por evento. */
  dias: string[];
};

export type CajaImagen = { x: number; y: number; ancho: number; alto: number };

/** El lado del sello de fecha (como el de las tarjetas de Inicio, E8) y el violeta de su mes. */
const ANCHO_SELLO = 184;
const VIOLETA = "#6d34c8";
/** Entre la figura y el sello, y entre las barras. */
const HUECO = 28;
/** La franja del día al pie de cada barra de «Esta semana». */
const FRANJA = 58;
/** El arco del lugar (OL-510): ancho entre alto, y la orilla de cada aro como parte del ancho (la portada ocupa 1 − 2 orillas). */
const ARCO_PROPORCION = 1.25;
const ARCO_ORILLA = 0.12;

/** La tinta que mejor se lee sobre un color (para el símbolo SN sobre un fondo de figura). */
const tintaSobre = (color: string) => (contraste(color, CREMA) >= contraste(color, NEGRO) ? CREMA : NEGRO);

/** Un renglón ajustado (si no cabe ni al menor, dos renglones antes que cortarlo). */
function linea(texto: string, fuente: Fuente, ancho: number, mayor: number, menor: number, color: string, espaciado = 0, mayusculas = false): Bloque {
  const uno = ajustarRenglon(texto, { fuente, ancho, mayor, menor, espaciado, mayusculas });
  const a = uno.recortado ? ajustar(texto, { fuente, ancho, renglones: 2, mayor: menor, menor, espaciado, mayusculas }) : uno;
  return renglones(a, fuente, color, { interlineado: 1.2, espaciado });
}

/**
 * El nombre, protagonista, en la condensada negra: en un renglón mientras quepa a 84 o más (hasta unas 34 letras); si no, en dos renglones
 * parejos, de 120 a 64. Medido en el prototipo: ninguno se corta hasta 64 letras.
 */
export function nombreAjustado(nombre: string, ancho: number, mayor = 132): Ajuste {
  const uno = ajustar(nombre, { fuente: "condensada-negra", ancho, renglones: 1, mayor, menor: 84 });
  if (!uno.recortado) return uno;
  return ajustar(nombre, { fuente: "condensada-negra", ancho, renglones: 2, mayor: Math.min(mayor, 120), menor: 64, parejo: true });
}

/** Un bloque de texto ya medido, con el aire que lleva antes. */
type Pieza = { b: Bloque; antes: number; clave: string };

/** El sello de fecha de Inicio: vidrio blanco, el mes en el violeta de la app y el día grande en negro. */
function sello(mes: string, dia: string): { el: ReactElement; alto: number } {
  const m = linea(mes, "media", ANCHO_SELLO - 32, 34, 24, VIOLETA);
  const d = linea(dia, "condensada-negra", ANCHO_SELLO - 32, 88, 52, NEGRO);
  const alto = 18 + m.alto + 2 + d.alto + 14;
  return {
    el: (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: ANCHO_SELLO, height: alto, paddingTop: 18, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.92)", boxShadow: "0 6px 24px rgba(0,0,0,0.16)" }}>
        {m.el}
        <div style={{ display: "flex", marginTop: 2 }}>{d.el}</div>
      </div>
    ),
    alto,
  };
}

/** Algo colocado a mano en el lienzo. */
const Capa = ({ x, y, ancho, alto, children, estilo }: { x: number; y: number; ancho: number; alto?: number; children?: ReactNode; estilo?: CSSProperties }) => (
  <div style={{ display: "flex", position: "absolute", left: x, top: y, width: ancho, ...(alto === undefined ? {} : { height: alto }), ...estilo }}>{children}</div>
);

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Un círculo de color. */
const circulo = (clave: string, cx: number, cy: number, r: number, color: string) => (
  <div key={clave} style={{ display: "flex", position: "absolute", left: r1(cx - r), top: r1(cy - r), width: r1(2 * r), height: r1(2 * r), borderRadius: r1(r), backgroundColor: color }} />
);

/** Un arco (la puerta): un rectángulo con medio círculo arriba, con la base en `yb`. */
const radiosDeArco = (w: number): CSSProperties => ({ borderTopLeftRadius: r1(w / 2), borderTopRightRadius: r1(w / 2) });
const arco = (clave: string, x: number, yb: number, w: number, h: number, color: string) => (
  <div key={clave} style={{ display: "flex", position: "absolute", left: r1(x), top: r1(yb - h), width: r1(w), height: r1(h), backgroundColor: color, ...radiosDeArco(w) }} />
);

/** El símbolo SN centrado en una caja, del ancho `parte` de ella; `alturaCentro`: dónde cae su centro (0,5 la mitad). */
function simbolo(clave: string, caja: CajaImagen, color: string, parte: number, alturaCentro: number) {
  const ancho = caja.ancho * parte;
  const alto = (CAJA_SN.alto * ancho) / CAJA_SN.ancho;
  return (
    <Capa key={clave} x={r1(caja.x + (caja.ancho - ancho) / 2)} y={r1(caja.y + caja.alto * alturaCentro - alto / 2)} ancho={r1(ancho)} alto={r1(alto)}>
      <svg width={r1(ancho)} height={r1(alto)} viewBox={`0 0 ${CAJA_SN.ancho} ${CAJA_SN.alto}`}>
        <path fill={color} d={TRAZO_SN} />
      </svg>
    </Capa>
  );
}

/** Una imagen ya preparada que llena su caja, con la forma que se le dé (círculo, arco o recta). */
function imagen(clave: string, src: string, caja: CajaImagen, forma: CSSProperties = {}) {
  return (
    <Capa key={clave} x={r1(caja.x)} y={r1(caja.y)} ancho={r1(caja.ancho)} alto={r1(caja.alto)} estilo={{ overflow: "hidden", ...forma }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- árbol de satori, no una página */}
      <img src={src} width={r1(caja.ancho)} height={r1(caja.alto)} alt="" style={{ width: r1(caja.ancho), height: r1(caja.alto), objectFit: "cover", ...forma }} />
    </Capa>
  );
}

/** La zona del título, de abajo hacia arriba: el pie en la tinta y encima los bloques; devuelve dónde empieza el texto y dónde la repisa. */
function zona(formato: IdFormato, piezas: Pieza[], tinta: string) {
  const f = FORMATOS[formato];
  const util = f.ancho - 2 * MARGEN;
  const bPie = pie({ sello: true, paleta: { suave: tinta } } as unknown as Contexto, util);
  const yPie = f.alto - Math.max(MARGEN - 8, f.tapaAbajo) - bPie.alto;
  const altoZona = piezas.reduce((s, p) => s + p.antes + p.b.alto, 0);
  const yTexto = yPie - 44 - altoZona;
  return { f, util, bPie, yPie, yTexto, repisa: yTexto - 44, arriba: Math.max(MARGEN, f.tapaArriba + 16) };
}

/** La caja más grande de proporción `r` (ancho:alto) que cabe en la L libre junto al sello, apoyada en la repisa y en el margen (`colocar` de Inicio). */
function colocar(r: number, util: number, repisa: number, arriba: number, selloAbajo: number, selloIzq: number) {
  const u1 = Math.min(util / r, repisa - selloAbajo - HUECO);
  const u2 = Math.min((selloIzq - HUECO - MARGEN) / r, repisa - arriba);
  const u = Math.max(0, u1, u2);
  return { x: MARGEN, u, w: u * r };
}

// ===== La tarjeta de un artista o de un lugar

/** Los bloques de texto de la ficha, en la tinta. */
function piezasDeFicha(t: FichaRepisa, util: number, tinta: string, fondo: string): Pieza[] {
  const piezas: Pieza[] = [];
  const poner = (clave: string, b: Bloque, antes: number) => b.el && piezas.push({ clave, b, antes });
  poner("razon", linea(t.razon, "media", util, 30, 22, tinta, 5, true), 0);
  poner("nombre", renglones(nombreAjustado(t.nombre, util), "condensada-negra", tinta, { interlineado: 0.98 }), 12);
  poner("ceja", linea(`${t.ceja} · ${t.ciudad}`, "media", util, 32, 22, tinta), 18);
  if (t.cuenta) poner("cuenta", linea(`@${t.cuenta}`, "media", util, 32, 22, tinta), 6);
  if (t.proxima) poner("proxima", linea(`Próxima fecha: ${t.proxima.texto}`, "media", util, 32, 22, tinta), 6);
  if (t.semana) {
    // La pastilla: la tinta de fondo y el color de la tarjeta en la letra (el mismo contraste que el texto, al revés).
    const dato = linea(t.semana, "media", util - 56, 32, 24, fondo);
    const alto = dato.alto + 26;
    poner("semana", { el: <div style={{ display: "flex", height: alto, padding: "13px 26px", borderRadius: 999, backgroundColor: tinta }}>{dato.el}</div>, alto, recortado: dato.recortado }, 22);
  }
  return piezas;
}

/** Dónde va todo en la tarjeta de una ficha (lo mismo para medir la foto y para dibujar). */
function planoDeFicha(t: FichaRepisa, P: Pick<PaletaPortada, "tinta" | "base">) {
  const piezas = piezasDeFicha(t, FORMATOS[t.formato].ancho - 2 * MARGEN, P.tinta, P.base);
  const z = zona(t.formato, piezas, P.tinta);
  const W = z.f.ancho;
  const selloFecha = t.proxima ? sello(t.proxima.mes, t.proxima.dia) : null;
  const selloAbajo = selloFecha ? z.arriba + selloFecha.alto : z.arriba - 24;
  const selloIzq = selloFecha ? W - MARGEN - ANCHO_SELLO : W - MARGEN + 28;
  if (t.tipo === "artista") {
    const { x, u } = colocar(1, z.util, z.repisa, z.arriba, selloAbajo, selloIzq);
    const R = u / 2;
    const cx = x + R;
    const cy = z.repisa - R;
    const rf = R * 0.68;
    return { ...z, piezas, selloFecha, selloIzq, artista: { cx, cy, R }, lugar: null, foto: { x: cx - rf, y: cy - rf, ancho: 2 * rf, alto: 2 * rf } };
  }
  // OL-510 (founder, 2026-11-04: «el contenedor de lugares es demasiado estrecho… hazlo más ancho para que se vea más la imagen»; eligió C): el arco
  // 1,25 veces más ancho que alto (antes 0,8) y la portada ocupa el 76 % del ancho (antes el 64 %).
  const { x, u, w } = colocar(ARCO_PROPORCION, z.util, z.repisa, z.arriba, selloAbajo, selloIzq);
  const adentro = { x: x + w * ARCO_ORILLA, ancho: w * (1 - 2 * ARCO_ORILLA), alto: u - w * ARCO_ORILLA };
  return { ...z, piezas, selloFecha, selloIzq, artista: null, lugar: { x, u, w }, foto: { x: adentro.x, y: z.repisa - adentro.alto, ancho: adentro.ancho, alto: adentro.alto } };
}

/** La caja (px del lienzo) donde va la foto de la ficha: el círculo del artista o el arco de adentro del lugar. Para prepararla a su medida. */
export function cajaDeFoto(t: FichaRepisa): CajaImagen {
  return planoDeFicha(t, { tinta: CREMA, base: NEGRO }).foto;
}

/**
 * El árbol de la tarjeta de un artista o de un lugar para satori, en px del lienzo de 1080. `foto`: la del artista o la portada del lugar, ya
 * recortada a `cajaDeFoto` (data URL), o null (el artista, el símbolo SN; el lugar, L1). `recortado`: algún texto se cortó o no cupo.
 */
export function arbolRepisa(t: FichaRepisa, P: PaletaPortada, foto: string | null): { elemento: ReactElement; recortado: boolean } {
  const p = planoDeFicha(t, P);
  const W = p.f.ancho;
  const H = p.f.alto;
  // Los escalones de la variante A: el claro, el oscuro, el más oscuro y el acento (la tinta).
  const uno = P.c;
  const dos = P.o;
  const tres = P.oo;
  const acento = P.f;
  const figuras: ReactElement[] = [];
  if (p.artista) {
    const { cx, cy, R } = p.artista;
    figuras.push(circulo("aro", cx, cy, R, uno), circulo("aro2", cx, cy, R * 0.84, dos));
    if (foto) figuras.push(imagen("foto", foto, p.foto, { borderRadius: r1(p.foto.ancho / 2) }));
    else figuras.push(circulo("hueco", cx, cy, R * 0.68, tres), simbolo("sn", p.foto, tintaSobre(tres), 0.46, 0.5));
    // El punto del anidado de Inicio, sobre el aro, del lado del espacio libre.
    figuras.push(circulo("punto", cx + R * 0.76 * Math.cos(-0.6), cy + R * 0.76 * Math.sin(-0.6), R * 0.07, acento));
  } else if (p.lugar) {
    const { x, u, w } = p.lugar;
    figuras.push(arco("arco", x, p.repisa, w, u, uno), arco("arco2", x + (w * ARCO_ORILLA) / 2, p.repisa, w * (1 - ARCO_ORILLA), u - (w * ARCO_ORILLA) / 2, dos));
    // L2: la portada en el arco de adentro. L1: el arco de adentro en la tinta y el símbolo SN en el color de la tarjeta.
    if (foto) figuras.push(imagen("foto", foto, p.foto, radiosDeArco(p.foto.ancho)));
    else figuras.push(arco("arco3", p.foto.x, p.repisa, p.foto.ancho, p.foto.alto, acento), simbolo("sn", p.foto, P.base, 0.6, 0.58));
    // El sol (OL-510): arriba a la derecha de la ficha, donde el artista lleva su sello de fecha; con el arco ancho ya no cabe junto a él.
    const sol = Math.min(u * 0.22, ANCHO_SELLO);
    if (sol > 60) figuras.push(circulo("sol", W - MARGEN - sol / 2, p.arriba + sol / 2, sol / 2, acento));
  }
  const capas: ReactElement[] = [
    // Las figuras, recortadas en la repisa: debajo de la línea solo va el texto.
    <Capa key="figuras" x={0} y={0} ancho={W} alto={Math.max(0, Math.round(p.repisa))} estilo={{ overflow: "hidden" }}>
      {figuras}
    </Capa>,
  ];
  if (p.selloFecha) capas.push(<Capa key="sello" x={W - MARGEN - ANCHO_SELLO} y={p.arriba} ancho={ANCHO_SELLO} alto={p.selloFecha.alto}>{p.selloFecha.el}</Capa>);
  let y = p.yTexto;
  let recortado = p.yTexto < p.arriba;
  for (const pieza of p.piezas) {
    y += pieza.antes;
    recortado ||= !!pieza.b.recortado;
    capas.push(<Capa key={pieza.clave} x={MARGEN} y={Math.round(y)} ancho={p.util} alto={pieza.b.alto}>{pieza.b.el}</Capa>);
    y += pieza.b.alto;
  }
  capas.push(<Capa key="pie" x={MARGEN} y={Math.round(p.yPie)} ancho={p.util}>{p.bPie.el}</Capa>);
  return {
    elemento: <div style={{ display: "flex", position: "relative", width: W, height: H, overflow: "hidden", backgroundColor: P.base, fontFamily: "regular" }}>{capas}</div>,
    recortado,
  };
}

// ===== La portada de «Esta semana»

function piezasDeSemana(s: SemanaRepisa, util: number, tinta: string): Pieza[] {
  const piezas: Pieza[] = [];
  const poner = (clave: string, b: Bloque, antes: number) => b.el && piezas.push({ clave, b, antes });
  poner("ceja", linea(`Esta semana en ${s.ciudad}`, "media", util, 28, 20, tinta, 4, true), 0);
  poner("titulo", renglones(ajustar(s.titulo, { fuente: "condensada-negra", ancho: util, renglones: 2, mayor: 120, menor: 72, parejo: true }), "condensada-negra", tinta, { interlineado: 0.96 }), 12);
  s.eventos.slice(0, 3).forEach((e, i) => {
    const cuando = linea(e.cuando, "media", util, 24, 20, tinta, 4, true);
    const titulo = renglones(ajustar(e.titulo, { fuente: "media", ancho: util, renglones: 2, mayor: 36, menor: 28 }), "media", tinta, { interlineado: 1.12 });
    const alto = 20 + cuando.alto + 6 + titulo.alto;
    poner(
      `evento${i}`,
      {
        el: (
          <div style={{ display: "flex", flexDirection: "column", width: util, height: alto, paddingTop: 20, borderTop: `3px solid ${tinta}` }}>
            {cuando.el}
            <div style={{ display: "flex", marginTop: 6 }}>{titulo.el}</div>
          </div>
        ),
        alto,
        recortado: cuando.recortado || titulo.recortado,
      },
      i === 0 ? 36 : 20,
    );
  });
  return piezas;
}

/** Dónde va todo en la portada de «Esta semana»: una barra por evento (hasta tres), la más alta del alto del cartel en 4:5 más su franja. */
function planoDeSemana(s: SemanaRepisa, P: Pick<PaletaPortada, "tinta">) {
  const piezas = piezasDeSemana(s, FORMATOS[s.formato].ancho - 2 * MARGEN, P.tinta);
  const z = zona(s.formato, piezas, P.tinta);
  const n = Math.max(1, Math.min(3, s.eventos.length));
  const ancho = (z.util - 2 * HUECO) / 3;
  const alto = Math.max(0, Math.min(z.repisa - z.arriba, ancho * 1.25 + FRANJA));
  const ritmo = [0.84, 0.92, 1].slice(3 - n);
  const barras = ritmo.map((k, i) => ({ x: MARGEN + i * (ancho + HUECO), y: z.repisa - alto * k, ancho, alto: alto * k }));
  return { ...z, piezas, barras, carteles: barras.map((b) => ({ x: b.x, y: b.y, ancho: b.ancho, alto: Math.max(0, b.alto - FRANJA) })) };
}

/** Las cajas donde va el cartel de cada barra, para prepararlos a su medida. */
export function cajasDeCarteles(s: SemanaRepisa): CajaImagen[] {
  return planoDeSemana(s, { tinta: CREMA }).carteles;
}

/**
 * El árbol de la portada de «Esta semana»: las barras con los carteles reales (ya recortados a `cajasDeCarteles`; sin cartel, el símbolo SN),
 * el día de cada una en su franja, la ceja, el título y hasta tres eventos con su filete.
 */
export function arbolRepisaSemana(s: SemanaRepisa, P: PaletaPortada, carteles: (string | null)[]): { elemento: ReactElement; recortado: boolean } {
  const p = planoDeSemana(s, P);
  const W = p.f.ancho;
  const H = p.f.alto;
  const figuras: ReactElement[] = [];
  p.barras.forEach((b, i) => {
    const caja = p.carteles[i];
    const src = carteles[i] ?? null;
    if (src) figuras.push(imagen(`cartel${i}`, src, caja));
    else figuras.push(<Capa key={`hueco${i}`} x={r1(caja.x)} y={r1(caja.y)} ancho={r1(caja.ancho)} alto={r1(caja.alto)} estilo={{ backgroundColor: P.o }} />, simbolo(`sn${i}`, caja, tintaSobre(P.o), 0.46, 0.5));
    figuras.push(<Capa key={`franja${i}`} x={r1(b.x)} y={r1(b.y + b.alto - FRANJA)} ancho={r1(b.ancho)} alto={FRANJA} estilo={{ backgroundColor: P.tinta }} />);
  });
  const capas: ReactElement[] = [
    <Capa key="figuras" x={0} y={0} ancho={W} alto={Math.max(0, Math.round(p.repisa))} estilo={{ overflow: "hidden" }}>
      {figuras}
    </Capa>,
  ];
  let recortado = p.yTexto < p.arriba;
  // El día al pie de cada barra, en su franja: el color de la tarjeta sobre la tinta.
  p.barras.forEach((b, i) => {
    const dia = s.dias[i];
    if (!dia) return;
    const d = linea(dia, "media", b.ancho - 32, 30, 20, P.base, 3, true);
    recortado ||= !!d.recortado;
    capas.push(<Capa key={`dia${i}`} x={Math.round(b.x + 16)} y={Math.round(b.y + b.alto - FRANJA + (FRANJA - d.alto) / 2)} ancho={Math.round(b.ancho - 32)}>{d.el}</Capa>);
  });
  let y = p.yTexto;
  for (const pieza of p.piezas) {
    y += pieza.antes;
    recortado ||= !!pieza.b.recortado;
    capas.push(<Capa key={pieza.clave} x={MARGEN} y={Math.round(y)} ancho={p.util} alto={pieza.b.alto}>{pieza.b.el}</Capa>);
    y += pieza.b.alto;
  }
  capas.push(<Capa key="pie" x={MARGEN} y={Math.round(p.yPie)} ancho={p.util}>{p.bPie.el}</Capa>);
  return {
    elemento: <div style={{ display: "flex", position: "relative", width: W, height: H, overflow: "hidden", backgroundColor: P.base, fontFamily: "regular" }}>{capas}</div>,
    recortado,
  };
}
