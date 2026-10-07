import { describe, expect, it } from "vitest";
import { AHORA_CASOS, CASOS } from "./casos";
import { armarTextos, enlaceCorto, limpiarTexto, MAXIMOS, nombresVisibles, partirTitulo, recortar, textoArtistas, textoEtiqueta, textoPrecio, tramoDeTitulo } from "./datos";
import { ajustar, ajustarRenglon, anchoTexto, partirRenglones } from "./medir";

describe("textoPrecio", () => {
  it("sin precio (o «gratis» escrito a mano) dice «Entrada libre»: nunca «gratis»", () => {
    for (const p of [null, "", "Gratis", "gratuito", "Entrada libre", "Sin costo"]) expect(textoPrecio(p)).toBe("Entrada libre");
  });
  it("cooperación: la del formulario tal cual; otra, con su texto", () => {
    expect(textoPrecio("Cooperación solidaria")).toBe("Cooperación solidaria");
    expect(textoPrecio("Cooperación voluntaria")).toBe("Cooperación voluntaria");
  });
  it("con costo: el texto de quien publicó, con su tope de 24", () => {
    expect(textoPrecio("$150")).toBe("$150");
    const largo = textoPrecio("$300 por las tres sesiones, materiales incluidos");
    expect([...largo].length).toBeLessThanOrEqual(MAXIMOS.precio);
    expect(largo.endsWith("…")).toBe(true);
  });
});

describe("tramos y máximos", () => {
  it("corto hasta 25, medio hasta 50, largo de ahí en adelante", () => {
    expect(tramoDeTitulo("a".repeat(25))).toBe("corto");
    expect(tramoDeTitulo("a".repeat(26))).toBe("medio");
    expect(tramoDeTitulo("a".repeat(50))).toBe("medio");
    expect(tramoDeTitulo("a".repeat(51))).toBe("largo");
  });
  it("recortar: en el último espacio y con «…»; lo que cabe no se toca", () => {
    expect(recortar("Hola", 10)).toBe("Hola");
    const r = recortar("Inauguración de la exposición colectiva de cerámica", 30);
    expect([...r].length).toBeLessThanOrEqual(30);
    expect(r).toBe("Inauguración de la exposición…");
  });
  it("el título de 107 caracteres se corta a 80 y avisa", () => {
    const t = armarTextos(CASOS.maximo, null, AHORA_CASOS);
    expect([...t.titulo].length).toBeLessThanOrEqual(MAXIMOS.titulo);
    expect(t.tituloRecortado).toBe(true);
    expect(t.tramo).toBe("largo");
  });
  it("un título propio («Acortar título») manda y no se parte", () => {
    const t = armarTextos(CASOS.maximo, "LXS COLOCAOS: la última fogueada", AHORA_CASOS);
    expect(t.titulo).toBe("LXS COLOCAOS: la última fogueada");
    expect(t.subtitulo).toBeNull();
    expect(t.tituloRecortado).toBe(false);
  });
  it("ocho artistas como mucho y «y N más»", () => {
    const a = textoArtistas(CASOS.maximo.artistas);
    expect(a.nombres).toHaveLength(8);
    expect(a.mas).toBe(2);
    expect(nombresVisibles(a, 2)).toBe("Paulina Lucciotto, Marilú Juárez y 8 más");
    expect(nombresVisibles({ nombres: ["Ana", "Luis"], mas: 0 }, 3)).toBe("Ana y Luis");
    expect(nombresVisibles({ nombres: [], mas: 0 }, 3)).toBe("");
  });
});

describe("partirTitulo", () => {
  it("parte en los dos puntos cuando la primera parte es un título", () => {
    expect(partirTitulo("Sangre de Coyote: Semilla que florece el barrio")).toEqual({ titulo: "Sangre de Coyote", subtitulo: "Semilla que florece el barrio" });
  });
  it("también parte en una raya o un guion entre espacios, no en el guion de una palabra", () => {
    expect(partirTitulo("Master Class - 9° Festival de Cine UASLP")).toEqual({ titulo: "Master Class", subtitulo: "9° Festival de Cine UASLP" });
    expect(partirTitulo("Concierto de música afro-latina").subtitulo).toBeNull();
  });
  it("no parte una etiqueta corta («Charla:») ni un título sin dos partes", () => {
    expect(partirTitulo("Charla: San Luis Potosí en la Cristiada").subtitulo).toBeNull();
    expect(partirTitulo("Noche de son huasteco").subtitulo).toBeNull();
  });
});

describe("armarTextos", () => {
  it("fecha y hora en formato fijo, la dirección corta y la etiqueta del artista", () => {
    const t = armarTextos(CASOS.corto, null, AHORA_CASOS);
    expect(t.dia).toBe("Viernes 16 de octubre");
    expect(t.diaCorto).toBe("Vie 16 oct");
    expect(t.hora).toBe("19:00 h");
    expect(t.fecha).toEqual({ numero: "16", mes: "OCT" });
    expect(t.etiqueta).toBe("Son huasteco");
    expect(t.precio).toBe("Entrada libre");
  });
  it("horario por día: el rango con el mes completo y «Horario por día»", () => {
    const t = armarTextos(CASOS.precioLargo, null, AHORA_CASOS);
    expect(t.dia).toBe("Del 16 al 20 de octubre");
    expect(t.hora).toBe("Horario por día");
  });
  it("sin artistas no hay etiqueta; el sitio se corta a 60", () => {
    expect(armarTextos(CASOS.sinNada, null, AHORA_CASOS).etiqueta).toBeNull();
    expect(textoEtiqueta([{ nombre: "X", disciplina: "por_completar", detalle: null }])).toBeNull();
    expect([...(armarTextos({ ...CASOS.corto, sitio: "x ".repeat(50) }, null, AHORA_CASOS).sitio ?? "")].length).toBeLessThanOrEqual(MAXIMOS.lugar);
  });
  it("quita lo que la fuente no dibuja (emojis) y los espacios de más", () => {
    expect(limpiarTexto("Fiesta 🎉  de   barrio")).toBe("Fiesta de barrio");
    expect(enlaceCorto("oca")).toBe("somosnosotros.org/e/oca");
  });
});

/** Un instante a partir de la hora de San Luis Potosí (UTC−6, sin horario de verano). */
const local = (fechaHora: string) => new Date(`${fechaHora}:00-06:00`).toISOString();

describe("fechas del cartel (OL-336)", () => {
  it("un fin a las 00:00 es el final del día anterior: «Ciclo Fellini» del 9 al 14, no al 15 (la regla de la ficha)", () => {
    const t = armarTextos(CASOS.variosDias, null, AHORA_CASOS);
    expect(t.dia).toBe("Del 9 al 14 de octubre");
    expect(t.diaCorto).toBe("Vie 9 oct – Mié 14 oct");
    expect(t.fecha).toEqual({ numero: "9–14", mes: "OCT" });
    // Acaba con su último día: la hora es la de inicio, sin «–00:00».
    expect(t.hora).toBe("10:00 h");
  });
  it("un fin a las 00:00 del día siguiente de un evento de una noche sigue siendo un solo día", () => {
    const t = armarTextos({ ...CASOS.corto, inicio: local("2026-10-14T20:00"), fin: local("2026-10-15T00:00") }, null, AHORA_CASOS);
    expect(t.dia).toBe("Miércoles 14 de octubre");
    expect(t.fecha.numero).toBe("14");
  });
  it("de un mes a otro, con el mes de cada día", () => {
    const t = armarTextos({ ...CASOS.variosDias, inicio: local("2026-10-30T18:00"), fin: local("2026-11-03T00:00") }, null, AHORA_CASOS);
    expect(t.dia).toBe("Del 30 de octubre al 2 de noviembre");
    expect(t.fecha).toEqual({ numero: "30–2", mes: "OCT–NOV" });
  });
  it("festival: solo el mes y el año, sin hora", () => {
    const t = armarTextos(CASOS.festival, null, AHORA_CASOS);
    expect(t.dia).toBe("Octubre 2026");
    expect(t.diaCorto).toBe("Oct 2026");
    expect(t.fecha).toEqual({ numero: "OCT", mes: "2026" });
    expect(t.hora).toBeNull();
  });
  it("exposición de dos meses: «Octubre – Noviembre 2026»; un fin a las 00:00 del 1 de noviembre no suma noviembre", () => {
    const expo = { ...CASOS.festival, clase: "exposicion" as const, inicio: local("2026-10-20T00:00"), fin: local("2026-11-30T23:59") };
    const t = armarTextos(expo, null, AHORA_CASOS);
    expect(t.dia).toBe("Octubre – Noviembre 2026");
    expect(t.diaCorto).toBe("Oct – Nov 2026");
    expect(t.fecha).toEqual({ numero: "OCT–NOV", mes: "2026" });
    expect(t.hora).toBeNull();
    expect(armarTextos({ ...expo, fin: local("2026-11-01T00:00") }, null, AHORA_CASOS).dia).toBe("Octubre 2026");
  });
  it("de un año a otro, cada mes con su año", () => {
    const t = armarTextos({ ...CASOS.festival, inicio: local("2026-12-12T10:00"), fin: local("2027-01-10T23:59") }, null, AHORA_CASOS);
    expect(t.dia).toBe("Diciembre 2026 – Enero 2027");
    expect(t.fecha).toEqual({ numero: "DIC–ENE", mes: "2026–2027" });
  });
  it("un taller sigue igual: sus días y «Horario por día»", () => {
    const t = armarTextos({ ...CASOS.precioLargo, clase: "taller" }, null, AHORA_CASOS);
    expect(t.dia).toBe("Del 16 al 20 de octubre");
    expect(t.hora).toBe("Horario por día");
  });
});

describe("medir", () => {
  it("el ancho crece con el tamaño y con el espacio entre letras", () => {
    const a = anchoTexto("Hola", "regular", 20);
    expect(anchoTexto("Hola", "regular", 40)).toBeCloseTo(a * 2, 5);
    expect(anchoTexto("Hola", "regular", 20, 2)).toBeCloseTo(a + 8, 5);
    expect(anchoTexto("HOLA", "condensada-negra", 40)).toBeLessThan(anchoTexto("HOLA", "ancha-negra", 40));
  });
  it("parte por palabras y avisa si una palabra sola no cabe", () => {
    const { renglones, sobra } = partirRenglones("uno dos tres cuatro", anchoTexto("uno dos", "regular", 30) + 1, { fuente: "regular", tamano: 30 });
    expect(renglones).toEqual(["uno dos", "tres", "cuatro"]);
    expect(sobra).toBe(false);
    expect(partirRenglones("Otorrinolaringólogo", 50, { fuente: "regular", tamano: 30 }).sobra).toBe(true);
  });
  it("ajustar: el tamaño mayor que cabe en los renglones y el alto", () => {
    const caja = { fuente: "ancha-negra" as const, ancho: 600, renglones: 2, mayor: 200, menor: 40 };
    const a = ajustar("Noche de son huasteco", caja);
    expect(a.recortado).toBe(false);
    expect(a.renglones.length).toBeLessThanOrEqual(2);
    for (const r of a.renglones) expect(anchoTexto(r, "ancha-negra", a.tamano)).toBeLessThanOrEqual(600);
    const bajo = ajustar("Noche de son huasteco", { ...caja, renglones: 4, alto: 100, interlineado: 1 });
    expect(bajo.renglones.length * bajo.tamano).toBeLessThanOrEqual(100);
  });
  it("si no cabe ni al mínimo, corta con «…» y avisa", () => {
    const a = ajustar("Una frase bastante larga que no puede caber en un solo renglón angosto", { fuente: "regular", ancho: 200, renglones: 1, mayor: 30, menor: 28 });
    expect(a.recortado).toBe(true);
    expect(a.renglones).toHaveLength(1);
    expect(a.renglones[0].endsWith("…")).toBe(true);
    expect(anchoTexto(a.renglones[0], "regular", 28)).toBeLessThanOrEqual(200);
  });
  it("renglones parejos: el último no queda con una palabra sola si se puede evitar", () => {
    const a = ajustar("Delirium Pollum, clown y pantomima con Pimpolina", { fuente: "ancha-negra", ancho: 900, renglones: 3, mayor: 120, menor: 120, parejo: true });
    const largos = a.renglones.map((r) => r.length);
    expect(Math.max(...largos) - Math.min(...largos)).toBeLessThan(20);
  });
  it("ajustarRenglon con mayúsculas mide en mayúsculas", () => {
    expect(ajustarRenglon("entrada libre", { fuente: "media", ancho: 1000, mayor: 24, menor: 18, mayusculas: true }).renglones[0]).toBe("ENTRADA LIBRE");
  });
});
