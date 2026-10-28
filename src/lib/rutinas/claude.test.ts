import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { buscarConApi, COSTO_SI_SE_CORTA, HERRAMIENTA_PROPONER, llamarConEntrega, MODELO_RUTINAS, type ClienteApi } from "./claude";
import { costoDeUso } from "./precios";

const USO = { input_tokens: 20_000, output_tokens: 1_500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 2, web_fetch_requests: 0 } };
const BUSQUEDA = { type: "web_search_tool_result", tool_use_id: "s1", content: [{ type: "web_search_result", url: "https://cultura.slp.gob.mx/espacios", title: "Espacios", encrypted_content: "", page_age: null }] };
const entrega = (lugares: unknown[]) => ({ type: "tool_use", id: "t1", name: "proponer_lugares", input: { lugares } });
const mensaje = (content: unknown[], stop_reason = "tool_use", usage: unknown = USO) => ({ id: "m", type: "message", role: "assistant", model: MODELO_RUTINAS, content, stop_reason, usage });
const LUGAR = { nombre: "Foro Nuevo", tipo: "foro", detalle: "Foro independiente", direccion: "Calle 1, Centro", municipio: "San Luis Potosí", redes: [], url: "https://cultura.slp.gob.mx/espacios" };

function cliente(...respuestas: (unknown | Error)[]) {
  const create = vi.fn(async () => {
    const r = respuestas.shift();
    if (r instanceof Error) throw r;
    return r;
  });
  return { c: { messages: { create } } as unknown as ClienteApi, create };
}
const pedido = (hasta = Date.now() + 40_000) => ({ pedido: "Busca en San Luis Potosí", herramientas: [{ type: "web_search_20260209", name: "web_search", max_uses: 2 }] as Anthropic.ToolUnion[], hasta });

describe("buscarConApi: una búsqueda con la API", () => {
  it("pide con el modelo, el esfuerzo bajo, las herramientas del encargo y la de entregar; lee la lista y lo que costó", async () => {
    const { c, create } = cliente(mensaje([BUSQUEDA, entrega([LUGAR])]));
    const r = await buscarConApi(c, pedido());
    expect(r.error).toBeNull();
    expect(r.lugares).toEqual([LUGAR]);
    expect([...r.paginas]).toEqual(["https://cultura.slp.gob.mx/espacios"]);
    expect(r.busquedas).toBe(2);
    expect(r.usd).toBeCloseTo(costoDeUso(USO, MODELO_RUTINAS), 10);
    const [cuerpo, opciones] = create.mock.calls[0] as unknown as [Anthropic.MessageCreateParams, { maxRetries: number; timeout: number }];
    expect(cuerpo.model).toBe("claude-sonnet-5-5");
    expect(cuerpo.output_config).toEqual({ effort: "low" });
    expect(cuerpo.tools?.map((t) => (t as { name?: string }).name)).toEqual(["web_search", "proponer_lugares"]);
    expect(HERRAMIENTA_PROPONER.strict).toBe(true);
    expect(opciones.maxRetries).toBe(0);
    expect(opciones.timeout).toBeLessThanOrEqual(40_000);
  });

  it("la API la deja a medias (pause_turn): una continuación con su turno, sin añadir nada, y se suma lo de las dos", async () => {
    const { c, create } = cliente(mensaje([BUSQUEDA], "pause_turn"), mensaje([entrega([LUGAR])]));
    const r = await buscarConApi(c, pedido());
    expect(r.lugares).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(2);
    const segunda = (create.mock.calls[1] as unknown as [Anthropic.MessageCreateParams])[0];
    expect(segunda.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(r.usd).toBeCloseTo(2 * costoDeUso(USO, MODELO_RUTINAS), 10);
  });

  it("se niega, se corta, o no entrega lista: un error en palabras, sin lugares, con lo gastado", async () => {
    expect((await buscarConApi(cliente(mensaje([], "refusal")).c, pedido())).error).toBe("La API no hizo esta búsqueda");
    expect((await buscarConApi(cliente(mensaje([], "max_tokens")).c, pedido())).error).toBe("La respuesta salió cortada");
    const sinLista = await buscarConApi(cliente(mensaje([BUSQUEDA], "end_turn")).c, pedido());
    expect(sinLista.error).toBe("La búsqueda no devolvió una lista");
    expect(sinLista.usd).toBeGreaterThan(0);
    expect((await buscarConApi(cliente(mensaje([entrega([{ nombre: 3 }])])).c, pedido())).error).toBe("La lista llegó con otra forma");
  });

  it("si la llamada se corta por tiempo, se anota lo estimado (la API no dice cuánto gastó)", async () => {
    const r = await buscarConApi(cliente(new Anthropic.APIConnectionTimeoutError()).c, pedido());
    expect(r.cortada).toBe(true);
    expect(r.usd).toBe(COSTO_SI_SE_CORTA);
    expect(r.error).toBe("La búsqueda tardó demasiado");
  });

  it("un error de la API no cobra nada y no deja ver la llave ni el mensaje crudo", async () => {
    const e = new Anthropic.AuthenticationError(401, { error: { message: "invalid x-api-key llave-falsa-123" } }, "invalid x-api-key llave-falsa-123", new Headers());
    const r = await buscarConApi(cliente(e).c, pedido());
    expect(r.usd).toBe(0);
    expect(r.error).toBe("La llave de la API no sirve");
  });

  it("sin tiempo, no llama", async () => {
    const { c, create } = cliente(mensaje([entrega([LUGAR])]));
    const r = await buscarConApi(c, pedido(Date.now() + 5_000));
    expect(create).not.toHaveBeenCalled();
    expect(r.error).toBe("No quedó tiempo para buscar");
  });
});

describe("llamarConEntrega: otro modelo (OL-470)", () => {
  it("pide con el modelo que se le da y cobra con su precio", async () => {
    const uso = { input_tokens: 10_000, output_tokens: 2_000 };
    const { c, create } = cliente({ ...mensaje([entrega([])], "tool_use", uso), model: "claude-haiku-5-5" });
    const r = await llamarConEntrega(c, { sistema: "s", contenido: "c", herramientas: [], entrega: HERRAMIENTA_PROPONER, esquema: z.object({ lugares: z.array(z.unknown()) }), hasta: Date.now() + 40_000, modelo: "claude-haiku-5-5" });
    expect((create.mock.calls[0] as unknown as [Anthropic.MessageCreateParams])[0].model).toBe("claude-haiku-5-5");
    expect(r.dato).toEqual({ lugares: [] });
    expect(r.usd).toBeCloseTo(costoDeUso(uso, "claude-haiku-5-5"), 10);
    expect(r.usd).toBeCloseTo((10_000 * 0.1 + 2_000 * 0.5) / 1_000_000, 10);
  });
});
