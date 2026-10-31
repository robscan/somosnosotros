import { describe, expect, it } from "vitest";
import { quedaronSinSalir, renglonSinSalir, textoVolverAPublicar, textoVueltos, type CasillaCola, type TrabajoCola } from "./sinSalir";

// Miércoles 7 de octubre a las 10:00 en la Ciudad de México; la semana empezó el lunes 5 a las 00:00 (06:00 UTC).
const AHORA = new Date("2026-10-07T16:00:00Z");
const DESDE = new Date("2026-10-05T06:00:00Z");
const A = "aaaa0000-0000-4000-8000-000000000001";
const B = "aaaa0000-0000-4000-8000-000000000002";
const PASADO = "aaaa0000-0000-4000-8000-000000000003";
const DIA = "dddd0000-0000-4000-8000-000000000001";

let n = 0;
const t = (o: Partial<TrabajoCola>): TrabajoCola => ({
  id: `t${++n}`,
  evento_id: A,
  artista_id: null,
  lugar_id: null,
  red: "instagram",
  formato: "4x5",
  pedido: { facebook: true },
  estado: "fallido",
  error: "permiso",
  creado_en: "2026-10-07T13:00:00Z",
  terminado_en: "2026-10-07T13:01:00Z",
  ...o,
});
const porVenir = (id: string) => (id === PASADO ? false : true);
const sin = (trabajos: TrabajoCola[], casillas = new Map<string, CasillaCola>()) => quedaronSinSalir(trabajos, { desde: DESDE, casillas, porVenir });

describe("lo que se quedó sin salir al caducar la conexión (OL-496)", () => {
  it("entra lo que falló por permiso esta semana, del más reciente al más viejo", () => {
    const hoy = t({ id: "hoy" });
    const lunes = t({ id: "lunes", evento_id: B, creado_en: "2026-10-05T15:00:00Z", terminado_en: "2026-10-05T15:01:00Z" });
    expect(sin([lunes, hoy]).map((s) => s.id)).toEqual(["hoy", "lunes"]);
  });
  it("no entra lo que falló por otra cosa, lo de la semana pasada ni lo que no terminó", () => {
    const imagen = t({ error: "imagen" });
    const viernes = t({ evento_id: B, terminado_en: "2026-10-02T20:00:00Z" });
    const enCola = t({ estado: "en_cola", error: null, terminado_en: null });
    expect(sin([imagen, viernes, enCola])).toEqual([]);
  });
  it("lo que falló dos veces sale una vez (el último); otro formato u otra red es otra publicación", () => {
    const antes = t({ id: "antes", creado_en: "2026-10-06T13:00:00Z", terminado_en: "2026-10-06T13:01:00Z" });
    const despues = t({ id: "despues" });
    const historia = t({ id: "historia", formato: "9x16" });
    const facebook = t({ id: "facebook", red: "facebook", pedido: {} });
    expect(sin([antes, despues, historia, facebook]).map((s) => s.id).sort()).toEqual(["despues", "facebook", "historia"]);
  });
  it("sin duplicar: lo que ya volvió a salir o va en camino después del fallo no se ofrece", () => {
    const fallo = t({ id: "fallo" });
    for (const estado of ["publicado", "en_cola", "publicando"]) {
      const otro = t({ id: `otro-${estado}`, estado, error: null, creado_en: "2026-10-07T14:00:00Z", terminado_en: estado === "publicado" ? "2026-10-07T14:01:00Z" : null });
      expect(sin([fallo, otro])).toEqual([]);
    }
    // Uno publicado ANTES del fallo no lo tapa (es otra publicación que ya pasó).
    const viejo = t({ id: "viejo", estado: "publicado", error: null, creado_en: "2026-10-06T10:00:00Z", terminado_en: "2026-10-06T10:01:00Z" });
    expect(sin([fallo, viejo]).map((s) => s.id)).toEqual(["fallo"]);
  });
  it("un evento que ya empezó o que no se pudo leer no se ofrece", () => {
    expect(sin([t({ evento_id: PASADO })])).toEqual([]);
    expect(quedaronSinSalir([t({})], { desde: DESDE, casillas: new Map(), porVenir: () => null })).toEqual([]);
  });
  it("un día de la semana de Instagram entra solo si sigue esperando ese trabajo («no se pudo»)", () => {
    const deDia = t({ id: "dia", evento_id: null, artista_id: "artista", pedido: { facebook: true, casilla: DIA, tipo: "artista" } });
    const casillas = (c: Partial<CasillaCola>) => new Map([[DIA, { id: DIA, trabajo_id: "dia", estado: "fallido", ...c }]]);
    expect(sin([deDia], casillas({})).map((s) => [s.id, s.casilla, s.artista_id])).toEqual([["dia", DIA, "artista"]]);
    expect(sin([deDia], casillas({ trabajo_id: "otro" }))).toEqual([]);
    expect(sin([deDia], casillas({ estado: "quitado" }))).toEqual([]);
    expect(sin([deDia], casillas({ estado: "programado" }))).toEqual([]);
    expect(sin([deDia])).toEqual([]);
  });
  it("el renglón y los textos de la hoja, en llano", () => {
    const [s] = sin([t({})]);
    expect(renglonSinSalir(s, "Master Class", AHORA)).toEqual({ id: s.id, red: "instagram", titulo: "Master Class", detalle: "Instagram y Facebook · publicación · no salió el mié 7 de oct" });
    const [h] = sin([t({ formato: "9x16", pedido: {} })]);
    expect(renglonSinSalir(h, "OCA", AHORA).detalle).toBe("Instagram · historia · no salió el mié 7 de oct");
    const [f] = sin([t({ red: "facebook", pedido: {} })]);
    expect(renglonSinSalir(f, "OCA", AHORA).detalle).toBe("Facebook · no salió el mié 7 de oct");
    expect(textoVolverAPublicar(3)).toBe("Volver a publicar (3)");
    expect(textoVueltos({ enCamino: 3, yaIban: 0, fallaron: 0 })).toBe("3 van en camino. Te avisamos en el teléfono cuando salgan.");
    expect(textoVueltos({ enCamino: 1, yaIban: 1, fallaron: 1 })).toBe("1 va en camino. Te avisamos en el teléfono cuando salgan. 1 ya iba en camino o ya había salido. 1 no se pudo poner en la cola: inténtalo otra vez.");
    expect(textoVueltos({ enCamino: 0, yaIban: 0, fallaron: 0 })).toBe("No quedó nada por volver a publicar.");
  });
});
