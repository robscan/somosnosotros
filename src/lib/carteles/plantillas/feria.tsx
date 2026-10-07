import { nombresVisibles } from "../datos";
import { ajustarRenglon } from "../medir";
import { MARGEN, PICADO, zonaDeTexto } from "../tokens";
import { Capa, columna, dato, etiqueta, Foto, Lienzo, pie, renglones, subtitulo, texto, unir, VACIO, type Bloque } from "./piezas";
import type { Contexto, Dibujo, Plantilla } from "./tipos";

/**
 * Familia «feria» (muestra 3 del founder): fiesta de barrio, colores de papel picado, el título centrado con sombra dura. Solo formas: el
 * papel picado son rectángulos con picos y figuras recortadas, no ilustración. A, «picado»: banderas arriba y la foto en un marco blanco
 * ladeado. B, «boleto»: la foto en un círculo entre confeti y los datos en un boleto. Sin foto, el sello redondo con el día es la fecha: la
 * cinta o el boleto ya no la repiten, solo dicen la hora (OL-336).
 */

const AFINIDAD = { tiposLugar: ["plaza", "casa_de_cultura", "colectivo", "cafe_bar", "otro"], disciplinas: ["musica", "danza", "circo", "teatro"] } as const;
const PALETAS = ["crema", "durazno", "menta", "cielo"] as const;

/** La tira de banderas de papel picado, de lado a lado (alto 190). */
function Picado({ ancho, fondo, linea }: { ancho: number; fondo: string; linea: string }) {
  const cuantas = 9;
  const paso = ancho / cuantas;
  const bandera = paso - 12;
  return (
    <svg width={ancho} height={190} viewBox={`0 0 ${ancho} 190`}>
      <path d={`M0 8 Q${ancho / 2} 40 ${ancho} 8`} stroke={linea} strokeWidth={3} fill="none" />
      {Array.from({ length: cuantas }, (_, i) => {
        const x = 6 + i * paso;
        const y = 8 + Math.sin((i / (cuantas - 1)) * Math.PI) * 24;
        const picos = Array.from({ length: 9 }, (_, k) => `L${(bandera * (8 - k)) / 8} ${k % 2 === 0 ? 150 : 138}`).join(" ");
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <path d={`M0 0H${bandera}V140 ${picos} Z`} fill={PICADO[i % PICADO.length]} />
            <circle cx={bandera / 2} cy={58} r={20} fill={fondo} />
            <path d={`M${bandera / 2} 92l14 24H${bandera / 2 - 14}z`} fill={fondo} />
            <rect x={18} y={22} width={12} height={12} transform="rotate(45 24 28)" fill={fondo} />
            <rect x={bandera - 30} y={22} width={12} height={12} transform={`rotate(45 ${bandera - 24} 28)`} fill={fondo} />
          </g>
        );
      })}
    </svg>
  );
}

/** El título de feria: centrado, en el acento, con la sombra dura en el color del texto. */
function tituloFeria(c: Contexto, ancho: number, alto: number, mayor: number): Bloque {
  const { textos: t, paleta: p } = c;
  return texto(t.titulo, { fuente: "ancha-negra", ancho, renglones: 5, mayor, menor: 52, alto, parejo: true }, p.acento, { interlineado: 0.98, alinear: "center", estilo: { textShadow: `5px 5px 0 ${p.texto}` } });
}

/** El sello redondo con el día (sin foto): el círculo del acento con el número enorme (o el rango, o el mes) y el mes. */
function sello(c: Contexto, diametro: number): Bloque {
  const { numero, mes } = c.textos.fecha;
  const n = renglones(ajustarRenglon(numero, { fuente: "ancha-negra", ancho: diametro * 0.7, mayor: Math.round(diametro * 0.5), menor: 40 }), "ancha-negra", c.paleta.sobreAcento, { interlineado: 0.9, alinear: "center" });
  const m = renglones(ajustarRenglon(mes, { fuente: "ancha-negra", ancho: diametro * 0.6, mayor: Math.round(diametro * 0.16), menor: 32 }), "ancha-negra", c.paleta.sobreAcento, { interlineado: 1, alinear: "center" });
  return {
    el: (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: diametro, height: diametro, borderRadius: diametro / 2, backgroundColor: c.paleta.acento }}>
        {n.el}
        {m.el}
      </div>
    ),
    alto: diametro,
  };
}

function dibujarPicado(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - 2 * MARGEN;
  const yEtiqueta = Math.max(zona.arriba, 206);
  const arriba = columna([etiqueta([t.etiqueta, t.precio].filter(Boolean).join(" · "), ancho, p.acento, "center")], 0, { alinear: "center", ancho });
  // La cinta dice cuándo; sin foto, solo la hora (el sello ya dice el día), y sin hora no hay cinta.
  const cuando = c.foto ? unir(t.diaCorto, t.hora) : t.hora;
  const cinta = cuando ? renglones(ajustarRenglon(cuando, { fuente: "media", ancho: ancho - 80, mayor: 36, menor: 24 }), "media", p.fondo, { interlineado: 1.2, alinear: "center" }) : VACIO;
  const abajo = columna(
    [
      cinta.el ? { el: <div style={{ display: "flex", justifyContent: "center", width: ancho, padding: "18px 40px", borderRadius: 999, backgroundColor: p.texto }}>{cinta.el}</div>, alto: cinta.alto + 36 } : VACIO,
      dato(t.sitio, nombresVisibles(t.artistas, 2) || null, ancho, p.texto, p.suave, "center"),
      pie(c, ancho, "center"),
    ],
    22,
    { alinear: "center", ancho },
  );
  const sub = subtitulo(t.subtitulo, ancho, p.texto, "center");
  const yAbajo = f.alto - zona.abajo - abajo.alto;
  const disponible = yAbajo - (yEtiqueta + arriba.alto) - 2 * 40;
  // La foto se lleva la mitad de lo disponible (con foto); el título, lo que quede.
  const altoMarco = c.foto ? Math.round(disponible * 0.5) : Math.min(420, Math.round(disponible * 0.45));
  const titulo = tituloFeria(c, ancho, disponible - altoMarco - 40 - (sub.el ? sub.alto + 16 : 0), t.tramo === "corto" ? 150 : t.tramo === "medio" ? 112 : 88);
  const centro = columna([titulo, sub], 16, { alinear: "center", ancho });
  const yMarco = yEtiqueta + arriba.alto + 40;
  const yCentro = yMarco + altoMarco + 40 + Math.max(0, (disponible - altoMarco - 40 - centro.alto) / 2);
  const anchoMarco = f.ancho - 2 * 80;
  return {
    elemento: (
      <Lienzo c={c}>
        <Capa x={0} y={0} ancho={f.ancho} alto={190}>
          <Picado ancho={f.ancho} fondo={p.fondo} linea={p.texto} />
        </Capa>
        <Capa x={MARGEN} y={yEtiqueta} ancho={ancho} alto={arriba.alto}>
          {arriba.el}
        </Capa>
        {c.foto ? (
          <Capa x={80} y={yMarco} ancho={anchoMarco} alto={altoMarco} estilo={{ borderRadius: 28, border: "14px solid #ffffff", boxShadow: `0 0 0 6px ${p.acento}, 0 22px 0 6px rgba(0,0,0,0.12)`, transform: "rotate(-1.6deg)", overflow: "hidden" }}>
            <Foto src={c.foto} ancho={anchoMarco - 28} alto={altoMarco - 28} />
          </Capa>
        ) : (
          <Capa x={0} y={yMarco} ancho={f.ancho} alto={altoMarco} estilo={{ justifyContent: "center" }}>
            {sello(c, altoMarco).el}
          </Capa>
        )}
        <Capa x={MARGEN} y={yCentro} ancho={ancho} alto={centro.alto} estilo={{ justifyContent: "center" }}>
          {centro.el}
        </Capa>
        <Capa x={MARGEN} y={yAbajo} ancho={ancho} alto={abajo.alto} estilo={{ justifyContent: "center" }}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

/** Confeti: puntos y cuadritos en lugares fijos (proporción del lienzo), en los colores del papel picado. Decoración sin texto encima. */
const CONFETI: readonly [number, number, number, "o" | "c"][] = [
  [0.06, 0.04, 34, "o"], [0.2, 0.09, 18, "c"], [0.34, 0.03, 22, "o"], [0.62, 0.05, 28, "c"], [0.78, 0.1, 20, "o"], [0.92, 0.03, 30, "o"],
  [0.04, 0.2, 18, "c"], [0.95, 0.22, 24, "c"], [0.09, 0.33, 26, "o"], [0.9, 0.36, 18, "o"], [0.03, 0.45, 20, "o"], [0.97, 0.48, 26, "c"],
];

function dibujarBoleto(c: Contexto): Dibujo {
  const { textos: t, paleta: p, formato: f } = c;
  const zona = zonaDeTexto(f);
  const ancho = f.ancho - 2 * MARGEN;
  // El boleto: a la izquierda el día y la hora, a la derecha el sitio y el precio, separados por la línea picada.
  const izquierda = 300;
  const derecha = ancho - izquierda - 2 * 36 - 40;
  // Sin foto el círculo es el sello con el día: el boleto dice solo la hora. Si no queda nada que decir a la izquierda (un festival sin foto),
  // va ahí el precio.
  const dia = c.foto ? texto(t.diaCorto, { fuente: "ancha-negra", ancho: izquierda, renglones: 2, mayor: 52, menor: 30 }, p.sobreAcento, { interlineado: 1 }) : VACIO;
  const hora = texto(t.hora, { fuente: c.foto ? "media" : "ancha-negra", ancho: izquierda, renglones: 1, mayor: c.foto ? 32 : 52, menor: 22 }, p.sobreAcento, { interlineado: 1.2 });
  const precioIzquierda = !dia.el && !hora.el;
  const cuando = precioIzquierda ? etiqueta(t.precio, izquierda, p.sobreAcento) : columna([dia, hora], 8);
  const donde = columna([texto(t.sitio, { fuente: "media", ancho: derecha, renglones: 2, mayor: 34, menor: 24 }, p.sobreAcento, { interlineado: 1.15 }), precioIzquierda ? VACIO : etiqueta(t.precio, derecha, p.sobreAcento)], 10);
  const altoBoleto = Math.max(cuando.alto, donde.alto) + 2 * 32;
  const boleto: Bloque = {
    el: (
      <div style={{ display: "flex", position: "relative", width: ancho, height: altoBoleto, padding: "32px 36px", borderRadius: 24, backgroundColor: p.acento, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", width: izquierda }}>{cuando.el}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", height: altoBoleto - 24 }}>
          {Array.from({ length: Math.floor((altoBoleto - 24) / 22) }, (_, i) => (
            <div key={i} style={{ display: "flex", width: 8, height: 8, borderRadius: 4, backgroundColor: p.fondo }} />
          ))}
        </div>
        <div style={{ display: "flex", width: derecha }}>{donde.el}</div>
        <div style={{ display: "flex", position: "absolute", left: 36 + izquierda + 20 - 18, top: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: p.fondo }} />
        <div style={{ display: "flex", position: "absolute", left: 36 + izquierda + 20 - 18, bottom: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: p.fondo }} />
      </div>
    ),
    alto: altoBoleto,
  };
  const quien = texto(nombresVisibles(t.artistas, 2), { fuente: "media", ancho, renglones: 2, mayor: 30, menor: 22 }, p.suave, { interlineado: 1.2, alinear: "center" });
  const abajo = columna([quien, boleto, pie(c, ancho, "center")], 24, { alinear: "center", ancho });
  const sub = subtitulo(t.subtitulo, ancho, p.texto, "center");
  const arriba = etiqueta(t.etiqueta, ancho, p.acento, "center");
  const yArriba = zona.arriba;
  const yAbajo = f.alto - zona.abajo - abajo.alto;
  const disponible = yAbajo - yArriba - arriba.alto - 3 * 36;
  const diametro = Math.min(560, Math.round(disponible * (c.foto ? 0.52 : 0.42)));
  const titulo = tituloFeria(c, ancho, disponible - diametro - (sub.el ? sub.alto + 16 : 0), t.tramo === "corto" ? 140 : t.tramo === "medio" ? 108 : 84);
  const centro = columna([titulo, sub], 16, { alinear: "center", ancho });
  const yCirculo = yArriba + arriba.alto + 36;
  const yCentro = yCirculo + diametro + 36 + Math.max(0, (disponible - diametro - 36 - centro.alto) / 2);
  return {
    elemento: (
      <Lienzo c={c}>
        {CONFETI.map(([x, y, lado, forma], i) => (
          <Capa key={i} x={x * f.ancho} y={y * f.alto} ancho={lado} alto={lado} estilo={{ backgroundColor: PICADO[i % PICADO.length], borderRadius: forma === "o" ? lado / 2 : 4, ...(forma === "c" ? { transform: "rotate(20deg)" } : {}) }} />
        ))}
        <Capa x={MARGEN} y={yArriba} ancho={ancho} alto={arriba.alto} estilo={{ justifyContent: "center" }}>
          {arriba.el}
        </Capa>
        <Capa x={(f.ancho - diametro) / 2} y={yCirculo} ancho={diametro} alto={diametro} estilo={{ borderRadius: diametro / 2, overflow: "hidden", ...(c.foto ? { border: "12px solid #ffffff" } : {}), boxShadow: `0 0 0 6px ${p.texto}` }}>
          {c.foto ? <Foto src={c.foto} ancho={diametro - 24} alto={diametro - 24} estilo={{ borderRadius: (diametro - 24) / 2 }} /> : sello(c, diametro).el}
        </Capa>
        <Capa x={MARGEN} y={yCentro} ancho={ancho} alto={centro.alto} estilo={{ justifyContent: "center" }}>
          {centro.el}
        </Capa>
        <Capa x={MARGEN} y={yAbajo} ancho={ancho} alto={abajo.alto} estilo={{ justifyContent: "center" }}>
          {abajo.el}
        </Capa>
      </Lienzo>
    ),
    tituloRecortado: !!titulo.recortado,
  };
}

export const feriaPicado: Plantilla = { id: "feria-picado", familia: "feria", nombre: "Feria, papel picado", fotoNecesaria: false, artistasVisibles: 2, afinidad: AFINIDAD, paletas: PALETAS, tratamiento: "natural", dibujar: dibujarPicado };
export const feriaBoleto: Plantilla = { id: "feria-boleto", familia: "feria", nombre: "Feria, boleto y confeti", fotoNecesaria: false, artistasVisibles: 2, afinidad: AFINIDAD, paletas: ["durazno", "crema", "cielo", "menta"], tratamiento: "natural", dibujar: dibujarBoleto };
