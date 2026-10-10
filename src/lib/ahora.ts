import type { EventoAgenda } from "./agenda";
import { esMarco } from "./agendaPorClase";
import { diaLocal, horaCorta, localAIso, terminaDe } from "./fechas";
import type { Franja } from "./horarioLugar";
import { hrefEvento, nombreSitio } from "./eventos";
import { ocurrenciasDe } from "./ocurrencias";

/**
 * La fila «Ahora» de Inicio (OL-359, prototipo firmado `docs/rediseno/prototipos/barra-ahora.html`, bitácora 388): lo que caduca pronto, por hora.
 * Sale de los eventos que Inicio ya carga (hoy y mañana ya están en «Esta semana»): sin consulta nueva. El orden es el del prototipo:
 * 1. **Ahora:** ya empezó y no ha terminado (`terminaDe`: con fin, su fin; sin él, 3 h después de empezar, OL-358).
 * 2. **En un rato:** empieza hoy en menos de 2 h, con la cuenta atrás («En 30 min», «En 1 h 15 min»).
 * 3. **Exposiciones:** solo el día que inaugura o el último, hasta su cierre de hoy o, sin horario de hoy, hasta las 18:00.
 * 4. **Hoy:** lo que empieza más tarde hoy.
 * 5. **Mañana:** solo si ya no queda nada hoy o desde las 20:00.
 * Tope de 8. Del festival salen sus actos, nunca el festival entero (OL-347). Sin «Destacados» propio: un destacado sale por su hora. Cada hora y
 * cada día se leen en la zona del evento, como en `lib/fechas`.
 */

export const TOPE_AHORA = 8;
/** «En un rato»: empieza en menos de esto. */
export const RATO_MS = 2 * 3600_000;
/** Desde esta hora (local) ya entra lo de mañana aunque quede algo hoy. */
export const HORA_MANANA = "20:00";
/** Una exposición sin horario de hoy se anuncia hasta esta hora. Supuesto del prototipo, por confirmar con el founder. */
export const CIERRE_EXPO = "18:00";

export type TipoAhora = "ahora" | "rato" | "expo" | "hoy" | "manana";

/** Lo que la fila necesita de un evento (serializable: viaja del servidor al teléfono, que lo reclasifica cada minuto). */
export type EventoAhora = {
  /** Única por ocurrencia: un taller de varios días sale con la de ese día. */
  clave: string;
  id: string;
  href: string;
  titulo: string;
  inicio: string;
  fin: string | null;
  zona: string;
  exposicion: boolean;
  /** Solo de una exposición: su horario (días 1 = lunes … 7 = domingo). Sin él o sin franja de hoy, hasta las 18:00. */
  horario?: Franja[];
  /** El cartel del evento (su imagen), nunca la foto del lugar: sin él, la historia es tipográfica con el símbolo SN. */
  cartel: string | null;
  sitio: string;
  /** «Sesión 2 de 4» si es parte de varias. */
  parte: string | null;
  /** A dónde lleva «Cómo llegar»: el sitio con su dirección y la ciudad. Null en un sitio reservado (no se revela aquí). */
  destino: string | null;
};

export type AvisoAhora = { tipo: TipoAhora; e: EventoAhora };

const ms = (iso: string) => Date.parse(iso);
const sumarDia = (dia: string, n: number) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};
/** El instante de «HH:MM» de un día (YYYY-MM-DD) en la zona. */
const aLas = (dia: string, hora: string, zona: string) => ms(localAIso(`${dia}T${hora}`, zona) ?? `${dia}T${hora}:00Z`);
/** Día de la semana de un día de calendario: 1 = lunes … 7 = domingo (como `horarioLugar`). */
const diaSemana = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() || 7;
};

/** Hasta cuándo se anuncia hoy una exposición: el cierre más tardío de sus franjas de hoy o, sin ninguna, las 18:00. */
export function cierreExpoHoy(e: Pick<EventoAhora, "horario" | "zona">, hoy: string): number {
  const semana = diaSemana(hoy);
  const cierres = (e.horario ?? []).filter((f) => f.dias.includes(semana)).map((f) => f.cierra).sort();
  return aLas(hoy, cierres.at(-1) ?? CIERRE_EXPO, e.zona);
}

const porHora = (a: EventoAhora, b: EventoAhora) => ms(a.inicio) - ms(b.inicio) || a.titulo.localeCompare(b.titulo, "es") || a.clave.localeCompare(b.clave);

/**
 * La clasificación entera, por urgencia y ya con el tope. Pura: la misma entrada a la misma hora da siempre lo mismo (el teléfono la vuelve a
 * correr cada minuto).
 */
export function clasificarAhora(eventos: readonly EventoAhora[], ahora: Date, tope = TOPE_AHORA): AvisoAhora[] {
  const t = ahora.getTime();
  const grupos: Record<TipoAhora, EventoAhora[]> = { ahora: [], rato: [], expo: [], hoy: [], manana: [] };
  const deManana: EventoAhora[] = [];
  for (const e of eventos) {
    const hoy = diaLocal(ahora, e.zona);
    if (e.exposicion) {
      const abre = diaLocal(new Date(e.inicio), e.zona);
      const cierra = e.fin ? diaLocal(new Date(e.fin), e.zona) : null;
      if ((abre === hoy || cierra === hoy) && t < cierreExpoHoy(e, hoy)) grupos.expo.push(e);
      continue;
    }
    const inicio = ms(e.inicio);
    const dia = diaLocal(new Date(e.inicio), e.zona);
    const termina = ms(terminaDe(e.inicio, e.fin, e.zona));
    if (inicio <= t && t < termina) grupos.ahora.push(e);
    else if (inicio > t && dia === hoy) (inicio - t < RATO_MS ? grupos.rato : grupos.hoy).push(e);
    else if (inicio > t && dia === sumarDia(hoy, 1)) deManana.push(e);
  }
  const quedaHoy = grupos.ahora.length + grupos.rato.length + grupos.expo.length + grupos.hoy.length > 0;
  for (const e of deManana) if (!quedaHoy || t >= aLas(diaLocal(ahora, e.zona), HORA_MANANA, e.zona)) grupos.manana.push(e);
  const orden: TipoAhora[] = ["ahora", "rato", "expo", "hoy", "manana"];
  return orden.flatMap((tipo) => grupos[tipo].toSorted(porHora).map((e) => ({ tipo, e }))).slice(0, tope);
}

/** «En 30 min», «En 1 h», «En 1 h 15 min»: lo que falta, redondeado al minuto de arriba (a las 16:15:30 algo de las 16:45 está «en 30 min»). */
export function cuentaAtras(inicio: string, ahora: Date): string {
  const m = Math.max(1, Math.ceil((ms(inicio) - ahora.getTime()) / 60000));
  if (m < 60) return `En ${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return `En ${h} h${resto ? ` ${resto} min` : ""}`;
}

const esUltimoDia = (e: EventoAhora, ahora: Date) => !!e.fin && diaLocal(new Date(e.fin), e.zona) === diaLocal(ahora, e.zona);

/** La urgencia, como etiqueta de la historia: «Ahora», «En 30 min», «Último día», «Inaugura hoy», «Hoy», «Mañana». */
export function etiquetaAhora({ tipo, e }: AvisoAhora, ahora: Date): string {
  if (tipo === "ahora") return "Ahora";
  if (tipo === "rato") return cuentaAtras(e.inicio, ahora);
  if (tipo === "expo") return esUltimoDia(e, ahora) ? "Último día" : "Inaugura hoy";
  return tipo === "hoy" ? "Hoy" : "Mañana";
}

/** Lo que dice el círculo debajo, corto y en una línea: «Ahora», «En 30 min», «Último día», «20:00» o «Mañana 9:00». */
export function rotuloCirculo(a: AvisoAhora, ahora: Date): string {
  if (a.tipo === "hoy") return horaCorta(a.e.inicio, a.e.zona);
  if (a.tipo === "manana") return `Mañana ${horaCorta(a.e.inicio, a.e.zona)}`;
  return etiquetaAhora(a, ahora);
}

/** El cuándo de la historia: «Desde 17:30» o «Hasta 20:00» si ya empezó (sin fin no se inventa un «hasta»); si no, la hora. */
export function cuandoAhora({ tipo, e }: AvisoAhora): string {
  if (tipo === "ahora") return e.fin ? `Hasta ${horaCorta(e.fin, e.zona)}` : `Desde ${horaCorta(e.inicio, e.zona)}`;
  if (tipo === "expo") return e.horario?.length ? "Abierta hoy" : "Horario por confirmar";
  return horaCorta(e.inicio, e.zona);
}

/** La línea de arriba de la historia: el cuándo, el sitio y, si es parte de varias, cuál. */
export const metaAhora = (a: AvisoAhora): string => [cuandoAhora(a), a.e.sitio, a.e.parte].filter(Boolean).join(" · ");

/** El anillo del círculo: gira en «Ahora», oscuro en «En un rato» y las exposiciones, gris en lo demás; apagado si ya se vio. */
export function anilloDe(tipo: TipoAhora, visto: boolean): "ahora" | "pronto" | "resto" | "visto" {
  if (visto) return "visto";
  if (tipo === "ahora") return "ahora";
  return tipo === "rato" || tipo === "expo" ? "pronto" : "resto";
}

/**
 * Los candidatos, en el servidor, de la agenda que Inicio ya cargó: cada día de un evento (`ocurrenciasDe`, OL-320) que empieza antes de
 * `ahora` + 2 días y no ha terminado, más las exposiciones que inauguran o cierran en esos días. Nunca el marco de un festival (sus actos sí).
 * Sobran unos pocos a propósito: el teléfono reclasifica cada minuto y a medianoche lo de mañana pasa a ser de hoy.
 */
export function candidatosAhora(eventos: readonly EventoAgenda[], ciudad: string, ahora: Date = new Date()): EventoAhora[] {
  const t = ahora.getTime();
  const hasta = t + 2 * 86400_000;
  const salida: EventoAhora[] = [];
  for (const e of eventos) {
    if (esMarco(e)) continue;
    const base = {
      id: e.id,
      href: hrefEvento(e),
      titulo: e.titulo,
      zona: e.zona,
      cartel: e.imagen ?? null,
      sitio: nombreSitio(e),
      destino: e.sitio_reservado ? null : [e.lugar?.nombre ?? e.sitio_texto, e.sitio_direccion, ciudad].filter(Boolean).join(", ") || null,
    };
    if (e.clase === "exposicion") {
      const marcas = [e.inicio, e.fin].filter((x): x is string => !!x).map(ms);
      if (marcas.some((m) => m < hasta && m > t - 86400_000)) salida.push({ ...base, clave: e.id, inicio: e.inicio, fin: e.fin, exposicion: true, parte: null, ...(e.horario ? { horario: e.horario } : {}) });
      continue;
    }
    for (const o of ocurrenciasDe(e)) {
      if (ms(o.inicio) >= hasta || ms(terminaDe(o.inicio, o.fin, o.zona)) <= t) continue;
      const parte = o.ocurrencia?.parte;
      salida.push({ ...base, clave: o.ocurrencia?.clave ?? e.id, inicio: o.inicio, fin: o.fin, exposicion: false, parte: parte ? `Sesión ${parte.n} de ${parte.de}` : null });
    }
  }
  return salida;
}
