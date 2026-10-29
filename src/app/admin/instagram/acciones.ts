"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { esUuid } from "@/lib/formulario";
import { leerPagina, paginaDeEnlace } from "@/lib/instagram/api";
import { sePuedePublicar } from "@/lib/instagram/elegir";
import { bajarCartel, convieneRecortar } from "@/lib/instagram/imagen";
import { revisarTexto } from "@/lib/instagram/texto";
import { FRASES, FRASES_FACEBOOK, type ClaveError } from "@/lib/instagram/frases";
import { leerEstadoTrabajo, leerReciente, type EstadoTrabajo, type Reciente } from "@/lib/redes/reglas";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cargarParaHoja } from "./datos";
import type { EventoIg } from "@/lib/instagram/texto";

/**
 * Publicar en Instagram desde Administración (OL-458, firmado; bitácora 490): lo que pide la hoja de vista previa (`prepararInstagram`), publicar
 * (`publicarEnInstagram`) y guardar la ubicación de una ciudad o de un lugar (`guardarUbicacionInstagram`). Solo la administración: se comprueba
 * aquí y la base lo vuelve a comprobar (RLS). El token de Instagram nunca sale del servidor (`lib/instagram/api`).
 * OL-461 (bitácora 493): el espejo en la página de Facebook («También en Facebook»; «Reintentar en Facebook» y «Publicar en Facebook»).
 * OL-464 (bitácora 496): un festival con carteles en sus actos se publica como carrusel (y en Facebook como una publicación con varias fotos).
 *
 * OL-465 (bitácora 497): publicar va en segundo plano. «Publicar» ya no espera a Instagram: guarda un trabajo en la cola (`redes_encolar`, con
 * todo lo decidido en la hoja) y responde enseguida; la hoja se cierra y el renglón dice «Publicando…». Lo trabaja `/api/redes/correr`
 * (`lib/redes/trabajar`): el primer intento empieza en seguida (`after()` pide la ruta) y el latido de Supabase recoge lo que falte; al terminar,
 * el aviso al teléfono. Si ese evento con ese formato ya está en camino o salió hace menos de 15 minutos, no se guarda otro sin confirmar.
 */

/** La sesión, solo si es de la administración (como `soloAdmin` del panel: el rol de su perfil). */
async function sesionAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  const supabase = await clienteServidor();
  return supabase ? { supabase, user: { id: actual.perfil.id } } : null;
}

type Supabase = NonNullable<Awaited<ReturnType<typeof sesionAdmin>>>["supabase"];

export type Preparado =
  | {
      ok: true;
      id: string;
      titulo: string;
      evento: EventoIg;
      etiquetas: string[];
      ubicacion: { nombre: string } | null;
      ciudad: { slug: string; nombre: string };
      conCartel: boolean;
      recortar: boolean;
      sePuede: boolean;
      publicado: { cuando: string; formato: "4x5" | "9x16" | "carrusel" } | null;
      ahora: string;
      /** Las imágenes posibles del carrusel, en su orden (la hoja las dibuja con `/api/instagram/<id>?imagen=<clave>`); vacío: una imagen. */
      carrusel: { clave: string; titulo: string }[];
      /** OL-465: el último trabajo de este evento en las últimas 24 horas (en camino o lo que pasó), y si cada formato está en camino o recién salió. */
      trabajo: EstadoTrabajo | null;
      reciente: { "4x5": Reciente | null; "9x16": Reciente | null };
    }
  | { ok: false; mensaje: string };

/** El último trabajo de un evento en las últimas 24 horas. */
/** OL-479: un trabajo que la semana de Instagram programó para más tarde (en cola, con su día y con su hora por delante) no está en camino. */
const sinProgramados = (ahora: Date) => `pedido->>casilla.is.null,siguiente_en.lte.${new Date(ahora.getTime() + 60_000).toISOString()},estado.neq.en_cola`;

async function ultimoTrabajo(supabase: Supabase, eventoId: string, ahora: Date): Promise<EstadoTrabajo | null> {
  const { data } = await supabase
    .from("redes_trabajos")
    .select("id, red, formato, estado, pedido, resultado, error")
    .eq("evento_id", eventoId)
    .gte("creado_en", new Date(ahora.getTime() - 86_400_000).toISOString())
    .or(sinProgramados(ahora))
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle<Record<string, unknown>>();
  return leerEstadoTrabajo(data);
}

const reciente = async (supabase: Supabase, eventoId: string, red: "instagram" | "facebook", formato: "4x5" | "9x16"): Promise<Reciente | null> => {
  const { data, error } = await supabase.rpc("redes_reciente", { p_evento: eventoId, p_red: red, p_formato: formato });
  const r = error ? null : leerReciente(data);
  if (r?.estado !== "publicando") return r;
  // OL-479: `redes_reciente` cuenta como «en camino» lo que la semana programó para más tarde; si eso es todo lo que hay, no se está publicando
  // (y si se publica ahora, el día de la semana ya no lo repite: el trabajador lo ve publicado).
  const ahora = new Date();
  const { data: vivos } = await supabase.from("redes_trabajos").select("id").eq("evento_id", eventoId).in("estado", ["en_cola", "publicando"]).or(sinProgramados(ahora)).limit(1);
  return vivos?.length ? r : null;
};

/** Lo que la hoja necesita para un evento: el texto se arma en el teléfono con el mismo código (`armarTexto`) para quitar etiquetas al momento. */
export async function prepararInstagram(eventoId: string): Promise<Preparado> {
  const s = esUuid(eventoId) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración publica en Instagram." };
  const ahora = new Date();
  const h = await cargarParaHoja(s.supabase, eventoId, ahora);
  if (!h) return { ok: false, mensaje: "No encontramos ese evento." };
  const [cartel, trabajo, r4x5, r9x16] = await Promise.all([bajarCartel(h.imagen), ultimoTrabajo(s.supabase, h.id, ahora), reciente(s.supabase, h.id, "instagram", "4x5"), reciente(s.supabase, h.id, "instagram", "9x16")]);
  return {
    ok: true,
    id: h.id,
    titulo: h.titulo,
    evento: h.evento,
    etiquetas: h.etiquetas,
    ubicacion: h.ubicacion ? { nombre: h.ubicacion.nombre } : null,
    ciudad: h.ciudad,
    conCartel: !!cartel,
    recortar: !!cartel && convieneRecortar(cartel.ancho, cartel.alto),
    sePuede: h.sePuede,
    publicado: h.publicado,
    ahora: ahora.toISOString(),
    carrusel: h.carrusel.map((i) => ({ clave: i.clave, titulo: i.titulo })),
    trabajo,
    reciente: { "4x5": r4x5, "9x16": r9x16 },
  };
}

/** Cómo va un trabajo (la hoja lo pregunta cada 20 s mientras está en camino, y al volver a la app). */
export async function estadoTrabajo(id: string): Promise<EstadoTrabajo | null> {
  const s = esUuid(id) ? await sesionAdmin() : null;
  if (!s) return null;
  const { data } = await s.supabase.from("redes_trabajos").select("id, red, formato, estado, pedido, resultado, error").eq("id", id).maybeSingle<Record<string, unknown>>();
  return leerEstadoTrabajo(data);
}

/** `imagenes`: las claves del carrusel en el orden de la hoja (OL-464); sin ellas, una imagen como siempre. `repetir`: ya se confirmó (OL-465). */
export type PedidoPublicar = { eventoId: string; formato: "4x5" | "9x16"; recorte: boolean; diseno: number; texto: string | null; quitadas: string[]; facebook?: boolean; imagenes?: string[]; repetir?: boolean };
/**
 * Lo que responde «Publicar» (OL-465): en la cola (la hoja se cierra), repetido (la hoja pide confirmar), o por qué no se guardó.
 * `yaEstaba`: en Facebook, si esa publicación ya estaba en la página (no se guarda otro trabajo).
 */
export type Encolado = { ok: true; id: string | null; yaEstaba?: boolean } | { ok: false; duplicado: Reciente } | { ok: false; error: ClaveError; mensaje: string };

/** El evento, ligero (sin bajar carteles): para comprobar que sigue por venir antes de guardar el trabajo. */
async function porVenir(supabase: Supabase, eventoId: string, ahora: Date): Promise<boolean | null> {
  const { data: e } = await supabase
    .from("eventos")
    .select("inicio, termina, zona, clase, visible, cancelado, borrador, retirado_por_admin, sesiones:eventos_sesiones(inicio)")
    .eq("id", eventoId)
    .maybeSingle<{ inicio: string; termina: string; zona: string; clase: string; visible: boolean; cancelado: boolean; borrador: boolean; retirado_por_admin: boolean; sesiones: { inicio: string }[] | null }>();
  return e ? sePuedePublicar(e, ahora) : null;
}

/** Guarda el trabajo y pide el primer intento enseguida (sin esperar al latido). */
async function encolar(supabase: Supabase, eventoId: string, red: "instagram" | "facebook", formato: "4x5" | "9x16", pedido: Record<string, unknown>, repetir: boolean): Promise<Encolado> {
  const { data, error } = await supabase.rpc("redes_encolar", { p_evento: eventoId, p_red: red, p_formato: formato, p_pedido: pedido, p_repetir: repetir });
  const r = (data ?? {}) as { id?: string; duplicado?: unknown };
  if (error || (!r.id && !r.duplicado)) return { ok: false, error: "otro", mensaje: "No se pudo guardar la publicación. Intenta de nuevo; no se publicó nada." };
  const duplicado = leerReciente(r.duplicado);
  if (duplicado) return { ok: false, duplicado };
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => dispararPaso(origen, { ruta: "/api/redes/correr" }));
  } catch {
    console.warn("redes: no se pudo pedir el primer intento; lo toma el latido");
  }
  // Sin `revalidatePath`: repintaría aquí mismo la lista entera y la respuesta tardaría; la hoja se cierra y la lista se refresca sola.
  return { ok: true, id: r.id ?? null };
}

/**
 * «Publicar» de la hoja: comprueba lo que se puede comprobar al momento (que es de la administración, que el evento sigue por venir y que el
 * texto cabe) y guarda el trabajo. Lo demás (el cupo del día, las imágenes, Instagram, Facebook) lo hace el trabajador en segundo plano.
 */
export async function publicarEnInstagram(p: PedidoPublicar): Promise<Encolado> {
  const s = esUuid(p?.eventoId) ? await sesionAdmin() : null;
  if (!s) return { ok: false, error: "permiso", mensaje: "Solo la administración publica en Instagram." };
  const formato = p.formato === "9x16" ? "9x16" : "4x5";
  const sigue = await porVenir(s.supabase, p.eventoId, new Date());
  if (sigue === null) return { ok: false, error: "otro", mensaje: "No encontramos ese evento." };
  if (!sigue) return { ok: false, error: "empezo", mensaje: FRASES.empezo };
  const texto = formato === "4x5" && typeof p.texto === "string" && p.texto.trim() ? p.texto.trim().slice(0, 5000) : null;
  if (texto) {
    const r = revisarTexto(texto);
    if (r.problema) return { ok: false, error: "texto", mensaje: r.problema };
  }
  const pedido = {
    recorte: !!p.recorte,
    diseno: Number(p.diseno) || 0,
    texto,
    quitadas: Array.isArray(p.quitadas) ? p.quitadas.filter((x) => typeof x === "string").slice(0, 60) : [],
    facebook: !!p.facebook,
    ...(Array.isArray(p.imagenes) ? { imagenes: p.imagenes.filter((x) => typeof x === "string").slice(0, 20) } : {}),
  };
  // OL-479: si lo único «en camino» es el día de la semana que lo programó para más tarde, no es repetido (ese día ya no lo vuelve a publicar).
  const soloProgramado = !p.repetir && (await reciente(s.supabase, p.eventoId, "instagram", formato)) === null;
  return encolar(s.supabase, p.eventoId, "instagram", formato, pedido, !!p.repetir || (soloProgramado && (await hayProgramado(s.supabase, p.eventoId))));
}

/** ¿La semana de Instagram tiene este evento programado para más tarde? */
async function hayProgramado(supabase: Supabase, eventoId: string): Promise<boolean> {
  const { data } = await supabase.from("redes_trabajos").select("id").eq("evento_id", eventoId).eq("estado", "en_cola").not("pedido->>casilla", "is", null).gt("siguiente_en", new Date(Date.now() + 60_000).toISOString()).limit(1);
  return !!data?.length;
}

/**
 * Publica en Facebook lo que ya está en Instagram y no salió en Facebook (la hoja, «Reintentar en Facebook»; la lista, «Publicar en Facebook»):
 * la última publicación de Instagram del evento, con su misma imagen. `texto`: el que llevó Instagram, si la hoja lo tiene; si no, el que arma el
 * sistema. Si esa publicación ya está en Facebook, no se publica otra vez. Solo lo que está por venir, como en Instagram. OL-465: también va a la
 * cola.
 */
export async function publicarEnFacebook(eventoId: string, texto: string | null = null, repetir = false): Promise<Encolado> {
  const s = esUuid(eventoId) ? await sesionAdmin() : null;
  if (!s) return { ok: false, error: "permiso", mensaje: "Solo la administración publica en Facebook." };
  const sigue = await porVenir(s.supabase, eventoId, new Date());
  if (sigue === null) return { ok: false, error: "otro", mensaje: "No encontramos ese evento." };
  if (!sigue) return { ok: false, error: "empezo", mensaje: FRASES_FACEBOOK.empezo };
  const { data: ig } = await s.supabase
    .from("instagram_publicaciones")
    .select("id, formato")
    .eq("evento_id", eventoId)
    .eq("estado", "publicada")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; formato: "4x5" | "9x16" | "carrusel" }>();
  if (!ig) return { ok: false, error: "otro", mensaje: "Este evento todavía no está en Instagram." };
  const { data: ya } = await s.supabase.from("facebook_publicaciones").select("id").eq("instagram_id", ig.id).eq("estado", "publicada").limit(1).maybeSingle<{ id: string }>();
  if (ya && !repetir) return { ok: true, id: null, yaEstaba: true };
  const propio = ig.formato !== "9x16" && typeof texto === "string" && texto.trim() ? texto.trim().slice(0, 5000) : null;
  return encolar(s.supabase, eventoId, "facebook", ig.formato === "9x16" ? "9x16" : "4x5", { texto: propio }, repetir);
}

export type Guardado = { ok: true; nombre: string } | { ok: false; mensaje: string };

/** Guarda la ubicación de Instagram de una ciudad (su slug) o de un lugar (su id) desde el enlace de su página de Facebook. */
export async function guardarUbicacionInstagram(tipo: "ciudad" | "lugar", clave: string, enlace: string): Promise<Guardado> {
  const s = await sesionAdmin();
  if (!s || (tipo !== "ciudad" && tipo !== "lugar") || typeof clave !== "string" || !clave || clave.length > 80) return { ok: false, mensaje: "Solo la administración guarda la ubicación." };
  const pagina = typeof enlace === "string" ? paginaDeEnlace(enlace) : null;
  if (!pagina) return { ok: false, mensaje: "Eso no parece el enlace de una página de Facebook." };
  const leida = await leerPagina(pagina);
  if (!leida) return { ok: false, mensaje: "No pudimos leer esa página o no tiene ubicación. Prueba con la página oficial de la ciudad o del lugar." };
  const { error } = await s.supabase.from("instagram_ubicaciones").upsert({ tipo, clave, pagina_id: leida.id, nombre: leida.nombre, enlace: enlace.trim().slice(0, 300) });
  if (error) return { ok: false, mensaje: "No se pudo guardar. Intenta de nuevo." };
  revalidatePath(tipo === "ciudad" ? `/admin/ciudades/${clave}` : "/admin");
  return { ok: true, nombre: leida.nombre };
}
