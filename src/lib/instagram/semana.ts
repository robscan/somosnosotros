import { diaConMes, diaLocal, horaDeReloj, localAIso } from "../fechas";
import { porSenal, type Senal } from "./elegir";

/**
 * La semana de Instagram (OL-479; firmada en el prototipo de OL-477, bitácora 509): la regla de cada día, cómo se llena una semana con los
 * candidatos de la base y lo que dice cada renglón. Puro (lo prueba `semana.test.ts`); lo usan la pantalla, sus acciones y la página de la bio.
 *
 *   Lunes      Artista (ficha completa)                   7:00 pm
 *   Martes     Evento del día                             9:00 am
 *   Miércoles  Lugar (ficha completa)                     7:00 pm
 *   Jueves     «Esta semana»: carrusel con los 3 del fin  9:00 am
 *   Viernes    Artista con fecha el fin                   7:00 pm
 *   Sábado     Evento del día                             9:00 am
 *   Domingo    Descanso (o un lugar, si se pide)
 *
 * Seis publicaciones, ninguna encima de otra, en la hora de la ciudad. Entra quien tiene la ficha completa (la base lo filtra:
 * `instagram_candidatos`); primero quien tiene fecha en los próximos 30 días, luego los de la ciudad, luego quien lleva más tiempo sin salir; nadie
 * que haya salido en los últimos 6 meses ni que haya dicho que no.
 */

export type TipoDia = "artista" | "evento" | "lugar" | "semana" | "descanso";

export type ReglaDia = { tipo: TipoDia; hora: string | null; nombre: string; fin?: boolean };

/** La regla, por día de la semana ISO (1 = lunes … 7 = domingo). */
export const REGLA: Record<number, ReglaDia> = {
  1: { tipo: "artista", hora: "19:00", nombre: "Artista" },
  2: { tipo: "evento", hora: "09:00", nombre: "Evento del día" },
  3: { tipo: "lugar", hora: "19:00", nombre: "Lugar" },
  4: { tipo: "semana", hora: "09:00", nombre: "Esta semana" },
  5: { tipo: "artista", hora: "19:00", nombre: "Artista con fecha el fin", fin: true },
  6: { tipo: "evento", hora: "09:00", nombre: "Evento del día" },
  7: { tipo: "descanso", hora: null, nombre: "Descanso" },
};

/** «Esta semana» lleva los 3 eventos del fin con más señal. */
export const EVENTOS_SEMANA = 3;

const sumar = (dia: string, n: number): string => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};
/** 1 = lunes … 7 = domingo, de un día AAAA-MM-DD. */
export const diaIso = (dia: string): number => {
  const [a, m, d] = dia.split("-").map(Number);
  return ((new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7) + 1;
};
/** El lunes de la semana de un día. */
export const lunesDe = (dia: string): string => sumar(dia, 1 - diaIso(dia));
/** Los siete días de la semana que empieza en `lunes`. */
export const diasDe = (lunes: string): string[] => Array.from({ length: 7 }, (_, i) => sumar(lunes, i));
/** El lunes de «esta» semana o de «la que viene», en la zona de la ciudad. */
export function lunesDeLaSemana(cual: "esta" | "viene", ahora: Date, zona: string): string {
  const hoy = diaLocal(ahora, zona);
  return sumar(lunesDe(hoy), cual === "viene" ? 7 : 0);
}
/** El momento en que sale un día (su fecha y la hora de la regla, en la zona de la ciudad). */
export const salePara = (fecha: string, hora: string, zona: string): string => localAIso(`${fecha}T${hora.slice(0, 5)}`, zona) ?? `${fecha}T${hora}`;

/** Un artista o un lugar que puede salir (una fila de `instagram_candidatos`). */
export type Candidato = {
  id: string;
  slug: string;
  nombre: string;
  ciudad: string;
  ciudad_slug: string | null;
  clase: string;
  detalle: string | null;
  foto: string | null;
  portada: string | null;
  descripcion: string | null;
  redes: unknown;
  direccion: string | null;
  proxima_id: string | null;
  proxima_titulo: string | null;
  proxima_inicio: string | null;
  proxima_zona: string | null;
  proxima_lugar: string | null;
  proxima_lugar_redes: unknown;
  eventos_semana: number;
  ultima_vez: string | null;
  ocupado_en: string | null;
};

/** Un evento que puede salir (una fila de `instagram_sugerencias`, lo que la base deja publicar). */
export type EventoCandidato = { id: string; titulo: string; inicio: string; zona: string; clase: string; imagen: string | null; lugar_nombre: string | null; sitio_texto: string | null; lugar_redes: unknown; van: number; interesa: number; destacado: boolean; publicado_en: string | null };

/** Un día armado, como lo guarda `instagram_semana_guardar`. */
export type CasillaNueva = { fecha: string; tipo: TipoDia; hora: string | null; artista_id?: string; lugar_id?: string; evento_id?: string; eventos?: string[]; motivo: string | null };

const senal = (e: EventoCandidato): Senal => ({ destacado: e.destacado, van: e.van, interesa: e.interesa, conCartel: !!e.imagen, inicio: e.inicio });

/** «hace 8 meses», «nunca»: cuándo salió por última vez en Instagram. */
export function ultimaVezTexto(iso: string | null, ahora: Date): string {
  if (!iso) return "nunca en Instagram";
  const meses = Math.max(1, Math.round((ahora.getTime() - new Date(iso).getTime()) / (30.4 * 86_400_000)));
  return `en Instagram hace ${meses === 1 ? "1 mes" : `${meses} meses`}`;
}

/** Por qué lo eligió el sistema, en una línea: «Artista con fecha ese mismo viernes en el Teatro de la Paz, de San Luis Potosí, nunca en Instagram.» */
export function motivoDe(c: Candidato, tipo: "artista" | "lugar", fecha: string, ahora: Date): string {
  const ciudad = `de ${c.ciudad}`;
  const ultima = ultimaVezTexto(c.ultima_vez, ahora);
  if (tipo === "lugar") {
    const n = c.eventos_semana;
    return `Lugar ${n ? `con ${n === 1 ? "1 evento" : `${n} eventos`} esta semana` : "sin eventos esta semana"}, ${ciudad}, ${ultima}.`;
  }
  if (c.proxima_inicio && c.proxima_zona) {
    const dia = diaLocal(new Date(c.proxima_inicio), c.proxima_zona);
    const cuando = dia === fecha ? "ese mismo día" : `el ${diaConMes(c.proxima_inicio, ahora, c.proxima_zona)}`;
    return `Artista con fecha ${cuando}${c.proxima_lugar ? ` en ${c.proxima_lugar}` : ""}, ${ciudad}, ${ultima}.`;
  }
  return `Artista sin fecha próxima, ${ciudad}, ${ultima}.`;
}

/** La línea de un candidato en «Cambiar»: «Con fecha el vie 16 · nunca en Instagram» o «Sin fecha próxima · en Instagram hace 8 meses». */
export function lineaCandidato(c: Candidato, ahora: Date): string {
  const fecha = c.proxima_inicio && c.proxima_zona ? `Con fecha el ${diaConMes(c.proxima_inicio, ahora, c.proxima_zona)}` : c.eventos_semana ? `${c.eventos_semana === 1 ? "1 evento" : `${c.eventos_semana} eventos`} esta semana` : "Sin fecha próxima";
  return `${fecha} · ${ultimaVezTexto(c.ultima_vez, ahora)}`;
}

/** ¿Su próxima fecha cae del viernes al domingo de esa semana? (el artista del viernes). */
const conFechaElFin = (c: Candidato, lunes: string) => !!c.proxima_inicio && !!c.proxima_zona && (() => {
  const dia = diaLocal(new Date(c.proxima_inicio!), c.proxima_zona!);
  return dia >= sumar(lunes, 4) && dia <= sumar(lunes, 6);
})();

/** El evento del día: el de ese día con más señal (destacado, «Voy», «Me interesa», con cartel), que no esté ya en Instagram ni en la semana. */
function eventoDelDia(eventos: readonly EventoCandidato[], fecha: string, usados: Set<string>): EventoCandidato | null {
  return eventos.filter((e) => !usados.has(e.id) && !e.publicado_en && e.clase !== "festival" && diaLocal(new Date(e.inicio), e.zona) === fecha).sort((a, b) => porSenal(senal(a), senal(b)))[0] ?? null;
}

/** «El evento de ese día con más señal: destacado, 4 les interesa.» (sin lo que vale cero). */
export function motivoDeEvento(e: Pick<EventoCandidato, "destacado" | "van" | "interesa">): string {
  const partes = [e.destacado ? "destacado" : null, e.van ? `${e.van} van` : null, e.interesa ? `${e.interesa} les interesa` : null].filter(Boolean);
  return partes.length ? `El evento de ese día con más señal: ${partes.join(", ")}.` : "El evento de ese día con más señal.";
}

/**
 * Arma los días que faltan de una semana (los que ya están en la base no se tocan: `existentes`). Un día cuya hora ya pasó no se arma (no saldría:
 * el renglón dice que no se programó). Sin nadie para un día de artista o de lugar, o sin eventos para el del evento o «Esta semana», ese día
 * descansa y lo dice.
 */
export function armarSemana(o: {
  lunes: string;
  zona: string;
  ahora: Date;
  artistas: readonly Candidato[];
  lugares: readonly Candidato[];
  eventos: readonly EventoCandidato[];
  /** Los días que ya tienen su fila (AAAA-MM-DD) y las fichas y eventos que ya van en la semana. */
  existentes: ReadonlySet<string>;
  usados?: ReadonlySet<string>;
}): CasillaNueva[] {
  const usados = new Set(o.usados ?? []);
  const libre = (c: Candidato) => !c.ocupado_en && !usados.has(c.id);
  const dias = diasDe(o.lunes);
  const porHacer = (fecha: string, hora: string | null) => !o.existentes.has(fecha) && (!hora || new Date(salePara(fecha, hora, o.zona)) > o.ahora);
  const casillas: CasillaNueva[] = [];
  const poner = (c: CasillaNueva) => casillas.push(c);
  const descanso = (fecha: string, motivo: string | null): CasillaNueva => ({ fecha, tipo: "descanso", hora: null, motivo });
  // Primero el viernes (pide fecha el fin), luego el lunes con los que quedan; los eventos del día antes que «Esta semana», que lleva otros.
  const orden = [5, 1, 3, 2, 6, 4, 7];
  for (const n of orden) {
    const fecha = dias[n - 1];
    const r = REGLA[n];
    if (!porHacer(fecha, r.hora)) continue;
    if (r.tipo === "descanso") {
      poner(descanso(fecha, null));
    } else if (r.tipo === "artista") {
      const libres = o.artistas.filter(libre);
      const elegido = (r.fin ? libres.find((c) => conFechaElFin(c, o.lunes)) : undefined) ?? libres[0];
      if (!elegido) poner(descanso(fecha, "No hay artistas con la ficha completa por salir."));
      else {
        usados.add(elegido.id);
        poner({ fecha, tipo: "artista", hora: r.hora, artista_id: elegido.id, motivo: motivoDe(elegido, "artista", fecha, o.ahora) });
      }
    } else if (r.tipo === "lugar") {
      const elegido = [...o.lugares.filter(libre)].sort((a, b) => Number(b.eventos_semana > 0) - Number(a.eventos_semana > 0))[0];
      if (!elegido) poner(descanso(fecha, "No hay lugares con la ficha completa por salir."));
      else {
        usados.add(elegido.id);
        poner({ fecha, tipo: "lugar", hora: r.hora, lugar_id: elegido.id, motivo: motivoDe(elegido, "lugar", fecha, o.ahora) });
      }
    } else if (r.tipo === "semana") {
      const fin = [sumar(o.lunes, 4), sumar(o.lunes, 5), sumar(o.lunes, 6)];
      const delFin = o.eventos
        .filter((e) => e.clase !== "festival" && !usados.has(e.id) && fin.includes(diaLocal(new Date(e.inicio), e.zona)))
        .sort((a, b) => porSenal(senal(a), senal(b)))
        .slice(0, EVENTOS_SEMANA)
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
      if (!delFin.length) poner(descanso(fecha, "No hay eventos el fin de semana."));
      else poner({ fecha, tipo: "semana", hora: r.hora, eventos: delFin.map((e) => e.id), motivo: `Carrusel de ${delFin.length + 1} imágenes: la portada y ${delFin.length === 1 ? "el cartel del evento" : `los carteles de los ${delFin.length} eventos`} con más señal del fin.` });
    } else {
      const e = eventoDelDia(o.eventos, fecha, usados);
      if (!e) poner(descanso(fecha, "No hay eventos ese día."));
      else {
        usados.add(e.id);
        poner({ fecha, tipo: "evento", hora: r.hora, evento_id: e.id, motivo: motivoDeEvento(e) });
      }
    }
  }
  return casillas.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Cómo va un día, para el renglón y la hoja. */
export type EstadoDia = "publicado" | "programado" | "hoy" | "publicando" | "quitado" | "descanso" | "fallido" | "sin";

/** El estado del día: lo guardado y su trabajo en la cola (en camino si ya le toca o se está publicando). */
export function estadoDelDia(d: { estado: string; tipo: string; fecha: string; programado_para: string | null; trabajo: { estado: string; siguiente_en: string } | null }, ahora: Date, zona: string): EstadoDia {
  if (d.tipo === "descanso" || d.estado === "descanso") return "descanso";
  if (d.estado === "publicado" || d.trabajo?.estado === "publicado") return "publicado";
  if (d.estado === "quitado") return "quitado";
  if (d.estado === "fallido" || d.trabajo?.estado === "fallido") return "fallido";
  if (d.trabajo?.estado === "publicando" || (d.trabajo?.estado === "en_cola" && new Date(d.trabajo.siguiente_en).getTime() <= ahora.getTime() + 60_000)) return "publicando";
  if (!d.trabajo) return "sin";
  return d.fecha === diaLocal(ahora, zona) ? "hoy" : "programado";
}

/** «Lun 5», «Hoy», «Mañana» (el día del renglón). */
export function nombreDelDia(fecha: string, ahora: Date, zona: string): string {
  const hoy = diaLocal(ahora, zona);
  if (fecha === hoy) return "Hoy";
  if (fecha === sumar(hoy, 1)) return "Mañana";
  const iso = localAIso(`${fecha}T12:00`, zona) ?? `${fecha}T18:00:00Z`;
  const d = diaConMes(iso, ahora, zona).replace(/ de .*$/, "");
  return d[0].toLocaleUpperCase("es-MX") + d.slice(1);
}

/** «Lun 5 · 7:00 pm · Artista»: la primera línea del renglón (sin hora en un descanso). */
export function cuandoDelDia(d: { fecha: string; hora: string | null; tipo: TipoDia }, ahora: Date, zona: string, carrusel = 0): string {
  const n = diaIso(d.fecha);
  const nombre = d.tipo === "descanso" ? "Descanso" : d.tipo === "semana" ? `Esta semana${carrusel ? ` · carrusel de ${carrusel}` : ""}` : d.tipo === REGLA[n].tipo ? REGLA[n].nombre : d.tipo === "lugar" ? "Lugar" : d.tipo === "artista" ? "Artista" : "Evento del día";
  return [nombreDelDia(d.fecha, ahora, zona), d.hora ? horaDeReloj(d.hora) : null, nombre].filter(Boolean).join(" · ");
}

/** Lo que dice el estado en el renglón. */
export function lineaDelEstado(e: EstadoDia, hora: string | null, motivoSinNada: string | null): string {
  switch (e) {
    case "publicado":
      return "Publicado";
    case "hoy":
      return `Sale hoy a las ${hora ? horaDeReloj(hora) : ""}`.trim();
    case "programado":
      return "Programado";
    case "publicando":
      return "Publicando…";
    case "quitado":
      return "Quitado: este día no se publica";
    case "fallido":
      return "No se publicó";
    case "sin":
      return "No se programó";
    default:
      return motivoSinNada ?? "La cuenta descansa";
  }
}

/** El aviso previo en el renglón: «Falta avisarle» (violeta) o «Avisado el lun 5 · sin respuesta». Solo a fichas con Instagram que no han salido. */
export function lineaDelAviso(d: { tipo: TipoDia; cuenta: string | null; aviso_en: string | null; reemplaza: string | null }, e: EstadoDia, ahora: Date, zona: string): { texto: string; falta: boolean } | null {
  if ((d.tipo !== "artista" && d.tipo !== "lugar") || !d.cuenta || !["programado", "hoy"].includes(e)) return null;
  const en = d.reemplaza ? ` · en lugar de ${d.reemplaza.replace(/\s*\(demo\)\s*$/i, "")}` : "";
  if (!d.aviso_en) return { texto: `Falta avisarle${en}`, falta: true };
  const dia = diaLocal(new Date(d.aviso_en), zona) === diaLocal(ahora, zona) ? "hoy" : `el ${diaConMes(d.aviso_en, ahora, zona).replace(/ de .*$/, "")}`;
  return { texto: `Avisado ${dia} · sin respuesta${en}`, falta: false };
}

/** El resumen de arriba: «2 publicadas · 4 programadas · el domingo descansa» o «6 programadas · 2 por avisar · el domingo descansa». */
export function resumenSemana(estados: readonly { estado: EstadoDia; fecha: string; falta: boolean }[]): string {
  const n = (e: EstadoDia[]) => estados.filter((x) => e.includes(x.estado)).length;
  const pub = n(["publicado"]);
  const prog = n(["programado", "hoy", "publicando"]);
  const avisar = estados.filter((x) => x.falta).length;
  const domingo = estados.find((x) => diaIso(x.fecha) === 7)?.estado === "descanso";
  return [
    pub ? `${pub} ${pub === 1 ? "publicada" : "publicadas"}` : null,
    prog ? `${prog} ${prog === 1 ? "programada" : "programadas"}` : null,
    avisar ? `${avisar} por avisar` : null,
    domingo ? "el domingo descansa" : null,
  ].filter(Boolean).join(" · ") || "Nada programado";
}

/** «Del 5 al 11 de octubre» (o «Del 28 de septiembre al 4 de octubre»). */
export function rangoDeLaSemana(lunes: string): string {
  const domingo = sumar(lunes, 6);
  const fmt = (dia: string, mes: boolean) =>
    new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", ...(mes ? { month: "long" } : {}) }).format(new Date(`${dia}T12:00:00Z`));
  const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
  return mismoMes ? `Del ${fmt(lunes, false)} al ${fmt(domingo, true)}` : `Del ${fmt(lunes, true)} al ${fmt(domingo, true)}`;
}

/** La página de la bio: el enlace a una ficha con su marca de origen (de Instagram, desde la bio, de esa semana y de esa ficha). */
export function enlaceDeLaBio(ruta: string, lunes: string, slug: string): string {
  const q = new URLSearchParams({ utm_source: "instagram", utm_medium: "bio", utm_campaign: `semana-${lunes}`, utm_content: slug });
  return `${ruta}?${q}`;
}
