import { deducirDisciplina, deducirSubcategoria, deducirTipoArtista, LIMITES_ARTISTA, type Disciplina, type Subcategoria, type TipoArtista } from "@/lib/artistas";
import type { Enlace } from "@/lib/enlaces";
import { queFalta } from "@/lib/formulario";

/**
 * El alta de artista por pasos, sin DOM (OL-316; prototipo firmado `lugar-artista-por-pasos.html`, casos 5 a 7, y su acta, bitácora 342): qué
 * se pregunta, en qué orden y adónde lleva cada respuesta. El mismo armazón que el alta de lugar (`../lugar/pasos.ts`): los pasos salen de lo
 * que falta, Atrás quita el último de la pila y, desde «Revisa», se abre una sola pregunta y al contestarla se vuelve.
 *
 * ¿Cómo se llama? (`nombre`; del nombre se deducen la disciplina, la subcategoría y si es grupo cuando lo dice) → ¿Qué hace? (`hace`, solo si
 * el nombre no lo dijo) → ¿Qué tipo de …? (`sub`, solo tras elegir la disciplina a mano: decisión 5 del acta) → Revisa → Publicado. Lo
 * opcional (foto, portada, descripción y redes) es `mas`; solista, grupo o colectivo y la ciudad son hojas de «Revisa», no pasos.
 */
export type Paso = "nombre" | "hace" | "sub" | "revisa" | "mas" | "publicado";

/** El camino de principio a fin: también da la línea de avance. */
const ORDEN: readonly Paso[] = ["nombre", "hace", "sub", "revisa"];

export type Respuestas = {
  nombre: string;
  /** null hasta que el nombre la diga o se elija: nunca «Música» por omisión. */
  disciplina: Disciplina | null;
  /** La subcategoría («Clown», «Son huasteco»); "" si no se dijo. */
  detalle: string;
  /** null hasta que el nombre lo diga o se elija en «Revisa»: nunca «Solista» por omisión. */
  tipo: TipoArtista | null;
  /** La ciudad del artista: de entrada, la que se veía; se cambia en «Revisa». */
  ciudad: string;
  /** «Soy yo» / «Es mi grupo»: la cuenta queda ligada a la ficha. */
  soy: boolean;
  foto: string | null;
  portada: string | null;
  descripcion: string;
  redes: Enlace[];
};

export type Estado = {
  r: Respuestas;
  /** Las subcategorías ya usadas en cada disciplina, las más usadas primero (`subcategorias_de`): para deducir la del nombre. */
  subcategorias: Partial<Record<Disciplina, Subcategoria[]>>;
  /** Los pasos por los que se llegó al actual (el último): Atrás quita uno. */
  pila: Paso[];
  /** Cómo se llegó al paso actual, para su transición; null al abrir la pantalla. */
  direccion: "entra" | "vuelve" | null;
  /** Lo eligió la persona: lo que se deduzca del nombre después no lo pisa. */
  aMano: { disciplina: boolean; detalle: boolean; tipo: boolean };
};

export type Accion =
  /** Lo que se escribe o se elige sin dejar el paso (la ciudad, «Soy yo», lo opcional). */
  | { tipo: "cambiar"; cambios: Partial<Respuestas> }
  /** El nombre que se escribe: lo que nadie eligió a mano se deduce de él. */
  | { tipo: "nombrar"; nombre: string }
  /** «Siguiente», «Listo». */
  | { tipo: "seguir" }
  /** Una disciplina de «¿Qué hace?»: sigue «¿Qué tipo de …?». */
  | { tipo: "hace"; valor: Disciplina }
  /** Una subcategoría (un chip, «Otra…» escrita o «Seguir sin especificar» con ""): a «Revisa». */
  | { tipo: "sub"; detalle: string }
  /** Solista, grupo o colectivo, desde su hoja en «Revisa». */
  | { tipo: "es"; valor: TipoArtista }
  /** Desde «Revisa»: solo esa pregunta. */
  | { tipo: "abrir"; paso: Paso }
  /** Atrás desde `desde`; se ignora si ya no se está ahí. */
  | { tipo: "atras"; desde: Paso }
  /** El servidor publicó el artista: al final, sin camino de vuelta. */
  | { tipo: "publicado" };

/** Con qué se abre la pantalla: el nombre que se buscó y no se encontró (Buscar) y la ciudad que se veía. */
export type Arranque = { nombre?: string; ciudad: string };

/** Lo que dice el nombre, para lo que nadie eligió a mano. */
function deducido(e: Pick<Estado, "subcategorias" | "aMano" | "r">, nombre: string): Pick<Respuestas, "disciplina" | "detalle" | "tipo"> {
  const disciplina = e.aMano.disciplina ? e.r.disciplina : deducirDisciplina(nombre);
  const detalle = e.aMano.detalle || e.aMano.disciplina ? e.r.detalle : disciplina ? (deducirSubcategoria(nombre, disciplina, e.subcategorias[disciplina] ?? []) ?? "") : "";
  return { disciplina, detalle, tipo: e.aMano.tipo ? e.r.tipo : deducirTipoArtista(nombre) };
}

export function estadoInicial({ arranque, subcategorias }: { arranque: Arranque; subcategorias: Estado["subcategorias"] }): Estado {
  const nombre = (arranque.nombre ?? "").trim().slice(0, LIMITES_ARTISTA.nombre);
  const vacio: Estado = {
    r: { nombre, disciplina: null, detalle: "", tipo: null, ciudad: arranque.ciudad, soy: false, foto: null, portada: null, descripcion: "", redes: [] },
    subcategorias,
    pila: ["nombre"],
    direccion: null,
    aMano: { disciplina: false, detalle: false, tipo: false },
  };
  return { ...vacio, r: { ...vacio.r, ...deducido(vacio, nombre) } };
}

export const pasoActual = (e: Estado): Paso => e.pila[e.pila.length - 1];

/** Lo que falta preguntar en su propia pantalla, en orden. Solista o grupo no es un paso: si falta, «Revisa» lo pide en su renglón. */
export function faltan(r: Respuestas): Paso[] {
  const p: Paso[] = [];
  if (!r.nombre.trim()) p.push("nombre");
  if (!r.disciplina) p.push("hace");
  return p;
}

/**
 * Lo que dice el botón de «Revisa» mientras algo falte («Falta si es solista o grupo»); null si ya se puede publicar. `repetido`: ya hay una
 * ficha con ese nombre en esa ciudad (no se publica un repetido, como en el formulario de siempre). Sin punto: es un botón.
 */
export function faltaParaPublicar(r: Respuestas, repetido = false): string | null {
  const frase = queFalta([!r.nombre.trim() && "el nombre", !r.disciplina && "la disciplina", !r.tipo && "si es solista o grupo", !r.ciudad && "la ciudad"]);
  if (frase) return frase.slice(0, -1);
  return repetido ? "Ese nombre ya tiene ficha" : null;
}

const apilar = (e: Estado, paso: Paso): Estado => ({ ...e, pila: [...e.pila, paso], direccion: "entra" });

/** A lo primero que falte; sin nada pendiente, a «Revisa»: si ya se estuvo ahí (se abrió una pregunta desde ella), se regresa. */
function siguiente(e: Estado): Estado {
  const paso = faltan(e.r)[0];
  const revisa = e.pila.indexOf("revisa");
  if (paso || revisa < 0) return apilar(e, paso ?? "revisa");
  return { ...e, pila: e.pila.slice(0, revisa + 1), direccion: "vuelve" };
}

export function flujo(e: Estado, a: Accion): Estado {
  switch (a.tipo) {
    case "cambiar":
      return { ...e, r: { ...e.r, ...a.cambios } };
    case "nombrar":
      return { ...e, r: { ...e.r, nombre: a.nombre, ...deducido(e, a.nombre) } };
    case "seguir":
      return siguiente(e);
    case "hace":
      // Elegir la disciplina suelta la subcategoría de otra y pregunta la de esta.
      return apilar({ ...e, aMano: { ...e.aMano, disciplina: true, detalle: false }, r: { ...e.r, disciplina: a.valor, detalle: a.valor === e.r.disciplina && e.aMano.detalle ? e.r.detalle : "" } }, "sub");
    case "sub":
      return siguiente({ ...e, aMano: { ...e.aMano, detalle: true }, r: { ...e.r, detalle: a.detalle.trim().slice(0, LIMITES_ARTISTA.detalle) } });
    case "es":
      return { ...e, aMano: { ...e.aMano, tipo: true }, r: { ...e.r, tipo: a.valor } };
    case "abrir":
      return apilar(e, a.paso);
    case "atras":
      return pasoActual(e) === a.desde && e.pila.length > 1 ? { ...e, pila: e.pila.slice(0, -1), direccion: "vuelve" } : e;
    case "publicado":
      // La pila queda solo con el final: Atrás no tiene a dónde volver (en la barra va la ✕, no el Atrás).
      return { ...e, pila: ["publicado"], direccion: "entra" };
  }
}

/** Lo recorrido, de 0 a 1 (lo opcional, como «Revisa»). */
export function avance(paso: Paso): number {
  if (paso === "publicado") return 1;
  return ORDEN.indexOf(paso === "mas" ? "revisa" : paso) / ORDEN.length;
}

/** Lo que dice el renglón opcional de «Revisa» con lo que ya se agregó («Foto, portada y 2 redes»); null si nada. */
export function resumenMas(r: Pick<Respuestas, "foto" | "portada" | "descripcion" | "redes">): string | null {
  const partes = [r.foto && "foto", r.portada && "portada", r.descripcion.trim() && "descripción", r.redes.length === 1 ? "1 red" : r.redes.length > 1 ? `${r.redes.length} redes` : null].filter((p): p is string => !!p);
  if (!partes.length) return null;
  const frase = new Intl.ListFormat("es", { type: "conjunction" }).format(partes);
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}
