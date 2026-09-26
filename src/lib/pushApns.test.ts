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
}

const mocks = vi.hoisted(() => ({ connect: vi.fn(), borrar: vi.fn(), eq: vi.fn() }));
vi.mock("node:http2", async (importarOriginal) => {
  const real = await importarOriginal<typeof import("node:http2")>();
  return { ...real, default: { ...real, connect: mocks.connect }, connect: mocks.connect };
});
vi.mock("./supabase/admin", () => ({ clienteAdmin: () => ({ from: () => ({ delete: () => ({ eq: mocks.eq }) }) }) }));

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
  it("reutiliza la misma sesión HTTP/2 entre envíos al mismo entorno", async () => {
    const { enviarPushApns } = await cargarPush();
    const uno = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 200);
    await uno;
    const dos = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[1].value as FlujoFalso, 200);
    await dos;
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });
});

describe("enviarPushApns: 410 y BadDeviceToken borran el token", () => {
  it("410 borra el token y no se reintenta", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 410, JSON.stringify({ reason: "Unregistered" }));
    expect((await p).estado).toBe("fallida");
    expect(mocks.eq).toHaveBeenCalledWith("token", SUB.token);
  });
  it("400 BadDeviceToken borra el token aunque el estado HTTP no sea 410", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 400, JSON.stringify({ reason: "BadDeviceToken" }));
    expect((await p).estado).toBe("fallida");
    expect(mocks.eq).toHaveBeenCalledWith("token", SUB.token);
  });
  it("otro 400 (sin BadDeviceToken) es fallo permanente de ESTE envío, sin borrar el token", async () => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, 400, JSON.stringify({ reason: "PayloadTooLarge" }));
    expect((await p).estado).toBe("fallida");
    expect(mocks.eq).not.toHaveBeenCalled();
  });
  it.each([500, 503])("%i se reintenta, sin borrar el token", async (status) => {
    const { enviarPushApns } = await cargarPush();
    const p = enviarPushApns(SUB, "{}", 3600);
    responder(sesion.request.mock.results[0].value as FlujoFalso, status);
    expect((await p).estado).toBe("reintentar");
    expect(mocks.eq).not.toHaveBeenCalled();
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
