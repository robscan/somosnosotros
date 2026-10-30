import { limpiarCreditoFoto } from "../creditoFoto";
import { normalizarRedes } from "../enlaces";
import { claseDeCosto, COSTO_OPCIONAL, POR_CONFIRMAR, type Clase } from "../eventos";
import { diaConMes, diaLocal, esDeVariosDias, eventoPaso, formatearLargo, horaCorta, horasDelEvento, textoDePeriodo } from "../fechas";
import { tituloCorto } from "../tituloCorto";

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
 *
 * OL-463 (bitácora 495): un festival no es un evento suelto. Sus artistas son los de su marco (quien lo organiza) y los de todos sus actos, sin
 * repetir (`artistasDe`); su precio sale de sus actos si el marco no dice uno (`precioDelTexto`: nunca «Gratis» por omisión); y después de 📍 va su
 * programa por día («Vie 30 · 5:30 pm Meditación con @… · 6:30 pm …»), recortado para caber en 2 200 caracteres. Un evento de costo opcional
 * (exposición, taller, acto, inauguración) sin precio no dice ninguno, y uno con sesiones dice sus días y no un rango que parece diario.
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

export type ArtistaIg = {
  nombre: string;
  usuario: string | null;
  disciplina: string | null;
  /** Para no repetir a un artista que sale en el marco y en varios actos de un festival. */
  id?: string;
};
/** Un acto de un festival: lo que dice el programa y de donde salen sus artistas y su precio. */
export type ActoIg = {
  titulo: string;
  inicio: string;
  fin: string | null;
  precio: string | null;
  artistas: ArtistaIg[];
  /** Sus funciones (horario por día): cada una sale en su día del programa. */
  sesiones?: { inicio: string; fin: string | null }[];
};
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
  /** Los ligados al evento mismo (en un festival, al marco: quien lo organiza). Los de sus actos van en `actos`. */
  artistas: ArtistaIg[];
  /** Su costo se puede dejar vacío (OL-411, `costoOpcional`: exposición, taller, festival, acto, inauguración): sin precio, no se sabe. */
  opcional?: boolean;
  /** Sus sesiones (horario por día). */
  sesiones?: { inicio: string; fin: string | null }[];
  /** Solo en un festival: sus actos publicados y no cancelados (también los que ya pasaron: cuentan para el precio y las etiquetas). */
  actos?: ActoIg[];
};

/** Un nombre sin acentos ni mayúsculas, para comparar. */
const plano = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
/**
 * ¿El texto ya dice ese nombre, como palabras enteras y sin contar los @ («Meditación con Martha Franco» dice «Martha Franco»; «Mañana» no dice
 * «Ana»; «@pimpolina.clown» no dice «Pimpolina»)? Lo usan el programa y el texto de Facebook para no repetir un nombre.
 */
export function yaDice(texto: string, nombre: string): boolean {
  const n = plano(nombre);
  if (!n) return false;
  const limpio = plano(texto).replace(/@[a-z0-9._]+/g, " ");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(limpio);
}
/** La lista dicha como en español: «a», «a y b», «a, b y c». */
const enLista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : (xs[0] ?? ""));
const esFestival = (e: Pick<EventoIg, "clase" | "actos">) => e.clase === "festival" && !!e.actos?.length;

/** «domingo 4 de octubre» → «Domingo 4 de octubre». */
const mayuscula = (t: string) => (t ? t[0].toLocaleUpperCase("es-MX") + t.slice(1) : t);

/** Cuándo, como lo dice la app: un día con sus horas; lo que dura varios días, sus días (y «Hasta el …» si ya abrió). */
export function cuandoDelTexto(e: Pick<EventoIg, "inicio" | "fin" | "zona" | "clase"> & { sesiones?: EventoIg["sesiones"] }, ahora: Date): string {
  // Con sesiones (un taller, un horario por día), sus días: «Del 10 al 14» diría que es diario y a la hora de la primera (OL-463).
  if (e.clase !== "festival" && e.clase !== "exposicion" && (e.sesiones?.length ?? 0) > 1) return cuandoDeSesiones(e.sesiones!, e.zona, ahora);
  if (e.fin && esDeVariosDias(e.inicio, e.fin, e.zona)) {
    const dias = textoDePeriodo(diaLocal(new Date(e.inicio), e.zona), diaLocal(new Date(e.fin), e.zona), ahora, e.zona);
    return e.clase === "exposicion" || e.clase === "festival" ? mayuscula(dias) : `${mayuscula(dias)} · ${horasDelEvento(e.inicio, null, e.zona)}`;
  }
  return mayuscula(formatearLargo(e.inicio, ahora, e.fin, e.zona));
}

/** Los días de cada sesión: «3 sesiones: mar 10, jue 12 y sáb 14 de oct · 5:00–7:00 pm»; con horas distintas, cada una con la suya. Si ya pasó
 *  alguna, «Quedan 2 sesiones: …». */
export function cuandoDeSesiones(sesiones: readonly { inicio: string; fin: string | null }[], zona: string, ahora: Date): string {
  const todas = [...sesiones].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const vienen = todas.filter((s) => !eventoPaso(s.inicio, s.fin, ahora, zona));
  const lista = vienen.length ? vienen : todas;
  const dias = diasDichos(lista.map((s) => s.inicio), zona, ahora);
  const horas = lista.map((s) => horasDelEvento(s.inicio, s.fin, zona));
  const iguales = horas.every((h) => h === horas[0]);
  const cuantas = lista.length === 1 ? "1 sesión" : `${lista.length} sesiones`;
  const cabeza = vienen.length && vienen.length < todas.length ? `Quedan ${cuantas}` : mayuscula(cuantas);
  const cuerpo = iguales ? `${enLista(dias)} · ${horas[0]}` : enLista(dias.map((d, i) => `${d} · ${horas[i]}`));
  return `${cabeza}: ${cuerpo}`;
}

/** «mar 10», «jue 12» y «sáb 14 de oct»: el mes solo al final si todos son del mismo mes (y entonces solo en el último). */
function diasDichos(inicios: readonly string[], zona: string, ahora: Date): string[] {
  const dichos = inicios.map((i) => diaConMes(i, ahora, zona));
  const mismoMes = new Set(inicios.map((i) => diaLocal(new Date(i), zona).slice(0, 7))).size === 1;
  return mismoMes ? dichos.map((d, i) => (i < dichos.length - 1 ? d.replace(/ de .*$/, "") : d)) : dichos;
}

/** Una etiqueta sin acentos ni espacios, cada palabra con mayúscula: «San Luis Potosí» → «#SanLuisPotosi». */
export function hashtag(texto: string): string {
  const limpio = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]+/g, " ").trim();
  return limpio ? `#${limpio.split(/\s+/).map((p) => p[0].toUpperCase() + p.slice(1)).join("")}` : "";
}

const POR_DISCIPLINA: Record<string, string> = { musica: "Musica", teatro: "Teatro", danza: "Danza", artes_visuales: "ArteVisual", letras: "Literatura", cine: "Cine", circo: "Circo" };
const POR_CLASE: Record<string, string> = { exposicion: "Exposicion", festival: "Festival", taller: "Taller" };

/** De 3 a 5 etiquetas: la ciudad, la agenda, la disciplina de sus artistas (en un festival, también los de sus actos) y la clase, y la marca. */
export function etiquetasDelTexto(e: Pick<EventoIg, "ciudad" | "clase" | "artistas"> & { actos?: EventoIg["actos"] }): string[] {
  const disciplinas = [...new Set(artistasDe(e).map((a) => (a.disciplina ? POR_DISCIPLINA[a.disciplina] : null)).filter(Boolean))] as string[];
  const medio = [...(POR_CLASE[e.clase] ? [POR_CLASE[e.clase]] : []), ...disciplinas].slice(0, 2).map((x) => `#${x}`);
  return [hashtag(e.ciudad), "#AgendaCultural", ...medio, "#SomosNosotrxs"].filter(Boolean);
}

/** Instagram deja etiquetar a 20 cuentas en una foto. */
export const TOPE_ETIQUETAS_FOTO = 20;

const claveDe = (a: ArtistaIg) => a.id ?? (a.usuario ? `@${a.usuario}` : plano(a.nombre));

/**
 * Todos sus artistas, sin repetir. En un evento, los suyos. En un festival (OL-463), los de su marco (quien lo organiza) y los de todos sus actos:
 * primero los que tienen Instagram (son los que se etiquetan, y Instagram deja 20), entre ellos los del marco y luego los de más actos; los demás
 * después, en el orden del programa.
 */
export function artistasDe(e: Pick<EventoIg, "artistas"> & { actos?: EventoIg["actos"] }): ArtistaIg[] {
  if (!e.actos?.length) return e.artistas;
  const vistos = new Map<string, { a: ArtistaIg; marco: boolean; actos: number; orden: number }>();
  const sumar = (a: ArtistaIg, marco: boolean) => {
    const k = claveDe(a);
    const ya = vistos.get(k);
    if (ya) {
      ya.marco ||= marco;
      if (!marco) ya.actos++;
    } else vistos.set(k, { a, marco, actos: marco ? 0 : 1, orden: vistos.size });
  };
  for (const a of e.artistas) sumar(a, true);
  for (const acto of [...e.actos].sort((x, y) => x.inicio.localeCompare(y.inicio))) for (const a of acto.artistas) sumar(a, false);
  return [...vistos.values()]
    .sort((x, y) => Number(!!y.a.usuario) - Number(!!x.a.usuario) || Number(y.marco) - Number(x.marco) || y.actos - x.actos || x.orden - y.orden)
    .map((x) => x.a);
}

/** Todas las cuentas que se podrían etiquetar (el lugar y cada artista con usuario), sin repetir y sin las quitadas, antes del tope. */
function etiquetables(e: Pick<EventoIg, "lugar" | "artistas"> & { actos?: EventoIg["actos"] }, quitadas: readonly string[]): string[] {
  const todas = [e.lugar?.usuario ?? null, ...artistasDe(e).map((a) => a.usuario)].filter((u): u is string => !!u);
  return [...new Set(todas)].filter((u) => !quitadas.includes(u));
}

/** A quién se etiqueta en la foto: el lugar y cada artista con usuario, sin repetir, sin los que se quitaron y hasta 20 (`artistasDe` ordena). */
export function etiquetasDeLaFoto(e: Pick<EventoIg, "lugar" | "artistas"> & { actos?: EventoIg["actos"] }, quitadas: readonly string[] = []): string[] {
  return etiquetables(e, quitadas).slice(0, TOPE_ETIQUETAS_FOTO);
}

/** Cuántas cuentas con Instagram se quedan fuera de la foto por el tope de 20 (un festival con muchos artistas). */
export function etiquetasQueNoCaben(e: Pick<EventoIg, "lugar" | "artistas"> & { actos?: EventoIg["actos"] }, quitadas: readonly string[] = []): number {
  return Math.max(0, etiquetables(e, quitadas).length - TOPE_ETIQUETAS_FOTO);
}

/** Las cantidades de un precio escrito: «$120 a $250» → [120, 250]; «Cooperación solidaria» → []. */
function cantidades(precio: string): number[] {
  return (precio.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
}
const pesos = (n: number) => `$${n.toLocaleString("es-MX")}`;
const sinPrecio = (p: string | null | undefined) => !(p ?? "").trim() || (p ?? "").trim() === POR_CONFIRMAR;

/**
 * El precio de un festival desde sus actos (OL-463), cuando el marco no lo dice o dice que la entrada es libre: todos gratis → «Entrada libre»;
 * gratis y con costo → «Entrada libre · actividades con cooperación ($80–$130)» (el rango, si hay cantidades); todos con costo → el rango; actos
 * sin precio (por confirmar) y ninguno con costo → nada (no se sabe). `entradaLibre`: el marco dice que la entrada es libre.
 */
export function precioDeActos(precios: readonly (string | null)[], entradaLibre = false): string | null {
  const gratis = precios.filter((p) => !sinPrecio(p) && claseDeCosto(p) === "gratis").length + (entradaLibre ? 1 : 0);
  const pagan = precios.filter((p): p is string => !sinPrecio(p) && claseDeCosto(p) !== "gratis").map((p) => p.trim());
  const desconocidos = precios.filter(sinPrecio).length;
  if (!pagan.length) return gratis && !desconocidos ? "Entrada libre" : null;
  const montos = pagan.flatMap(cantidades);
  const menor = Math.min(...montos);
  const mayor = Math.max(...montos);
  const rango = montos.length ? (menor === mayor ? pesos(menor) : `${pesos(menor)}–${pesos(mayor)}`) : null;
  if (!gratis && !desconocidos) {
    if (rango && pagan.every((p) => cantidades(p).length)) return rango;
    if (new Set(pagan).size === 1) return pagan[0];
  }
  const base = gratis ? "Entrada libre · actividades con cooperación" : "Actividades con cooperación";
  return rango ? `${base} (${rango})` : base;
}

/**
 * La línea del precio, o null si no se sabe. Nunca «Gratis» por omisión fuera de un evento suelto (OL-463): el precio escrito, tal cual; un
 * festival sin precio (o con la entrada libre y actos que cobran), el de sus actos (`precioDeActos`); un evento de costo opcional sin precio, nada
 * (su ficha dice «Por confirmar»); un evento suelto sin precio, «Gratis» (su costo era obligatorio: vacío es que eligió gratis).
 */
export function precioDelTexto(e: Pick<EventoIg, "precio" | "clase"> & { opcional?: boolean; actos?: EventoIg["actos"] }): string | null {
  const propio = sinPrecio(e.precio) ? null : e.precio!.trim();
  if (esFestival(e) && (!propio || claseDeCosto(propio) === "gratis")) {
    const deActos = precioDeActos(e.actos!.map((a) => a.precio), !!propio);
    if (deActos || !propio) return deActos;
  }
  if (propio) return propio;
  // «Por confirmar» escrito (un evento suelto de una agenda, OL-441) tampoco es gratis.
  if ((e.precio ?? "").trim() === POR_CONFIRMAR) return null;
  return (e.opcional ?? COSTO_OPCIONAL.includes(e.clase as Clase)) ? null : "Gratis";
}

/** Quién se menciona con @: las primeras cuentas de la foto, menos la de la invitación (Instagram deja 20 menciones). Cada una, una sola vez. */
function mencionador(e: EventoIg, quitadas: readonly string[]) {
  const pueden = new Set(etiquetasDeLaFoto(e, quitadas).slice(0, TOPE_MENCIONES - 1));
  const usadas = new Set<string>();
  const usar = (usuario: string | null) => {
    if (!usuario || !pueden.has(usuario) || usadas.has(usuario)) return false;
    usadas.add(usuario);
    return true;
  };
  return {
    /** «@usuario» la primera vez que se puede; si no, su nombre. */
    quien: (a: { nombre: string; usuario: string | null }) => (usar(a.usuario) ? `@${a.usuario}` : a.nombre),
    /** Solo «@usuario» (su nombre ya se dijo), o null. */
    soloUsuario: (usuario: string | null) => (usar(usuario) ? `@${usuario}` : null),
  };
}
type Mencionador = ReturnType<typeof mencionador>;

type Funcion = { inicio: string; fin: string | null; acto: ActoIg };

/** Lo que falta del programa: una entrada por acto, o por cada sesión de un acto con horario por día; sin lo que ya pasó. */
function funcionesPorVenir(e: EventoIg, ahora: Date): Funcion[] {
  return (e.actos ?? [])
    .flatMap((acto) => (acto.sesiones?.length ? acto.sesiones.map((s) => ({ inicio: s.inicio, fin: s.fin, acto })) : [{ inicio: acto.inicio, fin: acto.fin, acto }]))
    .filter((f) => !eventoPaso(f.inicio, f.fin, ahora, e.zona))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** «Vie 30 · 5:30 pm Meditación con @martha · 6:30 pm Taller de escritura con Gustoño»: el programa, una línea por día. */
function programa(e: EventoIg, funciones: readonly Funcion[], ahora: Date, m: Mencionador, corto: boolean): string[] {
  const mismoMes = new Set(funciones.map((f) => diaLocal(new Date(f.inicio), e.zona).slice(0, 7))).size === 1;
  const lineas: { dia: string; nombre: string; partes: string[] }[] = [];
  for (const f of funciones) {
    const dia = diaLocal(new Date(f.inicio), e.zona);
    const titulo = corto ? tituloCorto(f.acto.titulo, e.titulo) : f.acto.titulo.trim();
    // Quien ya está en el título («Meditación con Martha Franco») no se repite: solo su @, si lo tiene.
    const enTitulo = (a: ArtistaIg) => yaDice(titulo, a.nombre);
    const sueltos = f.acto.artistas.filter(enTitulo).map((a) => m.soloUsuario(a.usuario)).filter((x): x is string => !!x);
    const con = f.acto.artistas.filter((a) => !enTitulo(a)).map(m.quien);
    const parte = [`${horaCorta(f.inicio, e.zona)} ${titulo}`, ...sueltos].join(" ") + (con.length ? ` con ${enLista(con)}` : "");
    const ultima = lineas.at(-1);
    if (ultima?.dia === dia) ultima.partes.push(parte);
    else lineas.push({ dia, nombre: diaConMes(f.inicio, ahora, e.zona), partes: [parte] });
  }
  return lineas.map((l) => `${mayuscula(mismoMes ? l.nombre.replace(/ de .*$/, "") : l.nombre)} · ${l.partes.join(" · ")}`);
}

/** El 📍: el lugar (o el sitio) con su @ y la ciudad. En un festival, el servidor ya dice la sede de sus actos o «Varias sedes». */
function lineaDelLugar(e: EventoIg, m: Mencionador): string {
  const lugar = e.lugar ? [e.lugar.nombre, m.soloUsuario(e.lugar.usuario)].filter(Boolean).join(" ") : null;
  return `📍 ${lugar ? `${lugar} · ` : ""}${e.ciudad}`;
}

/** El texto con las primeras `cuantas` entradas del programa, con títulos cortos o completos. */
function componer(e: EventoIg, ahora: Date, quitadas: readonly string[], funciones: readonly Funcion[], cuantas: number, corto: boolean): string {
  const m = mencionador(e, quitadas);
  const precio = precioDelTexto(e);
  const cabeza = [e.titulo.trim(), cuandoDelTexto(e, ahora), lineaDelLugar(e, m), ...(precio ? [precio] : [])].join("\n");
  const quedan = funciones.length - cuantas;
  const prog = [...programa(e, funciones.slice(0, cuantas), ahora, m, corto), ...(quedan > 0 ? [`y ${quedan} ${quedan === 1 ? "actividad" : "actividades"} más`] : [])];
  // En un festival, «Con …» son los de su marco (quien lo organiza): los de sus actos ya van en el programa.
  const quienes = e.artistas.map(m.quien);
  return [cabeza, ...(prog.length ? [prog.join("\n")] : []), ...(quienes.length ? [`Con ${enLista(quienes)}`] : []), INVITACION, etiquetasDelTexto(e).join(" ")].join("\n\n");
}

/**
 * El texto que arma el sistema. Lo que se quitó de la foto tampoco se menciona: queda el nombre. Un festival lleva su programa después de 📍 y
 * su precio; si no cabe en 2 200 caracteres, primero con los títulos cortos (`tituloCorto`) y luego con menos actividades y «y N actividades
 * más». La cabeza, la invitación y las etiquetas siempre van.
 */
export function armarTexto(e: EventoIg, ahora: Date, quitadas: readonly string[] = []): string {
  const funciones = esFestival(e) ? funcionesPorVenir(e, ahora) : [];
  const completo = componer(e, ahora, quitadas, funciones, funciones.length, false);
  const cabe = (t: string) => [...t].length <= TOPE_CARACTERES;
  if (cabe(completo) || !funciones.length) return completo;
  for (let n = funciones.length; n > 0; n--) {
    const t = componer(e, ahora, quitadas, funciones, n, true);
    if (cabe(t)) return t;
  }
  return componer(e, ahora, quitadas, funciones, 0, true);
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

/**
 * OL-491: el crédito de la portada de un lugar o un artista en el texto de su tarjeta de la semana (`textoArtista` y `textoLugar` lo arman; aquí
 * solo se ajusta su línea «Foto:»). Con crédito, esa línea dice el crédito («Foto: Pablo Pérez · CC BY-SA 4.0») en lugar de «Foto: @cuenta», y si
 * el texto no la tenía (la ficha no tiene Instagram, o la administración quitó la cuenta) va tras «Lee su ficha…». Sin crédito, el texto no cambia:
 * la foto vino de su Instagram y sigue «Foto: @cuenta».
 */
export function conCreditoDeFoto(texto: string, credito: string | null | undefined): string {
  const limpio = limpiarCreditoFoto(credito);
  if (!limpio) return texto;
  const linea = `Foto: ${limpio}`;
  if (/^Foto: .*$/m.test(texto)) return texto.replace(/^Foto: .*$/m, () => linea);
  if (/^Lee su ficha en .*$/m.test(texto)) return texto.replace(/^Lee su ficha en .*$/m, (l) => `${l}\n${linea}`);
  return `${texto}\n\n${linea}`;
}
