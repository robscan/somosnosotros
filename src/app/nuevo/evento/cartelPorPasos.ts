import type { ResultadoCartel } from "@/app/eventos/acciones";
import { quienTrasLeerCartel } from "@/app/eventos/gestosFlyer";
import { cuantasSedes, descripcionDeNoche, formaDeActos, type FormaDeActos } from "@/lib/actosLeidos";
import type { QuienItem } from "@/lib/artistas";
import { claseSugerida, LIMITES_EVENTO, type Clase } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
import { normalizarNombre } from "@/lib/lugares";
import { esApertura } from "@/lib/sugerencias";
import { horarioComun } from "@/lib/sesionesEvento";
import { OTRO_VACIO, estadoInicial, faltan, finConHora, type Acto, type Candidato, type Paso, type Respuestas, type Sitio } from "./pasos";

/**
 * El camino con cartel del alta por pasos (OL-302; prototipo firmado `publicar-por-pasos.html`, bitácora 323), sin DOM: lo que lee
 * `leerCartelAccion` se vuelve respuestas, y las respuestas ya llenas hacen que sus pasos se salten (`faltan` de `pasos.ts` pregunta
 * solo lo que no hay). Un dato que el lector no trajo de verdad no cuenta como leído: se pregunta, no se publica a ciegas.
 */
export type Leido = Extract<ResultadoCartel, { ok: true }>;

/**
 * Las respuestas que trae lo leído, y solo esas (lo que el cartel no dice no se toca, así que sigue faltando):
 *
 * - **Nombre**: el título.
 * - **Cómo ocurre** (`formaLeida`, OL-321 y OL-413): la clase que dijo el cartel, con la regla fija de los actos (`lib/actosLeidos`: una noche en un
 *   lugar no es un programa). Si el cartel no la resolvió, «¿Qué es?» (`claseDudosa`).
 * - **Día y hora**: la fecha da el día; la hora, solo si el cartel la trae (`horaLeida`: `valores.inicio` pone las 19:00 cuando hay
 *   fecha sin hora, y eso no es un dato). Una fecha sin hora deja la hora por preguntar. Con hora, el fin es el de «Termina» del cartel
 *   (con la regla de `finConHora`: una hora menor que la de inicio es la madrugada del día siguiente) o «sin hora de fin»: casi
 *   ningún cartel la trae y preguntarla en cada cartel sería preguntar de más; se cambia desde «Revisa». De una noche juntada, el día de la
 *   noche y la hora del cartel o, sin ella, la del primer acto.
 * - **Dónde**: un lugar del directorio que el lector cruzó por nombre (`lugarId`); si no, el nombre y la dirección que dice el cartel
 *   como «otro sitio», **por confirmar** (`pinPendiente`, aunque no haya dirección): el lector no da un punto del mapa, y ese sitio se
 *   pregunta igual, con lo leído de partida (y, si la dirección es la de un lugar del directorio, «¿Es en …?» primero: `sugeridoDelCartel`).
 * - **Cuánto**: «Gratis» o el precio, solo si el cartel dice una de las dos (`costoLeido`: sin precio, `valores.gratis` es el relleno).
 * - **Quién**: los artistas del cartel, y nadie si no nombra a ninguno; nada se ha tocado a mano en este paso, así que el cartel manda
 *   también sobre el artista propio que `Quién` trae de arranque (`quienTrasLeerCartel`, founder 2026-09-21). De una noche juntada, también los
 *   nombres de sus actos que no estaban, si el cartel no nombró a nadie aparte.
 * - Descripción y enlace, si vienen (de una noche juntada sin descripción, sus actividades: «Concierto, cortometraje y charla.»).
 */
export function respuestasDelCartel(leido: Leido, quienActual: QuienItem[] = []): Partial<Respuestas> {
  const { valores: v } = leido;
  const r: Partial<Respuestas> = { quien: quienTrasLeerCartel(leido.quien, quienActual, true) };
  if (v.titulo) r.nombre = v.titulo;
  const [fecha, hora] = v.inicio.split("T");
  const actos = formaDeActos(v.forma?.actos ?? [], v.lugar);
  const forma = formaLeida(leido, actos);
  if (forma) Object.assign(r, forma);
  const comoEvento = !forma?.clase || forma.clase === "puntual" || (forma.clase === "festival" && !forma.actos?.length);
  if (comoEvento && actos?.tipo === "temporada") Object.assign(r, temporada(actos));
  else if (comoEvento && (fecha || actos?.tipo === "junta")) {
    const noche = actos?.tipo === "junta" ? actos : null;
    const dia = fecha || noche?.dia || "";
    const horaDe = leido.horaLeida ? hora : (noche?.hora ?? "");
    r.dias = { desde: dia, hasta: null };
    if (horaDe) {
      r.hora = horaDe;
      r.fin = v.fin && leido.horaLeida ? finConHora({ ...estadoInicial().r, dias: r.dias, hora: horaDe }, v.fin.split("T")[1]) : "";
    }
  }
  if (comoEvento && actos?.tipo === "junta") juntarNoche(r, actos, leido);
  if (leido.costoLeido) {
    if (v.gratis) r.costo = "gratis";
    else if (v.precio) {
      r.costo = "precio";
      r.precio = v.precio.slice(0, LIMITES_EVENTO.precio);
    }
  }
  if (v.descripcion) r.descripcion = v.descripcion;
  if (v.enlace) r.enlace = v.enlace;
  const sitio = sitioLeido(leido) ?? (r.actos?.length ? sedeComunDelPrograma(leido) : undefined);
  if (sitio) r.sitio = sitio;
  return r;
}

/**
 * La sede del festival cuando el cartel no dice una general pero todos sus actos comparten la misma (OL-413): la del directorio, si alguno la
 * cruzó, o la primera escrita, por confirmar. Así el «Dónde» del festival, que se pregunta una vez, abre con ella.
 */
function sedeComunDelPrograma(leido: Leido): Sitio | undefined {
  const actos = leido.valores.forma?.actos ?? [];
  if (cuantasSedes(actos) !== 1) return undefined;
  const delDirectorio = actos.find((a) => a.lugarId)?.lugarId;
  if (delDirectorio) return { modo: "lugar", lugarId: delDirectorio, otro: OTRO_VACIO };
  const escrita = actos.find((a) => a.lugar)?.lugar;
  return escrita ? { modo: "otro", lugarId: "", otro: { ...OTRO_VACIO, sitioTexto: escrita.slice(0, LIMITES_EVENTO.sitio), pinPendiente: true } } : undefined;
}

/** El sitio que dice el cartel: un lugar del directorio que el lector cruzó por nombre o, si no, por confirmar con lo leído. */
function sitioLeido(leido: Leido): Sitio | undefined {
  const { valores: v } = leido;
  if (leido.lugarId) return { modo: "lugar", lugarId: leido.lugarId, otro: OTRO_VACIO };
  if (v.lugar || v.direccion) return { modo: "otro", lugarId: "", otro: { ...OTRO_VACIO, sitioTexto: v.lugar.slice(0, LIMITES_EVENTO.sitio), direccion: v.direccion.slice(0, LIMITES_EVENTO.direccion), pinPendiente: true } };
  return undefined;
}

/**
 * El lugar del directorio que el cartel dice por su dirección (OL-413), listo para «¿Es en …?»: el lector no lo cruzó por nombre, pero su
 * dirección es la de uno solo (`leerCartelAccion`). null si el nombre ya cruzó o si no hay ninguno.
 */
export function sugeridoDelCartel(leido: Leido, lugares: readonly LugarResumen[] = []): Candidato | null {
  if (leido.lugarId || !leido.sugerido) return null;
  const l = lugares.find((x) => x.id === leido.sugerido?.id) ?? leido.sugerido;
  return { nombre: l.nombre, direccion: l.direccion ?? "", punto: { lat: l.lat, lng: l.lng }, ciudad: null, categorias: [], origen: "busqueda", lugarId: l.id };
}

/** Una obra en temporada (el mismo título varios días seguidos): un evento de varios días, con la hora de cada uno si cambia (OL-311). */
function temporada(actos: Extract<FormaDeActos, { tipo: "temporada" }>): Partial<Respuestas> {
  const dias = { desde: actos.dias[0].dia, hasta: actos.dias[actos.dias.length - 1].dia };
  const horas = new Set(actos.dias.map((d) => d.hora));
  const primera = actos.dias[0].hora;
  // Sin la hora de algún día, se pregunta «¿A qué hora, cada día?» como siempre.
  if (!primera || horas.has("")) return { dias };
  const fin = finConHora({ ...estadoInicial().r, dias, hora: primera }, "");
  if (horas.size === 1) return { dias, hora: primera, fin };
  return { dias, hora: primera, fin, sesiones: horarioComun(dias, primera, "").map((h) => ({ ...h, hora: actos.dias.find((d) => d.dia === h.dia)?.hora || primera })) };
}

/**
 * Una noche con varios actos juntada en un evento (OL-413): los nombres de sus actos van a «Quién» si el cartel no nombró a nadie aparte (el
 * servidor ya los pasó a los artistas del cartel para cruzarlos con el directorio: `nombresParaQuien`; aquí queda el respaldo). Si los nombró, el
 * lector ya distinguió quién se presenta, y lo demás es parte de la noche: va a la descripción. Sus actividades («Concierto», «Charla»), a la
 * descripción si el cartel no traía una.
 */
function juntarNoche(r: Partial<Respuestas>, noche: Extract<FormaDeActos, { tipo: "junta" }>, leido: Leido) {
  const ya = new Set((r.quien ?? []).map((q) => normalizarNombre(q.nombre)));
  const nuevos = noche.nombres.filter((n) => !ya.has(normalizarNombre(n)));
  const aQuien = leido.valores.artistas.length === 0;
  if (aQuien && nuevos.length) r.quien = [...(r.quien ?? []), ...nuevos.map((nombre) => ({ nombre: nombre.slice(0, 80) }))].slice(0, 8);
  if (!leido.valores.descripcion) {
    const texto = descripcionDeNoche(noche.actividades, aQuien ? [] : nuevos).slice(0, LIMITES_EVENTO.descripcion);
    if (texto) r.descripcion = texto;
  }
}

/** ¿El cartel se presenta como festival? Lo dice el título, la descripción o el festival que nombra («festival cumbiero potosino»). */
function seAnunciaComoFestival(leido: Leido): boolean {
  const { valores: v } = leido;
  return [v.titulo, v.descripcion, v.festival ?? ""].some((t) => !!t && claseSugerida(t) === "festival");
}

/**
 * ¿Lo leído deja la clase sin resolver? (OL-413; founder, 18 de octubre: «si hay dudas el sistema podría preguntar al usuario si es festival,
 * galería, o evento, solo cuando el sistema no lo pueda resolver o no sea claro»). Sí, si el cartel no dijo la clase y el título no propone ninguna;
 * si dice festival sin programa y nada lo anuncia como festival (ni el título, ni la descripción, ni un festival nombrado); o si dice exposición sin
 * periodo de visita (la inauguración de una exposición sí es clara: es un evento). En los demás casos no se pregunta nada.
 */
export function claseSinResolver(leido: Leido, actos: FormaDeActos | null): boolean {
  const forma = leido.valores.forma;
  if (!forma) return false;
  // Sin clase, un programa de días o sedes distintas sí es un festival (un nombre que reúne varias presentaciones): no se pregunta.
  if (!forma.clase) return actos?.tipo !== "programa" && !claseSugerida(leido.valores.titulo);
  if (forma.clase === "festival") return actos?.tipo !== "programa" && !seAnunciaComoFestival(leido);
  if (forma.clase === "exposicion") return !forma.visita && !esApertura(leido.valores.titulo);
  return false;
}

/**
 * La forma de ocurrir que trae el cartel (OL-321; doc 55 §2), como respuestas: la clase la propone el cartel (y entonces el título ya no la
 * cambia); null si el cartel no dice nada distinto de un evento, y entonces lo leído es un día y una hora, como siempre.
 *
 * - **Exposición**: su visita (del primer día al de cierre) y, si el cartel trae además una fecha con hora, es su inauguración (H1: «Inauguración
 *   jue 5 · 19:00 · visita del 6 al 30»): los dos renglones llegan llenos.
 * - **Taller**: los días de sus sesiones (sin ellos, el de la fecha) y su hora si la trae; sin hora de fin, «Sin hora de fin».
 * - **Festival** (OL-413, definición aprobada: el programa es opcional): solo con días distintos o sedes distintas (`formaDeActos`) lleva programa,
 *   cada acto marcado con su día y su hora; si todos comparten la sede leída (o no la dicen), esa sede es la del festival y la heredan (una sola
 *   confirmación); con sedes distintas, cada acto la suya (la del directorio que se llama igual o, sin ella, por confirmar). Una noche en un lugar
 *   es un festival sin programa: su día, su hora, su lugar y la alineación en «Quién».
 * - Dos o más actos ya no hacen un festival por sí solos: la clase es la que dijo el cartel. Un programa de días o sedes distintas sin que el
 *   cartel diga la clase sí es un festival (es lo que define uno: un nombre que reúne varias presentaciones).
 */
function formaLeida(leido: Leido, actos: FormaDeActos | null): Partial<Respuestas> | null {
  const { valores: v } = leido;
  const forma = v.forma;
  if (!forma) return null;
  const dudosa = claseSinResolver(leido, actos);
  const [fecha, hora] = v.inicio.split("T");
  const horaLeida = leido.horaLeida ? hora : "";
  const clase: Clase | null = actos?.tipo === "programa" && (!forma.clase || forma.clase === "puntual" || forma.clase === "festival") ? "festival" : forma.clase;
  // Sin resolver: se pregunta «¿Qué es?» y lo leído queda como un día y una hora (elegir exposición o taller los vuelve visita o sesiones).
  if (dudosa) return { claseDudosa: true };
  if (clase === "exposicion") {
    // El cartel de una inauguración («Inauguración de Ecos de papel»): se publica la apertura, un evento de un día a una hora, y la exposición
    // con su periodo se sugiere en «Publicado» (OL-323, H1; prototipo aceptado `eventos-superficies.html`, caso h1).
    if (esApertura(v.titulo)) return { claseFijada: true };
    const visita = forma.visita ?? (fecha ? { desde: fecha, hasta: null } : null);
    const inauguracion = forma.visita && fecha && horaLeida && fecha <= forma.visita.desde ? { dia: fecha, hora: horaLeida } : null;
    return { clase, claseFijada: true, visita, inauguracion };
  }
  if (clase === "taller") {
    const dias = forma.sesiones.length ? forma.sesiones : fecha ? [fecha] : [];
    const finTaller = horaLeida && v.fin ? v.fin.split("T")[1] : "";
    return { clase, claseFijada: true, sesionesDias: dias, ...(horaLeida ? { hora: horaLeida, fin: finTaller > horaLeida ? finTaller : "" } : {}) };
  }
  if (clase === "festival" && actos?.tipo === "programa") return { clase, claseFijada: true, actos: actosDelPrograma(leido, actos.sedes) };
  if (clase === "festival") return { clase, claseFijada: true };
  return clase === "puntual" ? { claseFijada: true } : null;
}

/**
 * Los actos de un programa leído, cada uno marcado. Con una sola sede (o ninguna) la heredan del festival (`sitio: null`; el festival lleva la
 * leída). Con varias, cada acto con sede la suya (la del directorio que se llama igual o, sin ella, por confirmar) y los que no dicen sede, la del
 * festival.
 */
function actosDelPrograma(leido: Leido, sedes: number): Acto[] {
  const { valores: v } = leido;
  return (v.forma?.actos ?? []).map((a, i) => ({
    clave: `leido-${i}`,
    titulo: a.titulo,
    dia: a.fecha,
    hora: a.hora,
    sedeLeida: a.lugar || v.lugar,
    sitio: sedes <= 1 || !a.lugar ? null : a.lugarId ? { modo: "lugar", lugarId: a.lugarId, otro: OTRO_VACIO } : { modo: "otro", lugarId: "", otro: { ...OTRO_VACIO, sitioTexto: a.lugar, pinPendiente: true } },
    quien: [],
    marcado: true,
    leido: true,
  }));
}

/** Los pasos que quedan por preguntar tras leer el cartel, en el orden de siempre (nombre, día, hora, dónde, cuánto); vacío si todo se leyó. */
export function pasosQueFaltan(leido: Leido, quienActual: QuienItem[] = []): Paso[] {
  return faltan({ ...estadoInicial(quienActual).r, ...respuestasDelCartel(leido, quienActual) });
}
