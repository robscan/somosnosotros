import { hrefEvento } from "./eventos";
import { ZONA_INICIAL } from "./fechas";
import { nombreDe, vistaPropuesta, type Bandeja, type Propuesta, type TipoPropuesta, type VistaPropuesta } from "./propuestas";
import { etiquetaDeForma, leerFormaEvento } from "./rutinas/formaEvento";

/**
 * La forma de cada propuesta de evento en la bandeja de una ciudad (OL-434; founder: «arranca 434», tras OL-433). Lo que la rutina de agendas
 * dejó en `datos` (`formaEvento.ts`) se dice en la tarjeta, bajo el título, con su icono: «Acto de «Xantolo 2026»» (con el enlace al festival si
 * ya existe), «Festival · 6 actos» con su periodo, «Taller · 4 sesiones» o «Evento de 3 días» con sus días y su hora, «Serie · 4 fechas, cada
 * semana» con sus fechas y «Exposición «Raíces» · hasta el lun 30 de nov»; y `datos.variantes` como «También llegó como: …». Un festival
 * propuesto va antes que sus actos, con ellos debajo, aunque lleguen de otra búsqueda de la misma ciudad. Funciones puras: la página las arma
 * en el servidor y la bandeja solo pinta lo que recibe.
 */

/** El icono de la línea: el del festival (el de «Parte de…» en la ficha de un evento) o el de las fechas (el de «Sesiones» y «Hasta»). */
export type IconoForma = "festival" | "fechas";
/** La línea de forma: `texto` y, si el festival ya existe, `enlace` a él detrás («Acto de » + «Xantolo 2026»); `detalle`, el cuándo largo. */
export type FormaEnBandeja = { icono: IconoForma; texto: string; enlace: { texto: string; href: string } | null; detalle: string | null };

/**
 * Una tarjeta de la bandeja. `festival`: el id de la propuesta del festival bajo el que va (un acto de un festival propuesto aquí mismo).
 * `aceptados`: en la propuesta de un festival, cuántos actos suyos ya aceptados esperan a que se acepte (null si no es un festival).
 */
export type PropuestaEnBandeja = {
  id: string;
  tipo: TipoPropuesta;
  fuente: string;
  nombre: string;
  vista: VistaPropuesta;
  forma?: FormaEnBandeja | null;
  variantes?: string | null;
  festival?: string | null;
  aceptados?: number | null;
};

/**
 * Lo que la página lee aparte para decirlo bien (`cargarContextoFormas`): por propuesta de festival, cuántos actos aceptados la esperan; y el
 * estado de los festivales propuestos que un acto nombra y que no están por revisar aquí (uno aceptado lleva a su evento; uno rechazado ya no
 * hace del acto un acto: se publica suelto).
 */
export type ContextoFormas = {
  aceptados: ReadonlyMap<string, number>;
  festivales: ReadonlyMap<string, { estado: string; ficha_id: string | null }>;
};
export const SIN_CONTEXTO: ContextoFormas = { aceptados: new Map(), festivales: new Map() };

const lista = new Intl.ListFormat("es", { type: "conjunction" });
const texto = (v: unknown, tope = 120): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const sinMarco = (datos: Record<string, unknown>) => ({ ...datos, marco: null, marco_propuesto: null });

/** La frase de `etiquetaDeForma` como línea de la tarjeta, con su icono. */
function deEtiqueta(datos: Record<string, unknown>, ahora: Date, zona: string): FormaEnBandeja | null {
  const e = etiquetaDeForma(datos, ahora, zona);
  if (!e) return null;
  const forma = leerFormaEvento(datos);
  const delFestival = forma.clase === "festival" || !!forma.marco || !!forma.marcoPropuesto;
  return { icono: delFestival ? "festival" : "fechas", texto: e.que, enlace: null, detalle: e.detalle };
}

/**
 * La línea de forma de una propuesta de evento, o null si es un evento como siempre (o no es un evento).
 *   · `anidado`: va bajo su festival en esta misma bandeja; no repite «Acto de…» y dice solo su forma propia (un taller, unos días).
 *   · Un acto de un festival registrado (`marco`) enlaza a él; el de uno propuesto que ya se aceptó y publicó, a su evento; el de uno
 *     rechazado ya no es acto (se publica suelto) y dice solo su forma propia.
 */
export function formaEnBandeja(
  p: Pick<Propuesta, "tipo" | "datos">,
  { anidado = false, contexto = SIN_CONTEXTO }: { anidado?: boolean; contexto?: ContextoFormas } = {},
  ahora: Date = new Date(),
  zona: string = ZONA_INICIAL,
): FormaEnBandeja | null {
  if (p.tipo !== "evento") return null;
  const forma = leerFormaEvento(p.datos);
  if (anidado) return deEtiqueta(sinMarco(p.datos), ahora, zona);
  if (forma.marco) return { icono: "festival", texto: "Acto de ", enlace: { texto: `«${forma.marco.titulo}»`, href: hrefEvento({ id: forma.marco.id }) }, detalle: null };
  if (forma.marcoPropuesto) {
    const suyo = contexto.festivales.get(forma.marcoPropuesto);
    if (suyo?.estado === "rechazada") return deEtiqueta(sinMarco(p.datos), ahora, zona);
    const nombre = `«${forma.programa ?? "su festival"}»`;
    if (suyo?.estado === "aceptada" && suyo.ficha_id) return { icono: "festival", texto: "Acto de ", enlace: { texto: nombre, href: hrefEvento({ id: suyo.ficha_id }) }, detalle: null };
    return { icono: "festival", texto: `Acto de ${nombre}`, enlace: null, detalle: null };
  }
  return deEtiqueta(p.datos, ahora, zona);
}

/** «También llegó como: «Hermanos Pérez Meza Big Band»»: otros títulos con que la agenda trajo la misma función (`datos.variantes`). */
export function variantesDe(p: Pick<Propuesta, "tipo" | "datos">): string | null {
  if (p.tipo !== "evento" || !Array.isArray(p.datos.variantes)) return null;
  const propio = texto(p.datos.titulo).toLowerCase();
  const otros = [...new Set(p.datos.variantes.map((v) => texto(v)).filter((v) => v && v.toLowerCase() !== propio))].slice(0, 5);
  return otros.length ? `También llegó como: ${lista.format(otros.map((v) => `«${v}»`))}` : null;
}

/**
 * ¿La línea de forma ya dice el cuándo o el dónde? El periodo de un festival y los días de unas sesiones sustituyen la fecha de la línea de
 * abajo (sería la primera, repetida); un festival con actos no tiene un sitio propio (sus sedes son las de sus actos, que van debajo).
 */
function omitirDeLaLinea(p: Pick<Propuesta, "tipo" | "datos">): { cuando: boolean; donde: boolean } {
  if (p.tipo !== "evento") return { cuando: false, donde: false };
  const f = leerFormaEvento(p.datos);
  const festival = f.clase === "festival" && !f.marco && !f.marcoPropuesto;
  return { cuando: festival || f.sesiones.length >= 2, donde: festival && f.actos > 0 };
}

/** La tarjeta de una propuesta, con su forma y sus variantes. */
export function enBandeja(
  p: Pick<Propuesta, "id" | "tipo" | "fuente" | "datos" | "creado_en">,
  ciudad: { nombre: string | null; zona?: string },
  { festival = null, contexto = SIN_CONTEXTO }: { festival?: string | null; contexto?: ContextoFormas } = {},
  ahora: Date = new Date(),
): PropuestaEnBandeja {
  const vista = vistaPropuesta(p, ciudad.nombre, ahora, omitirDeLaLinea(p));
  const esFestival = p.tipo === "evento" && leerFormaEvento(p.datos).clase === "festival";
  return {
    id: p.id,
    tipo: p.tipo,
    fuente: p.fuente,
    nombre: nombreDe(p),
    // Bajo su festival, la tarjeta dice qué es en una palabra: el festival ya está arriba.
    vista: festival ? { ...vista, que: "Acto · propuesto por la rutina" } : vista,
    forma: formaEnBandeja(p, { anidado: !!festival, contexto }, ahora, ciudad.zona ?? ZONA_INICIAL),
    variantes: variantesDe(p),
    festival,
    aceptados: esFestival ? (contexto.aceptados.get(p.id) ?? 0) : null,
  };
}

/**
 * Las bandejas de una ciudad, una por búsqueda (`cargarBandejasDeCiudad`), como las pinta la página: cada propuesta con su forma y, cuando un
 * festival propuesto está por revisar en la ciudad, sus actos por revisar movidos bajo él (en la bandeja de su búsqueda, aunque lleguen de
 * otra). Una búsqueda que se queda sin tarjetas propias (todas eran actos de un festival de otra) no se pinta.
 */
export function armarBandejas(
  bandejas: readonly Bandeja[],
  contexto: ContextoFormas,
  ciudad: { nombre: string | null; zona?: string },
  ahora: Date = new Date(),
): { corrida: Bandeja["corrida"]; fuentes_con_tanda: string[]; propuestas: PropuestaEnBandeja[] }[] {
  const dondeVa = new Map<string, number>();
  bandejas.forEach((b, i) => {
    for (const p of b.propuestas) if (p.tipo === "evento" && leerFormaEvento(p.datos).clase === "festival") dondeVa.set(p.id, i);
  });
  const festivalDe = (p: Propuesta): string | null => {
    if (p.tipo !== "evento" || dondeVa.has(p.id)) return null;
    const suyo = leerFormaEvento(p.datos).marcoPropuesto;
    return suyo && dondeVa.has(suyo) ? suyo : null;
  };
  const salida = bandejas.map((b) => ({ corrida: b.corrida, fuentes_con_tanda: b.fuentes_con_tanda, propuestas: [] as PropuestaEnBandeja[] }));
  bandejas.forEach((b, i) => {
    for (const p of b.propuestas) {
      const festival = festivalDe(p);
      salida[festival ? dondeVa.get(festival)! : i].propuestas.push(enBandeja(p, ciudad, { festival, contexto }, ahora));
    }
  });
  return salida.filter((b) => b.propuestas.length > 0);
}

/**
 * Qué leer aparte para `ContextoFormas`: los ids de las propuestas de festival por revisar (para contar los actos aceptados que las esperan) y
 * los de los festivales propuestos que los actos nombran y no están por revisar aquí.
 */
export function idsParaContexto(propuestas: readonly Pick<Propuesta, "id" | "tipo" | "datos">[]): { festivales: string[]; nombrados: string[] } {
  const eventos = propuestas.filter((p) => p.tipo === "evento");
  const aqui = new Set(eventos.map((p) => p.id));
  const festivales = eventos.filter((p) => leerFormaEvento(p.datos).clase === "festival").map((p) => p.id);
  const nombrados = new Set<string>();
  for (const p of eventos) {
    const suyo = leerFormaEvento(p.datos).marcoPropuesto;
    if (suyo && !aqui.has(suyo)) nombrados.add(suyo);
  }
  return { festivales, nombrados: [...nombrados] };
}
