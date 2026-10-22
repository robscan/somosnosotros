import { describe, expect, it } from "vitest";
import { atenderCorrer } from "./atender";
import { baseFalsa, type Fila } from "./baseFalsa";
import { MODELO_RUTINAS, type ClienteApi } from "./claude";
import { dispararPaso, ORIGEN_PRODUCCION } from "./disparar";
import { correrUnPaso, LIMITE_RUTA_MS, PLAZO_PASO_AGENDAS_MS, type Dependencias } from "./motor";
import { corridasVaradas, rescatarVaradas } from "./rescate";

/**
 * La cadena de pasos de punta a punta (OL-429, OL-444): la hoja «Correr» pide el primer paso, la ruta responde 202 y corre los pasos «después
 * de responder». Aquí la red es falsa (cada POST llega a `atenderCorrer` con el motor real y una base en memoria) y hace lo que hace Vercel:
 * una petición que sale de dentro de la función que está corriendo (un paso que llama a la misma ruta) recibe 508 «Loop Detected». También se
 * le puede pedir que pierda peticiones, como la noche del 20 de octubre con la puesta en producción de #546 a medias.
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

/** El mundo: la base, la ruta del motor y una red que entrega (o pierde, o corta con 508) cada POST a la ruta. */
function mundo(corridas: Fila[], opciones: { perder?: (n: number) => boolean; maxPasos?: number; cadenaVieja?: boolean } = {}) {
  const base = baseFalsa({ ciudades: [structuredClone(SLP)], lugares: [], rutinas_corridas: corridas, propuestas: [] });
  const dep: Dependencias = { db: base.db, api, mapbox: { token: "t", pedir: servicios }, pedir: servicios, ahora: () => AHORA, plazoMs: 45_000 };
  const despues: (() => Promise<unknown>)[] = [];
  const registro: string[] = [];
  const respuestas: number[] = [];
  let peticiones = 0;
  /** ¿Se está corriendo una tarea de `after()`? Lo que pida por la red desde ahí es la función llamándose a sí misma. */
  let dentro = false;
  const red = (async (url: string, init?: RequestInit) => {
    const n = ++peticiones;
    const responder = (r: Response) => (respuestas.push(r.status), r);
    if (dentro) return responder(new Response("INFINITE_LOOP_DETECTED", { status: 508 }));
    // Una petición perdida: la del despliegue a medio cambiar (404) o la que no llega.
    if (opciones.perder?.(n)) return responder(new Response("no encontrado", { status: 404 }));
    return responder(await atenderCorrer(new Request(url, init), { secreto: SECRETO, correr, despues: (t) => void despues.push(t), limiteMs: LIMITE_RUTA_MS, pasoMaximoMs: PLAZO_PASO_AGENDAS_MS, maxPasos: opciones.maxPasos }));
  }) as typeof fetch;
  const disparo = { secreto: SECRETO, pedir: red, avisar: (t: string) => void registro.push(t), esperar: async () => undefined };
  /**
   * El paso. Con `cadenaVieja`, como antes de OL-444: cada paso que tomó una corrida pide el siguiente llamando a la ruta por la red, desde
   * dentro de la función (y la ruta da un solo paso por llamada).
   */
  const correr = async () => {
    const r = await correrUnPaso(dep);
    if (opciones.cadenaVieja && r.corrida) await dispararPaso(ORIGEN_PRODUCCION, disparo);
    return r;
  };
  /** Lo que hace `after()`: correr las tareas pendientes, y las que esas dejen, hasta que no quede ninguna. */
  async function vaciar() {
    for (let i = 0; despues.length && i < 200; i++) {
      dentro = true;
      try {
        await despues.shift()!();
      } finally {
        dentro = false;
      }
    }
  }
  const fila = (id: string) => base.tablas.rutinas_corridas.find((c) => c.id === id)! as Fila & { resumen: Record<string, unknown> };
  return { base, fila, registro, respuestas, vaciar, peticiones: () => peticiones, disparar: (intentos?: number) => dispararPaso(ORIGEN_PRODUCCION, { ...disparo, intentos }) };
}

describe("la cadena de pasos (OL-429, OL-444)", () => {
  it("reproduce el 508 de producción (22 oct): si cada paso pide el siguiente a la misma ruta, Vercel lo corta y la corrida se queda «corriendo»", async () => {
    const m = mundo([corrida("L")], { cadenaVieja: true, maxPasos: 1 });
    expect(await m.disparar()).toBe("disparado");
    await m.vaciar();
    expect(m.respuestas).toEqual([202, 508]);
    const L = m.fila("L");
    expect(L.estado).toBe("corriendo");
    expect(L.resumen).toMatchObject({ paso: "2 de 3 fuentes", turno: 1, ocupada_hasta: null });
    // El 508 ya no se cuenta como fallo ni se reintenta: lo dice así en el registro.
    expect(m.registro).toEqual(["rutinas: Vercel cortó la cadena (508); lo retoma el latido de Supabase"]);
  });

  it("el arreglo: la hoja pide el primer paso y la misma función da los siguientes; ningún paso sale a la red y la corrida termina", async () => {
    const m = mundo([corrida("L")]);
    expect(await m.disparar()).toBe("disparado");
    await m.vaciar();
    expect(m.fila("L").estado).toBe("terminada");
    expect(m.peticiones()).toBe(1);
    expect(m.respuestas).toEqual([202]);
    expect(m.registro).toEqual([]);
  });

  it("lo que no cabe en una llamada lo retoma el latido de Supabase (una llamada por minuto mientras haya corridas vivas)", async () => {
    const m = mundo([corrida("L")], { maxPasos: 2 });
    await m.disparar();
    await m.vaciar();
    expect(m.fila("L").estado).toBe("corriendo");
    let latidos = 0;
    while (m.fila("L").estado === "corriendo" && latidos < 20) {
      latidos++;
      await m.disparar(1);
      await m.vaciar();
    }
    expect(m.fila("L").estado).toBe("terminada");
    expect(latidos).toBeGreaterThan(1);
    expect(m.respuestas.every((s) => s === 202)).toBe(true);
  });

  it("si se pierde la petición de la hoja, Ciudades (o el latido) la encuentra varada y la corrida termina", async () => {
    const m = mundo([corrida("L")], { perder: (n) => n <= 3 });
    expect(await m.disparar()).toBe("falló");
    expect(m.registro).toEqual(["rutinas: no se pudo pedir el paso (respondió 404); lo retoma el latido de Supabase"]);
    expect(m.registro.join(" ")).not.toContain(SECRETO);
    const L = m.fila("L");
    expect(L.estado).toBe("pendiente");
    const vista = [{ id: "L", estado: String(L.estado), resumen: L.resumen, creado_en: String(L.creado_en), inicio: null }];
    expect(corridasVaradas(vista, new Date(AHORA.getTime() + 60_000))).toEqual([]);
    expect(await rescatarVaradas(vista, new Date(AHORA.getTime() + 3 * 60_000), () => m.disparar())).toBe(1);
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
      // Cuatro peticiones a la vez (el latido y tres de la hoja), intercaladas al azar entre operaciones de la base.
      const correr = async () => {
        await espera();
        await m.disparar();
      };
      await Promise.all([correr(), correr(), correr(), correr()]);
      await m.vaciar();
      // Artistas (OL-430) ya tiene rutina: sin la API, solo su parte gratis, y termina. El showcase de prueba no dice qué artista: «Falló».
      expect(["M", "G", "T"].map((id) => m.fila(id).estado), `vuelta ${vuelta}`).toEqual(["terminada", "terminada", "fallida"]);
    }
  }, 30_000);
});
