import { z } from "zod";
import type { EventoAgenda } from "./agenda";
import type { Decididas } from "@/components/useAsistenciaEnLista";

export type { Decididas };

/**
 * Cuántos eventos trae Cercanos, sin filtrar por ciudad (OL-095, L36: "el contexto ordena, no limita" — la ciudad
 * del chip ordena en Todos, pero no debe recortar lo que Cercanos ordena por distancia real. La ubicación de la
 * persona nunca viaja al servidor: la acción trae la lista y el teléfono la ordena, como ya hacía con la de un
 * único centro). Con las ciudades que hay hoy (San Luis Potosí y las instituciones del catálogo) 200 es de sobra
 * y barato de traer entero. Si la plataforma crece a muchas ciudades con cientos de eventos a la vez, esto habría
 * que repensarlo: paginar por cercanía en el propio servidor (con las coordenadas, sin mandarlas hoy) en vez de
 * traer una lista plana (condición del gestor de cambios, OL-095).
 */
export const LIMITE_CERCANOS = 200;

export type RespuestaCercanos = { ok: true; eventos: EventoAgenda[]; asistencias: Decididas } | { ok: false; error: string };

// Mismo contrato que la agenda principal y que Nuevos: sin campos de dirección exacta ni migraciones nuevas
// (deliberadamente un archivo propio, no una función compartida con cargarNuevos.ts: los limites y filtros de
// cada pestaña son distintos y así ninguna de las dos piezas que tocan esa zona choca con la otra).
export const CAMPOS_CERCANOS = "id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_reservado, sitio_lat, sitio_lng, creado_en, ciudad, lugar:lugares(nombre, portada, lat, lng), artistas:eventos_artistas(artista:artistas(nombre))";

const fecha = z.string().datetime({ offset: true });
const punto = z.number().nullable();
const lugar = z.object({ nombre: z.string(), portada: z.string().nullable(), lat: punto, lng: punto });
const artista = z.object({ nombre: z.string() });
export const filasCercanos = z.array(z.object({
  id: z.uuid(), slug: z.string(), titulo: z.string(), inicio: fecha, fin: fecha.nullable(), zona: z.string(),
  imagen: z.string().nullable(), precio: z.string().nullable(), lugar_id: z.uuid().nullable(),
  sitio_texto: z.string().nullable(), sitio_reservado: z.boolean(), sitio_lat: punto, sitio_lng: punto,
  creado_en: fecha, ciudad: z.string(), lugar: z.union([lugar, z.array(lugar).max(1)]).nullable(),
  artistas: z.array(z.object({ artista: z.union([artista, z.array(artista).max(1)]).nullable() })).nullable(),
})).max(LIMITE_CERCANOS);
export const cuentasCercanos = z.array(z.object({ evento_id: z.uuid(), n: z.union([
  z.number(), z.string().regex(/^\d+$/).transform(Number),
]).refine((n) => Number.isSafeInteger(n) && n >= 0) })).max(LIMITE_CERCANOS);
export const asistenciasCercanos = z.array(z.object({ evento_id: z.uuid(), estado: z.enum(["voy", "me_interesa"]) })).max(LIMITE_CERCANOS);

export function eventosCercanos(filas: z.infer<typeof filasCercanos>, van: Map<string, number>): EventoAgenda[] {
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
