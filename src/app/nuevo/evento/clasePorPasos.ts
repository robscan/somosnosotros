import { resumenTaller, textoVisita } from "@/lib/claseEvento";
import { diaLocal } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { actosMarcados, conPrograma, horariosDelTaller, nombreDelSitio, resumenPrograma, sedeDeActo, type Respuestas } from "./pasos";

/**
 * Lo que el alta y editar por pasos dicen de cómo ocurre un evento (OL-321), sin DOM: las sedes de un festival en una línea y la línea de cuándo
 * de lo que no es un evento de un día («Publicado» y compartir).
 */

/** «Revisa» de un taller: sus sesiones en una línea («3 sesiones · sáb 10, sáb 17 y sáb 24 de oct · 10:00 a.m.»); null sin sesiones o sin hora. */
export function textoSesiones(r: Respuestas, hoy: string): string | null {
  const horarios = horariosDelTaller(r);
  return horarios.length ? resumenTaller(horarios, hoy) : null;
}

/** Las sedes de un festival en una línea: los nombres de las sedes de sus actos marcados (la propia o la del festival, OL-413), sin repetir
 *  («CC200 y Cineteca Alameda»). */
export function sedesDelPrograma(r: Pick<Respuestas, "actos" | "sitio">, lugares: readonly LugarResumen[]): string {
  const nombres = [
    ...new Set(
      actosMarcados(r)
        .map((a) => sedeDeActo(a, r.sitio))
        .map((s) => nombreDelSitio(s, s.modo === "lugar" ? lugares.find((l) => l.id === s.lugarId) : undefined))
        .filter(Boolean),
    ),
  ];
  return new Intl.ListFormat("es", { type: "conjunction" }).format(nombres);
}

/** ¿Algún acto marcado tiene sede propia? Entonces «Revisa» enseña las sedes del programa además del «Dónde» del festival (OL-413). */
export const conSedesPropias = (r: Pick<Respuestas, "actos">): boolean => actosMarcados(r).some((a) => a.sitio !== null);

/** La línea de cuándo de lo que no es un evento de un día, para «Publicado» y para compartir (OL-321); undefined en un evento. */
export function cuandoDeClase(r: Respuestas, zona: string, borradores = 0): string | undefined {
  const ahora = new Date();
  const hoy = diaLocal(ahora, zona);
  if (r.clase === "exposicion" && r.visita?.desde && r.visita.hasta) return textoVisita({ desde: r.visita.desde, hasta: r.visita.hasta }, hoy, ahora, zona);
  if (r.clase === "taller") return textoSesiones(r, hoy) ?? undefined;
  // Un festival sin programa (OL-413) dice su día y su hora como un evento.
  if (conPrograma(r)) {
    const programa = resumenPrograma(r, hoy);
    return programa ? `${programa}${borradores ? ` · ${borradores} ${borradores === 1 ? "borrador" : "borradores"}` : ""}` : undefined;
  }
  return undefined;
}

