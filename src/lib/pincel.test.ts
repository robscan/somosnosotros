import { describe, expect, it } from "vitest";
import {
  ANCHO_POR_GROSOR_PX,
  ARRASTRE_GROSOR_MAX_PX,
  decidirSensor,
  DIAMETRO_PUNTO_MIN_PX,
  diametroDelPunto,
  diametroDelPuntoDePosicion,
  entradasDesdePresencia,
  esMensajeBorrarValido,
  esMensajePosicionValido,
  esMensajeTrazoValido,
  esTintaClara,
  esPosicionValida,
  estaAjustandoGrosor,
  estadoDeFila,
  estaEncendido,
  GROSOR_BASE,
  GROSOR_MAX,
  GROSOR_MIN,
  grosorDesdeArrastre,
  intervaloMs,
  latenciasDe,
  MENSAJES_POR_SEGUNDO_PINTANDO,
  POSICIONES_POR_SEGUNDO,
  PRESUPUESTO_MENSAJES_POR_SEGUNDO,
  ritmoDeTrazo,
  SUAVIZADO_PUNTO_MS,
  muestrear,
  nombreSugerido,
  ordenDeFila,
  personasAqui,
  posicionDesdeOrientacion,
  puntoCentral,
  puntoEnPared,
  PUNTOS_MAX_POR_MENSAJE,
  quienesPintan,
  RANGO_GRADOS,
  siguientesSegmentos,
  textoDelSensor,
  TINTAS,
  UMBRAL_AJUSTE_PX,
  type EntradaPresencia,
} from "./pincel";

describe("pincel", () => {
  it("sugiere el nombre a partir del lugar", () => {
    expect(nombreSugerido("Centro de las Artes")).toBe("Pincel en Centro de las Artes");
  });
});

const REMITENTE = "00000000-0000-4000-8000-000000000001";

describe("esMensajeTrazoValido", () => {
  it("acepta un mensaje bien formado con una posición", () => {
    expect(esMensajeTrazoValido({ trazo: "spray", color: "#e4552f", puntos: [{ x: 0.4, y: -0.2 }], remitente: REMITENTE, grosor: 1 })).toBe(true);
  });
  it("acepta varias posiciones juntadas en un mismo mensaje (envío agrupado)", () => {
    const puntos = [
      { x: 0.1, y: 0.1 },
      { x: -0.2, y: 0.05 },
      { x: 0.05, y: -0.3 },
    ];
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos, remitente: REMITENTE, grosor: 1 })).toBe(true);
  });
  it("rechaza un trazo que no existe", () => {
    expect(esMensajeTrazoValido({ trazo: "acuarela", color: "#141414", puntos: [{ x: 0, y: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza un color que no es una de las seis tintas", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#123456", puntos: [{ x: 0, y: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza un mensaje sin posiciones", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos: [], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it(`rechaza más de ${PUNTOS_MAX_POR_MENSAJE} posiciones en un mismo mensaje`, () => {
    const puntos = Array.from({ length: PUNTOS_MAX_POR_MENSAJE + 1 }, () => ({ x: 0, y: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos, remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it(`acepta justo ${PUNTOS_MAX_POR_MENSAJE} posiciones`, () => {
    const puntos = Array.from({ length: PUNTOS_MAX_POR_MENSAJE }, () => ({ x: 0, y: 0 }));
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos, remitente: REMITENTE, grosor: 1 })).toBe(true);
  });
  it("rechaza una posición fuera de -1..1 (no es una coordenada en píxeles)", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos: [{ x: 42, y: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza una posición no numérica", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos: [{ x: "0.5", y: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza puntos que no es un arreglo", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos: { x: 0, y: 0 }, remitente: REMITENTE, grosor: 1 })).toBe(false);
  });
  it("rechaza sin remitente", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos: [{ x: 0, y: 0 }], grosor: 1 })).toBe(false);
  });
  it("rechaza un remitente vacío", () => {
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#141414", puntos: [{ x: 0, y: 0 }], remitente: "", grosor: 1 })).toBe(false);
  });
  it("rechaza cualquier cosa que no sea un objeto", () => {
    expect(esMensajeTrazoValido(null)).toBe(false);
    expect(esMensajeTrazoValido("trazo")).toBe(false);
    expect(esMensajeTrazoValido(undefined)).toBe(false);
  });
  it("rechaza sin grosor, o con un grosor no numérico, cero, negativo o descomunal", () => {
    const base = { trazo: "trazo" as const, color: "#141414", puntos: [{ x: 0, y: 0 }], remitente: REMITENTE };
    expect(esMensajeTrazoValido(base)).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: "1" })).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: 0 })).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: -1 })).toBe(false);
    expect(esMensajeTrazoValido({ ...base, grosor: 999 })).toBe(false);
  });
  it("acepta el grosor mínimo y máximo que puede dar el arrastre", () => {
    const base = { trazo: "trazo" as const, color: "#141414", puntos: [{ x: 0, y: 0 }], remitente: REMITENTE };
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

// OL-120 (founder en producción, 2026-09-22): «Solo estoy pintando en un sector de la pantalla» y «al subir
// teléfono pinta para abajo». El mando manda la posición normalizada respecto a un cero; un rango cómodo de
// muñeca (RANGO_GRADOS: ±30° horizontal, ±20° vertical) recorre la pared entera, con tope en los bordes.
describe("posicionDesdeOrientacion", () => {
  const cero = { beta: 45, gamma: 0 }; // el teléfono como un control remoto, al encender
  it("sin cero, o con una lectura incompleta, no hay posición", () => {
    expect(posicionDesdeOrientacion(null, { beta: 10, gamma: 5 })).toBeNull();
    expect(posicionDesdeOrientacion({ beta: null, gamma: 5 }, { beta: 10, gamma: 5 })).toBeNull();
    expect(posicionDesdeOrientacion(cero, { beta: 10, gamma: null })).toBeNull();
  });
  it("0° respecto al cero → el centro de la pared, sin -0", () => {
    expect(posicionDesdeOrientacion(cero, cero)).toEqual({ x: 0, y: 0 });
  });
  it("el rango es una constante con nombre: ±30° horizontal, ±20° vertical", () => {
    expect(RANGO_GRADOS).toEqual({ horizontal: 30, vertical: 20 });
  });
  it("+20° hacia arriba (beta sube) → borde SUPERIOR (y = -1): subir el teléfono sube el pincel", () => {
    expect(posicionDesdeOrientacion(cero, { beta: 65, gamma: 0 })).toEqual({ x: 0, y: -1 });
  });
  it("-20° hacia abajo (beta baja) → borde inferior (y = +1)", () => {
    expect(posicionDesdeOrientacion(cero, { beta: 25, gamma: 0 })).toEqual({ x: 0, y: 1 });
  });
  it("-30° a la izquierda (gamma baja) → borde izquierdo (x = -1); +30° → derecho: el horizontal no va invertido", () => {
    expect(posicionDesdeOrientacion(cero, { beta: 45, gamma: -30 })).toEqual({ x: -1, y: 0 });
    expect(posicionDesdeOrientacion(cero, { beta: 45, gamma: 30 })).toEqual({ x: 1, y: 0 });
  });
  it("a medio camino, medio recorrido, cada eje por su lado y sin zona muerta", () => {
    expect(posicionDesdeOrientacion(cero, { beta: 55, gamma: 15 })).toEqual({ x: 0.5, y: -0.5 });
    expect(posicionDesdeOrientacion(cero, { beta: 44, gamma: 0.3 })).toEqual({ x: 0.01, y: 0.05 });
  });
  it("más allá del rango se queda en el borde (tope), no se sale ni da la vuelta", () => {
    expect(posicionDesdeOrientacion(cero, { beta: 120, gamma: 80 })).toEqual({ x: 1, y: -1 });
    expect(posicionDesdeOrientacion(cero, { beta: -40, gamma: -80 })).toEqual({ x: -1, y: 1 });
  });
  it("el cero puede ser cualquier postura: lo que cuenta es la diferencia", () => {
    expect(posicionDesdeOrientacion({ beta: 80, gamma: -20 }, { beta: 70, gamma: -5 })).toEqual({ x: 0.5, y: 0.5 });
  });
  it("con otro rango, otra escala", () => {
    expect(posicionDesdeOrientacion(cero, { beta: 55, gamma: 10 }, { horizontal: 10, vertical: 10 })).toEqual({ x: 1, y: -1 });
  });
});

describe("esPosicionValida", () => {
  it("dos números finitos en -1..1; nada más", () => {
    expect(esPosicionValida({ x: 0, y: 0 })).toBe(true);
    expect(esPosicionValida({ x: -1, y: 1 })).toBe(true);
    expect(esPosicionValida({ x: 1.01, y: 0 })).toBe(false);
    expect(esPosicionValida({ x: "0", y: 0 })).toBe(false);
    expect(esPosicionValida({ x: NaN, y: 0 })).toBe(false);
    expect(esPosicionValida(null)).toBe(false);
  });
});

describe("puntoEnPared", () => {
  it("(-1,-1) es la esquina superior izquierda, (0,0) el centro, (1,1) la inferior derecha", () => {
    expect(puntoEnPared({ x: -1, y: -1 }, 1280, 800)).toEqual({ x: 0, y: 0 });
    expect(puntoEnPared({ x: 0, y: 0 }, 1280, 800)).toEqual({ x: 640, y: 400 });
    expect(puntoCentral(1280, 800)).toEqual({ x: 640, y: 400 });
    expect(puntoEnPared({ x: 1, y: 1 }, 1280, 800)).toEqual({ x: 1280, y: 800 });
  });
  it("el horizontal recorre el ancho y el vertical el alto, cada uno por su lado (relación de aspecto)", () => {
    expect(puntoEnPared({ x: 0.5, y: -0.5 }, 1280, 800)).toEqual({ x: 960, y: 200 });
    expect(puntoEnPared({ x: 0.5, y: -0.5 }, 1920, 1080)).toEqual({ x: 1440, y: 270 });
  });
});

describe("siguientesSegmentos", () => {
  it("una posición da un segmento desde donde estaba hasta ahí, en píxeles de la pared", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 100, y: 100 }, [{ x: 0, y: 0 }], 800, 600);
    expect(segmentos).toEqual([[{ x: 100, y: 100 }, { x: 400, y: 300 }]]);
    expect(hasta).toEqual({ x: 400, y: 300 });
  });
  it("varias posiciones encadenan los segmentos, cada uno desde donde terminó el anterior", () => {
    const { segmentos, hasta } = siguientesSegmentos({ x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 1, y: 1 }], 800, 600);
    expect(segmentos).toHaveLength(2);
    expect(segmentos[1][0]).toEqual(segmentos[0][1]);
    expect(hasta).toEqual({ x: 800, y: 600 });
  });
  it("el primer mensaje de alguien (sin punto anterior) arranca en su primera posición: un segmento de largo cero", () => {
    const { segmentos, hasta } = siguientesSegmentos(null, [{ x: -1, y: 0 }, { x: -0.5, y: 0 }], 800, 600);
    expect(segmentos[0]).toEqual([{ x: 0, y: 300 }, { x: 0, y: 300 }]);
    expect(segmentos[1]).toEqual([{ x: 0, y: 300 }, { x: 200, y: 300 }]);
    expect(hasta).toEqual({ x: 200, y: 300 });
  });
  it("sin posiciones no da segmentos y el punto no se mueve", () => {
    expect(siguientesSegmentos({ x: 50, y: 50 }, [], 800, 600)).toEqual({ segmentos: [], hasta: { x: 50, y: 50 } });
    expect(siguientesSegmentos(null, [], 800, 600)).toEqual({ segmentos: [], hasta: null });
  });
});

describe("muestrear", () => {
  const muchas = Array.from({ length: 40 }, (_, i) => i);
  it("con el tope o menos, van todas tal cual", () => {
    expect(muestrear([1, 2, 3], 20)).toEqual([1, 2, 3]);
    expect(muestrear(muchas.slice(0, 20), 20)).toHaveLength(20);
  });
  it("con más, se quedan `max` repartidas por igual, en orden, con la primera y siempre la última", () => {
    const pocas = muestrear(muchas, PUNTOS_MAX_POR_MENSAJE);
    expect(pocas).toHaveLength(PUNTOS_MAX_POR_MENSAJE);
    expect(pocas[0]).toBe(0);
    expect(pocas[pocas.length - 1]).toBe(39);
    expect([...pocas].sort((a, b) => a - b)).toEqual(pocas);
    expect(new Set(pocas).size).toBe(pocas.length);
  });
  it("con tope 1 se queda la última (donde está el pincel); con tope 0, nada", () => {
    expect(muestrear(muchas, 1)).toEqual([39]);
    expect(muestrear(muchas, 0)).toEqual([]);
  });
});

describe("presupuesto de mensajes (OL-126, gestor)", () => {
  it("pintando, 6 por segundo con el cupo de 10 (10 × 6 = 60/s); con 20 mandos baja solo a 5/s (100/s)", () => {
    expect(MENSAJES_POR_SEGUNDO_PINTANDO).toBe(6);
    expect(ritmoDeTrazo(10)).toBe(6);
    expect(ritmoDeTrazo(1)).toBe(6);
    expect(ritmoDeTrazo(16)).toBe(6);
    expect(ritmoDeTrazo(17)).toBe(5);
    expect(ritmoDeTrazo(20)).toBe(5);
    expect(10 * ritmoDeTrazo(10)).toBeLessThanOrEqual(60);
    for (let cupo = 1; cupo <= 20; cupo++) expect(cupo * ritmoDeTrazo(cupo)).toBeLessThanOrEqual(PRESUPUESTO_MENSAJES_POR_SEGUNDO);
  });
  it("sin pintar, la posición va a 2 por segundo; el punto tenue se suaviza en 120 ms como mucho", () => {
    expect(POSICIONES_POR_SEGUNDO).toBe(2);
    expect(SUAVIZADO_PUNTO_MS).toBeLessThanOrEqual(120);
  });
  it("intervalo en ms a partir del ritmo, nunca división por cero", () => {
    expect(intervaloMs(6)).toBe(167);
    expect(intervaloMs(5)).toBe(200);
    expect(intervaloMs(2)).toBe(500);
    expect(intervaloMs(0)).toBe(1000);
  });
});

describe("latenciasDe (OL-126)", () => {
  it("con marcas del mando: agrupación (muestra→envío), red (envío→recepción), dibujo y total (muestra→dibujo)", () => {
    const l = latenciasDe({ muestra: 1000, enviado: 1040 }, 1075, 1077);
    expect(l).toEqual({ agrupacionMs: 40, redMs: 35, dibujoMs: 2, totalMs: 77 });
  });
  it("sin marcas (un cliente viejo): solo el dibujo se puede medir", () => {
    expect(latenciasDe({}, 1075, 1076)).toEqual({ agrupacionMs: null, redMs: null, dibujoMs: 1, totalMs: null });
  });
  it("solo con envío: red y total desde el envío; la agrupación no se sabe", () => {
    expect(latenciasDe({ enviado: 1040 }, 1075, 1075)).toEqual({ agrupacionMs: null, redMs: 35, dibujoMs: 0, totalMs: 35 });
  });
  it("un reloj adelantado en el mando puede dar red negativa (se enseña tal cual); agrupación y dibujo nunca bajan de 0", () => {
    const l = latenciasDe({ muestra: 1050, enviado: 1040 }, 1030, 1029);
    expect(l.redMs).toBe(-10);
    expect(l.agrupacionMs).toBe(0);
    expect(l.dibujoMs).toBe(0);
  });
});

describe("marcas de tiempo opcionales en los mensajes (OL-126)", () => {
  const trazo = { trazo: "trazo", color: "#141414", puntos: [{ x: 0, y: 0 }], remitente: REMITENTE, grosor: 1 };
  const posicion = { remitente: REMITENTE, trazo: "trazo", color: "#141414", grosor: 1, posicion: { x: 0, y: 0 } };
  it("sin marcas siguen siendo válidos; con marcas numéricas también", () => {
    expect(esMensajeTrazoValido(trazo)).toBe(true);
    expect(esMensajeTrazoValido({ ...trazo, enviado: 1700000000000, muestra: 1699999999990 })).toBe(true);
    expect(esMensajePosicionValido(posicion)).toBe(true);
    expect(esMensajePosicionValido({ ...posicion, enviado: 1700000000000 })).toBe(true);
  });
  it("una marca que no es un número finito invalida el mensaje", () => {
    expect(esMensajeTrazoValido({ ...trazo, enviado: "ahora" })).toBe(false);
    expect(esMensajeTrazoValido({ ...trazo, muestra: NaN })).toBe(false);
    expect(esMensajePosicionValido({ ...posicion, muestra: null })).toBe(false);
  });
});

describe("estaEncendido", () => {
  it("encendido = sensor concedido; cualquier otro estado, apagado", () => {
    expect(estaEncendido({ tipo: "concedido" })).toBe(true);
    expect(estaEncendido({ tipo: "sin-pedir" })).toBe(false);
    expect(estaEncendido({ tipo: "pidiendo" })).toBe(false);
    expect(estaEncendido({ tipo: "negado", detalle: "x" })).toBe(false);
    expect(estaEncendido({ tipo: "sin-soporte", detalle: "x" })).toBe(false);
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
  it("apagado (antes de pedirlo y mientras se pide): «Enciende el control para comenzar» — dos textos, uno por estado (OL-120)", () => {
    expect(textoDelSensor({ tipo: "sin-pedir" }, false)).toEqual({ texto: "Enciende el control para comenzar", esAviso: false, abrirEnSafari: false });
    expect(textoDelSensor({ tipo: "pidiendo" }, true)?.texto).toBe("Enciende el control para comenzar");
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

// OL-120: el punto de referencia en la pared (evento `posicion`, distinto de `trazo`).
describe("esMensajePosicionValido", () => {
  const base = { remitente: "persona-1", trazo: "trazo", color: "#141414", grosor: 1, posicion: { x: 0, y: 0 } };
  it("acepta un «aquí estoy» (el centro) y cualquier posición en -1..1", () => {
    expect(esMensajePosicionValido(base)).toBe(true);
    expect(esMensajePosicionValido({ ...base, posicion: { x: -1, y: 0.4 } })).toBe(true);
  });
  it("rechaza lo que no trae la forma exacta: sin posición, posición fuera, trazo o tinta desconocidos, grosor fuera", () => {
    const { posicion: _p, ...sinPosicion } = base;
    void _p;
    expect(esMensajePosicionValido(sinPosicion)).toBe(false);
    expect(esMensajePosicionValido({ ...base, posicion: { x: 2, y: 0 } })).toBe(false);
    expect(esMensajePosicionValido({ ...base, posicion: [0, 0] })).toBe(false);
    expect(esMensajePosicionValido({ ...base, trazo: "brocha" })).toBe(false);
    expect(esMensajePosicionValido({ ...base, color: "#123456" })).toBe(false);
    expect(esMensajePosicionValido({ ...base, grosor: GROSOR_MAX + 1 })).toBe(false);
    expect(esMensajePosicionValido({ ...base, remitente: "" })).toBe(false);
    expect(esMensajePosicionValido(null)).toBe(false);
  });
});

describe("diametroDelPuntoDePosicion", () => {
  it("mide el ancho real del trazo en la pared, nunca menos de 8 px", () => {
    expect(DIAMETRO_PUNTO_MIN_PX).toBe(8);
    expect(diametroDelPuntoDePosicion("trazo", 1)).toBe(8); // 3 px de trazo: se ve de 8
    expect(diametroDelPuntoDePosicion("trazo", GROSOR_MAX)).toBeCloseTo(3 * GROSOR_MAX); // 10.5
    expect(diametroDelPuntoDePosicion("aire", 1)).toBe(9);
    expect(diametroDelPuntoDePosicion("organico", GROSOR_MIN)).toBe(9);
    expect(diametroDelPuntoDePosicion("spray", 1)).toBe(8);
  });
  it("acota el grosor al rango del pincel", () => {
    expect(diametroDelPuntoDePosicion("aire", 100)).toBe(ANCHO_POR_GROSOR_PX.aire * GROSOR_MAX);
    expect(diametroDelPuntoDePosicion("aire", 0)).toBe(8); // 9 × 0.5 = 4.5 → mínimo
  });
});

// OL-126 (founder): tinta Blanco y «Borrar la pared».
describe("tinta Blanco y esTintaClara", () => {
  it("Blanco es la sexta tinta, válida en los mensajes", () => {
    expect(TINTAS.map((t) => t.etiqueta)).toEqual(["Negro", "Cempasúchil", "Verde", "Violeta", "Sol", "Blanco"]);
    expect(esMensajeTrazoValido({ trazo: "trazo", color: "#ffffff", puntos: [{ x: 0, y: 0 }], remitente: REMITENTE, grosor: 1 })).toBe(true);
  });
  it("solo Blanco es «clara»: necesita borde o fondo para verse sobre casi blanco", () => {
    expect(esTintaClara("#ffffff")).toBe(true);
    expect(esTintaClara("#FFFFFF")).toBe(true);
    for (const t of TINTAS.filter((t) => t.etiqueta !== "Blanco")) expect(esTintaClara(t.valor)).toBe(false);
    expect(esTintaClara("blanco")).toBe(false);
  });
});

describe("esMensajeBorrarValido", () => {
  it("remitente no vacío, marca de envío opcional", () => {
    expect(esMensajeBorrarValido({ remitente: REMITENTE })).toBe(true);
    expect(esMensajeBorrarValido({ remitente: REMITENTE, enviado: 1700000000000 })).toBe(true);
    expect(esMensajeBorrarValido({ remitente: "" })).toBe(false);
    expect(esMensajeBorrarValido({ remitente: REMITENTE, enviado: "ahora" })).toBe(false);
    expect(esMensajeBorrarValido(null)).toBe(false);
  });
});
