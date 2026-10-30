/**
 * Lo que se quedó sin salir por la conexión (OL-496, hallazgo 3 de la bitácora 527): al reconectar Instagram, la hoja de la conexión ofrece
 * volver a publicar los trabajos de esta semana que fallaron por permiso o token (`error = 'permiso'`, el que la cola no reintenta sola). Pura,
 * sin base: la usan la página (al volver de Meta con `?conectado=1`) y la acción que los vuelve a poner en la cola, que la recalcula en el
 * servidor y nunca se fía de la lista del teléfono.
 *
 * Qué entra: cada trabajo `fallido` por `permiso` que terminó desde el lunes de esta semana, uno por publicación (lo mismo que falló dos veces
 * sale una vez, el más reciente). Qué no: lo que ya volvió a salir o va en camino (otro trabajo después de ese, del mismo evento, red y formato,
 * en cola, publicándose o publicado), un evento que ya empezó (el trabajador lo rechazaría), y un día de la semana de Instagram (`pedido.casilla`)
 * que ya tiene otro trabajo, se quitó o salió.
 */
import { diaConMes } from "../fechas";
import type { Red } from "./reglas";

/** Un trabajo de la cola, con lo que hace falta para decidir (las columnas de `redes_trabajos`). */
export type TrabajoCola = {
  id: string;
  evento_id: string | null;
  artista_id: string | null;
  lugar_id: string | null;
  red: Red;
  formato: "4x5" | "9x16";
  pedido: Record<string, unknown> | null;
  estado: string;
  error: string | null;
  creado_en: string;
  terminado_en: string | null;
};
/** El día de la semana de Instagram de un trabajo (`instagram_semana`): a qué trabajo apunta ahora y cómo va. */
export type CasillaCola = { id: string; trabajo_id: string | null; estado: string };

/** Lo que se ofrece volver a publicar: el trabajo que falló y cómo se vuelve a poner en la cola (por su día de la semana, o por su evento). */
export type SinSalir = {
  id: string;
  casilla: string | null;
  evento_id: string | null;
  artista_id: string | null;
  lugar_id: string | null;
  red: Red;
  formato: "4x5" | "9x16";
  pedido: Record<string, unknown>;
  facebook: boolean;
  terminado_en: string;
};

const casillaDe = (t: Pick<TrabajoCola, "pedido">) => (typeof t.pedido?.casilla === "string" ? t.pedido.casilla : null);
const VIVO_O_HECHO = new Set(["en_cola", "publicando", "publicado"]);

/**
 * `trabajos`: los que fallaron y los que podrían haberlos sustituido (del mismo evento, en cualquier estado). `desde`: el lunes de esta semana a
 * las 00:00. `casillas`: los días de la semana de Instagram que aparecen en los pedidos. `porVenir`: si el evento sigue por venir (null si no se
 * pudo leer: no se ofrece). Del más reciente al más viejo.
 */
export function quedaronSinSalir(
  trabajos: TrabajoCola[],
  { desde, casillas, porVenir }: { desde: Date; casillas: Map<string, CasillaCola>; porVenir: (eventoId: string) => boolean | null },
): SinSalir[] {
  const caidos = trabajos
    .filter((t) => t.estado === "fallido" && t.error === "permiso" && t.terminado_en && Date.parse(t.terminado_en) >= desde.getTime())
    .sort((a, b) => Date.parse(b.terminado_en!) - Date.parse(a.terminado_en!));
  const vistos = new Set<string>();
  const fuera: SinSalir[] = [];
  for (const t of caidos) {
    const casilla = casillaDe(t);
    const llave = casilla ? `dia:${casilla}` : `${t.evento_id ?? t.artista_id ?? t.lugar_id}:${t.red}:${t.formato}`;
    if (vistos.has(llave)) continue;
    vistos.add(llave);
    if (casilla) {
      const c = casillas.get(casilla);
      // El día sigue esperando este trabajo (no se cambió, no se quitó, no salió por otro lado).
      if (!c || c.trabajo_id !== t.id || c.estado !== "fallido") continue;
    } else {
      if (!t.evento_id || porVenir(t.evento_id) !== true) continue;
      const despues = trabajos.some((o) => o.id !== t.id && o.evento_id === t.evento_id && o.red === t.red && o.formato === t.formato && VIVO_O_HECHO.has(o.estado) && Date.parse(o.creado_en) > Date.parse(t.creado_en));
      if (despues) continue;
    }
    fuera.push({ id: t.id, casilla, evento_id: t.evento_id, artista_id: t.artista_id, lugar_id: t.lugar_id, red: t.red, formato: t.formato, pedido: t.pedido ?? {}, facebook: t.pedido?.facebook === true, terminado_en: t.terminado_en! });
  }
  return fuera;
}

/** Un renglón de la lista corta de la hoja: el título y, debajo, dónde iba y cuándo no salió («Instagram y Facebook · publicación · no salió el mié 7 de oct»). */
export type RenglonSinSalir = { id: string; red: Red; titulo: string; detalle: string };

export function renglonSinSalir(s: SinSalir, titulo: string, ahora: Date): RenglonSinSalir {
  const donde = s.red === "facebook" ? "Facebook" : s.facebook ? "Instagram y Facebook" : "Instagram";
  const que = s.red === "facebook" ? null : s.formato === "9x16" ? "historia" : "publicación";
  return { id: s.id, red: s.red, titulo, detalle: [donde, que, `no salió el ${diaConMes(s.terminado_en, ahora)}`].filter(Boolean).join(" · ") };
}

/** El botón de la hoja, bajo «Se quedó sin salir» y su lista: «Volver a publicar (3)» (en una línea también a 320). */
export const textoVolverAPublicar = (n: number) => `Volver a publicar (${n})`;

/** Lo que dice la hoja al terminar (`enCamino`: guardados en la cola; `yaIban`: ya estaban en camino o ya salieron; `fallaron`: no se guardaron). */
export function textoVueltos({ enCamino, yaIban, fallaron }: { enCamino: number; yaIban: number; fallaron: number }): string {
  const partes = [
    enCamino ? `${enCamino === 1 ? "1 va" : `${enCamino} van`} en camino. Te avisamos en el teléfono cuando salgan.` : null,
    yaIban ? `${yaIban === 1 ? "1 ya iba" : `${yaIban} ya iban`} en camino o ya había salido.` : null,
    fallaron ? `${fallaron === 1 ? "1 no se pudo" : `${fallaron} no se pudieron`} poner en la cola: inténtalo otra vez.` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" ") : "No quedó nada por volver a publicar.";
}
