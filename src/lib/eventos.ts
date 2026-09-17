import { ciudadCanonica } from "./ciudad";
import { esUuid, limpiar } from "./formulario";
import { localAIso, ZONA_INICIAL, zonaSegura } from "./fechas";

export const LIMITES_EVENTO = { titulo: 120, descripcion: 1000, precio: 60, sitio: 120, direccion: 200, indicaciones: 300 } as const;

/** Dónde es el evento: en un lugar registrado, en otro sitio (público) o en un sitio reservado (dirección con condiciones). */
export type ModoSitio = "lugar" | "otro" | "reservado";

/** Cuánto antes del inicio se revela un sitio reservado a las personas con sesión. */
export const REVELAR_OPCIONES = [
  { horas: 3, etiqueta: "3 horas antes" },
  { horas: 6, etiqueta: "6 horas antes" },
  { horas: 24, etiqueta: "1 día antes" },
  { horas: 48, etiqueta: "2 días antes" },
] as const;

export type Evento = {
  id: string;
  lugar_id: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  descripcion: string | null;
  imagen: string | null;
  precio: string | null;
  enlace: string | null;
  creado_por: string | null;
  visible: boolean;
  sitio_texto: string | null;
  sitio_lat: number | null;
  sitio_lng: number | null;
  sitio_reservado: boolean;
  sitio_revelar_desde: string | null;
  /** Zona horaria (IANA) del evento: sus horas se leen y se muestran en ella (migración 0029). */
  zona: string;
};

/** Lo que la agenda necesita: el evento con el nombre de su lugar o su sitio. */
export type EventoResumen = Pick<Evento, "id" | "titulo" | "inicio" | "fin" | "imagen" | "precio" | "lugar_id" | "sitio_texto" | "sitio_reservado" | "zona"> & {
  lugar: { nombre: string; portada: string | null } | null;
};

/** Dirección exacta de un sitio reservado (solo llega cuando la política de la base lo permite). */
export type SitioPrivado = { direccion: string; lat: number | null; lng: number | null; indicaciones: string | null; revelar_desde: string };

export type DatosEvento = {
  lugar_id: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  descripcion: string;
  imagen: string | null;
  precio: string | null;
  enlace: string | null;
  sitio_texto: string | null;
  sitio_lat: number | null;
  sitio_lng: number | null;
  sitio_reservado: boolean;
  sitio_revelar_desde: string | null;
  /** Solo si es reservado: lo que va a la tabla privada. */
  privado: { direccion: string; lat: number | null; lng: number | null; indicaciones: string | null; revelar_desde: string } | null;
  /** En otro sitio: la ciudad del pin, deducida por Mapbox (null si no se supo; el servidor pone la del lugar o la inicial). */
  ciudad: string | null;
  /** La zona en la que se leyeron las horas: la del lugar o la del punto del sitio (la decide el servidor antes de validar). */
  zona: string;
};
export type ErroresEvento = Partial<
  Record<"lugar_id" | "sitio_texto" | "direccion_privada" | "titulo" | "inicio" | "fin" | "descripcion" | "imagen" | "precio" | "enlace", string>
>;

function numeroONull(v: FormDataEntryValue | null | undefined): number | null {
  const t = limpiar(v);
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Lo que importa a quien ya dijo "Voy": cuándo y dónde. Al editar, si cambia alguno se avisa. */
export type CambioEvento = "cuando" | "donde" | "ambos" | null;
type Comparable = { inicio: string; fin: string | null; lugar_id: string | null; sitio_texto: string | null };
export function queCambio(antes: Comparable, despues: Comparable): CambioEvento {
  const ms = (v: string | null) => (v ? new Date(v).getTime() : null);
  const cuando = ms(antes.inicio) !== ms(despues.inicio) || ms(antes.fin) !== ms(despues.fin);
  const donde = (antes.lugar_id ?? null) !== (despues.lugar_id ?? null) || (antes.sitio_texto ?? null) !== (despues.sitio_texto ?? null);
  return cuando && donde ? "ambos" : cuando ? "cuando" : donde ? "donde" : null;
}

/** Nombre público del sitio para la agenda y la ficha. */
export function nombreSitio(e: Pick<EventoResumen, "lugar" | "sitio_texto" | "sitio_reservado">): string {
  if (e.lugar?.nombre) return e.lugar.nombre;
  if (e.sitio_texto) return e.sitio_reservado ? `${e.sitio_texto} · sitio reservado` : e.sitio_texto;
  return "Sitio por confirmar";
}

export type DatosJsonLdEvento = {
  id: string;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string | null;
  imagen: string | null;
  /** precio === null, para no inventar un número a partir de un texto libre ("$150", "taquilla"...). */
  gratis: boolean;
  sitioNombre: string;
  /** Solo si es público (el lugar o el pin de "otro sitio"); un sitio reservado nunca manda su coordenada real aquí. */
  sitioLat: number | null;
  sitioLng: number | null;
};

/**
 * JSON-LD tipo Event para la ficha (OL-059, bitácora 088): para que Google pueda mostrar fecha y lugar en el
 * buscador. Solo campos públicos — nunca quién va, nunca la dirección de un sitio reservado (por eso recibe ya
 * resueltos el nombre del sitio y su coordenada, no el registro privado). Sin precio si no se pudo escribir como
 * número: mejor omitirlo que inventarlo a partir de un texto libre.
 */
export function jsonLdEvento(e: DatosJsonLdEvento): Record<string, unknown> {
  const location: Record<string, unknown> = { "@type": "Place", name: e.sitioNombre };
  if (e.sitioLat != null && e.sitioLng != null) location.geo = { "@type": "GeoCoordinates", latitude: e.sitioLat, longitude: e.sitioLng };
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.titulo,
    startDate: e.inicio,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location,
    url: `https://somosnosotros.org/eventos/${e.id}`,
  };
  if (e.fin) data.endDate = e.fin;
  if (e.descripcion) data.description = e.descripcion;
  if (e.imagen) data.image = [e.imagen];
  if (e.gratis) data.isAccessibleForFree = true;
  return data;
}

/** Lee el formulario del evento. Las horas del selector se leen en `zona`, la del sitio del evento. */
export function validarEvento(entrada: Record<string, FormDataEntryValue | null | undefined>, zona: string = ZONA_INICIAL): { datos: DatosEvento; errores: ErroresEvento } {
  const modo = (limpiar(entrada.modo_sitio) || "lugar") as ModoSitio;
  const zonaSitio = zonaSegura(zona);
  const inicio = localAIso(limpiar(entrada.inicio), zonaSitio);
  const finTexto = limpiar(entrada.fin);
  const fin = finTexto ? localAIso(finTexto, zonaSitio) : null;
  const gratis = limpiar(entrada.gratis) !== "no";
  const enlaceTexto = limpiar(entrada.enlace);
  const revelarHoras = Number(limpiar(entrada.revelar_horas)) || 24;
  const revelarDesde = inicio ? new Date(new Date(inicio).getTime() - revelarHoras * 3600000).toISOString() : null;
  const lugarId = limpiar(entrada.lugar_id);
  const sitioTexto = limpiar(entrada.sitio_texto);
  const direccionPrivada = limpiar(entrada.direccion_privada);
  const esReservado = modo === "reservado";

  const datos: DatosEvento = {
    lugar_id: modo === "lugar" ? lugarId || null : null,
    titulo: limpiar(entrada.titulo),
    inicio: inicio ?? "",
    fin,
    descripcion: limpiar(entrada.descripcion),
    imagen: limpiar(entrada.imagen) || null,
    precio: gratis ? null : limpiar(entrada.precio) || null,
    enlace: enlaceTexto ? (/^https?:\/\//i.test(enlaceTexto) ? enlaceTexto : `https://${enlaceTexto}`) : null,
    sitio_texto: modo === "lugar" ? null : sitioTexto || null,
    sitio_lat: modo === "otro" ? numeroONull(entrada.sitio_lat) : null,
    sitio_lng: modo === "otro" ? numeroONull(entrada.sitio_lng) : null,
    sitio_reservado: esReservado,
    sitio_revelar_desde: esReservado ? revelarDesde : null,
    ciudad: modo === "lugar" ? null : ciudadCanonica(limpiar(entrada.ciudad)).slice(0, 80) || null,
    zona: zonaSitio,
    privado: esReservado
      ? {
          direccion: direccionPrivada,
          lat: numeroONull(entrada.privado_lat),
          lng: numeroONull(entrada.privado_lng),
          indicaciones: limpiar(entrada.indicaciones) || null,
          revelar_desde: revelarDesde ?? "",
        }
      : null,
  };

  const errores: ErroresEvento = {};
  if (modo === "lugar" && !esUuid(lugarId)) errores.lugar_id = "Elige el lugar donde es.";
  if (modo !== "lugar" && !sitioTexto) errores.sitio_texto = esReservado ? "Di cómo se anuncia el sitio (ej. \"Casa en Tequis\")." : "Di dónde es (ej. \"Plaza de Armas\").";
  if (sitioTexto.length > LIMITES_EVENTO.sitio) errores.sitio_texto = `Máximo ${LIMITES_EVENTO.sitio} caracteres.`;
  if (esReservado && !direccionPrivada) errores.direccion_privada = "Pon la dirección exacta: solo se revela cuando toca.";
  if (direccionPrivada.length > LIMITES_EVENTO.direccion) errores.direccion_privada = `Máximo ${LIMITES_EVENTO.direccion} caracteres.`;
  if (!datos.titulo) errores.titulo = "Ponle título al evento.";
  else if (datos.titulo.length > LIMITES_EVENTO.titulo) errores.titulo = `Máximo ${LIMITES_EVENTO.titulo} caracteres.`;
  if (!inicio) errores.inicio = "Falta la fecha y hora. Sin fecha no se publica.";
  if (finTexto && !fin) errores.fin = "La hora de fin no se entiende.";
  if (inicio && fin && new Date(fin) <= new Date(inicio)) errores.fin = "El fin tiene que ser después del inicio.";
  if (datos.descripcion.length > LIMITES_EVENTO.descripcion) errores.descripcion = `Máximo ${LIMITES_EVENTO.descripcion} caracteres.`;
  if (datos.imagen && !/^https:\/\/[^\s]+$/.test(datos.imagen)) errores.imagen = "La imagen no se subió bien. Intenta de nuevo.";
  if (!gratis && !datos.precio) errores.precio = "Pon el precio, o marca que es gratis.";
  if (datos.precio && datos.precio.length > LIMITES_EVENTO.precio) errores.precio = `Máximo ${LIMITES_EVENTO.precio} caracteres.`;
  if (datos.enlace && datos.enlace.length > 500) errores.enlace = "Demasiado largo.";
  return { datos, errores };
}

/** Texto para compartir: título, cuándo, dónde y el enlace. */
export function textoCompartir(titulo: string, cuando: string, lugar: string | null, url: string): string {
  return [`${titulo}`, `${cuando}${lugar ? ` · ${lugar}` : ""}`, url].join("\n");
}

/** Lo que se lee de un cartel (viene del modelo de visión). Todo puede faltar. */
export type LecturaCartel = {
  titulo: string | null;
  fecha: string | null; // YYYY-MM-DD
  hora: string | null; // HH:MM
  hora_fin: string | null;
  lugar: string | null;
  direccion: string | null;
  gratis: boolean | null;
  precio: string | null;
  descripcion: string | null;
  enlace: string | null;
  /** Nombres de quienes se presentan, tal como aparecen en el cartel. */
  artistas: string[] | null;
};

/** "@usuario" → Instagram; enlace o dominio → tal cual; teléfono u otra cosa → nada (ya va en la descripción). */
export function enlaceDesdeCartel(v: string | null): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  if (/^@[\w.]+$/.test(t)) return `https://instagram.com/${t.slice(1)}`;
  if (/^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return t;
  return "";
}

/** Convierte la lectura del cartel en valores del formulario. Lo que falta se deja vacío para que la persona lo complete. */
export function cartelAFormulario(l: LecturaCartel): { titulo: string; inicio: string; fin: string; gratis: boolean; precio: string; descripcion: string; enlace: string; lugar: string; direccion: string; artistas: string[] } {
  const fechaOk = l.fecha && /^\d{4}-\d{2}-\d{2}$/.test(l.fecha) ? l.fecha : "";
  const horaOk = l.hora && /^\d{2}:\d{2}$/.test(l.hora) ? l.hora : "";
  const horaFinOk = l.hora_fin && /^\d{2}:\d{2}$/.test(l.hora_fin) ? l.hora_fin : "";
  return {
    titulo: (l.titulo ?? "").trim().slice(0, LIMITES_EVENTO.titulo),
    inicio: fechaOk && horaOk ? `${fechaOk}T${horaOk}` : fechaOk ? `${fechaOk}T19:00` : "",
    fin: fechaOk && horaFinOk ? `${fechaOk}T${horaFinOk}` : "",
    gratis: l.gratis !== false && !l.precio,
    precio: (l.precio ?? "").trim().slice(0, LIMITES_EVENTO.precio),
    descripcion: (l.descripcion ?? "").trim().slice(0, LIMITES_EVENTO.descripcion),
    enlace: enlaceDesdeCartel(l.enlace),
    lugar: (l.lugar ?? "").trim(),
    direccion: (l.direccion ?? "").trim(),
    artistas: (l.artistas ?? []).map((a) => a.trim().replace(/\s+/g, " ").slice(0, 80)).filter(Boolean).slice(0, 6),
  };
}
