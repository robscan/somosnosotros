import { describe, expect, it, vi } from "vitest";
import { atenderCorrer, type DependenciasRuta } from "./atender";
import type { ResultadoPaso } from "./motor";

const URL_RUTA = "https://somosnosotros.org/api/rutinas/correr";
const pedido = (autorizacion?: string, url = URL_RUTA) => new Request(url, { method: "POST", headers: autorizacion ? { authorization: autorizacion } : {} });

function dependencias(resultado: ResultadoPaso = { corrida: "c1", tipo: "lugares", estado: "corriendo", usd: 0.2 }) {
  const despues: (() => Promise<unknown>)[] = [];
  const d: DependenciasRuta = {
    secreto: "s3cr3t",
    correr: vi.fn(async () => resultado),
    despues: (t) => void despues.push(t),
    encadenar: vi.fn(async () => "disparado"),
    limiteMs: 300_000,
    ahora: () => 1_000_000,
  };
  return { d, despues };
}

describe("/api/rutinas/correr", () => {
  it("sin el secreto, o con otro, 401 y no corre nada", async () => {
    for (const a of [undefined, "Bearer otro", "s3cr3t", "Bearer s3cr3tt"]) {
      const { d, despues } = dependencias();
      const r = await atenderCorrer(pedido(a), d);
      expect(r.status).toBe(401);
      expect(d.correr).not.toHaveBeenCalled();
      expect(despues).toHaveLength(0);
    }
    const sinSecreto = dependencias();
    sinSecreto.d.secreto = undefined;
    expect((await atenderCorrer(pedido("Bearer undefined"), sinSecreto.d)).status).toBe(401);
  });

  it("con el secreto: responde enseguida (202) y corre UN paso después de responder; si tomó una corrida, pide el siguiente", async () => {
    const { d, despues } = dependencias();
    const r = await atenderCorrer(pedido("Bearer s3cr3t"), d);
    expect(r.status).toBe(202);
    expect(d.correr).not.toHaveBeenCalled();
    expect(despues).toHaveLength(1);
    await despues[0]();
    expect(d.correr).toHaveBeenCalledTimes(1);
    expect(d.encadenar).toHaveBeenCalledTimes(1);
    // OL-429: el siguiente paso se pide con lo que le queda a la función (para reintentar sin pasarse de su `maxDuration`).
    expect(d.encadenar).toHaveBeenCalledWith(1_000_000 + 300_000 - 3_000);
  });

  it("sin nada que correr no encadena (la cadena se apaga sola; Ciudades o el cron la retoman)", async () => {
    const { d, despues } = dependencias({ corrida: null, tipo: null, estado: "nada", usd: 0 });
    await atenderCorrer(pedido("Bearer s3cr3t"), d);
    await despues[0]();
    expect(d.encadenar).not.toHaveBeenCalled();
  });

  it("con ?esperar=1 corre el paso y devuelve su resultado; si el motor falla, 503 sin detalles", async () => {
    const { d } = dependencias();
    const r = await atenderCorrer(pedido("Bearer s3cr3t", `${URL_RUTA}?esperar=1`), d);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, corrida: "c1", tipo: "lugares", estado: "corriendo", usd: 0.2 });
    const cae = dependencias();
    cae.d.correr = vi.fn(async () => {
      throw new Error("sin base");
    });
    const mal = await atenderCorrer(pedido("Bearer s3cr3t", `${URL_RUTA}?esperar=1`), cae.d);
    expect(mal.status).toBe(503);
    expect(await mal.json()).toEqual({ ok: false, error: "motor_no_disponible" });
  });
});
