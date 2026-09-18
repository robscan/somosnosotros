import { describe, expect, it, vi } from "vitest";
import { drenarAvisos, procesarEntrega, type Claim, type DependenciasAvisos, type Entrega } from "./avisosWorker";

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
    expect(JSON.parse(cuerpos[0]).tag).toBe("aviso-job");
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
