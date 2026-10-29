import { EventEmitter } from "node:events";
import { generateKeyPairSync, verify as verificarFirma } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `push.ts` guarda el JWT y la sesión HTTP/2 en variables de módulo (para no firmar ni conectar de más entre
// envíos); cada prueba pide su propio módulo fresco con `vi.resetModules` + import dinámico, para que un token o
// una llave de una prueba no se cuele en la siguiente (jwtCache/sesionesApns).
async function cargarPush() {
  vi.resetModules();
  return import("./push");
}

// Llave de prueba (P-256/prime256v1, como exige ES256), generada aquí: nunca la del founder.
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const P8_PRUEBA = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
const KEY_ID_PRUEBA = "ABC123DEFG";

class FlujoFalso extends EventEmitter {
  cerrado = false;
  close = vi.fn(() => { this.cerrado = true; });
  end = vi.fn();
}
class SesionFalsa extends EventEmitter {
  closed = false;
  destroyed = false;
  request = vi.fn((headers: Record<string, string>) => { void headers; return new FlujoFalso(); });
  close = vi.fn(() => { this.closed = true; });
  destroy = vi.fn(() => { this.destroyed = true; });
}

const mocks = vi.hoisted(() => ({ connect: vi.fn(), borrar: vi.fn(), eq: vi.fn(), update: vi.fn(), is: vi.fn() }));
vi.mock("node:http2", async (importarOriginal) => {
  const real = await importarOriginal<typeof import("node:http2")>();
  return { ...real, default: { ...real, connect: mocks.connect }, connect: mocks.connect };
});
vi.mock("./supabase/admin", () => ({ clienteAdmin: () => ({ from: (tabla: string) => ({
  delete: () => ({ eq: mocks.eq }),
  update: (valores: unknown) => { mocks.update(tabla, valores); return { eq: (col: string, val: string) => { mocks.eq(col, val); return { is: mocks.is }; } }; },
}) }) }));

let sesion: SesionFalsa;
function responder(flujo: FlujoFalso, status: number, cuerpo = "") {
  flujo.emit("response", { ":status": status });
  if (cuerpo) flujo.emit("data", Buffer.from(cuerpo));
  flujo.emit("end");
}

beforeEach(() => {
  vi.clearAllMocks();
  sesion = new SesionFalsa();
  mocks.connect.mockReturnValue(sesion);
  mocks.eq.mockResolvedValue({ error: null });
  mocks.is.mockResolvedValue({ error: null });
  vi.stubEnv("APNS_KEY_ID", KEY_ID_PRUEBA);
  vi.stubEnv("APNS_KEY_P8", P8_PRUEBA);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const SUB = { token: "a".repeat(64), entorno: "sandbox" as const };

describe("enviarPushApns: armado del JWT", () => {
  it("firma un JWT ES256 válido (equipo, kid y firma verificable con la llave pública de la prueba)", async () => {
    const { enviarPushApns } = await cargarPush();
    const resultado = enviarPushApns(SUB, JSON.stringify({ titulo: "Hola", cuerpo: "Mundo", url: "/x" }), 3600);
    const flujo = sesion.request.mock.results[0].value as FlujoFalso;
    responder(flujo, 200);
    expect((await resultado).estado).toBe("enviada");

    const headers = sesion.request.mock.calls[0][0] as Record<string, string>;
    const auth = headers.authorization;
    expect(auth).toMatch(/^bearer /);
    const jwt = auth.replace("bearer ", "");
    const [h, p, s] = jwt.split(".");
    const encabezado = JSON.parse(Buffer.from(h, "base64url").toString());
    const cuerpo = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(encabezado).toEqual({ alg: "ES256", kid: KEY_ID_PRUEBA });
    expect(cuerpo.iss).toBe("AT53235M7U");
    expect(typeof cuerpo.iat).toBe("number");
    const firma = Buffer.from(s, "base64url");
    expect(firma).toHaveLength(64); // r‖s de 32 bytes cada uno (IEEE P1363), no DER
    expect(verificarFirma("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, firma)).toBe(true);
  });
  it("reutiliza el mismo JWT entre envíos (no firma de más)", async () => {
    const { enviarPushApns } = await cargarPush();
    const uno = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    await uno;
    const dos = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[1].value as FlujoFalso, 200);
    await dos;
    const [h1] = sesion.request.mock.calls;
    const [h2] = sesion.request.mock.calls.slice(1);
    expect((h1[0] as Record<string, string>).authorization).toBe((h2[0] as Record<string, string>).authorization);
  });
  it("sin APNS_KEY_ID/APNS_KEY_P8 se salta el envío (reintentar) sin abrir conexión", async () => {
    vi.stubEnv("APNS_KEY_ID", "");
    vi.stubEnv("APNS_KEY_P8", "");
    const { enviarPushApns } = await cargarPush();
    expect(await enviarPushApns(SUB, "{}", 3600)).toEqual({ estado: "reintentar", codigo: "apns_config" });
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});

describe("enviarPushApns: la petición HTTP/2", () => {
  it("pide el equipo, el tema y el servidor correcto según el entorno guardado con el token", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns({ ...SUB, entorno: "produccion" }, JSON.stringify({ tag: "aviso-job-1" }), 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    await p;
    expect(mocks.connect).toHaveBeenCalledWith("https://api.push.apple.com");
    const headers = sesion.request.mock.calls[0][0] as Record<string, string>;
    expect(headers).toMatchObject({
      ":method": "POST", ":path": `/3/device/${SUB.token}`,
      "apns-topic": "org.somosnosotros.app", "apns-push-type": "alert", "apns-collapse-id": "aviso-job-1",
    });
  });
  it("sandbox va al servidor de pruebas de Apple", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    await p;
    expect(mocks.connect).toHaveBeenCalledWith("https://api.sandbox.push.apple.com");
  });
  it("arma el payload aps desde titulo/cuerpo/url, igual que el push de navegador", async () => {
    const { enviarPushApns } = await cargarPush();
    const flujoListo = (async () => {
      const p = enviarPushApns(SUB, JSON.stringify({ titulo: "Nuevo en la Casa", cuerpo: "Concierto · hoy", url: "https://somosnosotros.org/eventos/x" }), 3600);
      responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
      return p;
    })();
    await flujoListo;
    const payload = JSON.parse((sesion.request.mock.results[0].value as FlujoFalso).end.mock.calls[0][0] as string);
    expect(payload).toEqual({ aps: { alert: { title: "Nuevo en la Casa", body: "Concierto · hoy" }, sound: "default" }, url: "https://somosnosotros.org/eventos/x" });
  });
  it("abre una sesión HTTP/2 por envío y la cierra al terminar (una guardada puede despertar muerta en Vercel)", async () => {
    const { enviarPushApns } = await cargarPush();
    const uno = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    await uno;
    expect(sesion.close).toHaveBeenCalledTimes(1);
    expect(sesion.destroy).not.toHaveBeenCalled();
    const dos = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[1].value as FlujoFalso, 200);
    await dos;
    expect(mocks.connect).toHaveBeenCalledTimes(2);
    expect(sesion.close).toHaveBeenCalledTimes(2);
  });
  it("conserva apns-collapse-id (hasta 64 bytes) y no inventa thread-id", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, JSON.stringify({ tag: "x".repeat(80) }), 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    await p;
    const headers = sesion.request.mock.calls[0][0] as Record<string, string>;
    expect(headers["apns-collapse-id"]).toBe("x".repeat(64));
    expect(headers).not.toHaveProperty("thread-id");
  });
});

describe("enviarPushApns: 410 y BadDeviceToken son direcciones muertas (se marcan, nada se borra)", () => {
  it("410 Unregistered: fallida con su razón, sin borrar el token desde aquí (lo marca avisos_terminar)", async () => {
    const { enviarPushApns, esDireccionMuerta } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 410, JSON.stringify({ reason: "Unregistered" }));
    const r = await p;
    expect(r).toEqual({ estado: "fallida", codigo: "apns_410_unregistered" });
    expect(esDireccionMuerta(r.codigo)).toBe(true);
    expect(mocks.eq).not.toHaveBeenCalled();
  });
  it("410 sin cuerpo también es dirección muerta", async () => {
    const { enviarPushApns, esDireccionMuerta } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 410);
    const r = await p;
    expect(r).toEqual({ estado: "fallida", codigo: "apns_410_sin_razon" });
    expect(esDireccionMuerta(r.codigo)).toBe(true);
  });
  it("400 BadDeviceToken: fallida y dirección muerta aunque el estado HTTP no sea 410", async () => {
    const { enviarPushApns, esDireccionMuerta } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 400, JSON.stringify({ reason: "BadDeviceToken" }));
    const r = await p;
    expect(r).toEqual({ estado: "fallida", codigo: "apns_400_baddevicetoken" });
    expect(esDireccionMuerta(r.codigo)).toBe(true);
  });
  it("otro 400 (sin BadDeviceToken) es fallo permanente de ESTE envío, con su razón y sin marcar el token", async () => {
    const { enviarPushApns, esDireccionMuerta } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 400, JSON.stringify({ reason: "PayloadTooLarge" }));
    const r = await p;
    expect(r).toEqual({ estado: "fallida", codigo: "apns_400_payloadtoolarge" });
    expect(esDireccionMuerta(r.codigo)).toBe(false);
  });
  it("403 InvalidProviderToken (la llave o su id no cuadran): fallida, con su razón y aviso en el registro", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { enviarPushApns, esDireccionMuerta } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 403, JSON.stringify({ reason: "InvalidProviderToken" }));
    const r = await p;
    expect(r).toEqual({ estado: "fallida", codigo: "apns_403_invalidprovidertoken" });
    expect(esDireccionMuerta(r.codigo)).toBe(false);
    expect(error.mock.calls.flat().join(" ")).toMatch(/InvalidProviderToken.*APNS_KEY_ID/);
    error.mockRestore();
  });
  it.each([500, 503])("%i se reintenta, sin marcar el token", async (status) => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, status);
    expect(await p).toEqual({ estado: "reintentar", codigo: `apns_${status}` });
  });
  it("marcarDireccionMuerta (fuera de la cola) pone muerta_en al token o a la suscripción, solo si el código lo dice", async () => {
    const { marcarDireccionMuerta } = await cargarPush();
    expect(await marcarDireccionMuerta({ apns: SUB }, { estado: "fallida", codigo: "apns_410_unregistered" })).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith("dispositivos_apns", { muerta_en: expect.any(String) });
    expect(mocks.eq).toHaveBeenCalledWith("token", SUB.token);
    expect(mocks.is).toHaveBeenCalledWith("muerta_en", null);
    const endpoint = "https://web.push.apple.com/abc";
    expect(await marcarDireccionMuerta({ endpoint, keys: {} }, { estado: "fallida", codigo: "push_410" })).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith("suscripciones_push", { muerta_en: expect.any(String) });
    expect(mocks.eq).toHaveBeenCalledWith("endpoint", endpoint);
    mocks.update.mockClear();
    expect(await marcarDireccionMuerta({ apns: SUB }, { estado: "fallida", codigo: "apns_403_invalidprovidertoken" })).toBe(false);
    expect(await marcarDireccionMuerta({ endpoint, keys: {} }, { estado: "reintentar", codigo: "push_410" })).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("enviarPushApns: validación y plazos, igual que enviarPushEndpoint", () => {
  it("valida el token antes de cualquier red", async () => {
    const { enviarPushApns } = await cargarPush();
    expect(await enviarPushApns({ token: "no-es-hex", entorno: "sandbox" }, "{}", 3600)).toEqual({ estado: "fallida", codigo: "apns_invalido" });
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it("no envia si ya caduco", async () => {
    const { enviarPushApns } = await cargarPush();
    expect(await enviarPushApns(SUB, "{}", 0)).toEqual({ estado: "descartada", codigo: "apns_caducado" });
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it("un error de red (sin respuesta) se reintenta", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    (sesion.request.mock.results[0].value as FlujoFalso).emit("error", new Error("ECONNRESET"));
    expect((await p).estado).toBe("reintentar");
  });
});

describe("enviarPush: distingue web de APNs para el mismo trabajador de avisos", () => {
  it("una suscripción con { apns } va por APNs", async () => {
    const { enviarPush } = await cargarPush();
    const p = enviarPush({ apns: SUB }, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    expect((await p).estado).toBe("enviada");
    expect(mocks.connect).toHaveBeenCalled();
  });
  it("una suscripción con endpoint sigue yendo por Web Push, sin tocar APNs", async () => {
    const { enviarPush } = await cargarPush();
    const s = { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: {
      p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url") } };
    // Sin VAPID configurado: enviarPushEndpoint responde "reintentar" sin red; lo que importa aquí es que NO pasó por APNs.
    expect((await enviarPush(s, "{}", 3600)).codigo).toBe("push_config");
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});

// ---------- OL-476 (bitácora 508): la llave como queda en Vercel, y cada fallo con su código ----------
const CUERPO_P8 = P8_PRUEBA.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
const FORMAS: [string, string][] = [
  ["con saltos de línea reales", P8_PRUEBA],
  ["con \\n literales (pegada en una línea en Vercel)", P8_PRUEBA.trim().replace(/\n/g, "\\n")],
  ["sin las líneas BEGIN/END, solo el base64", CUERPO_P8],
  ["entre comillas y con \\n literales", `"${P8_PRUEBA.trim().replace(/\n/g, "\\n")}"`],
  ["en una sola línea con espacios", P8_PRUEBA.trim().replace(/\n/g, " ")],
];

function firmaVerificable(): boolean {
  const headers = sesion.request.mock.calls.at(-1)![0] as Record<string, string>;
  const [h, p, s] = headers.authorization.replace("bearer ", "").split(".");
  return verificarFirma("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
}

describe("enviarPushApns: la llave .p8 en las formas en que queda al pegarla", () => {
  it.each(FORMAS)("%s: firma y envía", async (_forma, valor) => {
    vi.stubEnv("APNS_KEY_P8", valor);
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    expect(await p).toEqual({ estado: "enviada", codigo: "aceptado" });
    expect(firmaVerificable()).toBe(true);
  });
  it("el id de la llave con un salto de línea al final se recorta (si no, Apple diría InvalidProviderToken)", async () => {
    vi.stubEnv("APNS_KEY_ID", `${KEY_ID_PRUEBA}\n`);
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    await p;
    const jwt = (sesion.request.mock.calls[0][0] as Record<string, string>).authorization.replace("bearer ", "");
    expect(JSON.parse(Buffer.from(jwt.split(".")[0], "base64url").toString()).kid).toBe(KEY_ID_PRUEBA);
  });
  it("leerLlaveApns acepta también una llave SEC1 («EC PRIVATE KEY») y rechaza una RSA o de otra curva", async () => {
    const { leerLlaveApns } = await cargarPush();
    expect(leerLlaveApns(privateKey.export({ type: "sec1", format: "pem" }) as string)).not.toBeNull();
    const rsa = generateKeyPairSync("rsa", { modulusLength: 1024 }).privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    expect(leerLlaveApns(rsa)).toBeNull();
    const p384 = generateKeyPairSync("ec", { namedCurve: "secp384r1" }).privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    expect(leerLlaveApns(p384)).toBeNull();
  });
  it.each([
    ["basura", "no es una llave"],
    ["base64 que no es llave", Buffer.from("hola mundo, esto no es una llave").toString("base64")],
    ["llave cortada a la mitad", P8_PRUEBA.slice(0, 120)],
  ])("una llave ilegible (%s) es 'apns_llave': fallida una vez, sin conexión, sin reintentos", async (_caso, valor) => {
    vi.stubEnv("APNS_KEY_P8", valor);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { enviarPushApns } = await cargarPush();
    expect(await enviarPushApns(SUB, "{}", 3600)).toEqual({ estado: "fallida", codigo: "apns_llave" });
    expect(await enviarPushApns(SUB, "{}", 3600)).toEqual({ estado: "fallida", codigo: "apns_llave" });
    expect(mocks.connect).not.toHaveBeenCalled();
    // Un solo aviso en el registro, con la forma de la llave pero nunca su contenido.
    expect(error).toHaveBeenCalledTimes(1);
    const texto = error.mock.calls.flat().join(" ");
    expect(texto).toMatch(/APNS_KEY_P8.*forma:/);
    expect(texto).not.toContain(valor.slice(-12));
    error.mockRestore();
  });
  it("diagnosticoLlaveApns dice la forma y si se lee, sin revelar la llave ni el id", async () => {
    vi.stubEnv("APNS_KEY_P8", P8_PRUEBA.trim().replace(/\n/g, "\\n"));
    const { diagnosticoLlaveApns } = await cargarPush();
    const d = diagnosticoLlaveApns();
    expect(d).toEqual({ keyId: "ok", llave: "pem_escapada", legible: true, jwt: "ok" });
    expect(JSON.stringify(d)).not.toContain(KEY_ID_PRUEBA);
    vi.stubEnv("APNS_KEY_P8", "¡no es una llave!");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { diagnosticoLlaveApns: otro } = await cargarPush();
    expect(otro()).toMatchObject({ llave: "otra", legible: false, jwt: "apns_llave" });
    error.mockRestore();
  });
});

describe("enviarPushApns: HTTP/2 con cada error traducido a código", () => {
  beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });
  const conCodigo = (mensaje: string, code: string) => Object.assign(new Error(mensaje), { code });

  it("la sesión no conecta (DNS): 'apns_red_enotfound', se reintenta y la sesión se destruye", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    sesion.emit("error", conCodigo("getaddrinfo ENOTFOUND api.push.apple.com", "ENOTFOUND"));
    expect(await p).toEqual({ estado: "reintentar", codigo: "apns_red_enotfound" });
    expect(sesion.destroy).toHaveBeenCalled();
  });
  it("el flujo se corta (ERR_HTTP2_STREAM_ERROR): 'apns_http2_stream_error'", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    (sesion.request.mock.results[0].value as FlujoFalso).emit("error", conCodigo("Stream closed with error code NGHTTP2_REFUSED_STREAM", "ERR_HTTP2_STREAM_ERROR"));
    expect(await p).toEqual({ estado: "reintentar", codigo: "apns_http2_stream_error" });
  });
  it("un error de TLS: 'apns_tls_…'", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    sesion.emit("error", conCodigo("unable to verify the first certificate", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"));
    expect(await p).toEqual({ estado: "reintentar", codigo: "apns_tls_unable_to_verify_leaf_signature" });
  });
  it("la sesión se cierra antes de responder: 'apns_http2_sesion_cerrada'", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    sesion.emit("close");
    expect(await p).toEqual({ estado: "reintentar", codigo: "apns_http2_sesion_cerrada" });
  });
  it("session.request lanza (sesión ya destruida): se traduce, no sale como excepción", async () => {
    sesion.request.mockImplementationOnce(() => { throw conCodigo("The session has been destroyed", "ERR_HTTP2_INVALID_SESSION"); });
    const { enviarPushApns } = await cargarPush();
    expect(await enviarPushApns(SUB, "{}", 3600)).toEqual({ estado: "reintentar", codigo: "apns_http2_invalid_session" });
  });
  it("sin respuesta dentro del plazo: 'apns_timeout'", async () => {
    const { enviarPushApns } = await cargarPush();
    expect(await enviarPushApns(SUB, "{}", 0.02)).toEqual({ estado: "reintentar", codigo: "apns_timeout" });
    expect(sesion.destroy).toHaveBeenCalled();
  });
  it("respeta el signal del trabajador: 'apns_abortado' al cortarse, y sin conexión si ya venía cortado", async () => {
    const { enviarPushApns } = await cargarPush();
    const control = new AbortController();
    const p = enviarPushApns(SUB, "{}", 3600, control.signal);
    control.abort();
    expect(await p).toEqual({ estado: "reintentar", codigo: "apns_abortado" });
    mocks.connect.mockClear();
    expect(await enviarPushApns(SUB, "{}", 3600, AbortSignal.abort())).toEqual({ estado: "reintentar", codigo: "apns_abortado" });
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it("el registro dice el código y el mensaje, nunca el token ni el cuerpo del aviso", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, JSON.stringify({ titulo: "Secreto", cuerpo: "Cuerpo privado" }), 3600);
    sesion.emit("error", conCodigo(`fallo en /3/device/${SUB.token}`, "ECONNRESET"));
    await p;
    const texto = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(texto).toContain("apns_red_econnreset");
    expect(texto).not.toContain(SUB.token);
    expect(texto).not.toContain("Cuerpo privado");
  });
});
