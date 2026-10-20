import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { after } from "next/server";
import type { CiudadConDatos } from "./ciudad";
import { configPublica } from "./config";
import { clienteAdmin } from "./supabase/admin";

/**
 * La detección de ciudades (OL-427; doc 57 §3.5 y §4.B): cada vez que Inicio o Lugares muestran una ciudad, una consulta más para esa ciudad
 * y ese día. Sin persona: se llama sin sesión (un cliente anónimo, sin cookies), después de responder (`after()`), y la base solo guarda el
 * slug, el día y el número. Si la ciudad todavía no está en la tabla de Administración, se da de alta como «detectada» con lo que la app ya
 * sabe de ella (nombre, centro si lo conoce, zona), con la llave de servicio. Nada cambia para la persona ni para la lista de ciudades.
 */

type Ciudad = Pick<CiudadConDatos, "slug" | "nombre" | "centro" | "zoom" | "zona"> & { centroConocido?: boolean };
type Clientes = { anonimo: () => SupabaseClient | null; servicio: () => SupabaseClient | null };

/** Un cliente sin sesión: la consulta no lleva a nadie (ni cookie ni token de la cuenta). */
function clienteAnonimo(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = configPublica();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|lighthouse|headless/i;

/**
 * ¿Esta petición es una consulta de alguien? No cuentan: lo que Next pide de antemano (prefetch), lo que vuelve a pintar una acción del
 * servidor (tocar «Me interesa» no es otra consulta) ni los robots (buscadores, vistas previas de enlaces).
 */
export function contarConsulta(cabeceras: Pick<Headers, "get">): boolean {
  if (cabeceras.get("next-router-prefetch") || cabeceras.get("next-action")) return false;
  if (/prefetch/i.test(cabeceras.get("purpose") ?? "") || /prefetch/i.test(cabeceras.get("sec-purpose") ?? "")) return false;
  const agente = cabeceras.get("user-agent") ?? "";
  return !!agente && !ROBOTS.test(agente);
}

/**
 * Lo que llaman Inicio y Lugares al resolver la ciudad: si la petición es una consulta de alguien, la cuenta después de responder. Nunca
 * espera a la base ni puede tumbar la página: fuera de una petición (una prueba que pinta la página a mano) simplemente no cuenta.
 */
export async function anotarConsulta(ciudad: Ciudad): Promise<void> {
  try {
    if (contarConsulta(await headers())) after(() => registrarVistaCiudad(ciudad));
  } catch {
    // Sin petición no hay a quién contar.
  }
}

/** Suma la consulta; si la ciudad no estaba, la da de alta como detectada y la vuelve a sumar. Nunca lanza: si algo falla, solo no cuenta. */
export async function registrarVistaCiudad(ciudad: Ciudad, clientes: Clientes = { anonimo: clienteAnonimo, servicio: clienteAdmin }): Promise<"contada" | "detectada" | "sin contar"> {
  try {
    const anonimo = clientes.anonimo();
    if (!anonimo) return "sin contar";
    const { data, error } = await anonimo.rpc("registrar_ciudad_vista", { p_slug: ciudad.slug });
    if (error) return "sin contar";
    if (data === true) return "contada";
    // `false`: la ciudad no está en la tabla. Cualquier otra respuesta (la base sin la función) no se toca.
    if (data !== false) return "sin contar";
    const servicio = clientes.servicio();
    if (!servicio) return "sin contar";
    const conCentro = ciudad.centroConocido !== false;
    const { error: alta } = await servicio.from("ciudades").upsert(
      { slug: ciudad.slug, nombre: ciudad.nombre, lat: conCentro ? ciudad.centro.lat : null, lng: conCentro ? ciudad.centro.lng : null, zoom: ciudad.zoom, zona: ciudad.zona, estado: "detectada" },
      { onConflict: "slug", ignoreDuplicates: true },
    );
    if (alta) return "sin contar";
    const otra = await anonimo.rpc("registrar_ciudad_vista", { p_slug: ciudad.slug });
    return otra.data === true ? "detectada" : "sin contar";
  } catch {
    return "sin contar";
  }
}
