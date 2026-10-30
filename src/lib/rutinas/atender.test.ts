import { describe, expect, it, vi } from "vitest";
import { atenderCorrer, MAX_PASOS_POR_LLAMADA, type DependenciasRuta } from "./atender";
import type { ResultadoPaso } from "./motor";

const URL_RUTA = "https://somosnosotros.org/api/rutinas/correr";
const pedido = (autorizacion?: string, url = URL_RUTA) => new Request(url, { method: "POST", headers: autorizacion ? { authorization: autorizacion } : {} });

const NADA: ResultadoPaso = { corrida: null, tipo: null, estado: "nada", usd: 0 };

/** `resultados`: lo que devuelve cada paso, en orden; después, «nada». `reloj`: cuánto avanza el reloj en cada paso. */
function dependencias(resultados: ResultadoPaso[] = [{ corrida: "c1", tipo: "lugares", estado: "corriendo", usd: 0.2 }], reloj = 40_000) {
  const despues: (() => Promise<unknown>)[] = [];
  let t = 1_000_000;
  const cola = [...resultados];
  const d: DependenciasRuta = {
    secreto: "s3cr3t",
    correr: vi.fn(async () => {
      t += reloj;
      return cola.shift() ?? NADA;
    }),
    despues: (tarea) => void despues.push(tarea),
    limiteMs: 300_000,
    pasoMaximoMs: 200_000,
    ahora: () => t,
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

  it("con el secreto: responde enseguida (202) y corre los pasos después de responder, sin llamar a la red", async () => {
    const { d, despues } = dependencias();
    const r = await atenderCorrer(pedido("Bearer s3cr3t"), d);
    expect(r.status).toBe(202);
    expect(d.correr).not.toHaveBeenCalled();
    expect(despues).toHaveLength(1);
    await despues[0]();
    // Un paso tomó la corrida; el siguiente no encontró nada que tomar y la función se apaga.
    expect(d.correr).toHaveBeenCalledTimes(2);
    expect("encadenar" in d).toBe(false);
  });

  it("OL-444: da otro paso en la misma función mientras quepa el paso más largo (200 s antes de los 297 s), y no más", async () => {
    const paso: ResultadoPaso = { corrida: "c1", tipo: "lugares", estado: "corriendo", usd: 0.1 };
    // Pasos de 40 s: tras el primero quedan 257 s (cabe otro), tras el segundo 217 s (cabe otro), tras el tercero 177 s (no cabe).
    const { d, despues } = dependencias([paso, paso, paso, paso, paso]);
    await atenderCorrer(pedido("Bearer s3cr3t"), d);
    await despues[0]();
    expect(d.correr).toHaveBeenCalledTimes(3);
    // Pasos que vuelven enseguida (un tropiezo de la base): como mucho `MAX_PASOS_POR_LLAMADA`.
    const rapidos = dependencias(Array.from({ length: 40 }, () => paso), 0);
    await atenderCorrer(pedido("Bearer s3cr3t"), rapidos.d);
    await rapidos.despues[0]();
    expect(rapidos.d.correr).toHaveBeenCalledTimes(MAX_PASOS_POR_LLAMADA);
  });

  it("sin nada que correr, un solo intento y se apaga (el latido de Supabase la retoma)", async () => {
    const { d, despues } = dependencias([]);
    await atenderCorrer(pedido("Bearer s3cr3t"), d);
    await despues[0]();
    expect(d.correr).toHaveBeenCalledTimes(1);
  });

  it("con ?esperar=1 corre el paso y devuelve su resultado; si el motor falla, 503 sin detalles", async () => {
    const { d } = dependencias();
    const r = await atenderCorrer(pedido("Bearer s3cr3t", `${URL_RUTA}?esperar=1`), d);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, corrida: "c1", tipo: "lugares", estado: "corriendo", usd: 0.2 });
    expect(d.correr).toHaveBeenCalledTimes(1);
    const cae = dependencias();
    cae.d.correr = vi.fn(async () => {
      throw new Error("sin base");
    });
    const mal = await atenderCorrer(pedido("Bearer s3cr3t", `${URL_RUTA}?esperar=1`), cae.d);
    expect(mal.status).toBe(503);
    expect(await mal.json()).toEqual({ ok: false, error: "motor_no_disponible" });
  });

  it("OL-489: antes de dar pasos deja las corridas semanales (una vez por llamada); si eso falla, los pasos corren igual", async () => {
    const orden: string[] = [];
    const { d, despues } = dependencias([{ corrida: "c1", tipo: "fichas", estado: "terminada", usd: 0 }]);
    const correr = d.correr;
    d.correr = vi.fn(async () => (orden.push("paso"), correr()));
    d.programar = vi.fn(async () => void orden.push("programar"));
    expect((await atenderCorrer(pedido("Bearer s3cr3t"), d)).status).toBe(202);
    expect(d.programar).not.toHaveBeenCalled();
    await despues[0]();
    expect(orden).toEqual(["programar", "paso", "paso"]);
    const cae = dependencias();
    cae.d.programar = async () => {
      throw new Error("la base");
    };
    const r = await atenderCorrer(pedido("Bearer s3cr3t", `${URL_RUTA}?esperar=1`), cae.d);
    expect(r.status).toBe(200);
    expect(cae.d.correr).toHaveBeenCalledTimes(1);
  });
});
