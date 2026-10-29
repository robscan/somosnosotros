import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cartelDescargable } from "../cartelDescarga";
import { dibujarDestacado, dibujarPortadaSemana } from "../carteles/dibujar";
import { configPublica } from "../config";
import { diaConMes, diaLocal, horaCorta, localAIso } from "../fechas";
import { cejaArtista, cejaLugar, proximaEnTarjeta, textoArtista, textoLugar, textoSemana, tituloSemana, type ArtistaDestacado, type LugarDestacado, type Proxima } from "./destacado";
import { bajarCartel, encajarCartel } from "./imagen";
import { lunesDe } from "./semana";
import { usuarioDeInstagram } from "./texto";

/**
 * Lo que la semana de Instagram necesita de una ficha (artista o lugar) y de «Esta semana» para enseñarlo en la hoja del día y para publicarlo
 * (OL-479): los datos, el texto que arma el sistema, la tarjeta dibujada y la ubicación de su ciudad. Lo usan la hoja (con la sesión de la
 * administración), la vista previa (`/api/instagram/semana/<día>`) y el trabajador de la cola (con la llave de servicio): las mismas consultas.
 */

export type FichaParaPublicar = {
  tipo: "artista" | "lugar";
  id: string;
  slug: string;
  nombre: string;
  ciudad: string;
  ciudadSlug: string;
  visible: boolean;
  /** Un grupo o un colectivo (para saludar en el aviso con su nombre completo). */
  grupo: boolean;
  ceja: string;
  cuenta: string | null;
  portada: string | null;
  foto: string | null;
  /** El artista: su próxima fecha en 30 días. */
  proxima: (Proxima & { titulo: string }) | null;
  /** El lugar: sus eventos de esa semana. */
  semana: { titulo: string; inicio: string; zona: string }[];
  datos: ArtistaDestacado | LugarDestacado;
  ubicacion: { id: string; nombre: string } | null;
};

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

async function slugDeCiudad(db: SupabaseClient, ciudad: string): Promise<string> {
  const { data } = await db.rpc("ciudad_slug", { p_ciudad: ciudad });
  return typeof data === "string" ? data : "";
}

async function ubicacionDe(db: SupabaseClient, ciudadSlug: string, lugarId: string | null, ciudad: string): Promise<{ id: string; nombre: string } | null> {
  const { data } = await db.from("instagram_ubicaciones").select("tipo, clave, pagina_id, nombre").or(`and(tipo.eq.ciudad,clave.eq.${ciudadSlug || "-"}),and(tipo.eq.lugar,clave.eq.${lugarId ?? "-"})`);
  const filas = (data ?? []) as { tipo: string; pagina_id: string; nombre: string | null }[];
  const u = filas.find((x) => x.tipo === "lugar") ?? filas.find((x) => x.tipo === "ciudad") ?? null;
  return u ? { id: u.pagina_id, nombre: u.nombre ?? ciudad } : null;
}

/** El inicio y el fin (ISO) de la semana de un día, en una zona. */
function semanaDe(fecha: string, zona: string): { desde: string; hasta: string } {
  const lunes = lunesDe(fecha);
  const [a, m, d] = lunes.split("-").map(Number);
  const siguiente = new Date(Date.UTC(a, m - 1, d + 7)).toISOString().slice(0, 10);
  return { desde: localAIso(`${lunes}T00:00`, zona) ?? `${lunes}T06:00:00Z`, hasta: localAIso(`${siguiente}T00:00`, zona) ?? `${siguiente}T06:00:00Z` };
}

/**
 * Todo lo de una ficha para su día. `fecha`: el día en que sale (AAAA-MM-DD; la semana del lugar y desde cuándo se busca la próxima fecha del
 * artista: desde ese día o desde ahora, lo que sea después). Null si no existe.
 */
export async function cargarFicha(db: SupabaseClient, tipo: "artista" | "lugar", id: string, ahora: Date, fecha?: string): Promise<FichaParaPublicar | null> {
  if (tipo === "artista") {
    const { data: a } = await db
      .from("artistas")
      .select("id, slug, nombre, disciplina, detalle, tipo, descripcion, foto, portada, redes, ciudad, visible")
      .eq("id", id)
      .maybeSingle<{ id: string; slug: string; nombre: string; disciplina: string; detalle: string | null; tipo: string; descripcion: string | null; foto: string | null; portada: string | null; redes: unknown; ciudad: string; visible: boolean }>();
    if (!a) return null;
    const desde = new Date(Math.max(ahora.getTime(), fecha ? new Date(localAIso(`${fecha}T00:00`, "America/Mexico_City") ?? ahora).getTime() : 0));
    const ligados = await db.from("eventos_artistas").select("evento_id").eq("artista_id", a.id).limit(500);
    const ids = ((ligados.data ?? []) as { evento_id: string }[]).map((x) => x.evento_id);
    const prox = ids.length
      ? await db.from("eventos").select("id, titulo, inicio, zona, sitio_texto, lugar:lugares(nombre, redes)").eq("visible", true).eq("borrador", false).eq("cancelado", false).eq("retirado_por_admin", false)
          .in("id", ids)
          .gt("inicio", desde.toISOString())
          .lt("inicio", new Date(desde.getTime() + 30 * 86_400_000).toISOString())
          .order("inicio")
          .limit(1)
          .maybeSingle<{ id: string; titulo: string; inicio: string; zona: string; sitio_texto: string | null; lugar: Uno<{ nombre: string; redes: unknown }> }>()
      : { data: null };
    const p = prox.data;
    const lugar = p ? uno(p.lugar) : null;
    const proxima = p ? { titulo: p.titulo, inicio: p.inicio, zona: p.zona, lugar: lugar?.nombre ?? p.sitio_texto, lugarRedes: lugar?.redes ?? [] } : null;
    const ciudadSlug = await slugDeCiudad(db, a.ciudad);
    const datos: ArtistaDestacado = { nombre: a.nombre, slug: a.slug, descripcion: a.descripcion ?? "", disciplina: a.disciplina, detalle: a.detalle, ciudad: a.ciudad, redes: a.redes, proxima };
    return {
      tipo, id: a.id, slug: a.slug, nombre: a.nombre, ciudad: a.ciudad, ciudadSlug, visible: a.visible, grupo: a.tipo !== "solista",
      ceja: cejaArtista(a), cuenta: usuarioDeInstagram(a.redes), portada: a.portada, foto: a.foto, proxima, semana: [], datos,
      ubicacion: await ubicacionDe(db, ciudadSlug, null, a.ciudad),
    };
  }
  const { data: l } = await db
    .from("lugares")
    .select("id, slug, nombre, tipo, detalle, descripcion, portada, redes, ciudad, direccion, visible, privado, zona")
    .eq("id", id)
    .maybeSingle<{ id: string; slug: string; nombre: string; tipo: string; detalle: string | null; descripcion: string | null; portada: string | null; redes: unknown; ciudad: string; direccion: string | null; visible: boolean; privado: boolean; zona: string | null }>();
  if (!l) return null;
  const zona = l.zona ?? "America/Mexico_City";
  const s = semanaDe(fecha ?? diaLocal(ahora, zona), zona);
  const { data: evs } = await db.from("eventos").select("titulo, inicio, zona").eq("visible", true).eq("borrador", false).eq("cancelado", false).eq("retirado_por_admin", false).eq("lugar_id", l.id).gte("inicio", s.desde).lt("inicio", s.hasta).order("inicio").limit(10);
  // Lo que le queda de esa semana desde el día en que sale (o desde ahora, si ya es ese día o después).
  const desdeDia = Math.max(ahora.getTime(), fecha ? new Date(localAIso(`${fecha}T00:00`, zona) ?? ahora).getTime() : 0);
  const semana = ((evs ?? []) as { titulo: string; inicio: string; zona: string }[]).filter((e) => new Date(e.inicio).getTime() >= desdeDia);
  const ciudadSlug = await slugDeCiudad(db, l.ciudad);
  const datos: LugarDestacado = { nombre: l.nombre, slug: l.slug, descripcion: l.descripcion ?? "", tipo: l.tipo, detalle: l.detalle, ciudad: l.ciudad, direccion: l.direccion, redes: l.redes, semana };
  return {
    tipo, id: l.id, slug: l.slug, nombre: l.nombre, ciudad: l.ciudad, ciudadSlug, visible: l.visible && !l.privado, grupo: true,
    ceja: cejaLugar(l), cuenta: usuarioDeInstagram(l.redes), portada: l.portada, foto: null, proxima: null, semana, datos,
    ubicacion: await ubicacionDe(db, ciudadSlug, l.id, l.ciudad),
  };
}

/**
 * OL-488: ¿tiene la ficha el material que la tarjeta puede dibujar? La foto y la portada del artista, la portada del lugar, en el Storage de la
 * app (lo único que `bajarCartel` deja bajar; otra cosa saldría con la imagen de relleno). La base pide lo mismo (`instagram_material_propio`).
 */
export function fichaConMaterial(f: Pick<FichaParaPublicar, "tipo" | "foto" | "portada">, supabaseUrl = configPublica().supabaseUrl): boolean {
  return cartelDescargable(f.portada, supabaseUrl) && (f.tipo === "lugar" || cartelDescargable(f.foto, supabaseUrl));
}

/** El texto que arma el sistema; sin la cuenta si la administración la quitó (`quitadas`): sin mención ni crédito. */
export function textoDeFicha(f: FichaParaPublicar, ahora: Date, quitadas: readonly string[] = []): string {
  const sinCuenta = !!f.cuenta && quitadas.includes(f.cuenta);
  const datos = sinCuenta ? { ...f.datos, redes: [] } : f.datos;
  return f.tipo === "artista" ? textoArtista(datos as ArtistaDestacado, ahora) : textoLugar(datos as LugarDestacado, ahora);
}

/** La tarjeta de la ficha en JPEG (1080, o el ancho de la vista previa). Si la portada o la foto no se pueden bajar, la imagen de relleno. */
export async function dibujarFicha(f: FichaParaPublicar, formato: "4x5" | "9x16", ahora: Date, ancho?: number): Promise<Buffer> {
  const [portada, foto] = await Promise.all([bajarCartel(f.portada), f.tipo === "artista" ? bajarCartel(f.foto) : Promise.resolve(null)]);
  const n = f.semana.length;
  const r = await dibujarDestacado({
    tipo: f.tipo,
    formato,
    portada: portada?.bytes ?? null,
    foto: foto?.bytes ?? null,
    nombre: f.nombre,
    ceja: f.ceja,
    ciudad: f.ciudad,
    cuenta: f.cuenta,
    proxima: f.proxima ? proximaEnTarjeta(f.proxima, ahora) : null,
    semana: f.tipo === "lugar" && n ? `Esta semana: ${n === 1 ? "1 evento" : `${n} eventos`}` : null,
    ancho,
  });
  return r.imagen;
}

// ===== «Esta semana»

export type SemanaParaPublicar = {
  ciudad: string;
  ciudadSlug: string;
  titulo: string;
  eventos: { id: string; slug: string | null; titulo: string; inicio: string; zona: string; imagen: string | null; lugar: string | null; lugarRedes: unknown }[];
  ubicacion: { id: string; nombre: string } | null;
};

/** Los eventos del carrusel (en su orden; los que ya no se ven, fuera) y el título de su portada. Null si no queda ninguno. */
export async function cargarSemana(db: SupabaseClient, ids: readonly string[], ahora: Date): Promise<SemanaParaPublicar | null> {
  if (!ids.length) return null;
  const { data } = await db.from("eventos").select("id, slug, titulo, inicio, zona, imagen, ciudad, sitio_texto, lugar:lugares(nombre, redes)").eq("visible", true).eq("borrador", false).eq("cancelado", false).eq("retirado_por_admin", false).in("id", [...ids]).limit(9);
  const filas = ((data ?? []) as { id: string; slug: string | null; titulo: string; inicio: string; zona: string; imagen: string | null; ciudad: string; sitio_texto: string | null; lugar: Uno<{ nombre: string; redes: unknown }> }[]).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  if (!filas.length) return null;
  const zona = filas[0].zona;
  const ciudad = filas[0].ciudad;
  const ciudadSlug = await slugDeCiudad(db, ciudad);
  const dias = filas.map((e) => diaLocal(new Date(e.inicio), e.zona)).sort();
  return {
    ciudad,
    ciudadSlug,
    titulo: tituloSemana(dias[0], dias.at(-1)!, zona, ahora),
    eventos: filas.map((e) => ({ id: e.id, slug: e.slug, titulo: e.titulo, inicio: e.inicio, zona: e.zona, imagen: e.imagen, lugar: uno(e.lugar)?.nombre ?? e.sitio_texto, lugarRedes: uno(e.lugar)?.redes ?? [] })),
    ubicacion: await ubicacionDe(db, ciudadSlug, null, ciudad),
  };
}

export const textoDeSemana = (s: SemanaParaPublicar, ahora: Date): string => textoSemana({ ciudad: s.ciudad, eventos: s.eventos.map((e) => ({ titulo: e.titulo, inicio: e.inicio, zona: e.zona, lugar: e.lugar, lugarRedes: e.lugarRedes })) }, ahora);

/** La portada del carrusel en JPEG. */
export async function dibujarPortadaDeSemana(s: SemanaParaPublicar, ahora: Date, ancho?: number): Promise<Buffer> {
  const r = await dibujarPortadaSemana({
    ciudad: s.ciudad,
    titulo: s.titulo,
    eventos: s.eventos.map((e) => {
      const dia = diaConMes(e.inicio, ahora, e.zona).replace(/ de .*$/, "");
      return { cuando: `${dia[0].toLocaleUpperCase("es-MX")}${dia.slice(1)} · ${horaCorta(e.inicio, e.zona)}`, titulo: e.titulo };
    }),
    ancho,
  });
  return r.imagen;
}

/** Las imágenes del carrusel: la portada y el cartel de cada evento (completo, con margen de su color), con la cuenta de su lugar para etiquetar.
 *  Un cartel que no se puede bajar se queda fuera. */
export async function imagenesDeSemana(s: SemanaParaPublicar, ahora: Date): Promise<{ bytes: Buffer; etiquetas: string[] }[]> {
  const portada = await dibujarPortadaDeSemana(s, ahora);
  const carteles = await Promise.all(
    s.eventos.map(async (e) => {
      const c = await bajarCartel(e.imagen);
      if (!c) return null;
      const cuenta = usuarioDeInstagram(e.lugarRedes);
      return { bytes: await encajarCartel(c.bytes, "4x5", false), etiquetas: cuenta ? [cuenta] : [] };
    }),
  );
  return [{ bytes: portada, etiquetas: [] }, ...carteles.filter((x): x is { bytes: Buffer; etiquetas: string[] } => !!x)];
}
