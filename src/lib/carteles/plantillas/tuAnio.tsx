import { createElement, type ReactElement } from "react";
import { CAJA_SN, TRAZO_SN } from "../../simboloSN";
import { composicionDe, CREMA, NEGRO, paleta } from "../../portadasSistema";
import { cejaDe, cifra, claseDeFigura, type ResumenTuAnio } from "../../tuAnio";
import { ajustar, ajustarRenglon, anchoTexto, type Fuente } from "../medir";
import { FORMATOS, type Formato } from "../tokens";
import { renglones, type Bloque } from "./piezas";

/**
 * La imagen de «Tu año» (OL-394), composición «calma» sobre crema del prototipo firmado (`tu-anio-propuestas.html`, OL-392: `htmlLienzo` con
 * C calma · E crema · D cifras y lo más · N nombre y foto). No es una plantilla de evento del catálogo (`CATALOGO`): recibe un resumen ya armado
 * (`tuAnio.ts`) y se dibuja con el mismo motor (satori y sharp, `dibujar.ts`), en publicación 4:5 (1080×1350). Todo en px del lienzo, los del
 * CSS `.lienzo`, `.calma`, `.hero-num`, `.secs`, `.mas-l`, `.quien-l` y `.pie-l` de la página:
 *  · arriba la foto redonda de 96 y el nombre (44) con su ceja (26, mayúsculas espaciadas, gris);
 *  · el número protagonista a 440 (interlineado 0,82, −0,03 em), su frase a 50 y «Tu 2026 · del 17 sep al 12 oct» en gris a 50 (el CSS decía
 *    32, pero `.calma .hero-num p` le ganaba: lo que se firmó, en la captura 01, va a 50); a su derecha la figura de las portadas del sistema,
 *    de 300, sin tocar texto;
 *  · los dos secundarios a 96 con su palabra en mayúsculas chicas (30); la línea de «lo más» a 38;
 *  · abajo el símbolo SN y el dominio en gris, 48 debajo de lo último (como en la captura firmada, no pegados al pie del lienzo).
 * Lo que no cabe baja de tamaño con la caja de `medir.ts` (un número de tres o cuatro cifras, un nombre largo), como en las otras plantillas.
 * Una sola fuente, la instancia condensada negra que ya hay (wdth 75, wght 800): el prototipo usaba la condensada en pesos de 500 a 800, que no
 * hay como archivo; lo suave se distingue solo por el gris.
 */

/** El formato de la imagen: solo publicación 4:5 (F firmado). */
export const FORMATO_TU_ANIO: Formato = FORMATOS["4x5"];

/** Los tres colores: el crema y el negro de las portadas del sistema y el gris de la app (`--texto-suave`). */
export const COLORES_TU_ANIO = { fondo: CREMA, tinta: NEGRO, suave: "#5c5c5c" } as const;

/** El dominio del pie (el de la app, como en el prototipo; el cartel de evento lleva `DOMINIO_CARTEL`). */
export const DOMINIO_TU_ANIO = "somosnosotros.org";

const MARGEN = 80;
const ANCHO_UTIL = FORMATO_TU_ANIO.ancho - 2 * MARGEN; // 920
const FOTO = 96;
const ENTRE_FOTO = 24;
const SEPARACION = 48;
const FIGURA = 300;
const ENTRE_FIGURA = 40;
/** El ancho de la columna del número: lo útil menos la figura y su aire. */
const ANCHO_HERO = ANCHO_UTIL - FIGURA - ENTRE_FIGURA; // 580
const HERO = { mayor: 440, menor: 160, interlineado: 0.82, espaciado: -0.03 };
const NEGRA: Fuente = "condensada-negra";
/** Lo suave (el «Donde más fuiste:», el dominio): la misma condensada, en gris. */
const SUAVE: Fuente = NEGRA;

/** El tamaño mayor (de 440 a 160, de 4 en 4) con el que el número cabe en su columna, con su espaciado de −0,03 em. */
export function tamanoHero(texto: string, ancho = ANCHO_HERO): number {
  for (let t = HERO.mayor; t > HERO.menor; t -= 4) if (anchoTexto(texto, NEGRA, t, HERO.espaciado * t) <= ancho) return t;
  return HERO.menor;
}

/** Las formas (`<circle>`, `<rect>`, `<polygon>`) que da una composición de las portadas, como elementos de React para satori. */
function formas(svg: readonly string[], desde: number): ReactElement[] {
  return svg.flatMap((s, i) => {
    const m = /^<(circle|rect|polygon)\s+([^>]*?)\s*\/>$/.exec(s);
    if (!m) return [];
    const atributos = Object.fromEntries([...m[2].matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    return [createElement(m[1], { key: desde + i, ...atributos })];
  });
}

/**
 * La figura de las portadas del sistema (`composicionDe`, la misma que en Inicio): la de la clase del sujeto (taller la persona, festival el
 * artista, exposición el lugar) y la de su id, con la paleta de su color, en una caja de 100 sin márgenes ni sello. Como en el prototipo
 * (`figura`): `H` 100, `M` 0, lo libre de arriba 0 y el sello fuera.
 */
export function figuraTuAnio(resumen: Pick<ResumenTuAnio, "color" | "quien">, id: string, tam = FIGURA): ReactElement {
  const P = paleta(resumen.color);
  const comp = composicionDe(claseDeFigura(resumen.quien.tipo), id);
  const [atras, delante] = comp.f({ H: 100, M: 0, P, s: comp.s, arriba: 0, selloIzq: 100, selloAbajo: 0, tope: 100 });
  return (
    <svg width={tam} height={tam} viewBox="0 0 100 100">
      {[...formas(atras, 0), ...formas(delante, atras.length)]}
    </svg>
  );
}

/** «Donde más fuiste: **MAC** · 5 veces» en un renglón: el tamaño mayor (de 38 a 28) en que cabe; si ni así, el nombre se corta con «…». */
function lineaMas(mas: NonNullable<ResumenTuAnio["mas"]>): Bloque {
  const antes = `${mas.que}: `;
  const despues = mas.cuantas ? ` · ${mas.cuantas}` : "";
  const mide = (t: number, quien: string) => anchoTexto(antes, SUAVE, t) + anchoTexto(quien, NEGRA, t) + anchoTexto(despues, SUAVE, t);
  let tamano = 28;
  for (let t = 38; t >= 28; t -= 2) {
    if (mide(t, mas.quien) <= ANCHO_UTIL) {
      tamano = t;
      break;
    }
  }
  const resto = ANCHO_UTIL - anchoTexto(antes, SUAVE, tamano) - anchoTexto(despues, SUAVE, tamano);
  const quien = mide(tamano, mas.quien) <= ANCHO_UTIL ? mas.quien : (ajustarRenglon(mas.quien, { fuente: NEGRA, ancho: resto, mayor: tamano, menor: tamano }).renglones[0] ?? "…");
  const alto = Math.ceil(tamano * 1.3);
  const parte = (texto: string, fuente: Fuente, color: string) => <div style={{ display: "flex", fontFamily: fuente, fontSize: tamano, lineHeight: 1.3, color, whiteSpace: "nowrap" }}>{texto}</div>;
  return {
    el: (
      <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", width: ANCHO_UTIL, height: alto }}>
        {parte(antes, SUAVE, COLORES_TU_ANIO.suave)}
        {parte(quien, NEGRA, COLORES_TU_ANIO.tinta)}
        {despues && parte(despues, SUAVE, COLORES_TU_ANIO.suave)}
      </div>
    ),
    alto,
  };
}

/** Lo que recibe la plantilla: el resumen, el id (la figura) y la foto ya recortada en cuadrado (data URL) o nada. */
export type ContextoTuAnio = { resumen: ResumenTuAnio; id: string; foto: string | null };

/** El árbol de la imagen para satori. Cada `div` con más de un hijo lleva `display: flex` (satori lo exige). */
export function dibujarTuAnio({ resumen: r, id, foto }: ContextoTuAnio): { elemento: ReactElement } {
  const { fondo, tinta, suave } = COLORES_TU_ANIO;
  const f = FORMATO_TU_ANIO;
  // Arriba: la foto redonda y el nombre con su ceja.
  const anchoNombre = ANCHO_UTIL - (foto ? FOTO + ENTRE_FOTO : 0);
  const ceja = renglones(ajustarRenglon(cejaDe(r.quien.tipo).toLocaleUpperCase("es-MX"), { fuente: NEGRA, ancho: anchoNombre, mayor: 26, menor: 22, espaciado: 2.6 }), NEGRA, suave, { interlineado: 1.2, espaciado: 2.6 });
  const nombre = renglones(ajustar(r.quien.nombre, { fuente: NEGRA, ancho: anchoNombre, renglones: 2, mayor: 44, menor: 32 }), NEGRA, tinta, { interlineado: 1.05 });
  // El número, su frase y el periodo.
  const numero = cifra(r.protagonista.n);
  const tamano = tamanoHero(numero);
  const frase = renglones(ajustar(r.protagonista.frase, { fuente: NEGRA, ancho: ANCHO_HERO, renglones: 2, mayor: 50, menor: 36 }), NEGRA, tinta, { interlineado: 1.1 });
  const periodo = renglones(ajustarRenglon(`${r.periodo.titulo} · ${r.periodo.desde}`, { fuente: NEGRA, ancho: ANCHO_HERO, mayor: 50, menor: 32 }), NEGRA, suave, { interlineado: 1.1 });
  const mas = r.mas ? lineaMas(r.mas) : null;
  const anchoSimbolo = 96;
  const altoSimbolo = Math.round((anchoSimbolo * CAJA_SN.alto) / CAJA_SN.ancho);
  const elemento = (
    <div style={{ display: "flex", flexDirection: "column", width: f.ancho, height: f.alto, padding: MARGEN, backgroundColor: fondo, color: tinta, fontFamily: NEGRA, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", width: ANCHO_UTIL }}>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element -- no es una página: es el árbol que satori convierte en la imagen
          <img src={foto} width={FOTO} height={FOTO} alt="" style={{ width: FOTO, height: FOTO, borderRadius: FOTO / 2, objectFit: "cover", marginRight: ENTRE_FOTO }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", width: anchoNombre }}>
          {ceja.el}
          <div style={{ display: "flex", marginTop: 4 }}>{nombre.el}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", width: ANCHO_UTIL, marginTop: SEPARACION + 40 }}>
        <div style={{ display: "flex", flexDirection: "column", width: ANCHO_HERO }}>
          <div style={{ display: "flex", fontFamily: NEGRA, fontSize: tamano, lineHeight: HERO.interlineado, letterSpacing: HERO.espaciado * tamano, height: Math.round(tamano * HERO.interlineado), whiteSpace: "nowrap", color: tinta }}>{numero}</div>
          <div style={{ display: "flex", marginTop: 18 }}>{frase.el}</div>
          <div style={{ display: "flex", marginTop: 10 }}>{periodo.el}</div>
        </div>
        {figuraTuAnio(r, id)}
      </div>
      {r.secundarios.length > 0 && (
        <div style={{ display: "flex", flexDirection: "row", marginTop: SEPARACION }}>
          {r.secundarios.map((s, i) => (
            <div key={s.palabra} style={{ display: "flex", flexDirection: "column", marginLeft: i === 0 ? 0 : 72 }}>
              <div style={{ display: "flex", fontSize: 96, lineHeight: 1, height: 96, color: tinta }}>{cifra(s.n)}</div>
              <div style={{ display: "flex", marginTop: 6, fontSize: 30, lineHeight: 1.2, letterSpacing: 1.8, color: suave }}>{s.palabra.toLocaleUpperCase("es-MX")}</div>
            </div>
          ))}
        </div>
      )}
      {mas && <div style={{ display: "flex", marginTop: SEPARACION }}>{mas.el}</div>}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: ANCHO_UTIL, marginTop: SEPARACION }}>
        <svg width={anchoSimbolo} height={altoSimbolo} viewBox={`0 0 ${CAJA_SN.ancho} ${CAJA_SN.alto}`}>
          <path fill={tinta} d={TRAZO_SN} />
        </svg>
        <div style={{ display: "flex", fontFamily: SUAVE, fontSize: 30, lineHeight: 1.2, color: suave }}>{DOMINIO_TU_ANIO}</div>
      </div>
    </div>
  );
  return { elemento };
}
