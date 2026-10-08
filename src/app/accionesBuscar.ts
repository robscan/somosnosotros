"use server";

import { buscarEventos, type EventoAgenda, type EventoBuscable } from "@/lib/agenda";
import type { ArtistaLista } from "@/lib/artistas";
import { CLASES_NOMBRADAS, LIMITE_BUSQUEDA_UNIFICADA, ordenarPorCiudad, SIN_RESULTADOS_BUSQUEDA, type Encontrado, type GrupoBuscador, type ResultadoBusqueda } from "@/lib/buscarUnificado";
import { conLoDeSusActos } from "@/lib/cargarSedes";
import { tarjetaArtista, tarjetaConClase, tarjetaEvento, tarjetaLugar } from "@/lib/destacados";
import { filtroSinPasar } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { normalizarNombre, type LugarLista } from "@/lib/lugares";
import { MAXIMO_RECIENTES } from "@/lib/recientesBusqueda";
import { clienteServidor } from "@/lib/supabase/servidor";

type Nombre = { nombre: string };
type FilaEvento = Omit<EventoAgenda, "lugar" | "van"> & {
  ciudad: string;
  lugar: EventoAgenda["lugar"] | EventoAgenda["lugar"][];
  artistas: { artista: Nombre | Nombre[] | null }[] | null;
};
type FilaLugar = { id: string; slug: string | null; nombre: string; tipo: LugarLista["tipo"]; direccion: string | null; lat: number; lng: number; portada: string | null; ciudad: string };
type FilaArtista = { id: string; slug: string; nombre: string; disciplina: ArtistaLista["disciplina"]; detalle: string | null; tipo: ArtistaLista["tipo"]; foto: string | null; ciudad: string };
type Cliente = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;
type Buscable = EventoBuscable & { ciudad: string };

/** Lo que se pide de cada tabla: lo mismo para buscar y para poner al día los recientes (la clase de un evento, OL-338, para nombrarla). */
const COLUMNAS_EVENTO = "id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, ciudad, clase, lugar:lugares(nombre, portada), artistas:eventos_artistas(artista:artistas(nombre))";
const COLUMNAS_LUGAR = "id, slug, nombre, tipo, direccion, lat, lng, portada, ciudad";
const COLUMNAS_ARTISTA = "id, slug, nombre, disciplina, detalle, tipo, foto, ciudad";

/** Los eventos próximos entre los que se busca (todas las ciudades): el corte de PostgREST llega en 1 000 y se ve venir. */
const EVENTOS_CANDIDATOS = 500;
/** Lo que se pide de lugares y artistas antes de ordenar por ciudad y cortar: de sobra para que lo de la ciudad no se pierda. */
const CANDIDATOS = 200;
/** Lo más largo que se busca, y las palabras que cuentan. */
const LARGO_MAXIMO = 80;
const PALABRAS_MAXIMO = 5;

/** Un evento tal como llega de la base, con su lugar y los nombres de sus artistas (por ellos también se busca). */
function buscable(fila: FilaEvento): Buscable {
  const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
  const artistas = (fila.artistas ?? []).map((x) => (Array.isArray(x.artista) ? x.artista[0] : x.artista)?.nombre).filter((n): n is string => !!n);
  return { ...fila, lugar, artistas, van: 0 };
}

/**
 * El programa de cada festival de la lista (OL-338): cuántos actos tiene publicados, como lo cuenta la agenda (`cargarAgenda`), para que su
 * renglón diga «Programa registrado: N actividades» en vez de la sede de su primer acto. Solo si hay alguno; si la lectura falla, sin él.
 */
async function conPrograma(supabase: Cliente, eventos: Buscable[]): Promise<Buscable[]> {
  const marcos = eventos.filter((e) => e.clase === "festival").map((e) => e.id);
  if (!marcos.length) return eventos;
  const { data, error } = await supabase.from("eventos").select("evento_padre_id").in("evento_padre_id", marcos).eq("visible", true).limit(1000);
  if (error || !data) return eventos;
  const registrados = new Map<string, number>();
  for (const x of data as { evento_padre_id: string }[]) registrados.set(x.evento_padre_id, (registrados.get(x.evento_padre_id) ?? 0) + 1);
  return eventos.map((e) => (e.clase === "festival" ? { ...e, programa: { registrados: registrados.get(e.id) ?? 0 } } : e));
}

/** Un evento encontrado: su tarjeta y, si es un festival o una exposición, el nombre de lo que es (OL-338, `CLASES_NOMBRADAS`). */
function encontradoDeEvento(e: Buscable, ahora: Date): Encontrado {
  return { ...(e.clase && CLASES_NOMBRADAS.includes(e.clase) ? tarjetaConClase(e, ahora) : tarjetaEvento(e, ahora)), ciudad: e.ciudad };
}
const encontradoDeLugar = (fila: FilaLugar, ahora: Date): Encontrado => ({ ...tarjetaLugar({ ...fila, proximo: null } as LugarLista, ahora), ciudad: fila.ciudad });
const encontradoDeArtista = (fila: FilaArtista, ahora: Date): Encontrado => ({ ...tarjetaArtista({ ...fila, proxima: null } as ArtistaLista, ahora), ciudad: fila.ciudad });

/**
 * El buscador único (docs/rediseno/50, OL-237): tres consultas en paralelo, una por tabla, con el criterio de visibilidad de
 * Agenda, Lugares y Artistas — no se reinventa qué cuenta como visible, solo se combina. Sin acentos ni mayúsculas y cada palabra
 * escrita tiene que estar («museo ferrocarril» halla el Museo del Ferrocarril). Lugares y artistas se buscan por `nombre_orden`, el
 * nombre ya normalizado en la base; los eventos, por título, sitio o artista, como buscaba la Agenda (`buscarEventos`): no hay un
 * título normalizado en la base, así que se traen los próximos y se filtran aquí. Sin «próximo evento» por ficha: un resultado es
 * una sugerencia rápida, no la ficha completa. Un festival y una exposición dicen lo que son y sus días, como en Inicio (OL-338).
 *
 * La ciudad ordena, no limita: no se filtra por ciudad; `ciudades` son sus nombres, la que se ve primero y las demás por cercanía
 * (`ciudadesPorCercania`), y lo encontrado sale en ese orden, hasta `LIMITE_BUSQUEDA_UNIFICADA` de cada tipo.
 */
export async function buscarUnificado(q: string, ciudades: string[]): Promise<ResultadoBusqueda> {
  const texto = String(q ?? "").trim().slice(0, LARGO_MAXIMO);
  const palabras = normalizarNombre(texto).split(" ").filter(Boolean).slice(0, PALABRAS_MAXIMO);
  if (palabras.join("").length < 2) return SIN_RESULTADOS_BUSQUEDA;
  const supabase = await clienteServidor();
  if (!supabase) return SIN_RESULTADOS_BUSQUEDA;
  const orden = (Array.isArray(ciudades) ? ciudades : []).filter((c) => typeof c === "string").slice(0, 100);
  const ahora = new Date();
  // El patrón sale de `normalizarNombre`: solo letras, números y espacios, sin nada que escapar.
  let lugares = supabase.from("lugares").select(COLUMNAS_LUGAR).eq("visible", true).eq("privado", false);
  let artistas = supabase.from("artistas").select(COLUMNAS_ARTISTA).eq("visible", true);
  for (const palabra of palabras) {
    lugares = lugares.ilike("nombre_orden", `%${palabra}%`);
    artistas = artistas.ilike("nombre_orden", `%${palabra}%`);
  }
  const [e, l, a] = await Promise.all([
    supabase.from("eventos").select(COLUMNAS_EVENTO).eq("visible", true).or(filtroSinPasar(ahora)).order("inicio").order("titulo").order("id").limit(EVENTOS_CANDIDATOS),
    lugares.order("nombre_orden").limit(CANDIDATOS),
    artistas.order("nombre_orden").limit(CANDIDATOS),
  ]);
  const proximos = ((e.data ?? []) as unknown as FilaEvento[]).map(buscable);
  // Un festival dice sus sedes, derivadas de sus actos (OL-339), y se halla por cualquiera de ellas; sin imagen propia lleva el cartel de su
  // próximo acto (OL-346); su programa (OL-338) se cuenta después.
  const conSusSedes = await conLoDeSusActos(supabase, proximos, ahora);
  const eventos = (await conPrograma(supabase, buscarEventos(conSusSedes, texto))).map((p) => encontradoDeEvento(p, ahora));
  const lugaresHallados = ((l.data ?? []) as unknown as FilaLugar[]).map((fila) => encontradoDeLugar(fila, ahora));
  const artistasHallados = ((a.data ?? []) as unknown as FilaArtista[]).map((fila) => encontradoDeArtista(fila, ahora));
  const cortar = (lista: Encontrado[]) => ordenarPorCiudad(lista, orden).slice(0, LIMITE_BUSQUEDA_UNIFICADA);
  return { eventos: cortar(eventos), lugares: cortar(lugaresHallados), artistas: cortar(artistasHallados) };
}

/** La llave de un reciente en lo que devuelve `vigentesDeRecientes`. */
export type LlaveReciente = `${GrupoBuscador}:${string}`;

/**
 * Los recientes de Buscar como están hoy (OL-338): cada uno se guardó en el teléfono con la foto, el nombre y la fecha de cuando se abrió, y la
 * portada de un evento cambia (el founder la vio vieja en Buscar). Devuelve, por cada uno pedido, su resultado al día o `null` si ya no se ve
 * (oculto o borrado: la pantalla lo quita). Con las mismas reglas de visibilidad que la búsqueda, sin el corte de «ya pasó»: un reciente que pasó
 * sigue llevando a su ficha. Si alguna lectura falla, `null` entero: no se toca lo guardado.
 */
export async function vigentesDeRecientes(pedidos: { grupo: GrupoBuscador; id: string }[]): Promise<Record<LlaveReciente, Encontrado | null> | null> {
  const validos = (Array.isArray(pedidos) ? pedidos : []).filter((p) => (p?.grupo === "eventos" || p?.grupo === "lugares" || p?.grupo === "artistas") && esUuid(p.id)).slice(0, MAXIMO_RECIENTES);
  if (!validos.length) return {};
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const ids = (grupo: GrupoBuscador) => validos.filter((p) => p.grupo === grupo).map((p) => p.id);
  const [e, l, a] = await Promise.all([
    ids("eventos").length ? supabase.from("eventos").select(COLUMNAS_EVENTO).eq("visible", true).in("id", ids("eventos")) : null,
    ids("lugares").length ? supabase.from("lugares").select(COLUMNAS_LUGAR).eq("visible", true).eq("privado", false).in("id", ids("lugares")) : null,
    ids("artistas").length ? supabase.from("artistas").select(COLUMNAS_ARTISTA).eq("visible", true).in("id", ids("artistas")) : null,
  ]);
  if (e?.error || l?.error || a?.error) return null;
  const ahora = new Date();
  const hallados = new Map<LlaveReciente, Encontrado>();
  // Un festival reciente, como en la búsqueda: sus sedes y, sin imagen propia, el cartel de su próximo acto (OL-346).
  const eventos = await conLoDeSusActos(supabase, ((e?.data ?? []) as unknown as FilaEvento[]).map(buscable), ahora);
  for (const p of await conPrograma(supabase, eventos)) hallados.set(`eventos:${p.id}`, encontradoDeEvento(p, ahora));
  for (const fila of (l?.data ?? []) as unknown as FilaLugar[]) hallados.set(`lugares:${fila.id}`, encontradoDeLugar(fila, ahora));
  for (const fila of (a?.data ?? []) as unknown as FilaArtista[]) hallados.set(`artistas:${fila.id}`, encontradoDeArtista(fila, ahora));
  return Object.fromEntries(validos.map((p) => [`${p.grupo}:${p.id}`, hallados.get(`${p.grupo}:${p.id}`) ?? null]));
}
