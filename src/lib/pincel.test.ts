import { describe, expect, it } from "vitest";
import {
  ARRASTRE_GROSOR_MAX_PX,
  DELTAS_MAX_POR_MENSAJE,
  deltaDesdeOrientacion,
  diametroDelPunto,
  entradasDesdePresencia,
  esMensajeTrazoValido,
  ESCALA_DELTA_PX,
  estaAjustandoGrosor,
  estadoDeFila,
  GROSOR_BASE,
  GROSOR_MAX,
  GROSOR_MIN,
  grosorDesdeArrastre,
  nombreSugerido,
  ordenDeFila,
  puntoInicial,
  quienesPintan,
  siguientesSegmentos,
  UMBRAL_AJUSTE_PX,
  decidirSensor,
  personasAqui,
  textoDelSensor,
  type EntradaPresencia,
} from "./pincel";

describe("pincel", () => {
  it("sugiere el nombre a partir del lugar", () => {
    expect(nombreSugerido("Centro de las Artes")).toBe("Pincel en Centro de las Artes");
  });
});

const REMITENTE = "00000000-0000-4000-8000-000000000001";

describe("esMensajeTrazoValido", () => {
  it("acepta un mensaje bien formado con un delta", () => {
    expect(esMensajeTrazoValido({ trazo: "spray", color: "#e4552f", deltas: [{ dx: 0.4, dy: -0.2 }], remitente: REMITENTE, grosor: 1 })).toBe(true);
  });
  it("acepta varios deltas juntados en un mismo mensaje (envío agrupado)", () => {
    const deltas = [
      { dx: 0.1, dy: 0.1 },
      { dx: -0.2, dy: 0.05 },
      { dx: 0.05, dy: -0.3 },
    ];
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas, remitente: REMITENTE, grosor: 1 })).toBe(true);
  });
  it("rechaza un trazo que no existe", () => {
    expect(esMensajeTrazoValido({ trazo: "acuarela", color: "#141414", deltas: [{ dx: 0, dy: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza un color que no es una de las cinco tintas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#ffffff", deltas: [{ dx: 0, dy: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza un mensaje sin deltas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it(`rechaza más de ${DELTAS_MAX_POR_MENSAJE} deltas en un mismo mensaje`, () => {
    const deltas = Array.from({ length: DELTAS_MAX_POR_MENSAJE + 1 }, () => ({ dx: 0, dy: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas, remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it(`acepta justo ${DELTAS_MAX_POR_MENSAJE} deltas`, () => {
    const deltas = Array.from({ length: DELTAS_MAX_POR_MENSAJE }, () => ({ dx: 0, dy: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas, remitente: REMITENTE, grosor: 1 })).toBe(true);
  });
  it("rechaza un delta fuera de -1..1 (no es una coordenada absoluta)", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: 42, dy: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza un delta no numérico", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: "0.5", dy: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza deltas que no es un arreglo", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: { dx: 0, dy: 0 }, remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza sin remitente", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: 0, dy: 0 }], grosor: 1 })).toBe(false);
  });
  it("rechaza un remitente vacío", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", deltas: [{ dx: 0, dy: 0 }], remitente: "", grosor: 1 })).toBe(false);
  });
  it("rechaza cualquier cosa que no sea un objeto", () => {
    expect(esMensajeTrazoValido(null)).toBe(false);
    expect(esMensajeTrazoValido("trazo")).toBe(false);
    expect(esMensajeTrazoValido(undefined)).toBe(false);
  });
  it("rechaza sin grosor, o con un grosor no numérico, cero, negativo o descomunal", () => {
    const base = { trazo: "trazo" as const, color: "#141414", deltas: [{ dx: 0, dy: 0 }], remitente: REMITENTE };
    expect(esMensajeTrazoValido(base)).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: "1" })).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: 0 })).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: -1 })).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: 999 })).toBe(false);
  });
  it("acepta el grosor mínimo y máximo que puede dar el arrastre", () => {
    const base = { trazo: "trazo" as const, color: "#141414", deltas: [{ dx: 0, dy: 0 }], remitente: REMITENTE };
    expect(esMensajeTrazoValido({ ...base, grosor: GROSOR_MIN })).toBe(true);
    expect(esMensajeTrazoValido({ ...base, grosor: GROSOR_MAX })).toBe(true);
  });
});

describe("grosorDesdeArrastre", () => {
  it("sin arrastre, el grosor base", () => {
    expect(grosorDesdeArrastre(0)).toBe(GROSOR_BASE);
  });
  it("arrastrar hacia arriba (delta positivo) engruesa, hasta el máximo", () => {
    expect(grosorDesdeArrastre(ARRASTRE_GROSOR_MAX_PX / 2)).toBeCloseTo(GROSOR_BASE + (GROSOR_MAX - GROSOR_BASE) / 2);
    expect(grosorDesdeArrastre(ARRASTRE_GROSOR_MAX_PX)).toBeCloseTo(GROSOR_MAX);
  });
  it("arrastrar hacia abajo (delta negativo) adelgaza, hasta el mínimo", () => {
    expect(grosorDesdeArrastre(-ARRASTRE_GROSOR_MAX_PX / 2)).toBeCloseTo(GROSOR_BASE - (GROSOR_BASE - GROSOR_MIN) / 2);
    expect(grosorDesdeArrastre(-ARRASTRE_GROSOR_MAX_PX)).toBeCloseTo(GROSOR_MIN);
  });
  it("un arrastre más allá del máximo se acota, no sigue creciendo", () => {
    expect(grosorDesdeArrastre(ARRASTRE_GROSOR_MAX_PX * 5)).toBeCloseTo(GROSOR_MAX);
    expect(grosorDesdeArrastre(-ARRASTRE_GROSOR_MAX_PX * 5)).toBeCloseTo(GROSOR_MIN);
  });
  it("el grosor se queda al soltar: la siguiente pulsación sigue desde el grosor que tenía, no desde el base", () => {
    expect(grosorDesdeArrastre(0, 1.6)).toBe(1.6);
    // desde 1.6, bajar el arrastre completo resta lo que va del base al mínimo (GROSOR_BASE - GROSOR_MIN)
    expect(grosorDesdeArrastre(-ARRASTRE_GROSOR_MAX_PX, 1.6)).toBeCloseTo(1.6 - (GROSOR_BASE - GROSOR_MIN));
  });
  it("desde un grosor alto, subir se acota en el tope en vez de pasarse", () => {
    expect(grosorDesdeArrastre(ARRASTRE_GROSOR_MAX_PX, 2.0)).toBeCloseTo(GROSOR_MAX);
  });
});

describe("estaAjustandoGrosor", () => {
  it("el temblor del dedo bajo el umbral no cuenta como ajuste: se sigue pintando", () => {
    expect(estaAjustandoGrosor(0)).toBe(false);
    expect(estaAjustandoGrosor(UMBRAL_AJUSTE_PX)).toBe(false);
    expect(estaAjustandoGrosor(-UMBRAL_AJUSTE_PX)).toBe(false);
  });
  it("pasado el umbral, en cualquier sentido, se está ajustando (y no se manda trazo)", () => {
    expect(estaAjustandoGrosor(UMBRAL_AJUSTE_PX + 1)).toBe(true);
    expect(estaAjustandoGrosor(-(UMBRAL_AJUSTE_PX + 1))).toBe(true);
  });
});

describe("diametroDelPunto", () => {
  it("mide el grosor a escala del mando: 16 px en el base, 8 en el mínimo, 56 en el tope (lo que pidió el gestor)", () => {
    expect(diametroDelPunto(GROSOR_BASE)).toBe(16);
    expect(diametroDelPunto(GROSOR_MIN)).toBe(8);
    expect(diametroDelPunto(GROSOR_MAX)).toBe(56);
  });
  it("cambia de forma continua: a medio camino del base al tope, a medio camino de 16 a 56", () => {
    expect(diametroDelPunto((GROSOR_BASE + GROSOR_MAX) / 2)).toBeCloseTo(36);
  });
  it("un grosor fuera del rango (un mensaje raro) se acota al mínimo o al tope, no rompe el punto", () => {
    expect(diametroDelPunto(0)).toBe(8);
    expect(diametroDelPunto(99)).toBe(56);
  });
});

describe("puntoInicial", () => {
  it("da siempre el mismo punto para el mismo remitente", () => {
    const a = puntoInicial(REMITENTE, 800, 600);
    const b = puntoInicial(REMITENTE, 800, 600);
    expect(a).toEqual(b);
  });
  it("da puntos distintos para remitentes distintos (normalmente)", () => {
    const a = puntoInicial("00000000-0000-4000-8000-000000000001", 800, 600);
    const b = puntoInicial("00000000-0000-4000-8000-000000000002", 800, 600);
    expect(a).not.toEqual(b);
  });
  it("nunca da un punto fuera del lienzo", () => {
    const p = puntoInicial(REMITENTE, 390, 844);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(390);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(844);
  });
});

describe("siguientesSegmentos", () => {
  it("un delta da un segmento, moviéndose ESCALA_DELTA_PX por unidad de delta", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 100, y: 100 }, [{ dx: 1, dy: 0 }], 800, 600);
    expect(segmentos).toHaveLength(1);
    expect(segmentos[0][0]).toEqual({ x: 100, y: 100 });
    expect(hasta).toEqual({ x: 100 + ESCALA_DELTA_PX, y: 100 });
  });
  it("varios deltas encadenan los segmentos, cada uno desde donde terminó el anterior", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 0, y: 0 }, [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }], 800, 600);
    expect(segmentos).toHaveLength(2);
    expect(segmentos[1][0]).toEqual(segmentos[0][1]);
    expect(hasta).toEqual(segmentos[1][1]);
  });
  it("rebota en el borde derecho en vez de salirse del lienzo", () => {
    const { hasta } = siguientesSegmentos({ x: 790, y: 0 }, [{ dx: 1, dy: 0 }], 800, 600);
    // 790 + 24 = 814, 14 de más -> rebota: 800 - 14 = 786
    expect(hasta.x).toBe(786);
    expect(hasta.x).toBeLessThanOrEqual(800);
  });
  it("rebota en el borde izquierdo/superior (cero) igual que en el derecho/inferior", () => {
    const { hasta } = siguientesSegmentos({ x: 5, y: 5 }, [{ dx: -1, dy: -1 }], 800, 600);
    expect(hasta.x).toBeGreaterThanOrEqual(0);
    expect(hasta.y).toBeGreaterThanOrEqual(0);
  });
  it("sin deltas no da segmentos y el punto no se mueve", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 50, y: 50 }, [], 800, 600);
    expect(segmentos).toEqual([]);
    expect(hasta).toEqual({ x: 50, y: 50 });
  });
});

describe("deltaDesdeOrientacion", () => {
  it("sin lectura anterior, no hay delta que mandar", () => {
    expect(deltaDesdeOrientacion(null, { beta: 10, gamma: 5 })).toEqual({ dx: 0, dy: 0 });
  });
  it("si a cualquiera de las dos le falta un valor, tampoco hay delta", () => {
    expect(deltaDesdeOrientacion({ beta: null, gamma: 5 }, { beta: 10, gamma: 5 })).toEqual({ dx: 0, dy: 0 });
    expect(deltaDesdeOrientacion({ beta: 5, gamma: 5 }, { beta: 10, gamma: null })).toEqual({ dx: 0, dy: 0 });
  });
  it("un cambio de gamma mueve dx, un cambio de beta mueve dy", () => {
    const d = deltaDesdeOrientacion({ beta: 0, gamma: 0 }, { beta: 3, gamma: 6 }, 6);
    expect(d.dx).toBeCloseTo(1); // 6 grados de gamma con sensibilidad 6 -> delta 1
    expect(d.dy).toBeCloseTo(0.5); // 3 grados de beta con sensibilidad 6 -> delta 0.5
  });
  it("un cambio grande se acota a -1..1, no se manda como si fuera una coordenada absoluta", () => {
    const d = deltaDesdeOrientacion({ beta: 0, gamma: 0 }, { beta: 90, gamma: -90 }, 6);
    expect(d.dx).toBe(-1);
    expect(d.dy).toBe(1);
  });
  it("sin cambio, delta cero", () => {
    expect(deltaDesdeOrientacion({ beta: 12, gamma: -8 }, { beta: 12, gamma: -8 })).toEqual({ dx: 0, dy: 0 });
  });
});

describe("entradasDesdePresencia", () => {
  it("saca remitente/llegada/presenceRef de cada clave de presencia, ignorando lo que no trae la forma esperada", () => {
    const estado = {
      "clave-1": [{ remitente: "persona-1", llegada: 10, presence_ref: "ref-1" }],
      "clave-2": [{ remitente: "persona-2", llegada: 5, presence_ref: "ref-2" }, { presence_ref: "ref-3" }],
      "clave-3": [{ remitente: "", llegada: 1, presence_ref: "ref-4" }],
    };
    expect(entradasDesdePresencia(estado)).toEqual([
      { remitente: "persona-1", llegada: 10, presenceRef: "ref-1" },
      { remitente: "persona-2", llegada: 5, presenceRef: "ref-2" },
    ]);
  });
  it("sin ninguna clave, ninguna entrada", () => {
    expect(entradasDesdePresencia({})).toEqual([]);
  });
});

describe("ordenDeFila", () => {
  it("ordena por hora de llegada", () => {
    const entradas: EntradaPresencia[] = [
      { remitente: "b", llegada: 20, presenceRef: "1" },
      { remitente: "a", llegada: 10, presenceRef: "2" },
    ];
    expect(ordenDeFila(entradas).map((e) => e.remitente)).toEqual(["a", "b"]);
  });
  it("con la misma hora, desempata por presenceRef", () => {
    const entradas: EntradaPresencia[] = [
      { remitente: "b", llegada: 10, presenceRef: "zzz" },
      { remitente: "a", llegada: 10, presenceRef: "aaa" },
    ];
    expect(ordenDeFila(entradas).map((e) => e.remitente)).toEqual(["a", "b"]);
  });
  it("no muta el arreglo original", () => {
    const entradas: EntradaPresencia[] = [{ remitente: "b", llegada: 2, presenceRef: "1" }, { remitente: "a", llegada: 1, presenceRef: "2" }];
    const copia = [...entradas];
    ordenDeFila(entradas);
    expect(entradas).toEqual(copia);
  });
});

describe("quienesPintan", () => {
  const entradas: EntradaPresencia[] = [
    { remitente: "a", llegada: 1, presenceRef: "1" },
    { remitente: "b", llegada: 2, presenceRef: "2" },
    { remitente: "c", llegada: 3, presenceRef: "3" },
  ];
  it("con cupo para todos, todos pintan", () => {
    expect(quienesPintan(entradas, 10)).toEqual(new Set(["a", "b", "c"]));
  });
  it("con cupo justo para los primeros que llegaron", () => {
    expect(quienesPintan(entradas, 2)).toEqual(new Set(["a", "b"]));
  });
  it("cupo cero, nadie pinta", () => {
    expect(quienesPintan(entradas, 0)).toEqual(new Set());
  });
});

describe("estadoDeFila", () => {
  const entradas: EntradaPresencia[] = [
    { remitente: "a", llegada: 1, presenceRef: "1" },
    { remitente: "b", llegada: 2, presenceRef: "2" },
    { remitente: "c", llegada: 3, presenceRef: "3" },
    { remitente: "d", llegada: 4, presenceRef: "4" },
  ];
  it("dentro del cupo, pintando", () => {
    expect(estadoDeFila(entradas, 2, "a")).toEqual({ tipo: "pintando" });
    expect(estadoDeFila(entradas, 2, "b")).toEqual({ tipo: "pintando" });
  });
  it("fuera del cupo, su lugar en la fila y cuántos esperan en total", () => {
    expect(estadoDeFila(entradas, 2, "c")).toEqual({ tipo: "esperando", lugar: 1, esperando: 2 });
    expect(estadoDeFila(entradas, 2, "d")).toEqual({ tipo: "esperando", lugar: 2, esperando: 2 });
  });
  it("un remitente sin trackear todavía (antes del primer sync)", () => {
    expect(estadoDeFila(entradas, 2, "nadie")).toEqual({ tipo: "fuera" });
  });
});

describe("personasAqui", () => {
  it("singular con una, plural con el resto (OL-117: salía «1 personas aquí»)", () => {
    expect(personasAqui(1)).toBe("1 persona aquí");
    expect(personasAqui(2)).toBe("2 personas aquí");
    expect(personasAqui(0)).toBe("0 personas aquí");
  });
});

describe("decidirSensor (OL-117)", () => {
  it("sin el constructor, de verdad no hay sensor", () => {
    expect(decidirSensor({ caso: "sin-constructor" })).toEqual({ tipo: "sin-soporte", detalle: "sin DeviceOrientationEvent" });
  });
  it("sin requestPermission (Android, Chrome) se lee directo: concedido", () => {
    expect(decidirSensor({ caso: "sin-request-permission" })).toEqual({ tipo: "concedido" });
  });
  it("respuesta granted concede; denied (explícito) niega y lo anota", () => {
    expect(decidirSensor({ caso: "respuesta", valor: "granted" })).toEqual({ tipo: "concedido" });
    expect(decidirSensor({ caso: "respuesta", valor: "denied" })).toEqual({ tipo: "negado", detalle: "respuesta denied" });
  });
  it("un rechazo (NotAllowedError: gesto no válido o permiso negado antes) es NEGADO, no «sin soporte» — el error del iPhone del founder", () => {
    const s = decidirSensor({ caso: "error", nombre: "NotAllowedError", mensaje: "Requesting device orientation access requires a user gesture to prompt" });
    expect(s.tipo).toBe("negado");
    expect(s.tipo === "negado" && s.detalle).toContain("NotAllowedError");
    expect(decidirSensor({ caso: "error", nombre: "TypeError", mensaje: "" })).toEqual({ tipo: "negado", detalle: "TypeError" });
  });
});

describe("textoDelSensor (OL-117)", () => {
  it("concedido: sin texto propio, manda el de pintar", () => {
    expect(textoDelSensor({ tipo: "concedido" }, false)).toBeNull();
  });
  it("antes de pedirlo, invita a tocar el punto; mientras se pide, lo dice", () => {
    expect(textoDelSensor({ tipo: "sin-pedir" }, false)).toEqual({ texto: "Toca el punto para activar el sensor", esAviso: false, abrirEnSafari: false });
    expect(textoDelSensor({ tipo: "pidiendo" }, true)?.texto).toBe("Activando el sensor…");
  });
  it("negado en Safari: la ruta de Ajustes; negado en la app instalada: abrir en Safari, con botón", () => {
    const safari = textoDelSensor({ tipo: "negado", detalle: "x" }, false);
    expect(safari?.esAviso).toBe(true);
    expect(safari?.abrirEnSafari).toBe(false);
    expect(safari?.texto).toContain("Ajustes → Apps → Safari → Movimiento y orientación");
    const instalada = textoDelSensor({ tipo: "negado", detalle: "x" }, true);
    expect(instalada).toEqual({ texto: "En la app instalada el iPhone no deja usar el sensor. Abre este enlace en Safari.", esAviso: true, abrirEnSafari: true });
  });
  it("sin soporte: el único caso en que se dice que no hay sensor", () => {
    expect(textoDelSensor({ tipo: "sin-soporte", detalle: "x" }, false)).toEqual({ texto: "Este navegador no tiene sensor de movimiento.", esAviso: true, abrirEnSafari: false });
  });
});
