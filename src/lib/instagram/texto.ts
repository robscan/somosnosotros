import { normalizarRedes } from "../enlaces";
import { esDeVariosDias, formatearLargo, horasDelEvento, textoDePeriodo, diaLocal } from "../fechas";

/**
 * El texto de una publicación de Instagram (OL-458, prototipo firmado `admin-instagram.html`, bitácora 490). Lo arma el sistema con los datos
 * del evento y la administración lo puede cambiar antes de publicar. Puro: lo prueban `texto.test.ts` y lo usan la hoja y la acción.
 *
 *   Título
 *   Cuándo (como lo dice la app)
 *   📍 Lugar @lugar · Ciudad
 *   Precio o «Gratis»
 *
 *   Con @artista y Nombre
 *
 *   Sigue a @smsnstrsapp para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).
 *
 *   #Ciudad #AgendaCultural #Disciplina #Clase #SomosNosotrxs
 *
 * Instagram corta en 2 200 caracteres, 30 etiquetas (#) y 20 menciones (@); los enlaces del pie no se pueden tocar (por eso «enlace en la bio»).
 * Las etiquetas van sin acento (decisión del founder al firmar): así las escribe la gente.
 */

export const CUENTA_INSTAGRAM = "smsnstrsapp";
export const TOPE_CARACTERES = 2200;
export const TOPE_HASHTAGS = 30;
export const TOPE_MENCIONES = 20;
export const INVITACION = `Sigue a @${CUENTA_INSTAGRAM} para enterarte de más planes. Este y otros eventos, en somosnosotrxs.org (enlace en la bio).`;

/** Un usuario de Instagram válido: letras, números, punto y guion bajo, hasta 30. */
const USUARIO = /^[A-Za-z0-9._]{1,30}$/;
/** Rutas de instagram.com que no son un perfil. */
const NO_PERFIL = new Set(["p", "reel", "reels", "stories", "explore", "tv", "accounts", "direct", "about", "legal", "developer"]);

/** El usuario de Instagram de una ficha, del primer enlace de Instagram de sus redes (`redes` en cualquiera de sus formas); null si no tiene. */
export function usuarioDeInstagram(redes: unknown): string | null {
  for (const e of normalizarRedes(redes)) {
    if (e.red !== "instagram") continue;
    try {
      const parte = new URL(e.url).pathname.split("/").filter(Boolean)[0] ?? "";
      const u = decodeURIComponent(parte).replace(/^@/, "");
      if (USUARIO.test(u) && !NO_PERFIL.has(u.toLowerCase())) return u.toLowerCase();
    } catch {
      // un enlace roto no es un usuario
    }
  }
  return null;
}

export type ArtistaIg = { nombre: string; usuario: string | null; disciplina: string | null };
export type EventoIg = {
  titulo: string;
  inicio: string;
  fin: string | null;
  zona: string;
  clase: string;
  precio: string | null;
  /** El lugar (o el sitio: «otro sitio», sin usuario) y su usuario de Instagram. */
  lugar: { nombre: string; usuario: string | null } | null;
  ciudad: string;
  artistas: ArtistaIg[];
};

/** «domingo 4 de octubre» → «Domingo 4 de octubre». */
const mayuscula = (t: string) => (t ? t[0].toLocaleUpperCase("es-MX") + t.slice(1) : t);

/** Cuándo, como lo dice la app: un día con sus horas; lo que dura varios días, sus días (y «Hasta el …» si ya abrió). */
export function cuandoDelTexto(e: Pick<EventoIg, "inicio" | "fin" | "zona" | "clase">, ahora: Date): string {
  if (e.fin && esDeVariosDias(e.inicio, e.fin, e.zona)) {
    const dias = textoDePeriodo(diaLocal(new Date(e.inicio), e.zona), diaLocal(new Date(e.fin), e.zona), ahora, e.zona);
    return e.clase === "exposicion" || e.clase === "festival" ? mayuscula(dias) : `${mayuscula(dias)} · ${horasDelEvento(e.inicio, null, e.zona)}`;
  }
  return mayuscula(formatearLargo(e.inicio, ahora, e.fin, e.zona));
}

/** Una etiqueta sin acentos ni espacios, cada palabra con mayúscula: «San Luis Potosí» → «#SanLuisPotosi». */
export function hashtag(texto: string): string {
  const limpio = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]+/g, " ").trim();
  return limpio ? `#${limpio.split(/\s+/).map((p) => p[0].toUpperCase() + p.slice(1)).join("")}` : "";
}

const POR_DISCIPLINA: Record<string, string> = { musica: "Musica", teatro: "Teatro", danza: "Danza", artes_visuales: "ArteVisual", letras: "Literatura", cine: "Cine", circo: "Circo" };
const POR_CLASE: Record<string, string> = { exposicion: "Exposicion", festival: "Festival", taller: "Taller" };

/** De 3 a 5 etiquetas: la ciudad, la agenda, la disciplina de sus artistas y la clase (si las hay), y la marca. */
export function etiquetasDelTexto(e: Pick<EventoIg, "ciudad" | "clase" | "artistas">): string[] {
  const disciplinas = [...new Set(e.artistas.map((a) => (a.disciplina ? POR_DISCIPLINA[a.disciplina] : null)).filter(Boolean))] as string[];
  const medio = [...(POR_CLASE[e.clase] ? [POR_CLASE[e.clase]] : []), ...disciplinas].slice(0, 2).map((x) => `#${x}`);
  return [hashtag(e.ciudad), "#AgendaCultural", ...medio, "#SomosNosotrxs"].filter(Boolean);
}

/** A quién se etiqueta en la foto: el lugar y cada artista con usuario, sin repetir y sin los que se quitaron. */
export function etiquetasDeLaFoto(e: Pick<EventoIg, "lugar" | "artistas">, quitadas: readonly string[] = []): string[] {
  const todas = [e.lugar?.usuario ?? null, ...e.artistas.map((a) => a.usuario)].filter((u): u is string => !!u);
  return [...new Set(todas)].filter((u) => !quitadas.includes(u)).slice(0, TOPE_MENCIONES);
}

/** El texto que arma el sistema. Lo que se quitó de la foto tampoco se menciona: queda su nombre. */
export function armarTexto(e: EventoIg, ahora: Date, quitadas: readonly string[] = []): string {
  const con = (nombre: string, usuario: string | null) => (usuario && !quitadas.includes(usuario) ? `@${usuario}` : nombre);
  const lugar = e.lugar ? (e.lugar.usuario && !quitadas.includes(e.lugar.usuario) ? `${e.lugar.nombre} @${e.lugar.usuario}` : e.lugar.nombre) : null;
  const quienes = e.artistas.map((a) => con(a.nombre, a.usuario));
  const lista = quienes.length > 1 ? `${quienes.slice(0, -1).join(", ")} y ${quienes.at(-1)}` : (quienes[0] ?? "");
  const precio = e.precio?.trim() ? e.precio.trim() : "Gratis";
  const partes = [
    [e.titulo.trim(), cuandoDelTexto(e, ahora), `📍 ${lugar ? `${lugar} · ` : ""}${e.ciudad}`, precio].join("\n"),
    ...(lista ? [`Con ${lista}`] : []),
    INVITACION,
    etiquetasDelTexto(e).join(" "),
  ];
  return partes.join("\n\n");
}

export type Limites = { caracteres: number; hashtags: number; menciones: number; problema: string | null };

/** Lo que Instagram no deja pasar, en una frase llana; null si cabe. */
export function revisarTexto(texto: string): Limites {
  const caracteres = [...texto].length;
  const hashtags = (texto.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
  const menciones = (texto.match(/(^|[\s(])@[A-Za-z0-9._]+/g) ?? []).length;
  const problema =
    caracteres > TOPE_CARACTERES
      ? `El texto pasa de ${TOPE_CARACTERES.toLocaleString("es-MX")} caracteres: quítale ${caracteres - TOPE_CARACTERES}.`
      : hashtags > TOPE_HASHTAGS
        ? `Lleva ${hashtags} etiquetas (#) y Instagram deja ${TOPE_HASHTAGS}.`
        : menciones > TOPE_MENCIONES
          ? `Lleva ${menciones} menciones (@) y Instagram deja ${TOPE_MENCIONES}.`
          : null;
  return { caracteres, hashtags, menciones, problema };
}
