import { describe, expect, it, vi } from "vitest";
import { aparatoDe, codigoDeExcepcion, drenarAvisos, drenarAvisosAdmin, mensajeSeguro, procesarEntrega, procesarEntregaAdmin, type Claim, type ClaimAdmin,
  type DependenciasAvisos, type Entrega, type EntregaAdmin } from "./avisosWorker";

const NOW = Date.parse("2030-10-01T12:00:00Z");
const claim = (id = "1"): Claim => ({ id, token: `token-${id}`, lease_hasta: new Date(NOW + 90_000).toISOString() });
const entrega = (id = "1", canal: "push" | "correo" = "correo"): Entrega => ({ id, job_id: "job", usuario_id: "usuario", canal, cuerpo: null,
  tipo: "cambio", cambio: "ambos", creado_en: new Date(NOW).toISOString(), vence: new Date(NOW + 3600_000).toISOString(),
  suscripcion: { endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: {} },
  evento: { id: "evento", titulo: "Cultura", inicio: new Date(NOW + 3600_000).toISOString(), fin: null, zona: "America/Mexico_City",
    sitio_texto: "Sede", sitio_reservado: true, lugar: null } });

function banco(filas = [entrega()]) {
  const estados = new Map(filas.map((f) => [f.id, "pendiente"]));
  const orden: string[] = [];
  const rpc = vi.fn(async (nombre: string, args?: Record<string, unknown>) => {
    orden.push(nombre);
    const fila = filas.find((f) => f.id === args?.p_id);
    if (nombre === "avisos_expandir") return false;
    if (nombre === "avisos_estado") return {};
    if (nombre === "avisos_tomar") {
      const f = filas.find((f) => estados.get(f.id) === "pendiente");
      if (!f) return null;
      estados.set(f.id, "tomada"); return claim(f.id);
    }
    if (nombre === "avisos_autorizar") return fila;
    if (nombre === "avisos_preparar" && fila) { fila.cuerpo ??= args?.p_cuerpo as string; return fila.cuerpo; }
    if (nombre === "avisos_terminar") { estados.set(args?.p_id as string, args?.p_resultado as string); return true; }
    return null;
  });
  const correo = vi.fn(async () => { orden.push("RED"); return { estado: "enviada" as const, codigo: "aceptado" }; });
  const push = vi.fn(async () => ({ estado: "enviada" as const, codigo: "aceptado" }));
  const correoDe = vi.fn(async () => "persona@example.invalid");
  const d: DependenciasAvisos = { rpc: rpc as DependenciasAvisos["rpc"], correo, push, correoDe, ahora: () => NOW, baja: () => "https://example.invalid/baja" };
  return { d, rpc, correo, push, correoDe, estados, orden };
}

describe("worker durable sin red real", () => {
  it("persiste el cuerpo antes del proveedor y revalida justo antes", async () => {
    const b = banco();
    expect(await procesarEntrega(claim(), b.d)).toBe(true);
    expect(b.orden).toEqual(["avisos_autorizar", "avisos_preparar", "avisos_autorizar", "RED", "avisos_terminar"]);
    expect(b.correo.mock.calls[0]).toBeDefined();
  });
  it("Auth falla cerrado: sin correo enviado ni confirmacion de exito", async () => {
    const b = banco(); b.correoDe.mockRejectedValue(new Error("Auth inaccesible"));
    expect(await procesarEntrega(claim(), b.d)).toBe(false);
    expect(b.correo).not.toHaveBeenCalled();
    expect(b.estados.get("1")).toBe("reintentar");
  });
  it("un fallo de persistencia no sale a red", async () => {
    const b = banco(); const original = b.d.rpc;
    b.d.rpc = async (n, a) => { if (n === "avisos_preparar") throw new Error("base"); return original(n, a); };
    expect(await procesarEntrega(claim(), b.d)).toBe(false);
    expect(b.correo).not.toHaveBeenCalled();
  });
  it("revocar consentimiento entre preparar y enviar cancela", async () => {
    const b = banco(); const original = b.d.rpc; let n = 0;
    b.d.rpc = async <T>(name: string, args?: Record<string, unknown>) => {
      if (name === "avisos_autorizar" && ++n === 2) return null as T;
      return original<T>(name, args);
    };
    expect(await procesarEntrega(claim(), b.d)).toBe(false);
    expect(b.correo).not.toHaveBeenCalled();
  });
  it("ACK perdido conserva cuerpo/clave aunque cambie la plantilla o baja", async () => {
    const f = entrega(); const b = banco([f]); const original = b.d.rpc; let fallo = true;
    b.d.rpc = async (n, a) => { if (n === "avisos_terminar" && fallo) { fallo = false; throw new Error("ack perdido"); } return original(n, a); };
    await procesarEntrega(claim(), b.d);
    b.d.baja = () => "https://example.invalid/otra";
    f.evento.titulo = "Otra plantilla";
    await procesarEntrega(claim(), b.d);
    expect(b.correo).toHaveBeenCalledTimes(2);
    expect(b.correo.mock.calls[0].slice(0, 2)).toEqual(b.correo.mock.calls[1].slice(0, 2));
  });
  it("ACK perdido de push conserva el mismo cuerpo y tag del job", async () => {
    const f = entrega("push-1", "push"); const b = banco([f]); const original = b.d.rpc; let fallo = true;
    const cuerpos: string[] = [];
    b.d.push = vi.fn(async (_suscripcion: unknown, cuerpo: string) => {
      cuerpos.push(cuerpo);
      return { estado: "enviada" as const, codigo: "aceptado" };
    });
    b.d.rpc = async (n, a) => { if (n === "avisos_terminar" && fallo) { fallo = false; throw new Error("ack perdido"); } return original(n, a); };
    await procesarEntrega(claim("push-1"), b.d);
    f.evento.titulo = "Plantilla posterior";
    await procesarEntrega(claim("push-1"), b.d);
    expect(cuerpos).toHaveLength(2);
    expect(cuerpos[0]).toBe(cuerpos[1]);
    // OL-480: en la web el `tag` es el hilo del evento (el aviso nuevo de un evento sustituye al anterior); el cuerpo guardado no cambia.
    expect(JSON.parse(cuerpos[0]).tag).toBe("evento-evento");
  });
  it("OL-480: la misma entrega arma un cuerpo para la app (subtítulo, hilo, tag del trabajo) y otro para la web (la razón abre el cuerpo)", async () => {
    const web = entrega("w", "push");
    const app = { ...entrega("a", "push"), suscripcion: { apns: { token: "a".repeat(64), entorno: "produccion" } } };
    for (const f of [web, app]) Object.assign(f, { motivo: "artista:Luna Hermoso", tipo: "nuevo_evento" });
    const b = banco([web, app]);
    const cuerpos = new Map<string, string>();
    b.d.push = vi.fn(async (suscripcion: unknown, cuerpo: string) => {
      cuerpos.set(aparatoDe(suscripcion), cuerpo);
      return { estado: "enviada" as const, codigo: "aceptado" };
    });
    await procesarEntrega(claim("w"), b.d);
    await procesarEntrega(claim("a"), b.d);
    const deApp = JSON.parse(cuerpos.get("app")!);
    const deWeb = JSON.parse(cuerpos.get("web")!);
    expect(deApp.subtitulo).toBe("De Luna Hermoso, a quien sigues");
    expect(deApp.hilo).toBe("evento-evento");
    expect(deApp.tag).toBe("aviso-job");
    expect(deWeb.subtitulo).toBeUndefined();
    expect(deWeb.cuerpo.startsWith("De Luna Hermoso, a quien sigues · ")).toBe(true);
    expect(deWeb.titulo).toBe(deApp.titulo);
    expect(deApp.url.endsWith("?desde=aviso&tipo=nuevo")).toBe(true);
  });
  it("correo y cada endpoint tienen resultados independientes", async () => {
    const b = banco([entrega("1"), entrega("2", "push"), entrega("3", "push")]);
    b.push.mockResolvedValueOnce({ estado: "enviada", codigo: "aceptado" });
    b.d.push = vi.fn().mockResolvedValueOnce({ estado: "enviada", codigo: "aceptado" }).mockResolvedValueOnce({ estado: "reintentar", codigo: "push_red" });
    await drenarAvisos({}, b.d);
    expect([...b.estados.values()]).toEqual(["enviada", "enviada", "reintentar"]);
    b.estados.set("3", "pendiente");
    b.d.push = vi.fn().mockResolvedValue({ estado: "enviada", codigo: "aceptado" });
    await drenarAvisos({}, b.d);
    expect(b.correo).toHaveBeenCalledTimes(1);
    expect(b.d.push).toHaveBeenCalledTimes(1);
  });
  it("no cambia destinatario bajo la misma clave", async () => {
    const f = entrega(); f.cuerpo = JSON.stringify({ to: ["viejo@example.invalid"] });
    const b = banco([f]);
    expect(await procesarEntrega(claim(), b.d)).toBe(false);
    expect(b.correo).not.toHaveBeenCalled(); expect(b.estados.get("1")).toBe("descartada");
  });
  it("lease casi vencido no manda HTTP", async () => {
    const b = banco();
    expect(await procesarEntrega({ ...claim(), lease_hasta: new Date(NOW + 1000).toISOString() }, b.d)).toBe(false);
    expect(b.correo).not.toHaveBeenCalled();
  });
  it("no crea cientos de promesas de proveedor", async () => {
    const b = banco(Array.from({ length: 101 }, (_, i) => entrega(String(i), "push")));
    let activos = 0; let maximo = 0;
    b.d.push = vi.fn(async () => {
      maximo = Math.max(maximo, ++activos);
      await new Promise((r) => setTimeout(r, 1)); activos--;
      return { estado: "enviada" as const, codigo: "aceptado" };
    });
    await drenarAvisos({}, b.d);
    expect(maximo).toBe(4); expect(b.d.push).toHaveBeenCalledTimes(40);
  });
  it("Auth lento consume deadline y no empieza HTTP fuera de presupuesto", async () => {
    const b = banco(); let reloj = NOW; b.d.ahora = () => reloj;
    b.d.correoDe = async () => { reloj += 5_000; return "persona@example.invalid"; };
    expect(await procesarEntrega(claim(), b.d, NOW + 5_000)).toBe(false);
    expect(b.correo).not.toHaveBeenCalled();
  });
  it("deadline decreciente llega a cada RPC y reserva ACK", async () => {
    const b = banco(); let reloj = NOW; b.d.ahora = () => reloj;
    const original = b.d.rpc; const limites: number[] = [];
    b.d.rpc = async (n, a, ms) => { limites.push(ms!); reloj += 500; return original(n, a, ms); };
    b.d.correoDe = async (_id, ms) => { expect(ms).toBe(3500); reloj += 500; return "persona@example.invalid"; };
    expect(await procesarEntrega(claim(), b.d, NOW + 5000)).toBe(true);
    expect(limites).toEqual([4000, 3000, 2500, 3000]);
  });
  it("deadline de entrega cancela proveedor antes de sus 8 s", async () => {
    const b = banco();
    b.d.correo = vi.fn<DependenciasAvisos["correo"]>((_body, _key, signal) => new Promise((resolve) => {
      signal.addEventListener("abort", () => resolve({ estado: "reintentar", codigo: "correo_red" }));
    }));
    expect(await procesarEntrega(claim(), b.d, NOW + 1003)).toBe(false);
    expect(b.estados.get("1")).toBe("reintentar");
  });
  it("after de 5 s si entrega con dependencias rapidas y reloj que avanza", async () => {
    const b = banco(); let reloj = NOW; b.d.ahora = () => reloj;
    const original = b.d.rpc;
    b.d.rpc = async (n, a, ms) => { expect(ms).toBeGreaterThan(0); reloj += 25; return original(n, a, ms); };
    b.d.correoDe = async () => { reloj += 25; return "persona@example.invalid"; };
    expect((await drenarAvisos({ ms: 5000 }, b.d)).enviados).toBe(1);
    expect(reloj - NOW).toBeLessThan(5000);
  });
  it("fanout lento no inicia claims al final del plazo", async () => {
    const b = banco(); let reloj = NOW; b.d.ahora = () => reloj;
    const original = b.d.rpc;
    b.d.rpc = async (n, a, ms) => {
      if (n === "avisos_expandir") { reloj = NOW + 39_000; return false as never; }
      return original(n, a, ms);
    };
    await drenarAvisos({ ms: 40_000 }, b.d);
    expect(b.correo).not.toHaveBeenCalled();
    expect(b.rpc).not.toHaveBeenCalledWith("avisos_tomar", expect.anything(), expect.anything());
  });
});

// ---------- OL-115: aviso al administrador (mismo worker, cola propia sin correo) ----------
const claimAdmin = (id = "1"): ClaimAdmin => ({ id, token: `token-admin-${id}` });
const entregaAdmin = (id = "1", motivos: Record<string, number> = { registro: 1 }): EntregaAdmin => ({
  id, job_id: "job-admin", usuario_id: "admin-1", cuerpo: null, motivos, creado_en: new Date(NOW).toISOString(),
  suscripcion: { endpoint: `https://fcm.googleapis.com/fcm/send/admin-${id}`, keys: {} },
});

function bancoAdmin(filas = [entregaAdmin()]) {
  const estados = new Map(filas.map((f) => [f.id, "pendiente"]));
  const orden: string[] = [];
  const rpc = vi.fn(async (nombre: string, args?: Record<string, unknown>) => {
    orden.push(nombre);
    const fila = filas.find((f) => f.id === args?.p_id);
    if (nombre === "avisos_admin_expandir") return false;
    if (nombre === "avisos_admin_tomar") {
      const f = filas.find((f) => estados.get(f.id) === "pendiente");
      if (!f) return null;
      estados.set(f.id, "tomada"); return claimAdmin(f.id);
    }
    if (nombre === "avisos_admin_autorizar") return fila;
    if (nombre === "avisos_admin_preparar" && fila) { fila.cuerpo ??= args?.p_cuerpo as string; return fila.cuerpo; }
    if (nombre === "avisos_admin_terminar") { estados.set(args?.p_id as string, args?.p_resultado as string); return true; }
    return null;
  });
  const push = vi.fn((async () => ({ estado: "enviada" as const, codigo: "aceptado" })) as DependenciasAvisos["push"]);
  const correo = vi.fn(async () => ({ estado: "enviada" as const, codigo: "aceptado" }));
  const correoDe = vi.fn(async () => "persona@example.invalid");
  const d: DependenciasAvisos = { rpc: rpc as DependenciasAvisos["rpc"], correo, push, correoDe, ahora: () => NOW, baja: () => "https://example.invalid/baja" };
  return { d, rpc, push, estados, orden };
}

describe("procesarEntregaAdmin: sin correo, sin datos personales en el cuerpo compuesto", () => {
  it("compone el cuerpo desde los conteos, lo persiste antes de mandar y termina como enviada", async () => {
    const b = bancoAdmin();
    expect(await procesarEntregaAdmin(claimAdmin(), b.d)).toBe(true);
    expect(b.orden).toEqual(["avisos_admin_autorizar", "avisos_admin_preparar", "avisos_admin_autorizar", "avisos_admin_terminar"]);
    const cuerpo = JSON.parse(b.push.mock.calls[0][1] as string);
    expect(cuerpo).toMatchObject({ titulo: "Administración", cuerpo: "Alguien se registró", url: "/admin" });
    expect(b.estados.get("1")).toBe("enviada");
  });
  it("agrupado: el cuerpo dice cuántas cosas, no la lista de motivos", async () => {
    const b = bancoAdmin([entregaAdmin("1", { registro: 2, reclamo_ficha: 1 })]);
    await procesarEntregaAdmin(claimAdmin(), b.d);
    const cuerpo = JSON.parse(b.push.mock.calls[0][1] as string);
    expect(cuerpo.cuerpo).toBe("3 cosas por revisar");
  });
  it("un fallo de persistencia no sale a push", async () => {
    const b = bancoAdmin(); const original = b.d.rpc;
    b.d.rpc = async (n, a) => { if (n === "avisos_admin_preparar") throw new Error("base"); return original(n, a); };
    expect(await procesarEntregaAdmin(claimAdmin(), b.d)).toBe(false);
    expect(b.push).not.toHaveBeenCalled();
  });
  it("sin entrega disponible, no hace nada", async () => {
    const b = bancoAdmin([]);
    expect(await procesarEntregaAdmin(claimAdmin(), b.d)).toBe(false);
    expect(b.push).not.toHaveBeenCalled();
  });
});

describe("drenarAvisosAdmin: expande, toma y entrega sin los cuatro slots del motor principal", () => {
  it("un claim basta para el volumen chico de administradores", async () => {
    const b = bancoAdmin();
    expect((await drenarAvisosAdmin({ ms: 5000 }, b.d)).enviados).toBe(1);
  });
  it("sin nada pendiente, no llama tomar", async () => {
    const b = bancoAdmin([]);
    await drenarAvisosAdmin({ ms: 5000 }, b.d);
    expect(b.rpc).not.toHaveBeenCalledWith("avisos_admin_tomar", expect.anything(), expect.anything());
  });
});

// ---------- OL-476 (bitácora 508): el motivo real en `codigo`, en vez de `worker_dependencia` ----------
describe("OL-476: lo que se guarda en codigo cuando algo lanza", () => {
  const codigoTerminado = (rpc: ReturnType<typeof vi.fn>, nombre = "avisos_terminar") =>
    (rpc.mock.calls.filter((c) => c[0] === nombre).at(-1)?.[1] as { p_codigo: string; p_resultado: string } | undefined);

  it("una excepción del envío queda como excepcion_<clase>, se reintenta y se registra sin el cuerpo ni la dirección", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const b = banco([entrega("p", "push")]);
    b.d.push = vi.fn(async () => { throw new TypeError(`Cannot read "Cultura" de https://fcm.googleapis.com/fcm/send/p para persona@example.invalid`); });
    expect(await procesarEntrega(claim("p"), b.d)).toBe(false);
    expect(codigoTerminado(b.rpc)).toEqual(expect.objectContaining({ p_resultado: "reintentar", p_codigo: "excepcion_typeerror" }));
    const texto = error.mock.calls.flat().join(" ");
    expect(texto).toContain("excepcion_typeerror");
    expect(texto).toContain("TypeError");
    for (const privado of ["Cultura", "fcm.googleapis.com", "persona@example.invalid"]) expect(texto).not.toContain(privado);
    expect(b.rpc.mock.calls.some((c) => (c[1] as { p_codigo?: string } | undefined)?.p_codigo === "worker_dependencia")).toBe(false);
    error.mockRestore();
  });
  it("un error propio con código (la base, Auth, el plazo) se guarda tal cual", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const b = banco(); b.correoDe.mockRejectedValue(new Error("avisos_auth"));
    await procesarEntrega(claim(), b.d);
    expect(codigoTerminado(b.rpc)?.p_codigo).toBe("avisos_auth");
    const c = banco(); const original = c.d.rpc;
    c.d.rpc = async (n, a, ms) => { if (n === "avisos_preparar") throw new Error("avisos_base_preparar_57014"); return original(n, a, ms); };
    await procesarEntrega(claim(), c.d);
    expect(codigoTerminado(c.rpc)?.p_codigo).toBe("avisos_base_preparar_57014");
    error.mockRestore();
  });
  it("el código del proveedor se normaliza a lo que acepta la base (^[a-z0-9_]{1,60}$)", async () => {
    const b = banco([entrega("p", "push")]);
    b.d.push = vi.fn(async () => ({ estado: "fallida" as const, codigo: "apns_403_InvalidProviderToken" }));
    await procesarEntrega(claim("p"), b.d);
    expect(codigoTerminado(b.rpc)?.p_codigo).toBe("apns_403_invalidprovidertoken");
  });
  it("apns_llave pasa tal cual y como 'fallida': no se reintenta ocho veces", async () => {
    const b = banco([entrega("p", "push")]);
    b.d.push = vi.fn(async () => ({ estado: "fallida" as const, codigo: "apns_llave" }));
    await procesarEntrega(claim("p"), b.d);
    expect(codigoTerminado(b.rpc)).toEqual(expect.objectContaining({ p_resultado: "fallida", p_codigo: "apns_llave" }));
    expect(b.estados.get("p")).toBe("fallida");
  });
  it("lo mismo en el aviso a la administración", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const b = bancoAdmin();
    b.d.push = vi.fn(async () => { throw new RangeError("fuera de rango"); });
    expect(await procesarEntregaAdmin(claimAdmin(), b.d)).toBe(false);
    expect(codigoTerminado(b.rpc, "avisos_admin_terminar")?.p_codigo).toBe("excepcion_rangeerror");
    error.mockRestore();
  });
  it("codigoDeExcepcion y mensajeSeguro, sueltos", () => {
    expect(codigoDeExcepcion(new Error("avisos_timeout"))).toBe("avisos_timeout");
    expect(codigoDeExcepcion(new Error("Algo raro pasó"))).toBe("excepcion_error");
    expect(codigoDeExcepcion("texto")).toBe("excepcion_string");
    expect(codigoDeExcepcion(Object.assign(new Error("x y"), { name: "AbortError" }))).toBe("excepcion_aborterror");
    const m = mensajeSeguro(new SyntaxError(`Unexpected token 'a', "{"to":["persona@example.invalid"]}" is not valid JSON; token ${"ab".repeat(32)}`));
    expect(m).toMatch(/^SyntaxError: /);
    expect(m).not.toContain("persona@example.invalid");
    expect(m).not.toContain("ab".repeat(32));
  });
});
