import { enCamino, leerEstadoTrabajo, type EstadoTrabajo } from "@/lib/redes/reglas";

/**
 * Lo que la cola de redes dice de cada evento (OL-465), de sus trabajos de las últimas 24 horas (del más nuevo al más viejo): el último de Instagram
 * y si hay uno en camino que publica en Facebook (de Facebook, o de Instagram con «También en Facebook»).
 */
export function trabajosPorEvento(filas: Record<string, unknown>[]): { instagram: Map<string, EstadoTrabajo>; facebook: Set<string> } {
  const instagram = new Map<string, EstadoTrabajo>();
  const facebook = new Set<string>();
  for (const f of filas) {
    const e = leerEstadoTrabajo(f);
    const evento = typeof f.evento_id === "string" ? f.evento_id : null;
    if (!e || !evento) continue;
    if (e.red === "instagram" && !instagram.has(evento)) instagram.set(evento, e);
    if (enCamino(e) && (e.red === "facebook" || e.conFacebook)) facebook.add(evento);
  }
  return { instagram, facebook };
}
