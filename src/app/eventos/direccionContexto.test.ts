import { describe, expect, it, vi } from "vitest";
import { CIUDAD_INICIAL, CIUDADES } from "@/lib/ciudad";
import type { Bbox } from "@/lib/geocodificar";
import {
  bboxDesdeCentro,
  bboxParaContexto,
  buscarConContexto,
  ciudadDeContexto,
  ciudadDelTexto,
  ciudadDesdeSlug,
  limpiarDireccion,
  necesitaReintento,
  necesitaReintentoLugares,
  redondearParaMapbox,
  textoParaReintento,
} from "./direccionContexto";

// Coordenadas reales, para las pruebas de cercanía: San Luis Potosí, y un resultado lejano (Rioverde, S.L.P., a ~120 km).
const CALLE_CERCA = { lat: 22.152, lng: -100.98 }; // ~500 m del centro histórico
const RIOVERDE = { lat: 21.93, lng: -99.99 };

describe("limpiarDireccion", () => {
  it("caso con nombre del founder: 'Galeana #423, S.L.P.'", () => {
    expect(limpiarDireccion("Galeana #423, S.L.P.")).toBe("Galeana 423, San Luis Potosí");
  });
  it("quita '#' y 'No.', expande 'esq.' y 'col.'", () => {
    expect(limpiarDireccion("Hidalgo No. 12 esq. Zaragoza, col. Centro")).toBe("Hidalgo 12 esquina Zaragoza, colonia Centro");
  });
  it("no toca un texto ya limpio", () => {
    expect(limpiarDireccion("Avenida Universidad 300")).toBe("Avenida Universidad 300");
  });
});

describe("ciudadDelTexto", () => {
  it("reconoce 'S.L.P.' como San Luis Potosí", () => {
    expect(ciudadDelTexto("Galeana #423, S.L.P.")?.nombre).toBe("San Luis Potosí");
  });
  it("reconoce 'SLP' sin puntos", () => {
    expect(ciudadDelTexto("Av. Salk 123, SLP")?.nombre).toBe("San Luis Potosí");
  });
  it("sin ninguna pista, no reconoce nada", () => {
    expect(ciudadDelTexto("El teatrito")).toBeNull();
  });
});

describe("ciudadDeContexto", () => {
  it("el texto manda sobre cualquier otra pista", () => {
    const r = ciudadDeContexto({ texto: "Galeana #423, S.L.P.", ciudadChip: { ...CIUDAD_INICIAL, nombre: "Ciudad de México" } });
    expect(r.origen).toBe("texto");
    expect(r.ciudad.nombre).toBe("San Luis Potosí");
  });
  it("sin texto, usa el punto del lugar leído del cartel", () => {
    const punto = { lat: 1, lng: 2 };
    const r = ciudadDeContexto({ texto: "El teatrito", puntoLugarLeido: punto });
    expect(r.origen).toBe("lugar");
    expect(r.centro).toEqual(punto);
  });
  it("sin texto ni lugar, usa la ciudad del chip", () => {
    const chip = { ...CIUDAD_INICIAL, nombre: "Ciudad de México", centro: { lat: 19.4, lng: -99.1 } };
    const r = ciudadDeContexto({ texto: "El teatrito", ciudadChip: chip });
    expect(r.origen).toBe("chip");
    expect(r.ciudad.nombre).toBe("Ciudad de México");
  });
  it("sin nada de lo anterior, usa la posición del teléfono", () => {
    const posicion = { lat: 3, lng: 4 };
    const r = ciudadDeContexto({ texto: "El teatrito", posicion });
    expect(r.origen).toBe("posicion");
    expect(r.centro).toEqual(posicion);
  });
  it("sin ninguna pista, cae en San Luis Potosí", () => {
    const r = ciudadDeContexto({ texto: "El teatrito" });
    expect(r.origen).toBe("inicial");
    expect(r.ciudad.nombre).toBe(CIUDAD_INICIAL.nombre);
  });
});

describe("bboxDesdeCentro", () => {
  it("da un rectángulo [oeste, sur, este, norte] alrededor del centro", () => {
    const [oeste, sur, este, norte] = bboxDesdeCentro(CIUDAD_INICIAL.centro, 15);
    expect(oeste).toBeLessThan(CIUDAD_INICIAL.centro.lng);
    expect(este).toBeGreaterThan(CIUDAD_INICIAL.centro.lng);
    expect(sur).toBeLessThan(CIUDAD_INICIAL.centro.lat);
    expect(norte).toBeGreaterThan(CIUDAD_INICIAL.centro.lat);
  });
});

describe("necesitaReintento", () => {
  it("caso con nombre: Rioverde/Aguascalientes/Guadalajara lejos del centro de San Luis piden reintento", () => {
    expect(necesitaReintento([RIOVERDE], CIUDAD_INICIAL.centro)).toBe(true);
  });
  it("una calle cercana no pide reintento", () => {
    expect(necesitaReintento([CALLE_CERCA, RIOVERDE], CIUDAD_INICIAL.centro)).toBe(false);
  });
  it("sin resultados, sí pide reintento", () => {
    expect(necesitaReintento([], CIUDAD_INICIAL.centro)).toBe(true);
  });
});

describe("necesitaReintentoLugares", () => {
  it("caso con nombre: solo distancias lejanas (metros) piden reintento", () => {
    expect(necesitaReintentoLugares([120_000, 300_000])).toBe(true);
  });
  it("una distancia cercana no pide reintento", () => {
    expect(necesitaReintentoLugares([450, 120_000])).toBe(false);
  });
  it("sin distancia (null) para ninguno, pide reintento", () => {
    expect(necesitaReintentoLugares([null, null])).toBe(true);
  });
  it("sin resultados, pide reintento", () => {
    expect(necesitaReintentoLugares([])).toBe(true);
  });
});

describe("textoParaReintento", () => {
  it("agrega la ciudad de contexto si el texto limpio no la trae", () => {
    expect(textoParaReintento("Galeana 423", CIUDAD_INICIAL)).toBe("Galeana 423, San Luis Potosí");
  });
  it("no la repite si ya viene (por 'S.L.P.' expandido)", () => {
    expect(textoParaReintento("Galeana #423, S.L.P.", CIUDAD_INICIAL)).toBe("Galeana 423, San Luis Potosí");
  });
});

describe("bboxParaContexto (revisión del gestor: un bbox EXCLUYE, nunca con el respaldo)", () => {
  it("origen 'inicial' (sin ninguna pista real): sin bbox, para no recortar a nadie en silencio", () => {
    const contexto = ciudadDeContexto({ texto: "El teatrito" });
    expect(contexto.origen).toBe("inicial");
    expect(bboxParaContexto(contexto)).toBeUndefined();
  });
  it("con una pista real (texto, lugar, chip o posición): sí hay bbox", () => {
    const contexto = ciudadDeContexto({ texto: "Galeana #423, S.L.P." });
    expect(contexto.origen).toBe("texto");
    expect(bboxParaContexto(contexto)).toBeDefined();
  });
});

describe("redondearParaMapbox", () => {
  it("a 3 decimales (~100 m), como pide la regla de ubicación", () => {
    expect(redondearParaMapbox({ lat: 22.14971234, lng: -100.97643210 })).toEqual({ lat: 22.15, lng: -100.976 });
  });
});

describe("ciudadDesdeSlug (revisión del gestor: sin el respaldo silencioso de ciudadPorSlug)", () => {
  it("un slug real resuelve a su ciudad", () => {
    expect(ciudadDesdeSlug(CIUDAD_INICIAL.slug)?.nombre).toBe(CIUDAD_INICIAL.nombre);
  });
  it("un slug inventado no cae en San Luis Potosí: sin ciudad de contexto", () => {
    expect(ciudadDesdeSlug("ciudad-que-no-existe")).toBeNull();
  });
  it("vacío o sin valor: sin ciudad de contexto", () => {
    expect(ciudadDesdeSlug("")).toBeNull();
    expect(ciudadDesdeSlug(undefined)).toBeNull();
    expect(ciudadDesdeSlug(null)).toBeNull();
  });
});

describe("buscarConContexto (revisión del gestor, hasta tres intentos)", () => {
  it("origen 'inicial': la primera búsqueda va sin bbox", async () => {
    const contexto = ciudadDeContexto({ texto: "Calle sin ciudad reconocible 45" });
    const llamadas: (Bbox | undefined)[] = [];
    const buscar = vi.fn(async (_texto: string, bbox: Bbox | undefined) => {
      llamadas.push(bbox);
      return [{ lat: contexto.centro.lat, lng: contexto.centro.lng }]; // "cerca": no hace falta reintento
    });
    const r = await buscarConContexto("Calle sin ciudad reconocible 45", contexto, buscar, (rs) => necesitaReintento(rs, contexto.centro));
    expect(llamadas).toEqual([undefined]);
    expect(r).toHaveLength(1);
  });

  it("caso con nombre 'Galeana #423, S.L.P.': si el primer intento (con bbox) no trae nada cerca, el reintento con el texto limpio sí lo encuentra, sin necesitar una tercera llamada", async () => {
    const contexto = ciudadDeContexto({ texto: "Galeana #423, S.L.P." });
    expect(contexto.origen).toBe("texto");
    const cercaDeVerdad = { lat: 22.152, lng: -100.978 }; // "Hermenegildo Galeana", ~400 m del centro
    const llamadas: { texto: string; bbox: Bbox | undefined }[] = [];
    const buscar = vi.fn(async (texto: string, bbox: Bbox | undefined) => {
      llamadas.push({ texto, bbox });
      // Mapbox no encuentra nada bueno con "Galeana" suelto, ni siquiera acotado a la ciudad; con el texto ya
      // limpio y expandido sí (la causa medida: elige candidatos por texto antes de que nosotros reordenemos).
      return texto === "Galeana #423, S.L.P." ? [] : [cercaDeVerdad];
    });
    const r = await buscarConContexto("Galeana #423, S.L.P.", contexto, buscar, (rs) => necesitaReintento(rs, contexto.centro));
    expect(llamadas).toHaveLength(2);
    expect(llamadas[0].bbox).toBeDefined();
    expect(llamadas[1].texto).toBe("Galeana 423, San Luis Potosí");
    expect(r).toEqual([cercaDeVerdad]);
  });

  it("chip en San Luis Potosí + dirección real en Matehuala (que el texto no nombra): el bbox de San Luis no la encuentra, pero la tercera búsqueda, sin bbox, sí", async () => {
    const chipSanLuis = CIUDADES.find((c) => c.slug === "san-luis-potosi")!;
    const contexto = ciudadDeContexto({ texto: "Av. Juárez 50", ciudadChip: chipSanLuis });
    expect(contexto.origen).toBe("chip");
    const matehuala = { lat: 23.64, lng: -100.64 }; // ~190 km de San Luis Potosí: fuera de cualquier bbox razonable
    const llamadas: { texto: string; bbox: Bbox | undefined }[] = [];
    const buscar = vi.fn(async (texto: string, bbox: Bbox | undefined) => {
      llamadas.push({ texto, bbox });
      // Con bbox (acotado a San Luis), Mapbox nunca devuelve Matehuala: está fuera del área. Sin bbox, sí aparece.
      return bbox ? [] : [matehuala];
    });
    const r = await buscarConContexto("Av. Juárez 50", contexto, buscar, (rs) => necesitaReintento(rs, contexto.centro));
    expect(llamadas).toHaveLength(3);
    expect(llamadas[0].bbox).toBeDefined();
    expect(llamadas[1].bbox).toBeDefined();
    expect(llamadas[2].bbox).toBeUndefined();
    expect(r).toEqual([matehuala]);
  });
});
