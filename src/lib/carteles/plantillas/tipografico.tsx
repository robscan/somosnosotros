import { nombresVisibles } from "../datos";
import { ajustarRenglon } from "../medir";
import { MARGEN, zonaDeTexto } from "../tokens";
import { Capa, columna, dato, etiqueta, filete, fila, Foto, Lienzo, pie, renglones, subtitulo, texto, unir, type Bloque } from "./piezas";
import type { Contexto, Dibujo, Plantilla } from "./tipos";

/**
 * Familia «tipográfico» (muestra 2 del founder): papel claro, el título en negra ancha y mayúsculas, y el color en una franja. Va bien sin foto:
 * la letra es la imagen. A, «franja»: una franja de color a la derecha con la fecha girada (con foto, la franja es la foto). B, «fecha»: el día
 * enorme arriba y el título debajo (con foto, una banda de foto entre los dos).
 *
 * La fecha sale una vez (OL-336; el founder la vio dos veces en esta familia): donde va girada o enorme, los datos de abajo ya no la repiten.
 */

const AFINIDAD = { tiposLugar: ["escuela", "biblioteca", "colectivo", "casa_de_cultura", "otro"], disciplinas: ["letras", "artes_visuales", "otro", "cine"] } as const;

/** Lo de abajo de las dos: los datos (con la fecha y la hora en su columna, o sin ellas si el cartel ya las dice en grande) y el pie. */
function datosTipo(c: Contexto, ancho: number, conFecha: boolean): Bloque {
  const { textos: t, paleta: p } = c;
  const mitad = Math.floor((ancho - 32) / 2);
  const quien = nombresVisibles(t.artistas, 4) || null;
  const datos = conFecha ? fila([dato(t.dia, t.hora, mitad, p.texto, p.suave), dato(t.sitio, quien, mitad, p.texto, p.suave)], { ancho }) : dato(t.sitio, quien, ancho, p.texto, p.suave);
  return columna([datos, pie(c, ancho)], 28);
}

/** El ancho de la franja de la derecha. */
const FRANJA = 300;

function dibujarFranja(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - FRANJA - 2 * MARGEN;
  const arriba = columna([etiqueta(t.etiqueta, ancho, p.texto), etiqueta(t.precio, ancho, p.acento)], 10);
  // Sin foto la fecha va girada en la franja (con su hora): abajo, solo el sitio y quién.
  const abajo = datosTipo(c, ancho, !!c.foto);
  const libre = f.alto - zona.arriba - zona.abajo - arriba.alto - abajo.alto - 2 * 56;
  const sub = subtitulo(t.subtitulo, ancho, p.texto);
  const altoTitulo = libre - (sub.el ? sub.alto + 28 : 0) - 6 - 36;
  const titulo = texto(t.titulo, { fuente: "ancha-negra", ancho, renglones: 7, mayor: t.tramo === "corto" ? 170 : t.tramo === "medio" ? 124 : 96, menor: 52, alto: altoTitulo, mayusculas: true }, p.texto, { interlineado: 0.9 });
  const centro = columna([titulo, filete(Math.min(ancho, 560), p.texto, 6), sub], 32);
  const yCentro = zona.arriba + arriba.alto + 56 + Math.max(0, (libre - centro.alto) / 2);
  // La fecha girada en la franja (sin foto): a lo largo del alto útil, centrada entre lo que tapa la interfaz.
  const largo = f.alto - zona.arriba - zona.abajo;
  // El día en mayúsculas; la hora no («19:00 h», no «19:00 H»). Un festival o una exposición, solo el mes («OCT 2026»).
  const girada = ajustarRenglon(unir(t.diaCorto.toLocaleUpperCase("es-MX"), t.hora) ?? "", { fuente: "ancha-negra", ancho: largo, mayor: 112, menor: 48 });
  const altoGirada = girada.tamano * 1.1;
  const yCentroFranja = zona.arriba + largo / 2;
  return {
    elemento: (
      <Lienzo c={c}>
        <Capa x={f.ancho - FRANJA} y={0} ancho={FRANJA} alto={f.alto} estilo={{ backgroundColor: p.acento }}>
          {c.foto && <Foto src={c.foto} ancho={FRANJA} alto={f.alto} />}
        </Capa>
        {!c.foto && (
          <Capa x={f.ancho - FRANJA / 2 - largo / 2} y={yCentroFranja - altoGirada / 2} ancho={largo} alto={altoGirada} estilo={{ alignItems: "center", justifyContent: "center", transform: "rotate(90deg)" }}>
            <div data-girado="1" style={{ display: "flex", fontFamily: "ancha-negra", fontSize: girada.tamano, lineHeight: 1.1, color: p.sobreAcento, whiteSpace: "nowrap" }}>
              {girada.renglones[0]}
            </div>
          </Capa>
        )}
        <Capa x={MARGEN} y={zona.arriba} ancho={ancho} alto={arriba.alto}>
          {arriba.el}
        </Capa>
        <Capa x={MARGEN} y={yCentro} ancho={ancho} alto={centro.alto}>
          {centro.el}
        </Capa>
        <Capa x={MARGEN} y={f.alto - zona.abajo - abajo.alto} ancho={ancho} alto={abajo.alto}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

function dibujarFecha(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - 2 * MARGEN;
  const { numero, mes } = t.fecha;
  // La fecha es esta: el día (o el rango, o el mes) enorme en el acento y, a su lado, el mes y la hora. Abajo no se repite (OL-336).
  const numeroB = renglones(ajustarRenglon(numero, { fuente: "ancha-negra", ancho: ancho * 0.48, mayor: c.foto ? 300 : 380, menor: 72 }), "ancha-negra", p.acento, { interlineado: 0.82 });
  const lado = columna([texto(mes, { fuente: "ancha-negra", ancho: ancho * 0.45, renglones: 1, mayor: 96, menor: 48 }, p.texto, { interlineado: 1 }), texto(t.hora, { fuente: "media", ancho: ancho * 0.45, renglones: 1, mayor: 40, menor: 24 }, p.suave, { interlineado: 1.2 }), etiqueta(t.precio, ancho * 0.45, p.acento)], 10);
  const cabeza = fila([numeroB, lado], { ancho, separacion: 32, estilo: { justifyContent: "flex-start", alignItems: "flex-end" } });
  const abajo = columna([etiqueta(t.etiqueta, ancho, p.suave), datosTipo(c, ancho, false)], 24);
  const sub = subtitulo(t.subtitulo, ancho, p.suave);
  const altoFoto = c.foto ? Math.round((f.alto - zona.arriba - zona.abajo) * 0.3) : 0;
  const libre = f.alto - zona.arriba - zona.abajo - cabeza.alto - abajo.alto - (c.foto ? altoFoto + 48 : 0) - 2 * 48;
  // Sin foto el título tiene el sitio de la foto: crece.
  const mayor = (t.tramo === "corto" ? 170 : t.tramo === "medio" ? 128 : 96) + (c.foto ? 0 : 40);
  const titulo = texto(t.titulo, { fuente: "ancha-negra", ancho, renglones: 6, mayor, menor: 50, alto: libre - (sub.el ? sub.alto + 24 : 0) - 34, parejo: true }, p.texto, { interlineado: 0.94 });
  const centro = columna([filete(ancho, p.texto, 6), titulo, sub], 24);
  const yCabeza = zona.arriba;
  const yFoto = yCabeza + cabeza.alto + 48;
  const yCentro = (c.foto ? yFoto + altoFoto : yCabeza + cabeza.alto) + 48;
  return {
    elemento: (
      <Lienzo c={c}>
        <Capa x={MARGEN} y={yCabeza} ancho={ancho} alto={cabeza.alto}>
          {cabeza.el}
        </Capa>
        {c.foto && (
          <Capa x={MARGEN} y={yFoto} ancho={ancho} alto={altoFoto}>
            <Foto src={c.foto} ancho={ancho} alto={altoFoto} />
          </Capa>
        )}
        <Capa x={MARGEN} y={yCentro} ancho={ancho} alto={centro.alto}>
          {centro.el}
        </Capa>
        <Capa x={MARGEN} y={f.alto - zona.abajo - abajo.alto} ancho={ancho} alto={abajo.alto}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

export const tipoFranja: Plantilla = { id: "tipo-franja", familia: "tipografico", nombre: "Tipográfico, franja de color", fotoNecesaria: false, artistasVisibles: 4, afinidad: AFINIDAD, paletas: ["papel", "crema", "cielo", "menta", "durazno"], tratamiento: "natural", dibujar: dibujarFranja };
export const tipoFecha: Plantilla = { id: "tipo-fecha", familia: "tipografico", nombre: "Tipográfico, la fecha en grande", fotoNecesaria: false, artistasVisibles: 4, afinidad: AFINIDAD, paletas: ["cielo", "papel", "menta", "durazno", "crema"], tratamiento: "natural", dibujar: dibujarFecha };
