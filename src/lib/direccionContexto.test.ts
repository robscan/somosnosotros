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
  descartarSinCalle,
  filtrarYOrdenarDirecciones,
  limpiarDireccion,
  necesitaReintento,
  necesitaReintentoLugares,
  numeroDeCalle,
  redondearParaMapbox,
  textoDeBusqueda,
  textoParaReintento,
  tokensDeCalle,
  tokensDeColonia,
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

describe("textoDeBusqueda (revisión del gestor: no mandar la ciudad dos veces)", () => {
  it("caso real del founder: quita la ciudad de contexto del texto, deja calle, número y colonia", () => {
    const contexto = ciudadDeContexto({ texto: "Galeana #423, Centro, S.L.P." });
    expect(textoDeBusqueda("Galeana #423, Centro, S.L.P.", contexto)).toBe("Galeana 423, Centro");
  });
  it("con la ciudad de otro origen (chip, lugar, posición), no hay nada que quitar del texto", () => {
    const chip = CIUDADES.find((c) => c.slug === "san-luis-potosi")!;
    const contexto = ciudadDeContexto({ texto: "Av. Juárez 50", ciudadChip: chip });
    expect(contexto.origen).toBe("chip");
    expect(textoDeBusqueda("Av. Juárez 50", contexto)).toBe(limpiarDireccion("Av. Juárez 50"));
  });
});

describe("tokensDeCalle, tokensDeColonia y numeroDeCalle", () => {
  it("caso con nombre: 'Galeana #423, Centro, S.L.P.' → la calle es solo 'galeana' (la colonia, 'centro', va aparte)", () => {
    expect(tokensDeCalle("Galeana #423, Centro, S.L.P.")).toEqual(["galeana"]);
    expect(tokensDeColonia("Galeana #423, Centro, S.L.P.")).toEqual(["centro"]);
    expect(numeroDeCalle("Galeana #423, Centro, S.L.P.")).toBe("423");
  });
  it("sin coma, todo es calle y no hay colonia", () => {
    expect(tokensDeCalle("Hermenegildo Galeana 423")).toEqual(["hermenegildo", "galeana"]);
    expect(tokensDeColonia("Hermenegildo Galeana 423")).toEqual([]);
  });
  it("sin ninguna palabra de calle reconocible, lista vacía", () => {
    expect(tokensDeCalle("423")).toEqual([]);
  });
});

/**
 * Respuestas REALES de Mapbox (Geocoding v6), grabadas por el gestor el 2026-09-21 con el token real, desde su
 * máquina (10 de las 15 llamadas autorizadas) — no una ficha escrita a mano. Centro de contexto usado al grabar:
 * 22.1565,-100.9855 (bbox ±0.3°). Coordenadas y nombres tal cual llegaron.
 */
const CENTRO_GRABADO = { lat: 22.1565, lng: -100.9855 };
/** "Galeana 423, Centro" [bbox] — el primer intento real de hoy (textoDeBusqueda ya quita "S.L.P."). */
const RESPUESTA_REAL_PRIMER_INTENTO = [
  { nombre: "Calle Galeana 423", direccion: "Prolongación Galeana 423, 78397 San Luis Potosí, San Luis Potosí, México", lat: 22.099728, lng: -100.876178, ciudad: "San Luis Potosí" },
  { nombre: "Galeana 423", direccion: "Galeana 423, 78434 Soledad de Graciano Sánchez, San Luis Potosí, México", lat: 22.179007, lng: -100.928978, ciudad: "Soledad de Graciano Sánchez" },
  { nombre: "Prolongación Galeana", direccion: "Prolongación Galeana, 78397 San Luis Potosí, San Luis Potosí, México", lat: 22.097308, lng: -100.875817, ciudad: "San Luis Potosí" },
  { nombre: "Centro", direccion: "Centro, 78430, Soledad de Graciano Sánchez, San Luis Potosí, México", lat: 22.18772, lng: -100.937454, ciudad: "Soledad de Graciano Sánchez" },
  { nombre: "Centro", direccion: "Centro, 79540, Ville Zaragoza, Villa de Zaragoza, San Luis Potosí, México", lat: 22.035353, lng: -100.73066, ciudad: "Villa de Zaragoza" },
  { nombre: "Centro", direccion: "Centro, 78440, Cerro de San Pedro, San Luis Potosí, México", lat: 22.217157, lng: -100.80047, ciudad: "Cerro de San Pedro" },
];
/** "Galeana #423, Centro, S.L.P." [bbox], texto SIN limpiar — el bug de producción tal cual lo vio el founder. */
const RESPUESTA_REAL_TEXTO_SUCIO = [
  { nombre: "Galeana 423", direccion: "Galeana 423, 78434 Soledad de Graciano Sánchez, San Luis Potosí, México", lat: 22.179007, lng: -100.928978, ciudad: "Soledad de Graciano Sánchez" },
  { nombre: "Slp 8", direccion: "Camino Viejo a San Pedro, 78440 Cerro de San Pedro, San Luis Potosí, México", lat: 22.216776, lng: -100.800627, ciudad: "Cerro de San Pedro" },
  { nombre: "Slp 32", direccion: "Libramiento Oriente, 78394 San Luis Potosí, San Luis Potosí, México", lat: 22.131548, lng: -100.917157, ciudad: "San Luis Potosí" },
  { nombre: "Slp 32", direccion: "Libramiento Oriente, 78396 San Luis Potosí, San Luis Potosí, México", lat: 22.142786, lng: -100.916466, ciudad: "San Luis Potosí" },
  { nombre: "Slp 32", direccion: "Periférico Antonio Rocha Cordero, 78385 San Luis Potosí, San Luis Potosí, México", lat: 22.10692, lng: -100.943996, ciudad: "San Luis Potosí" },
  { nombre: "Slp 32", direccion: "Periférico Antonio Rocha Cordero, 78398 San Luis Potosí, San Luis Potosí, México", lat: 22.106985, lng: -100.943603, ciudad: "San Luis Potosí" },
];
/** "Hermenegildo Galeana 423" [bbox] — la buena SÍ existe en Mapbox, pero solo con el nombre completo de la calle. */
const RESPUESTA_REAL_NOMBRE_COMPLETO = [
  { nombre: "Calle Hermenegildo Galeana 423", direccion: "Calle Hermenegildo Galeana 423, 78000 San Luis Potosí, San Luis Potosí, México", lat: 22.14868, lng: -100.977492, ciudad: "San Luis Potosí" },
  { nombre: "Galeana 423", direccion: "Galeana 423, 78434 Soledad de Graciano Sánchez, San Luis Potosí, México", lat: 22.179007, lng: -100.928978, ciudad: "Soledad de Graciano Sánchez" },
  { nombre: "Calle Galeana 423", direccion: "Prolongación Galeana 423, 78397 San Luis Potosí, San Luis Potosí, México", lat: 22.099728, lng: -100.876178, ciudad: "San Luis Potosí" },
];

describe("filtrarYOrdenarDirecciones (revisión del gestor: sugerencias útiles, con respuestas reales de Mapbox)", () => {
  it("caso real de producción, texto sin limpiar (el bug tal cual): descarta los 4 'Slp' (ninguno trae 'galeana'), se queda solo con 'Galeana 423' de Soledad", () => {
    const r = filtrarYOrdenarDirecciones(RESPUESTA_REAL_TEXTO_SUCIO, "Galeana #423, Centro, S.L.P.", CENTRO_GRABADO, "San Luis Potosí");
    expect(r).toHaveLength(1);
    expect(r[0].direccion).toContain("Soledad de Graciano Sánchez");
  });

  it("primer intento de hoy ('Galeana 423, Centro', ya limpio): descarta las 3 colonias 'Centro' de otros municipios (sin 'galeana'); prioriza el municipio de contexto sobre lo más cercano", () => {
    const r = filtrarYOrdenarDirecciones(RESPUESTA_REAL_PRIMER_INTENTO, "Galeana 423, Centro", CENTRO_GRABADO, "San Luis Potosí");
    // Las 3 "Centro" a secas (Villa de Zaragoza, Cerro de San Pedro, y la de Soledad) no traen "galeana": fuera.
    expect(r).toHaveLength(3);
    expect(r.every((x) => x.direccion.toLowerCase().includes("galeana"))).toBe(true);
    // "Galeana 423" de Soledad está más cerca (6.3 km) que las dos de San Luis Potosí (12.9 km), pero el
    // municipio de contexto manda primero: las dos de San Luis Potosí van antes, aunque estén más lejos.
    expect(r[0].ciudad).toBe("San Luis Potosí");
    expect(r[1].ciudad).toBe("San Luis Potosí");
    expect(r[2].ciudad).toBe("Soledad de Graciano Sánchez");
    // De las dos de San Luis Potosí, la que trae el número (423) va primero.
    expect(r[0].nombre).toBe("Calle Galeana 423");
    // Ninguna de las tres es la dirección real del cartel (Hermenegildo Galeana 423): confirma el límite que
    // reportó el gestor — el filtro quita basura, pero no garantiza encontrar la calle exacta. De ahí la salida
    // "No es ninguna: pon el pin en el mapa" en la interfaz, siempre visible.
    expect(r.some((x) => x.lat === 22.14868)).toBe(false);
  });

  it("con el nombre completo de la calle (que el cartel no trae, pero confirma que el filtro no estorba cuando sí está la buena), la prioriza: mismo municipio, con número y la más cercana", () => {
    const r = filtrarYOrdenarDirecciones(RESPUESTA_REAL_NOMBRE_COMPLETO, "Hermenegildo Galeana 423", CENTRO_GRABADO, "San Luis Potosí");
    expect(r[0].lat).toBe(22.14868);
    expect(r[0].direccion).toContain("78000 San Luis Potosí");
  });

  it("sin ninguna palabra de calle en el texto (por ejemplo, solo se escribió un número), no descarta nada: ordena por cercanía", () => {
    const lejos = { lat: 21.93, lng: -99.99, nombre: "Rioverde", direccion: "Centro, Rioverde" };
    const cerca = { lat: 22.151, lng: -100.977, nombre: "Villerías", direccion: "Villerías 2, Centro" };
    expect(filtrarYOrdenarDirecciones([lejos, cerca], "423", CIUDAD_INICIAL.centro)).toEqual([cerca, lejos]);
  });

  it("recorta a 5 después de filtrar, no antes (revisión del gestor)", () => {
    const buenas = Array.from({ length: 7 }, (_, i) => ({ nombre: "Galeana", direccion: `Galeana ${i}, San Luis Potosí`, lat: 22.15 + i * 0.001, lng: -100.98, ciudad: "San Luis Potosí" }));
    expect(filtrarYOrdenarDirecciones(buenas, "Galeana", CIUDAD_INICIAL.centro)).toHaveLength(5);
  });
});

describe("descartarSinCalle: recorta a 5 después de filtrar, no antes", () => {
  it("con más de 5 resultados válidos, se queda con los primeros 5 (ya vienen ordenados por distancia de Mapbox)", () => {
    const buenos = Array.from({ length: 8 }, (_, i) => ({ nombre: "Cenaria Foro Expandido", direccion: `Galeana ${i}`, distanciaM: i * 10 }));
    expect(descartarSinCalle(buenos, "Cenaria")).toHaveLength(5);
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

  it("caso real del founder 'Galeana #423, Centro, S.L.P.', con la respuesta REAL de Mapbox del primer intento: hay algo dentro de 20 km (aunque no sea lo correcto), así que no hace falta reintento — el límite que reportó el gestor, no un error de esta función", async () => {
    const contexto = ciudadDeContexto({ texto: "Galeana #423, Centro, S.L.P." });
    expect(contexto.origen).toBe("texto");
    const llamadas: { texto: string; bbox: Bbox | undefined }[] = [];
    const buscar = vi.fn(async (texto: string, bbox: Bbox | undefined) => {
      llamadas.push({ texto, bbox });
      // Respuesta real (grabada por el gestor) al primer intento de hoy: ya filtrada y ordenada, como llegaría de
      // HojaDondeEs.tsx. Ninguna es la dirección correcta (Hermenegildo Galeana 423), pero la primera
      // ("Calle Galeana 423", municipio San Luis Potosí) cae a ~11.7 km del centro — dentro del radio de "cerca".
      return filtrarYOrdenarDirecciones(RESPUESTA_REAL_PRIMER_INTENTO, texto, contexto.centro, contexto.ciudad.nombre);
    });
    const r = await buscarConContexto("Galeana #423, Centro, S.L.P.", contexto, buscar, (rs) => necesitaReintento(rs, contexto.centro));
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].texto).toBe("Galeana 423, Centro");
    expect(r[0].nombre).toBe("Calle Galeana 423");
    expect(r[0].direccion).not.toContain("Hermenegildo"); // la dirección real del cartel no aparece: límite conocido de Mapbox
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
