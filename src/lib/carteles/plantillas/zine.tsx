import type { CSSProperties } from "react";
import { nombresVisibles } from "../datos";
import { ajustar, ajustarRenglon } from "../medir";
import { MARGEN, RESALTADOR, zonaDeTexto } from "../tokens";
import { Capa, columna, Foto, Lienzo, pie, renglones, subtitulo, texto, type Bloque } from "./piezas";
import type { Contexto, Dibujo, Plantilla } from "./tipos";

/**
 * Familia «zine» (muestra 4 del founder): fotocopia, cinta adhesiva, sellos y etiquetas negras. La foto en duotono (negro al acento) la
 * prepara `dibujar.ts`. A, «cinta»: la foto pegada con cinta, el sello redondo con la fecha y el título con resaltador. B, «recorte»: el
 * título en recortes alternados, como letras pegadas.
 */

const AFINIDAD = { tiposLugar: ["colectivo", "cafe_bar", "galeria", "otro", "plaza"], disciplinas: ["musica", "artes_visuales", "letras", "circo"] } as const;
const PALETAS = ["zine", "papel", "hueso"] as const;

/** Una etiqueta negra (texto claro sobre el color del texto), un poco ladeada. */
function etiquetaNegra(c: Contexto, valor: string | null, ancho: number, tamano: number, giro: number): Bloque {
  if (!valor) return { el: null, alto: 0 };
  const a = ajustar(valor, { fuente: "condensada-negra", ancho: ancho - 44, renglones: 2, mayor: tamano, menor: 22, mayusculas: true, interlineado: 1.1 });
  const t = renglones(a, "condensada-negra", c.paleta.fondo, { interlineado: 1.1 });
  return { el: <div style={{ display: "flex", padding: "12px 22px", backgroundColor: c.paleta.texto, transform: `rotate(${giro}deg)` }}>{t.el}</div>, alto: t.alto + 24, recortado: t.recortado };
}

/** Un pedazo de cinta adhesiva amarilla, girado. */
function cinta(x: number, y: number, giro: number) {
  return <Capa x={x} y={y} ancho={190} alto={52} estilo={{ backgroundColor: RESALTADOR, opacity: 0.85, transform: `rotate(${giro}deg)` }} />;
}

/** El sello redondo con la fecha y la hora, en el acento, ladeado. */
function selloFecha(c: Contexto, diametro: number) {
  const { textos: t, paleta: p } = c;
  const dentro = diametro * 0.66;
  const dia = renglones(ajustarRenglon(t.diaCorto.split(" – ")[0], { fuente: "condensada-negra", ancho: dentro, mayor: Math.round(diametro * 0.2), menor: 26, mayusculas: true }), "condensada-negra", p.acento, { interlineado: 1.05, alinear: "center" });
  const hora = renglones(ajustarRenglon(t.hora, { fuente: "condensada-negra", ancho: dentro, mayor: Math.round(diametro * 0.15), menor: 20 }), "condensada-negra", p.acento, { interlineado: 1.05, alinear: "center" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: diametro, height: diametro, borderRadius: diametro / 2, border: `6px solid ${p.acento}`, backgroundColor: p.fondo, transform: "rotate(10deg)" }}>
      {dia.el}
      {hora.el}
    </div>
  );
}

/** Lo de abajo: el sitio en etiqueta negra, quién y el pie. */
function datosZine(c: Contexto, ancho: number): Bloque {
  const { textos: t, paleta: p } = c;
  return columna([etiquetaNegra(c, t.sitio, ancho, 34, -1), texto([t.dia, t.precio].join(" · "), { fuente: "media", ancho, renglones: 2, mayor: 30, menor: 22 }, p.texto, { interlineado: 1.2 }), texto(nombresVisibles(t.artistas, 3), { fuente: "regular", ancho, renglones: 2, mayor: 28, menor: 20 }, p.suave, { interlineado: 1.2 }), pie(c, ancho, p.suave)], 14);
}

function dibujarCinta(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - 2 * MARGEN;
  const sello = c.foto ? 230 : 260;
  const arriba = etiquetaNegra(c, t.etiqueta ?? t.precio, ancho - sello, 36, -2);
  const abajo = datosZine(c, ancho);
  const sub = subtitulo(t.subtitulo, ancho, p.texto, "left", "regular");
  const yArriba = zona.arriba;
  const yAbajo = f.alto - zona.abajo - abajo.alto;
  const disponible = yAbajo - yArriba - arriba.alto - 3 * 40;
  const altoFoto = c.foto ? Math.round(disponible * 0.5) : 0;
  // El título con resaltador en el último renglón (lleva 14 px de aire a cada lado, que se descuentan del ancho).
  const mayor = (t.tramo === "corto" ? 170 : t.tramo === "medio" ? 124 : 96) + (c.foto ? 0 : 40);
  const a = ajustar(t.titulo, { fuente: "condensada-negra", ancho: ancho - 28, renglones: 6, mayor, menor: 56, alto: disponible - altoFoto - (sub.el ? sub.alto + 16 : 0) - (c.foto ? 0 : sello * 0.6), interlineado: 1.08, parejo: true });
  const lineas: Bloque = {
    el: (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", transform: "rotate(-2deg)" }}>
        {a.renglones.map((r, i) => {
          const resaltado: CSSProperties = i === a.renglones.length - 1 ? { backgroundColor: RESALTADOR, color: "#111111" } : { color: p.texto };
          return (
            <div key={i} style={{ display: "flex", height: a.tamano * 1.08, padding: "0 14px", fontFamily: "condensada-negra", fontSize: a.tamano, lineHeight: 1.08, whiteSpace: "nowrap", ...resaltado }}>
              {r}
            </div>
          );
        })}
      </div>
    ),
    alto: Math.ceil(a.renglones.length * a.tamano * 1.08),
    recortado: a.recortado,
  };
  const centro = columna([lineas, sub], 16);
  const yFoto = yArriba + arriba.alto + 40;
  const yCentro = (c.foto ? yFoto + altoFoto : yFoto + sello * 0.6) + 40;
  return {
    elemento: (
      <Lienzo c={c}>
        <Capa x={MARGEN} y={yArriba} ancho={ancho - sello} alto={arriba.alto}>
          {arriba.el}
        </Capa>
        {c.foto && (
          <Capa x={MARGEN - 4} y={yFoto} ancho={ancho + 8} alto={altoFoto} estilo={{ transform: "rotate(1.2deg)", overflow: "hidden" }}>
            <Foto src={c.foto} ancho={ancho + 8} alto={altoFoto} />
          </Capa>
        )}
        {c.foto && cinta(MARGEN - 50, yFoto - 20, -28)}
        {c.foto && cinta(f.ancho - MARGEN - 140, yFoto - 6, 32)}
        <Capa x={f.ancho - MARGEN - sello + 10} y={yArriba - 10} ancho={sello} alto={sello}>
          {selloFecha(c, sello)}
        </Capa>
        <Capa x={MARGEN - 14} y={yCentro} ancho={ancho + 14} alto={centro.alto}>
          {centro.el}
        </Capa>
        <Capa x={MARGEN} y={yAbajo} ancho={ancho} alto={abajo.alto}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!a.recortado,
  };
}

function dibujarRecorte(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - 2 * MARGEN;
  const arriba = etiquetaNegra(c, [t.etiqueta, t.diaCorto, t.hora].filter(Boolean).join(" · "), ancho, 34, -1.5);
  const abajo = datosZine(c, ancho);
  const sub = subtitulo(t.subtitulo, ancho, p.texto, "left", "regular");
  const yArriba = zona.arriba;
  const yAbajo = f.alto - zona.abajo - abajo.alto;
  const disponible = yAbajo - yArriba - arriba.alto - 3 * 40;
  const altoFoto = c.foto ? Math.round(disponible * 0.42) : 0;
  // Cada renglón del título es un recorte: alternan el color del texto y el acento, y se ladean un poco a un lado y al otro.
  const relleno = 18;
  const mayor = (t.tramo === "corto" ? 160 : t.tramo === "medio" ? 116 : 92) + (c.foto ? 0 : 40);
  const interlineado = 1.0;
  const a = ajustar(t.titulo, { fuente: "condensada-negra", ancho: ancho - 2 * relleno, renglones: 6, mayor, menor: 56, alto: disponible - altoFoto - (sub.el ? sub.alto + 16 : 0) - 10, interlineado: interlineado + 0.12, mayusculas: true, parejo: true });
  const altoRenglon = Math.ceil(a.tamano * (interlineado + 0.12));
  const recortes: Bloque = {
    el: (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        {a.renglones.map((r, i) => {
          const fondo = i % 2 === 0 ? p.texto : p.acento;
          const letra = i % 2 === 0 ? p.fondo : p.sobreAcento;
          return (
            <div key={i} style={{ display: "flex", height: altoRenglon, alignItems: "center", padding: `0 ${relleno}px`, backgroundColor: fondo, transform: `rotate(${i % 2 === 0 ? -1.2 : 1.4}deg)` }}>
              <div style={{ display: "flex", fontFamily: "condensada-negra", fontSize: a.tamano, lineHeight: interlineado, color: letra, whiteSpace: "nowrap" }}>{r}</div>
            </div>
          );
        })}
      </div>
    ),
    alto: altoRenglon * a.renglones.length,
    recortado: a.recortado,
  };
  const centro = columna([recortes, sub], 18);
  const yFoto = yArriba + arriba.alto + 40;
  const yCentro = yFoto + (c.foto ? altoFoto + 40 : Math.max(0, (disponible - centro.alto) / 2));
  return {
    elemento: (
      <Lienzo c={c}>
        <Capa x={MARGEN} y={yArriba} ancho={ancho} alto={arriba.alto}>
          {arriba.el}
        </Capa>
        {c.foto && (
          <Capa x={MARGEN} y={yFoto} ancho={ancho} alto={altoFoto} estilo={{ transform: "rotate(-1deg)", overflow: "hidden", border: `8px solid ${p.texto}` }}>
            <Foto src={c.foto} ancho={ancho - 16} alto={altoFoto - 16} />
          </Capa>
        )}
        {c.foto && cinta(f.ancho / 2 - 95, yFoto - 26, 3)}
        <Capa x={MARGEN} y={yCentro} ancho={ancho} alto={centro.alto}>
          {centro.el}
        </Capa>
        <Capa x={MARGEN} y={yAbajo} ancho={ancho} alto={abajo.alto}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!a.recortado,
  };
}

export const zineCinta: Plantilla = { id: "zine-cinta", familia: "zine", nombre: "Zine, cinta y sello", fotoNecesaria: false, artistasVisibles: 3, afinidad: AFINIDAD, paletas: PALETAS, tratamiento: "duotono", dibujar: dibujarCinta };
export const zineRecorte: Plantilla = { id: "zine-recorte", familia: "zine", nombre: "Zine, letras recortadas", fotoNecesaria: false, artistasVisibles: 3, afinidad: AFINIDAD, paletas: ["zine", "hueso", "papel"], tratamiento: "duotono", dibujar: dibujarRecorte };
