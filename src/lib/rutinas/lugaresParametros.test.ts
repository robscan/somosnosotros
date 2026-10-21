import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { correrUnPaso, type Dependencias } from "./motor";

/**
 * «Buscar lugares» con los parámetros de la ciudad (OL-429; founder, 21 de octubre: «enfoquemos en zonas más turísticas y partamos de guías
 * culturales que ya existen»): las guías van primero, solo cuentan las alcaldías de la ciudad y el radio manda sobre el zoom. Sin parámetros,
 * todo igual que antes.
 */

const AHORA = new Date("2026-10-21T16:00:00Z");
const CENTRO = { lat: 22.1497, lng: -100.9764 };
const GUIA = { nombre: "Guía Potosina de Cultura", url: "https://www.guia.example/san-luis" };
const ciudad = (parametros?: Record<string, unknown>) => ({
  slug: "san-luis-potosi",
  nombre: "San Luis Potosí",
  ...CENTRO,
  zoom: 13,
  zona: "America/Mexico_City",
  alias: ["Soledad de Graciano Sánchez"],
  estado: "abierta",
  ...(parametros ? { parametros } : {}),
});
const corrida = (): Fila => ({ id: "c", tipo: "lugares", ciudad: "san-luis-potosi", parametros: { fuentes: ["sic", "cultura", "web"] }, tope_usd: 3, gasto_usd: 0, estado: "pendiente", resumen: {}, creado_en: "2026-10-21T15:59:00Z", inicio: null, fin: null });

// El SIC: un museo en la capital, uno en Soledad a 3 km del centro y otro en Soledad a 9 km.
const pedir = (async (url: string) => {
  const u = new URL(url);
  if (u.hostname === "sic.cultura.gob.mx") {
    const t = u.pathname.match(/\/24_(\w+?)_directorio\.csv$/)?.[1] ?? "";
    const cab = `${t}_id,${t}_nombre,nom_mun,nom_loc,${t}_calle_numero,${t}_colonia,${t}_cp,pagina_web,gmaps_longitud,gmaps_latitud`;
    const filas =
      t === "museo"
        ? [
            '1,"Museo de la Capital","San Luis Potosí","San Luis Potosí","Calle 1","Centro","78000","",-100.9752,22.1505',
            '2,"Museo de Soledad","Soledad de Graciano Sánchez","Soledad de Graciano Sánchez","Calle 2","Centro","78430","",-100.948,22.165',
            '3,"Museo Lejano de Soledad","Soledad de Graciano Sánchez","Soledad de Graciano Sánchez","Calle 3","Rancho","78430","",-100.90,22.20',
          ]
        : [];
    return new Response(new Uint8Array(Buffer.from([cab, ...filas].join("\n"), "latin1")));
  }
  if (u.pathname.includes("/geocode/v6/reverse")) return Response.json({ features: [{ properties: { context: { country: { country_code: "MX" }, region: { name: "San Luis Potosí", region_code: "SLP" } } } }] });
  if (u.pathname.includes("/geocode/v6/forward") && (u.searchParams.get("q") ?? "").startsWith("Av. Soledad 10"))
    return Response.json({ features: [{ properties: { feature_type: "address", full_address: "Avenida Soledad 10, Soledad de Graciano Sánchez", coordinates: { latitude: 22.17, longitude: -100.95 } } }] });
  if (u.pathname.includes("/geocode/v6/forward") && (u.searchParams.get("q") ?? "").startsWith("Calle Capital 5"))
    return Response.json({ features: [{ properties: { feature_type: "address", full_address: "Calle Capital 5, Centro, San Luis Potosí", coordinates: { latitude: 22.152, longitude: -100.975 } } }] });
  return Response.json({ features: [], suggestions: [] });
}) as typeof fetch;

const L = (nombre: string, municipio: string, direccion: string | null) => ({ nombre, tipo: "foro", detalle: "Foro de música", direccion, municipio, redes: [], url: GUIA.url });
function api() {
  const create = vi.fn(async (cuerpo: Anthropic.MessageCreateParams) => {
    const texto = String(cuerpo.messages[0].content);
    const lugares = texto.includes(GUIA.url) ? [L("Foro de Soledad", "Soledad de Graciano Sánchez", "Av. Soledad 10, Centro"), L("Foro de la Capital", "San Luis Potosí", "Calle Capital 5, Centro")] : [];
    return {
      id: "m",
      type: "message",
      role: "assistant",
      model: MODELO_RUTINAS,
      stop_reason: "tool_use",
      usage: { input_tokens: 1000, output_tokens: 100 },
      content: [
        { type: "web_fetch_tool_result", tool_use_id: "f", content: { type: "web_fetch_result", url: GUIA.url, content: { type: "document", source: { type: "text", media_type: "text/plain", data: "" } } } },
        { type: "tool_use", id: "t", name: "proponer_lugares", input: { lugares } },
      ],
    };
  });
  return { cliente: { messages: { create } } as unknown as ClienteApi, create };
}

async function correr(parametros?: Record<string, unknown>) {
  const base = baseFalsa({ ciudades: [ciudad(parametros)], lugares: [], rutinas_corridas: [corrida()], propuestas: [] });
  const { cliente, create } = api();
  const dep: Dependencias = { db: base.db, api: cliente, mapbox: { token: "t", pedir }, pedir, ahora: () => AHORA, plazoMs: 45_000 };
  const primero = await correrUnPaso(dep);
  const tras1 = structuredClone(base.tablas.rutinas_corridas[0].resumen as Record<string, unknown>);
  for (let i = 0; i < 30 && (await correrUnPaso(dep)).estado === "corriendo"; i++);
  const c = base.tablas.rutinas_corridas[0] as Fila & { resumen: Record<string, unknown> };
  return { base, c, create, primero, tras1, propuestas: base.tablas.propuestas.map((p) => [p.fuente, (p.datos as Fila).nombre]) };
}

describe("«Buscar lugares» con los parámetros de la ciudad (OL-429)", () => {
  it("las guías van primero (lectura web acotada a su sitio), solo cuentan las alcaldías y el radio manda sobre el zoom", async () => {
    const { c, create, tras1, propuestas } = await correr({ alcaldias: ["Soledad de Graciano Sánchez"], radio_km: 5, guias: [GUIA] });
    const cursor = tras1.cursor as { fuentes: string[]; radioKm: number };
    expect(cursor.fuentes).toEqual(["guias", "sic", "cultura", "web"]);
    expect(cursor.radioKm).toBe(5);
    expect(tras1.paso).toBe("1 de 4 fuentes");
    const primera = (create.mock.calls[0] as unknown as [Anthropic.MessageCreateParams])[0];
    expect(primera.tools?.[0]).toMatchObject({ type: "web_fetch_20260209", name: "web_fetch", allowed_domains: ["guia.example"] });
    expect(String(primera.messages[0].content)).toContain("Solo cuentan estas alcaldías: Soledad de Graciano Sánchez.");
    expect(c.estado).toBe("terminada");
    // De la guía: el de Soledad (ubicado por su dirección) entra con el nombre de la guía como fuente; el de la capital (su dirección, ya en el
    // mapa, no nombra a Soledad), fuera. Del SIC: el de la capital ni se lee (el archivo se filtra por alcaldía) y el de Soledad a 9 km, fuera.
    expect(propuestas).toEqual([
      ["Guía Potosina de Cultura", "Foro de Soledad"],
      ["Sistema de Información Cultural", "Museo de Soledad"],
    ]);
    expect((c.resumen.por_fuente as Record<string, { propuestos: number }>).guias.propuestos).toBe(1);
    expect((c.resumen.descartados as Record<string, number>).fuera_de_la_ciudad).toBe(2);
  });

  it("sin parámetros se comporta como antes: tres fuentes, 15 km por el zoom, sin guías, cuentan la ciudad y sus alias", async () => {
    const { tras1, create, propuestas } = await correr();
    const cursor = tras1.cursor as { fuentes: string[]; radioKm: number };
    expect(cursor.fuentes).toEqual(["sic", "cultura", "web"]);
    expect(cursor.radioKm).toBe(15);
    // El primer paso termina el SIC (todo con su punto): el resumen ya dice la siguiente fuente, como lo vio el gestor en San Luis.
    expect(tras1.paso).toBe("2 de 3 fuentes");
    expect(create.mock.calls.every((c) => !String((c as unknown as [Anthropic.MessageCreateParams])[0].messages[0].content).includes(GUIA.url))).toBe(true);
    expect(propuestas.map(([, n]) => n)).toEqual(["Museo de la Capital", "Museo de Soledad", "Museo Lejano de Soledad"]);
  });
});
