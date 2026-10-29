// OL-477 (bitácora 509), solo prototipo: la tarjeta 4:5 (y 9:16) de un artista y de un lugar destacados de la semana en Instagram, la portada de
// «Esta semana» y el texto de cada publicación, dibujados con las MISMAS piezas de «Crear cartel» (`src/lib/carteles`: satori y sharp, las cinco
// instancias de Bricolage, la medida de `medir.ts`, las paletas probadas de `paleta.ts`, los tokens de `tokens.ts`, el sello `pie()` con el
// símbolo SN y somosnosotrxs.org) y las reglas del texto de Instagram que ya existen (`src/lib/instagram/texto.ts`: `hashtag`, `revisarTexto`,
// la cuenta). No es código de la app: lo empaqueta y lo corre `instagram-calendario-tarjetas.mjs`; el código va tras la firma (plan en la bitácora).
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import satori from "satori";
import sharp from "sharp";
import * as Iconos from "@/components/ui/Iconos";
import { ajustar, ajustarRenglon, FUENTES, type Fuente } from "@/lib/carteles/medir";
import { elegirPaleta, type IdPaleta, type Paleta, type Rgb } from "@/lib/carteles/paleta";
import { pie, renglones, type Bloque } from "@/lib/carteles/plantillas/piezas";
import type { Contexto } from "@/lib/carteles/plantillas/tipos";
import { FORMATOS, LETRA, MARGEN, type Formato, type IdFormato } from "@/lib/carteles/tokens";
import { CUENTA_INSTAGRAM, hashtag, revisarTexto } from "@/lib/instagram/texto";

// ===== Las tarjetas

/** Las paletas que admite la tarjeta: la primera es la de una portada sin color; el resto, las claras y las oscuras de «Crear cartel». */
export const PALETAS_TARJETA: readonly IdPaleta[] = ["hueso", "papel", "crema", "durazno", "cielo", "menta", "noche", "marino", "bosque", "vino", "tinta"];

/** El alto de la portada (3:2 a lo ancho, como en las fichas) y, en la historia, más alta (sube lo que la interfaz tapa arriba). */
const PORTADA = { "4x5": 720, "9x16": 1000 } as const;
/** La foto redonda: su diámetro y el aro del color del fondo que la separa de la portada. */
const FOTO = 288;
const ARO = 12;

export type Tarjeta = {
  tipo: "artista" | "lugar";
  formato: IdFormato;
  /** Bytes de la portada y de la foto (la foto solo en el artista). */
  portada: Buffer;
  foto?: Buffer | null;
  nombre: string;
  /** La ceja en mayúsculas: «Música · Canción» o «Museo». */
  ceja: string;
  ciudad: string;
  cuenta: string | null;
  /** El artista con fecha próxima: «Vie 16 de oct, 7:00 pm · Teatro de la Paz». */
  proxima?: string | null;
  /** El lugar con eventos esta semana: «Esta semana: 2 eventos». */
  semana?: string | null;
};

export type Dibujada = { png: Buffer; jpeg: Buffer; ancho: number; alto: number; paleta: string; nodos: Nodo[]; recortado: boolean };
type Nodo = { texto: string; x: number; y: number; ancho: number; alto: number };

let fuentes: { name: string; data: Buffer; weight: 400; style: "normal" }[] | null = null;
function cargarFuentes() {
  const carpeta = path.join(process.cwd(), "src/lib/carteles/fuentes");
  fuentes ??= FUENTES.map((nombre) => ({ name: nombre, data: readFileSync(path.join(carpeta, `bricolage-${nombre}.ttf`)), weight: 400 as const, style: "normal" as const }));
  return fuentes;
}

/** El tono que manda en la portada (como `tonoDominante` de `dibujar.ts`: una miniatura de 64 y `stats().dominant`). */
async function tono(imagen: Buffer): Promise<Rgb> {
  const mini = await sharp(imagen).rotate().resize(64, 64, { fit: "inside" }).png().toBuffer();
  return (await sharp(mini).stats()).dominant;
}

const aDataUrl = async (imagen: Buffer, ancho: number, alto: number) => `data:image/jpeg;base64,${(await sharp(imagen).rotate().resize(ancho, alto, { fit: "cover", position: "attention" }).jpeg({ quality: 86 }).toBuffer()).toString("base64")}`;

/** Algo colocado a mano en el lienzo. */
const Capa = ({ x, y, ancho, alto, children, estilo }: { x: number; y: number; ancho: number; alto?: number; children?: ReactNode; estilo?: Record<string, unknown> }) => (
  <div style={{ display: "flex", position: "absolute", left: x, top: y, width: ancho, ...(alto === undefined ? {} : { height: alto }), ...estilo }}>{children}</div>
);

/** Un renglón ajustado de un dato. */
const linea = (texto: string, fuente: Fuente, ancho: number, mayor: number, menor: number, color: string, espaciado = 0, mayusculas = false): Bloque =>
  renglones(ajustarRenglon(texto, { fuente, ancho, mayor, menor, espaciado, mayusculas }), fuente, color, { interlineado: 1.2, espaciado });

/** El árbol de la tarjeta para satori. Todo en px del lienzo de 1080. */
async function arbol(t: Tarjeta, f: Formato, paleta: Paleta): Promise<{ el: ReactElement; recortado: boolean }> {
  const W = f.ancho;
  const H = f.alto;
  const util = W - 2 * MARGEN;
  const alto = PORTADA[t.formato];
  const portada = await aDataUrl(t.portada, W, alto);
  const foto = t.tipo === "artista" && t.foto ? await aDataUrl(t.foto, FOTO * 2, FOTO * 2) : null;
  const ctx = { sello: true, paleta } as Contexto;
  const capas: ReactElement[] = [];
  let recortado = false;
  // La portada a lo ancho, arriba (en la historia, también bajo lo que tapa la interfaz: es imagen, no texto).
  capas.push(
    <Capa key="portada" x={0} y={0} ancho={W} alto={alto}>
      {/* eslint-disable-next-line @next/next/no-img-element -- árbol de satori, no una página */}
      <img src={portada} width={W} height={alto} alt="" style={{ width: W, height: alto, objectFit: "cover" }} />
    </Capa>,
  );
  let y: number;
  if (foto) {
    // La foto redonda, con su aro del color del fondo, montada sobre el borde de la portada; a su derecha la ceja, la ciudad y la cuenta.
    const caja = FOTO + 2 * ARO;
    capas.push(
      <Capa key="aro" x={MARGEN - ARO} y={alto - caja / 2} ancho={caja} alto={caja} estilo={{ borderRadius: caja / 2, backgroundColor: paleta.fondo, alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- árbol de satori, no una página */}
        <img src={foto} width={FOTO} height={FOTO} alt="" style={{ width: FOTO, height: FOTO, borderRadius: FOTO / 2, objectFit: "cover" }} />
      </Capa>,
    );
    const x = MARGEN + FOTO + 40;
    const ancho = W - x - MARGEN;
    const ceja = linea(t.ceja, "media", ancho, 26, LETRA.minimo, paleta.suave, 4, true);
    const ciudad = linea(t.ciudad, "media", ancho, 36, 26, paleta.texto);
    const cuenta = t.cuenta ? linea(`@${t.cuenta}`, "media", ancho, 36, 24, paleta.acento) : null;
    const y0 = alto + 28;
    capas.push(
      <Capa key="lado" x={x} y={y0} ancho={ancho} estilo={{ flexDirection: "column", gap: 10 }}>
        {ceja.el}
        {ciudad.el}
        {cuenta?.el}
      </Capa>,
    );
    y = alto + caja / 2 + 36;
  } else {
    const ceja = linea(`${t.ceja} · ${t.ciudad}`, "media", util, 26, LETRA.minimo, paleta.suave, 4, true);
    capas.push(<Capa key="ceja" x={MARGEN} y={alto + 44} ancho={util}>{ceja.el}</Capa>);
    y = alto + 44 + ceja.alto + 16;
  }
  // El nombre, protagonista: la condensada negra, hasta dos renglones parejos.
  const nombre = ajustar(t.nombre, { fuente: "condensada-negra", ancho: util, renglones: 2, mayor: 112, menor: 64, parejo: true });
  recortado ||= nombre.recortado;
  const bNombre = renglones(nombre, "condensada-negra", paleta.texto, { interlineado: 0.98 });
  capas.push(<Capa key="nombre" x={MARGEN} y={y} ancho={util}>{bNombre.el}</Capa>);
  y += bNombre.alto + 24;
  if (!foto && t.cuenta) {
    const cuenta = linea(`@${t.cuenta}`, "media", util, 36, 24, paleta.acento);
    capas.push(<Capa key="cuenta" x={MARGEN} y={y} ancho={util}>{cuenta.el}</Capa>);
    y += cuenta.alto + 24;
  }
  if (t.proxima) {
    const etiqueta = linea("Próxima fecha", "media", util, 24, LETRA.minimo, paleta.suave, 4, true);
    const dato = renglones(ajustar(t.proxima, { fuente: "media", ancho: util, renglones: 2, mayor: LETRA.dato, menor: 26 }), "media", paleta.texto, { interlineado: 1.15 });
    recortado ||= !!dato.recortado;
    capas.push(
      <Capa key="proxima" x={MARGEN} y={y} ancho={util} estilo={{ flexDirection: "column", gap: 6 }}>
        {etiqueta.el}
        {dato.el}
      </Capa>,
    );
    y += etiqueta.alto + 6 + dato.alto + 24;
  }
  if (t.semana) {
    const dato = linea(t.semana, "media", util - 56, LETRA.dato, 26, paleta.sobreAcento);
    capas.push(
      <Capa key="semana" x={MARGEN} y={y} ancho={util}>
        <div style={{ display: "flex", padding: "14px 28px", borderRadius: 999, backgroundColor: paleta.acento }}>{dato.el}</div>
      </Capa>,
    );
    y += dato.alto + 28 + 24;
  }
  // El sello del pie (`pie()` de «Crear cartel»: el símbolo SN y somosnosotrxs.org), sobre lo que tapa la interfaz en la historia.
  const sello = pie(ctx, util);
  const yPie = H - Math.max(MARGEN - 8, f.tapaAbajo) - sello.alto;
  if (y > yPie) recortado = true;
  capas.push(<Capa key="pie" x={MARGEN} y={yPie} ancho={util}>{sello.el}</Capa>);
  return {
    el: <div style={{ display: "flex", position: "relative", width: W, height: H, overflow: "hidden", backgroundColor: paleta.fondo, fontFamily: "regular" }}>{capas}</div>,
    recortado,
  };
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
  const jpeg = await sharp(png).flatten({ background: fondo }).resize({ width: 720 }).jpeg({ quality: 86, chromaSubsampling: "4:4:4" }).toBuffer();
  return { png, jpeg, nodos };
}

export async function dibujarTarjeta(t: Tarjeta): Promise<Dibujada> {
  const f = FORMATOS[t.formato];
  const paleta = elegirPaleta(PALETAS_TARJETA, await tono(t.portada));
  const { el, recortado } = await arbol(t, f, paleta);
  const r = await rasterizar(el, f, paleta.fondo);
  return { ...r, ancho: f.ancho, alto: f.alto, paleta: paleta.id, recortado };
}

/** La portada del carrusel «Esta semana» (la idea de OL-464, sin dibujo hasta hoy): papel, la semana y sus tres eventos. */
export async function dibujarPortadaSemana({ ciudad, titulo, eventos }: { ciudad: string; titulo: string; eventos: { cuando: string; titulo: string }[] }): Promise<Dibujada> {
  const f = FORMATOS["4x5"];
  const paleta = elegirPaleta(["papel"], null);
  const util = f.ancho - 2 * MARGEN;
  const ceja = linea(`Esta semana en ${ciudad}`, "media", util, 26, LETRA.minimo, paleta.acento, 4, true);
  const grande = ajustar(titulo, { fuente: "condensada-negra", ancho: util, renglones: 3, mayor: 150, menor: 90, parejo: true });
  const bTitulo = renglones(grande, "condensada-negra", paleta.texto, { interlineado: 0.95 });
  const lista = eventos.slice(0, 3).map((e, i) => (
    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 22, borderTop: `3px solid ${paleta.texto}` }}>
      {linea(e.cuando, "media", util, 24, LETRA.minimo, paleta.suave, 4, true).el}
      {renglones(ajustar(e.titulo, { fuente: "media", ancho: util, renglones: 2, mayor: 40, menor: 28 }), "media", paleta.texto, { interlineado: 1.12 }).el}
    </div>
  ));
  const sello = pie({ sello: true, paleta } as Contexto, util);
  const el = (
    <div style={{ display: "flex", flexDirection: "column", width: f.ancho, height: f.alto, padding: MARGEN, backgroundColor: paleta.fondo, fontFamily: "regular" }}>
      {ceja.el}
      <div style={{ display: "flex", marginTop: 28 }}>{bTitulo.el}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 56 }}>{lista}</div>
      <div style={{ display: "flex", marginTop: "auto" }}>{sello.el}</div>
    </div>
  );
  const r = await rasterizar(el, f, paleta.fondo);
  return { ...r, ancho: f.ancho, alto: f.alto, paleta: paleta.id, recortado: grande.recortado };
}

/** Comprobación de la tarjeta: ningún texto fuera del lienzo ni (en la historia) en lo que tapa la interfaz, y ninguno encima de otro. */
export function revisarNodos(d: Dibujada, formato: IdFormato): string[] {
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
  return mal;
}

// ===== El texto de la publicación

/** La frase gancho: las primeras oraciones de la descripción hasta tener 60 letras, sin pasar de 220 (cortada en una oración, nunca a media). */
export function gancho(descripcion: string): string {
  const oraciones = descripcion.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+/g) ?? [descripcion];
  let frase = "";
  for (const o of oraciones) {
    const junto = `${frase} ${o.trim()}`.trim();
    if (frase && junto.length > 220) break;
    frase = junto;
    if (frase.length >= 60) break;
  }
  return frase;
}

const DISCIPLINA: Record<string, string> = { musica: "Musica", teatro: "Teatro", danza: "Danza", artes_visuales: "ArteVisual", letras: "Literatura", cine: "Cine", circo: "Circo" };
const TIPO_LUGAR: Record<string, string> = { museo: "Museo", galeria: "Galeria", foro: "Foro", casa_de_cultura: "CasaDeCultura", biblioteca: "Biblioteca", cafe: "Cafe", bar: "Bar" };

export type TextoArtista = { nombre: string; slug: string; descripcion: string; disciplina: string; ceja: string; ciudad: string; cuenta: string; proxima?: { cuando: string; lugar: string; cuentaLugar?: string | null } | null };
export type TextoLugar = { nombre: string; slug: string; descripcion: string; ceja: string; tipo: string; ciudad: string; direccion: string; cuenta: string | null; semana: { cuando: string; titulo: string }[] };

/**
 * El texto del artista: la frase gancho (lo que Instagram deja ver antes de «más»), lo que hace y su ciudad, su próxima fecha si la tiene, la
 * ficha (no se puede tocar: «enlace en la bio»), su cuenta y el crédito de la foto, la invitación a seguir la cuenta y de 3 a 5 etiquetas.
 */
export function textoArtista(a: TextoArtista): string {
  const proxima = a.proxima ? `Próxima fecha: ${a.proxima.cuando}, en ${a.proxima.lugar}${a.proxima.cuentaLugar ? ` @${a.proxima.cuentaLugar}` : ""}.` : null;
  const etiquetas = [hashtag(a.ciudad), "#ArtistasLocales", DISCIPLINA[a.disciplina] ? `#${DISCIPLINA[a.disciplina]}` : null, "#SomosNosotrxs"].filter(Boolean);
  return [
    gancho(a.descripcion),
    [`${a.ceja} · ${a.ciudad}`, proxima].filter(Boolean).join("\n"),
    `Lee su ficha en somosnosotrxs.org/artistas/${a.slug} (enlace en la bio).\nMás de su trabajo en @${a.cuenta}\nFoto: @${a.cuenta}`,
    `Sigue a @${CUENTA_INSTAGRAM} para conocer a más artistas de tu ciudad.`,
    etiquetas.join(" "),
  ].join("\n\n");
}

/** El texto del lugar: su frase gancho, qué es y dónde, lo que tiene esta semana, la ficha, su cuenta y el crédito, la invitación y las etiquetas. */
export function textoLugar(l: TextoLugar): string {
  const semana = l.semana.length ? `Esta semana: ${l.semana.map((e) => `${e.titulo} (${e.cuando})`).join(" y ")}.` : null;
  const etiquetas = [hashtag(l.ciudad), "#EspaciosCulturales", TIPO_LUGAR[l.tipo] ? `#${TIPO_LUGAR[l.tipo]}` : null, "#SomosNosotrxs"].filter(Boolean);
  return [
    gancho(l.descripcion),
    [`${l.ceja} · ${l.ciudad}`, `📍 ${l.direccion}`, semana].filter(Boolean).join("\n"),
    [`Lee su ficha en somosnosotrxs.org/lugares/${l.slug} (enlace en la bio).`, ...(l.cuenta ? [`Más en @${l.cuenta}`, `Foto: @${l.cuenta}`] : [])].join("\n"),
    `Sigue a @${CUENTA_INSTAGRAM} para conocer más lugares de tu ciudad.`,
    etiquetas.join(" "),
  ].join("\n\n");
}

/** El mensaje directo de la semana anterior: qué día, qué se publica, el crédito y cómo decir que no. */
export function avisoPrevio({ saludo, dia, ficha }: { saludo: string; dia: string; ficha: string }): string {
  return [
    `¡Hola, ${saludo}! Te escribimos de Somos Nosotrxs (@${CUENTA_INSTAGRAM}), la agenda cultural de la ciudad.`,
    `El ${dia} queremos presentarte en nuestro Instagram entre lxs artistas destacadxs de la semana: tu foto, tu portada y lo que dice tu ficha (${ficha}), con el crédito de la foto a tu cuenta.`,
    "Si prefieres que no, contéstanos «no» y no se publica. Si quieres cambiar algo de tu ficha antes, lo puedes hacer desde la app o decirnos por aquí.",
  ].join("\n\n");
}

export { revisarTexto };

// ===== Los iconos de producción (para el prototipo: los mismos SVG que pinta la app)

export function iconos(nombres: readonly string[], tam = 22): Record<string, string> {
  const todos = Iconos as unknown as Record<string, (p: Record<string, unknown>) => ReactElement>;
  return Object.fromEntries(nombres.map((n) => { if (!todos[n]) throw new Error("sin icono " + n); return [n, renderToStaticMarkup(todos[n]({ width: tam, height: tam }))]; }));
}
