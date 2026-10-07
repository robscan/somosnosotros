import { nombresVisibles } from "../datos";
import { ajustarRenglon } from "../medir";
import { zonaDeTexto } from "../tokens";
import { cabecera, Capa, columna, etiqueta, filete, fila, Foto, Lienzo, pie, renglones, subtitulo, texto, unir, type Bloque } from "./piezas";
import type { Contexto, Dibujo, Plantilla } from "./tipos";

/**
 * Familia «galería» (muestra 5 del founder): mucho blanco, la foto con aire alrededor, el título en letra ligera y los datos con su rótulo
 * («Cuándo», «Dónde», «Quién»). La que mejor aguanta muchos artistas. A, «marco»: la foto arriba y tres columnas de datos. B, «columna»: la
 * foto a la izquierda de lado a lado del alto y el texto en una columna a la derecha (sin foto, la columna lleva el día enorme y el rótulo
 * «Cuándo» pasa a «Hora»: la fecha sale una vez, OL-336).
 */

const AFINIDAD = { tiposLugar: ["museo", "galeria", "biblioteca", "escuela"], disciplinas: ["artes_visuales", "letras", "cine"] } as const;

/** Un dato con su rótulo arriba en versalitas espaciadas. */
function rotulado(c: Contexto, rotulo: string, valor: string | null, ancho: number, renglonesMax = 3): Bloque {
  if (!valor) return { el: null, alto: 0 };
  return columna([etiqueta(rotulo, ancho, c.paleta.suave, "left", 17), texto(valor, { fuente: "regular", ancho, renglones: renglonesMax, mayor: 28, menor: 20 }, c.paleta.texto, { interlineado: 1.3 })], 10);
}

const MARGEN_GALERIA = 96;

function dibujarMarco(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const m = MARGEN_GALERIA;
  const ancho = f.ancho - 2 * m;
  const col = Math.floor((ancho - 2 * 28) / 3);
  const arriba = cabecera(c, ancho, p.suave, p.suave);
  const datos = fila([rotulado(c, "Cuándo", unir(t.dia, t.hora), col), rotulado(c, "Dónde", t.sitio, col), rotulado(c, "Quién", nombresVisibles(t.artistas, 6) || null, col, 4)], { ancho, separacion: 28, estilo: { justifyContent: "flex-start" } });
  const abajo = columna([filete(ancho, p.texto, 1), datos, pie(c, ancho)], 24);
  const sub = subtitulo(t.subtitulo, ancho, p.acento);
  const yArriba = zona.arriba + 24;
  const yAbajo = f.alto - zona.abajo - abajo.alto;
  const disponible = yAbajo - yArriba - arriba.alto - 3 * 44;
  const altoFoto = c.foto ? Math.round(disponible * 0.55) : 0;
  const mayor = (t.tramo === "corto" ? 150 : t.tramo === "medio" ? 112 : 86) + (c.foto ? 0 : 40);
  const titulo = texto(t.titulo, { fuente: "ligera", ancho, renglones: 6, mayor, menor: 52, alto: disponible - altoFoto - (sub.el ? sub.alto + 20 : 0), parejo: true }, p.texto, { interlineado: 1.02 });
  const centro = columna([titulo, sub], 20);
  const yFoto = yArriba + arriba.alto + 44;
  // Sin foto el título baja al tercio del lienzo: el blanco de arriba hace de marco.
  const yCentro = c.foto ? yFoto + altoFoto + 44 : yFoto + Math.max(0, (disponible - centro.alto) * 0.45);
  return {
    elemento: (
      <Lienzo c={c}>
        <Capa x={m} y={yArriba} ancho={ancho} alto={arriba.alto}>
          {arriba.el}
        </Capa>
        {c.foto && (
          <Capa x={m} y={yFoto} ancho={ancho} alto={altoFoto}>
            <Foto src={c.foto} ancho={ancho} alto={altoFoto} />
          </Capa>
        )}
        {!c.foto && <Capa x={40} y={Math.max(40, f.tapaArriba - 24)} ancho={f.ancho - 80} alto={f.alto - Math.max(40, f.tapaArriba - 24) - Math.max(40, f.tapaAbajo - 24)} estilo={{ border: `1px solid ${p.suave}` }} />}
        <Capa x={m} y={yCentro} ancho={ancho} alto={centro.alto}>
          {centro.el}
        </Capa>
        <Capa x={m} y={yAbajo} ancho={ancho} alto={abajo.alto}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

/** El ancho de la columna de la foto (o del color, sin foto). */
const COLUMNA = 440;

function dibujarColumna(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const x = COLUMNA + 56;
  const ancho = f.ancho - x - 56;
  const arriba = columna([etiqueta(t.etiqueta, ancho, p.suave, "left", 18), etiqueta(t.precio, ancho, p.acento, "left", 18)], 10);
  // Sin foto el día enorme de la columna ya es la fecha: aquí solo la hora.
  const cuando = c.foto ? rotulado(c, "Cuándo", unir(t.dia, t.hora), ancho, 2) : rotulado(c, "Hora", t.hora, ancho, 2);
  const datos = columna([cuando, rotulado(c, "Dónde", t.sitio, ancho, 2), rotulado(c, "Quién", nombresVisibles(t.artistas, 6) || null, ancho, 4)], 24);
  const abajo = columna([filete(ancho, p.texto, 1), datos, pie(c, ancho)], 24);
  const sub = subtitulo(t.subtitulo, ancho, p.acento);
  const yArriba = zona.arriba;
  const yAbajo = f.alto - zona.abajo - abajo.alto;
  const disponible = yAbajo - yArriba - arriba.alto - 2 * 48;
  const titulo = texto(t.titulo, { fuente: "ligera", ancho, renglones: 8, mayor: t.tramo === "corto" ? 120 : t.tramo === "medio" ? 92 : 72, menor: 44, alto: disponible - (sub.el ? sub.alto + 20 : 0), parejo: true }, p.texto, { interlineado: 1.04 });
  const centro = columna([titulo, sub], 20);
  // Sin foto la columna es del acento y lleva el día enorme, de pie.
  const { numero, mes } = t.fecha;
  const dia = renglones(ajustarRenglon(numero, { fuente: "ligera", ancho: COLUMNA - 80, mayor: 300, menor: 64 }), "ligera", p.sobreAcento, { interlineado: 0.9 });
  const mesB = renglones(ajustarRenglon(mes, { fuente: "media", ancho: COLUMNA - 80, mayor: 48, menor: 28, espaciado: 8 }), "media", p.sobreAcento, { interlineado: 1.2, espaciado: 8 });
  const yDia = f.alto - zona.abajo - dia.alto - mesB.alto - 12;
  return {
    elemento: (
      <Lienzo c={c}>
        <Capa x={0} y={0} ancho={COLUMNA} alto={f.alto} estilo={{ backgroundColor: p.acento }}>
          {c.foto && <Foto src={c.foto} ancho={COLUMNA} alto={f.alto} />}
        </Capa>
        {!c.foto && (
          <Capa x={40} y={yDia} ancho={COLUMNA - 80} alto={dia.alto + mesB.alto + 12} estilo={{ flexDirection: "column", gap: 12 }}>
            {dia.el}
            {mesB.el}
          </Capa>
        )}
        <Capa x={x} y={yArriba} ancho={ancho} alto={arriba.alto}>
          {arriba.el}
        </Capa>
        <Capa x={x} y={yArriba + arriba.alto + 48} ancho={ancho} alto={centro.alto}>
          {centro.el}
        </Capa>
        <Capa x={x} y={yAbajo} ancho={ancho} alto={abajo.alto}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

export const galeriaMarco: Plantilla = { id: "galeria-marco", familia: "galeria", nombre: "Galería, foto con aire", fotoNecesaria: false, artistasVisibles: 6, afinidad: AFINIDAD, paletas: ["hueso", "papel", "cielo"], tratamiento: "natural", dibujar: dibujarMarco };
export const galeriaColumna: Plantilla = { id: "galeria-columna", familia: "galeria", nombre: "Galería, foto en columna", fotoNecesaria: false, artistasVisibles: 6, afinidad: AFINIDAD, paletas: ["hueso", "menta", "papel"], tratamiento: "natural", dibujar: dibujarColumna };
