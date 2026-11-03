import { enCamino, leerEstadoTrabajo, type EstadoTrabajo, type Red } from "@/lib/redes/reglas";

/** Un trabajo en camino de un evento, como lo siembra la lista (OL-506: con su red y si lleva Facebook, para decir cada línea sin preguntar). */
export type TrabajoEnCamino = { id: string; reintentando: boolean; red?: Red; conFacebook?: boolean };

/**
 * Lo que la cola de redes dice de cada evento (OL-465), de sus trabajos de las últimas 24 horas (del más nuevo al más viejo): el último de Instagram
 * y si hay uno en camino que publica en Facebook (de Facebook, o de Instagram con «También en Facebook»).
 */
export function trabajosPorEvento(filas: Record<string, unknown>[]): { instagram: Map<string, EstadoTrabajo>; facebook: Set<string>; vivos: Map<string, TrabajoEnCamino[]> } {
  const instagram = new Map<string, EstadoTrabajo>();
  const facebook = new Set<string>();
  // OL-488: los trabajos en camino de cada evento (la lista pregunta por ellos mientras dice «Publicando…»).
  const vivos = new Map<string, TrabajoEnCamino[]>();
  for (const f of filas) {
    const e = leerEstadoTrabajo(f);
    const evento = typeof f.evento_id === "string" ? f.evento_id : null;
    if (!e || !evento) continue;
    if (e.red === "instagram" && !instagram.has(evento)) instagram.set(evento, e);
    if (enCamino(e) && (e.red === "facebook" || e.conFacebook)) facebook.add(evento);
    if (enCamino(e)) vivos.set(evento, [...(vivos.get(evento) ?? []), { id: e.id, reintentando: e.reintentando, red: e.red, conFacebook: e.conFacebook }]);
  }
  return { instagram, facebook, vivos };
}
