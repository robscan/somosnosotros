import type { QuienItem } from "@/lib/artistas";
import { sumarDiasIso } from "@/lib/calendario";
import { partirLocal } from "@/lib/cuandoEvento";
import { LIMITES_EVENTO, REVELAR_OPCIONES, type Evento, type OtroSitio, type SitioPrivado } from "@/lib/eventos";
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
> & { ciudad?: string | null };

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

/** Todo el evento como respuestas: nombre, cuándo (con su horario por día), dónde, cuánto (un precio sin número se pregunta), quién, descripción y enlace. */
export function respuestasAlEditar({ evento, privado, lugares, quien, sesiones, zona }: { evento: EventoAEditar; privado: SitioPrivado | null; lugares: readonly LugarResumen[]; quien: QuienItem[]; sesiones?: readonly SesionGuardada[] | null; zona: string }): Respuestas {
  const cuando = cuandoDeEvento(evento.inicio, evento.fin, zona);
  return {
    ...estadoInicial().r,
    nombre: evento.titulo.slice(0, LIMITES_EVENTO.titulo),
    ...cuando,
    sesiones: horariosDeEvento({ inicio: evento.inicio, fin: evento.fin, zona }, sesiones, cuando),
    sitio: sitioAlEditar(evento, privado, lugares),
    ...(costoDeEvento(evento.precio) ?? { costo: null, precio: "" }),
    quien,
    descripcion: evento.descripcion ?? "",
    enlace: evento.enlace ?? "",
  };
}
