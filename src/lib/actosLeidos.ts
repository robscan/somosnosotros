import { sumarDiasIso } from "./calendario";
import type { ActoLeido } from "./eventos";
import { normalizarNombre } from "./lugares";

/**
 * Qué son los actos que leyó un cartel (OL-413; definición aprobada por el founder el 18 de octubre: «Festival = un nombre que reúne varias
 * presentaciones; el programa es opcional»). Regla fija en el código, que no depende de lo que diga el modelo: el lector a veces lee como
 * «programa» la alineación de una sola noche (Cumbiachella: cuatro sonidos el 30/10 en Lunaria; Trayectos Interactivos: cinco actividades el
 * 17/10 en el mismo sitio) y el alta pedía la sede de cada acto, cuatro veces. Lógica pura, sin DOM ni base.
 *
 * - **Una noche en un lugar** (todos el mismo día, o de madrugada del siguiente, y en la misma sede o sin sede): se juntan; no hay programa. Los
 *   nombres de quien se presenta y las actividades sueltas («Concierto», «Charla») salen aparte para «Quién» y la descripción.
 * - **El mismo título varios días seguidos en un lugar** (una obra en temporada): un evento de varios días con la hora de cada uno.
 * - **Días distintos o sedes distintas**: el programa de un festival, como hasta ahora.
 */
export type FormaDeActos =
  | { tipo: "junta"; dia: string; hora: string; nombres: string[]; actividades: string[] }
  | { tipo: "temporada"; dias: { dia: string; hora: string }[] }
  | { tipo: "programa"; sedes: number };

/** Hasta qué hora de la madrugada sigue siendo la noche anterior («8 pm–2 am»: un acto a la 1:00 del 31 es de la noche del 30). */
const MADRUGADA = "06:00";

/** El día de la noche a la que pertenece un acto: antes de las 6:00, la del día anterior. */
export const nocheDe = (fecha: string, hora: string): string => (hora && hora < MADRUGADA ? sumarDiasIso(fecha, -1) : fecha);

/** Lo que no es el nombre de quien se presenta: una actividad («Concierto», «Cortometraje», «Cócteles») o un relleno («Sorpresas»). */
const ACTIVIDADES = new Set(
  [
    "concierto", "conciertos", "cortometraje", "cortometrajes", "corto", "cortos", "exposicion", "exposiciones", "expo", "charla", "charlas", "conversatorio",
    "coctel", "cocteles", "coctels", "brindis", "taller", "talleres", "proyeccion", "proyecciones", "lectura", "lecturas", "performance", "performances",
    "baile", "danza", "teatro", "cine", "poesia", "recital", "conferencia", "conferencias", "mesa redonda", "presentacion", "presentaciones", "funcion",
    "funciones", "musica en vivo", "dj set", "open mic", "micro abierto", "jam", "degustacion", "mercado", "bazar", "venta", "cumbia", "sonido", "disfraz",
  ].map(normalizarNombre),
);
const RELLENO = new Set(["sorpresa", "sorpresas", "invitados", "invitado especial", "invitados especiales", "y mas", "mas"].map(normalizarNombre));

const esActividad = (t: string): boolean => ACTIVIDADES.has(normalizarNombre(t));
const esRelleno = (t: string): boolean => RELLENO.has(normalizarNombre(t));

/**
 * Un título de acto partido en su actividad y su nombre: «Concierto: Disonáuta» → actividad «Concierto», nombre «Disonáuta»; «Charla» → solo la
 * actividad; «Sonido Satanás» → solo el nombre; «Sorpresas» → nada.
 */
export function partirTitulo(titulo: string): { actividad: string | null; nombre: string | null } {
  const t = titulo.trim();
  const m = /^(.+?)\s*[:|–—-]\s*(.+)$/.exec(t);
  if (m && esActividad(m[1])) return { actividad: m[1].trim(), nombre: esRelleno(m[2]) || esActividad(m[2]) ? null : m[2].trim() };
  if (esActividad(t)) return { actividad: t, nombre: null };
  if (esRelleno(t)) return { actividad: null, nombre: null };
  return { actividad: null, nombre: t };
}

/** La clave de una sede: el lugar del directorio que se cruzó o su nombre normalizado; sin sede, la del cartel. */
const claveSede = (a: ActoLeido, general: string): string => a.lugarId || normalizarNombre(a.lugar || general);

/**
 * Cuántas sedes distintas hay: las que se llaman casi igual son la misma («Lunaria» y «Foro Lunaria»: una contiene a la otra). Las vacías no cuentan.
 */
export function cuantasSedes(actos: readonly ActoLeido[], general = ""): number {
  const grupos: string[] = [];
  for (const clave of actos.map((a) => claveSede(a, general)).filter(Boolean)) {
    if (!grupos.some((g) => g === clave || g.includes(clave) || clave.includes(g))) grupos.push(clave);
  }
  return grupos.length;
}

const sinRepetir = (lista: readonly string[]): string[] => {
  const vistos = new Set<string>();
  return lista.filter((x) => {
    const k = normalizarNombre(x);
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
};

/**
 * Qué son los actos leídos; null si no hay ninguno. Uno solo es el propio evento: se junta (`tipo: "junta"`). `general` es el lugar que dice el
 * cartel para todo (el que va con la fecha), si lo dice.
 */
export function formaDeActos(actos: readonly ActoLeido[], general = ""): FormaDeActos | null {
  if (!actos.length) return null;
  const sedes = cuantasSedes(actos, general);
  const enOrden = [...actos].sort((a, b) => nocheDe(a.fecha, a.hora).localeCompare(nocheDe(b.fecha, b.hora)) || horaEnLaNoche(a.hora).localeCompare(horaEnLaNoche(b.hora)));
  const noches = [...new Set(enOrden.map((a) => nocheDe(a.fecha, a.hora)))];
  if (sedes <= 1 && noches.length === 1) {
    const partes = enOrden.map((a) => partirTitulo(a.titulo));
    const primera = enOrden.find((a) => a.hora);
    return {
      tipo: "junta",
      dia: noches[0],
      hora: primera?.hora ?? "",
      nombres: sinRepetir(partes.map((p) => p.nombre).filter((x): x is string => !!x)),
      actividades: sinRepetir(partes.map((p) => p.actividad).filter((x): x is string => !!x)),
    };
  }
  const titulos = new Set(actos.map((a) => normalizarNombre(a.titulo)));
  const seguidos = noches.every((n, i) => i === 0 || n === sumarDiasIso(noches[i - 1], 1));
  if (sedes <= 1 && titulos.size === 1 && seguidos && noches.length <= 31) {
    return { tipo: "temporada", dias: noches.map((dia) => ({ dia, hora: enOrden.find((a) => nocheDe(a.fecha, a.hora) === dia)?.hora ?? "" })) };
  }
  return { tipo: "programa", sedes };
}

/**
 * Los artistas del cartel para cruzar con el directorio (`leerCartelAccion`): los que nombró el lector o, si no nombró a nadie y sus actos son una
 * noche en un lugar (Cumbiachella leída como programa), los nombres de esos actos. Así «Quién» trae a los que ya existen con su ficha en vez de
 * crearlos otra vez. Hasta `tope`.
 */
export function nombresParaQuien(artistas: readonly string[], actos: readonly ActoLeido[], general = "", tope = 6): string[] {
  if (artistas.length) return [...artistas];
  const forma = formaDeActos(actos, general);
  return forma?.tipo === "junta" ? forma.nombres.slice(0, tope) : [];
}

/** Para ordenar dentro de una noche: la madrugada va después de la noche (las 0:30 después de las 23:00). */
const horaEnLaNoche = (hora: string): string => (hora && hora < MADRUGADA ? `3${hora}` : `2${hora}`);

/**
 * La descripción de una noche con varias actividades cuando el cartel no traía una: «Concierto, cortometraje, exposición, charla y cócteles.»; con
 * nombres que no van en «Quién», también ellos («…: Charlemos y Sorpresas.»). Vacía si no hay nada que decir.
 */
export function descripcionDeNoche(actividades: readonly string[], nombres: readonly string[] = []): string {
  const lista = (xs: readonly string[]) => new Intl.ListFormat("es", { type: "conjunction" }).format(xs);
  const que = actividades.length ? lista(actividades.map((a, i) => (i === 0 ? a.charAt(0).toUpperCase() + a.slice(1) : a.toLowerCase()))) : "";
  const quienes = nombres.length ? lista(nombres) : "";
  const texto = que && quienes ? `${que}: ${quienes}` : que || quienes;
  return texto ? `${texto}.` : "";
}
