import type { ReactElement } from "react";
import { ajustar, ajustarRenglon, type Fuente } from "../medir";
import type { IdPaleta, Paleta } from "../paleta";
import { FORMATOS, LETRA, MARGEN, type IdFormato } from "../tokens";
import type { Contexto } from "./tipos";
import { Capa, pie, renglones, type Bloque } from "./piezas";

/**
 * La tarjeta de un artista o de un lugar destacado de la semana en Instagram (OL-479; firmada en el prototipo de OL-477, bitácora 509, «La
 * tarjeta»), con las piezas de «Crear cartel»: la portada a lo ancho arriba (3:2 como en las fichas; en la historia, más alta), la foto redonda
 * del artista montada sobre su borde con un aro del color del fondo, a su lado la ceja en mayúsculas espaciadas, la ciudad y la cuenta en el
 * acento; el nombre en la condensada negra, hasta dos renglones parejos; la próxima fecha (el artista) o «Esta semana: N eventos» (el lugar); y
 * el sello del pie (el símbolo SN y somosnosotrxs.org). La paleta sale del tono de la portada (`dibujar.ts`): cada semana se ve distinta sin
 * inventar color. En la historia todo el texto queda fuera de lo que tapa la interfaz de Instagram. Y la portada del carrusel «Esta semana».
 * Puro: recibe las imágenes ya preparadas (data URL) y la paleta; lo prueba `destacado.test.ts` con las cajas que da satori.
 */

/** Las paletas que admite la tarjeta: la primera es la de una portada sin color; el resto, las claras y las oscuras de «Crear cartel». */
export const PALETAS_DESTACADO: readonly IdPaleta[] = ["hueso", "papel", "crema", "durazno", "cielo", "menta", "noche", "marino", "bosque", "vino", "tinta"];

/** El alto de la portada (3:2 a lo ancho, como en las fichas) y, en la historia, más alta (sube lo que la interfaz tapa arriba). */
export const ALTO_PORTADA: Record<IdFormato, number> = { "4x5": 720, "9x16": 1000 };
/** La foto redonda: su diámetro y el aro del color del fondo que la separa de la portada. */
export const LADO_FOTO = 288;
const ARO = 12;

export type Destacado = {
  tipo: "artista" | "lugar";
  formato: IdFormato;
  /** La portada (data URL, ya recortada a lo ancho × `ALTO_PORTADA`) y la foto (solo el artista; data URL cuadrada). */
  portada: string;
  foto?: string | null;
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

/** Un renglón ajustado de un dato. */
const linea = (texto: string, fuente: Fuente, ancho: number, mayor: number, menor: number, color: string, espaciado = 0, mayusculas = false): Bloque =>
  renglones(ajustarRenglon(texto, { fuente, ancho, mayor, menor, espaciado, mayusculas }), fuente, color, { interlineado: 1.2, espaciado });

/** El árbol de la tarjeta para satori, en px del lienzo de 1080. `recortado`: algún texto se cortó con «…» o no cupo antes del pie. */
export function arbolDestacado(t: Destacado, paleta: Paleta): { elemento: ReactElement; recortado: boolean } {
  const f = FORMATOS[t.formato];
  const W = f.ancho;
  const H = f.alto;
  const util = W - 2 * MARGEN;
  const alto = ALTO_PORTADA[t.formato];
  const ctx = { sello: true, paleta } as Contexto;
  const capas: ReactElement[] = [];
  let recortado = false;
  capas.push(
    <Capa key="portada" x={0} y={0} ancho={W} alto={alto}>
      {/* eslint-disable-next-line @next/next/no-img-element -- árbol de satori, no una página */}
      <img src={t.portada} width={W} height={alto} alt="" style={{ width: W, height: alto, objectFit: "cover" }} />
    </Capa>,
  );
  let y: number;
  const foto = t.tipo === "artista" ? t.foto : null;
  if (foto) {
    const caja = LADO_FOTO + 2 * ARO;
    capas.push(
      <Capa key="aro" x={MARGEN - ARO} y={alto - caja / 2} ancho={caja} alto={caja} estilo={{ borderRadius: caja / 2, backgroundColor: paleta.fondo, alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- árbol de satori, no una página */}
        <img src={foto} width={LADO_FOTO} height={LADO_FOTO} alt="" style={{ width: LADO_FOTO, height: LADO_FOTO, borderRadius: LADO_FOTO / 2, objectFit: "cover" }} />
      </Capa>,
    );
    const x = MARGEN + LADO_FOTO + 40;
    const ancho = W - x - MARGEN;
    const ceja = linea(t.ceja, "media", ancho, 26, LETRA.minimo, paleta.suave, 4, true);
    const ciudad = linea(t.ciudad, "media", ancho, 36, 26, paleta.texto);
    const cuenta = t.cuenta ? linea(`@${t.cuenta}`, "media", ancho, 36, 24, paleta.acento) : null;
    capas.push(
      <Capa key="lado" x={x} y={alto + 28} ancho={ancho} estilo={{ flexDirection: "column", gap: 10 }}>
        {ceja.el}
        {ciudad.el}
        {cuenta?.el}
      </Capa>,
    );
    y = alto + caja / 2 + 36;
  } else {
    const ceja = linea(`${t.ceja} · ${t.ciudad}`, "media", util, 26, LETRA.minimo, paleta.suave, 4, true);
    capas.push(
      <Capa key="ceja" x={MARGEN} y={alto + 44} ancho={util}>
        {ceja.el}
      </Capa>,
    );
    y = alto + 44 + ceja.alto + 16;
  }
  // El nombre, protagonista: la condensada negra, hasta dos renglones parejos.
  const nombre = ajustar(t.nombre, { fuente: "condensada-negra", ancho: util, renglones: 2, mayor: 112, menor: 64, parejo: true });
  recortado ||= nombre.recortado;
  const bNombre = renglones(nombre, "condensada-negra", paleta.texto, { interlineado: 0.98 });
  capas.push(
    <Capa key="nombre" x={MARGEN} y={y} ancho={util}>
      {bNombre.el}
    </Capa>,
  );
  y += bNombre.alto + 24;
  if (!foto && t.cuenta) {
    const cuenta = linea(`@${t.cuenta}`, "media", util, 36, 24, paleta.acento);
    capas.push(
      <Capa key="cuenta" x={MARGEN} y={y} ancho={util}>
        {cuenta.el}
      </Capa>,
    );
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
  // El sello del pie, sobre lo que tapa la interfaz en la historia.
  const sello = pie(ctx, util);
  const yPie = H - Math.max(MARGEN - 8, f.tapaAbajo) - sello.alto;
  if (y > yPie) recortado = true;
  capas.push(
    <Capa key="pie" x={MARGEN} y={yPie} ancho={util}>
      {sello.el}
    </Capa>,
  );
  return {
    elemento: <div style={{ display: "flex", position: "relative", width: W, height: H, overflow: "hidden", backgroundColor: paleta.fondo, fontFamily: "regular" }}>{capas}</div>,
    recortado,
  };
}

export type PortadaSemana = { ciudad: string; titulo: string; eventos: { cuando: string; titulo: string }[] };

/** La portada del carrusel «Esta semana» (papel): la ciudad, los días en grande y hasta tres eventos con su día y hora. */
export function arbolPortadaSemana(s: PortadaSemana, paleta: Paleta): { elemento: ReactElement; recortado: boolean } {
  const f = FORMATOS["4x5"];
  const util = f.ancho - 2 * MARGEN;
  const ceja = linea(`Esta semana en ${s.ciudad}`, "media", util, 26, LETRA.minimo, paleta.acento, 4, true);
  const grande = ajustar(s.titulo, { fuente: "condensada-negra", ancho: util, renglones: 3, mayor: 150, menor: 90, parejo: true });
  const bTitulo = renglones(grande, "condensada-negra", paleta.texto, { interlineado: 0.95 });
  let recortado = grande.recortado;
  const lista = s.eventos.slice(0, 3).map((e, i) => {
    const t = ajustar(e.titulo, { fuente: "media", ancho: util, renglones: 2, mayor: 40, menor: 28 });
    recortado ||= t.recortado;
    return (
      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 22, borderTop: `3px solid ${paleta.texto}` }}>
        {linea(e.cuando, "media", util, 24, LETRA.minimo, paleta.suave, 4, true).el}
        {renglones(t, "media", paleta.texto, { interlineado: 1.12 }).el}
      </div>
    );
  });
  const sello = pie({ sello: true, paleta } as Contexto, util);
  return {
    elemento: (
      <div style={{ display: "flex", flexDirection: "column", width: f.ancho, height: f.alto, padding: MARGEN, backgroundColor: paleta.fondo, fontFamily: "regular" }}>
        {ceja.el}
        <div style={{ display: "flex", marginTop: 28 }}>{bTitulo.el}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 56 }}>{lista}</div>
        <div style={{ display: "flex", marginTop: "auto" }}>{sello.el}</div>
      </div>
    ),
    recortado,
  };
}
