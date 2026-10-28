import { describe, expect, it } from "vitest";
import { textoDeFacebook } from "../facebook/texto";
import {
  armarTexto,
  artistasDe,
  cuandoDelTexto,
  etiquetasDeLaFoto,
  etiquetasQueNoCaben,
  INVITACION,
  precioDeActos,
  precioDelTexto,
  revisarTexto,
  TOPE_CARACTERES,
  yaDice,
  type ActoIg,
  type ArtistaIg,
  type EventoIg,
} from "./texto";

/**
 * OL-463 (bitácora 495): un festival en Instagram y Facebook. El founder publicó «Cultura Mística» (un marco con 11 actos) y «no se etiquetan a
 * todos los artistas. Además el festival se publicó como gratis pero hay diferentes precios en cada evento». Sus artistas son los del marco y los
 * de sus actos sin repetir; su precio sale de sus actos; su programa va después de 📍 y se recorta para caber.
 */
const ahora = new Date("2026-10-03T17:00:00Z"); // sábado 3 de octubre, 11:00 en San Luis Potosí
const z = "America/Mexico_City";
const art = (nombre: string, usuario: string | null, id = nombre): ArtistaIg => ({ id, nombre, usuario, disciplina: null });
const martha = art("Martha Franco", "marthafranco.mx");
const gustono = art("Gustoño", null);
const luna = art("Luna Arcana", "luna.arcana");
const organiza = art("Colectivo Mística", "colectivo.mistica");
/** Viernes 9, sábado 10 y domingo 11 de octubre (hora de San Luis: UTC−6). */
const acto = (titulo: string, inicio: string, precio: string | null, artistas: ArtistaIg[]): ActoIg => ({ titulo, inicio, fin: null, precio, artistas });
const actos: ActoIg[] = [
  acto("Meditación con Martha Franco", "2026-10-09T23:30:00Z", "Gratis", [martha]),
  acto("Taller de escritura", "2026-10-10T00:30:00Z", "$80", [gustono]),
  acto("Charla de tarot", "2026-10-10T03:00:00Z", "$130", [luna]),
  acto("Círculo de sonido", "2026-10-10T23:00:00Z", "Gratis", [martha, luna]),
];
const mistica: EventoIg = {
  titulo: "Cultura Mística",
  inicio: "2026-10-09T23:30:00Z",
  fin: "2026-10-11T05:59:00Z",
  zona: z,
  clase: "festival",
  precio: null,
  lugar: { nombre: "Aether", usuario: "aether.slp" },
  ciudad: "San Luis Potosí",
  artistas: [organiza],
  opcional: true,
  actos,
};

describe("artistas de un festival", () => {
  it("los del marco y los de todos sus actos, sin repetir; primero los que tienen Instagram", () => {
    expect(artistasDe(mistica).map((a) => a.nombre)).toEqual(["Colectivo Mística", "Martha Franco", "Luna Arcana", "Gustoño"]);
    expect(etiquetasDeLaFoto(mistica)).toEqual(["aether.slp", "colectivo.mistica", "marthafranco.mx", "luna.arcana"]);
  });
  it("un evento suelto sigue con los suyos", () => {
    expect(artistasDe({ artistas: [gustono] })).toEqual([gustono]);
  });
  it("hasta 20 etiquetas: primero los de más actos; los demás quedan fuera y se dice cuántos", () => {
    const muchos = Array.from({ length: 25 }, (_, i) => art(`Artista ${i}`, `artista${i}`));
    // El 24 sale en tres actos y el 23 en dos: entran aunque aparezcan al final del programa.
    const festival: EventoIg = {
      ...mistica,
      actos: [
        ...muchos.map((a, i) => acto(`Acto ${i}`, `2026-10-${String(9 + (i % 3)).padStart(2, "0")}T2${i % 4}:00:00Z`, "$50", [a])),
        acto("Cierre", "2026-10-11T03:00:00Z", "$50", [muchos[24], muchos[23]]),
        acto("Otro cierre", "2026-10-11T04:00:00Z", "$50", [muchos[24]]),
      ],
    };
    const etiquetas = etiquetasDeLaFoto(festival);
    expect(etiquetas).toHaveLength(20);
    expect(etiquetas.slice(0, 4)).toEqual(["aether.slp", "colectivo.mistica", "artista24", "artista23"]);
    expect(etiquetasQueNoCaben(festival)).toBe(7); // 1 lugar + 1 marco + 25 = 27 cuentas
    // El texto no pasa de 20 menciones (la invitación lleva una) ni repite ninguna.
    const t = armarTexto(festival, ahora);
    const r = revisarTexto(t);
    expect(r.problema).toBeNull();
    expect(r.menciones).toBe(20);
    const menciones = t.match(/@[A-Za-z0-9._]+/g) ?? [];
    expect(new Set(menciones).size).toBe(menciones.length);
  });
});

describe("precio de un festival", () => {
  it("nunca «Gratis» por omisión: sale de sus actos", () => {
    expect(precioDelTexto(mistica)).toBe("Entrada libre · actividades con cooperación ($80–$130)");
    expect(armarTexto(mistica, ahora)).not.toContain("Gratis");
  });
  it("todos gratis → «Entrada libre»; todos con costo → el rango; uno solo → su precio", () => {
    expect(precioDeActos(["Gratis", "Entrada libre"])).toBe("Entrada libre");
    expect(precioDeActos(["$80", "$130", "$100"])).toBe("$80–$130");
    expect(precioDeActos(["$80", "$80"])).toBe("$80");
    expect(precioDeActos(["$120 a $250", "$1,200"])).toBe("$120–$1,200");
    expect(precioDeActos(["Cooperación solidaria", "Cooperación solidaria"])).toBe("Cooperación solidaria");
    expect(precioDeActos(["Gratis", "Cooperación solidaria"])).toBe("Entrada libre · actividades con cooperación");
  });
  it("lo que no se sabe no se inventa: actos por confirmar y ninguno que cobre → nada", () => {
    expect(precioDeActos(["Gratis", null])).toBeNull();
    expect(precioDeActos([null, "Por confirmar"])).toBeNull();
    expect(precioDeActos([null, "$80"])).toBe("Actividades con cooperación ($80)");
    expect(precioDelTexto({ ...mistica, actos: [] })).toBeNull();
  });
  it("el precio del marco manda; si dice que la entrada es libre y hay actos que cobran, se dice", () => {
    expect(precioDelTexto({ ...mistica, precio: "$200 el abono" })).toBe("$200 el abono");
    expect(precioDelTexto({ ...mistica, precio: "Gratis" })).toBe("Entrada libre · actividades con cooperación ($80–$130)");
    expect(precioDelTexto({ ...mistica, precio: "Gratis", actos: [acto("A", "2026-10-09T23:30:00Z", null, [])] })).toBe("Gratis");
  });
  it("exposición, taller, acto o inauguración sin precio: nada; un evento suelto sin precio: «Gratis»", () => {
    expect(precioDelTexto({ precio: null, clase: "exposicion" })).toBeNull();
    expect(precioDelTexto({ precio: null, clase: "puntual", opcional: true })).toBeNull();
    expect(precioDelTexto({ precio: "Por confirmar", clase: "puntual" })).toBeNull();
    expect(precioDelTexto({ precio: "$300", clase: "taller" })).toBe("$300");
    expect(precioDelTexto({ precio: null, clase: "puntual" })).toBe("Gratis");
    expect(precioDelTexto({ precio: "Entrada libre", clase: "exposicion" })).toBe("Entrada libre");
  });
});

describe("programa en el texto", () => {
  it("después de 📍 y el precio, por día con su hora, el acto y su artista con @ (una vez)", () => {
    expect(armarTexto(mistica, ahora)).toBe(
      [
        "Cultura Mística\nDel 9 al 10 de oct\n📍 Aether @aether.slp · San Luis Potosí\nEntrada libre · actividades con cooperación ($80–$130)",
        "Vie 9 · 5:30 pm Meditación con Martha Franco @marthafranco.mx · 6:30 pm Taller de escritura con Gustoño · 9:00 pm Charla de tarot con @luna.arcana\nSáb 10 · 5:00 pm Círculo de sonido con Martha Franco y Luna Arcana",
        "Con @colectivo.mistica",
        INVITACION,
        "#SanLuisPotosi #AgendaCultural #Festival #SomosNosotrxs",
      ].join("\n\n"),
    );
  });
  it("en curso: solo lo que falta", () => {
    const t = armarTexto(mistica, new Date("2026-10-10T18:00:00Z"));
    expect(t).not.toContain("Meditación");
    expect(t).toContain("Sáb 10 · 5:00 pm Círculo de sonido con @marthafranco.mx y @luna.arcana");
  });
  it("quitar una etiqueta quita su mención en el programa", () => {
    const t = armarTexto(mistica, ahora, ["luna.arcana"]);
    expect(t).toContain("9:00 pm Charla de tarot con Luna Arcana");
    expect(t).not.toContain("@luna.arcana");
  });
  it("si no cabe en 2 200: títulos cortos y luego «y N actividades más»; la invitación y las etiquetas siempre van", () => {
    const largo = (i: number) => `Cultura Mística: ${["Meditación", "Taller", "Charla", "Círculo"][i % 4]} ${i}, una experiencia larga con muchas palabras para llenar el texto`;
    const festival: EventoIg = { ...mistica, actos: Array.from({ length: 90 }, (_, i) => acto(largo(i), `2026-10-${String(9 + (i % 3)).padStart(2, "0")}T${String(14 + (i % 10)).padStart(2, "0")}:00:00Z`, "$80", [gustono])) };
    const t = armarTexto(festival, ahora);
    expect([...t].length).toBeLessThanOrEqual(TOPE_CARACTERES);
    expect(t).toMatch(/\ny \d+ actividades más\n/);
    expect(t).not.toContain("Cultura Mística: ");
    expect(t).toContain("Meditación 0 con Gustoño");
    expect(t).toContain(INVITACION);
    expect(t.endsWith("#SanLuisPotosi #AgendaCultural #Festival #SomosNosotrxs")).toBe(true);
    expect(revisarTexto(t).problema).toBeNull();
  });
  it("con títulos cortos ya cabe: no se quita ninguna actividad", () => {
    const largo = (i: number) => `Acto ${i}: ${"palabras que sobran ".repeat(4)}`;
    const festival: EventoIg = { ...mistica, actos: Array.from({ length: 20 }, (_, i) => acto(largo(i), `2026-10-09T${String(14 + (i % 10)).padStart(2, "0")}:${String(i).padStart(2, "0")}:00Z`, "$80", [])) };
    const t = armarTexto(festival, ahora);
    expect([...t].length).toBeLessThanOrEqual(TOPE_CARACTERES);
    expect(t).not.toContain("actividades más");
    expect(t).toContain("Acto 19");
  });
  it("un acto con funciones sale en cada día", () => {
    const t = armarTexto({ ...mistica, actos: [{ ...actos[1], sesiones: [{ inicio: "2026-10-10T00:30:00Z", fin: null }, { inicio: "2026-10-11T00:30:00Z", fin: null }] }] }, ahora);
    expect(t).toContain("Vie 9 · 6:30 pm Taller de escritura con Gustoño\nSáb 10 · 6:30 pm Taller de escritura con Gustoño");
  });
});

describe("Facebook de un festival", () => {
  it("sin @ y sin repetir el nombre que ya dice el título", () => {
    const fb = textoDeFacebook(armarTexto(mistica, ahora), mistica, "https://somosnosotrxs.org/eventos/cultura-mistica");
    expect(fb).not.toMatch(/@[a-z]/);
    expect(fb).toContain("5:30 pm Meditación con Martha Franco · 6:30 pm Taller de escritura con Gustoño · 9:00 pm Charla de tarot con Luna Arcana");
    expect(fb).toContain("📍 Aether · San Luis Potosí");
    expect(fb).toContain("Con Colectivo Mística");
  });
});

describe("cuándo de lo que tiene sesiones", () => {
  it("un taller dice sus sesiones, no un rango que parece diario", () => {
    const sesiones = [
      { inicio: "2026-10-06T23:00:00Z", fin: "2026-10-07T01:00:00Z" },
      { inicio: "2026-10-08T23:00:00Z", fin: "2026-10-09T01:00:00Z" },
      { inicio: "2026-10-10T23:00:00Z", fin: "2026-10-11T01:00:00Z" },
    ];
    const taller = { inicio: sesiones[0].inicio, fin: sesiones[2].fin, zona: z, clase: "taller", sesiones };
    expect(cuandoDelTexto(taller, ahora)).toBe("3 sesiones: mar 6, jue 8 y sáb 10 de oct · 5:00–7:00 pm");
    expect(cuandoDelTexto(taller, new Date("2026-10-07T12:00:00Z"))).toBe("Quedan 2 sesiones: jue 8 y sáb 10 de oct · 5:00–7:00 pm");
    const distintas = [sesiones[0], { inicio: "2026-10-09T00:00:00Z", fin: "2026-10-09T02:00:00Z" }];
    expect(cuandoDelTexto({ ...taller, sesiones: distintas }, ahora)).toBe("2 sesiones: mar 6 · 5:00–7:00 pm y jue 8 de oct · 6:00–8:00 pm");
  });
  it("una exposición sigue con su periodo", () => {
    expect(cuandoDelTexto({ inicio: "2026-10-02T06:00:00Z", fin: "2027-02-13T05:59:00Z", zona: z, clase: "exposicion", sesiones: [] }, ahora)).toBe("Hasta el vie 12 de feb de 2027");
  });
});

describe("yaDice", () => {
  it("palabras enteras, sin acentos ni @", () => {
    expect(yaDice("Meditación con Martha Franco", "martha franco")).toBe(true);
    expect(yaDice("Mañana de cuentos", "Ana")).toBe(false);
    expect(yaDice("Con @pimpolina.clown y", "Pimpolina")).toBe(false);
    expect(yaDice("Danza con Gustoño", "Gustono")).toBe(true);
  });
});
