// OL-490 (bitácora 522), solo prototipo: el estilo propio «Somos Nosotrxs» para lo que publica la cuenta @smsnstrsapp (artista destacado, lugar
// destacado y la portada de «Esta semana», en 4:5 y 9:16), derivado de las portadas del sistema de Inicio (OL-375, bitácora 405). Tres variantes:
//   A · «Repisa»: el color plano de la portada (la misma regla `paleta()` de Inicio), la figura apoyada en la línea del título, el sello de fecha
//       en su esquina y la foto dentro de la figura (círculo el artista, arco el lugar, barras la semana).
//   B · «Cruce»: la misma regla de color; la figura grande se sale del borde y una barra la cruza (la transparencia de la Bauhaus).
//   C · «Papel»: la composición de A; el fondo es el crema del sistema y el color de la portada pasa a las figuras.
// Reutiliza sin cambiarlo: `paleta`, `origenDe`, `respaldoDe`, `CREMA`, `NEGRO`, `contraste` (src/lib/portadasSistema.ts), `paletaDePixeles`
// (src/lib/coloresCartel.ts), `ajustar`/`ajustarRenglon` (medir.ts), `renglones` y `pie` (plantillas/piezas.tsx), `FORMATOS` y `MARGEN`
// (tokens.ts) y el trazo del símbolo SN. No es código de la app: lo empaqueta y lo corre `instagram-estilo-propio.mjs`.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement, ReactNode } from "react";
import satori from "satori";
import sharp from "sharp";
import { paletaDePixeles } from "@/lib/coloresCartel";
import { ajustar, ajustarRenglon, FUENTES, type Ajuste, type Fuente } from "@/lib/carteles/medir";
import { pie, renglones, type Bloque } from "@/lib/carteles/plantillas/piezas";
import type { Contexto } from "@/lib/carteles/plantillas/tipos";
import { FORMATOS, MARGEN, type Formato, type IdFormato } from "@/lib/carteles/tokens";
import { contraste, CREMA, NEGRO, origenDe, paleta, respaldoDe, type PaletaPortada } from "@/lib/portadasSistema";
import { CAJA_SN, TRAZO_SN } from "@/lib/simboloSN";

export type Variante = "A" | "B" | "C";

export type FichaIG = {
  tipo: "artista" | "lugar";
  id: string;
  nombre: string;
  /** «Música · Canción» o «Museo». */
  ceja: string;
  ciudad: string;
  cuenta: string | null;
  /** La foto que va dentro de la figura: la de la persona (artista) o la portada (lugar). Sin ella, el símbolo SN. */
  foto: Buffer | null;
  /** La portada de la ficha: de ella sale el color (como el cartel en Inicio). Sin ella, el respaldo del sistema. */
  portada: Buffer | null;
  proxima?: { mes: string; dia: string; texto: string } | null;
  semana?: string | null;
  /** Segunda vuelta: la razón de la publicación («Artista de la semana», «Lugar destacado»…), arriba del nombre, en versalitas. */
  razon?: string | null;
  /** Segunda vuelta: la línea opcional bajo el nombre, una frase de la descripción (hasta ~90 letras, cortada por palabra). */
  frase?: string | null;
  /** Tercera vuelta: de dónde sale el color cuando `portada` trae imagen (la foto de perfil del artista o la portada del lugar). */
  colorDe?: "foto" | "portada";
  /** Tercera vuelta (lugar L1): sin foto, el arco de adentro va en la tinta y el símbolo SN en el color de la tarjeta. */
  snEnColor?: boolean;
};

export type SemanaIG = { id: string; ciudad: string; titulo: string; mes: string; dias: string; eventos: { cuando: string; titulo: string }[]; barras: string[]; carteles?: (Buffer | null)[]; tope45?: boolean };

/**
 * La frase de la descripción para la línea opcional: la primera oración si cabe en `max` letras; si no, hasta la última palabra que cabe, con «…».
 * Sin descripción, null.
 */
export function fraseDe(descripcion: string | null | undefined, max = 90): string | null {
  const limpia = (descripcion ?? "").replace(/\s+/g, " ").trim();
  if (!limpia) return null;
  const primera = limpia.match(/^.+?[.!?…](?=\s|$)/)?.[0] ?? limpia;
  if ([...primera].length <= max) return primera;
  const corte = primera.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[,;:·\s]+$/, "");
  return `${corte}…`;
}

export type Dibujada = { png: Buffer; jpeg: Buffer; ancho: number; alto: number; color: Color; nodos: Nodo[]; recortado: boolean; contrastes: { texto: string; ratio: number }[] };
export type Nodo = { texto: string; x: number; y: number; ancho: number; alto: number };
export type Color = { origen: string; deDonde: "portada" | "foto" | "respaldo"; base: string; banda: string; fondo: string; tinta: string; figuras: string[] };

// ===== Fuentes, como «Crear cartel»

let fuentes: { name: string; data: Buffer; weight: 400; style: "normal" }[] | null = null;
function cargarFuentes() {
  const carpeta = path.join(process.cwd(), "src/lib/carteles/fuentes");
  fuentes ??= FUENTES.map((nombre) => ({ name: nombre, data: readFileSync(path.join(carpeta, `bricolage-${nombre}.ttf`)), weight: 400 as const, style: "normal" as const }));
  return fuentes;
}

// ===== El color: la regla de Inicio, con la portada de la ficha en el sitio del cartel

/** Los colores de una imagen como los guarda la app al subir un cartel (`paletaDePixeles` sobre 16×20). */
async function coloresDe(img: Buffer | null) {
  if (!img) return null;
  const { data } = await sharp(img).rotate().resize(16, 20, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return paletaDePixeles(data);
}

/** Lo que pinta cada variante: el fondo, la tinta del texto y los escalones de las figuras (de afuera hacia adentro) y el acento. */
type Tonos = { P: PaletaPortada; fondo: string; tinta: string; uno: string; dos: string; tres: string; acento: string };
function tonos(v: Variante, P: PaletaPortada): Tonos {
  if (v === "C") return { P, fondo: CREMA, tinta: NEGRO, uno: P.base, dos: P.o, tres: P.oo, acento: NEGRO };
  return { P, fondo: P.base, tinta: P.tinta, uno: P.c, dos: P.o, tres: P.oo, acento: P.f };
}
const tintaSobre = (color: string) => (contraste(color, CREMA) >= contraste(color, NEGRO) ? CREMA : NEGRO);

// ===== Piezas de SVG (las figuras y la foto), en px del lienzo

const r2 = (n: number) => Math.round(n * 10) / 10;
const circ = (cx: number, cy: number, r: number, fill: string, extra = "") => `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}"${extra}/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}"${extra}/>`;
/** Un arco (la puerta): rectángulo con medio círculo arriba, con la base en `yb`. */
const arcoD = (x: number, yb: number, w: number, h: number) => {
  const r = w / 2;
  const yt = yb - h;
  return `M${r2(x)},${r2(yb)} L${r2(x)},${r2(yt + r)} A${r2(r)},${r2(r)} 0 0 1 ${r2(x + w)},${r2(yt + r)} L${r2(x + w)},${r2(yb)} Z`;
};
const arco = (x: number, yb: number, w: number, h: number, fill: string, extra = "") => `<path d="${arcoD(x, yb, w, h)}" fill="${fill}"${extra}/>`;
const tri = (x: number, yb: number, w: number, a: number, fill: string) => `<polygon points="${r2(x)},${r2(yb)} ${r2(x + w)},${r2(yb)} ${r2(x + w / 2)},${r2(yb - a)}" fill="${fill}"/>`;

let idClip = 0;
/** La foto recortada a una forma (`d` de un path o un círculo); sin foto, el fondo `relleno` con el símbolo SN en su tinta. */
async function fotoEn(forma: { circulo: [number, number, number] } | { arco: [number, number, number, number] } | { rect: [number, number, number, number] }, foto: Buffer | null, relleno: string, colorSN = tintaSobre(relleno), anchoSN = 0.46): Promise<string> {
  const id = `f${++idClip}`;
  const caja = "circulo" in forma ? { x: forma.circulo[0] - forma.circulo[2], y: forma.circulo[1] - forma.circulo[2], w: 2 * forma.circulo[2], h: 2 * forma.circulo[2] } : "arco" in forma ? { x: forma.arco[0], y: forma.arco[1] - forma.arco[3], w: forma.arco[2], h: forma.arco[3] } : { x: forma.rect[0], y: forma.rect[1], w: forma.rect[2], h: forma.rect[3] };
  const figura = "circulo" in forma ? circ(...forma.circulo, "#000") : "arco" in forma ? `<path d="${arcoD(...forma.arco)}"/>` : rect(...forma.rect, "#000");
  if (!foto) {
    // El símbolo SN al centro de la figura (como la imagen sin foto de la app), del ancho de media figura.
    const ancho = caja.w * anchoSN;
    const s = ancho / CAJA_SN.ancho;
    const alto = CAJA_SN.alto * s;
    const tx = caja.x + (caja.w - ancho) / 2;
    const ty = caja.y + caja.h * ("circulo" in forma ? 0.5 : 0.58) - alto / 2;
    return `<defs><clipPath id="${id}">${figura}</clipPath></defs><g clip-path="url(#${id})">${rect(caja.x, caja.y, caja.w, caja.h, relleno)}<g transform="translate(${r2(tx)},${r2(ty)}) scale(${s.toFixed(5)})"><path d="${TRAZO_SN}" fill="${colorSN}"/></g></g>`;
  }
  const w = Math.round(caja.w);
  const h = Math.round(caja.h);
  const jpg = await sharp(foto).rotate().resize(w, h, { fit: "cover", position: "attention" }).jpeg({ quality: 88 }).toBuffer();
  return `<defs><clipPath id="${id}">${figura}</clipPath></defs><image x="${r2(caja.x)}" y="${r2(caja.y)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${jpg.toString("base64")}" clip-path="url(#${id})"/>`;
}

// ===== Texto

const linea = (texto: string, fuente: Fuente, ancho: number, mayor: number, menor: number, color: string, espaciado = 0, mayusculas = false): Bloque =>
  renglones(ajustarRenglon(texto, { fuente, ancho, mayor, menor, espaciado, mayusculas }), fuente, color, { interlineado: 1.2, espaciado });

/**
 * El nombre, protagonista, en la condensada negra: en un renglón mientras quepa a 84 o más (hasta 32 letras, medido abajo); si no, en dos
 * renglones parejos, de 132 a 64. Nunca se corta antes de los dos renglones.
 */
export function nombreAjustado(nombre: string, ancho: number, mayor = 132): Ajuste {
  const uno = ajustar(nombre, { fuente: "condensada-negra", ancho, renglones: 1, mayor, menor: 84 });
  if (!uno.recortado) return uno;
  return ajustar(nombre, { fuente: "condensada-negra", ancho, renglones: 2, mayor: Math.min(mayor, 120), menor: 64, parejo: true });
}

/** Un bloque de texto ya medido, colocado en su renglón de la zona del título. */
type Pieza = { b: Bloque; antes: number; clave: string; texto: string };

/** El sello de fecha de Inicio (`TarjetaEvento`, E8): vidrio, el mes en el violeta de la app y el día grande en negro. */
const ANCHO_SELLO = 184;
function sello(mes: string, dia: string): { el: ReactElement; alto: number; ancho: number; textos: string[] } {
  const m = linea(mes, "media", ANCHO_SELLO - 32, 34, 24, "#6d34c8");
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
    ancho: ANCHO_SELLO,
    textos: [mes, dia],
  };
}

const Capa = ({ x, y, ancho, alto, children, estilo }: { x: number; y: number; ancho: number; alto?: number; children?: ReactNode; estilo?: Record<string, unknown> }) => (
  <div style={{ display: "flex", position: "absolute", left: x, top: y, width: ancho, ...(alto === undefined ? {} : { height: alto }), ...estilo }}>{children}</div>
);

// ===== La tarjeta

type Cosa = { tipo: "artista" | "lugar"; f: FichaIG } | { tipo: "semana"; s: SemanaIG };

export async function dibujar(v: Variante, formato: IdFormato, cosa: Cosa): Promise<Dibujada> {
  const f = FORMATOS[formato];
  const W = f.ancho;
  const H = f.alto;
  const util = W - 2 * MARGEN;
  // 1. El color: la portada de la ficha en el sitio del cartel; sin portada (y la semana), el respaldo del sistema por su id.
  const id = cosa.tipo === "semana" ? cosa.s.id : cosa.f.id;
  const colores = cosa.tipo === "semana" ? null : await coloresDe(cosa.f.portada);
  const origen = origenDe(colores, id);
  const P = paleta(origen);
  const T = tonos(v, P);
  const tinta = T.tinta;

  // 2. La zona del título, de abajo hacia arriba: el sello del pie (símbolo SN y somosnosotrxs.org) en la tinta, y encima los datos.
  const ctx = { sello: true, paleta: { suave: tinta } } as unknown as Contexto;
  const bPie = pie(ctx, util);
  const yPie = H - Math.max(MARGEN - 8, f.tapaAbajo) - bPie.alto;
  const piezas: Pieza[] = [];
  let recortado = false;
  const poner = (clave: string, texto: string, b: Bloque, antes: number) => {
    if (!b.el) return;
    recortado ||= !!b.recortado;
    piezas.push({ b, antes, clave, texto });
  };
  let selloFecha: ReturnType<typeof sello> | null = null;
  if (cosa.tipo === "semana") {
    const s = cosa.s;
    poner("ceja", `Esta semana en ${s.ciudad}`, linea(`Esta semana en ${s.ciudad}`, "media", util, 28, 20, tinta, 4, true), 0);
    const t = ajustar(s.titulo, { fuente: "condensada-negra", ancho: util, renglones: formato === "4x5" || s.carteles ? 2 : 3, mayor: 120, menor: 72, parejo: true });
    poner("titulo", s.titulo, renglones(t, "condensada-negra", tinta, { interlineado: 0.96 }), 12);
    s.eventos.slice(0, 3).forEach((e, i) => {
      const cuando = linea(e.cuando, "media", util, 24, 20, tinta, 4, true);
      const tt = ajustar(e.titulo, { fuente: "media", ancho: util, renglones: 2, mayor: 36, menor: 28 });
      const bt = renglones(tt, "media", tinta, { interlineado: 1.12 });
      const alto = 20 + cuando.alto + 6 + bt.alto;
      poner(
        `evento${i}`,
        `${e.cuando} ${e.titulo}`,
        {
          el: (
            <div style={{ display: "flex", flexDirection: "column", width: util, height: alto, paddingTop: 20, borderTop: `3px solid ${tinta}` }}>
              {cuando.el}
              <div style={{ display: "flex", marginTop: 6 }}>{bt.el}</div>
            </div>
          ),
          alto,
          recortado: tt.recortado,
        },
        i === 0 ? 36 : 20,
      );
    });
    // Con los carteles en las barras (segunda vuelta) no hay sello: las barras toman todo el ancho y la fecha la dice el título.
    selloFecha = s.carteles ? null : sello(s.mes, s.dias);
  } else if (cosa.f.razon) {
    // Segunda vuelta: la razón en versalitas, el nombre, la frase (si va), qué es y dónde, la cuenta y la fecha o la semana.
    const fi = cosa.f;
    poner("razon", fi.razon, linea(fi.razon, "media", util, 30, 22, tinta, 5, true), 0);
    poner("nombre", fi.nombre, renglones(nombreAjustado(fi.nombre, util), "condensada-negra", tinta, { interlineado: 0.98 }), 12);
    if (fi.frase) poner("frase", fi.frase, renglones(ajustar(fi.frase, { fuente: "regular", ancho: util, renglones: 2, mayor: 36, menor: 28 }), "regular", tinta, { interlineado: 1.2 }), 18);
    poner("ceja", `${fi.ceja} · ${fi.ciudad}`, linea(`${fi.ceja} · ${fi.ciudad}`, "media", util, 32, 22, tinta), fi.frase ? 20 : 18);
    if (fi.cuenta) poner("cuenta", `@${fi.cuenta}`, linea(`@${fi.cuenta}`, "media", util, 32, 22, tinta), 6);
    if (fi.proxima) {
      const dato = linea(`Próxima fecha: ${fi.proxima.texto}`, "media", util, 32, 22, tinta);
      poner("proxima", fi.proxima.texto, dato, 6);
      selloFecha = sello(fi.proxima.mes, fi.proxima.dia);
    }
    if (fi.semana) {
      const dato = linea(fi.semana, "media", util - 56, 32, 24, T.fondo);
      const alto = dato.alto + 26;
      poner("semana", fi.semana, { el: <div style={{ display: "flex", height: alto, padding: "13px 26px", borderRadius: 999, backgroundColor: tinta }}>{dato.el}</div>, alto }, 22);
    }
  } else {
    const fi = cosa.f;
    poner("ceja", `${fi.ceja} · ${fi.ciudad}`, renglones(ajustar(`${fi.ceja} · ${fi.ciudad}`, { fuente: "media", ancho: util, renglones: 2, mayor: 28, menor: 20, espaciado: 4, mayusculas: true }), "media", tinta, { interlineado: 1.2, espaciado: 4 }), 0);
    const n = nombreAjustado(fi.nombre, util);
    poner("nombre", fi.nombre, renglones(n, "condensada-negra", tinta, { interlineado: 0.98 }), 10);
    if (fi.cuenta) poner("cuenta", `@${fi.cuenta}`, linea(`@${fi.cuenta}`, "media", util, 38, 26, tinta), 14);
    if (fi.proxima) {
      const etiqueta = linea("Próxima fecha", "media", util, 24, 20, tinta, 4, true);
      const dato = renglones(ajustar(fi.proxima.texto, { fuente: "media", ancho: util, renglones: 2, mayor: 36, menor: 26 }), "media", tinta, { interlineado: 1.15 });
      const alto = etiqueta.alto + 6 + dato.alto;
      poner(
        "proxima",
        fi.proxima.texto,
        {
          el: (
            <div style={{ display: "flex", flexDirection: "column", width: util, height: alto }}>
              {etiqueta.el}
              <div style={{ display: "flex", marginTop: 6 }}>{dato.el}</div>
            </div>
          ),
          alto,
          recortado: dato.recortado,
        },
        26,
      );
      selloFecha = sello(fi.proxima.mes, fi.proxima.dia);
    }
    if (fi.semana) {
      // La pastilla: la tinta de fondo y el color de la base de letra (el mismo contraste que el texto, al revés).
      const dato = linea(fi.semana, "media", util - 56, 34, 26, T.fondo);
      const alto = dato.alto + 28;
      poner("semana", fi.semana, { el: <div style={{ display: "flex", height: alto, padding: "14px 28px", borderRadius: 999, backgroundColor: tinta }}>{dato.el}</div>, alto }, 26);
    }
  }
  const altoZona = piezas.reduce((s, p) => s + p.antes + p.b.alto, 0);
  const yTexto = yPie - 44 - altoZona;
  // La repisa: la línea donde se apoyan las figuras; debajo, solo el texto sobre el color plano.
  const repisa = yTexto - 44;
  const arriba = Math.max(MARGEN, f.tapaArriba + 16);

  // 3. El sello de fecha, en su esquina (arriba a la derecha en A y C; a la izquierda en B, donde la figura no está).
  const selloX = v === "B" && cosa.tipo !== "semana" ? MARGEN : W - MARGEN - ANCHO_SELLO;
  const selloAbajo = selloFecha ? arriba + selloFecha.alto : arriba - 24;
  const selloIzq = selloFecha ? selloX : W - MARGEN + 28;

  // 4. Las figuras, en SVG, recortadas en la repisa.
  const figs: string[] = [];
  const hueco = 28;
  /** Las barras de la semana (dónde quedó cada una), para poner su día al pie. */
  const barrasSemana: { x: number; y: number; w: number; h: number; col: string; img?: Buffer | null }[] = [];
  /** La caja más grande de proporción r (ancho:alto) que cabe en la L libre (como `colocar` de Inicio), apoyada en la repisa y en el margen. */
  const colocar = (r: number) => {
    const u1 = Math.min(util / r, repisa - selloAbajo - hueco);
    const u2 = Math.min((selloIzq - hueco - MARGEN) / r, repisa - arriba);
    const u = Math.max(u1, u2);
    return { x: MARGEN, u, w: u * r };
  };
  if (v === "B") {
    // B · Cruce: la figura grande se sale por arriba y por la derecha; una barra la cruza en la repisa, translúcida (el cruce toma otro tono).
    const barra = Math.round((repisa - arriba) * 0.11);
    const yBarra = repisa - barra;
    if (cosa.tipo === "artista") {
      // El círculo se apoya en la barra y se sale por la derecha (y un poco por arriba): la cara queda adentro del lienzo.
      const D = Math.min(W * 0.86, (yBarra - arriba) * 1.12);
      const cx = W - D * 0.36;
      const cy = yBarra + barra * 0.3 - D / 2;
      const a = Math.min(W * 0.4, (yBarra - arriba) * 0.9);
      figs.push(tri(MARGEN - 8, yBarra, a * 1.08, a, T.acento));
      figs.push(circ(cx, cy, D / 2, T.uno));
      figs.push(await fotoEn({ circulo: [cx, cy, D / 2 - 30] }, cosa.f.foto, T.dos));
    } else if (cosa.tipo === "lugar") {
      const w = Math.min(W * 0.62, (yBarra - 0) * 0.62);
      const h = yBarra + w * 0.18;
      const x = W - w - MARGEN * 0.5;
      const sol = Math.min(W * 0.36, yBarra - arriba - 40);
      figs.push(circ(MARGEN + sol / 2, yBarra - sol / 2, sol / 2, T.acento));
      figs.push(arco(x, yBarra + barra, w, h + barra, T.uno));
      figs.push(await fotoEn({ arco: [x + 26, yBarra + barra, w - 52, h + barra - 26] }, cosa.f.foto, T.dos));
    } else {
      // La semana: tres barras que cuelgan del borde de arriba y crecen hasta la barra de la repisa.
      const cols = [T.dos, T.uno, T.acento];
      const ancho = Math.min(232, (util - 2 * hueco) / 3);
      [0.52, 0.76, 1].forEach((k, i) => barrasSemana.push({ x: MARGEN + i * (ancho + hueco), y: 0, w: ancho, h: yBarra * k, col: cols[i] }));
    }
    figs.push(rect(0, yBarra, W, barra, T.tres, ` fill-opacity="0.86"`));
  } else {
    // A y C · Repisa: la figura se apoya en la línea del título, alineada con el margen, y deja libre la esquina del sello.
    if (cosa.tipo === "artista") {
      const { x, u } = colocar(1);
      const R = u / 2;
      const cx = x + R;
      const cy = repisa - R;
      figs.push(circ(cx, cy, R, T.uno), circ(cx, cy, R * 0.84, T.dos));
      figs.push(await fotoEn({ circulo: [cx, cy, R * 0.68] }, cosa.f.foto, T.tres));
      // El punto crema del anidado de Inicio, sobre el aro, del lado del espacio libre.
      figs.push(circ(cx + R * 0.76 * Math.cos(-0.6), cy + R * 0.76 * Math.sin(-0.6), R * 0.07, T.acento));
    } else if (cosa.tipo === "lugar") {
      const { x, u, w } = colocar(0.8);
      // Tres arcos que comparten la base (la puerta), del claro al oscuro, y la foto en el de adentro.
      figs.push(arco(x, repisa, w, u, T.uno));
      figs.push(arco(x + w * 0.09, repisa, w * 0.82, u - w * 0.09, T.dos));
      // Tercera vuelta, L1: sin foto, el arco de adentro en la tinta y el símbolo SN en el color de la tarjeta (el «SN en color»).
      const l1 = !cosa.f.foto && cosa.f.snEnColor;
      figs.push(await fotoEn({ arco: [x + w * 0.18, repisa, w * 0.64, u - w * 0.18] }, cosa.f.foto, l1 ? T.acento : T.tres, l1 ? T.fondo : undefined, l1 ? 0.6 : 0.46));
      // El acento: un sol pequeño apoyado en la repisa, del lado libre.
      const libre = selloIzq - hueco - (x + w);
      const sol = Math.min(libre * 0.6, u * 0.22, W - MARGEN - (x + w) - hueco);
      if (sol > 60) figs.push(circ(x + w + hueco + sol / 2, repisa - sol / 2, sol / 2, T.acento));
    } else {
      // La semana: tres barras que crecen (el ritmo de Inicio), una por día, con su día al pie. Con carteles, cada barra lleva el de su día.
      const cols = [T.dos, T.uno, T.acento];
      const total = Math.min(selloIzq - hueco - MARGEN, util);
      const ancho = (total - 2 * hueco) / 3;
      // Con carteles (tercera vuelta), la barra más alta es la del cartel en 4:5 más su franja: así el cartel casi no se recorta.
      const alto = cosa.s.tope45 ? Math.min(repisa - arriba, ancho * 1.25 + 58) : repisa - arriba;
      const ritmo = cosa.s.tope45 ? [0.84, 0.92, 1] : cosa.s.carteles ? [0.8, 0.9, 1] : [0.46, 0.72, 1];
      ritmo.forEach((k, i) => barrasSemana.push({ x: MARGEN + i * (ancho + hueco), y: repisa - alto * k, w: ancho, h: alto * k, col: cols[i], img: cosa.s.carteles?.[i] ?? null }));
    }
  }
  // Con cartel, la barra es el cartel recortado y su día va en una franja de la tinta al pie (el texto nunca encima del cartel).
  const conCartel = cosa.tipo === "semana" && !!cosa.s.carteles;
  const franja = 58;
  const barras: string[] = [];
  for (const g of barrasSemana) {
    if (conCartel) barras.push(await fotoEn({ rect: [g.x, g.y, g.w, g.h - franja] }, g.img ?? null, T.dos), rect(g.x, g.y + g.h - franja, g.w, franja, tinta));
    else barras.push(rect(g.x, g.y, g.w, g.h, g.col));
  }
  figs.unshift(...barras);
  const fondoSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${T.fondo}"/><defs><clipPath id="repisa"><rect width="${W}" height="${r2(repisa)}"/></clipPath></defs><g clip-path="url(#repisa)">${figs.join("")}</g></svg>`;
  const fondoPng = await sharp(Buffer.from(fondoSvg)).png().toBuffer();

  // 5. El árbol de satori: el fondo con las figuras, las etiquetas de las barras, el sello, la zona del título y el pie.
  const capas: ReactElement[] = [
    <Capa key="fondo" x={0} y={0} ancho={W} alto={H}>
      {/* eslint-disable-next-line @next/next/no-img-element -- árbol de satori, no una página */}
      <img src={`data:image/png;base64,${fondoPng.toString("base64")}`} width={W} height={H} alt="" style={{ width: W, height: H }} />
    </Capa>,
  ];
  const contrastes: { texto: string; ratio: number }[] = [];
  // El día al pie de cada barra de la semana, en la tinta que mejor se lee sobre ella.
  if (cosa.tipo === "semana")
    barrasSemana.forEach((g, i) => {
      const fondoDia = conCartel ? tinta : g.col;
      const t = conCartel ? T.fondo : tintaSobre(g.col);
      const dia = cosa.s.barras[i];
      const b = linea(dia, "media", g.w - 32, 30, 20, t, 3, true);
      contrastes.push({ texto: dia, ratio: contraste(t, fondoDia) });
      const yDia = conCartel ? g.y + g.h - franja + (franja - b.alto) / 2 : Math.min(g.y + g.h, repisa) - b.alto - 18;
      capas.push(<Capa key={`dia${i}`} x={Math.round(g.x + 16)} y={Math.round(yDia)} ancho={Math.round(g.w - 32)}>{b.el}</Capa>);
    });
  if (selloFecha) capas.push(<Capa key="sello" x={selloX} y={arriba} ancho={selloFecha.ancho} alto={selloFecha.alto}>{selloFecha.el}</Capa>);
  let y = yTexto;
  for (const p of piezas) {
    y += p.antes;
    capas.push(<Capa key={p.clave} x={MARGEN} y={y} ancho={util} alto={p.b.alto}>{p.b.el}</Capa>);
    contrastes.push({ texto: p.texto, ratio: contraste(tinta, T.fondo) });
    y += p.b.alto;
  }
  capas.push(<Capa key="pie" x={MARGEN} y={yPie} ancho={util}>{bPie.el}</Capa>);
  contrastes.push({ texto: "somosnosotrxs.org", ratio: contraste(tinta, T.fondo) });
  if (selloFecha) contrastes.push({ texto: "sello (día)", ratio: contraste(NEGRO, "#ffffff") * 0.97 }, { texto: "sello (mes)", ratio: contraste("#6d34c8", "#ffffff") * 0.97 });
  const el = <div style={{ display: "flex", position: "relative", width: W, height: H, overflow: "hidden", backgroundColor: T.fondo, fontFamily: "regular" }}>{capas}</div>;
  const r = await rasterizar(el, f, T.fondo);
  const color: Color = { origen, deDonde: colores && origen === colores[1] ? (cosa.tipo === "semana" ? "portada" : (cosa.f.colorDe ?? "portada")) : "respaldo", base: P.base, banda: P.banda, fondo: T.fondo, tinta, figuras: [T.uno, T.dos, T.tres, T.acento] };
  return { ...r, ancho: W, alto: H, color, recortado, contrastes };
}

async function rasterizar(el: ReactElement, f: Formato, fondo: string): Promise<{ png: Buffer; jpeg: Buffer; nodos: Nodo[] }> {
  const nodos: Nodo[] = [];
  const svg = await satori(el, {
    width: f.ancho,
    height: f.alto,
    fonts: cargarFuentes(),
    onNodeDetected: (n) => {
      if (typeof n.textContent === "string" && n.textContent.trim()) nodos.push({ texto: n.textContent, x: n.left, y: n.top, ancho: n.width, alto: n.height });
    },
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const jpeg = await sharp(png).flatten({ background: fondo }).resize({ width: 540 }).jpeg({ quality: 84, chromaSubsampling: "4:4:4" }).toBuffer();
  return { png, jpeg, nodos };
}

/** La revisión de una tarjeta: ningún texto fuera del lienzo ni en lo que tapa la interfaz de la historia, ninguno encima de otro, ninguno cortado. */
export function revisar(d: Dibujada, formato: IdFormato): string[] {
  const f = FORMATOS[formato];
  const mal: string[] = [];
  for (const n of d.nodos) {
    if (n.x < MARGEN - 1 || n.x + n.ancho > f.ancho - MARGEN + 1) mal.push(`«${n.texto}» se sale de lado`);
    if (n.y < Math.max(0, f.tapaArriba) - 1 || n.y + n.alto > f.alto - Math.max(MARGEN - 8, f.tapaAbajo) + 1) mal.push(`«${n.texto}» fuera de la zona de texto`);
  }
  for (let i = 0; i < d.nodos.length; i++)
    for (let j = i + 1; j < d.nodos.length; j++) {
      const a = d.nodos[i];
      const b = d.nodos[j];
      if (a.x < b.x + b.ancho - 1 && b.x < a.x + a.ancho - 1 && a.y < b.y + b.alto - 1 && b.y < a.y + a.alto - 1) mal.push(`«${a.texto}» encima de «${b.texto}»`);
    }
  if (d.recortado) mal.push("un texto se cortó con «…»");
  for (const c of d.contrastes) if (c.ratio < 4.5) mal.push(`«${c.texto}» con contraste ${c.ratio.toFixed(2)}:1`);
  return mal;
}

/** La tabla de los nombres: cuántos renglones y a qué tamaño, y si alguno se cortaría, para nombres de 8 a 72 letras. */
export function medirNombres(nombres: string[]): { nombre: string; letras: number; renglones: number; tamano: number; recortado: boolean }[] {
  const util = 1080 - 2 * MARGEN;
  return nombres.map((nombre) => {
    const a = nombreAjustado(nombre, util);
    return { nombre, letras: [...nombre].length, renglones: a.renglones.length, tamano: a.tamano, recortado: a.recortado };
  });
}

/** El color de origen y la base de una ficha (para elegir los casos del prototipo). */
export async function colorDeFicha(portada: Buffer | null, id: string) {
  const colores = await coloresDe(portada);
  const origen = origenDe(colores, id);
  return { colores, origen, base: paleta(origen).base, banda: paleta(origen).banda };
}

export { respaldoDe };
