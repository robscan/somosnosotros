import { agruparPorDia, compararEventos, type EventoAgenda, type Grupo } from "./agenda";
import { esExposicion, esMarco, porCercania, rangosDeVisita, sinHorario, textoAbre, textoHastaEl } from "./agendaPorClase";
import { cuandoDePeriodo, HORARIO_POR_CONFIRMAR, visitaDeEvento } from "./claseEvento";
import { notaDeClase, PROGRAMA_POR_CONFIRMAR } from "./destacados";
import { diaLocal, ZONA_INICIAL } from "./fechas";
import { ocurrenciasDeLista } from "./ocurrencias";

/**
 * Los próximos eventos de una ficha (lugar o artista) como los lista Agenda (OL-410; lo firmado en OL-409 el 14 de octubre: «F Bloque como Agenda ·
 * S La hora de cada función, en su día · E Grupo "Para visitar", sin Voy · U En curso "Hasta el …", por venir "Del … al …"»). Lógica pura, sin
 * DOM ni base: la ficha la usa en el servidor para contar (el número «Eventos · N próximos» y el de la sección) y `EventosPorDia` en el teléfono
 * para pintar, así lo que se cuenta es lo que se ve.
 *
 * - **E · «Para visitar»:** una exposición no pasa un día a una hora: va en su grupo, arriba de los días, sin «Voy», con lo que dice de hoy
 *   («Abre 17:00–22:00 · hasta el dom 8 de nov», `lineaParaVisitar`); la que está en curso primero, la que cierra antes primero (`porCercania`).
 * - **S · cada función en su día:** lo demás se reparte en sus días como en Agenda (`ocurrenciasDeLista`, OL-320): un taller con tres sesiones
 *   sale tres veces, cada una con su hora («18:00–20:00 · Sesión 2 de 3»); los días que ya pasaron no salen.
 * - **F · el festival en bloque:** los actos de un festival (con su marco cargado) no salen sueltos: van en el bloque de su festival
 *   (`BloqueFestival`), con todas sus funciones aquí debajo, cada una con su día y su hora. El bloque se coloca por su **siguiente función** aquí
 *   (no por el día en que empezó el festival); sin funciones por venir aquí, no sale (lo que ya pasó está en el Historial o la Trayectoria). El
 *   marco nunca es un renglón suelto: si es de esta ficha (su lugar, o el artista está en él) y todavía no tiene ningún acto publicado, sale
 *   solo su cabecera con «Programa por confirmar»; si tiene actos pero ninguno aquí, no sale.
 * - Lo que empezó antes de hoy y sigue (un evento largo sin reparto) va en «Hoy», nunca bajo un día que ya pasó.
 */

/** Una pieza de un día de la ficha: un renglón, o el bloque de un festival con sus funciones aquí (vacío: solo su cabecera). */
export type PiezaFicha = { tipo: "renglon"; evento: EventoAgenda } | { tipo: "festival"; marco: EventoAgenda; funciones: EventoAgenda[] };

export type EventosFicha = {
  /** Las exposiciones («Para visitar»), arriba de los días. */
  visitar: EventoAgenda[];
  /** Los días, cada uno con sus piezas en orden de agenda. */
  dias: Grupo<PiezaFicha>[];
  /** Cuántas cosas se listan: cada renglón, cada función de un bloque, la cabecera sola de un festival y cada exposición. El número de la
   *  ficha («Eventos · 14 próximos») y el de la sección («Próximos eventos · 14») son este. */
  cuenta: number;
};

type Colocada = { id: string; titulo: string; inicio: string; zona: string; pieza: PiezaFicha };

/**
 * Arma lo que lista la ficha. `eventos` son los de la ficha (los de su lugar o en los que está el artista, ya sin lo que pasó); `marcos`, los
 * festivales de sus actos que no están entre ellos (para armar su bloque). Un acto cuyo festival no está cargado es un renglón más.
 */
export function eventosDeFicha(eventos: readonly EventoAgenda[], marcos: readonly EventoAgenda[] = [], ahora: Date = new Date()): EventosFicha {
  const visitar = eventos.filter(esExposicion).toSorted((a, b) => porCercania(a, b, ahora));
  const propios = eventos.filter(esMarco);
  const festivales = new Map([...marcos, ...propios].filter(esMarco).map((m) => [m.id, m]));
  const funciones = new Map<string, EventoAgenda[]>();
  const colocadas: Colocada[] = [];
  for (const o of ocurrenciasDeLista(eventos.filter((e) => !esExposicion(e) && !esMarco(e)), ahora)) {
    if (o.evento_padre_id && festivales.has(o.evento_padre_id)) funciones.set(o.evento_padre_id, [...(funciones.get(o.evento_padre_id) ?? []), o]);
    else colocadas.push({ id: o.id, titulo: o.titulo, inicio: o.inicio, zona: o.zona, pieza: { tipo: "renglon", evento: o } });
  }
  for (const [id, lista] of funciones) {
    const marco = festivales.get(id) as EventoAgenda;
    const enOrden = lista.toSorted(compararEventos);
    colocadas.push({ id: marco.id, titulo: marco.titulo, inicio: enOrden[0].inicio, zona: enOrden[0].zona, pieza: { tipo: "festival", marco, funciones: enOrden } });
  }
  // El festival de esta ficha sin ningún acto publicado: solo su cabecera («Programa por confirmar»), por su primer día (o hoy, si ya empezó).
  for (const m of propios) if (!funciones.has(m.id) && !m.programa?.registrados) colocadas.push({ id: m.id, titulo: m.titulo, inicio: m.inicio, zona: m.zona, pieza: { tipo: "festival", marco: m, funciones: [] } });
  const hoy = diaLocal(ahora, colocadas[0]?.zona ?? ZONA_INICIAL);
  const dias = agruparPorDia(colocadas, ahora, hoy).map((g) => ({ clave: g.clave, titulo: g.titulo, eventos: g.eventos.map((c) => c.pieza) }));
  const cuenta = visitar.length + colocadas.reduce((n, c) => n + (c.pieza.tipo === "festival" ? Math.max(1, c.pieza.funciones.length) : 1), 0);
  return { visitar, dias, cuenta };
}

/** El primer evento de la ficha con día y hora (el día de su pin en el mapa): el primer renglón o la primera función; null si no hay. */
export function primeroDeFicha(f: EventosFicha): EventoAgenda | null {
  const p = f.dias[0]?.eventos[0];
  if (!p) return null;
  return p.tipo === "renglon" ? p.evento : (p.funciones[0] ?? p.marco);
}

/** De quién son las funciones del bloque: las de un lugar son «aquí»; las de un artista, «suyas». */
export type DeQuien = "lugar" | "artista";

/**
 * La línea de la cabecera del bloque de un festival en una ficha: su cuándo (OL-409, «U»: «Hasta el sáb 17 de oct» o «Del 12 al 17 de oct») y
 * cuántas funciones tiene aquí («7 funciones aquí»; en un artista, «2 funciones suyas»); sin ninguna, lo que dice su programa («Programa por
 * confirmar»).
 */
export function cabezaDeBloque(marco: EventoAgenda, funciones: number, de: DeQuien = "lugar", ahora: Date = new Date()): string {
  const cuantas = funciones ? `${funciones} ${funciones === 1 ? "función" : "funciones"} ${de === "artista" ? (funciones === 1 ? "suya" : "suyas") : "aquí"}` : (notaDeClase(marco) ?? PROGRAMA_POR_CONFIRMAR);
  return `${cuandoDePeriodo(marco, ahora)} · ${cuantas}`;
}

/**
 * Lo que dice una exposición en «Para visitar» de una ficha (OL-409, «E»): abierta, sus horas de hoy con el reloj y hasta cuándo («Abre
 * 17:00–22:00» · «hasta el dom 8 de nov»), «Hoy cierra» si su horario dice que hoy no abre, o «Horario por confirmar»; por abrir, sus días con
 * el calendario («Del 20 de oct al 8 de nov», la regla de todo periodo). Nunca «00:00».
 */
export function lineaParaVisitar(e: EventoAgenda, ahora: Date = new Date()): { cuando: string; horas: boolean; nota: string | null } {
  const hoy = diaLocal(ahora, e.zona);
  if (hoy < visitaDeEvento(e.inicio, e.fin, e.zona).desde) return { cuando: cuandoDePeriodo(e, ahora), horas: false, nota: null };
  const nota = textoHastaEl(e, ahora);
  if (sinHorario(e)) return { cuando: HORARIO_POR_CONFIRMAR, horas: true, nota };
  const rangos = rangosDeVisita(e, hoy);
  return { cuando: rangos.length ? textoAbre(rangos) : "Hoy cierra", horas: true, nota };
}
