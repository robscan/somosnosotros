import type { EventoAgenda } from "./agenda";
import { soloInteres, textoVisita, ultimoDiaDelPeriodo } from "./claseEvento";
import { cuandoDeTarjeta, tarjetaConClase, type Tarjeta, type TarjetaConFecha } from "./destacados";
import type { Asistencia } from "./deslizar";
import { cortoDeClase } from "./eventos";
import { diaLocal } from "./fechas";

/**
 * La tarjeta de evento de Inicio (OL-370), la que firmó el founder el 2026-10-10 en el prototipo `docs/rediseno/prototipos/inicio-tarjetas.html`
 * («Firmada»: E1 · E3 · E3b · E5 · E7 · E8 · E8c · E9 · E10; bitácora 398). Aquí lo que se puede probar sin navegador: el sello de fecha que
 * ocupa el sitio del botón de «Voy», la línea de cuándo, la ceja con la clase, el único chip sobre el cartel, el nombre del enlace y el corte del
 * título en palabra entera. La tarjeta la pinta `components/inicio/TarjetaEvento`.
 */

/**
 * El sello de fecha (E8 + E8c; referencia del founder: «Conciertos» de Apple Music): arriba el mes, abajo el día. `flecha`: «antes» es «→ 28»
 * (hasta cuándo), «despues» es «12 →» (desde cuándo). `texto` lo dice entero, para quien pasa el puntero por encima.
 */
export type SelloFecha = { mes: string; dia: string; flecha: "antes" | "despues" | null; texto: string };

const formato = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", ...opciones });
const MES = formato({ month: "short" });
const MES_LARGO = formato({ month: "long" });
const deDia = (dia: string) => new Date(`${dia}T12:00:00Z`);
/** «oct»: el mes en tres letras de un día de calendario (YYYY-MM-DD), como lo escribe el resto de la app («Del 29 de sep al 24 de oct»). */
const mes = (dia: string) => MES.format(deDia(dia)).replace(/[.,]/g, "");
const mesLargo = (dia: string) => MES_LARGO.format(deDia(dia));
const numero = (dia: string) => String(Number(dia.slice(8, 10)));

/**
 * El sello de una tarjeta, en la zona del evento. Un día: «oct» / «11». `rango` (una exposición o un festival: lo que no pasa un día concreto,
 * `soloInteres`) va de su primer día al último (`ultimoDiaDelPeriodo`: un fin a la medianoche es el final del día anterior). Del mismo mes:
 * «oct» / «10–31». Entre meses: si ya empezó (hoy ya es uno de sus días), hasta cuándo, con el mes del cierre («oct» / «→ 28»), porque de lo
 * que ya está pasando importa cuándo se acaba; si no, desde cuándo («oct» / «12 →»).
 */
export function selloDeFecha(e: Pick<TarjetaConFecha, "inicio" | "fin" | "zona">, rango: boolean, ahora: Date = new Date()): SelloFecha {
  const desde = diaLocal(new Date(e.inicio), e.zona);
  const hasta = rango ? ultimoDiaDelPeriodo(e.inicio, e.fin, e.zona) : desde;
  if (desde === hasta) return { mes: mes(desde), dia: numero(desde), flecha: null, texto: `${numero(desde)} de ${mesLargo(desde)}` };
  if (desde.slice(0, 7) === hasta.slice(0, 7)) return { mes: mes(desde), dia: `${numero(desde)}–${numero(hasta)}`, flecha: null, texto: `del ${numero(desde)} al ${numero(hasta)} de ${mesLargo(hasta)}` };
  if (diaLocal(ahora, e.zona) < desde) return { mes: mes(desde), dia: numero(desde), flecha: "despues", texto: `desde el ${numero(desde)} de ${mesLargo(desde)}` };
  return { mes: mes(hasta), dia: numero(hasta), flecha: "antes", texto: `hasta el ${numero(hasta)} de ${mesLargo(hasta)}` };
}

const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

/**
 * La línea de cuándo bajo el lugar, en violeta. La de siempre (`cuandoDeTarjeta`), salvo dos cosas firmadas:
 * - un festival que ya empezó dice cuándo termina, con el formato de las exposiciones (`textoVisita`): «Hasta el sáb 24 de oct» en vez de «Del
 *   29 de sep al 24 de oct» (founder, 2026-10-10: «sería mejor decir que termina el…»). El que no ha empezado conserva su rango. «Ya empezó» es
 *   la misma regla del sello: hoy ya es uno de sus días;
 * - «Hoy» ya no es un chip sobre el cartel (E3): va al principio de esta línea («hoy · 13:00»; un festival que empieza hoy, «hoy · hasta el…»).
 */
export function cuandoEnInicio(e: Pick<EventoAgenda, "inicio" | "fin" | "zona" | "clase">, hoy: boolean, ahora: Date = new Date()): string {
  let cuando = cuandoDeTarjeta(e, ahora);
  if (e.clase === "festival") {
    const desde = diaLocal(new Date(e.inicio), e.zona);
    const hasta = ultimoDiaDelPeriodo(e.inicio, e.fin, e.zona);
    const dia = diaLocal(ahora, e.zona);
    if (hasta > desde && dia >= desde) cuando = textoVisita({ desde, hasta }, dia, ahora, e.zona);
  }
  return hoy && !/^hoy\b/.test(cuando) ? `hoy · ${minuscula(cuando)}` : cuando;
}

/** La tarjeta de un evento en los carriles de Inicio: la de siempre con su clase (`tarjetaConClase`), su línea de cuándo y su sello de fecha. */
export function tarjetaDeInicio(e: EventoAgenda, ahora: Date = new Date(), festival?: string | null): TarjetaConFecha {
  const t = tarjetaConClase(e, ahora, festival);
  return { ...t, detalle: cuandoEnInicio(e, !!t.hoy, ahora), selloFecha: selloDeFecha(e, soloInteres(e.clase), ahora) };
}

const EVENTO = cortoDeClase("puntual");
const EXPOSICION = cortoDeClase("exposicion");
const FESTIVAL = cortoDeClase("festival");

/**
 * El sello de una tarjeta que no lo trae (la que «Tus planes» guardó en el teléfono antes de esta pieza, `lib/decisionesVisita`): se calcula aquí,
 * con su clase. Null si no trae sus fechas.
 */
export function selloFechaDe(t: Tarjeta & Partial<Pick<TarjetaConFecha, "inicio" | "fin" | "zona">>, ahora: Date = new Date()): SelloFecha | null {
  if (t.selloFecha) return t.selloFecha;
  if (!t.inicio || !t.zona) return null;
  return selloDeFecha({ inicio: t.inicio, fin: t.fin ?? null, zona: t.zona }, t.clase === EXPOSICION || t.clase === FESTIVAL, ahora);
}

/**
 * La ceja, chica y en mayúsculas arriba del título (E3 + E3b): la clase solo si no es un evento («Taller», «Expo», «Festival»; un acto de un
 * festival es un evento) y, a su lado, el día de un evento con varios («Sesión 1 de 4», «Día 2 de 3»; founder, 2026-10-10: «¿podemos colocar las
 * sesiones aquí?»). Vacía en un evento de un día.
 */
export function cejaDeTarjeta(t: Pick<Tarjeta, "clase" | "parte">): string[] {
  const partes: string[] = [];
  if (t.clase && t.clase !== EVENTO) partes.push(t.clase === EXPOSICION ? "Expo" : t.clase);
  if (t.parte) partes.push(t.parte);
  return partes;
}

/**
 * El único chip sobre el cartel, abajo a la izquierda, como en producción (founder, 2026-10-10: «regresar a chip te interesa» y «regresar a chip
 * cuántos van»): «Te interesa» si la persona lo marcó (`tuyo`: el violeta claro de lo que ya decidió); si no, cuántos van, si va alguien.
 * «Vas» no se dice (founder: «si son mis planes decir que vas es redundante»): lo que no lo dice, en «Tus planes», es a lo que vas.
 */
export function chipDeTarjeta(t: Pick<Tarjeta, "van">, decision: Asistencia): { texto: string; tuyo: boolean } | null {
  if (decision === "me_interesa") return { texto: "Te interesa", tuyo: true };
  if (t.van !== null && t.van > 0) return { texto: t.van === 1 ? "1 va" : `${t.van} van`, tuyo: false };
  return null;
}

/**
 * El nombre del enlace: el título completo (el de la tarjeta es corto y puede ir cortado), su clase y su día si no es un evento suelto, cuándo,
 * dónde, «Vas» (ya no hay botón que lo diga) y el chip.
 */
export function nombreDeTarjeta(t: Pick<Tarjeta, "titulo" | "clase" | "parte" | "detalle" | "sitio" | "van">, decision: Asistencia): string {
  const clase = [t.clase && t.clase !== EVENTO ? t.clase : null, t.parte].filter(Boolean).join(" · ");
  return [t.titulo, clase, t.detalle, t.sitio, decision === "voy" ? "Vas" : null, chipDeTarjeta(t, decision)?.texto].filter(Boolean).join(". ");
}

/**
 * El título debajo del cartel va en dos líneas como mucho y, si no cabe, se corta en la última palabra entera con «…», nunca a media palabra
 * (E1; `recortarTitulos` del prototipo). `cabe` dice si un texto cabe; aquí solo se decide qué texto probar: el entero y, si no cabe, quitando
 * palabras desde el final (sin la puntuación que quede colgando) hasta que quepa. Si ni la primera palabra con «…» cabe, se queda esa; una
 * sola palabra que no cabe se queda entera (como en el prototipo: la recorta su caja).
 */
export function cortarEnPalabra(completo: string, cabe: (texto: string) => boolean): string {
  if (cabe(completo)) return completo;
  const palabras = completo.split(" ");
  let texto = completo;
  while (palabras.length > 1) {
    palabras.pop();
    texto = `${palabras.join(" ").replace(/[\s,:;·–-]+$/, "")}…`;
    if (cabe(texto)) return texto;
  }
  return texto;
}
