import "server-only";
import { createClient } from "@supabase/supabase-js";
import { contenidoCorreo, contenidoPush, contenidoPushAdmin, type Cambio, type EventoParaAviso, type TipoAviso } from "./avisos";
import { urlBaja } from "./baja";
import { cuerpoCorreo, enviarCorreoIdempotente, type ResultadoEnvio } from "./correo";
import { enviarPushEndpoint } from "./push";
import { clienteAdmin } from "./supabase/admin";
import { configPublica } from "./config";

export type Claim = { id: string; token: string; lease_hasta: string };
export type Entrega = { id: string; job_id: string; usuario_id: string; canal: "correo" | "push";
  cuerpo: string | null; evento: EventoParaAviso; tipo: TipoAviso; cambio: Cambio;
  creado_en: string; vence: string; suscripcion: unknown };
export type DependenciasAvisos = {
  rpc: <T>(nombre: string, args?: Record<string, unknown>, timeoutMs?: number) => Promise<T>;
  correoDe: (id: string, timeoutMs?: number) => Promise<string>;
  correo: typeof enviarCorreoIdempotente;
  push: typeof enviarPushEndpoint;
  baja: (id: string) => string;
  ahora: () => number;
};

function dependencias(): DependenciasAvisos {
  const admin = clienteAdmin();
  const url = configPublica().supabaseUrl;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin || !url || !llave) throw new Error("avisos_sin_config");
  return {
    rpc: async <T>(nombre: string, args?: Record<string, unknown>, timeoutMs = 5_000) => {
      const { data, error } = await admin.rpc(nombre, args).abortSignal(AbortSignal.timeout(timeoutMs));
      if (error) throw new Error("avisos_base");
      return data as T;
    },
    correoDe: async (id, timeoutMs = 5_000) => {
      // Auth Admin no acepta signal por llamada. Cliente acotado a esta consulta,
      // sin cambiar el fetch compartido de los otros tres workers.
      const signal = AbortSignal.timeout(timeoutMs);
      const auth = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => fetch(input, { ...init,
          signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]) }) } });
      const resultado = await conPlazo(auth.auth.admin.getUserById(id), timeoutMs);
      if (resultado.error) throw new Error("avisos_auth");
      const user = resultado.data.user;
      if (!user?.email || !user.email_confirmed_at) throw new Error("avisos_sin_correo_confirmado");
      return user.email;
    },
    correo: enviarCorreoIdempotente, push: enviarPushEndpoint, ahora: Date.now,
    baja: (id) => {
      return urlBaja(id, llave);
    },
  };
}

async function conPlazo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promesa, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("avisos_timeout")), ms); })]); }
  finally { clearTimeout(timer); }
}

function plazo(d: DependenciasAvisos, fin: number, reserva = 0, maximo = 5_000) {
  const ms = Math.floor(Math.min(maximo, fin - d.ahora() - reserva));
  if (ms < 1) throw new Error("avisos_presupuesto");
  return ms;
}

export async function procesarEntrega(c: Claim, d: DependenciasAvisos, fin = d.ahora() + 40_000): Promise<boolean> {
  const args = { p_id: c.id, p_token: c.token };
  const rpc = <T>(nombre: string, a: Record<string, unknown>) => d.rpc<T>(nombre, a, plazo(d, fin, 1_000));
  const terminar = (r: ResultadoEnvio) => d.rpc<boolean>("avisos_terminar", { ...args, p_resultado: r.estado, p_codigo: r.codigo }, plazo(d, fin));
  try {
    const entrega = await rpc<Entrega | null>("avisos_autorizar", args);
    if (!entrega) return false;
    let cuerpo = entrega.cuerpo;
    if (entrega.canal === "correo") {
      // Auth falla cerrado en CADA intento, tambien con un cuerpo ya persistido.
      const para = await d.correoDe(entrega.usuario_id, plazo(d, fin, 1_000));
      if (cuerpo && (JSON.parse(cuerpo) as { to: string[] }).to[0] !== para) {
        await terminar({ estado: "descartada", codigo: "correo_cambio" }); return false;
      }
      if (!cuerpo) {
        const bajaUrl = d.baja(entrega.usuario_id);
        cuerpo = cuerpoCorreo({ para, ...contenidoCorreo(entrega.tipo, entrega.evento, entrega.cambio, new Date(entrega.creado_en), bajaUrl), bajaUrl });
      }
    } else if (!cuerpo) {
      cuerpo = JSON.stringify({ ...contenidoPush(entrega.tipo, entrega.evento, entrega.cambio, new Date(entrega.creado_en)), tag: `aviso-${entrega.job_id}` });
    }
    // La confirmacion durable precede a cualquier efecto externo. Un timeout aqui NO envia.
    cuerpo = await rpc<string | null>("avisos_preparar", { ...args, p_cuerpo: cuerpo });
    if (!cuerpo) return false;
    const vigente = await rpc<Entrega | null>("avisos_autorizar", args);
    if (!vigente || d.ahora() >= Date.parse(c.lease_hasta) - 15_000 || d.ahora() >= Date.parse(vigente.vence)) return false;
    const ttl = (Date.parse(vigente.vence) - d.ahora()) / 1000;
    const signal = AbortSignal.timeout(plazo(d, Math.min(fin, Date.parse(c.lease_hasta) - 15_000, Date.parse(vigente.vence)), 1_000, 8_000));
    const resultado = vigente.canal === "correo"
      ? await d.correo(cuerpo, `aviso/${c.id}`, signal)
      : await d.push(vigente.suscripcion, cuerpo, ttl, signal);
    // Si se pierde este ACK, el lease se recupera: misma clave/cuerpo de correo.
    const confirmado = await terminar(resultado);
    return confirmado && resultado.estado === "enviada";
  } catch {
    try { await terminar({ estado: "reintentar", codigo: "worker_dependencia" }); } catch { /* El lease conserva la recuperacion. */ }
    return false;
  }
}

/** Presupuesto local mas cuatro slots SQL globales. No depende de que after sobreviva. */
export async function drenarAvisos(opciones: { ms?: number; recordatorios?: boolean } = {}, inyectadas?: DependenciasAvisos) {
  const d = inyectadas ?? dependencias();
  const fin = d.ahora() + Math.max(3_000, Math.min(40_000, opciones.ms ?? 10_000));
  const trabajoHasta = fin - 1_000; // Informe final; cada entrega reserva otro segundo para su ACK.
  if (opciones.recordatorios) await d.rpc("avisos_recordatorios", undefined, plazo(d, trabajoHasta));
  // Cada llamada avanza un cursor durable; el siguiente cron continua, sin truncar destinatarios.
  for (let i = 0; i < 10 && d.ahora() < trabajoHasta - 1_000; i++) if (!await d.rpc<boolean>("avisos_expandir", undefined, plazo(d, trabajoHasta))) break;
  let tomados = 0;
  let enviados = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (d.ahora() < trabajoHasta - 1_000 && tomados < 40) {
      tomados++;
      let c: Claim | null;
      try { c = await d.rpc<Claim | null>("avisos_tomar", undefined, plazo(d, trabajoHasta, 1_000)); }
      catch { break; } // Esperar los demas loops; nunca retornar mientras otro sigue enviando.
      if (!c) break;
      if (await procesarEntrega(c, d, trabajoHasta)) enviados++;
    }
  }));
  return { enviados, estado: await d.rpc<Record<string, number>>("avisos_estado", undefined, plazo(d, fin)) };
}

export async function intentarDrenarAvisos(): Promise<void> {
  try { await drenarAvisos({ ms: 5_000 }); }
  catch { console.error("avisos: drenaje aplazado; cola persistente"); }
}

// ---------- OL-115: aviso al administrador. Mismo cron/endpoint/worker; tablas propias
// (avisos_admin_jobs/entregas, migración 20260922150000), sin tocar avisos_jobs/avisos_entregas. ----------
export type ClaimAdmin = { id: string; token: string };
export type EntregaAdmin = { id: string; job_id: string; usuario_id: string; cuerpo: string | null;
  motivos: Record<string, number>; creado_en: string; suscripcion: unknown };

export async function procesarEntregaAdmin(c: ClaimAdmin, d: DependenciasAvisos, fin = d.ahora() + 15_000): Promise<boolean> {
  const args = { p_id: c.id, p_token: c.token };
  const rpc = <T>(nombre: string, a: Record<string, unknown>) => d.rpc<T>(nombre, a, plazo(d, fin, 500));
  const terminar = (r: ResultadoEnvio) => d.rpc<boolean>("avisos_admin_terminar", { ...args, p_resultado: r.estado, p_codigo: r.codigo }, plazo(d, fin));
  try {
    const entrega = await rpc<EntregaAdmin | null>("avisos_admin_autorizar", args);
    if (!entrega) return false;
    let cuerpo = entrega.cuerpo;
    // Sin datos personales: el cuerpo sale solo de los conteos por motivo, nunca de un nombre o id.
    if (!cuerpo) cuerpo = JSON.stringify({ ...contenidoPushAdmin(entrega.motivos), tag: `aviso-admin-${entrega.job_id}` });
    cuerpo = await rpc<string | null>("avisos_admin_preparar", { ...args, p_cuerpo: cuerpo });
    if (!cuerpo) return false;
    const vigente = await rpc<EntregaAdmin | null>("avisos_admin_autorizar", args);
    if (!vigente) return false;
    const signal = AbortSignal.timeout(plazo(d, fin, 500, 8_000));
    const resultado = await d.push(vigente.suscripcion, cuerpo, 3_600, signal);
    const confirmado = await terminar(resultado);
    return confirmado && resultado.estado === "enviada";
  } catch {
    try { await terminar({ estado: "reintentar", codigo: "worker_dependencia" }); } catch { /* El lease conserva la recuperacion. */ }
    return false;
  }
}

/** Volumen chico (solo administradores): sin los cuatro slots SQL del motor principal, un claim a la vez basta. */
export async function drenarAvisosAdmin(opciones: { ms?: number } = {}, inyectadas?: DependenciasAvisos) {
  const d = inyectadas ?? dependencias();
  const fin = d.ahora() + Math.max(2_000, Math.min(15_000, opciones.ms ?? 8_000));
  const trabajoHasta = fin - 500;
  for (let i = 0; i < 5 && d.ahora() < trabajoHasta - 500; i++) if (!await d.rpc<boolean>("avisos_admin_expandir", undefined, plazo(d, trabajoHasta))) break;
  let enviados = 0;
  for (let tomados = 0; tomados < 10 && d.ahora() < trabajoHasta - 500; tomados++) {
    let c: ClaimAdmin | null;
    try { c = await d.rpc<ClaimAdmin | null>("avisos_admin_tomar", undefined, plazo(d, trabajoHasta, 500)); }
    catch { break; }
    if (!c) break;
    if (await procesarEntregaAdmin(c, d, trabajoHasta)) enviados++;
  }
  return { enviados };
}
