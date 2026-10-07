import type { ResultadoCartel } from "@/app/eventos/acciones";
import { quienTrasLeerCartel } from "@/app/eventos/gestosFlyer";
import type { QuienItem } from "@/lib/artistas";
import { LIMITES_EVENTO } from "@/lib/eventos";
import { esApertura } from "@/lib/sugerencias";
import { OTRO_VACIO, estadoInicial, faltan, finConHora, type Acto, type Paso, type Respuestas, type Sitio } from "./pasos";

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
 * - **Día y hora**: la fecha da el día; la hora, solo si el cartel la trae (`horaLeida`: `valores.inicio` pone las 19:00 cuando hay
 *   fecha sin hora, y eso no es un dato). Una fecha sin hora deja la hora por preguntar. Con hora, el fin es el de «Termina» del cartel
 *   (con la regla de `finConHora`: una hora menor que la de inicio es la madrugada del día siguiente) o «sin hora de fin»: casi
 *   ningún cartel la trae y preguntarla en cada cartel sería preguntar de más; se cambia desde «Revisa».
 * - **Dónde**: un lugar del directorio que el lector cruzó por nombre (`lugarId`); si no, el nombre y la dirección que dice el cartel
 *   como «otro sitio», **por confirmar** (`pinPendiente`, aunque no haya dirección): el lector no da un punto del mapa, y ese sitio se
 *   pregunta igual, con lo leído de partida.
 * - **Cuánto**: «Gratis» o el precio, solo si el cartel dice una de las dos (`costoLeido`: sin precio, `valores.gratis` es el relleno).
 * - **Quién**: los artistas del cartel, y nadie si no nombra a ninguno; nada se ha tocado a mano en este paso, así que el cartel manda
 *   también sobre el artista propio que `Quién` trae de arranque (`quienTrasLeerCartel`, founder 2026-09-21).
 * - Descripción y enlace, si vienen.
 */
export function respuestasDelCartel(leido: Leido, quienActual: QuienItem[] = []): Partial<Respuestas> {
  const { valores: v } = leido;
  const r: Partial<Respuestas> = { quien: quienTrasLeerCartel(leido.quien, quienActual, true) };
  if (v.titulo) r.nombre = v.titulo;
  const [fecha, hora] = v.inicio.split("T");
  const forma = formaLeida(leido);
  if (forma) Object.assign(r, forma);
  if (fecha && !forma?.clase) {
    r.dias = { desde: fecha, hasta: null };
    if (leido.horaLeida) {
      r.hora = hora;
      r.fin = v.fin ? finConHora({ ...estadoInicial().r, dias: r.dias, hora }, v.fin.split("T")[1]) : "";
    }
  }
  if (leido.costoLeido) {
    if (v.gratis) r.costo = "gratis";
    else if (v.precio) {
      r.costo = "precio";
      r.precio = v.precio.slice(0, LIMITES_EVENTO.precio);
    }
  }
  if (v.descripcion) r.descripcion = v.descripcion;
  if (v.enlace) r.enlace = v.enlace;
  const sitio = sitioLeido(leido);
  if (sitio) r.sitio = sitio;
  return r;
}

/** El sitio que dice el cartel: un lugar del directorio que el lector cruzó por nombre o, si no, por confirmar con lo leído. */
function sitioLeido(leido: Leido): Sitio | undefined {
  const { valores: v } = leido;
  if (leido.lugarId) return { modo: "lugar", lugarId: leido.lugarId, otro: OTRO_VACIO };
  if (v.lugar || v.direccion) return { modo: "otro", lugarId: "", otro: { ...OTRO_VACIO, sitioTexto: v.lugar.slice(0, LIMITES_EVENTO.sitio), direccion: v.direccion.slice(0, LIMITES_EVENTO.direccion), pinPendiente: true } };
  return undefined;
}

/**
 * La forma de ocurrir que trae el cartel (OL-321; doc 55 §2), como respuestas: la clase la propone el cartel (y entonces el título ya no la
 * cambia); null si el cartel no dice nada distinto de un evento, y entonces lo leído es un día y una hora, como siempre.
 *
 * - **Exposición**: su visita (del primer día al de cierre) y, si el cartel trae además una fecha con hora, es su inauguración (H1: «Inauguración
 *   jue 5 · 19:00 · visita del 6 al 30»): los dos renglones llegan llenos.
 * - **Taller**: los días de sus sesiones (sin ellos, el de la fecha) y su hora si la trae; sin hora de fin, «Sin hora de fin».
 * - **Festival** (el cartel trae dos o más eventos, H6): cada uno como acto marcado, con su día, su hora y su sede (la del directorio que se llama
 *   igual o, sin ella, la del cartel; por confirmar si no se cruzó con ninguna).
 */
function formaLeida(leido: Leido): Partial<Respuestas> | null {
  const { valores: v } = leido;
  const forma = v.forma;
  if (!forma) return null;
  const [fecha, hora] = v.inicio.split("T");
  const horaLeida = leido.horaLeida ? hora : "";
  const clase = forma.actos.length >= 2 ? "festival" : forma.clase;
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
  if (clase === "festival") {
    const general = sitioLeido(leido);
    const actos: Acto[] = forma.actos.map((a, i) => ({
      clave: `leido-${i}`,
      titulo: a.titulo,
      dia: a.fecha,
      hora: a.hora,
      sedeLeida: a.lugar || v.lugar,
      sitio: a.lugarId ? { modo: "lugar", lugarId: a.lugarId, otro: OTRO_VACIO } : a.lugar ? { modo: "otro", lugarId: "", otro: { ...OTRO_VACIO, sitioTexto: a.lugar, pinPendiente: true } } : (general ?? { modo: "lugar", lugarId: "", otro: OTRO_VACIO }),
      quien: [],
      marcado: true,
      leido: true,
    }));
    return { clase, claseFijada: true, actos };
  }
  return clase === "puntual" ? { claseFijada: true } : null;
}

/** Los pasos que quedan por preguntar tras leer el cartel, en el orden de siempre (nombre, día, hora, dónde, cuánto); vacío si todo se leyó. */
export function pasosQueFaltan(leido: Leido, quienActual: QuienItem[] = []): Paso[] {
  return faltan({ ...estadoInicial(quienActual).r, ...respuestasDelCartel(leido, quienActual) });
}
