"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { cartelDescargable } from "@/lib/cartelDescarga";
import { configPublica } from "@/lib/config";
import { diaConMes, diaLargo, diaLocal, horaCorta, horaDeReloj } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { avisoPrevio, conversacionDe, saludoDe, type ArtistaDestacado, type LugarDestacado } from "@/lib/instagram/destacado";
import { lineaDeSenal, porSenal } from "@/lib/instagram/elegir";
import { cargarFicha, cargarSemana as cargarSemanaParaPublicar, textoDeSemana } from "@/lib/instagram/ficha";
import { estadoDelDia, lineaCandidato, lunesDe, motivoDe, motivoDeEvento, nombreDelDia, razonDelPedido, REGLA, diaIso, type Candidato, type EstadoDia, type EventoCandidato, type TipoDia } from "@/lib/instagram/semana";
import { revisarTexto, type EventoIg } from "@/lib/instagram/texto";
import { LARGO_CUERPO, LARGO_TITULO, recortar } from "@/lib/avisos";
import { avisarAlTelefono } from "@/lib/redes/herramientas";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cargarParaHoja } from "./datos";
import { candidatos, cartelPublicable, comoCliente, leerDia, sugerenciaDelDia, zonaDeCiudad, type FilaDia } from "./semana";

/**
 * Lo que hace la hoja de un día de la semana de Instagram (OL-479; firmada en el prototipo de OL-477, bitácora 509): prepararla, «Cambiar» (los
 * candidatos y elegir uno), «Quitar de la semana», «Publicar ahora», guardar lo que se cambió (el texto, la etiqueta, Facebook), el aviso previo
 * («Copiar y abrir su Instagram», «Dijo que no») y «Volver a poner» desde la ficha. Solo la administración: se comprueba aquí y la base lo vuelve a
 * comprobar (las funciones `instagram_semana_*`).
 */

async function sesionAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  return clienteServidor();
}
type Supabase = NonNullable<Awaited<ReturnType<typeof sesionAdmin>>>;

/** Lo que la hoja enseña según qué sale ese día. */
export type ContenidoDia =
  | { tipo: "artista"; datos: ArtistaDestacado; cuenta: string | null }
  | { tipo: "lugar"; datos: LugarDestacado; cuenta: string | null }
  | { tipo: "evento"; eventoId: string; evento: EventoIg; conCartel: boolean }
  | { tipo: "semana"; texto: string; imagenes: number }
  | { tipo: "descanso" };

export type PreparadoDia =
  | {
      ok: true;
      id: string;
      tipo: TipoDia;
      /** «Hoy · 7:00 pm · Lugar». */
      titulo: string;
      nombre: string;
      /** Por qué lo eligió el sistema (o «Elegido a mano»). */
      por: string | null;
      estado: EstadoDia;
      /** Se puede cambiar, quitar o publicar ahora (no ha salido ni se está publicando). */
      abierto: boolean;
      /** El día del renglón, dicho para las frases: «hoy», «el lunes 12». */
      cuandoSale: string;
      hora: string | null;
      contenido: ContenidoDia;
      /** Lo que se dejó en la hoja antes (el texto, las cuentas que no se etiquetan, Facebook). */
      guardado: { texto: string | null; quitadas: string[]; facebook: boolean };
      ubicacion: { nombre: string } | null;
      ciudad: { slug: string; nombre: string };
      /** El aviso previo (artistas y lugares con Instagram que no han salido). */
      aviso: { cuenta: string; mensaje: string; abrir: string; en: string | null; dijoNo: boolean } | null;
      publicado: { instagram: string | null; facebook: string | null; historia: string | null; cuando: string | null; sinCoautor: boolean; fallo: string | null } | null;
      medida: { visitas: number; van: number } | null;
      reemplaza: string | null;
      ahora: string;
      zona: string;
    }
  | { ok: false; mensaje: string };

/** «hoy», «mañana» o «el lunes 12»: el día en las frases de la hoja. */
function cuandoEnFrase(fecha: string, ahora: Date, zona: string): string {
  const n = nombreDelDia(fecha, ahora, zona);
  if (n === "Hoy" || n === "Mañana") return n.toLowerCase();
  return `el ${diaLargo(fecha, ahora, zona).replace(/ de \S+( de \d+)?$/, "")}`;
}

type TrabajoDia = { id: string; estado: string; siguiente_en: string; pedido: Record<string, unknown> | null; resultado: { instagram?: { permalink?: string | null; sinCoautor?: boolean }; facebook?: { ok?: boolean; permalink?: string | null; mensaje?: string } | null; historia?: { ok: boolean; permalink: string | null }; mensaje?: string } | null; terminado_en: string | null; error: string | null };

/** Prepara la hoja de un día. */
export async function prepararDia(id: string): Promise<PreparadoDia> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const d = await leerDia(s, id);
  if (!d) return { ok: false, mensaje: "No encontramos ese día." };
  const ahora = new Date();
  const zona = await zonaDeCiudad(s, d.ciudad);
  const [trabajo, ciudad, resultado] = await Promise.all([
    d.trabajo_id ? s.from("redes_trabajos").select("id, estado, siguiente_en, pedido, resultado, terminado_en, error").eq("id", d.trabajo_id).maybeSingle<TrabajoDia>() : Promise.resolve({ data: null }),
    s.from("ciudades").select("nombre").eq("slug", d.ciudad).maybeSingle<{ nombre: string }>(),
    d.estado === "publicado" ? s.rpc("instagram_resultado", { p_casillas: [d.id] }) : Promise.resolve({ data: null }),
  ]);
  const t = trabajo.data;
  const estado = estadoDelDia({ estado: d.estado, tipo: d.tipo, fecha: d.fecha, programado_para: d.programado_para, trabajo: t }, ahora, zona);
  const abierto = ["programado", "hoy", "quitado", "sin", "fallido"].includes(estado);
  const n = diaIso(d.fecha);
  const nombreTipo = d.tipo === "descanso" ? "Descanso" : d.tipo === REGLA[n].tipo ? REGLA[n].nombre : d.tipo === "lugar" ? "Lugar" : d.tipo === "artista" ? "Artista" : "Evento del día";
  const titulo = [nombreDelDia(d.fecha, ahora, zona), d.hora ? horaDeReloj(d.hora) : null, nombreTipo].filter(Boolean).join(" · ");
  const pedido = (t?.pedido ?? {}) as { texto?: unknown; quitadas?: unknown; facebook?: unknown };
  const guardado = {
    texto: typeof pedido.texto === "string" && pedido.texto.trim() ? pedido.texto : null,
    quitadas: Array.isArray(pedido.quitadas) ? pedido.quitadas.filter((x): x is string => typeof x === "string") : [],
    facebook: pedido.facebook !== false,
  };
  let contenido: ContenidoDia = { tipo: "descanso" };
  let nombre = "Sin publicación";
  let ubicacion: { nombre: string } | null = null;
  let cuenta: string | null = null;
  let slug: string | null = null;
  let grupo = false;
  if (d.tipo === "artista" || d.tipo === "lugar") {
    const f = await cargarFicha(comoCliente(s), d.tipo, (d.artista_id ?? d.lugar_id)!, ahora, d.fecha);
    if (!f) return { ok: false, mensaje: "Esa ficha ya no existe." };
    nombre = f.nombre;
    cuenta = f.cuenta;
    slug = f.slug;
    grupo = f.grupo;
    ubicacion = f.ubicacion ? { nombre: f.ubicacion.nombre } : null;
    contenido = d.tipo === "artista" ? { tipo: "artista", datos: f.datos as ArtistaDestacado, cuenta } : { tipo: "lugar", datos: f.datos as LugarDestacado, cuenta };
  } else if (d.tipo === "evento" && d.evento_id) {
    const h = await cargarParaHoja(s, d.evento_id, ahora);
    if (!h) return { ok: false, mensaje: "Ese evento ya no existe." };
    nombre = h.titulo;
    ubicacion = h.ubicacion ? { nombre: h.ubicacion.nombre } : null;
    contenido = { tipo: "evento", eventoId: h.id, evento: h.evento, conCartel: !!h.imagen };
  } else if (d.tipo === "semana") {
    const sem = await cargarSemanaParaPublicar(comoCliente(s), d.eventos ?? [], ahora);
    nombre = sem?.titulo ?? "Esta semana";
    ubicacion = sem?.ubicacion ? { nombre: sem.ubicacion.nombre } : null;
    contenido = { tipo: "semana", texto: sem ? textoDeSemana(sem, ahora) : "", imagenes: 1 + (sem?.eventos.filter((e) => e.imagen).length ?? 0) };
  }
  const cuandoSale = cuandoEnFrase(d.fecha, ahora, zona);
  const aviso =
    (d.tipo === "artista" || d.tipo === "lugar") && cuenta && slug && estado !== "publicado"
      ? {
          cuenta,
          mensaje: avisoPrevio({ saludo: saludoDe(nombre, grupo), dia: diaLargo(d.fecha, ahora, zona), tipo: d.tipo, ficha: `somosnosotrxs.org/${d.tipo === "artista" ? "artistas" : "lugares"}/${slug}` }),
          abrir: conversacionDe(cuenta),
          en: d.aviso_en,
          dijoNo: !!d.dijo_no_en,
        }
      : null;
  const r = t?.resultado ?? null;
  const m = ((resultado.data ?? []) as { visitas: number; van: number }[])[0] ?? null;
  return {
    ok: true,
    id: d.id,
    tipo: d.tipo,
    titulo,
    nombre,
    por: d.elegido_por === "persona" ? (d.motivo ?? "Elegido a mano.") : d.motivo,
    estado,
    abierto,
    cuandoSale,
    hora: d.hora,
    contenido,
    guardado,
    ubicacion,
    ciudad: { slug: d.ciudad, nombre: ciudad.data?.nombre ?? d.ciudad },
    aviso,
    publicado:
      estado === "publicado" || estado === "fallido"
        ? {
            instagram: r?.instagram?.permalink ?? null,
            facebook: r?.facebook?.ok ? (r.facebook.permalink ?? null) : null,
            historia: r?.historia?.ok ? r.historia.permalink : null,
            cuando: t?.terminado_en ? `${diaConMes(t.terminado_en, ahora, zona)}, ${horaCorta(t.terminado_en, zona)}` : null,
            sinCoautor: !!r?.instagram?.sinCoautor,
            fallo: estado === "fallido" ? (r?.mensaje ?? "No se pudo publicar.") : null,
          }
        : null,
    medida: m ? { visitas: m.visitas, van: m.van } : null,
    reemplaza: d.reemplaza,
    ahora: ahora.toISOString(),
    zona,
  };
}

export type Candidatos =
  | { ok: true; titulo: string; nota: string; lista: { id: string; nombre: string; foto: string | null; linea: string; redonda: boolean; href: string }[]; fuera: string | null }
  | { ok: false; mensaje: string };

/** Los candidatos de «Cambiar» para un día, en el orden de la regla, con por qué; y quién no entra. */
export async function candidatosDia(id: string): Promise<Candidatos> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const d = await leerDia(s, id);
  if (!d) return { ok: false, mensaje: "No encontramos ese día." };
  const ahora = new Date();
  const zona = await zonaDeCiudad(s, d.ciudad);
  const dia = nombreDelDia(d.fecha, ahora, zona);
  const titulo = `Cambiar ${dia === "Hoy" || dia === "Mañana" ? dia.toLowerCase() : `el ${diaLargo(d.fecha, ahora, zona).replace(/ de \S+( de \d+)?$/, "")}`}`;
  if (d.tipo === "evento") {
    const { data } = await s.rpc("instagram_sugerencias", { p_ciudad: d.ciudad, p_dias: 14 });
    const lista = ((data ?? []) as EventoCandidato[])
      // OL-488: solo con material: un evento sin cartel (o con uno que la app no puede bajar) no entra a «Cambiar».
      .filter((e) => e.id !== d.evento_id && e.clase !== "festival" && diaLocal(new Date(e.inicio), e.zona) === d.fecha && cartelPublicable(e))
      .sort((a, b) => porSenal({ ...a, conCartel: !!a.imagen }, { ...b, conCartel: !!b.imagen }))
      .slice(0, 20)
      .map((e) => ({ id: e.id, nombre: e.titulo, foto: e.imagen, linea: lineaDeSenal({ destacado: e.destacado, van: e.van, interesa: e.interesa, conCartel: !!e.imagen, inicio: e.inicio }), redonda: false, href: `/eventos/${e.slug ?? e.id}` }));
    return { ok: true, titulo, nota: "Los eventos de ese día con cartel, primero los de más señal (destacados, «Voy» y «Me interesa»).", lista, fuera: null };
  }
  const tipo = d.tipo === "descanso" ? "lugar" : d.tipo === "lugar" ? "lugar" : "artista";
  if (d.tipo === "semana") return { ok: false, mensaje: "«Esta semana» lleva los eventos del fin con más señal; se arma sola." };
  const todos = await candidatos(s, d.ciudad, tipo, lunesDe(d.fecha));
  const mios = (c: Candidato) => c.id === d.artista_id || c.id === d.lugar_id;
  const libres = todos.filter((c) => !c.ocupado_en && !mios(c)).slice(0, 30);
  const ocupados = todos.filter((c) => c.ocupado_en && !mios(c)).slice(0, 3);
  const nota =
    tipo === "artista"
      ? `Van primero quienes tienen fecha en los próximos 30 días y luego los de ${(await s.from("ciudades").select("nombre").eq("slug", d.ciudad).maybeSingle<{ nombre: string }>()).data?.nombre ?? "la ciudad"}. Solo fichas completas (foto, portada, descripción e Instagram), nadie que haya salido en los últimos 6 meses ni que haya dicho que no.`
      : "Van primero los lugares con eventos esa semana y luego los de la ciudad. Solo fichas completas (portada y descripción), nadie que haya salido en los últimos 6 meses ni que haya dicho que no.";
  const fuera = ocupados.length ? `${ocupados.map((c) => `${c.nombre} ya va el ${diaConMes(`${c.ocupado_en}T18:00:00Z`, ahora, zona).replace(/ de \S+$/, "")}`).join("; ")}.` : null;
  return { ok: true, titulo, nota, lista: libres.map((c) => ({ id: c.id, nombre: c.nombre, foto: tipo === "artista" ? c.foto : c.portada, linea: lineaCandidato(c, ahora), redonda: tipo === "artista", href: `/${tipo === "artista" ? "artistas" : "lugares"}/${c.slug}` })), fuera };
}

export type Hecho = { ok: true } | { ok: false; mensaje: string };
const NO_SE_PUDO: Hecho = { ok: false, mensaje: "No se pudo guardar. Intenta de nuevo." };
/** Lo que dice la base cuando no se puede, en una frase llana. */
const frase = (e: { code?: string; message?: string } | null): Hecho =>
  e?.code === "55000"
    ? { ok: false, mensaje: "Ese día ya salió en Instagram (o se está publicando): ya no se cambia." }
    : e?.code === "22023" && /material/.test(e.message ?? "")
      ? { ok: false, mensaje: "A esa ficha le falta su foto o su portada: súbela o pídesela en «Falta material»." }
      : e?.code === "22023"
        ? { ok: false, mensaje: "Eso no se puede poner ese día." }
        : NO_SE_PUDO;

/** Pide el primer intento enseguida (sin esperar al latido), como «Publicar» de la hoja de hoy. */
async function empujar() {
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => dispararPaso(origen, { ruta: "/api/redes/correr" }));
  } catch {
    console.warn("redes: no se pudo pedir el primer intento; lo toma el latido");
  }
}

/** Pone otra ficha (o evento) en un día. */
async function poner(s: Supabase, d: FilaDia, tipo: "artista" | "lugar" | "evento", fichaId: string, reemplaza: string | null = null): Promise<Hecho> {
  const ahora = new Date();
  let motivo = "Elegido a mano.";
  if (tipo === "evento") {
    const { data } = await s.rpc("instagram_sugerencias", { p_ciudad: d.ciudad, p_dias: 14 });
    const e = ((data ?? []) as EventoCandidato[]).find((x) => x.id === fichaId);
    if (e) motivo = motivoDeEvento(e);
  } else {
    const c = (await candidatos(s, d.ciudad, tipo, lunesDe(d.fecha))).find((x) => x.id === fichaId);
    if (c) motivo = motivoDe(c, tipo, d.fecha, ahora);
  }
  const { error } = await s.rpc("instagram_semana_cambiar", { p_casilla: d.id, p_tipo: tipo, p_ficha: fichaId, p_motivo: motivo, p_reemplaza: reemplaza });
  return error ? frase(error) : { ok: true };
}

/** «Cambiar»: elige otra ficha (o evento) para el día. */
export async function cambiarDia(id: string, fichaId: string): Promise<Hecho> {
  const s = esUuid(id) && esUuid(fichaId) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const d = await leerDia(s, id);
  if (!d || d.tipo === "semana") return NO_SE_PUDO;
  return poner(s, d, d.tipo === "descanso" ? "lugar" : d.tipo, fichaId);
}

/** «Poner un lugar este domingo»: el siguiente lugar de la rotación. */
export async function ponerLugarDia(id: string): Promise<Hecho> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const d = await leerDia(s, id);
  if (!d || d.tipo !== "descanso") return NO_SE_PUDO;
  const c = (await candidatos(s, d.ciudad, "lugar", lunesDe(d.fecha))).find((x) => !x.ocupado_en);
  if (!c) return { ok: false, mensaje: "No hay otro lugar con la ficha completa por salir." };
  return poner(s, d, "lugar", c.id);
}

/** «Quitar de la semana». */
export async function quitarDia(id: string): Promise<Hecho> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const { error } = await s.rpc("instagram_semana_quitar", { p_casilla: id });
  return error ? frase(error) : { ok: true };
}

/** «Volver a programar» un día quitado: la misma ficha, a su hora. */
export async function volverAProgramarDia(id: string): Promise<Hecho> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const d = await leerDia(s, id);
  // «Esta semana» no se cambia de ficha: quitada, solo sale con «Publicar ahora».
  if (!d || d.estado !== "quitado" || d.tipo === "semana") return NO_SE_PUDO;
  const ficha = d.artista_id ?? d.lugar_id ?? d.evento_id;
  return ficha && d.tipo !== "descanso" ? poner(s, d, d.tipo, ficha) : NO_SE_PUDO;
}

export type PedidoDia = { texto: string | null; quitadas: string[]; facebook: boolean };
const limpio = (p: PedidoDia) => ({
  texto: typeof p?.texto === "string" && p.texto.trim() ? p.texto.trim().slice(0, 5000) : null,
  quitadas: Array.isArray(p?.quitadas) ? p.quitadas.filter((x) => typeof x === "string").slice(0, 60) : [],
  facebook: p?.facebook !== false,
});

/** Guarda lo que se cambió en la hoja (sale solo a su hora con eso). */
export async function guardarDia(id: string, p: PedidoDia): Promise<Hecho> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const q = limpio(p);
  if (q.texto) {
    const r = revisarTexto(q.texto);
    if (r.problema) return { ok: false, mensaje: r.problema };
  }
  const { error } = await s.rpc("instagram_semana_texto", { p_casilla: id, p_texto: q.texto, p_quitadas: q.quitadas, p_facebook: q.facebook });
  return error ? frase(error) : { ok: true };
}

/** «Publicar ahora»: sale ya, con lo de la hoja. */
export async function publicarDiaAhora(id: string, p: PedidoDia): Promise<Hecho> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración publica en Instagram." };
  const q = limpio(p);
  if (q.texto) {
    const r = revisarTexto(q.texto);
    if (r.problema) return { ok: false, mensaje: r.problema };
  }
  const { error } = await s.rpc("instagram_semana_ahora", { p_casilla: id, p_pedido: q });
  if (error) return frase(error);
  await empujar();
  return { ok: true };
}

/** «Copiar y abrir su Instagram»: queda anotado que se avisó. */
export async function avisadoDia(id: string): Promise<Hecho> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const { error } = await s.rpc("instagram_semana_avisado", { p_casilla: id });
  return error ? frase(error) : { ok: true };
}

/** «Sí, sacarlo de Instagram»: fuera de Instagram, y su día lo toma el siguiente de la rotación (o se quita, si no hay nadie). */
export async function dijoQueNoDia(id: string): Promise<Hecho & { siguiente?: string | null }> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const d = await leerDia(s, id);
  if (!d || (d.tipo !== "artista" && d.tipo !== "lugar")) return NO_SE_PUDO;
  const { data: nombre, error } = await s.rpc("instagram_semana_dijo_no", { p_casilla: id });
  if (error) return frase(error);
  const siguiente = (await candidatos(s, d.ciudad, d.tipo, lunesDe(d.fecha))).find((c) => !c.ocupado_en && c.id !== d.artista_id && c.id !== d.lugar_id);
  if (!siguiente) {
    await s.rpc("instagram_semana_quitar", { p_casilla: id });
    return { ok: true, siguiente: null };
  }
  const r = await poner(s, d, d.tipo, siguiente.id, typeof nombre === "string" ? nombre : null);
  return r.ok ? { ok: true, siguiente: siguiente.nombre } : r;
}

/** «Volver a poner» desde el «···» de la ficha: vuelve a entrar en la rotación. */
export async function volverAPonerEnInstagram(tipo: "artista" | "lugar", fichaId: string): Promise<Hecho> {
  const s = esUuid(fichaId) && (tipo === "artista" || tipo === "lugar") ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const { error } = await s.from("instagram_fuera").delete().eq(tipo === "artista" ? "artista_id" : "lugar_id", fichaId);
  return error ? NO_SE_PUDO : { ok: true };
}

// ---------- OL-488 (bitácora 520): un día sin publicación, «Falta material», «Pedírselo» y «Subir yo» ----------

/** Lo que dice la base cuando no se puede programar una sugerencia: sus frases ya son llanas («Esa hora ya pasó: publícalo ahora.»). */
const fraseDeProgramar = (e: { code?: string; message?: string } | null): Hecho =>
  e?.code === "23505" ? { ok: false, mensaje: "Ese día ya tiene su publicación." } : e?.code === "22023" && e.message ? { ok: false, mensaje: e.message } : NO_SE_PUDO;

/**
 * «Programar» (a su hora) o «Publicar ahora» (solo hoy) lo que sugiere la regla para un día sin publicación de esta semana: se vuelve a calcular
 * aquí con la misma función que la pantalla (`sugerenciaDelDia`) y la base comprueba el material, el día y la hora (`instagram_semana_programar`).
 */
export async function programarSugerencia(ciudad: string, fecha: string, ahora: boolean): Promise<Hecho> {
  const s = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(ciudad) && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const c = await sugerenciaDelDia(s, ciudad, fecha);
  if (!c) return { ok: false, mensaje: "Ya no hay nadie con material para ese día. Vuelve a abrir la semana." };
  const { error } = await s.rpc("instagram_semana_programar", { p_ciudad: ciudad, p_casilla: c, p_ahora: ahora === true });
  if (error) return fraseDeProgramar(error);
  if (ahora === true) await empujar();
  return { ok: true };
}

/**
 * El aviso de «Pedírselo» a quien lleva la ficha, con la forma de los avisos de la app (OL-480): el título es el nombre de la ficha y la razón va
 * debajo («Completa tu portada y te presentamos en Instagram»); abre la edición de su ficha.
 */
function avisoDeMaterial(nombre: string, falta: readonly string[], ficha: string, id: string) {
  return { titulo: recortar(nombre, LARGO_TITULO), cuerpo: recortar(razonDelPedido(falta), LARGO_CUERPO), url: `${ficha}/editar`, tag: `material-${id}` };
}

/**
 * «Pedírselo»: a quien lleva la ficha le llega, una sola vez por semana, el aviso dentro de la app (Novedades) y al teléfono. La base lo anota y
 * dice a quién (`instagram_pedir_material`); aquí sale el aviso al teléfono, después de contestar.
 */
export async function pedirMaterial(tipo: "artista" | "lugar", id: string, lunes: string): Promise<Hecho> {
  const s = esUuid(id) && (tipo === "artista" || tipo === "lugar") && /^\d{4}-\d{2}-\d{2}$/.test(lunes) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const { data: para, error } = await s.rpc("instagram_pedir_material", { p_tipo: tipo, p_ficha: id, p_desde: lunes });
  if (error) {
    if (error.code === "23505") return { ok: false, mensaje: "Ya se lo pedimos esta semana." };
    if (error.code === "P0002") return { ok: false, mensaje: "Nadie lleva esa ficha todavía: súbela tú." };
    return error.code === "22023" && error.message ? { ok: false, mensaje: error.message } : NO_SE_PUDO;
  }
  const { data: f } = await s.from(tipo === "artista" ? "artistas" : "lugares").select(tipo === "artista" ? "slug, nombre, foto, portada" : "slug, nombre, portada").eq("id", id).maybeSingle<{ slug: string; nombre: string; foto?: string | null; portada: string | null }>();
  const admin = clienteAdmin();
  const destinos = Array.isArray(para) ? (para as string[]) : [];
  if (f && admin && destinos.length) {
    const url = configPublica().supabaseUrl;
    const falta = [...(tipo === "artista" && !cartelDescargable(f.foto ?? null, url) ? ["foto"] : []), ...(!cartelDescargable(f.portada, url) ? ["portada"] : [])];
    const aviso = avisoDeMaterial(f.nombre, falta, `/${tipo === "artista" ? "artistas" : "lugares"}/${f.slug}`, id);
    after(() => Promise.all(destinos.map((u) => avisarAlTelefono(admin, u, aviso))).then(() => undefined));
  }
  revalidatePath("/admin/instagram");
  return { ok: true };
}

/**
 * «Subir yo»: la foto o la portada que subió la administración desde la hoja de «Falta material» (ya en el Storage de la app; el teléfono la
 * reduce antes, OL-352). Solo se aceptan imágenes del Storage propio (lo único que la tarjeta puede dibujar) y solo esas dos columnas.
 */
export async function ponerMaterial(tipo: "artista" | "lugar", id: string, imagenes: { foto?: string | null; portada?: string | null }): Promise<Hecho> {
  const s = esUuid(id) && (tipo === "artista" || tipo === "lugar") ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración maneja la semana de Instagram." };
  const url = configPublica().supabaseUrl;
  const cambios: Record<string, string> = {};
  for (const campo of tipo === "artista" ? (["foto", "portada"] as const) : (["portada"] as const)) {
    const valor = imagenes?.[campo];
    if (valor === undefined || valor === null) continue;
    if (typeof valor !== "string" || !cartelDescargable(valor, url)) return { ok: false, mensaje: "La imagen no se subió bien. Intenta de nuevo." };
    cambios[campo] = valor;
  }
  if (!Object.keys(cambios).length) return { ok: false, mensaje: "Elige una imagen." };
  const { data, error } = await s.from(tipo === "artista" ? "artistas" : "lugares").update(cambios).eq("id", id).select("id, slug").maybeSingle<{ id: string; slug: string }>();
  if (error || !data) return NO_SE_PUDO;
  const ruta = `/${tipo === "artista" ? "artistas" : "lugares"}`;
  revalidatePath(`${ruta}/${data.slug}`);
  revalidatePath(ruta);
  revalidatePath("/admin/instagram");
  return { ok: true };
}
