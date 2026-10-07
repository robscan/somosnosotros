import { deducirTipo } from "@/lib/buscarLugares";
import type { Enlace } from "@/lib/enlaces";
import type { Punto } from "@/lib/geo";
import type { Franja } from "@/lib/horarioLugar";
import { LIMITES_LUGAR, type Tipo } from "@/lib/lugares";
import { queFalta } from "@/lib/formulario";
import type { Candidato } from "../evento/pasos";

/**
 * El alta de lugar por pasos, sin DOM (OL-315; prototipo firmado `lugar-artista-por-pasos.html`, casos 1 a 4, bitácora 342): qué se
 * pregunta, en qué orden y adónde lleva cada respuesta. El mismo armazón que el alta de evento (`../evento/pasos.ts`): los pasos salen de lo
 * que falta, Atrás quita el último de la pila y, desde «Revisa», se abre una sola pregunta y al contestarla se vuelve.
 *
 * ¿Cómo se llama? (`nombre`) → confirmar en el mapa, siempre (`mapa`: «¿Es aquí?» con una sugerencia del mapa, «¿Dónde está?» sin ella) →
 * ¿Qué tipo de lugar es? (`tipo`, solo si el nombre o el mapa no lo dijeron; «Otro» pregunta además qué es, `otro`, opcional) → Revisa →
 * Publicado. Lo opcional (foto, descripción y redes) es `mas`; el horario es una hoja de «Revisa», no un paso.
 */
export type Paso = "nombre" | "mapa" | "tipo" | "otro" | "revisa" | "mas" | "publicado";

/** El camino de principio a fin: también da la línea de avance. */
const ORDEN: readonly Paso[] = ["nombre", "mapa", "tipo", "revisa"];

/** El punto confirmado en el mapa, con lo que el mapa dijo de él. */
export type Sitio = { punto: Punto; direccion: string; ciudad: string | null };

export type Respuestas = {
  nombre: string;
  /** null hasta confirmar el mapa. */
  sitio: Sitio | null;
  tipo: Tipo | null;
  /** Qué es, cuando el tipo es «Otro» (opcional). */
  detalle: string;
  /** La ciudad elegida a mano en «Revisa», solo cuando ni el mapa ni la ciudad de contexto la dan; "" si no se eligió. */
  ciudad: string;
  /** El horario en franjas (`lib/horarioLugar`); vacío si no se dijo. */
  horario: Franja[];
  descripcion: string;
  redes: Enlace[];
  portada: string | null;
  /** Solo la administración lo marca («Solo yo lo veo»). */
  privado: boolean;
};

export type Estado = {
  r: Respuestas;
  /** El sitio que se confirma en `mapa`: lo que se tocó en las sugerencias o el punto de entrada; null en «¿Dónde está?». */
  candidato: Candidato | null;
  /** Los pasos por los que se llegó al actual (el último): Atrás quita uno. */
  pila: Paso[];
  /** Cómo se llegó al paso actual, para su transición; null al abrir la pantalla. */
  direccion: "entra" | "vuelve" | null;
  /** El tipo lo eligió la persona: lo que se deduzca después no lo pisa. */
  tipoAMano: boolean;
};

export type Accion =
  /** Lo que se escribe o se elige sin dejar el paso. */
  | { tipo: "cambiar"; cambios: Partial<Respuestas> }
  /** El nombre que se escribe: si nadie eligió el tipo, se deduce de él. */
  | { tipo: "nombrar"; nombre: string }
  /** «Siguiente», «Listo». */
  | { tipo: "seguir" }
  /** Una sugerencia del mapa: su nombre (si no es una dirección), el tipo que dice y a confirmar en el mapa. */
  | { tipo: "sugerencia"; candidato: Candidato }
  /** «Sí, es aquí» / «Listo» en el mapa. */
  | { tipo: "ubicar"; sitio: Sitio }
  /** Un tipo de la lista: «Otro» pregunta qué es; los demás avanzan. */
  | { tipo: "tipo"; valor: Tipo }
  /** Desde «Revisa»: solo esa pregunta. */
  | { tipo: "abrir"; paso: Paso }
  /** Atrás desde `desde`; se ignora si ya no se está ahí. */
  | { tipo: "atras"; desde: Paso }
  /** El servidor publicó el lugar: al final, sin camino de vuelta. */
  | { tipo: "publicado" };

/** Con qué se abre la pantalla: el nombre que se buscó y no se encontró y el punto donde se sostuvo el dedo en el mapa de Lugares. */
export type Arranque = { nombre?: string; punto?: Punto | null };

export function estadoInicial({ nombre = "", punto = null }: Arranque = {}): Estado {
  const n = nombre.trim().slice(0, LIMITES_LUGAR.nombre);
  return {
    r: { nombre: n, sitio: null, tipo: n ? deducirTipo(n) : null, detalle: "", ciudad: "", horario: [], descripcion: "", redes: [], portada: null, privado: false },
    // El punto de entrada ya es el lugar: el mapa lo confirma («¿Es aquí?») y pide su dirección.
    candidato: punto ? { nombre: n, direccion: "", punto, ciudad: null, categorias: [], origen: "aqui" } : null,
    pila: ["nombre"],
    direccion: null,
    tipoAMano: false,
  };
}

export const pasoActual = (e: Estado): Paso => e.pila[e.pila.length - 1];

/** Lo que falta para publicar, en el orden en que se pregunta. La ciudad no es un paso: si falta, «Revisa» la pide en su renglón. */
export function faltan(r: Respuestas): Paso[] {
  const p: Paso[] = [];
  if (!r.nombre.trim()) p.push("nombre");
  if (!r.sitio) p.push("mapa");
  if (!r.tipo) p.push("tipo");
  return p;
}

/** Lo que dice el botón de «Revisa» mientras algo falte («Falta la ciudad»); null si ya se puede publicar. Sin punto: es un botón. */
export function faltaParaPublicar(r: Respuestas, ciudad: string | null): string | null {
  const FALTA: Partial<Record<Paso, string>> = { nombre: "el nombre", mapa: "la ubicación", tipo: "el tipo" };
  const frase = queFalta([...faltan(r).map((p) => FALTA[p]!), ...(ciudad ? [] : ["la ciudad"])]);
  return frase && frase.slice(0, -1);
}

const apilar = (e: Estado, paso: Paso): Estado => ({ ...e, pila: [...e.pila, paso], direccion: "entra" });

/** A lo primero que falte; sin nada pendiente, a «Revisa»: si ya se estuvo ahí (se abrió una pregunta desde ella), se regresa. */
function siguiente(e: Estado): Estado {
  const paso = faltan(e.r)[0];
  const revisa = e.pila.indexOf("revisa");
  if (paso || revisa < 0) return apilar(e, paso ?? "revisa");
  return { ...e, pila: e.pila.slice(0, revisa + 1), direccion: "vuelve" };
}

/** El tipo que se deduce del nombre y de lo que dice el mapa, si nadie lo eligió a mano; sin pista, ninguno (se pregunta). */
const conTipo = (e: Estado, nombre: string, categorias: string[] = []): Tipo | null => (e.tipoAMano ? e.r.tipo : deducirTipo(nombre, categorias));

export function flujo(e: Estado, a: Accion): Estado {
  switch (a.tipo) {
    case "cambiar":
      return { ...e, r: { ...e.r, ...a.cambios } };
    case "nombrar":
      // Escribir otro nombre suelta la sugerencia que se había tocado (y que «Buscar otro» dejó atrás); el punto de entrada se queda.
      return { ...e, candidato: e.candidato?.origen === "busqueda" ? null : e.candidato, r: { ...e.r, nombre: a.nombre, tipo: conTipo(e, a.nombre) } };
    case "seguir":
      // Del nombre, siempre al mapa (también desde «Revisa», si se cambió el nombre: el sitio ya está y se vuelve).
      return pasoActual(e) === "nombre" && !e.r.sitio ? apilar(e, "mapa") : siguiente(e);
    case "sugerencia": {
      // Una dirección ubica, no nombra: el nombre escrito se queda.
      const nombre = a.candidato.nombre.trim() || e.r.nombre;
      const candidato = { ...a.candidato, nombre };
      return apilar({ ...e, candidato, r: { ...e.r, nombre, tipo: conTipo(e, nombre, a.candidato.categorias) } }, "mapa");
    }
    case "ubicar":
      return siguiente({ ...e, r: { ...e.r, sitio: a.sitio } });
    case "tipo": {
      const conElegido = { ...e, tipoAMano: true, r: { ...e.r, tipo: a.valor, detalle: a.valor === "otro" ? e.r.detalle : "" } };
      return a.valor === "otro" ? apilar(conElegido, "otro") : siguiente(conElegido);
    }
    case "abrir":
      // «Cambiar» la dirección desde «Revisa» es «¿Dónde está?» con el pin donde quedó (con su campo para buscar otra), no la sugerencia de antes.
      return apilar(a.paso === "mapa" ? { ...e, candidato: null } : e, a.paso);
    case "atras":
      return pasoActual(e) === a.desde && e.pila.length > 1 ? { ...e, pila: e.pila.slice(0, -1), direccion: "vuelve" } : e;
    case "publicado":
      // La pila queda solo con el final: Atrás no tiene a dónde volver (en la barra va la ✕, no el Atrás).
      return { ...e, pila: ["publicado"], direccion: "entra" };
  }
}

/** Lo recorrido, de 0 a 1 (qué es, como el tipo; lo opcional, como «Revisa»). */
export function avance(paso: Paso): number {
  if (paso === "publicado") return 1;
  return ORDEN.indexOf(paso === "otro" ? "tipo" : paso === "mas" ? "revisa" : paso) / ORDEN.length;
}

/** El radio de «¿Es este?» en el mapa: el mismo de `lugares_parecidos` en la base (150 m). */
export const RADIO_ES_ESTE_M = 150;

/** Lo que dice el renglón opcional de «Revisa» con lo que ya se agregó («Foto, descripción y 2 redes»); null si nada. */
export function resumenMas(r: Pick<Respuestas, "portada" | "descripcion" | "redes">): string | null {
  const partes = [r.portada && "foto", r.descripcion.trim() && "descripción", r.redes.length === 1 ? "1 red" : r.redes.length > 1 ? `${r.redes.length} redes` : null].filter((p): p is string => !!p);
  if (!partes.length) return null;
  const frase = new Intl.ListFormat("es", { type: "conjunction" }).format(partes);
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}
