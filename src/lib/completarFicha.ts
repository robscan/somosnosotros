/**
 * «Completar ficha» (OL-445): lo que las rutinas descubrieron de un artista y su ficha no tiene, propuesto en su ficha del Showcase para que la
 * administración lo acepte. Dos fuentes: la propuesta de artista aceptada de la que nació la ficha (`propuestas.datos`: disciplina, detalle,
 * redes y `obra`, la frase sobre su obra que la rutina leyó de la fuente y nunca se usó) y las evidencias aceptadas de obra cuyo enlace es la
 * página de artista en una plataforma (Spotify, Bandcamp, YouTube…). Reglas:
 *  · solo se propone lo que falta: disciplina «por completar», detalle vacío, sin descripción, una red que no tiene (de una red que ya tiene,
 *    nada; con 8 enlaces, ningún enlace más);
 *  · aceptar escribe solo lo que falta y nunca sobrescribe lo que alguien puso (`aplicarSugerencia` lo vuelve a mirar contra la ficha de ahora);
 *  · si la ficha está reclamada (tiene cuenta ligada), no se cambia nada: la sugerencia se ve y solo se sugiere a quien la lleva;
 *  · lo descartado no vuelve (`showcase_candidatos.completar_descartadas`, por su clave).
 * Aquí solo la lógica pura; la lectura está en `admin/showcase/consultas.ts` y la escritura en `admin/showcase/acciones.ts`.
 */
import { DISCIPLINAS, etiquetaDisciplina, LIMITES_ARTISTA } from "./artistas";
import { dominioDe, enlaceVisible, etiquetaEnlace, LIMITE_ENLACES, normalizarRedes, reconocerEnlace, type Enlace } from "./enlaces";

export type CampoCompletar = "disciplina" | "detalle" | "descripcion" | "enlace";

/** Lo que la ficha tiene hoy (lo que importa para saber qué falta). */
export type FichaACompletar = { disciplina: string; detalle: string | null; descripcion: string | null; redes: unknown };
/** Una propuesta de artista aceptada (`propuestas`, tipo artista) cuya ficha es esta. */
export type PropuestaAceptada = { id: string; fuente: string; datos: unknown };
/** Una evidencia aceptada del showcase (las demás no cuentan). */
export type EvidenciaParaCompletar = { id: string; tipo: string; titulo: string; url: string; estado: string };

export type Sugerencia = {
  /** Estable entre lecturas: lo que se guarda al descartarla y lo que la acción busca al aceptarla. */
  clave: string;
  campo: CampoCompletar;
  /** Lo que se escribiría (el valor de la disciplina, el texto o la dirección del enlace). */
  valor: string;
  /** Cómo se lee en la tarjeta: «Música», «Jazz», el texto, «Spotify». */
  texto: string;
  /** Solo en `enlace`: la dirección como se lee («open.spotify.com/artist/…»). */
  direccion?: string;
  /** El enlace que se añadiría (solo en `enlace`). */
  enlace?: Enlace;
  /** De dónde sale, en palabras, y su enlace si lo hay. */
  origen: { texto: string; url: string | null };
};

export const ETIQUETA_CAMPO: Record<CampoCompletar, string> = { disciplina: "Disciplina", detalle: "Qué hace", descripcion: "Sobre", enlace: "Enlace" };

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const texto = (v: unknown): string => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
/** La dirección para comparar: sin esquema, sin www, sin la barra final ni la consulta, en minúsculas. */
const comparable = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();

/**
 * La página de artista en una plataforma, a partir de un enlace de obra (OL-445): Spotify o Apple Music, Deezer y Tidal solo con `/artist/`; el
 * perfil de Bandcamp (el subdominio), de SoundCloud, Mixcloud y Audiomack (su primer tramo); un canal de YouTube (`/@`, `/channel/`, `/c/`).
 * Un disco, un video o una nota no son su página: null. Instagram y Facebook tampoco (el enlace de un premio suele ser del festival).
 */
export function perfilDeArtista(url: string): Enlace | null {
  const e = reconocerEnlace(url);
  if (!e) return null;
  let u: URL;
  try {
    u = new URL(e.url);
  } catch {
    return null;
  }
  const tramos = u.pathname.split("/").filter(Boolean);
  const origen = `https://${u.hostname.replace(/^www\./, "")}`;
  switch (e.red) {
    case "spotify":
    case "applemusic":
    case "deezer":
    case "tidal": {
      const i = tramos.indexOf("artist");
      return i >= 0 && tramos[i + 1] ? { red: e.red, url: `${origen}/${tramos.slice(0, i + 2).join("/")}` } : null;
    }
    case "bandcamp":
      return /^[a-z0-9-]+\.bandcamp\.com$/i.test(u.hostname) && !/^(www|daily|blog)\./i.test(u.hostname) ? { red: "bandcamp", url: `https://${u.hostname.toLowerCase()}` } : null;
    case "soundcloud":
    case "mixcloud":
    case "audiomack":
      return tramos[0] && !["discover", "search", "charts", "stream", "upload"].includes(tramos[0]) ? { red: e.red, url: `${origen}/${tramos[0]}` } : null;
    case "youtube":
      if (tramos[0]?.startsWith("@")) return { red: "youtube", url: `https://youtube.com/${tramos[0]}` };
      if ((tramos[0] === "channel" || tramos[0] === "c") && tramos[1]) return { red: "youtube", url: `https://youtube.com/${tramos[0]}/${tramos[1]}` };
      return null;
    default:
      return null;
  }
}

/** Los enlaces que trae una propuesta (`datos.redes`: textos o `{ url }`), reconocidos. */
function enlacesDePropuesta(datos: Record<string, unknown>): Enlace[] {
  const lista = Array.isArray(datos.redes) ? datos.redes : [];
  return lista.flatMap((x) => {
    const t = typeof x === "string" ? x : typeof objeto(x).url === "string" ? (objeto(x).url as string) : "";
    const e = t ? reconocerEnlace(t) : null;
    return e ? [e] : [];
  });
}

/** Las sugerencias de una ficha, en orden: disciplina, qué hace, sobre y los enlaces. Sin las descartadas ni repetidas. */
export function sugerenciasCompletar(e: { ficha: FichaACompletar; propuestas: readonly PropuestaAceptada[]; evidencias: readonly EvidenciaParaCompletar[]; descartadas?: readonly string[] }): Sugerencia[] {
  const fuera = new Set(e.descartadas ?? []);
  const out: Sugerencia[] = [];
  const poner = (s: Sugerencia) => {
    if (!fuera.has(s.clave) && !out.some((x) => x.clave === s.clave || (x.campo === s.campo && s.campo !== "enlace"))) out.push(s);
  };
  const origenPropuesta = (p: PropuestaAceptada) => {
    const url = texto(objeto(p.datos).url);
    return { texto: `Propuesta aceptada · ${p.fuente}`, url: /^https?:\/\//i.test(url) ? url : null };
  };
  for (const p of e.propuestas) {
    const d = objeto(p.datos);
    const disciplina = texto(d.disciplina);
    if (e.ficha.disciplina === "por_completar" && DISCIPLINAS.some((x) => x.valor === disciplina)) {
      poner({ clave: `disciplina:${disciplina}`, campo: "disciplina", valor: disciplina, texto: etiquetaDisciplina(disciplina), origen: origenPropuesta(p) });
    }
    const detalle = texto(d.detalle);
    if (!e.ficha.detalle?.trim() && detalle && detalle.length <= LIMITES_ARTISTA.detalle) {
      poner({ clave: `detalle:${detalle.toLowerCase()}`, campo: "detalle", valor: detalle, texto: detalle.charAt(0).toUpperCase() + detalle.slice(1), origen: origenPropuesta(p) });
    }
    const obra = texto(d.obra);
    if (!e.ficha.descripcion?.trim() && obra && obra.length <= LIMITES_ARTISTA.descripcion) {
      poner({ clave: `descripcion:${p.id}`, campo: "descripcion", valor: obra, texto: obra, origen: origenPropuesta(p) });
    }
  }
  // Los enlaces: de las propuestas y de la obra aceptada; solo de una red que la ficha no tiene, y no más de los que caben.
  const tiene = normalizarRedes(e.ficha.redes);
  if (tiene.length >= LIMITE_ENLACES) return out;
  const redesQueTiene = new Set(tiene.filter((x) => x.red !== "sitio").map((x) => x.red));
  const direcciones = new Set(tiene.map((x) => comparable(x.url)));
  const ponerEnlace = (en: Enlace, origen: Sugerencia["origen"]) => {
    if (direcciones.has(comparable(en.url)) || (en.red !== "sitio" && redesQueTiene.has(en.red))) return;
    if (out.some((x) => x.campo === "enlace" && x.enlace && (comparable(x.enlace.url) === comparable(en.url) || (en.red !== "sitio" && x.enlace.red === en.red)))) return;
    if (out.filter((x) => x.campo === "enlace").length + tiene.length >= LIMITE_ENLACES) return;
    poner({ clave: `enlace:${comparable(en.url)}`, campo: "enlace", valor: en.url, texto: etiquetaEnlace(en), direccion: enlaceVisible(en.url).replace(/^www\./, ""), enlace: en, origen });
  };
  for (const p of e.propuestas) for (const en of enlacesDePropuesta(objeto(p.datos))) ponerEnlace(en, origenPropuesta(p));
  for (const ev of e.evidencias) {
    if (ev.estado !== "aceptada" || ev.tipo !== "obra") continue;
    const en = perfilDeArtista(ev.url);
    if (en) ponerEnlace(en, { texto: `Evidencia aceptada · ${ev.titulo} (${dominioDe(ev.url)})`, url: ev.url });
  }
  return out;
}

export type Cambios = Partial<{ disciplina: string; detalle: string; descripcion: string; redes: Enlace[] }>;

/**
 * Lo que se escribe al aceptar una sugerencia, mirado contra la ficha de ahora: solo si sigue faltando, nunca encima de lo que hay. Con la ficha
 * reclamada, nada.
 */
export function aplicarSugerencia(ficha: FichaACompletar, s: Sugerencia, reclamada: boolean): { ok: true; cambios: Cambios } | { ok: false; motivo: string } {
  if (reclamada) return { ok: false, motivo: "La ficha es de su artista: no se cambia. Sugiéreselo a quien la lleva." };
  switch (s.campo) {
    case "disciplina":
      if (ficha.disciplina !== "por_completar") return { ok: false, motivo: "Ya tiene disciplina." };
      if (!DISCIPLINAS.some((x) => x.valor === s.valor)) return { ok: false, motivo: "Esa disciplina no existe." };
      return { ok: true, cambios: { disciplina: s.valor } };
    case "detalle":
      if (ficha.detalle?.trim()) return { ok: false, motivo: "Ya dice qué hace." };
      return { ok: true, cambios: { detalle: s.valor.slice(0, LIMITES_ARTISTA.detalle) } };
    case "descripcion":
      if (ficha.descripcion?.trim()) return { ok: false, motivo: "Ya tiene su texto." };
      return { ok: true, cambios: { descripcion: s.valor.slice(0, LIMITES_ARTISTA.descripcion) } };
    case "enlace": {
      const tiene = normalizarRedes(ficha.redes);
      const en = s.enlace;
      if (!en) return { ok: false, motivo: "Ese enlace no se reconoce." };
      if (tiene.length >= LIMITE_ENLACES) return { ok: false, motivo: `Ya tiene ${LIMITE_ENLACES} enlaces.` };
      if (tiene.some((x) => comparable(x.url) === comparable(en.url) || (en.red !== "sitio" && x.red === en.red))) return { ok: false, motivo: `Ya tiene ${etiquetaEnlace(en)}.` };
      return { ok: true, cambios: { redes: [...tiene, en] } };
    }
  }
}
