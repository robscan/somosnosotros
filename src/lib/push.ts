import "server-only";
import http2 from "node:http2";
import { sign } from "node:crypto";
import webpush from "web-push";
import { validarSuscripcionPush } from "./suscripcionPush";
import { clienteAdmin } from "./supabase/admin";
import type { ResultadoEnvio } from "./correo";
import type { EntornoApns } from "./dispositivosApns";

export function pushActivo(): boolean { return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY); }
export type AvisoPush = { titulo: string; cuerpo: string; url: string; tag?: string };

/** Una entrega por endpoint. El worker, no esta funcion, limita la concurrencia global. */
export async function enviarPushEndpoint(suscripcion: unknown, cuerpo: string, ttl: number, deadline?: AbortSignal): Promise<ResultadoEnvio> {
  const s = validarSuscripcionPush(suscripcion);
  if (!s || !Number.isFinite(ttl)) return { estado: "fallida", codigo: "push_invalido" };
  if (ttl <= 0) return { estado: "descartada", codigo: "push_caducado" };
  if (!pushActivo()) return { estado: "reintentar", codigo: "push_config" };
  try {
    const peticion = webpush.generateRequestDetails(s, cuerpo, {
      TTL: Math.max(0, Math.min(3600, Math.floor(ttl))),
      vapidDetails: { subject: process.env.VAPID_SUBJECT || "mailto:hola@somosnosotros.org",
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
    });
    // La libreria cifra/firma; fetch limita todo HTTP, no solo inactividad del socket.
    const res = await fetch(s.endpoint, { method: "POST", headers: peticion.headers,
      body: new Uint8Array(peticion.body), redirect: "error",
      signal: AbortSignal.any([...(deadline ? [deadline] : []), AbortSignal.timeout(Math.max(1, Math.floor(Math.min(8_000, ttl * 1000))))]) });
    const status = res.status;
    await res.body?.cancel();
    if (res.ok) return { estado: "enviada", codigo: "aceptado" };
    // No se borra una suscripcion que pudo renovarse mientras respondia el proveedor.
    return { estado: status >= 400 && status < 500 && status !== 429 && status !== 408 ? "fallida" : "reintentar", codigo: `push_${status}` };
  } catch { return { estado: "reintentar", codigo: "push_red" }; }
}

// ---------- OL-213 (bitácora 242): avisos nativos en la app de iPhone. Dentro de la app no hay Web Push
// (src/lib/pushCliente.ts lo detecta), así que el mismo "canal push" del trabajador de avisos (avisosWorker.ts)
// también manda por APNs cuando la suscripción es un token de dispositivo (dispositivos_apns, en vez de un
// endpoint de navegador). Sin dependencias nuevas en la raíz: JWT ES256 con node:crypto, HTTP/2 con node:http2. ----------

/** Equipo y tema fijos de la cuenta de Apple Developer del founder (bitácora 237, reference-apple-developer). */
const APNS_TEAM_ID = "AT53235M7U";
const APNS_TOPIC = "org.somosnosotros.app";

export type SuscripcionApns = { token: string; entorno: EntornoApns };

function base64url(datos: string | Buffer): string {
  return Buffer.from(datos).toString("base64url");
}

let avisadoSinConfigApns = false;
let jwtCache: { valor: string; creadoEn: number } | null = null;

/**
 * El JWT del proveedor (RFC 7519, encabezado ES256) dura hasta 60 minutos según Apple; se reutiliza durante 55 para
 * no firmar de más ni arriesgarse a que APNs limite la tasa de tokens nuevos. `dsaEncoding: "ieee-p1363"` es
 * obligatorio: sin él, `crypto.sign` para una llave EC da la firma en DER, que APNs rechaza (espera r‖s de 64 bytes).
 */
function jwtApns(ahora = Date.now()): string | null {
  const keyId = process.env.APNS_KEY_ID;
  const p8 = process.env.APNS_KEY_P8;
  if (!keyId || !p8) {
    if (!avisadoSinConfigApns) {
      avisadoSinConfigApns = true;
      console.warn("avisos: APNS_KEY_ID/APNS_KEY_P8 no configuradas; el envío nativo (APNs) se salta");
    }
    return null;
  }
  const segundos = Math.floor(ahora / 1000);
  if (jwtCache && segundos - jwtCache.creadoEn < 55 * 60) return jwtCache.valor;
  const encabezado = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const cuerpo = base64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: segundos }));
  const datos = `${encabezado}.${cuerpo}`;
  const firma = sign("sha256", Buffer.from(datos), { key: p8, dsaEncoding: "ieee-p1363" });
  const jwt = `${datos}.${base64url(firma)}`;
  jwtCache = { valor: jwt, creadoEn: segundos };
  return jwt;
}

function hostApns(entorno: EntornoApns): string {
  return entorno === "produccion" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
}

// Una sesión HTTP/2 por host, reutilizada entre envíos (Apple recomienda no reconectar por notificación); si se
// cae (red, GOAWAY) se descarta y la siguiente llamada abre una nueva.
const sesionesApns = new Map<string, http2.ClientHttp2Session>();
function sesionApns(entorno: EntornoApns): http2.ClientHttp2Session {
  const host = hostApns(entorno);
  const existente = sesionesApns.get(host);
  if (existente && !existente.closed && !existente.destroyed) return existente;
  const session = http2.connect(host);
  session.on("error", () => sesionesApns.delete(host));
  session.on("goaway", () => sesionesApns.delete(host));
  session.on("close", () => sesionesApns.delete(host));
  sesionesApns.set(host, session);
  return session;
}

function peticionApns(session: http2.ClientHttp2Session, headers: http2.OutgoingHttpHeaders, payload: string, ms: number, deadline?: AbortSignal): Promise<{ status: number; cuerpo: string }> {
  return new Promise((resolve, reject) => {
    const req = session.request(headers);
    const trozos: Buffer[] = [];
    let status = 0;
    let terminado = false;
    const limite = setTimeout(() => abortar(new Error("apns_timeout")), ms);
    function abortar(motivo: unknown) {
      if (terminado) return;
      terminado = true;
      clearTimeout(limite);
      deadline?.removeEventListener("abort", alAbortar);
      req.close(http2.constants.NGHTTP2_CANCEL);
      reject(motivo instanceof Error ? motivo : new Error("apns_abortado"));
    }
    function alAbortar() { abortar(new Error("apns_abortado")); }
    deadline?.addEventListener("abort", alAbortar);
    req.on("response", (h) => { status = Number(h[":status"]) || 0; });
    req.on("data", (d: Buffer) => trozos.push(d));
    req.on("end", () => {
      if (terminado) return;
      terminado = true;
      clearTimeout(limite);
      deadline?.removeEventListener("abort", alAbortar);
      resolve({ status, cuerpo: Buffer.concat(trozos).toString("utf8") });
    });
    req.on("error", (e) => abortar(e));
    req.end(payload);
  });
}

/** Mismo cuerpo que ya arma `contenidoPush`/`contenidoPushAdmin` (avisos.ts): titulo/cuerpo/url/tag. */
function payloadApns(cuerpo: string): { payload: string; collapseId: string | null } {
  let c: { titulo?: string; cuerpo?: string; url?: string; tag?: string };
  try { c = JSON.parse(cuerpo); } catch { c = {}; }
  const payload = JSON.stringify({ aps: { alert: { title: c.titulo ?? "", body: c.cuerpo ?? "" }, sound: "default" }, url: c.url ?? "" });
  // apns-collapse-id: hasta 64 bytes (documentado por Apple); agrupa reintentos del mismo job como en Web Push (tag).
  return { payload, collapseId: c.tag ? c.tag.slice(0, 64) : null };
}

/** Mejor esfuerzo: si el borrado falla, el siguiente 410/BadDeviceToken lo vuelve a intentar. */
async function borrarTokenApnsInvalido(token: string): Promise<void> {
  try {
    const admin = clienteAdmin();
    await admin?.from("dispositivos_apns").delete().eq("token", token);
  } catch { /* no rompe el resultado del envío ya decidido */ }
}

/**
 * Un dispositivo por llamada; el worker, no esta funcion, limita la concurrencia global (igual que `enviarPushEndpoint`).
 * Tokens inválidos (410 con razón "Unregistered", o 400 "BadDeviceToken") se borran de una vez: a diferencia de
 * `suscripciones_push` (bitácora 113: ahí no se borra, por si una renovación concurrente pisara el borrado), un
 * token APNs vencido no se "renueva" con el mismo valor — la app pide uno nuevo la próxima vez que registre, así
 * que no hay carrera que perder.
 */
export async function enviarPushApns(suscripcion: SuscripcionApns, cuerpo: string, ttl: number, deadline?: AbortSignal): Promise<ResultadoEnvio> {
  if (!suscripcion || !/^[0-9a-fA-F]{32,200}$/.test(suscripcion.token) || !Number.isFinite(ttl)) return { estado: "fallida", codigo: "apns_invalido" };
  if (ttl <= 0) return { estado: "descartada", codigo: "apns_caducado" };
  const jwt = jwtApns();
  if (!jwt) return { estado: "reintentar", codigo: "apns_config" };
  const { payload, collapseId } = payloadApns(cuerpo);
  const ttlAcotado = Math.max(0, Math.min(3600, Math.floor(ttl)));
  try {
    const session = sesionApns(suscripcion.entorno);
    const headers: http2.OutgoingHttpHeaders = {
      ":method": "POST",
      ":path": `/3/device/${suscripcion.token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_TOPIC,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + ttlAcotado),
    };
    if (collapseId) headers["apns-collapse-id"] = collapseId;
    const ms = Math.max(1, Math.floor(Math.min(8_000, ttl * 1000)));
    const { status, cuerpo: respuesta } = await peticionApns(session, headers, payload, ms, deadline);
    if (status === 200) return { estado: "enviada", codigo: "aceptado" };
    let razon = "";
    try { razon = (JSON.parse(respuesta) as { reason?: string }).reason ?? ""; } catch { /* cuerpo vacío o no-JSON */ }
    if (status === 410 || razon === "BadDeviceToken" || razon === "Unregistered") {
      await borrarTokenApnsInvalido(suscripcion.token);
      return { estado: "fallida", codigo: `apns_${status}_${razon.toLowerCase() || "sin_razon"}` };
    }
    return { estado: status >= 400 && status < 500 && status !== 429 ? "fallida" : "reintentar", codigo: `apns_${status}` };
  } catch { return { estado: "reintentar", codigo: "apns_red" }; }
}

function esSuscripcionApns(s: unknown): s is { apns: SuscripcionApns } {
  return !!s && typeof s === "object" && "apns" in s;
}

/** Lo que llama el trabajador de avisos para el canal 'push': un endpoint de navegador (Web Push) o, dentro de la app, un token APNs. */
export async function enviarPush(suscripcion: unknown, cuerpo: string, ttl: number, deadline?: AbortSignal): Promise<ResultadoEnvio> {
  return esSuscripcionApns(suscripcion) ? enviarPushApns(suscripcion.apns, cuerpo, ttl, deadline) : enviarPushEndpoint(suscripcion, cuerpo, ttl, deadline);
}
