import { nombresVisibles } from "../datos";
import { ajustarRenglon } from "../medir";
import { conAlfa } from "../paleta";
import { zonaDeTexto } from "../tokens";
import { Capa, columna, etiqueta, Foto, Lienzo, pie, renglones, texto, unir, type Bloque } from "./piezas";
import type { Contexto, Dibujo, Plantilla } from "./tipos";

/**
 * Familia «deco» (muestra 6 del founder): fondo oscuro, filetes dorados, mayúsculas muy espaciadas, simetría. La foto entonada hacia el
 * dorado la prepara `dibujar.ts`. A, «arco»: la foto en un arco con el abanico encima. B, «sol»: la foto en un círculo con rayos. Sin foto la
 * forma lleva el día enorme y la línea de cuándo dice solo la hora (OL-336: la fecha, una vez).
 */

const AFINIDAD = { tiposLugar: ["foro", "museo", "casa_de_cultura"], disciplinas: ["musica", "teatro", "danza"] } as const;
const PALETAS = ["tinta", "noche", "vino", "bosque", "marino"] as const;

/** El doble marco: un filete del acento y otro más tenue por dentro. */
function marcos(c: Contexto) {
  const { formato: f, paleta: p } = c;
  return (
    <>
      <Capa x={40} y={40} ancho={f.ancho - 80} alto={f.alto - 80} estilo={{ border: `2px solid ${p.acento}` }} />
      <Capa x={56} y={56} ancho={f.ancho - 112} alto={f.alto - 112} estilo={{ border: `1px solid ${conAlfa(p.acento, 0.5)}` }} />
    </>
  );
}

/** El ancho del texto dentro de los marcos. */
const DENTRO = 1080 - 2 * 104;

/** Título, subtítulo, la fila de datos con rombos y el pie: lo de abajo de las dos, centrado. */
function textosDeco(c: Contexto, altoTitulo: number): { bloque: Bloque; recortado: boolean } {
  const { textos: t, paleta: p } = c;
  const mayor = t.tramo === "corto" ? 110 : t.tramo === "medio" ? 84 : 66;
  const titulo = texto(t.titulo, { fuente: "ancha-negra", ancho: DENTRO, renglones: 5, mayor, menor: 44, alto: altoTitulo, mayusculas: true, espaciado: 3, parejo: true }, p.texto, { interlineado: 1.08, alinear: "center" });
  const sub = texto(t.subtitulo, { fuente: "ligera", ancho: DENTRO, renglones: 2, mayor: 36, menor: 26, espaciado: 2 }, p.texto, { interlineado: 1.2, alinear: "center" });
  const cuando = etiqueta(c.foto ? unir(t.diaCorto, t.hora) : t.hora, DENTRO, p.acento, "center", 30);
  const donde = texto(t.sitio, { fuente: "media", ancho: DENTRO, renglones: 2, mayor: 30, menor: 22, espaciado: 2 }, p.texto, { interlineado: 1.2, alinear: "center" });
  const quien = texto([nombresVisibles(t.artistas, 2), t.precio].filter(Boolean).join(" · "), { fuente: "regular", ancho: DENTRO, renglones: 2, mayor: 26, menor: 20 }, p.suave, { interlineado: 1.25, alinear: "center" });
  const bloque = columna([etiqueta(t.etiqueta, DENTRO, p.acento, "center", 22), titulo, sub, cuando, donde, quien, pie(c, DENTRO, "center", { mayusculas: true, espaciado: 3 })], 18, { alinear: "center", ancho: DENTRO });
  return { bloque, recortado: !!titulo.recortado };
}

/** Lo que mide el texto de abajo sin el título (para saber cuánto alto le queda al título). */
function altoSinTitulo(c: Contexto): number {
  return textosDeco({ ...c, textos: { ...c.textos, titulo: "" } }, 0).bloque.alto;
}

/** El abanico: medios círculos y rayos en filete dorado. */
function Abanico({ color }: { color: string }) {
  return (
    <svg width={240} height={120} viewBox="0 0 240 120">
      <g stroke={color} strokeWidth={2} fill="none">
        <path d="M10 118 A110 110 0 0 1 230 118" />
        <path d="M40 118 A80 80 0 0 1 200 118" />
        <path d="M70 118 A50 50 0 0 1 170 118" />
        <path d="M120 118 L120 8 M120 118 L42 40 M120 118 L198 40 M120 118 L12 92 M120 118 L228 92" />
      </g>
    </svg>
  );
}

/** Sin foto, la forma (arco o círculo) se llena del acento con el día enorme (o el rango, o el mes). */
function diaEnForma(c: Contexto, ancho: number, alto: number): Bloque {
  const { numero, mes } = c.textos.fecha;
  const n = renglones(ajustarRenglon(numero, { fuente: "ancha-negra", ancho: ancho * 0.7, mayor: Math.round(Math.min(alto * 0.5, ancho * 0.45)), menor: 40 }), "ancha-negra", c.paleta.sobreAcento, { interlineado: 0.95, alinear: "center" });
  const m = renglones(ajustarRenglon(mes, { fuente: "media", ancho: ancho * 0.6, mayor: 44, menor: 26, espaciado: 10 }), "media", c.paleta.sobreAcento, { interlineado: 1.2, alinear: "center", espaciado: 10 });
  return columna([n, m], 8, { alinear: "center" });
}

function dibujarArco(c: Contexto): Dibujo {
  const { paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const yAbanico = Math.max(96, zona.arriba);
  const yArco = yAbanico + 150;
  const finTexto = f.alto - Math.max(104, zona.abajo);
  const disponible = finTexto - yArco - 40;
  const altoArco = Math.round(Math.min(disponible * 0.5, 640));
  const ancho = Math.min(700, Math.round(altoArco * 1.1));
  const { bloque, recortado } = textosDeco(c, disponible - altoArco - altoSinTitulo(c) - 18);
  const yTexto = yArco + altoArco + 40;
  const dia = diaEnForma(c, ancho, altoArco);
  return {
    elemento: (
      <Lienzo c={c}>
        {marcos(c)}
        <Capa x={f.ancho / 2 - 120} y={yAbanico} ancho={240} alto={120}>
          <Abanico color={p.acento} />
        </Capa>
        <Capa x={(f.ancho - ancho) / 2} y={yArco} ancho={ancho} alto={altoArco} estilo={{ borderRadius: `${ancho / 2}px ${ancho / 2}px 0 0`, border: `3px solid ${p.acento}`, overflow: "hidden", backgroundColor: p.acento, alignItems: "center", justifyContent: "center" }}>
          {c.foto ? <Foto src={c.foto} ancho={ancho - 6} alto={altoArco - 6} /> : dia.el}
        </Capa>
        <Capa x={104} y={yTexto} ancho={DENTRO} alto={bloque.alto}>
          {bloque.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: recortado,
  };
}

function dibujarSol(c: Contexto): Dibujo {
  const { paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const inicio = Math.max(104, zona.arriba);
  const finTexto = f.alto - Math.max(104, zona.abajo);
  const disponible = finTexto - inicio;
  const diametro = Math.round(Math.min(disponible * 0.4, 520));
  // Los rayos salen 60 px más allá del círculo.
  const rayos = diametro + 120;
  const { bloque, recortado } = textosDeco(c, disponible - rayos - 40 - altoSinTitulo(c) - 18);
  const yCirculo = inicio + 60;
  const yTexto = inicio + rayos + 40;
  const cx = rayos / 2;
  const dia = diaEnForma(c, diametro, diametro);
  return {
    elemento: (
      <Lienzo c={c}>
        {marcos(c)}
        <Capa x={(f.ancho - rayos) / 2} y={inicio} ancho={rayos} alto={rayos}>
          <svg width={rayos} height={rayos} viewBox={`0 0 ${rayos} ${rayos}`}>
            <g stroke={p.acento} strokeWidth={2}>
              {Array.from({ length: 36 }, (_, i) => {
                const angulo = (i / 36) * Math.PI * 2;
                const r1 = diametro / 2 + 14;
                const r2 = diametro / 2 + (i % 2 === 0 ? 58 : 34);
                return <line key={i} x1={cx + Math.cos(angulo) * r1} y1={cx + Math.sin(angulo) * r1} x2={cx + Math.cos(angulo) * r2} y2={cx + Math.sin(angulo) * r2} />;
              })}
            </g>
          </svg>
        </Capa>
        <Capa x={(f.ancho - diametro) / 2} y={yCirculo} ancho={diametro} alto={diametro} estilo={{ borderRadius: diametro / 2, border: `3px solid ${p.acento}`, overflow: "hidden", backgroundColor: p.acento, alignItems: "center", justifyContent: "center" }}>
          {c.foto ? <Foto src={c.foto} ancho={diametro - 6} alto={diametro - 6} estilo={{ borderRadius: (diametro - 6) / 2 }} /> : dia.el}
        </Capa>
        <Capa x={104} y={yTexto} ancho={DENTRO} alto={bloque.alto}>
          {bloque.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: recortado,
  };
}

export const decoArco: Plantilla = { id: "deco-arco", familia: "deco", nombre: "Deco, foto en arco", fotoNecesaria: false, artistasVisibles: 2, afinidad: AFINIDAD, paletas: PALETAS, tratamiento: "sepia", dibujar: dibujarArco };
export const decoSol: Plantilla = { id: "deco-sol", familia: "deco", nombre: "Deco, sol y rayos", fotoNecesaria: false, artistasVisibles: 2, afinidad: AFINIDAD, paletas: ["tinta", "marino", "vino", "noche", "bosque"], tratamiento: "sepia", dibujar: dibujarSol };
