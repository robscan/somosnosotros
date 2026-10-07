"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { intentarDrenarAvisos } from "@/lib/avisosWorker";
import { periodoDeVisita } from "@/lib/claseEvento";
import { esClase } from "@/lib/eventos";
import { diaLocal, localAIso, zonaSegura } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { horarioDesdeJson } from "@/lib/horarioLugar";
import {
  anotadasDe,
  claveDeSitio,
  mencionDeEvento,
  mencionDeFestival,
  nombraMuestra,
  pistasLimpias,
  sugerenciaDeExposicion,
  sugerenciaDeFestival,
  unaSugerencia,
  esApertura,
  type ExposicionPropia,
  type FestivalPropio,
  type OtroActo,
  type Publicado,
  type Sugerencia,
} from "@/lib/sugerencias";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { enlaceDeAlta } from "@/lib/armazon";

/**
 * Las sugerencias al publicar un evento (OL-323; modelo `eventos-modelo.md` §10, prototipo aceptado `eventos-superficies.html`, bitácora 314).
 * Después de publicar, «Publicado» pregunta si hay algo que sugerir (`sugerenciaAlPublicar`, solo lecturas: la publicación no espera nada) y
 * enseña una sola, en punteado. Aceptarla es una sola operación de la base (todo o nada, reintentable con la misma clave); ignorarla la anota
 * como descartada y no vuelve a salir. Solo para quien publicó el evento: nunca se liga nada ajeno ni nada se liga sin su toque.
 */

/** Cuántos días atrás se busca el otro acto del mismo festival (H4): lo publicado en los últimos 60 días. */
const DIAS_ATRAS = 60;

type FilaEvento = {
  id: string;
  slug: string | null;
  titulo: string;
  clase?: string | null;
  inicio: string;
  fin: string | null;
  zona: string;
  lugar_id: string | null;
  sitio_texto: string | null;
  sitio_reservado: boolean;
  evento_padre_id?: string | null;
  inaugura_id?: string | null;
  sugerencias?: unknown;
  creado_por: string | null;
  lugar: { nombre: string } | null;
};

const nombreDelSitio = (e: Pick<FilaEvento, "lugar" | "sitio_texto">): string | null => e.lugar?.nombre ?? e.sitio_texto ?? null;

/**
 * La sugerencia para el evento recién publicado, o null. `pistas` es lo que la pantalla sabe del cartel (la visita, si es una apertura de una
 * muestra, el festival que nombra); el título lo vuelve a leer aquí. Sin la migración de OL-321/OL-323, o si algo falla, no hay sugerencia: el
 * final se ve igual, sin ella.
 */
export async function sugerenciaAlPublicar(id: string, pistasCrudas: unknown): Promise<Sugerencia | null> {
  if (!esUuid(id)) return null;
  const { supabase, user } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  try {
    const { data } = await supabase
      .from("eventos")
      .select("id, slug, titulo, clase, inicio, fin, zona, lugar_id, sitio_texto, sitio_reservado, evento_padre_id, inaugura_id, sugerencias, creado_por, lugar:lugares(nombre)")
      .eq("id", id)
      .maybeSingle();
    const fila = data as FilaEvento | null;
    if (!fila || fila.creado_por !== user.id || !esClase(fila.clase)) return null;
    const pistas = pistasLimpias(pistasCrudas);
    const zona = zonaSegura(fila.zona);
    const hoy = diaLocal(new Date(), zona);
    const { data: inaugura } = await supabase.from("eventos").select("id").eq("inaugura_id", id).limit(1);
    const publicado: Publicado = {
      id,
      titulo: fila.titulo,
      clase: fila.clase,
      dia: diaLocal(new Date(fila.inicio), zona),
      lugar: nombreDelSitio(fila),
      sitio: claveDeSitio(fila.lugar_id, fila.sitio_texto),
      sitioReservado: fila.sitio_reservado,
      padre: fila.evento_padre_id ?? null,
      inaugura: !!inaugura?.length,
      anotadas: anotadasDe(fila.sugerencias),
    };

    // H1 / H2: solo si es una apertura que nombra una muestra (lo demás no necesita consultar nada).
    let exposicion: Sugerencia | null = null;
    if (publicado.clase === "puntual" && (pistas.apertura || esApertura(fila.titulo)) && (pistas.muestra || nombraMuestra(fila.titulo))) {
      const [{ data: quien }, { data: propias }] = await Promise.all([
        supabase.from("eventos_artistas").select("orden, artista:artistas(nombre)").eq("evento_id", id).order("orden"),
        supabase.from("eventos").select("id, slug, titulo, inicio, fin, zona, lugar_id, sitio_texto, inaugura_id").eq("creado_por", user.id).eq("clase", "exposicion").gte("termina", fila.inicio).limit(30),
      ]);
      const nombres = ((quien ?? []) as unknown as { artista: { nombre: string } | null }[]).map((q) => q.artista?.nombre).filter((n): n is string => !!n);
      const exposiciones: ExposicionPropia[] = ((propias ?? []) as (FilaEvento & { inaugura_id: string | null })[]).map((x) => ({
        id: x.id,
        slug: x.slug,
        titulo: x.titulo,
        sitio: claveDeSitio(x.lugar_id, x.sitio_texto),
        desde: diaLocal(new Date(x.inicio), zonaSegura(x.zona)),
        hasta: diaLocal(new Date(x.fin ?? x.inicio), zonaSegura(x.zona)),
        inaugurada: !!x.inaugura_id,
      }));
      exposicion = sugerenciaDeExposicion(publicado, pistas, nombres, exposiciones, hoy);
    }
    if (exposicion) return exposicion;

    // H4 / H5: solo si el título, el cartel o lo anotado nombran un festival con su edición.
    if (!mencionDeFestival(pistas.festival) && !mencionDeEvento(fila.titulo, publicado.anotadas)) return null;
    const desde = new Date(Date.now() - DIAS_ATRAS * 86400000).toISOString();
    const [{ data: recientes }, { data: marcos }] = await Promise.all([
      supabase
        .from("eventos")
        .select("id, titulo, inicio, zona, lugar_id, sitio_texto, evento_padre_id, sugerencias, lugar:lugares(nombre)")
        .eq("creado_por", user.id)
        .eq("visible", true)
        .eq("borrador", false)
        .in("clase", ["puntual", "taller"])
        .neq("id", id)
        .gte("creado_en", desde)
        .order("creado_en", { ascending: false })
        .limit(60),
      supabase.from("eventos").select("id, slug, titulo, inicio").eq("creado_por", user.id).eq("clase", "festival").order("inicio", { ascending: false }).limit(40),
    ]);
    const otros: OtroActo[] = ((recientes ?? []) as unknown as FilaEvento[]).map((o) => ({
      id: o.id,
      titulo: o.titulo,
      dia: diaLocal(new Date(o.inicio), zonaSegura(o.zona)),
      lugar: nombreDelSitio(o),
      padre: o.evento_padre_id ?? null,
      anotadas: anotadasDe(o.sugerencias),
    }));
    const festivales: FestivalPropio[] = ((marcos ?? []) as { id: string; slug: string | null; titulo: string; inicio: string }[]).map((f) => ({ ...f, actos: 0 }));
    const festival = sugerenciaDeFestival(publicado, pistas, otros, festivales);
    if (festival?.modo === "marco") {
      const { count } = await supabase.from("eventos").select("id", { count: "exact", head: true }).eq("evento_padre_id", festival.marco.id).eq("visible", true);
      festival.marco.actos = count ?? 0;
    }
    return unaSugerencia(exposicion, festival);
  } catch (e) {
    console.error("sugerenciaAlPublicar:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Lo que queda creado o ligado al aceptar: la tarjeta que sustituye a la sugerencia en punteado. */
export type Aceptada = { id: string; href: string };
export type ResultadoSugerencia = { ok: true; creado: Aceptada } | { ok: false; error: string };

const href = (id: string, slug: string | null | undefined) => `/eventos/${slug || id}`;
const ES_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Lo que cambia en las listas y las fichas al crear o ligar: el inicio, las dos fichas y la del lugar. */
function revalidar(ids: string[], lugarId: string | null) {
  revalidatePath("/");
  for (const id of ids) revalidatePath(`/eventos/${id}`);
  if (lugarId) revalidatePath(`/lugares/${lugarId}`);
}

/**
 * H1 / H2: publicar la exposición de la inauguración `id` con su nombre y sus días de visita (y, si la persona lo puso, su horario propio; si no,
 * el del lugar). La base la crea ligada en una sola operación, con sus avisos; `operacion` hace que un reintento no publique otra.
 */
export async function publicarExposicionSugerida(id: string, datos: { titulo: string; desde: string; hasta: string; horario?: string | null }, operacion: string): Promise<ResultadoSugerencia> {
  const { supabase } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  const titulo = (datos.titulo ?? "").trim().slice(0, 120);
  if (!esUuid(id) || !esUuid(operacion) || !titulo || !ES_DIA.test(datos.desde) || !ES_DIA.test(datos.hasta) || datos.hasta < datos.desde) return { ok: false, error: "Faltan los días de visita." };
  const { franjas, error: errorHorario } = datos.horario ? horarioDesdeJson(datos.horario) : { franjas: null };
  if (errorHorario) return { ok: false, error: errorHorario };
  const { data: inaug } = await supabase.from("eventos").select("zona, lugar_id").eq("id", id).maybeSingle();
  if (!inaug) return { ok: false, error: "No se pudo publicar la exposición. Intenta de nuevo." };
  const zona = zonaSegura((inaug as { zona: string }).zona);
  const { inicio, fin } = periodoDeVisita({ desde: datos.desde, hasta: datos.hasta });
  const { data, error } = await supabase.rpc("publicar_exposicion_de_inauguracion", {
    p_inauguracion: id,
    p_titulo: titulo,
    p_inicio: localAIso(inicio, zona),
    p_fin: localAIso(fin, zona),
    p_horario: franjas?.length ? franjas : null,
    p_operacion: operacion,
  });
  const hecho = data as { id: string; slug: string | null } | null;
  if (error || !hecho) return { ok: false, error: error?.code === "23505" ? "Esta inauguración ya tiene su exposición." : "No se pudo publicar la exposición. Intenta de nuevo." };
  revalidar([id, hecho.id], (inaug as { lugar_id: string | null }).lugar_id);
  after(intentarDrenarAvisos);
  return { ok: true, creado: { id: hecho.id, href: href(hecho.id, hecho.slug) } };
}

/** H1 / H2 con la exposición propia ya publicada: ligar la inauguración `id` a ella. */
export async function ligarExposicionSugerida(id: string, exposicion: string): Promise<ResultadoSugerencia> {
  const { supabase } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  if (!esUuid(id) || !esUuid(exposicion)) return { ok: false, error: "No se pudo ligar la inauguración. Intenta de nuevo." };
  const { data, error } = await supabase.rpc("ligar_inauguracion", { p_exposicion: exposicion, p_inauguracion: id });
  const hecho = data as { id: string; slug: string | null } | null;
  if (error || !hecho) return { ok: false, error: error?.code === "23505" ? "Esa exposición ya tiene su inauguración." : "No se pudo ligar la inauguración. Intenta de nuevo." };
  revalidar([id, exposicion], null);
  return { ok: true, creado: { id: hecho.id, href: href(hecho.id, hecho.slug) } };
}

/**
 * H4 / H5: relacionar el evento `id` (y `otro`, si lo hay) con su festival: el propio que ya existe (`marco`) o uno nuevo con el nombre de la
 * mención (`titulo`), que toma sus fechas del programa registrado. Una sola operación; `operacion` es la clave del festival nuevo.
 */
export async function relacionarFestivalSugerido(id: string, datos: { otro: string | null; marco: string | null; titulo: string }, operacion: string): Promise<ResultadoSugerencia & { actos?: number }> {
  const { supabase } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  const actos = [id, datos.otro].filter((x): x is string => !!x && esUuid(x));
  const titulo = (datos.titulo ?? "").trim().slice(0, 120);
  if (!esUuid(id) || (datos.marco && !esUuid(datos.marco)) || (!datos.marco && (!titulo || !esUuid(operacion)))) return { ok: false, error: "No se pudo relacionar. Intenta de nuevo." };
  const { data, error } = await supabase.rpc("relacionar_en_festival", { p_eventos: actos, p_marco: datos.marco, p_titulo: datos.marco ? null : titulo, p_operacion: datos.marco ? null : operacion });
  const hecho = data as { id: string; slug: string | null; actos: number } | null;
  if (error || !hecho) return { ok: false, error: "No se pudo relacionar con el festival. Intenta de nuevo." };
  revalidar([...actos, hecho.id], null);
  return { ok: true, creado: { id: hecho.id, href: href(hecho.id, hecho.slug) }, actos: hecho.actos };
}

/**
 * Ignorar no es confirmar (modelo §10): la sugerencia que se dejó sin tocar se anota como descartada para ese evento y no vuelve a salir; la de
 * un festival guarda su clave, así un tercer acto no vuelve a ofrecer la misma agrupación. Sigue disponible desde editar («Parte de un
 * festival», «Inauguración»). Sin respuesta que esperar: si falla, a lo más se volvería a ofrecer.
 */
export async function descartarSugerencia(id: string, tipo: "exposicion" | "festival", clave: string | null = null): Promise<void> {
  if (!esUuid(id) || (tipo !== "exposicion" && tipo !== "festival")) return;
  const { supabase } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  const { error } = await supabase.rpc("anotar_sugerencia", { p_evento: id, p_tipo: tipo, p_estado: "descartada", p_clave: typeof clave === "string" ? clave.slice(0, 200) : null });
  if (error) console.error("descartarSugerencia:", error.message);
}
