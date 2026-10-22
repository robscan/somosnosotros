import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { localAIso } from "../../src/lib/fechas";
import { baseFalsa, type Fila } from "../../src/lib/rutinas/baseFalsa";
import { NOTA_SIN_CARTEL } from "../../src/lib/rutinas/aceptarPropuesta";
import { aceptarCorrida, lineasDeInforme, motivoAgrupado, ordenar, PAUSA_MS } from "./aceptar-corrida";

// ---------- el mundo de la prueba (todo inventado, sin red) ----------
const ZONA = "America/Mexico_City";
const local = (x: string) => localAIso(x, ZONA)!;
const AHORA = new Date("2026-10-22T18:00:00Z");
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const OTRA = "00000000-0000-4000-8000-0000000000b1";
const CORRIDA = "c0000000-0000-4000-8000-000000000001";
const ID = (n: number) => `p0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CDMX = { slug: "ciudad-de-mexico", nombre: "Ciudad de México", lat: 19.432, lng: -99.14, zoom: 13, zona: ZONA, alias: [], estado: "abierta", parametros: { alcaldias: ["Cuauhtémoc"], radio_km: 12 } };
const FICHA = "https://cartelera.cdmx.gob.mx/15/29-10-2026/taller-de-titeres";
const propuesta = (n: number, tipo: string, datos: Record<string, unknown>, cambios: Partial<Fila> = {}): Fila => ({
  id: ID(n),
  corrida_id: CORRIDA,
  tipo,
  fuente: "Cartelera de la Ciudad de México",
  datos,
  estado: "propuesta",
  creado_en: `2026-10-22T17:00:0${n}Z`,
  ...cambios,
});

function mundo() {
  return baseFalsa(
    {
      perfiles: [
        { id: ADMIN, rol: "admin" },
        { id: OTRA, rol: "usuario" },
      ],
      ciudades: [structuredClone(CDMX)],
      rutinas_corridas: [{ id: CORRIDA, tipo: "agendas", ciudad: "ciudad-de-mexico", estado: "terminada" }],
      lugares: [],
      eventos: [],
      propuestas: [
        // El evento se propuso antes que su recinto: aun así, el recinto se acepta primero y el evento queda en él.
        propuesta(1, "evento", { titulo: "Taller de títeres", inicio: local("2026-10-29T11:00"), lugar: "Teatro Julio Jiménez Rueda", precio: "Gratis", clase: "taller", url: FICHA, cartelera_id: "15", lat: 19.4352, lng: -99.1412, imagen: "https://cartelera.cdmx.gob.mx/wp-content/uploads/x.jpg", ciudad: "Ciudad de México" }),
        propuesta(2, "lugar", { nombre: "Teatro Julio Jiménez Rueda", tipo: "foro", lat: 19.4352, lng: -99.1412, ciudad: "Ciudad de México", direccion: "Av. de la Reforma 50, Cuauhtémoc", redes: [], cartelera_recinto: "700" }),
        propuesta(3, "evento", { titulo: "Concierto que ya pasó", inicio: local("2026-10-20T19:00"), lugar: "Teatro Julio Jiménez Rueda", precio: "Gratis", url: FICHA, cartelera_id: "16" }),
        propuesta(4, "evento", { titulo: "Altar vivo", inicio: local("2026-10-30T19:00"), lugar: "Teatro Julio Jiménez Rueda", precio: "Entrada con acceso al museo", url: FICHA, cartelera_id: "17" }),
        propuesta(5, "lugar", { nombre: "Ya decidido", tipo: "museo", lat: 19.43, lng: -99.14, ciudad: "Ciudad de México" }, { estado: "aceptada", resuelto_por: ADMIN }),
        propuesta(6, "cartel", { evento_id: "x", imagen: "https://x.example/a.jpg" }),
      ],
    },
    {
      eventos_parecidos: () => [],
      lugares_parecidos: () => [],
      // `aceptar_propuesta_como` (migración 20261022170000, probada en el banco de PostgreSQL): aquí, lo que hace con un lugar o un evento.
      aceptar_propuesta_como: (args, tablas) => {
        llamadas.push(args);
        const p = tablas.propuestas.find((x) => x.id === args.p_id)!;
        if (tablas.perfiles.find((x) => x.id === args.p_autor)?.rol !== "admin") throw new Error("solo la administración");
        if (p.estado !== "propuesta") return { estado: p.estado, ficha_id: p.ficha_id ?? null };
        let fichaId: string | null = null;
        if (p.tipo === "lugar") {
          fichaId = randomUUID();
          tablas.lugares.push({ id: fichaId, ...(args.p_ficha as Fila), creado_por: args.p_autor });
        }
        Object.assign(p, { estado: "aceptada", ficha_id: fichaId, resuelto_por: args.p_autor, resuelto_en: AHORA.toISOString() });
        return { estado: "aceptada", ficha_id: fichaId, slug: null };
      },
    },
  );
}
const llamadas: Record<string, unknown>[] = [];

function dependencias(base: ReturnType<typeof mundo>) {
  const esperas: number[] = [];
  const subidas: string[] = [];
  return {
    esperas,
    subidas,
    dep: {
      db: base.db,
      mapboxToken: null,
      ahora: () => AHORA,
      dormir: async (ms: number) => void esperas.push(ms),
      // La imagen no se deja bajar: el evento se publica sin cartel y la línea lo dice.
      pedir: (async () => new Response("no", { status: 404 })) as typeof fetch,
      almacen: () => ({ subir: async (ruta: string) => (subidas.push(ruta), `https://fotos.example/${ruta}`) }),
    },
  };
}
const opciones = { corrida: CORRIDA, autor: ADMIN, simular: false, solo: null, limite: null };

describe("aceptar una corrida desde la Mac (OL-453)", () => {
  it("lugares primero, luego eventos; por el camino de la bandeja, con sus notas; lo que no se puede, se queda con su motivo", async () => {
    const base = mundo();
    const { dep, esperas } = dependencias(base);
    const { lineas } = await aceptarCorrida(dep, opciones);
    // Los carteles y lo ya decidido no se tocan; el lugar va primero aunque se propuso después.
    expect(lineas.map((l) => [l.tipo, l.nombre])).toEqual([
      ["lugar", "Teatro Julio Jiménez Rueda"],
      ["evento", "Taller de títeres"],
      ["evento", "Concierto que ya pasó"],
      ["evento", "Altar vivo"],
    ]);
    // En serie, con su pausa entre una y otra.
    expect(esperas).toEqual([PAUSA_MS, PAUSA_MS, PAUSA_MS]);

    const lugar = base.tablas.lugares[0];
    expect(lugar).toMatchObject({ nombre: "Teatro Julio Jiménez Rueda", tipo: "foro", creado_por: ADMIN, ciudad: "Ciudad de México" });
    // El evento quedó en el recinto recién aceptado, a nombre del admin, ligado a su propuesta; sin cartel (la imagen no bajó) y lo dice.
    const taller = base.tablas.eventos.find((e) => e.titulo === "Taller de títeres")!;
    expect(taller).toMatchObject({ lugar_id: lugar.id, creado_por: ADMIN, origen: "rutina-agendas", fuente_url: FICHA, clase: "taller" });
    expect(lineas[1]).toMatchObject({ resultado: { ok: true, nota: NOTA_SIN_CARTEL }, cartel: "sin" });
    // El costo que no es cifra queda por confirmar, como en la bandeja.
    expect(lineas[3].resultado).toMatchObject({ ok: true, nota: "se publicó con costo por confirmar" });
    // Lo que ya pasó no se acepta ni se rechaza: se queda como estaba, con su motivo.
    expect(lineas[2].resultado).toEqual({ ok: false, error: "No se publicó: ese evento ya pasó. Recházala." });
    const estado = (n: number) => base.tablas.propuestas.find((p) => p.id === ID(n));
    expect(estado(2)).toMatchObject({ estado: "aceptada", ficha_id: lugar.id, resuelto_por: ADMIN });
    expect(estado(1)).toMatchObject({ estado: "aceptada", ficha_id: taller.id, resuelto_por: ADMIN });
    expect(estado(3)).toMatchObject({ estado: "propuesta" });
    expect(estado(3)!.motivo_rechazo).toBeUndefined();
    expect(estado(6)).toMatchObject({ estado: "propuesta" });
    // Se marcó con `aceptar_propuesta_como`, a nombre del admin.
    expect(llamadas.filter((l) => l.p_autor === ADMIN).map((l) => l.p_id)).toEqual(expect.arrayContaining([ID(2), ID(1), ID(4)]));

    const texto = lineasDeInforme({ simular: false, corrida: CORRIDA, resumen: { lineas }, minutos: 1 }).join("\n");
    expect(texto).toContain("- Aceptadas: 3 (lugar 1 · artista 0 · evento 2)");
    expect(texto).toContain("- Eventos con imagen: 1 · con cartel 0 · sin cartel 1");
    expect(texto).toContain("- No aceptadas (se quedan en la bandeja como estaban): 1");
    expect(texto).toContain(`- ${NOTA_SIN_CARTEL}: 1`);
    expect(texto).toContain("- se publicó con costo por confirmar: 1");
    expect(texto).toContain("- **No se publicó: ese evento ya pasó. Recházala.** (1)");
  });

  it("se puede volver a correr: lo ya aceptado no se toca y no se repite nada", async () => {
    const base = mundo();
    await aceptarCorrida(dependencias(base).dep, opciones);
    const antes = { lugares: base.tablas.lugares.length, eventos: base.tablas.eventos.length };
    const { lineas } = await aceptarCorrida(dependencias(base).dep, opciones);
    // Solo vuelve a mirar lo que se quedó sin decidir (lo que ya pasó), sin escribir nada nuevo.
    expect(lineas.map((l) => l.nombre)).toEqual(["Concierto que ya pasó"]);
    expect({ lugares: base.tablas.lugares.length, eventos: base.tablas.eventos.length }).toEqual(antes);
  });

  it("con --simular comprueba cada una y no escribe nada; --solo y --limite acotan", async () => {
    const base = mundo();
    const { lineas } = await aceptarCorrida(dependencias(base).dep, { ...opciones, simular: true });
    // Simulando, el recinto no llega a existir: el evento que trae el punto de la cartelera se comprueba como sitio; el que no lo trae, no (al
    // aceptar de verdad sí, porque el lugar ya se aceptó antes).
    expect(lineas.map((l) => [l.nombre, l.resultado.ok])).toEqual([
      ["Teatro Julio Jiménez Rueda", true],
      ["Taller de títeres", true],
      ["Concierto que ya pasó", false],
      ["Altar vivo", false],
    ]);
    expect(base.operaciones.filter((o) => o.op !== "select" && o.op !== "rpc")).toEqual([]);
    expect(base.tablas.propuestas.filter((p) => p.estado === "aceptada")).toHaveLength(1);
    expect(lineasDeInforme({ simular: true, corrida: CORRIDA, resumen: { lineas }, minutos: 0 }).join("\n")).toContain("- Se aceptarían: 2");
    const soloLugares = await aceptarCorrida(dependencias(base).dep, { ...opciones, simular: true, solo: "lugar" });
    expect(soloLugares.lineas.map((l) => l.tipo)).toEqual(["lugar"]);
    const dos = await aceptarCorrida(dependencias(base).dep, { ...opciones, simular: true, limite: 2 });
    expect(dos.lineas.map((l) => l.nombre)).toEqual(["Teatro Julio Jiménez Rueda", "Taller de títeres"]);
  });

  it("solo con una cuenta de administración; si la base no responde, reintenta una vez", async () => {
    const base = mundo();
    await expect(aceptarCorrida(dependencias(base).dep, { ...opciones, autor: OTRA })).rejects.toThrow("--autor tiene que ser una cuenta de administración");
    const { dep, esperas } = dependencias(base);
    // La primera lectura de los lugares de la ciudad falla (sin conexión): se espera 2 s y se vuelve a intentar.
    let fallo = false;
    base.antesDe((o) => {
      if (!fallo && o.tabla === "lugares" && o.op === "select") {
        fallo = true;
        base.fallar("lugares", "select");
      } else if (o.tabla !== "lugares" || o.op !== "select" || fallo) base.reparar();
    });
    const { lineas } = await aceptarCorrida(dep, { ...opciones, solo: "evento", limite: 1 });
    expect(esperas).toEqual([2_000]);
    expect(lineas[0]).toMatchObject({ nombre: "Taller de títeres", resultado: { ok: true } });
  });

  it("el orden y los motivos agrupados", () => {
    const ps = [
      { tipo: "evento", datos: { clase: "puntual" }, creado_en: "1" },
      { tipo: "evento", datos: { clase: "festival" }, creado_en: "2" },
      { tipo: "artista", datos: {}, creado_en: "3" },
      { tipo: "lugar", datos: {}, creado_en: "4" },
    ];
    expect(ordenar(ps).map((p) => `${p.tipo}${p.datos.clase ? `:${p.datos.clase}` : ""}`)).toEqual(["lugar", "artista", "evento:festival", "evento:puntual"]);
    expect(motivoAgrupado("Ya está «Hamlet» ese día en ese sitio: recházala como duplicado.")).toBe("Ya está «…» ese día en ese sitio: recházala como duplicado.");
  });
});
