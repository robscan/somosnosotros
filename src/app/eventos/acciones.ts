"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { rutaSegura } from "@/lib/rutas";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { enlaceDeAlta } from "@/lib/armazon";
import { intentarDrenarAvisos } from "@/lib/avisosWorker";
import { CIUDAD_INICIAL, SIN_CIUDAD } from "@/lib/ciudad";
import { leerCartel } from "@/lib/cartel";
import { configPublica } from "@/lib/config";
import { artistaIgual, deducirTipoArtista, quienDesdeJson, type ArtistaResumen, type QuienItem } from "@/lib/artistas";
import { cartelAFormulario, ciudadDelSitio, esClase, hrefEvento, validarEvento, type CambioEvento, type Clase, type DatosEvento, type ErroresEvento } from "@/lib/eventos";
import { horarioDesdeJson, type Franja } from "@/lib/horarioLugar";
import { localAIso, zonaSegura } from "@/lib/fechas";
import { mencionDeFestival } from "@/lib/sugerencias";
import { esUuid } from "@/lib/formulario";
import type { LugarResumen } from "@/lib/lugares";
import { validarSesiones, type SesionEvento } from "@/lib/sesionesEvento";
import { clienteAdmin } from "@/lib/supabase/admin";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { clienteServidor, esAdminDeSesion } from "@/lib/supabase/servidor";
import { zonaDePunto } from "@/lib/zona";
import { sitioReservadoVencido } from "@/lib/retencionSitio";

/**
 * Publicar devuelve lo publicado (`slug` y `href`, la dirección de la ficha): el alta por pasos no sale de su pantalla y lo enseña en su
 * final, «Publicado» (OL-312: ya no hay otra alta que lleve a la ficha). Guardar devuelve a dónde volver (el formulario termina la tarea).
 */
export type ResultadoEvento =
  | { ok: true; id: string; volver: string; slug?: string | null; href?: string; /** Un festival publicado con su programa (OL-321): cuántos actos y borradores. */ programa?: { actos: number; borradores: number } }
  | { ok: false; errores: ErroresEvento; general?: string; conflicto?: boolean };


function leer(formData: FormData) {
  const claves = ["modo_sitio", "lugar_id", "sitio_texto", "sitio_direccion", "sitio_pin_pendiente", "sitio_lat", "sitio_lng", "direccion_privada", "privado_lat", "privado_lng", "indicaciones", "revelar_horas", "titulo", "inicio", "fin", "descripcion", "imagen", "gratis", "cooperacion", "precio", "enlace", "ciudad"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

function filaEvento(datos: DatosEvento, ciudad: string) {
  const { privado: _p, ...fila } = datos;
  void _p;
  return { ...fila, descripcion: fila.descripcion || null, ciudad };
}

type Entrada = ReturnType<typeof leer>;
type LugarDelEvento = { ciudad: string; zona: string } | null;

/** El lugar registrado donde es el evento (su ciudad y su zona), o null si es en otro sitio. */
async function lugarDelEvento(supabase: Cliente, entrada: Entrada): Promise<LugarDelEvento> {
  const id = typeof entrada.lugar_id === "string" ? entrada.lugar_id.trim() : "";
  if ((entrada.modo_sitio || "lugar") !== "lugar" || !esUuid(id)) return null;
  const { data } = await supabase.from("lugares").select("ciudad, zona").eq("id", id).maybeSingle();
  return data;
}

/**
 * La zona horaria del evento, que decide cómo se leen sus horas: la de su lugar (la base la vuelve a poner desde el
 * lugar); en otro sitio, la del punto, el público o el reservado; sin punto, la de la inicial, como su ciudad.
 */
function zonaDelEvento(entrada: Entrada, lugar: LugarDelEvento): string {
  if (lugar) return zonaSegura(lugar.zona);
  const numero = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
  const reservado = entrada.modo_sitio === "reservado";
  return zonaDePunto(numero(entrada[reservado ? "privado_lat" : "sitio_lat"]), numero(entrada[reservado ? "privado_lng" : "sitio_lng"]));
}

/** La zona de un punto, para que el formulario lea las horas en la misma zona en la que las leerá el servidor al guardar. */
export async function zonaDelPunto(lat: number, lng: number): Promise<string> {
  return zonaDePunto(lat, lng);
}

/** La ciudad del evento: la de su lugar; en otro sitio, la del pin (Mapbox o la de contexto cercana; null si no se supo, OL-299). */
function ciudadDe(datos: DatosEvento, lugar: LugarDelEvento, actual?: Parameters<typeof ciudadDelSitio>[1]): string | null {
  if (!datos.lugar_id) return ciudadDelSitio(datos, actual);
  return lugar?.ciudad ?? CIUDAD_INICIAL.nombre;
}

/** El aviso de «no supimos la ciudad» va donde la persona ve el pin: la dirección del sitio, o la privada si es reservado. */
function sinCiudad(datos: DatosEvento): { ok: false; errores: ErroresEvento } {
  return { ok: false, errores: { [datos.sitio_reservado ? "direccion_privada" : "sitio_direccion"]: SIN_CIUDAD } };
}

/** Se revalida por id (la dirección vieja, que sigue resolviendo) y por slug (la de hoy) si ya se conoce: las dos pueden estar cacheadas. */
function revalidar(id: string, lugarId: string | null, artistas: string[] = [], slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/artistas");
  revalidatePath(`/eventos/${id}`);
  if (slug) revalidatePath(`/eventos/${slug}`);
  if (lugarId) revalidatePath(`/lugares/${lugarId}`);
  for (const a of artistas) revalidatePath(`/artistas/${a}`);
}

type Cliente = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;

type GuardadoCompleto = { id: string; artistas: string[]; artistas_anteriores: string[]; lugar_anterior: string | null; cambio: CambioEvento; repetido?: boolean; padre?: string | null; inauguracion?: string | null };

/**
 * Una clave de operación que sale de otra (UUID con la forma de la v5, de un SHA-1): la inauguración, el festival nuevo y cada acto de un programa
 * tienen la suya, derivada de la de la pantalla, así un reintento con la misma clave no los publica dos veces.
 */
export async function operacionDerivada(base: string, de: string): Promise<string> {
  const h = createHash("sha1").update(`${base}:${de}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

/** Lo que llega del alta y de editar por pasos sobre cómo ocurre (OL-321): la clase, el horario propio, la inauguración y el festival. */
type LecturaClase = { clase: Clase; horario: Franja[] | null; inauguracion: { dia: string; hora: string } | null; padre: string | null; padreNuevo: string | null; error?: string };

const ES_DIA = /^\d{4}-\d{2}-\d{2}$/;
const ES_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Sin el campo `clase` (una pantalla de antes) es un evento, como siempre. */
function leerClase(formData: FormData): LecturaClase {
  const crudo = formData.get("clase");
  const clase: Clase = esClase(crudo) ? crudo : "puntual";
  const { franjas, error } = formData.has("horario") ? horarioDesdeJson(formData.get("horario")) : { franjas: null };
  let inauguracion: LecturaClase["inauguracion"] = null;
  const textoInauguracion = formData.get("inauguracion");
  if (typeof textoInauguracion === "string" && textoInauguracion.trim()) {
    try {
      const i = JSON.parse(textoInauguracion) as { dia?: unknown; hora?: unknown };
      if (typeof i.dia === "string" && ES_DIA.test(i.dia) && typeof i.hora === "string" && ES_HORA.test(i.hora)) inauguracion = { dia: i.dia, hora: i.hora };
    } catch {
      // Ilegible: sin inauguración (la pantalla siempre la manda bien).
    }
  }
  const padre = typeof formData.get("padre") === "string" && esUuid(String(formData.get("padre"))) ? String(formData.get("padre")) : null;
  const nuevo = typeof formData.get("padre_nuevo") === "string" ? String(formData.get("padre_nuevo")).trim().slice(0, 120) : "";
  return { clase, horario: franjas && franjas.length ? franjas : null, inauguracion: clase === "exposicion" ? inauguracion : null, padre: clase === "festival" ? null : padre, padreNuevo: clase === "festival" || padre ? null : nuevo || null, error };
}

/** ¿Hace falta la función con la clase? Para todo lo que no sea un evento suelto sin festival, o un evento que deja de ser otra cosa. */
const conClase = (c: LecturaClase, antes?: { clase?: string | null; evento_padre_id?: string | null } | null): boolean =>
  c.clase !== "puntual" || !!c.padre || !!c.padreNuevo || (!!antes && ((antes.clase ?? "puntual") !== "puntual" || !!antes.evento_padre_id));

/** El `p_clase` de `guardar_evento_con_clase`, con las horas de la inauguración en la zona del evento y las claves derivadas de la operación. */
async function argumentoClase(c: LecturaClase, zona: string, operacion: string) {
  return {
    clase: c.clase,
    horario: c.clase === "exposicion" ? (c.horario ?? []) : null,
    inauguracion: c.inauguracion ? { inicio: localAIso(`${c.inauguracion.dia}T${c.inauguracion.hora}`, zona), fin: null, operacion: await operacionDerivada(operacion, "inauguracion") } : null,
    padre: c.padre,
    padre_nuevo: c.padreNuevo ? { titulo: c.padreNuevo, operacion: await operacionDerivada(operacion, "festival") } : null,
  };
}

/** La función de la base que guarda: al publicar, con `sesiones` (un evento de varios días con horario por día, OL-311) la que las escribe en
 *  la misma transacción y, sin ellas, la de siempre; al editar (OL-319), siempre `editar_evento_con_sesiones`, que con sesiones las reemplaza y
 *  sin ellas deja el evento sin horario por día (la casilla «Mismo horario todos los días» marcada otra vez), también en la misma transacción. */
function funcionDeGuardado(id: string | null, sesiones: SesionEvento[] | null): "editar_evento_con_sesiones" | "guardar_evento_con_sesiones" | "guardar_evento_con_avisos" {
  if (id) return "editar_evento_con_sesiones";
  return sesiones ? "guardar_evento_con_sesiones" : "guardar_evento_con_avisos";
}

async function guardarCompleto(supabase: Cliente, id: string | null, datos: DatosEvento, ciudad: string, quien: QuienItem[], operacion: FormDataEntryValue | null, revision: string | null = null, sesiones: SesionEvento[] | null = null, clase: LecturaClase | null = null): Promise<{ data: GuardadoCompleto | null; conflicto: boolean }> {
  if (typeof operacion !== "string" || !esUuid(operacion)) return { data: null, conflicto: false };
  const argumentos = {
    p_evento: id,
    p_datos: filaEvento(datos, ciudad),
    p_privado: datos.privado,
    p_quien: quien.map((item) => ({ ...item, tipo: deducirTipoArtista(item.nombre) ?? "solista" })),
    p_revision: revision,
    p_operacion: operacion,
  };
  // Con la clase (OL-321): una sola función para el alta y editar, que envuelve a las de siempre en la misma transacción.
  if (clase) {
    const { data, error } = await supabase.rpc("guardar_evento_con_clase", { ...argumentos, p_sesiones: sesiones, p_clase: await argumentoClase(clase, datos.zona, operacion) });
    return { data: error || !data ? null : (data as GuardadoCompleto), conflicto: error?.code === "40001" };
  }
  const funcion = funcionDeGuardado(id, sesiones);
  const { data, error } = await supabase.rpc(funcion, funcion === "guardar_evento_con_avisos" ? argumentos : { ...argumentos, p_sesiones: sesiones });
  return { data: error || !data ? null : data as GuardadoCompleto, conflicto: error?.code === "40001" };
}


export async function crearEvento(_previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase, user } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  const entrada = leer(formData);
  const clase = leerClase(formData);
  // Un festival se publica con su programa: el marco y sus actos en una sola operación (H6).
  if (clase.clase === "festival") return publicarPrograma(supabase, formData, await esAdminDeSesion(supabase, user.id));
  const [lugar, esAdmin] = await Promise.all([lugarDelEvento(supabase, entrada), esAdminDeSesion(supabase, user.id)]);
  const { datos, errores } = validarEvento(entrada, zonaDelEvento(entrada, lugar), { esAdmin });
  if (clase.error) errores.horario = clase.error;
  // Horario por día (OL-311): solo si la casilla «Mismo horario todos los días» vino desmarcada; sin el campo, el evento es como siempre.
  const { sesiones, error: errorSesiones } = validarSesiones(formData.get("sesiones"), datos.zona, datos.inicio, datos.fin);
  if (errorSesiones) errores.sesiones = errorSesiones;
  if (Object.keys(errores).length) return { ok: false, errores };
  const ciudad = ciudadDe(datos, lugar);
  if (ciudad === null) return sinCiudad(datos);
  const { data } = await guardarCompleto(supabase, null, datos, ciudad, quienDesdeJson(formData.get("quien")), formData.get("operacion"), null, sesiones, conClase(clase) ? clase : null);
  if (!data) return { ok: false, errores: {}, general: "No se pudo publicar el evento completo. Intenta de nuevo." };
  if (data.padre) revalidatePath(`/eventos/${data.padre}`);
  // El festival con su edición que leyó el cartel (OL-323): el título no siempre lo dice y el segundo acto lo necesita para reconocer a este
  // (H4). Solo una pista: si no se anota (sin la migración, o falla), a lo más no se sugiere.
  const mencion = mencionDeFestival(typeof formData.get("festival_leido") === "string" ? String(formData.get("festival_leido")) : null);
  if (mencion && !data.repetido) {
    const { error } = await supabase.from("eventos").update({ sugerencias: { mencion_festival: mencion.texto } }).eq("id", data.id);
    if (error) console.error("crearEvento (mención del festival):", error.message);
  }
  // La función guarda_evento_con_avisos no devuelve el slug (lo pone el disparador); una lectura de sobra para
  // no publicar con la dirección vieja desde el primer instante.
  const { data: creado } = await supabase.from("eventos").select("slug").eq("id", data.id).maybeSingle();
  revalidar(data.id, datos.lugar_id, data.artistas, creado?.slug);
  // La transaccion ya encolo: tambien un reintento puede acelerar su drenaje.
  after(intentarDrenarAvisos);
  const href = hrefEvento({ id: data.id, slug: creado?.slug });
  return { ok: true, id: data.id, slug: creado?.slug ?? null, href, volver: href };
}

export async function actualizarEvento(id: string, _previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${id}/editar`);
  const entrada = leer(formData);
  // `*`: con la migración de OL-321 trae también la clase y el festival; sin ella, lo de siempre (la consulta no falla por una columna que no hay).
  const [lugar, esAdmin, { data: existente }] = await Promise.all([lugarDelEvento(supabase, entrada), esAdminDeSesion(supabase, user.id), supabase.from("eventos").select("*").eq("id", id).maybeSingle()]);
  const clase = leerClase(formData);
  const sinPuntoTrasRetencion = sitioReservadoVencido(existente) && entrada.modo_sitio === "reservado" && !entrada.privado_lat && !entrada.privado_lng;
  const zona = sinPuntoTrasRetencion ? zonaSegura(existente?.zona) : zonaDelEvento(entrada, lugar);
  const { datos, errores } = validarEvento(entrada, zona, { esAdmin, imagenActual: existente?.imagen ?? null, eventoActual: existente, marco: clase.clase === "festival" });
  if (clase.error) errores.horario = clase.error;
  // Horario por día (OL-319): con la casilla «Mismo horario todos los días» desmarcada llega una sesión por día; sin el campo, el evento queda sin ellas.
  const { sesiones, error: errorSesiones } = validarSesiones(formData.get("sesiones"), datos.zona, datos.inicio, datos.fin);
  if (errorSesiones) errores.sesiones = errorSesiones;
  if (Object.keys(errores).length) return { ok: false, errores };
  const ciudad = ciudadDe(datos, lugar, existente);
  if (ciudad === null) return sinCiudad(datos);
  const revision = formData.get("revision");
  if (typeof revision !== "string" || !revision.trim() || !Number.isFinite(Date.parse(revision))) {
    return { ok: false, errores: {}, general: "Vuelve a abrir el evento para cargar su versión actual. Tus cambios no se guardaron." };
  }
  const usarClase = formData.has("clase") && conClase(clase, existente as { clase?: string | null; evento_padre_id?: string | null } | null);
  const { data, conflicto } = await guardarCompleto(supabase, id, datos, ciudad, quienDesdeJson(formData.get("quien")), formData.get("operacion"), revision, sesiones, usarClase ? clase : null);
  if (conflicto) return { ok: false, errores: {}, conflicto: true, general: "El evento cambió mientras lo editabas. Tus cambios siguen aquí, pero no se guardaron. Revisa la versión actual antes de volver a editar." };
  if (!data) return { ok: false, errores: {}, general: "No se pudo guardar el evento completo. ¿Sigues con sesión y es tu evento?" };
  // «Inauguración · Quitar» (OL-323, deshacer una sugerencia aceptada): la exposición deja de estar ligada a su inauguración y las dos fichas
  // siguen. Solo si la pantalla lo pide (tenía una al abrir y se quitó): una inauguración que no se pudo leer al abrir no se suelta sola.
  if (formData.get("quitar_inauguracion") === "1" && clase.clase === "exposicion" && !clase.inauguracion && existente?.inaugura_id) {
    const { error } = await supabase.from("eventos").update({ inaugura_id: null }).eq("id", id);
    if (error) return { ok: false, errores: {}, general: "Se guardó lo demás, pero no se pudo quitar la inauguración. Intenta de nuevo." };
    revalidatePath(`/eventos/${existente.inaugura_id}`);
  }
  revalidar(id, datos.lugar_id, [...data.artistas, ...data.artistas_anteriores]);
  if (data.lugar_anterior && data.lugar_anterior !== datos.lugar_id) revalidatePath(`/lugares/${data.lugar_anterior}`);
  if (data.padre) revalidatePath(`/eventos/${data.padre}`);
  after(intentarDrenarAvisos);
  return { ok: true, id, volver: `/eventos/${id}` };
}

/** Un acto del programa como lo manda la pantalla (`CamposEvento`, campo `actos`): su nombre, su inicio y su fin en la hora de su sede, los campos
 *  de su sede (los mismos de `CamposSitio`), quién y si se publica. */
type ActoEnviado = { titulo?: unknown; inicio?: unknown; fin?: unknown; sitio?: Record<string, unknown>; quien?: unknown; marcado?: unknown };

/**
 * Publicar un festival con su programa (OL-321, H6): cada acto se valida como cualquier alta (en la zona de su sede) y la base publica el marco y
 * los actos marcados en una sola operación (los desmarcados quedan como borradores). El marco lleva el nombre, el cartel, el precio, la
 * descripción, el enlace y quién del festival; el sitio y el periodo los toma de su programa. Un acto que no se puede publicar no deja nada a
 * medias: el error dice cuál.
 */
async function publicarPrograma(supabase: Cliente, formData: FormData, esAdmin: boolean): Promise<ResultadoEvento> {
  const marco = leer(formData);
  const operacion = formData.get("operacion");
  const titulo = typeof marco.titulo === "string" ? marco.titulo.trim() : "";
  if (!titulo) return { ok: false, errores: { titulo: "Ponle nombre al festival." } };
  if (typeof operacion !== "string" || !esUuid(operacion)) return { ok: false, errores: {}, general: "No se pudo publicar el festival. Intenta de nuevo." };
  let enviados: ActoEnviado[] = [];
  try {
    const crudo = JSON.parse(String(formData.get("actos") ?? "[]"));
    enviados = Array.isArray(crudo) ? crudo.slice(0, 40) : [];
  } catch {
    enviados = [];
  }
  if (!enviados.some((a) => a.marcado === true)) return { ok: false, errores: {}, general: "Falta una actividad para publicar el festival." };
  const actos = [];
  let primero: DatosEvento | null = null;
  for (const [i, a] of enviados.entries()) {
    const nombre = typeof a.titulo === "string" ? a.titulo : "";
    const entrada = { ...marco, ...Object.fromEntries(Object.entries(a.sitio ?? {}).map(([k, v]) => [k, typeof v === "string" ? v : v == null ? null : String(v)])), titulo: nombre, inicio: typeof a.inicio === "string" ? a.inicio : "", fin: typeof a.fin === "string" ? a.fin : "", descripcion: "" } as Entrada;
    const lugar = await lugarDelEvento(supabase, entrada);
    const { datos, errores } = validarEvento(entrada, zonaDelEvento(entrada, lugar), { esAdmin });
    const error = Object.values(errores)[0];
    if (error) return { ok: false, errores: {}, general: `Revisa «${nombre || "la actividad sin nombre"}»: ${error}` };
    const ciudad = ciudadDe(datos, lugar);
    if (ciudad === null) return { ok: false, errores: {}, general: `Revisa «${nombre}»: ${SIN_CIUDAD}` };
    if (a.marcado === true && !primero) primero = datos;
    const quien = quienDesdeJson(JSON.stringify(Array.isArray(a.quien) ? a.quien : []));
    actos.push({ datos: filaEvento(datos, ciudad), privado: datos.privado, quien: quien.map((q) => ({ ...q, tipo: deducirTipoArtista(q.nombre) ?? "solista" })), publicar: a.marcado === true, operacion: await operacionDerivada(operacion, `acto:${i}`) });
  }
  const quienMarco = quienDesdeJson(formData.get("quien")).map((q) => ({ ...q, tipo: deducirTipoArtista(q.nombre) ?? "solista" }));
  const descripcion = typeof marco.descripcion === "string" ? marco.descripcion.trim() : "";
  const { data, error } = await supabase.rpc("publicar_programa", {
    p_marco: { datos: { titulo: titulo.slice(0, 120), imagen: primero?.imagen ?? null, precio: primero?.precio ?? null, descripcion: descripcion || null, enlace: primero?.enlace ?? null }, quien: quienMarco },
    p_actos: actos,
    p_operacion: operacion,
  });
  const hecho = data as { id: string; actos: string[]; borradores: string[] } | null;
  if (error || !hecho) return { ok: false, errores: {}, general: "No se pudo publicar el festival completo. Intenta de nuevo." };
  const { data: creado } = await supabase.from("eventos").select("slug").eq("id", hecho.id).maybeSingle();
  revalidar(hecho.id, null, [], creado?.slug);
  for (const acto of hecho.actos) revalidatePath(`/eventos/${acto}`);
  after(intentarDrenarAvisos);
  const href = hrefEvento({ id: hecho.id, slug: creado?.slug });
  return { ok: true, id: hecho.id, slug: creado?.slug ?? null, href, volver: href, programa: { actos: hecho.actos.length, borradores: hecho.borradores.length } };
}

/**
 * Publicar un borrador del programa desde la ficha del festival (solo su autor; la base lo comprueba). Si la administración lo retiró
 * (OL-328: `no_publicable`), la ficha lo dice en vez de volver como si nada.
 */
export async function publicarBorrador(id: string, volver: string) {
  const regreso = rutaSegura(volver, esUuid(id) ? `/eventos/${id}` : "/eventos");
  const { supabase } = await sesionOEntrar(regreso);
  const conError = (codigo: string) => {
    const url = new URL(regreso, "https://somosnosotros.org");
    url.searchParams.set("error", codigo);
    return `${url.pathname}${url.search}${url.hash}`;
  };
  if (!esUuid(id)) redirect(conError("publicar"));
  const { error } = await supabase.rpc("publicar_borrador_de_programa", { p_evento: id });
  revalidatePath(regreso.split(/[?#]/)[0]);
  revalidatePath(`/eventos/${id}`);
  revalidatePath("/");
  redirect(error ? conError(error.message === "no_publicable" ? "no_publicable" : "publicar") : regreso);
}

export async function cambiarVisibleEvento(id: string, lugarId: string | null, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/eventos/${id}`);
  await supabase.from("eventos").update({ visible }).eq("id", id);
  revalidar(id, lugarId);
  redirect(`/eventos/${id}`);
}

export type ResultadoCartel =
  /** `horaLeida` y `costoLeido`: el cartel trae esa hora y ese precio de verdad. `valores` rellena lo que falta (las 19:00 si hay fecha
   *  sin hora, «gratis» si no dice nada de precio) porque el alta de siempre se apoya en eso; el alta por pasos necesita saber qué no
   *  se leyó para preguntarlo en vez de publicarlo a ciegas. */
  | { ok: true; valores: ReturnType<typeof cartelAFormulario>; lugarId: string | null; quien: QuienItem[]; horaLeida: boolean; costoLeido: boolean }
  | { ok: false; mensaje: string }
  | { ok: false; sinCupo: true };

/**
 * La lectura falló por el modelo o por un corte: no se descuenta (OL-307, bitácora 335). Solo el servidor puede devolverla, con su llave de
 * servicio: una función que llamara cualquier cuenta devolvería también las buenas. La base pone el fusible (tantas devoluciones al mes
 * como el tope) para que una imagen que el modelo no sabe leer, repetida, no sea gratis sin límite. Sin llave de servicio o si la
 * devolución falla, la lectura queda descontada: el cupo nunca se queda corto de más.
 */
async function devolverLectura(perfilId: string) {
  try {
    await clienteAdmin()?.rpc("devolver_lectura_de_cartel", { p_perfil: perfilId });
  } catch {
    // sin devolución: la fallida cuenta
  }
}

/** Lee el cartel ya subido a Storage y devuelve los valores para llenar el formulario. */
export async function leerCartelAccion(urlImagen: string): Promise<ResultadoCartel> {
  const { supabase, user } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  const { supabaseUrl } = configPublica();
  if (!supabaseUrl || !urlImagen.startsWith(`${supabaseUrl}/storage/v1/object/public/fotos/`)) return { ok: false, mensaje: "La imagen no es de aquí." };
  // El cupo se aparta aquí, antes de llamar al modelo, y en un solo paso: en el cliente se saltaría en diez
  // segundos, y en dos pasos dos toques seguidos pasarían los dos (docs/rediseno/23).
  const { data: apartada, error: eCupo } = await supabase.rpc("apartar_lectura_de_cartel");
  if (eCupo) return { ok: false, mensaje: "No pude apartar la lectura. Intenta de nuevo." };
  if (!apartada) return { ok: false, sinCupo: true };
  let lectura;
  try {
    lectura = await leerCartel(urlImagen);
  } catch (e) {
    await devolverLectura(user.id);
    throw e;
  }
  // El titular ("No pude leer el cartel") lo pone la tarjeta; aquí solo va lo que toca hacer. Una lectura que falla no se descuenta.
  if (!lectura) {
    await devolverLectura(user.id);
    return { ok: false, mensaje: "Llena los datos a mano; la imagen se queda puesta." };
  }
  const valores = cartelAFormulario(lectura);
  // Un lugar del directorio que se llama como lo dice el cartel (uno solo: con dos, se pregunta); lo mismo con la sede de cada acto de un programa.
  const sedes = new Map<string, string | null>();
  const lugarConNombre = async (nombre: string): Promise<string | null> => {
    if (!sedes.has(nombre)) {
      const { data } = await supabase.rpc("lugares_con_nombre", { p_nombre: nombre });
      const lugares = (data ?? []) as LugarResumen[];
      sedes.set(nombre, lugares.length === 1 ? lugares[0].id : null);
    }
    return sedes.get(nombre) ?? null;
  };
  const lugarId = valores.lugar ? await lugarConNombre(valores.lugar) : null;
  for (const acto of valores.forma?.actos ?? []) acto.lugarId = acto.lugar ? await lugarConNombre(acto.lugar) : lugarId;
  // Los nombres del cartel: registrados si se llaman igual; si no, por crear con solo el nombre.
  const quien: QuienItem[] = [];
  for (const nombre of valores.artistas) {
    const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: nombre });
    const igual = artistaIgual((data ?? []) as ArtistaResumen[], nombre);
    quien.push(igual ? { id: igual.id, nombre: igual.nombre } : { nombre });
  }
  return { ok: true, valores, lugarId, quien, horaLeida: /^\d{2}:\d{2}$/.test(lectura.hora ?? ""), costoLeido: lectura.gratis === true || valores.precio !== "" };
}

export type EstadoAsistencia = "voy" | "me_interesa" | null;

/**
 * "Voy" / "Me interesa" / quitar. Un toque; la política de la base cuida que cada quien mueva solo lo suyo. Devuelve si
 * se guardó: las listas deshacen lo que mostraron y ofrecen Reintentar (bitácora 085).
 *
 * `diferir` (OL-212, tercera vuelta): desde un renglón de lista (`useAsistenciaEnLista`, Inicio o cualquier otra
 * pantalla con carriles) el botón ya se ve al día solo, con su propio estado optimista — revalidar aquí de
 * inmediato solo repintaría de más la pantalla en la que ya se está (Next vuelve a pedir y renderizar toda la ruta
 * actual en la misma respuesta de la acción en cuanto se llama a `revalidatePath`, sin importar qué ruta se le dé:
 * "How Server Actions work", docs/api-reference/functions/revalidatePath.md de Next 16.3.5, la versión instalada).
 * Con `after` (`next/server`) la invalidación se aplica igual —Perfil, Inicio y la ficha no se quedan viejos la
 * próxima vez que se pidan— pero después de que la respuesta ya salió, así que no repinta la pantalla desde la que
 * se guardó. La ficha (`Asistencia.tsx`, sin tocar) no manda `diferir`: sigue viendo su propio "van" al día en el
 * mismo toque, como antes.
 */
export async function cambiarAsistencia(eventoId: string, estado: EstadoAsistencia, diferir = false): Promise<boolean> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${eventoId}?accion=${estado ?? ""}`);
  const { error } = estado
    ? await supabase.from("asistencias").upsert({ usuario_id: user.id, evento_id: eventoId, estado })
    : await supabase.from("asistencias").delete().eq("usuario_id", user.id).eq("evento_id", eventoId);
  if (error) return false;
  // La agenda muestra lo decidido en cada renglón (y se reutiliza hasta un minuto): al volver de la ficha, al día.
  const revalidar = () => {
    revalidatePath(`/eventos/${eventoId}`);
    revalidatePath("/");
    revalidatePath("/perfil");
    revalidatePath(`/personas/${user.id}`);
  };
  if (diferir) after(revalidar);
  else revalidar();
  return true;
}

/** Borrar un evento: su autor o el admin (la política de la base lo exige). Se van también los "Voy". */
export async function borrarEvento(id: string, lugarId: string | null) {
  const { supabase } = await sesionOEntrar(`/eventos/${id}`);
  const { data } = await supabase.from("eventos").delete().eq("id", id).select("id").maybeSingle();
  if (!data) redirect(`/eventos/${id}?error=borrar`);
  revalidatePath("/");
  if (lugarId) revalidatePath(`/lugares/${lugarId}`);
  redirect("/borrado?que=evento");
}

export type Cupo = { usadas: number; tope: number; sinTope: boolean };

/** Lo que le queda a quien mira, para que la tarjeta avise antes de que se acabe (docs/rediseno/23). */
export async function cupoDeCartel(): Promise<Cupo | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("mi_cupo_de_cartel").maybeSingle();
  const d = data as { usadas: number; tope: number; sin_tope: boolean } | null;
  if (error || !d) return null;
  return { usadas: d.usadas, tope: d.tope, sinTope: d.sin_tope };
}
