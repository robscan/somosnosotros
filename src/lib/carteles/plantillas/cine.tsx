import { nombresVisibles } from "../datos";
import type { Caja } from "../medir";
import { conAlfa } from "../paleta";
import { MARGEN, zonaDeTexto } from "../tokens";
import { cabecera, Capa, columna, dato, diaYMes, filete, fila, Foto, Lienzo, pie, subtitulo, texto, type Bloque } from "./piezas";
import type { Contexto, Dibujo, Plantilla } from "./tipos";

/**
 * Familia «cine» (muestra 1 del founder): la foto manda, el título en condensada negra y mayúsculas, los datos en dos columnas abajo.
 * A, «a sangre»: la foto llena el lienzo y un degradado al fondo deja leer lo de abajo. B, «banda»: la foto arriba y el título sobre una
 * banda del color de acento.
 */

const AFINIDAD = { tiposLugar: ["foro", "casa_de_cultura", "otro", "cafe_bar", "plaza"], disciplinas: ["cine", "musica", "teatro"] } as const;
const PALETAS = ["noche", "vino", "marino", "bosque"] as const;

/** El título por tramo: el corto llena dos renglones enormes, el largo baja a cuatro sin dejar de ser lo más grande del cartel. */
const TITULO_SANGRE: Record<string, Pick<Caja, "mayor" | "menor" | "renglones">> = {
  corto: { mayor: 300, menor: 150, renglones: 2 },
  medio: { mayor: 170, menor: 104, renglones: 3 },
  largo: { mayor: 124, menor: 76, renglones: 4 },
};

/** Lo de abajo de las dos: subtítulo, filete, datos en dos columnas y el pie. */
function datosCine(c: Contexto, ancho: number): Bloque {
  const { textos: t, paleta: p } = c;
  const mitad = Math.floor((ancho - 40) / 2);
  return columna(
    [fila([dato(t.dia, t.hora, mitad, p.texto, p.suave), dato(t.sitio, nombresVisibles(t.artistas, 3) || null, mitad, p.texto, p.suave, "right")], { ancho }), pie(c, ancho, p.suave)],
    28,
  );
}

/** Sin foto, la fecha es la imagen: el día enorme en el color de acento, con su mes al lado, en el alto que quede. */
function fechaGrande(c: Contexto, alto: number, ancho: number, color: string): Bloque {
  const { numero, mes } = diaYMes(c.textos.diaCorto);
  const tamano = Math.min(520, Math.floor(alto / 0.84));
  if (tamano < 160 || !numero) return { el: null, alto: 0 };
  const numeroB = texto(numero, { fuente: "condensada-negra", ancho: ancho * 0.7, renglones: 1, mayor: tamano, menor: 160 }, color, { interlineado: 0.84 });
  const mesB = texto(mes, { fuente: "condensada-negra", ancho: ancho * 0.3, renglones: 1, mayor: Math.round(tamano * 0.3), menor: 60 }, color, { interlineado: 1 });
  return fila([numeroB, mesB], { ancho, separacion: 24, estilo: { justifyContent: "flex-start", alignItems: "flex-end" } });
}

function dibujarSangre(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - 2 * MARGEN;
  const titulo = texto(t.titulo, { fuente: "condensada-negra", ancho, ...TITULO_SANGRE[t.tramo], mayusculas: true, parejo: true }, p.texto, { interlineado: 0.88 });
  const abajo = columna([titulo, subtitulo(t.subtitulo, ancho, p.acento), filete(ancho, conAlfa(p.texto, 0.35)), datosCine(c, ancho)], 26);
  const arriba = cabecera(c, ancho, p.acento, p.texto);
  const yAbajo = f.alto - zona.abajo - abajo.alto;
  // Dos degradados sobre la foto: arriba, oscuro hasta pasada la etiqueta (en una historia baja 250 px) y luego se abre; abajo, empieza a
  // oscurecer 260 px antes del título y ya es casi el fondo donde empieza el texto.
  const finArriba = ((zona.arriba + arriba.alto + 40) / f.alto) * 100;
  const abiertoArriba = ((zona.arriba + arriba.alto + 220) / f.alto) * 100;
  const desde = Math.max(abiertoArriba, ((yAbajo - 260) / f.alto) * 100);
  const hasta = (yAbajo / f.alto) * 100;
  const yFecha = zona.arriba + arriba.alto + 32;
  const fecha = c.foto ? null : fechaGrande(c, yAbajo - yFecha - 40, ancho, p.acento);
  return {
    elemento: (
      <Lienzo c={c}>
        {c.foto && (
          <Capa x={0} y={0} ancho={f.ancho} alto={f.alto}>
            <Foto src={c.foto} ancho={f.ancho} alto={f.alto} />
          </Capa>
        )}
        {c.foto && <Capa x={0} y={0} ancho={f.ancho} alto={f.alto} estilo={{ backgroundImage: `linear-gradient(180deg, ${conAlfa(p.fondo, 0.75)} 0%, ${conAlfa(p.fondo, 0.6)} ${finArriba}%, ${conAlfa(p.fondo, 0)} ${abiertoArriba}%, ${conAlfa(p.fondo, 0)} ${desde}%, ${conAlfa(p.fondo, 0.86)} ${hasta}%, ${p.fondo} 100%)` }} />}
        {fecha?.el && (
          <Capa x={MARGEN} y={yFecha} ancho={ancho} alto={fecha.alto}>
            {fecha.el}
          </Capa>
        )}
        <Capa x={MARGEN} y={zona.arriba} ancho={ancho} alto={arriba.alto}>
          {arriba.el}
        </Capa>
        <Capa x={MARGEN} y={yAbajo} ancho={ancho} alto={abajo.alto}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

const TITULO_BANDA: Record<string, Pick<Caja, "mayor" | "menor" | "renglones">> = {
  corto: { mayor: 190, menor: 120, renglones: 2 },
  medio: { mayor: 140, menor: 92, renglones: 3 },
  largo: { mayor: 104, menor: 70, renglones: 4 },
};

function dibujarBanda(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - 2 * MARGEN;
  const relleno = 44;
  // Sin foto la banda es el cartel: su título crece un tramo.
  const caja = c.foto ? TITULO_BANDA[t.tramo] : { ...TITULO_BANDA[t.tramo], mayor: TITULO_BANDA[t.tramo].mayor + 50 };
  const titulo = texto(t.titulo, { fuente: "condensada-negra", ancho, ...caja, mayusculas: true, parejo: true }, p.sobreAcento, { interlineado: 0.9 });
  const banda = columna([cabecera(c, ancho, p.sobreAcento, p.sobreAcento), titulo, subtitulo(t.subtitulo, ancho, p.sobreAcento)], 22);
  const resto = columna([datosCine(c, ancho)], 0);
  const altoResto = resto.alto + 40 + zona.abajo;
  const altoBanda = banda.alto + 2 * relleno;
  // La foto se queda con lo que sobra (y al menos lo que tapa la interfaz arriba en una historia); sin foto, la banda empieza arriba.
  const altoFoto = c.foto ? Math.max(f.tapaArriba, f.alto - altoResto - altoBanda) : 0;
  const yBanda = c.foto ? altoFoto : 0;
  const altoBandaReal = c.foto ? altoBanda : f.alto - altoResto;
  // Sin foto, la fecha grande ocupa lo que la banda tiene de sobra encima de su texto.
  const yFecha = zona.arriba;
  const fecha = c.foto ? null : fechaGrande(c, altoBandaReal - relleno - banda.alto - yFecha - 40, ancho, p.sobreAcento);
  return {
    elemento: (
      <Lienzo c={c}>
        {c.foto && (
          <Capa x={0} y={0} ancho={f.ancho} alto={altoFoto}>
            <Foto src={c.foto} ancho={f.ancho} alto={altoFoto} />
          </Capa>
        )}
        <Capa x={0} y={yBanda} ancho={f.ancho} alto={altoBandaReal} estilo={{ backgroundColor: p.acento, alignItems: "flex-end", padding: `${relleno}px ${MARGEN}px` }}>
          {banda.el}
        </Capa>
        {fecha?.el && (
          <Capa x={MARGEN} y={yFecha} ancho={ancho} alto={fecha.alto}>
            {fecha.el}
          </Capa>
        )}
        <Capa x={MARGEN} y={f.alto - zona.abajo - resto.alto} ancho={ancho} alto={resto.alto}>
          {resto.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

export const cineSangre: Plantilla = { id: "cine-sangre", familia: "cine", nombre: "Cine, foto a sangre", fotoNecesaria: true, artistasVisibles: 3, afinidad: AFINIDAD, paletas: PALETAS, tratamiento: "natural", dibujar: dibujarSangre };
export const cineBanda: Plantilla = { id: "cine-banda", familia: "cine", nombre: "Cine, banda de color", fotoNecesaria: false, artistasVisibles: 3, afinidad: AFINIDAD, paletas: ["vino", "noche", "marino", "bosque"], tratamiento: "natural", dibujar: dibujarBanda };
