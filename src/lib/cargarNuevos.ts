import { z } from "zod";
import { corteNuevos, DIAS_NUEVOS, LIMITE_NUEVOS, type EventoAgenda } from "./agenda";
import type { Decididas } from "@/components/useAsistenciaEnLista";

export type { Decididas };
export { LIMITE_NUEVOS } from "./agenda";
export type RespuestaNuevos =
  | { ok: true; eventos: EventoAgenda[]; asistencias: Decididas; sello: string }
  | { ok: false; error: string };

export function rangoNuevos(ciudadNombre: unknown, desde: unknown, hasta: unknown, ahora: Date) {
  if (typeof ciudadNombre !== "string" || !ciudadNombre.trim() || ciudadNombre.length > 120 || /[\u0000-\u001f\u007f]/.test(ciudadNombre)
    || typeof desde !== "number" || !Number.isSafeInteger(desde) || desde < 0 || desde > 8_640_000_000_000_000) return null;
  const corte = corteNuevos(desde, ahora);
  let snapshot = ahora.getTime();
  if (hasta !== undefined) {
    if (typeof hasta !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(hasta)) return null;
    snapshot = Date.parse(hasta);
    if (!Number.isFinite(snapshot) || new Date(snapshot).toISOString() !== hasta
      || snapshot > ahora.getTime()) return null;
    if (snapshot < ahora.getTime() - DIAS_NUEVOS * 86400000 || snapshot < corte) snapshot = ahora.getTime();
  }
  return { ciudadNombre: ciudadNombre.trim(), desde: new Date(corte).toISOString(), sello: new Date(snapshot).toISOString() };
}

// Mismo contrato publico que page.tsx, sin campos de direccion ni migraciones nuevas.
export const CAMPOS_NUEVOS = "id, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_reservado, sitio_lat, sitio_lng, creado_en, ciudad, lugar:lugares(nombre, portada, lat, lng), artistas:eventos_artistas(artista:artistas(nombre))";
const fecha = z.string().datetime({ offset: true });
const punto = z.number().nullable();
const lugar = z.object({ nombre: z.string(), portada: z.string().nullable(), lat: punto, lng: punto });
const artista = z.object({ nombre: z.string() });
export const filasNuevos = z.array(z.object({
  id: z.uuid(), titulo: z.string(), inicio: fecha, fin: fecha.nullable(), zona: z.string(),
  imagen: z.string().nullable(), precio: z.string().nullable(), lugar_id: z.uuid().nullable(),
  sitio_texto: z.string().nullable(), sitio_reservado: z.boolean(), sitio_lat: punto, sitio_lng: punto,
  creado_en: fecha, ciudad: z.string(), lugar: z.union([lugar, z.array(lugar).max(1)]).nullable(),
  artistas: z.array(z.object({ artista: z.union([artista, z.array(artista).max(1)]).nullable() })).nullable(),
})).max(LIMITE_NUEVOS);
export const cuentasNuevos = z.array(z.object({ evento_id: z.uuid(), n: z.union([
  z.number(), z.string().regex(/^\d+$/).transform(Number),
]).refine((n) => Number.isSafeInteger(n) && n >= 0) })).max(LIMITE_NUEVOS);
export const asistenciasNuevos = z.array(z.object({ evento_id: z.uuid(), estado: z.enum(["voy", "me_interesa"]) })).max(LIMITE_NUEVOS);

export function eventosNuevos(filas: z.infer<typeof filasNuevos>, van: Map<string, number>): EventoAgenda[] {
  return filas.map(({ lugar, artistas, sitio_lat, sitio_lng, ...fila }) => {
    const sitio = Array.isArray(lugar) ? (lugar[0] ?? null) : lugar;
    return {
      ...fila,
      lugar: sitio ? { ...sitio, lat: sitio.lat ?? undefined, lng: sitio.lng ?? undefined } : null,
      artistas: (artistas ?? []).map((a) => (Array.isArray(a.artista) ? a.artista[0] : a.artista)?.nombre).filter((n): n is string => !!n),
      lat: sitio_lat,
      lng: sitio_lng,
      van: van.get(fila.id) ?? 0,
    };
  });
}
