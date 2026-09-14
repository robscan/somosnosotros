import { localAIso } from "./fechas";

export const LIMITES_EVENTO = { titulo: 120, descripcion: 1000, precio: 60 } as const;

export type Evento = {
  id: string;
  lugar_id: string;
  titulo: string;
  inicio: string;
  fin: string | null;
  descripcion: string | null;
  imagen: string | null;
  precio: string | null;
  enlace: string | null;
  creado_por: string | null;
  visible: boolean;
};

/** Lo que la agenda necesita: el evento con el nombre de su lugar. */
export type EventoResumen = Pick<Evento, "id" | "titulo" | "inicio" | "fin" | "imagen" | "precio" | "lugar_id"> & {
  lugar: { nombre: string; portada: string | null } | null;
};

export type DatosEvento = {
  lugar_id: string;
  titulo: string;
  inicio: string;
  fin: string | null;
  descripcion: string;
  imagen: string | null;
  precio: string | null;
  enlace: string | null;
};
export type ErroresEvento = Partial<Record<"lugar_id" | "titulo" | "inicio" | "fin" | "descripcion" | "imagen" | "precio" | "enlace", string>>;

function limpiar(v: FormDataEntryValue | string | null | undefined): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

export function validarEvento(entrada: Record<string, FormDataEntryValue | null | undefined>): { datos: DatosEvento; errores: ErroresEvento } {
  const inicio = localAIso(limpiar(entrada.inicio));
  const finTexto = limpiar(entrada.fin);
  const fin = finTexto ? localAIso(finTexto) : null;
  const gratis = limpiar(entrada.gratis) !== "no";
  const enlaceTexto = limpiar(entrada.enlace);
  const datos: DatosEvento = {
    lugar_id: limpiar(entrada.lugar_id),
    titulo: limpiar(entrada.titulo),
    inicio: inicio ?? "",
    fin,
    descripcion: limpiar(entrada.descripcion),
    imagen: limpiar(entrada.imagen) || null,
    precio: gratis ? null : limpiar(entrada.precio) || null,
    enlace: enlaceTexto ? (/^https?:\/\//i.test(enlaceTexto) ? enlaceTexto : `https://${enlaceTexto}`) : null,
  };
  const errores: ErroresEvento = {};
  if (!/^[0-9a-f-]{36}$/.test(datos.lugar_id)) errores.lugar_id = "Elige el lugar donde es.";
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
