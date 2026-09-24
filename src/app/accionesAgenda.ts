"use server";

import { asistenciasCercanos, CAMPOS_CERCANOS, cuentasCercanos, eventosCercanos, filasCercanos, LIMITE_CERCANOS, type Decididas, type RespuestaCercanos } from "@/lib/cargarCercanos";
import { filtroSinPasar } from "@/lib/fechas";
import { clienteServidor } from "@/lib/supabase/servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function esperar<T>(tarea: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let cancelar: () => void = () => {};
  try {
    return await Promise.race([Promise.resolve(tarea), new Promise<never>((_, reject) => {
      cancelar = () => reject(new Error("tiempo"));
      signal.addEventListener("abort", cancelar, { once: true });
    })]);
  } finally { signal.removeEventListener("abort", cancelar); }
}

/**
 * Carga propia de Cercanos (OL-095, L36): próximos eventos de todas las ciudades, sin filtrar por la del chip —
 * la persona pide su ubicación con el botón y el teléfono ordena por distancia; aquí nunca llegan sus
 * coordenadas, solo se pide la lista.
 */
export async function cargarCercanos(): Promise<RespuestaCercanos> {
  const ahora = new Date();
  const controller = new AbortController();
  const { signal } = controller;
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const supabase = await esperar(clienteServidor(), signal);
    if (!supabase) throw new Error("configuracion");
    const auth = await esperar(supabase.auth.getClaims(), signal);
    if (auth.error) throw new Error("sesion");
    const usuario = auth.data === null ? null : auth.data?.claims?.sub;
    if (usuario !== null && (typeof usuario !== "string" || !UUID.test(usuario))) throw new Error("sesion");
    if (usuario) {
      const perfil = await esperar(supabase.from("perfiles").select("id").eq("id", usuario).abortSignal(signal).maybeSingle(), signal);
      if (perfil.error || perfil.data?.id !== usuario) throw new Error("cuenta");
    }
    const respuesta = await esperar(supabase.from("eventos").select(CAMPOS_CERCANOS)
      .eq("visible", true).or(filtroSinPasar(ahora))
      .order("inicio").order("titulo").order("id")
      .limit(LIMITE_CERCANOS).abortSignal(signal), signal);
    if (respuesta.error) throw new Error("eventos");
    const filas = filasCercanos.parse(respuesta.data);
    const ids = filas.map((f) => f.id);
    const permitidos = new Set(ids);
    if (permitidos.size !== ids.length) throw new Error("eventos_repetidos");
    const asistencias: Decididas = usuario ? {} : null;
    if (!ids.length) return { ok: true, eventos: [], asistencias };
    const [a, m] = await Promise.all([
      esperar(supabase.rpc("van_por_evento", { ids }).abortSignal(signal), signal),
      usuario ? esperar(supabase.from("asistencias").select("evento_id, estado").eq("usuario_id", usuario)
        .in("evento_id", ids).limit(LIMITE_CERCANOS).abortSignal(signal), signal) : Promise.resolve({ data: [], error: null }),
    ]);
    if (a.error || m.error) throw new Error("asistencias");
    const van = new Map<string, number>();
    for (const fila of cuentasCercanos.parse(a.data)) {
      if (!permitidos.has(fila.evento_id) || van.has(fila.evento_id)) throw new Error("conteos");
      van.set(fila.evento_id, fila.n);
    }
    for (const fila of asistenciasCercanos.parse(m.data)) {
      if (!asistencias || !permitidos.has(fila.evento_id) || fila.evento_id in asistencias) throw new Error("asistencias");
      asistencias[fila.evento_id] = fila.estado;
    }
    return { ok: true, eventos: eventosCercanos(filas, van), asistencias };
  } catch {
    return { ok: false, error: "No pudimos cargar los eventos cercanos. Intenta de nuevo." };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
