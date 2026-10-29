import "server-only";
import http2 from "node:http2";
import { createHash, createPrivateKey, sign, type KeyObject } from "node:crypto";
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
    // 404/410 no borran la suscripción: `avisos_terminar` la marca `muerta_en` (OL-476) y ya no recibe entregas.
    return { estado: status >= 400 && status < 500 && status !== 429 && status !== 408 ? "fallida" : "reintentar", codigo: `push_${status}` };
  } catch { return { estado: "reintentar", codigo: "push_red" }; }
}

// ---------- OL-213 (bitácora 242): avisos nativos en la app de iPhone. Dentro de la app no hay Web Push
// (src/lib/pushCliente.ts lo detecta), así que el mismo "canal push" del trabajador de avisos (avisosWorker.ts)
// también manda por APNs cuando la suscripción es un token de dispositivo (dispositivos_apns, en vez de un
// endpoint de navegador). Sin dependencias nuevas en la raíz: JWT ES256 con node:crypto, HTTP/2 con node:http2. ----------
// OL-476 (bitácora 508): en producción ningún aviso llegó a la app (12 entregas `worker_dependencia` tras 8 intentos).
// La firma del JWT era lo único del envío APNs fuera del `try`: si la llave no se podía leer, `crypto.sign` lanzaba y el
// trabajador lo convertía en `worker_dependencia`. Ahora la llave se lee tolerando cómo queda al pegarla en Vercel, cada
// fallo vuelve con su propio código (`apns_llave`, `apns_jwt`, `apns_timeout`, `apns_red_*`, `apns_http2_*`,
// `apns_<status>_<razón>`) y esta función no lanza.

/** Equipo y tema fijos de la cuenta de Apple Developer del founder (bitácora 237, reference-apple-developer). */
const APNS_TEAM_ID = "AT53235M7U";
const APNS_TOPIC = "org.somosnosotros.app";

export type SuscripcionApns = { token: string; entorno: EntornoApns };

function base64url(datos: string | Buffer): string {
  return Buffer.from(datos).toString("base64url");
}

/** Un código para `avisos_entregas.codigo` (la base exige `^[a-z0-9_]{1,60}$`). */
export function codigoSeguro(texto: string): string {
  const limpio = texto.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60).replace(/_$/, "");
  return limpio || "sin_codigo";
}

export type FormaLlaveApns = "falta" | "pem" | "pem_escapada" | "pem_en_una_linea" | "sin_encabezado" | "otra";

/** Cómo llegó el texto de la llave, sin revelar nada de ella (para el registro y la prueba de humo). */
function formaLlave(crudo: string): FormaLlaveApns {
  const t = crudo.trim();
  if (!t) return "falta";
  const encabezado = /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t);
  if (encabezado && /\\n/.test(t)) return "pem_escapada";
  if (encabezado && /\n/.test(t)) return "pem";
  if (encabezado) return "pem_en_una_linea";
  return /^["']?[A-Za-z0-9+/=\s\\]+["']?$/.test(t) ? "sin_encabezado" : "otra";
}

/**
 * La llave `.p8` de Apple (PKCS#8, curva P-256) en cualquiera de las formas en que suele quedar en una variable de entorno:
 * con saltos de línea reales, con `\n` literales (como queda al pegarla en una sola línea en Vercel), entre comillas, en
 * una sola línea con espacios, o solo el cuerpo en base64 sin las líneas `-----BEGIN/END PRIVATE KEY-----`. Se quita todo
 * menos el base64 y se lee como DER (PKCS#8; si no, SEC1 «EC PRIVATE KEY»). Devuelve `null` si no es una llave EC P-256.
 */
export function leerLlaveApns(crudo: string): KeyObject | null {
  let t = crudo.trim();
  if (t.length >= 2 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0]) t = t.slice(1, -1);
  t = t.replace(/\\r|\\n/g, "\n").replace(/-----(BEGIN|END) [A-Z ]*PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  if (!t || !/^[A-Za-z0-9+/]+={0,2}$/.test(t)) return null;
  const der = Buffer.from(t, "base64");
  for (const type of ["pkcs8", "sec1"] as const) {
    try {
      const llave = createPrivateKey({ key: der, format: "der", type });
      const ok = llave.asymmetricKeyType === "ec" && llave.asymmetricKeyDetails?.namedCurve === "prime256v1";
      return ok ? llave : null;
    } catch { /* probar la otra forma */ }
  }
  return null;
}

let avisadoSinConfigApns = false;
let avisadoLlaveApns = false;
let llaveCache: { crudo: string; llave: KeyObject | null } | null = null;
let jwtCache: { valor: string; creadoEn: number; crudo: string } | null = null;

function llaveApns(crudo: string): KeyObject | null {
  if (llaveCache?.crudo !== crudo) llaveCache = { crudo, llave: leerLlaveApns(crudo) };
  return llaveCache.llave;
}

type CodigoJwt = "apns_config" | "apns_llave" | "apns_jwt";
type Jwt = { jwt: string } | { codigo: CodigoJwt };

/**
 * El JWT del proveedor (RFC 7519, encabezado ES256) dura hasta 60 minutos según Apple; se reutiliza durante 55 para
 * no firmar de más ni arriesgarse a que APNs limite la tasa de tokens nuevos. `dsaEncoding: "ieee-p1363"` es
 * obligatorio: sin él, `crypto.sign` para una llave EC da la firma en DER, que APNs rechaza (espera r‖s de 64 bytes).
 */
function jwtApns(ahora = Date.now()): Jwt {
  // Un espacio o un salto de línea al final del id (fácil al pegar) haría que Apple respondiera InvalidProviderToken.
  const keyId = (process.env.APNS_KEY_ID ?? "").trim();
  const p8 = process.env.APNS_KEY_P8 ?? "";
  if (!keyId || !p8.trim()) {
    if (!avisadoSinConfigApns) {
      avisadoSinConfigApns = true;
      console.warn("avisos: APNS_KEY_ID/APNS_KEY_P8 no configuradas; el envío nativo (APNs) se salta");
    }
    return { codigo: "apns_config" };
  }
  const segundos = Math.floor(ahora / 1000);
  const crudo = `${keyId}\u0000${p8}`;
  if (jwtCache && jwtCache.crudo === crudo && segundos - jwtCache.creadoEn < 55 * 60) return { jwt: jwtCache.valor };
  const llave = llaveApns(p8);
  if (!llave) {
    if (!avisadoLlaveApns) {
      avisadoLlaveApns = true;
      // Nunca la llave: solo la forma en que llegó, para saber qué corregir en Vercel.
      console.error(`avisos: APNS_KEY_P8 no se puede leer como llave EC P-256 (forma: ${formaLlave(p8)}); los avisos a la app quedan en 'apns_llave'`);
    }
    return { codigo: "apns_llave" };
  }
  try {
    const encabezado = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
    const cuerpo = base64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: segundos }));
    const datos = `${encabezado}.${cuerpo}`;
    const firma = sign("sha256", Buffer.from(datos), { key: llave, dsaEncoding: "ieee-p1363" });
    const jwt = `${datos}.${base64url(firma)}`;
    jwtCache = { valor: jwt, creadoEn: segundos, crudo };
    return { jwt };
  } catch (e) {
    console.error(`avisos: no se pudo firmar el JWT de APNs (${e instanceof Error ? e.name : "error"})`);
    return { codigo: "apns_jwt" };
  }
}

export type DiagnosticoApns = { keyId: "falta" | "ok" | "rara"; llave: FormaLlaveApns; legible: boolean; jwt: "ok" | CodigoJwt };

/** Para la prueba de humo (OL-476): qué tan legible es la configuración de APNs, sin revelar la llave ni el id. */
export function diagnosticoLlaveApns(): DiagnosticoApns {
  const keyId = (process.env.APNS_KEY_ID ?? "").trim();
  const p8 = process.env.APNS_KEY_P8 ?? "";
  const j = jwtApns();
  return {
    keyId: !keyId ? "falta" : /^[A-Z0-9]{10}$/.test(keyId) ? "ok" : "rara",
    llave: formaLlave(p8),
    legible: !!p8.trim() && !!llaveApns(p8),
    jwt: "jwt" in j ? "ok" : j.codigo,
  };
}

function hostApns(entorno: EntornoApns): string {
  return entorno === "produccion" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
}

/** Un error de la conexión o del flujo, ya traducido a código. */
class ErrorApns extends Error {
  constructor(readonly codigo: string, detalle?: string) { super(detalle ?? codigo); this.name = "ErrorApns"; }
}

function traducirErrorApns(e: unknown): ErrorApns {
  if (e instanceof ErrorApns) return e;
  const code = (e as { code?: unknown } | null)?.code;
  const detalle = e instanceof Error ? e.message : String(e);
  if (typeof code === "string" && code.startsWith("ERR_HTTP2_")) return new ErrorApns(codigoSeguro(`apns_http2_${code.slice("ERR_HTTP2_".length)}`), detalle);
  if (typeof code === "string" && /CERT|TLS|SSL|VERIFY|SELF_SIGNED/.test(code)) return new ErrorApns(codigoSeguro(`apns_tls_${code}`), detalle);
  if (typeof code === "string" && /^E[A-Z_]+$/.test(code)) return new ErrorApns(codigoSeguro(`apns_red_${code}`), detalle);
  return new ErrorApns(codigoSeguro(`apns_http2_${typeof code === "string" ? code : e instanceof Error ? e.name : "desconocido"}`), detalle);
}

/**
 * Una sesión HTTP/2 por envío, que se cierra al terminar (OL-476). Antes se guardaba una por host entre llamadas, pero en
 * una función de Vercel la instancia se congela entre invocaciones y la sesión guardada puede despertar muerta sin haber
 * emitido `close`. Al volumen de hoy (decenas al día) el saludo TLS de más no importa. El plazo cubre también la conexión,
 * y el `signal` del trabajador corta cuando se acaba su presupuesto. Cualquier error de la sesión o del flujo se traduce
 * a código; nada queda sin oyente (un `error` sin oyente en una sesión HTTP/2 tumba el proceso).
 */
function peticionApns(host: string, headers: http2.OutgoingHttpHeaders, payload: string, ms: number, deadline?: AbortSignal): Promise<{ status: number; cuerpo: string }> {
  return new Promise((resolve, reject) => {
    let session: http2.ClientHttp2Session | null = null;
    const trozos: Buffer[] = [];
    let status = 0;
    let terminado = false;
    const limite = setTimeout(() => fin(new ErrorApns("apns_timeout")), ms);
    function alAbortar() { fin(new ErrorApns("apns_abortado")); }
    function fin(error: ErrorApns | null) {
      if (terminado) return;
      terminado = true;
      clearTimeout(limite);
      deadline?.removeEventListener("abort", alAbortar);
      try { if (error) session?.destroy(); else session?.close(); } catch { /* ya cerrada */ }
      if (error) reject(error);
      else resolve({ status, cuerpo: Buffer.concat(trozos).toString("utf8") });
    }
    if (deadline?.aborted) { fin(new ErrorApns("apns_abortado")); return; }
    deadline?.addEventListener("abort", alAbortar, { once: true });
    try {
      session = http2.connect(host);
      session.on("error", (e) => fin(traducirErrorApns(e)));
      session.on("close", () => fin(new ErrorApns("apns_http2_sesion_cerrada")));
      const req = session.request(headers);
      req.on("response", (h) => { status = Number(h[":status"]) || 0; });
      req.on("data", (d: Buffer) => trozos.push(d));
      req.on("end", () => fin(status ? null : new ErrorApns("apns_http2_sin_respuesta")));
      req.on("error", (e) => fin(traducirErrorApns(e)));
      req.on("close", () => fin(new ErrorApns(status ? "apns_http2_flujo_cortado" : "apns_http2_sin_respuesta")));
      req.end(payload);
    } catch (e) {
      fin(traducirErrorApns(e));
    }
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

/** ¿La respuesta dice que esa dirección ya no existe? (web 404/410; APNs 410 o 400 BadDeviceToken). Misma regla que `avisos_terminar` en SQL. */
export function esDireccionMuerta(codigo: string): boolean {
  return codigo === "push_404" || codigo === "push_410" || codigo === "apns_410" || codigo.startsWith("apns_410_") || codigo === "apns_400_baddevicetoken";
}

/**
 * Un dispositivo por llamada; el worker, no esta funcion, limita la concurrencia global (igual que `enviarPushEndpoint`).
 * Un token inválido (410, o 400 "BadDeviceToken") ya no se borra aquí (OL-476: nada se borra): `avisos_terminar` marca
 * `dispositivos_apns.muerta_en` y `avisos_expandir` deja de crearle entregas; quien manda fuera de la cola (el aviso de
 * redes, la prueba de humo) llama a `marcarDireccionMuerta`. Si la app vuelve a registrar el token, revive.
 */
export async function enviarPushApns(suscripcion: SuscripcionApns, cuerpo: string, ttl: number, deadline?: AbortSignal): Promise<ResultadoEnvio> {
  if (!suscripcion || typeof suscripcion.token !== "string" || !/^[0-9a-fA-F]{32,200}$/.test(suscripcion.token) || !Number.isFinite(ttl)) return { estado: "fallida", codigo: "apns_invalido" };
  if (ttl <= 0) return { estado: "descartada", codigo: "apns_caducado" };
  const j = jwtApns();
  if (!("jwt" in j)) {
    // Sin variables: se reintenta (puede ser un despliegue a medias). Una llave que no se lee o no firma es un fallo de
    // configuración: reintentar 8 veces no lo arregla, así que una vez y a 'fallida', con su aviso en el registro.
    return { estado: j.codigo === "apns_config" ? "reintentar" : "fallida", codigo: j.codigo };
  }
  const { payload, collapseId } = payloadApns(cuerpo);
  const ttlAcotado = Math.max(0, Math.min(3600, Math.floor(ttl)));
  const headers: http2.OutgoingHttpHeaders = {
    ":method": "POST",
    ":path": `/3/device/${suscripcion.token}`,
    authorization: `bearer ${j.jwt}`,
    "apns-topic": APNS_TOPIC,
    "apns-push-type": "alert",
    "apns-priority": "10",
    "apns-expiration": String(Math.floor(Date.now() / 1000) + ttlAcotado),
  };
  if (collapseId) headers["apns-collapse-id"] = collapseId;
  const ms = Math.max(1, Math.floor(Math.min(8_000, ttl * 1000)));
  let status: number;
  let respuesta: string;
  try {
    ({ status, cuerpo: respuesta } = await peticionApns(hostApns(suscripcion.entorno), headers, payload, ms, deadline));
  } catch (e) {
    const error = traducirErrorApns(e);
    // El mensaje de node:http2 no lleva el token (va en la cabecera :path, que no se imprime) ni el cuerpo del aviso.
    console.error(`avisos: APNs sin respuesta (${error.codigo}): ${error.message.replace(/[0-9a-fA-F]{32,}/g, "…").slice(0, 200)}`);
    return { estado: "reintentar", codigo: error.codigo };
  }
  if (status === 200) return { estado: "enviada", codigo: "aceptado" };
  let razon = "";
  try { razon = (JSON.parse(respuesta) as { reason?: string }).reason ?? ""; } catch { /* cuerpo vacío o no-JSON */ }
  if (typeof razon !== "string") razon = "";
  const codigo = codigoSeguro(`apns_${status}${razon ? `_${razon}` : status === 410 ? "_sin_razon" : ""}`);
  if (status === 403 && /ProviderToken/.test(razon)) {
    // InvalidProviderToken/ExpiredProviderToken: la llave, su id o el equipo no cuadran. Se firma de nuevo la próxima
    // vez y queda dicho en el registro (sin la llave).
    jwtCache = null;
    console.error(`avisos: APNs rechazó el JWT (${razon}); revisar APNS_KEY_ID y APNS_KEY_P8 en Vercel`);
  }
  if (status === 410 || razon === "BadDeviceToken" || razon === "Unregistered") return { estado: "fallida", codigo };
  return { estado: status >= 400 && status < 500 && status !== 429 ? "fallida" : "reintentar", codigo };
}

function esSuscripcionApns(s: unknown): s is { apns: SuscripcionApns } {
  return !!s && typeof s === "object" && "apns" in s;
}

/** Lo que llama el trabajador de avisos para el canal 'push': un endpoint de navegador (Web Push) o, dentro de la app, un token APNs. */
export async function enviarPush(suscripcion: unknown, cuerpo: string, ttl: number, deadline?: AbortSignal): Promise<ResultadoEnvio> {
  return esSuscripcionApns(suscripcion) ? enviarPushApns(suscripcion.apns, cuerpo, ttl, deadline) : enviarPushEndpoint(suscripcion, cuerpo, ttl, deadline);
}

/**
 * Fuera de la cola (el aviso de redes, la prueba de humo), lo que en la cola hace `avisos_terminar`: si el proveedor dijo
 * que la dirección ya no existe, se marca `muerta_en` (nada se borra). Mejor esfuerzo: un fallo aquí no cambia el resultado.
 */
export async function marcarDireccionMuerta(suscripcion: unknown, resultado: ResultadoEnvio): Promise<boolean> {
  if (resultado.estado !== "fallida" || !esDireccionMuerta(resultado.codigo)) return false;
  try {
    const admin = clienteAdmin();
    if (!admin) return false;
    const ahora = new Date().toISOString();
    if (esSuscripcionApns(suscripcion)) {
      const { error } = await admin.from("dispositivos_apns").update({ muerta_en: ahora }).eq("token", suscripcion.apns.token).is("muerta_en", null);
      return !error;
    }
    const endpoint = (suscripcion as { endpoint?: unknown } | null)?.endpoint;
    if (typeof endpoint !== "string") return false;
    const { error } = await admin.from("suscripciones_push").update({ muerta_en: ahora }).eq("endpoint", endpoint).is("muerta_en", null);
    return !error;
  } catch { return false; }
}

/** Huella corta de un token para distinguir teléfonos en un informe sin mostrar el token (OL-476). */
export function huellaToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 8);
}
