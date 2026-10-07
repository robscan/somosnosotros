import "server-only";
import { cargarSedes } from "../cargarSedes";
import { cartelDescargable } from "../cartelDescarga";
import { configPublica } from "../config";
import { esClase, sitioEnLista } from "../eventos";
import { esUuid } from "../formulario";
import type { ClienteServidor } from "../supabase/servidor";
import type { EventoCartel } from "./datos";
import type { Datos } from "./elegir";

/**
 * Lo que el creador de cartel necesita de la base (OL-324): el evento con su lugar y sus artistas, quién puede hacerle un cartel, las imágenes
 * que se pueden usar y la memoria del lugar. Una sola carga para la pantalla, la ruta que dibuja y «Usar como cartel».
 */

/** Las imágenes que sube el creador llevan esta marca en el nombre: una imagen así ya es un cartel hecho aquí y no vuelve a usarse como foto. */
export const MARCA_GENERADO = "cartel-generado-";

export type ParaCartel = {
  evento: EventoCartel;
  /** Autor del evento o administración. */
  gestiona: boolean;
  perfilId: string;
  /** Las imágenes por orden (doc 52 §3.4): foto del evento, portada o foto del artista, portada del lugar. Solo del Storage propio. */
  imagenes: string[];
  /** Plantilla de la última vez en el mismo lugar (o en el mismo evento, si es en «otro sitio»). */
  memoria: string | null;
  datosEleccion: Datos;
};

type Fila = {
  id: string;
  slug: string;
  titulo: string;
  inicio: string;
  fin: string | null;
  zona: string;
  precio: string | null;
  clase: string | null;
  imagen: string | null;
  creado_por: string | null;
  lugar_id: string | null;
  sitio_texto: string | null;
  sitio_direccion: string | null;
  sitio_reservado: boolean;
  lugar: { nombre: string; tipo: string; portada: string | null } | { nombre: string; tipo: string; portada: string | null }[] | null;
  sesiones: { inicio: string }[] | null;
};
type ArtistaFila = { nombre: string; disciplina: string; detalle: string | null; foto: string | null; portada: string | null };

const COLUMNAS = "id, slug, titulo, inicio, fin, zona, precio, clase, imagen, creado_por, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, lugar:lugares(nombre, tipo, portada), sesiones:eventos_sesiones(inicio)";

/** El evento por slug o UUID con lo que hace falta para su cartel; null si no existe, no se ve o no hay sesión. */
export async function cargarParaCartel(supabase: ClienteServidor, idOSlug: string): Promise<ParaCartel | null> {
  const { data: claims } = await supabase.auth.getClaims();
  const perfilId = claims?.claims?.sub;
  if (!perfilId) return null;
  const porSlug = await supabase.from("eventos").select(COLUMNAS).eq("slug", idOSlug).maybeSingle<Fila>();
  const fila = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("eventos").select(COLUMNAS).eq("id", idOSlug).maybeSingle<Fila>()).data : null);
  if (!fila) return null;
  const [{ data: rol }, { data: ligados }, memoria, sedes] = await Promise.all([
    supabase.from("perfiles").select("rol").eq("id", perfilId).maybeSingle<{ rol: string }>(),
    supabase.from("eventos_artistas").select("orden, artista:artistas(nombre, disciplina, detalle, foto, portada)").eq("evento_id", fila.id).order("orden").limit(50),
    cargarMemoria(supabase, fila.id, fila.lugar_id),
    // Un festival dice sus sedes, derivadas de sus actos (OL-339): «Varias sedes» o la única.
    fila.clase === "festival" ? cargarSedes(supabase, [fila.id]).then((m) => m?.get(fila.id)) : undefined,
  ]);
  const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
  const artistas = ((ligados ?? []) as { artista: ArtistaFila | ArtistaFila[] | null }[]).map((f) => (Array.isArray(f.artista) ? f.artista[0] : f.artista)).filter((a): a is ArtistaFila => !!a);
  const evento: EventoCartel = {
    id: fila.id,
    slug: fila.slug,
    titulo: fila.titulo,
    inicio: fila.inicio,
    fin: fila.fin,
    zona: fila.zona,
    precio: fila.precio,
    // Una clase que no se reconoce (o una fila sin ella) es un evento, como en la ficha.
    clase: esClase(fila.clase) ? fila.clase : "puntual",
    conSesiones: (fila.sesiones ?? []).length > 0,
    sitio: sitioEnLista({ lugar, sitio_texto: fila.sitio_texto, sitio_direccion: fila.sitio_direccion, sitio_reservado: fila.sitio_reservado, sedes }),
    tipoLugar: lugar?.tipo ?? null,
    lugarId: fila.lugar_id,
    artistas: artistas.map(({ nombre, disciplina, detalle }) => ({ nombre, disciplina, detalle })),
  };
  const imagenes = imagenesPorOrden(fila.imagen, artistas, lugar?.portada ?? null);
  return {
    evento,
    gestiona: fila.creado_por === perfilId || rol?.rol === "admin",
    perfilId,
    imagenes,
    memoria,
    datosEleccion: { conImagen: imagenes.length > 0, tipoLugar: evento.tipoLugar, disciplinas: artistas.map((a) => a.disciplina), artistas: artistas.length, memoria },
  };
}

/**
 * Las imágenes que el cartel puede usar, por orden y sin repetir. Solo del Storage propio (`cartelDescargable`: el servidor las pide, y pedir
 * cualquier dirección abriría una puerta a otros servidores); la del evento, salvo que ya sea un cartel hecho aquí.
 */
export function imagenesPorOrden(imagenEvento: string | null, artistas: { foto: string | null; portada: string | null }[], portadaLugar: string | null, supabaseUrl = configPublica().supabaseUrl): string[] {
  const candidatas = [imagenEvento && !imagenEvento.includes(MARCA_GENERADO) ? imagenEvento : null, ...artistas.flatMap((a) => [a.portada, a.foto]), portadaLugar];
  return [...new Set(candidatas.filter((url): url is string => cartelDescargable(url, supabaseUrl)))];
}

/** La plantilla de la última vez: en el mismo lugar o, sin lugar, en el mismo evento. Solo ve las filas propias (RLS). */
async function cargarMemoria(supabase: ClienteServidor, eventoId: string, lugarId: string | null): Promise<string | null> {
  const consulta = lugarId
    ? supabase.from("carteles_generados").select("plantilla, evento:eventos!inner(lugar_id)").eq("evento.lugar_id", lugarId)
    : supabase.from("carteles_generados").select("plantilla").eq("evento_id", eventoId);
  const { data, error } = await consulta.order("creado_en", { ascending: false }).limit(1);
  if (error) return null;
  return ((data ?? []) as { plantilla: string }[])[0]?.plantilla ?? null;
}
