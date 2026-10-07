import type { QuienItem } from "@/lib/artistas";
import { sumarDiasIso } from "@/lib/calendario";
import { partirLocal } from "@/lib/cuandoEvento";
import { visitaDeEvento } from "@/lib/claseEvento";
import { LIMITES_EVENTO, REVELAR_OPCIONES, esClase, type Evento, type OtroSitio, type SitioPrivado } from "@/lib/eventos";
import type { Franja } from "@/lib/horarioLugar";
import { diaLocal, isoALocal } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { sitioReservadoVencido } from "@/lib/retencionSitio";
import { diasDelRango, finComun, sesionesVigentes, type HorarioDia, type SesionGuardada } from "@/lib/sesionesEvento";
import { costoDeEvento } from "./arranque";
import { OTRO_VACIO, estadoInicial, type Dias, type Respuestas, type Sitio } from "./pasos";

/**
 * Editar un evento por pasos (OL-319), sin DOM: el evento guardado vuelto respuestas del flujo, para entrar en «Revisa» con todo puesto. Las
 * reglas son las del formulario de editar de siempre (el que sustituye) y las del alta: lo que el alta guardaría con esas respuestas es lo que
 * ya está guardado, así que guardar sin tocar nada no cambia el evento.
 */
export type EventoAEditar = Pick<
  Evento,
  "titulo" | "inicio" | "fin" | "lugar_id" | "precio" | "descripcion" | "enlace" | "imagen" | "sitio_texto" | "sitio_direccion" | "sitio_lat" | "sitio_lng" | "sitio_reservado" | "sitio_revelar_desde" | "zona"
> & { ciudad?: string | null; clase?: Evento["clase"]; evento_padre_id?: string | null; inaugura_id?: string | null };

/** Lo que se lee aparte para editar cómo ocurre (OL-321): el horario propio de una exposición, su inauguración, el festival del que es parte y,
 *  si es un festival, cuántas actividades tiene registradas. */
export type ClaseAEditar = { horario?: Franja[] | null; inauguracion?: { inicio: string } | null; padre?: { id: string; titulo: string } | null; actos?: number };

type Cuando = Pick<Respuestas, "dias" | "hora" | "fin">;

/**
 * El día, la hora y el fin, en la hora del sitio (`zona`). Dura varios días si el fin cae en un día posterior, salvo la noche que cruza la
 * medianoche (termina al día siguiente a una hora menor o igual que la de inicio): es un evento de un día con su fin de madrugada, como lo
 * lee `cuandoVariosDias` y como lo guarda el alta («Otra hora» antes del inicio). Sin fin: un día, «Sin hora de fin» (`fin` vacío).
 */
export function cuandoDeEvento(inicio: string, fin: string | null, zona: string): Cuando {
  const desde = partirLocal(isoALocal(inicio, zona));
  const finLocal = isoALocal(fin, zona);
  const hasta = partirLocal(finLocal);
  const noche = hasta.fecha === sumarDiasIso(desde.fecha, 1) && hasta.hora <= desde.hora;
  const varios = !!finLocal && hasta.fecha > desde.fecha && !noche;
  const dias: Dias | null = desde.fecha ? { desde: desde.fecha, hasta: varios ? hasta.fecha : null } : null;
  return { dias, hora: desde.hora || null, fin: finLocal };
}

/**
 * El horario de cada día de un evento con sesiones (OL-311), si todavía le corresponden (`sesionesVigentes`): un renglón por día del rango; un
 * día sin sesión (no debería haberlo: el alta manda todos) lleva el horario común. null si el evento no tiene horario por día.
 */
export function horariosDeEvento(evento: { inicio: string; fin: string | null; zona: string }, sesiones: readonly SesionGuardada[] | null | undefined, cuando: Cuando): HorarioDia[] | null {
  const vigentes = sesionesVigentes(evento, sesiones);
  if (!vigentes.length || !cuando.dias?.hasta || !cuando.hora) return null;
  const porDia = new Map(vigentes.map((s) => [diaLocal(new Date(s.inicio), evento.zona), s]));
  const comun = finComun(cuando.hora, cuando.fin ?? "");
  return diasDelRango({ desde: cuando.dias.desde, hasta: cuando.dias.hasta }).map((dia) => {
    const s = porDia.get(dia);
    if (!s) return { dia, hora: cuando.hora ?? "", fin: comun };
    return { dia, hora: partirLocal(isoALocal(s.inicio, evento.zona)).hora, fin: s.fin ? partirLocal(isoALocal(s.fin, evento.zona)).hora : "" };
  });
}

/** Cuántas horas antes del inicio se revela un sitio reservado, de las que se ofrecen; si no es ninguna (o no se sabe), 24, como siempre. */
export function horasParaRevelar(inicio: string, revelarDesde: string | null): number {
  if (!revelarDesde) return 24;
  const horas = Math.round((new Date(inicio).getTime() - new Date(revelarDesde).getTime()) / 3600000);
  return REVELAR_OPCIONES.some((o) => o.horas === horas) ? horas : 24;
}

/**
 * Dónde es, como respuesta. Un lugar del directorio que se puede elegir (`lugares`) va por su id, también uno privado de la cuenta (así lo guardó
 * el formulario de siempre; no se convierte en sitio reservado); uno que ya no está, por contestar. Otro sitio, con su nombre, su dirección
 * y su punto (sin dirección, el nombre de antes: `nombreLegacy`). Un sitio reservado, con su dirección exacta, su punto y sus indicaciones
 * (`privado`, que solo leen su autor y la administración); si la dirección ya se retiró por privacidad (siete días después del evento), sin
 * ella (`direccionRetirada`).
 */
export function sitioAlEditar(evento: EventoAEditar, privado: SitioPrivado | null, lugares: readonly LugarResumen[]): Sitio {
  const otro: OtroSitio = { ...OTRO_VACIO, revelarHoras: horasParaRevelar(evento.inicio, evento.sitio_revelar_desde), ciudad: evento.ciudad ?? null };
  if (evento.sitio_reservado) {
    return {
      modo: "reservado",
      lugarId: "",
      otro: {
        ...otro,
        reservado: true,
        sitioTexto: (evento.sitio_texto ?? "").slice(0, LIMITES_EVENTO.sitio),
        direccionPrivada: privado?.direccion ?? "",
        privadoPunto: privado?.lat != null && privado.lng != null ? { lat: privado.lat, lng: privado.lng } : null,
        indicaciones: privado?.indicaciones ?? "",
        ...(!privado && sitioReservadoVencido(evento) ? { direccionRetirada: true } : {}),
      },
    };
  }
  if (evento.sitio_texto) {
    return {
      modo: "otro",
      lugarId: "",
      otro: {
        ...otro,
        sitioTexto: evento.sitio_texto.slice(0, LIMITES_EVENTO.sitio),
        direccion: evento.sitio_direccion ?? "",
        nombreLegacy: !evento.sitio_direccion,
        sitioPunto: evento.sitio_lat != null && evento.sitio_lng != null ? { lat: evento.sitio_lat, lng: evento.sitio_lng } : null,
      },
    };
  }
  const lugarId = evento.lugar_id && lugares.some((l) => l.id === evento.lugar_id) ? evento.lugar_id : "";
  return { modo: "lugar", lugarId, otro };
}

/**
 * Las sesiones de un taller como respuestas (OL-321): sus días (sueltos) y, si todas tienen la misma hora, esa hora con la casilla «Misma hora
 * todas las sesiones» marcada; si no, cada una con la suya. Sin sesiones guardadas, un taller de un solo día.
 */
export function tallerAlEditar(evento: { inicio: string; fin: string | null; zona: string }, sesiones: readonly SesionGuardada[] | null | undefined, zona: string): Pick<Respuestas, "sesionesDias" | "hora" | "fin" | "sesiones"> {
  const vigentes = sesionesVigentes(evento, sesiones);
  const horarios: HorarioDia[] = vigentes.length
    ? vigentes.map((s) => ({ dia: diaLocal(new Date(s.inicio), zona), hora: partirLocal(isoALocal(s.inicio, zona)).hora, fin: s.fin ? partirLocal(isoALocal(s.fin, zona)).hora : "" }))
    : [{ dia: diaLocal(new Date(evento.inicio), zona), hora: partirLocal(isoALocal(evento.inicio, zona)).hora, fin: evento.fin && diaLocal(new Date(evento.fin), zona) === diaLocal(new Date(evento.inicio), zona) ? partirLocal(isoALocal(evento.fin, zona)).hora : "" }];
  const [primera] = horarios;
  const iguales = horarios.every((h) => h.hora === primera.hora && h.fin === primera.fin);
  return { sesionesDias: horarios.map((h) => h.dia), hora: primera.hora, fin: primera.fin, sesiones: iguales ? null : horarios };
}

/** Todo el evento como respuestas: nombre, cuándo (con su horario por día), dónde, cuánto (un precio sin número se pregunta), quién, descripción y enlace.
 *  Con su clase (OL-321), ya confirmada: el paso del tiempo de la suya (la visita, las sesiones), el horario propio, la inauguración y el festival. */
export function respuestasAlEditar({ evento, privado, lugares, quien, sesiones, zona, clase: extra = {} }: { evento: EventoAEditar; privado: SitioPrivado | null; lugares: readonly LugarResumen[]; quien: QuienItem[]; sesiones?: readonly SesionGuardada[] | null; zona: string; clase?: ClaseAEditar }): Respuestas {
  const cuando = cuandoDeEvento(evento.inicio, evento.fin, zona);
  const clase = esClase(evento.clase) ? evento.clase : "puntual";
  const base: Respuestas = {
    ...estadoInicial().r,
    nombre: evento.titulo.slice(0, LIMITES_EVENTO.titulo),
    ...cuando,
    sesiones: horariosDeEvento({ inicio: evento.inicio, fin: evento.fin, zona }, sesiones, cuando),
    sitio: sitioAlEditar(evento, privado, lugares),
    ...(costoDeEvento(evento.precio) ?? { costo: null, precio: "" }),
    quien,
    descripcion: evento.descripcion ?? "",
    enlace: evento.enlace ?? "",
    clase,
    claseFijada: true,
    padre: extra.padre ?? null,
  };
  if (clase === "exposicion") {
    const inaug = extra.inauguracion ? partirLocal(isoALocal(extra.inauguracion.inicio, zona)) : null;
    return { ...base, dias: null, hora: null, fin: null, sesiones: null, visita: visitaDeEvento(evento.inicio, evento.fin, zona), horario: extra.horario?.length ? extra.horario : null, inauguracion: inaug?.fecha ? { dia: inaug.fecha, hora: inaug.hora } : null };
  }
  if (clase === "taller") return { ...base, dias: null, ...tallerAlEditar({ inicio: evento.inicio, fin: evento.fin, zona }, sesiones, zona) };
  if (clase === "festival") return { ...base, sesiones: null, padre: null, programaGuardado: extra.actos ?? 0 };
  return base;
}
