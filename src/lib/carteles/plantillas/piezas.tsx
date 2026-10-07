import type { CSSProperties, ReactElement, ReactNode } from "react";
import { CAJA_SN, TRAZO_SN } from "../../simboloSN";
import { ajustar, ajustarRenglon, type Ajuste, type Caja, type Fuente } from "../medir";
import { DOMINIO_CARTEL, LETRA } from "../tokens";
import type { Contexto } from "./tipos";

/**
 * Las piezas que comparten las doce plantillas (OL-324). Son árboles para satori: cada `div` con más de un hijo lleva `display: flex`
 * (satori lo exige), las medidas son px del lienzo y el texto llega ya partido en renglones (`medir.ts`), así satori no decide ningún corte.
 *
 * Un texto se arma como `Bloque`: el elemento y su alto exacto (renglones × tamaño × interlineado). Con eso cada plantilla sabe cuánto ocupa
 * lo escrito antes de dibujar y le da a la foto lo que sobra: nada se encima ni se sale del lienzo por un título largo.
 */

export type Alinear = "left" | "center" | "right";
const ALINEAR: Record<Alinear, CSSProperties["alignItems"]> = { left: "flex-start", center: "center", right: "flex-end" };

/** Un pedazo del cartel con su alto ya calculado. `recortado`: su texto no cupo y lleva «…». */
export type Bloque = { el: ReactElement | null; alto: number; recortado?: boolean };
export const VACIO: Bloque = { el: null, alto: 0 };

/** El lienzo: el tamaño del formato, el fondo de la paleta y nada que se salga. */
export function Lienzo({ c, fondo, children }: { c: Contexto; fondo?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: c.formato.ancho, height: c.formato.alto, overflow: "hidden", backgroundColor: fondo ?? c.paleta.fondo, color: c.paleta.texto, fontFamily: "regular" }}>
      {children}
    </div>
  );
}

/* satori lee cada clave del estilo aunque valga `undefined` (y falla): las medidas opcionales se ponen solo si vienen. */

/** Algo colocado a mano en el lienzo (una foto, una franja, un adorno, un bloque de texto). */
export function Capa({ x, y, ancho, alto, estilo, children }: { x: number; y: number; ancho: number; alto?: number; estilo?: CSSProperties; children?: ReactNode }) {
  return <div style={{ display: "flex", position: "absolute", left: x, top: y, width: ancho, ...(alto === undefined ? {} : { height: alto }), ...estilo }}>{children}</div>;
}

/** Una foto que llena su caja (recortada al centro). */
export function Foto({ src, ancho, alto, estilo }: { src: string; ancho: number; alto: number; estilo?: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element -- no es una página: es el árbol que satori convierte en el cartel
  return <img src={src} width={ancho} height={alto} alt="" style={{ objectFit: "cover", width: ancho, height: alto, ...estilo }} />;
}

/** El alto de un texto ya ajustado. */
export const altoDe = (a: Ajuste, interlineado: number) => Math.ceil(a.renglones.length * a.tamano * interlineado);

/** Un texto ya partido: un renglón por línea, sin que satori lo vuelva a partir. */
export function renglones(ajuste: Ajuste, fuente: Fuente, color: string, { interlineado = 1.1, espaciado = 0, alinear = "left" as Alinear, estilo }: { interlineado?: number; espaciado?: number; alinear?: Alinear; estilo?: CSSProperties } = {}): Bloque {
  if (ajuste.renglones.length === 0) return VACIO;
  const el = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: ALINEAR[alinear], ...estilo }}>
      {ajuste.renglones.map((renglon, i) => (
        <div key={i} style={{ display: "flex", height: ajuste.tamano * interlineado, fontFamily: fuente, fontSize: ajuste.tamano, lineHeight: interlineado, letterSpacing: espaciado, color, whiteSpace: "nowrap" }}>
          {renglon}
        </div>
      ))}
    </div>
  );
  return { el, alto: altoDe(ajuste, interlineado), recortado: ajuste.recortado };
}

/** Mide y arma en un paso. El interlineado con que se pinta es el mismo con que se mide el alto (si la caja lo limita). */
export function texto(valor: string | null | undefined, caja: Caja, color: string, opciones: { interlineado?: number; alinear?: Alinear; estilo?: CSSProperties } = {}): Bloque {
  if (!valor) return VACIO;
  const interlineado = opciones.interlineado ?? caja.interlineado ?? 1.1;
  return renglones(ajustar(valor, { ...caja, interlineado }), caja.fuente, color, { ...opciones, interlineado, espaciado: caja.espaciado });
}

/** La etiqueta de arriba: mayúsculas espaciadas, un renglón. */
export function etiqueta(valor: string | null, ancho: number, color: string, alinear: Alinear = "left", tamano: number = LETRA.etiqueta): Bloque {
  return texto(valor, { fuente: "media", ancho, renglones: 1, mayor: tamano, menor: Math.min(tamano, LETRA.minimo - 2), espaciado: Math.round(tamano * 0.16), mayusculas: true }, color, { interlineado: 1.2, alinear });
}

/** El subtítulo: hasta dos renglones. */
export function subtitulo(valor: string | null, ancho: number, color: string, alinear: Alinear = "left", fuente: Fuente = "media"): Bloque {
  return texto(valor, { fuente, ancho, renglones: 2, mayor: LETRA.subtitulo, menor: 26 }, color, { interlineado: 1.15, alinear });
}

/** Bloques uno debajo de otro con `separacion` entre los que existen; su alto es la suma. */
export function columna(bloques: Bloque[], separacion: number, { alinear = "left" as Alinear, ancho, estilo }: { alinear?: Alinear; ancho?: number; estilo?: CSSProperties } = {}): Bloque {
  const hay = bloques.filter((b) => b.el);
  if (hay.length === 0) return VACIO;
  const alto = hay.reduce((suma, b) => suma + b.alto, 0) + separacion * (hay.length - 1);
  const el = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: ALINEAR[alinear], ...(ancho === undefined ? {} : { width: ancho }), height: alto, gap: separacion, ...estilo }}>
      {hay.map((b, i) => (
        <div key={i} style={{ display: "flex", height: b.alto }}>
          {b.el}
        </div>
      ))}
    </div>
  );
  return { el, alto, recortado: hay.some((b) => b.recortado) };
}

/** Bloques lado a lado (cada uno ya con su ancho); su alto es el del más alto. */
export function fila(bloques: Bloque[], { ancho, separacion = 0, estilo }: { ancho: number; separacion?: number; estilo?: CSSProperties }): Bloque {
  const hay = bloques.filter((b) => b.el);
  if (hay.length === 0) return VACIO;
  const alto = Math.max(...hay.map((b) => b.alto));
  const el = (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: ancho, height: alto, gap: separacion, ...estilo }}>
      {hay.map((b, i) => (
        <div key={i} style={{ display: "flex" }}>
          {b.el}
        </div>
      ))}
    </div>
  );
  return { el, alto, recortado: hay.some((b) => b.recortado) };
}

/**
 * Un dato con su detalle debajo («Sábado 11 de octubre» / «19:00 h»; «Teatro de la Paz» / «Pimpolina»): el principal hasta dos renglones y el
 * detalle hasta dos, cada uno al tamaño mayor que quepa.
 */
export function dato(principal: string | null, detalle: string | null, ancho: number, color: string, suave: string, alinear: Alinear = "left", tamano: number = LETRA.dato): Bloque {
  return columna(
    [texto(principal, { fuente: "media", ancho, renglones: 2, mayor: tamano, menor: 24 }, color, { interlineado: 1.15, alinear }), texto(detalle, { fuente: "regular", ancho, renglones: 2, mayor: LETRA.detalle, menor: LETRA.minimo }, suave, { interlineado: 1.2, alinear })],
    4,
    { alinear, ancho },
  );
}

/** El alto del símbolo SN del sello: poco más que las letras del pie, para que se lea como marca y no como adorno. */
const ALTO_SIMBOLO = 30;
/** Entre el símbolo y el dominio. */
const ENTRE_SIMBOLO = 12;

/**
 * El pie: el sello discreto (OL-336, pedido del founder): el símbolo SN de la app y el dominio (`DOMINIO_CARTEL`), en el sitio donde iba la
 * dirección corta y con su misma jerarquía (letra del pie, color suave). Siempre en el color suave de la paleta: todas las paletas lo prueban
 * con 4,5:1 sobre su fondo (`paleta.test.ts`), así el sello es AA en cualquier plantilla. El símbolo va como trazo en línea (satori lo vuelve
 * imagen sin pedir nada a la red). Sin sello no hay pie (lo decide el founder, doc 52 §4).
 */
export function pie(c: Contexto, ancho: number, alinear: Alinear = "left", { mayusculas = false, espaciado = 0 }: { mayusculas?: boolean; espaciado?: number } = {}): Bloque {
  if (!c.sello) return VACIO;
  const color = c.paleta.suave;
  const anchoSimbolo = Math.round((ALTO_SIMBOLO * CAJA_SN.ancho) / CAJA_SN.alto);
  const caja: Caja = { fuente: "regular", ancho: ancho - anchoSimbolo - ENTRE_SIMBOLO, renglones: 1, mayor: LETRA.pie, menor: 18, espaciado, mayusculas };
  const dominio = renglones(ajustarRenglon(DOMINIO_CARTEL, caja), "regular", color, { interlineado: 1.2, espaciado });
  const alto = Math.max(ALTO_SIMBOLO, dominio.alto);
  const el = (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: ALINEAR[alinear], width: ancho, height: alto, gap: ENTRE_SIMBOLO }}>
      <svg width={anchoSimbolo} height={ALTO_SIMBOLO} viewBox={`0 0 ${CAJA_SN.ancho} ${CAJA_SN.alto}`}>
        <path fill={color} d={TRAZO_SN} />
      </svg>
      {dominio.el}
    </div>
  );
  return { el, alto };
}

/**
 * Partes de un renglón unidas por « · », sin las que faltan («Sáb 11 oct · 19:00 h», o solo «Oct 2026» si no hay hora); null si no queda nada.
 * El punto va pegado a lo de antes con un espacio duro: si el texto se parte en renglones, ninguno empieza con «·».
 */
export function unir(...partes: (string | null | undefined)[]): string | null {
  return partes.filter(Boolean).join("\u00a0· ") || null;
}

/** Un filete (línea fina) de lado a lado de su caja. */
export function filete(ancho: number, color: string, grueso = 2): Bloque {
  return { el: <div style={{ display: "flex", width: ancho, height: grueso, backgroundColor: color }} />, alto: grueso };
}

/** Lo que va arriba del título en casi todas: la etiqueta a la izquierda y el precio a la derecha. */
export function cabecera(c: Contexto, ancho: number, colorEtiqueta: string, colorPrecio: string): Bloque {
  const mitad = Math.floor((ancho - 32) / 2);
  const precio = etiqueta(c.textos.precio, c.textos.etiqueta ? mitad : ancho, colorPrecio, "right");
  if (!c.textos.etiqueta) return fila([{ el: <div style={{ display: "flex" }} />, alto: 0 }, precio], { ancho });
  return fila([etiqueta(c.textos.etiqueta, mitad, colorEtiqueta), precio], { ancho });
}
