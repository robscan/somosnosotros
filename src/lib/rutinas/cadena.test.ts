import { describe, expect, it } from "vitest";
import { atenderCorrer } from "./atender";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { dispararPaso, ORIGEN_PRODUCCION } from "./disparar";
import { correrUnPaso, LIMITE_RUTA_MS, type Dependencias } from "./motor";
import { corridasVaradas, rescatarVaradas } from "./rescate";

/**
 * La cadena de pasos de punta a punta (OL-429): la hoja «Correr» pide el primer paso, la ruta responde 202 y corre el paso «después de
 * responder», y cada paso pide el siguiente. Aquí la red es falsa (cada POST llega a `atenderCorrer` con el motor real y una base en memoria) y
 * se le puede pedir que pierda peticiones, como pasó la noche del 20 de octubre con la puesta en producción de #546 a medias.
 */

const AHORA = new Date("2026-10-20T03:12:00Z");
const SECRETO = "s3cr3t";
const SLP = { slug: "san-luis-potosi", nombre: "San Luis Potosí", lat: 22.1497, lng: -100.9764, zoom: 13, zona: "America/Mexico_City", alias: ["Soledad de Graciano Sánchez"], estado: "abierta" };
const corrida = (id: string, c: Partial<Fila> = {}): Fila => ({
  id,
  tipo: "lugares",
  ciudad: "san-luis-potosi",
  parametros: { fuentes: ["sic", "cultura", "web"] },
  tope_usd: 3,
  gasto_usd: 0,
  estado: "pendiente",
  resumen: {},
  creado_en: "2026-10-20T03:12:00Z",
  inicio: null,
  fin: null,
  ...c,
});

// El SIC del estado 24 (un museo con su punto) y Mapbox (el estado de la ciudad); la API no encuentra nada nuevo.
const servicios = (async (url: string) => {
  const u = new URL(url);
  if (u.hostname === "sic.cultura.gob.mx") {
    const t = u.pathname.match(/\/24_(\w+?)_directorio\.csv$/)?.[1] ?? "";
    const cab = `${t}_id,${t}_nombre,nom_mun,nom_loc,${t}_calle_numero,${t}_colonia,${t}_cp,pagina_web,gmaps_longitud,gmaps_latitud`;
    const filas = t === "museo" ? ['1,"Museo Nacional de la Máscara","San Luis Potosí","San Luis Potosí","Villerías 2","Centro","78000","",-100.9752,22.1505'] : [];
    return new Response(new Uint8Array(Buffer.from([cab, ...filas].join("\n"), "latin1")));
  }
  if (u.pathname.includes("/geocode/v6/reverse")) return Response.json({ features: [{ properties: { context: { country: { country_code: "MX" }, region: { name: "San Luis Potosí", region_code: "SLP" } } } }] });
  return Response.json({ features: [], suggestions: [] });
}) as typeof fetch;
const api = {
  messages: {
    create: async () => ({
      id: "m",
      type: "message",
      role: "assistant",
      model: MODELO_RUTINAS,
      stop_reason: "tool_use",
      usage: { input_tokens: 1000, output_tokens: 100 },
      content: [{ type: "tool_use", id: "t", name: "proponer_lugares", input: { lugares: [] } }],
    }),
  },
} as unknown as ClienteApi;

/** El mundo: la base, la ruta del motor y una red que entrega (o pierde) cada POST a la ruta. */
function mundo(corridas: Fila[], perder: (n: number) => boolean = () => false, intentosCadena?: number) {
  const base = baseFalsa({ ciudades: [structuredClone(SLP)], lugares: [], rutinas_corridas: corridas, propuestas: [] });
  const dep: Dependencias = { db: base.db, api, mapbox: { token: "t", pedir: servicios }, pedir: servicios, ahora: () => AHORA, plazoMs: 45_000 };
  const despues: (() => Promise<unknown>)[] = [];
  const registro: string[] = [];
  let peticiones = 0;
  const red = (async (url: string, init?: RequestInit) => {
    const n = ++peticiones;
    // Una petición perdida: la del despliegue a medio cambiar (404) o la que no llega.
    if (perder(n)) return new Response("no encontrado", { status: 404 });
    return atenderCorrer(new Request(url, init), { secreto: SECRETO, correr: () => correrUnPaso(dep), despues: (t) => void despues.push(t), encadenar, limiteMs: LIMITE_RUTA_MS });
  }) as typeof fetch;
  const opciones = { secreto: SECRETO, pedir: red, avisar: (t: string) => void registro.push(t), esperar: async () => undefined };
  const encadenar = (hasta: number) => dispararPaso(ORIGEN_PRODUCCION, { ...opciones, hasta, intentos: intentosCadena });
  /** Lo que hace `after()`: correr las tareas pendientes, y las que esas dejen, hasta que no quede ninguna. */
  async function vaciar() {
    for (let i = 0; despues.length && i < 200; i++) await despues.shift()!();
  }
  const fila = (id: string) => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
  return { base, fila, registro, vaciar, peticiones: () => peticiones, disparar: (intentos?: number) => dispararPaso(ORIGEN_PRODUCCION, { ...opciones, intentos }) };
}

describe("la cadena de pasos (OL-429)", () => {
  it("sin pérdidas: la hoja pide el primer paso y la corrida encadena sola hasta «Terminada»", async () => {
    const m = mundo([corrida("L")]);
    expect(await m.disparar()).toBe("disparado");
    await m.vaciar();
    expect(m.fila("L").estado).toBe("terminada");
    expect(m.registro).toEqual([]);
  });

  it("reproduce lo de San Luis: si se pierde la petición del segundo paso y nadie la repite, la corrida se queda «corriendo» como la vio el gestor", async () => {
    // Antes de OL-429 cada paso pedía el siguiente una sola vez y no dejaba rastro: aquí, un intento y la segunda petición perdida.
    const m = mundo([corrida("L")], (n) => n === 2, 1);
    await m.disparar(1);
    await m.vaciar();
    const L = m.fila("L");
    expect(L.estado).toBe("corriendo");
    expect(L.resumen).toMatchObject({ paso: "2 de 3 fuentes", turno: 1, ocupada_hasta: null, intentos: 0 });
  });

  it("arreglo 1: el paso que pide el siguiente reintenta (hasta tres veces) y deja rastro si no lo logra", async () => {
    const m = mundo([corrida("L")], (n) => n === 2);
    await m.disparar();
    await m.vaciar();
    expect(m.fila("L").estado).toBe("terminada");
    expect(m.registro).toEqual([]);
    // Si se pierden los tres intentos, queda la línea en el registro (sin el secreto ni la dirección).
    const peor = mundo([corrida("L")], (n) => n >= 2 && n <= 4);
    await peor.disparar();
    await peor.vaciar();
    expect(peor.fila("L").estado).toBe("corriendo");
    expect(peor.registro).toEqual(["rutinas: no se pudo pedir el paso (respondió 404); lo retoma Ciudades o el cron"]);
    expect(peor.registro.join(" ")).not.toContain(SECRETO);
  });

  it("arreglo 2: si aun así se queda varada, al cargar Ciudades se pide su paso y la corrida termina", async () => {
    const m = mundo([corrida("L")], (n) => n >= 2 && n <= 4);
    await m.disparar();
    await m.vaciar();
    const L = m.fila("L");
    expect(L.estado).toBe("corriendo");
    // Recién guardado el paso, no está varada (el siguiente puede ir en camino); dos minutos sin avanzar, sí.
    const vista = [{ id: "L", estado: String(L.estado), resumen: L.resumen, creado_en: String(L.creado_en), inicio: String(L.inicio) }];
    expect(corridasVaradas(vista, new Date(AHORA.getTime() + 60_000))).toEqual([]);
    const mas = new Date(AHORA.getTime() + 3 * 60_000);
    expect(await rescatarVaradas(vista, mas, () => m.disparar())).toBe(1);
    await m.vaciar();
    expect(m.fila("L").estado).toBe("terminada");
  });

  it("el motor no pierde corridas por sí solo: varias corridas y peticiones a la vez, en distinto orden, todas terminan", async () => {
    const espera = () => new Promise((r) => setTimeout(r, Math.floor(Math.random() * 3)));
    for (let vuelta = 0; vuelta < 40; vuelta++) {
      const m = mundo([
        corrida("M", { ciudad: "san-luis-potosi", estado: "corriendo", inicio: "2026-10-20T03:10:00Z", resumen: { turno: 2, ocupada_hasta: null, intentos: 0 } }),
        corrida("G", { tipo: "artistas", creado_en: "2026-10-20T03:12:20Z" }),
        corrida("T", { tipo: "showcase", ciudad: null, creado_en: "2026-10-20T03:12:30Z" }),
      ]);
      // Cuatro peticiones a la vez (la cadena de M y las tres de la hoja), intercaladas al azar entre operaciones de la base.
      const correr = async () => {
        await espera();
        await m.disparar();
      };
      await Promise.all([correr(), correr(), correr(), correr()]);
      await m.vaciar();
      expect(["M", "G", "T"].map((id) => m.fila(id).estado), `vuelta ${vuelta}`).toEqual(["terminada", "fallida", "fallida"]);
    }
  }, 30_000);
});
