import type { QuienItem } from "@/lib/artistas";
import { esCooperacion, extraerNumero, LIMITES_EVENTO, type Evento } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { OTRO_VACIO, sitioDeLugar, type Respuestas, type Sitio } from "./pasos";

/**
 * Con qué abre el alta de evento por pasos (OL-312), sin DOM: lo que ya se sabe por dónde se entró. Desde la ficha de un lugar («Publicar
 * aquí», `?lugar=`) el sitio ya está contestado y «¿Dónde es?» no se pregunta; desde la de un artista («Publicar fecha», `?artista=`) Quién
 * empieza con él; y al duplicar un evento (`?desde=`) las respuestas empiezan con lo suyo menos el día y la hora, y el flujo entra ya en lo
 * primero que falte (el día) en vez del primer paso, que queda detrás (Atrás lleva a él, para subir otro cartel).
 */
export type Arranque = { r: Partial<Respuestas>; entrar: boolean };

/** Lo del evento que se duplica y sirve para el nuevo (lo de `select *`, sin pedir nada más). */
export type EventoBase = Pick<Evento, "titulo" | "lugar_id" | "precio" | "descripcion" | "enlace" | "sitio_texto" | "sitio_direccion" | "sitio_lat" | "sitio_lng" | "sitio_reservado"> & { ciudad?: string | null };

/**
 * El sitio del evento que se duplica, como respuesta; undefined si hay que preguntarlo. Un lugar del directorio, si sigue en él (uno privado
 * de la cuenta va como sitio reservado, `sitioDeLugar`); otro sitio, con su nombre, su dirección y su punto (si no estaba ubicado, se
 * pregunta). Un sitio reservado se pregunta siempre: su dirección exacta no se lee al duplicar (como en el alta de siempre).
 */
export function sitioDeEvento(e: EventoBase, lugares: readonly LugarResumen[]): Sitio | undefined {
  if (e.lugar_id) {
    const lugar = lugares.find((l) => l.id === e.lugar_id);
    return lugar ? sitioDeLugar(lugar, OTRO_VACIO) : undefined;
  }
  if (e.sitio_reservado || !e.sitio_texto?.trim()) return undefined;
  const direccion = e.sitio_direccion ?? "";
  return {
    modo: "otro",
    lugarId: "",
    otro: {
      ...OTRO_VACIO,
      sitioTexto: e.sitio_texto.slice(0, LIMITES_EVENTO.sitio),
      direccion,
      // Un sitio guardado solo con nombre, sin dirección (los de antes): se respeta como está, igual que al editar.
      nombreLegacy: !direccion,
      sitioPunto: e.sitio_lat != null && e.sitio_lng != null ? { lat: e.sitio_lat, lng: e.sitio_lng } : null,
      ciudad: e.ciudad ?? null,
    },
  };
}

/** Cuánto cuesta el evento que se duplica: sin precio, gratis; «Cooperación solidaria», cooperación; con un número, ese precio; un texto sin número («taquilla»), se pregunta. */
export function costoDeEvento(precio: string | null): Pick<Respuestas, "costo" | "precio"> | null {
  if (!precio) return { costo: "gratis", precio: "" };
  if (esCooperacion(precio)) return { costo: "cooperacion", precio: "" };
  const numero = extraerNumero(precio).slice(0, LIMITES_EVENTO.precio);
  return numero ? { costo: "precio", precio: numero } : null;
}

/** Las respuestas del evento que se duplica: nombre, sitio, costo, quién, descripción y enlace; sin día ni hora (se preguntan) ni cartel. */
export function respuestasDeEvento(e: EventoBase, lugares: readonly LugarResumen[], quien: QuienItem[]): Partial<Respuestas> {
  const sitio = sitioDeEvento(e, lugares);
  return {
    nombre: e.titulo.slice(0, LIMITES_EVENTO.titulo),
    ...(sitio ? { sitio } : {}),
    ...costoDeEvento(e.precio),
    quien,
    descripcion: e.descripcion ?? "",
    enlace: e.enlace ?? "",
  };
}

/**
 * El arranque según por dónde se entró; null si se entra de cero. El evento que se duplica manda; si no, el lugar pone el sitio y el artista,
 * Quién (pueden ir los dos). Un lugar que no está entre los del directorio que se pueden elegir no contesta nada.
 */
export function arranqueDe({ desde, lugar, artista }: { desde?: Partial<Respuestas> | null; lugar?: LugarResumen | null; artista?: QuienItem | null }): Arranque | null {
  if (desde) return { r: desde, entrar: true };
  if (!lugar && !artista) return null;
  return { r: { ...(lugar ? { sitio: sitioDeLugar(lugar, OTRO_VACIO) } : {}), ...(artista ? { quien: [artista] } : {}) }, entrar: false };
}

/** ¿La respuesta trae algo? Una lista vacía o un texto vacío no cuentan. */
const conValor = (v: unknown): boolean => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : v != null);

/**
 * Lo leído de un cartel sin lo que vino al abrir: el lugar de la ficha, el artista, o lo del evento que se duplica no lo pisa el cartel
 * (como en el alta de siempre, donde lo que traía el formulario al abrirse quedaba fuera de lo que el cartel rellenaba). Lo que vino vacío
 * (un evento duplicado sin artistas) sí lo puede contestar.
 */
export function sinPisar(leidas: Partial<Respuestas>, arranque: Arranque | null): Partial<Respuestas> {
  if (!arranque) return leidas;
  const fijas = new Set(Object.entries(arranque.r).filter(([, v]) => conValor(v)).map(([k]) => k));
  // El costo y su precio van juntos: si vino uno, el otro tampoco se toca.
  if (fijas.has("costo")) fijas.add("precio");
  return Object.fromEntries(Object.entries(leidas).filter(([k]) => !fijas.has(k))) as Partial<Respuestas>;
}
