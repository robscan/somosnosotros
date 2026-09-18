"use server";

import { asistenciasNuevos, CAMPOS_NUEVOS, cuentasNuevos, eventosNuevos, filasNuevos, LIMITE_NUEVOS, rangoNuevos, type Decididas, type RespuestaNuevos } from "@/lib/cargarNuevos";
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

/** Carga propia de Nuevos al abrir: el limite y el reloj pertenecen al servidor. */
export async function cargarNuevos(ciudadNombre: string, desde: number, hasta?: string): Promise<RespuestaNuevos> {
  const ahora = new Date();
  const rango = rangoNuevos(ciudadNombre, desde, hasta, ahora);
  if (!rango) return { ok: false, error: "La consulta de Nuevos no es valida. Vuelve a abrir la pestana." };
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
    const respuesta = await esperar(supabase.from("eventos").select(CAMPOS_NUEVOS)
      .eq("visible", true).eq("ciudad", rango.ciudadNombre).or(filtroSinPasar(ahora))
      .gte("creado_en", rango.desde).lte("creado_en", rango.sello)
      .order("creado_en", { ascending: false }).order("inicio").order("titulo").order("id")
      .limit(LIMITE_NUEVOS).abortSignal(signal), signal);
    if (respuesta.error) throw new Error("eventos");
    const filas = filasNuevos.parse(respuesta.data);
    const ids = filas.map((f) => f.id);
    const permitidos = new Set(ids);
    if (permitidos.size !== ids.length) throw new Error("eventos_repetidos");
    const asistencias: Decididas = usuario ? {} : null;
    if (!ids.length) return { ok: true, eventos: [], asistencias, sello: rango.sello };
    const [a, m] = await Promise.all([
      esperar(supabase.rpc("van_por_evento", { ids }).abortSignal(signal), signal),
      usuario ? esperar(supabase.from("asistencias").select("evento_id, estado").eq("usuario_id", usuario)
        .in("evento_id", ids).limit(LIMITE_NUEVOS).abortSignal(signal), signal) : Promise.resolve({ data: [], error: null }),
    ]);
    if (a.error || m.error) throw new Error("asistencias");
    const van = new Map<string, number>();
    for (const fila of cuentasNuevos.parse(a.data)) {
      if (!permitidos.has(fila.evento_id) || van.has(fila.evento_id)) throw new Error("conteos");
      van.set(fila.evento_id, fila.n);
    }
    for (const fila of asistenciasNuevos.parse(m.data)) {
      if (!asistencias || !permitidos.has(fila.evento_id) || fila.evento_id in asistencias) throw new Error("asistencias");
      asistencias[fila.evento_id] = fila.estado;
    }
    return { ok: true, eventos: eventosNuevos(filas, van), asistencias, sello: rango.sello };
  } catch {
    return { ok: false, error: "No se pudieron cargar los nuevos. Intenta de nuevo." };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
