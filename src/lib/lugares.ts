export const TIPOS = [
  { valor: "casa_de_cultura", etiqueta: "Casa de cultura" },
  { valor: "foro", etiqueta: "Foro" },
  { valor: "galeria", etiqueta: "Galería" },
  { valor: "colectivo", etiqueta: "Colectivo" },
  { valor: "biblioteca", etiqueta: "Biblioteca" },
  { valor: "otro", etiqueta: "Otro" },
] as const;
export type Tipo = (typeof TIPOS)[number]["valor"];

export const REDES = [
  { clave: "instagram", etiqueta: "Instagram", ayuda: "usuario o enlace" },
  { clave: "facebook", etiqueta: "Facebook", ayuda: "página o enlace" },
  { clave: "whatsapp", etiqueta: "WhatsApp", ayuda: "número con lada, ej. 444 123 4567" },
  { clave: "sitio", etiqueta: "Sitio web", ayuda: "enlace" },
] as const;
export type ClaveRed = (typeof REDES)[number]["clave"];
export type Redes = Partial<Record<ClaveRed, string>>;

/** Lo que el mapa y la lista necesitan de un lugar. */
export type LugarResumen = {
  id: string;
  nombre: string;
  tipo: Tipo;
  direccion: string | null;
  lat: number;
  lng: number;
  portada: string | null;
};

export type Lugar = LugarResumen & {
  descripcion: string | null;
  ciudad: string;
  redes: Redes;
  creado_por: string | null;
  visible: boolean;
};

export const LIMITES_LUGAR = { nombre: 120, descripcion: 600, direccion: 200 } as const;

export function etiquetaTipo(tipo: string): string {
  return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? "Otro";
}

/** Mismo criterio que normalizar_nombre() en la base: minúsculas, sin acentos, solo letras y números. */
export function normalizarNombre(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Filtra la lista por nombre (y dirección) escrito a medias, sin importar acentos ni mayúsculas. */
export function filtrarLugares<T extends { nombre: string; direccion: string | null }>(lugares: T[], busqueda: string): T[] {
  const q = normalizarNombre(busqueda);
  if (!q) return lugares;
  return lugares.filter((l) => normalizarNombre(`${l.nombre} ${l.direccion ?? ""}`).includes(q));
}

export type DatosLugar = {
  nombre: string;
  tipo: Tipo;
  direccion: string;
  lat: number;
  lng: number;
  descripcion: string;
  redes: Redes;
  portada: string | null;
};
export type ErroresLugar = Partial<Record<"nombre" | "tipo" | "direccion" | "ubicacion" | "descripcion" | "portada" | ClaveRed, string>>;

function limpiar(v: FormDataEntryValue | string | null | undefined): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

/** Convierte "usuario", "@usuario" o el enlace completo en un enlace https. Devuelve null si va vacío. */
export function enlaceRed(clave: ClaveRed, valor: string): string | null {
  const v = valor.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  switch (clave) {
    case "instagram":
      return `https://instagram.com/${v.replace(/^@/, "").replace(/^instagram\.com\//, "")}`;
    case "facebook":
      return `https://facebook.com/${v.replace(/^@/, "").replace(/^facebook\.com\//, "")}`;
    case "whatsapp": {
      const digitos = v.replace(/\D/g, "");
      return digitos ? `https://wa.me/${digitos.length === 10 ? "52" + digitos : digitos}` : null;
    }
    case "sitio":
      return `https://${v}`;
  }
}

export function validarLugar(entrada: Record<string, FormDataEntryValue | null | undefined>): { datos: DatosLugar; errores: ErroresLugar } {
  const lat = Number(limpiar(entrada.lat));
  const lng = Number(limpiar(entrada.lng));
  const tipo = limpiar(entrada.tipo) as Tipo;
  const redes: Redes = {};
  for (const r of REDES) {
    const v = limpiar(entrada[r.clave]);
    if (v) redes[r.clave] = v;
  }
  const datos: DatosLugar = {
    nombre: limpiar(entrada.nombre),
    tipo,
    direccion: limpiar(entrada.direccion),
    lat,
    lng,
    descripcion: limpiar(entrada.descripcion),
    redes,
    portada: limpiar(entrada.portada) || null,
  };
  const errores: ErroresLugar = {};
  if (!datos.nombre) errores.nombre = "Escribe el nombre del lugar.";
  else if (datos.nombre.length > LIMITES_LUGAR.nombre) errores.nombre = `Máximo ${LIMITES_LUGAR.nombre} caracteres.`;
  if (!TIPOS.some((t) => t.valor === tipo)) errores.tipo = "Elige qué tipo de lugar es.";
  if (datos.direccion.length > LIMITES_LUGAR.direccion) errores.direccion = `Máximo ${LIMITES_LUGAR.direccion} caracteres.`;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    errores.ubicacion = "Falta la ubicación: busca la dirección o mueve el pin en el mapa.";
  if (datos.descripcion.length > LIMITES_LUGAR.descripcion) errores.descripcion = `Máximo ${LIMITES_LUGAR.descripcion} caracteres.`;
  if (datos.portada && !/^https:\/\/[^\s]+$/.test(datos.portada)) errores.portada = "La foto no se subió bien. Intenta de nuevo.";
  for (const r of REDES) {
    const v = redes[r.clave];
    if (v && v.length > 200) errores[r.clave] = "Demasiado largo.";
    if (v && r.clave === "whatsapp" && v.replace(/\D/g, "").length < 10) errores.whatsapp = "Pon el número con lada (10 dígitos).";
  }
  return { datos, errores };
}
