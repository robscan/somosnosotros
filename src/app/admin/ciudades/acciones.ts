"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { CIUDAD_INICIAL, slugDeCiudad } from "@/lib/ciudad";
import { BOTONES_PANEL, estadoVisible, HOJAS, leerPanelCiudades, leerParametrosVista, leerTope, type EstadoCiudad, type TipoHoja } from "@/lib/ciudadesAdmin";
import { configPublica } from "@/lib/config";
import { hrefEvento } from "@/lib/eventos";
import { esUuid } from "@/lib/formulario";
import { esMotivo, TIPOS_PROPUESTA, type MotivoRechazo, type TipoPropuesta } from "@/lib/propuestas";
import { almacenDeSupabase, ponerCartel } from "@/lib/rutinas/aceptarCartel";
import { aceptarLeida, type ResultadoAceptar as ResultadoDeAceptar } from "@/lib/rutinas/aceptarPropuesta";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { ligarFicha } from "@/lib/rutinas/publicarEvento";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { zonaDePunto } from "@/lib/zona";
import { aliasNuevos, armarSugerencias, detalleRegion, existenteDe, municipiosDelArea, nombreCorto, RADIO_ALTA_KM, textoArea, textoHora, urlMapaArea, type Alta, type LugarMapbox, type SugerenciaCiudad } from "./alta";
import { lugarEnPunto, lugarPorNombre, nombresAlrededor, sugerenciasMapbox } from "./mapbox";

/**
 * Acciones de Administración › Ciudades (OL-427). Cada una comprueba el rol aquí y la base lo vuelve a exigir (reglas por fila y funciones
 * que miran el rol por dentro); ninguna falla en silencio: devuelve la causa en palabras para que la pantalla la diga en su sitio.
 * «Correr» deja la corrida pendiente con su tope y, después de responder, pide su primer paso al motor (OL-428), que la corre con la API.
 */
export type Resultado = { ok: true } | { ok: false; error: string };
/**
 * `nota`: una frase que la bandeja añade a la línea de lo hecho (un evento aceptado que no se pudo publicar en ese momento; OL-434: un acto que
 * espera a su festival, con `espera`; lo que se publicó con un festival). `actos`: al aceptar un festival, las propuestas de sus actos que
 * esperaban y se publicaron con él (la bandeja cambia sus líneas).
 */
export type ResultadoAceptar = ResultadoDeAceptar;

async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/ciudades");
  if (actual.perfil.rol !== "admin") redirect("/");
  return { supabase: (await clienteServidor())!, yo: actual.perfil.id };
}

/** La portada, Corridas y todo Ciudades: la lista, el panel de cada ciudad y sus bandejas (OL-432). */
function revalidar() {
  revalidatePath("/admin");
  revalidatePath("/admin/ciudades", "layout");
  revalidatePath("/admin/corridas");
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const esBoton = (t: string): t is TipoHoja => BOTONES_PANEL.some((b) => b.tipo === t);

/** «Correr»: deja una corrida pendiente de ese botón en esa ciudad, con su tope y las fuentes de la hoja. */
export async function crearCorrida(ciudad: string, tipo: string, tope: string): Promise<Resultado> {
  if (!SLUG.test(ciudad) || ciudad.length > 80 || !esBoton(tipo)) return { ok: false, error: "No encontramos esa ciudad. Recarga la página." };
  const usd = leerTope(tope);
  if (usd === null) return { ok: false, error: "Escribe un tope de más de 0 y hasta 50 USD." };
  const { supabase, yo } = await soloAdmin();
  const { error } = await supabase
    .from("rutinas_corridas")
    .insert({ tipo, ciudad, tope_usd: usd, creado_por: yo, parametros: { fuentes: HOJAS[tipo].fuentes.map((f) => f.clave) } })
    .select("id")
    .single();
  if (error?.code === "23505") return { ok: false, error: "Ya hay una búsqueda así en curso en esta ciudad." };
  if (error?.code === "23503") return { ok: false, error: "Esa ciudad ya no está. Recarga la página." };
  if (error) return { ok: false, error: "No se pudo dejar lista. Intenta de nuevo." };
  revalidar();
  await pedirPrimerPaso();
  return { ok: true };
}

/**
 * El primer paso sin esperar al cron (OL-428): después de responder, el servidor llama al motor con `CRON_SECRET` (nunca el navegador).
 * Sin secreto no dispara y lo dice en el registro; si algo falla aquí, la corrida queda pendiente y la toma el cron. Nunca tumba la acción.
 */
async function pedirPrimerPaso() {
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => dispararPaso(origen));
  } catch {
    console.warn("rutinas: no se pudo pedir el primer paso; la corrida espera al latido");
  }
}

/** Cancelar una corrida que todavía no empieza. Si una cancelación llega mientras corre, el motor no da otro paso y solo anota lo gastado. */
export async function cancelarCorrida(id: string): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa búsqueda. Recarga la página." };
  const { supabase } = await soloAdmin();
  const { data, error } = await supabase.from("rutinas_corridas").update({ estado: "cancelada", fin: new Date().toISOString() }).eq("id", id).eq("estado", "pendiente").select("id");
  if (error) return { ok: false, error: "No se pudo cancelar. Intenta de nuevo." };
  if (!data?.length) return { ok: false, error: "Ya empezó a correr: no se cancela desde aquí." };
  revalidar();
  return { ok: true };
}

type Leida = { id: string; tipo: TipoPropuesta; datos: Record<string, unknown>; estado: string; corrida_id: string };

/** La propuesta, con la ciudad de su corrida (la ficha nace en esa ciudad si la propuesta no dice otra). */
async function leerPropuesta(supabase: Awaited<ReturnType<typeof soloAdmin>>["supabase"], id: string): Promise<{ p: Leida; ciudad: string | null } | { error: string }> {
  const { data: p, error } = await supabase.from("propuestas").select("id, tipo, datos, estado, corrida_id").eq("id", id).maybeSingle();
  if (error) return { error: "Sin conexión con la base. Intenta de nuevo." };
  if (!p || !TIPOS_PROPUESTA.includes(p.tipo)) return { error: "No encontramos esa propuesta. Recarga la página." };
  const { data: corrida } = await supabase.from("rutinas_corridas").select("ciudad").eq("id", p.corrida_id).maybeSingle();
  const { data: ciudad } = corrida?.ciudad ? await supabase.from("ciudades").select("nombre").eq("slug", corrida.ciudad).maybeSingle() : { data: null };
  return { p: p as Leida, ciudad: (ciudad?.nombre as string | undefined) ?? null };
}

/**
 * Aceptar: un lugar pasa por la misma validación del alta de lugar y por «¿es este?» (150 m); un artista, por la del alta de artista. La
 * ficha y la marca de la propuesta se guardan juntas (`aceptar_propuesta`).
 *
 * Un evento (OL-429) se publica por el camino del importador (`src/lib/rutinas/publicarEvento.ts`): antes de aceptar se arma y se comprueba
 * (lugar registrado o sitio con punto dentro de la ciudad, `validarEvento`, «¿Es este?»); si no se puede publicar, no se acepta y la tarjeta
 * dice por qué en una frase. Si se puede: se acepta con la sesión (la base exige el rol), se inserta con la llave de servicio y sin avisos
 * (`origen = 'rutina-agendas'`, `fuente_url` = la agenda) y la propuesta queda ligada a su evento (`ficha_id`), así «Ver ficha» lleva a él.
 */
export async function aceptarPropuesta(id: string): Promise<ResultadoAceptar> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa propuesta. Recarga la página." };
  const { supabase, yo } = await soloAdmin();
  const leida = await leerPropuesta(supabase, id);
  if ("error" in leida) return { ok: false, error: leida.error };
  const { p, ciudad } = leida;
  if (p.estado !== "propuesta") return { ok: false, error: "Ya se decidió. Recarga la página." };
  if (p.tipo === "cartel") return aceptarCartel(supabase, yo, p);
  // Lo mismo que el guion de la Mac que acepta una corrida (OL-453): `aceptarLeida`, con la sesión para marcarla y la llave de servicio para publicar.
  const token = p.tipo === "evento" ? configPublica().mapboxToken : null;
  return aceptarLeida(
    {
      yo,
      admin: p.tipo === "evento" ? clienteAdmin() : null,
      consultas: supabase,
      marcar: async (propuesta, ficha) => await supabase.rpc("aceptar_propuesta", { p_propuesta: propuesta, p_ficha: ficha }),
      mapbox: token ? { token } : null,
      almacen: almacenDeSupabase,
      ahora: () => new Date(),
      revalidar: { todo: revalidar, ruta: (r) => revalidatePath(r) },
    },
    p,
    ciudad,
  );
}

/**
 * Aceptar un cartel de «Buscar carteles» (OL-444): primero se pone en el evento (`ponerCartel`: se baja la imagen otra vez, se prepara como un
 * cartel que sube una persona, se guarda en Storage y se pone en `eventos.imagen` si el evento sigue sin cartel); si eso no se puede, no se
 * acepta y la tarjeta dice por qué. Luego se marca con la sesión (la base exige el rol) y se liga a su evento: «Ver ficha» lleva a él.
 */
async function aceptarCartel(supabase: Cliente, yo: string, p: Leida): Promise<ResultadoAceptar> {
  const admin = clienteAdmin();
  if (!admin) return { ok: false, error: "No se puede poner el cartel ahora. Intenta más tarde." };
  const puesto = await ponerCartel({ db: admin, almacen: almacenDeSupabase(admin), ahora: () => new Date() }, p.datos, yo);
  if (!puesto.ok) return puesto;
  const href = hrefEvento(puesto.evento);
  revalidatePath("/");
  revalidatePath(href);
  if (puesto.evento.lugar_id) revalidatePath(`/lugares/${puesto.evento.lugar_id}`);
  const { error } = await supabase.rpc("aceptar_propuesta", { p_propuesta: p.id, p_ficha: {} });
  if (error) return { ok: false, error: "El cartel ya quedó en el evento, pero la propuesta no se pudo marcar: recárgala y recházala como duplicado." };
  await ligarFicha(admin, p.id, puesto.evento.id);
  revalidar();
  return { ok: true, href };
}

/** Rechazar con su motivo (duplicado, no cultural, fuera de la ciudad u otro): la rutina aprende a no proponerlo (OL-428). */
export async function rechazarPropuesta(id: string, motivo: MotivoRechazo): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa propuesta. Recarga la página." };
  if (!esMotivo(motivo)) return { ok: false, error: "Elige por qué la rechazas." };
  const { supabase, yo } = await soloAdmin();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ estado: "rechazada", motivo_rechazo: motivo, resuelto_por: yo, resuelto_en: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "propuesta")
    .select("id, corrida_id");
  if (error) return { ok: false, error: "No se pudo rechazar. Intenta de nuevo." };
  if (!data?.length) return { ok: false, error: "Ya se decidió. Recarga la página." };
  revalidar();
  return { ok: true };
}

/** Deshacer un rechazo: la propuesta vuelve a la bandeja. Lo aceptado no se deshace aquí (la ficha ya existe: se oculta desde su menú). */
export async function deshacerRechazo(id: string): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa propuesta. Recarga la página." };
  const { supabase } = await soloAdmin();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ estado: "propuesta", motivo_rechazo: null, resuelto_por: null, resuelto_en: null })
    .eq("id", id)
    .eq("estado", "rechazada")
    .select("id, corrida_id");
  if (error || !data?.length) return { ok: false, error: "No se pudo deshacer. Recarga la página." };
  revalidar();
  return { ok: true };
}

// ---------- «Añadir ciudad», «Abrir» y «Ocultar» (OL-432; prototipo firmado OL-431, pantallas B y C, respuestas 1, 2 y 6) ----------
type FilaTabla = { slug: string; nombre: string; alias: string[]; parametros: Record<string, unknown>; lat: number | null; lng: number | null; zona: string; estado: EstadoCiudad };
type Cliente = Awaited<ReturnType<typeof soloAdmin>>["supabase"];
const ESTADOS: readonly string[] = ["abierta", "detectada", "investigando", "cerrada"];

async function leerTabla(supabase: Cliente): Promise<FilaTabla[] | null> {
  const { data, error } = await supabase.from("ciudades").select("slug, nombre, alias, parametros, lat, lng, zona, estado");
  if (error || !Array.isArray(data)) return null;
  return data.map((f) => ({
    slug: String(f.slug),
    nombre: String(f.nombre),
    alias: Array.isArray(f.alias) ? f.alias.filter((a: unknown): a is string => typeof a === "string") : [],
    parametros: f.parametros && typeof f.parametros === "object" && !Array.isArray(f.parametros) ? (f.parametros as Record<string, unknown>) : {},
    lat: typeof f.lat === "number" ? f.lat : null,
    lng: typeof f.lng === "number" ? f.lng : null,
    zona: typeof f.zona === "string" ? f.zona : "America/Mexico_City",
    estado: (ESTADOS.includes(f.estado) ? f.estado : "detectada") as EstadoCiudad,
  }));
}
const texto = (v: unknown, tope = 80) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const enRango = (n: unknown, min: number, max: number): n is number => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const textos = (v: unknown) => (Array.isArray(v) ? v.map((x) => texto(x)).filter((x) => x.length >= 2) : []).slice(0, 30);

export type ResultadoSugerir = { ok: true; sugerencias: SugerenciaCiudad[]; sinMapa: boolean } | { ok: false; error: string };

/**
 * Lo que sale bajo el campo de «Añadir ciudad» al escribir (pantalla B): las que ya están (con su píldora; una abierta lleva a su panel) y las
 * que Mapbox sugiere, con su estado y su país. Sin Mapbox (sin token o sin respuesta) salen solo las que ya están y `sinMapa` lo dice.
 */
export async function sugerirCiudades(q: string): Promise<ResultadoSugerir> {
  const t = texto(q, 60);
  if (t.length < 2) return { ok: true, sugerencias: [], sinMapa: false };
  const { supabase } = await soloAdmin();
  const [filas, panel] = await Promise.all([leerTabla(supabase), supabase.rpc("panel_ciudades")]);
  if (!filas) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const consultas = new Map((leerPanelCiudades(panel.data)?.ciudades ?? []).map((c) => [c.slug, c.consultas]));
  const existentes = filas.map((f) => ({ slug: f.slug, nombre: f.nombre, alias: f.alias, estado: estadoVisible(f.estado), consultas: consultas.get(f.slug) ?? 0 }));
  const token = configPublica().mapboxToken;
  const lugares = token ? await sugerenciasMapbox(t, token, CIUDAD_INICIAL.centro) : null;
  return { ok: true, sugerencias: armarSugerencias(t, existentes, lugares ?? []), sinMapa: lugares === null };
}

/** Lo que se elige en la hoja: una ciudad que ya está (una detectada u oculta, por su slug) o una que sugirió Mapbox. */
export type Eleccion = { slug: string } | { lugar: LugarMapbox };
export type ResultadoResolver = { ok: true; alta: Alta } | { ok: false; error: string };

function lugarLimpio(l: unknown): LugarMapbox | null {
  const x = (l ?? {}) as Record<string, unknown>;
  const nombre = texto(x.nombre);
  if (!nombre || !enRango(x.lat, -90, 90) || !enRango(x.lng, -180, 180)) return null;
  return { nombre, region: texto(x.region) || null, pais: texto(x.pais) || null, codigoPais: texto(x.codigoPais, 2).toUpperCase() || null, lat: x.lat, lng: x.lng };
}

/**
 * Al elegir (pantalla C), el sistema resuelve todo y la persona solo confirma: el centro (el de Mapbox, o el que ya tenía la fila), el nombre
 * en la app (respuesta 1: el corto, con el de Mapbox como detalle), la hora de su punto comparada con la de San Luis Potosí, y el área: 15 km y
 * los municipios que caen en ella (respuesta 2), o sus alcaldías y su radio si ya los tiene (Ciudad de México, OL-429).
 */
export async function resolverCiudad(eleccion: Eleccion): Promise<ResultadoResolver> {
  const { supabase } = await soloAdmin();
  const filas = await leerTabla(supabase);
  if (!filas) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const token = configPublica().mapboxToken;
  let lugar = "lugar" in eleccion ? lugarLimpio(eleccion.lugar) : null;
  if ("lugar" in eleccion && !lugar) return { ok: false, error: "No entendimos esa ciudad. Búscala otra vez." };
  const fila = "slug" in eleccion ? (filas.find((f) => f.slug === eleccion.slug) ?? null) : lugar ? existenteDe([lugar.nombre, nombreCorto(lugar)], filas) : null;
  if ("slug" in eleccion && !fila) return { ok: false, error: "Esa ciudad ya no está. Recarga la página." };
  let centro = fila?.lat != null && fila.lng != null ? { lat: fila.lat, lng: fila.lng } : lugar ? { lat: lugar.lat, lng: lugar.lng } : null;
  if (!centro && fila && token) {
    lugar = await lugarPorNombre(fila.nombre, token, CIUDAD_INICIAL.centro);
    if (lugar) centro = { lat: lugar.lat, lng: lugar.lng };
  }
  if (!centro) return { ok: false, error: `No encontramos ${fila?.nombre ?? "esa ciudad"} en el mapa. Escribe su nombre en el campo.` };
  if (!lugar && token) lugar = await lugarEnPunto(centro, token);
  const largo = lugar?.nombre ?? fila!.nombre;
  const nombre = nombreCorto({ nombre: fila?.nombre ?? largo, region: lugar?.region ?? null, codigoPais: lugar?.codigoPais ?? null, pais: lugar?.pais ?? null });
  const zona = zonaDePunto(centro.lat, centro.lng);
  const p = leerParametrosVista(fila?.parametros);
  const radioKm = p.radioKm ?? RADIO_ALTA_KM;
  let municipios: string[] | null = p.municipios;
  if (!p.alcaldias.length && !p.municipios.length) {
    const nombres = token ? await nombresAlrededor(centro, radioKm, token) : null;
    municipios = nombres ? municipiosDelArea(nombres, [nombre, largo, fila?.nombre, ...(fila?.alias ?? [])]) : null;
  }
  const abiertas = filas.filter((f) => estadoVisible(f.estado) === "abierta" && f.slug !== fila?.slug);
  const referencia = abiertas.find((f) => f.slug === CIUDAD_INICIAL.slug) ?? abiertas[0] ?? null;
  return {
    ok: true,
    alta: {
      desde: fila?.slug ?? null,
      nombre,
      largo,
      region: lugar ? detalleRegion(lugar) : "",
      lat: centro.lat,
      lng: centro.lng,
      zona,
      hora: textoHora(zona, referencia ? { nombre: referencia.nombre, zona: referencia.zona } : null),
      radioKm,
      municipios,
      alcaldias: p.alcaldias,
      area: textoArea(radioKm, municipios, p.alcaldias),
      mapa: urlMapaArea(centro, radioKm, token),
    },
  };
}

export type DatosAbrir = { desde: string | null; nombre: string; largo: string; lat: number; lng: number; radioKm: number; municipios: string[] | null };
export type ResultadoAbrir = { ok: true; href: string } | { ok: false; error: string };

/**
 * «Abrir Oaxaca»: deja la ciudad abierta y entra a su panel. Nueva: la fila con su slug (del nombre en la app), el nombre corto, de alias el de
 * Mapbox y los municipios del área (como Soledad con San Luis: las búsquedas también los cuentan), su centro, zoom 13, la zona de su punto y en
 * `parametros` el radio, los municipios y cuándo se abrió. Una detectada u oculta se abre en su misma fila (conserva sus consultas). Nunca dos:
 * si ya hay una abierta con ese nombre o alias, lleva a su panel sin tocar nada.
 */
export async function abrirCiudad(d: DatosAbrir): Promise<ResultadoAbrir> {
  const nombre = texto(d?.nombre);
  if (!nombre) return { ok: false, error: "Escribe el nombre de la ciudad." };
  if (!enRango(d.lat, -90, 90) || !enRango(d.lng, -180, 180)) return { ok: false, error: "No sabemos dónde está. Búscala otra vez." };
  const largo = texto(d.largo);
  const { supabase } = await soloAdmin();
  const filas = await leerTabla(supabase);
  if (!filas) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const desde = d.desde ? (filas.find((f) => f.slug === d.desde) ?? null) : null;
  if (d.desde && !desde) return { ok: false, error: "Esa ciudad ya no está. Recarga la página." };
  const misma = desde ?? filas.find((f) => f.slug === slugDeCiudad(nombre)) ?? existenteDe([nombre, largo], filas);
  if (misma && estadoVisible(misma.estado) === "abierta") return { ok: true, href: `/admin/ciudades/${misma.slug}` };
  const slug = misma?.slug ?? slugDeCiudad(nombre);
  if (!SLUG.test(slug) || slug.length > 80) return { ok: false, error: "Ese nombre no sirve para una ciudad. Prueba con otro." };
  const municipios = d.municipios === null ? null : textos(d.municipios);
  const radio = enRango(d.radioKm, 0.5, 100) ? d.radioKm : RADIO_ALTA_KM;
  const zona = zonaDePunto(d.lat, d.lng);
  const abiertaEn = new Date().toISOString();
  if (misma) {
    const antes = misma.parametros;
    const conAlcaldias = Array.isArray(antes.alcaldias) && antes.alcaldias.length > 0;
    const { error } = await supabase
      .from("ciudades")
      .update({
        nombre,
        estado: "abierta",
        lat: d.lat,
        lng: d.lng,
        zona,
        alias: aliasNuevos(nombre, [...misma.alias, misma.nombre, largo, ...(municipios ?? [])]),
        parametros: { ...antes, radio_km: antes.radio_km ?? radio, ...(conAlcaldias || municipios === null ? {} : { municipios }), abierta_en: abiertaEn },
      })
      .eq("slug", misma.slug)
      .in("estado", ["detectada", "cerrada"])
      .select("slug");
    if (error) return { ok: false, error: "No se pudo abrir. Intenta de nuevo." };
    revalidar();
    // Si otra pestaña la abrió primero, ya está abierta: igual se entra a su panel.
    return { ok: true, href: `/admin/ciudades/${misma.slug}` };
  }
  const { error } = await supabase.from("ciudades").insert({
    slug,
    nombre,
    lat: d.lat,
    lng: d.lng,
    zoom: 13,
    zona,
    alias: aliasNuevos(nombre, [largo, ...(municipios ?? [])]),
    estado: "abierta",
    parametros: { radio_km: radio, ...(municipios === null ? {} : { municipios }), abierta_en: abiertaEn },
  });
  // 23505: otra pestaña la dio de alta a la vez; ya existe, se entra a su panel.
  if (error && error.code !== "23505") return { ok: false, error: "No se pudo abrir. Intenta de nuevo." };
  revalidar();
  return { ok: true, href: `/admin/ciudades/${slug}` };
}

/** «Ocultar» una detectada (respuesta 6): queda cerrada y no vuelve a salir aunque siga sumando consultas. Se vuelve a abrir desde «Añadir ciudad». */
export async function ocultarCiudad(slug: string): Promise<Resultado> {
  return cambiarEstado(slug, "detectada", "cerrada", "Ya no está detectada. Recarga la página.");
}

/** «Deshacer» justo después de ocultarla: vuelve a detectada. */
export async function mostrarCiudad(slug: string): Promise<Resultado> {
  return cambiarEstado(slug, "cerrada", "detectada", "No se pudo deshacer. Recarga la página.");
}

async function cambiarEstado(slug: string, de: EstadoCiudad, a: EstadoCiudad, siNo: string): Promise<Resultado> {
  if (typeof slug !== "string" || !SLUG.test(slug) || slug.length > 80) return { ok: false, error: "No encontramos esa ciudad. Recarga la página." };
  const { supabase } = await soloAdmin();
  const { data, error } = await supabase.from("ciudades").update({ estado: a }).eq("slug", slug).eq("estado", de).select("slug");
  if (error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  if (!data?.length) return { ok: false, error: siNo };
  revalidar();
  return { ok: true };
}
