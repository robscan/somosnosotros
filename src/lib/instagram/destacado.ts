import { etiquetaDisciplina } from "../artistas";
import { conMayuscula, diaConMes, diaLargo, diaLocal, horaCorta } from "../fechas";
import { etiquetaTipo } from "../lugares";
import { bloqueDeLaSemana, TOPE_EVENTOS_FICHA, type ObraEnTexto } from "./semanaDeFicha";
import { conCreditoDeFoto, CUENTA_INSTAGRAM, hashtag, revisarTexto, usuarioDeInstagram } from "./texto";

/**
 * Lo que dicen la tarjeta y el texto de un artista o de un lugar destacado de la semana, y el aviso previo (OL-479; firmado en el prototipo de
 * OL-477, bitácora 509, «El texto» y «El aviso previo»). Puro: lo usan la hoja del día (para enseñarlo y editarlo) y el trabajador de la cola
 * (para publicarlo). Lo prueba `destacado.test.ts`.
 *
 *   La frase gancho (lo único que Instagram enseña antes de «más»).
 *
 *   Música · Canción · San Luis Potosí
 *   Próxima fecha: viernes 16 de octubre, 7:00 pm, en el Teatro de la Paz @teatrodelapazslp.
 *
 *   Lee su ficha en somosnosotrxs.org/artistas/<slug> (enlace en la bio).
 *   Más de su trabajo en @cuenta
 *   Foto: @cuenta
 *
 *   Sigue a @smsnstrsapp para conocer a más artistas de tu ciudad.
 *
 *   #SanLuisPotosi #ArtistasLocales #Musica #SomosNosotrxs
 *
 * Un lugar sin Instagram no lleva cuenta ni crédito (ni aviso previo): solo su ficha. Las etiquetas van sin acento (así las escribe la gente).
 */

export const DOMINIO = "somosnosotrxs.org";

const POR_DISCIPLINA: Record<string, string> = { musica: "Musica", teatro: "Teatro", danza: "Danza", artes_visuales: "ArteVisual", letras: "Literatura", cine: "Cine", circo: "Circo" };
const POR_TIPO_LUGAR: Record<string, string> = { museo: "Museo", galeria: "Galeria", foro: "Foro", casa_de_cultura: "CasaDeCultura", biblioteca: "Biblioteca", cafe_bar: "Cafe", escuela: "Escuela", colectivo: "Colectivo" };

/** La frase gancho: las primeras oraciones de la descripción hasta tener 60 letras, sin pasar de 220, cortada siempre en una oración. */
export function gancho(descripcion: string): string {
  const limpia = descripcion.replace(/\s+/g, " ").trim();
  const oraciones = limpia.match(/[^.!?…]+[.!?…]+(?=\s|$)|[^.!?…]+$/g)?.map((o) => o.trim()).filter(Boolean) ?? [];
  let frase = "";
  for (const o of oraciones) {
    const junto = frase ? `${frase} ${o}` : o;
    if (frase && [...junto].length > 220) break;
    frase = junto;
    if ([...frase].length >= 60) break;
  }
  // Una sola oración de más de 220 (sin puntos): hasta la última palabra que cabe, con su punto.
  if ([...frase].length > 220) {
    const corte = frase.slice(0, 219).replace(/\s+\S*$/, "");
    return `${corte.replace(/[,;:\s]+$/, "")}…`;
  }
  return frase;
}

/** «Música · Canción» (el artista) o «Museo» (el lugar): la ceja de la tarjeta y la primera línea de datos del texto. */
export function cejaArtista(a: { disciplina: string; detalle: string | null }): string {
  const detalle = a.detalle?.trim() ? a.detalle.trim()[0].toLocaleUpperCase("es-MX") + a.detalle.trim().slice(1) : null;
  return [etiquetaDisciplina(a.disciplina), detalle].filter(Boolean).join(" · ");
}
export function cejaLugar(l: { tipo: string; detalle?: string | null }): string {
  return l.tipo === "otro" && l.detalle?.trim() ? l.detalle.trim()[0].toLocaleUpperCase("es-MX") + l.detalle.trim().slice(1) : etiquetaTipo(l.tipo);
}

/** Una fecha que viene: cuándo empieza y dónde (con la cuenta del lugar, si la tiene). */
export type Proxima = { inicio: string; zona: string; lugar: string | null; lugarRedes?: unknown };

/** «Vie 16 de oct, 7:00 pm · Teatro de la Paz»: la próxima fecha en la tarjeta. */
export function proximaEnTarjeta(p: Proxima, ahora: Date): string {
  const dia = diaConMes(p.inicio, ahora, p.zona);
  return [`${dia[0].toLocaleUpperCase("es-MX")}${dia.slice(1)}, ${horaCorta(p.inicio, p.zona)}`, p.lugar].filter(Boolean).join(" · ");
}

/** «viernes 16 de octubre, 7:00 pm, en el Teatro de la Paz @teatrodelapazslp»: la próxima fecha en el texto. */
export function proximaEnTexto(p: Proxima, ahora: Date): string {
  const dia = diaLargo(diaLocal(new Date(p.inicio), p.zona), ahora, p.zona);
  const cuenta = usuarioDeInstagram(p.lugarRedes);
  const lugar = p.lugar ? `, en ${/^(el|la|los|las) /i.test(p.lugar) ? "" : "el "}${p.lugar}${cuenta ? ` @${cuenta}` : ""}` : "";
  return `${dia}, ${horaCorta(p.inicio, p.zona)}${lugar}`;
}

/** OL-516: `semana`, sus eventos de la semana en que sale (las obras del carrusel, `obrasDeLaSemana`); el texto los lista. */
export type ArtistaDestacado = { nombre: string; slug: string; descripcion: string; disciplina: string; detalle: string | null; ciudad: string; redes: unknown; proxima?: Proxima | null; semana?: ObraEnTexto[] };
export type LugarDestacado = { nombre: string; slug: string; descripcion: string; tipo: string; detalle?: string | null; ciudad: string; direccion: string | null; redes: unknown; semana: ObraEnTexto[] };

/** El texto del artista: la frase gancho, qué hace y su ciudad, su próxima fecha si la tiene (o, OL-516, sus eventos de la semana, uno por renglón
 *  y con su lugar), su ficha, su cuenta y el crédito, la invitación y de 3 a 4 etiquetas. `cuantas`: hasta cuántos eventos lista. */
export function textoArtista(a: ArtistaDestacado, ahora: Date, cuantas = TOPE_EVENTOS_FICHA): string {
  const cuenta = usuarioDeInstagram(a.redes);
  const etiquetas = [hashtag(a.ciudad), "#ArtistasLocales", POR_DISCIPLINA[a.disciplina] ? `#${POR_DISCIPLINA[a.disciplina]}` : null, "#SomosNosotrxs"].filter(Boolean);
  const bloque = bloqueDeLaSemana(a.semana ?? [], ahora, { conLugar: true, cuantas });
  return [
    gancho(a.descripcion),
    [`${cejaArtista(a)} · ${a.ciudad}`, !bloque && a.proxima ? `Próxima fecha: ${proximaEnTexto(a.proxima, ahora)}.` : null].filter(Boolean).join("\n"),
    ...(bloque ? [bloque] : []),
    [`Lee su ficha en ${DOMINIO}/artistas/${a.slug} (enlace en la bio).`, ...(cuenta ? [`Más de su trabajo en @${cuenta}`, `Foto: @${cuenta}`] : [])].join("\n"),
    `Sigue a @${CUENTA_INSTAGRAM} para conocer a más artistas de tu ciudad.`,
    etiquetas.join(" "),
  ].join("\n\n");
}

/**
 * El texto que arma el sistema para un artista o un lugar, sin su cuenta si la administración la quitó (`quitadas`: sin mención ni «Foto: @cuenta»)
 * y con el crédito de la portada (`credito`, OL-491/OL-504). Lo mismo en el trabajador (`textoDeFicha`) y en las dos hojas que lo enseñan y lo
 * dejan editar (la del día de la semana y la de «Publicar en Instagram» de la ficha, OL-515).
 */
export function textoDeDestacado(
  c: { tipo: "artista"; datos: ArtistaDestacado; cuenta: string | null; credito?: string | null } | { tipo: "lugar"; datos: LugarDestacado; cuenta: string | null; credito?: string | null },
  ahora: Date,
  quitadas: readonly string[] = [],
): string {
  const sinCuenta = !!c.cuenta && quitadas.includes(c.cuenta);
  // OL-516: si no cabe en lo que deja Instagram, la lista de la semana se recorta («Y N más en su ficha.») antes de rendirse.
  const armar = (cuantas: number) =>
    conCreditoDeFoto(c.tipo === "artista" ? textoArtista(sinCuenta ? { ...c.datos, redes: [] } : c.datos, ahora, cuantas) : textoLugar(sinCuenta ? { ...c.datos, redes: [] } : c.datos, ahora, cuantas), c.credito ?? null);
  let cuantas = TOPE_EVENTOS_FICHA;
  let texto = armar(cuantas);
  while (cuantas > 1 && revisarTexto(texto).problema) texto = armar(--cuantas);
  return texto;
}

/** El texto del lugar: su frase gancho, qué es y dónde, lo que tiene esta semana (OL-516: un renglón por evento, con su día y su hora, como en
 *  «Esta semana»), la ficha, su cuenta y el crédito (si tiene Instagram), la invitación y las etiquetas. `cuantas`: hasta cuántos eventos lista. */
export function textoLugar(l: LugarDestacado, ahora: Date, cuantas = TOPE_EVENTOS_FICHA): string {
  const cuenta = usuarioDeInstagram(l.redes);
  const etiquetas = [hashtag(l.ciudad), "#EspaciosCulturales", POR_TIPO_LUGAR[l.tipo] ? `#${POR_TIPO_LUGAR[l.tipo]}` : null, "#SomosNosotrxs"].filter(Boolean);
  const bloque = bloqueDeLaSemana(l.semana, ahora, { conLugar: false, cuantas });
  return [
    gancho(l.descripcion),
    [`${cejaLugar(l)} · ${l.ciudad}`, l.direccion?.trim() ? `📍 ${l.direccion.trim()}` : null].filter(Boolean).join("\n"),
    ...(bloque ? [bloque] : []),
    [`Lee su ficha en ${DOMINIO}/lugares/${l.slug} (enlace en la bio).`, ...(cuenta ? [`Más en @${cuenta}`, `Foto: @${cuenta}`] : [])].join("\n"),
    `Sigue a @${CUENTA_INSTAGRAM} para conocer más lugares de tu ciudad.`,
    etiquetas.join(" "),
  ].join("\n\n");
}

export type EventoDeLaSemana = { titulo: string; inicio: string; zona: string; lugar: string | null; lugarRedes?: unknown };

/** El texto de «Esta semana» (el carrusel del jueves): los eventos del fin, uno por línea con su día, su lugar y su cuenta. */
export function textoSemana(s: { ciudad: string; eventos: EventoDeLaSemana[] }, ahora: Date): string {
  const lineas = s.eventos.map((e) => {
    const dia = diaConMes(e.inicio, ahora, e.zona).replace(/ de .*$/, "");
    const cuenta = usuarioDeInstagram(e.lugarRedes);
    const lugar = e.lugar ? ` · ${e.lugar}${cuenta ? ` @${cuenta}` : ""}` : "";
    return `${dia[0].toLocaleUpperCase("es-MX")}${dia.slice(1)} · ${horaCorta(e.inicio, e.zona)} · ${e.titulo.trim()}${lugar}`;
  });
  return [
    `Este fin en ${s.ciudad}:\n${lineas.join("\n")}`,
    `Sigue a @${CUENTA_INSTAGRAM} para enterarte de más planes. Estos y otros eventos, en ${DOMINIO} (enlace en la bio).`,
    [hashtag(s.ciudad), "#AgendaCultural", "#FinDeSemana", "#SomosNosotrxs"].filter(Boolean).join(" "),
  ].join("\n\n");
}

/**
 * «Del viernes 16 al domingo 18 de octubre»: el título de la portada de «Esta semana». Si todos los eventos caen el mismo día,
 * el día solo, «Viernes 6 de noviembre» (OL-508; founder, 2026-11-02: «Del viernes 6 al viernes 6» «no tiene sentido»).
 */
export function tituloSemana(desde: string, hasta: string, zona: string, ahora: Date): string {
  const a = diaLargo(desde, ahora, zona);
  const b = diaLargo(hasta, ahora, zona);
  if (a === b) return conMayuscula(a);
  const [, mesA] = a.match(/de (\S+)( de \d+)?$/) ?? [];
  const [, mesB] = b.match(/de (\S+)( de \d+)?$/) ?? [];
  return mesA && mesA === mesB ? `Del ${a.replace(/ de \S+( de \d+)?$/, "")} al ${b}` : `Del ${a} al ${b}`;
}

/** El primer nombre para saludar: «Valeria» de «Valeria Quiroz»; un grupo o un lugar, completo («Colectivo Nube de Papel»). */
export function saludoDe(nombre: string, grupo: boolean): string {
  const limpio = nombre.replace(/\s*\(demo\)\s*$/i, "").trim();
  return grupo ? limpio : (limpio.split(/\s+/)[0] ?? limpio);
}

/**
 * El mensaje directo de la semana anterior (se manda a mano desde @smsnstrsapp: la API no deja escribir primero): qué día, qué se publica, el
 * crédito y cómo decir que no. Sin nada que parezca vigilancia: solo lo que ya dice su ficha.
 */
export function avisoPrevio(a: { saludo: string; dia: string; tipo: "artista" | "lugar"; ficha: string }): string {
  // OL-505 («Repisa»): el artista sale con su foto de perfil, sin portada; el lugar, con su portada si la tiene.
  const quien = a.tipo === "artista" ? "entre lxs artistas destacadxs de la semana: tu foto y lo que dice tu ficha" : "entre los lugares destacados de la semana: tu portada (si la tienes) y lo que dice tu ficha";
  return [
    `¡Hola, ${a.saludo}! Te escribimos de Somos Nosotrxs (@${CUENTA_INSTAGRAM}), la agenda cultural de la ciudad.`,
    `El ${a.dia} queremos presentarte en nuestro Instagram ${quien} (${a.ficha}), con el crédito de la foto a tu cuenta.`,
    "Si prefieres que no, contéstanos «no» y no se publica. Si quieres cambiar algo de tu ficha antes, lo puedes hacer desde la app o decirnos por aquí.",
  ].join("\n\n");
}

/** La conversación de Instagram de una cuenta (se abre en la app de Instagram del teléfono). */
export const conversacionDe = (cuenta: string) => `https://ig.me/m/${encodeURIComponent(cuenta)}`;
