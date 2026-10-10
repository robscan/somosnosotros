import { describe, expect, it } from "vitest";
import { sedesDeFestival, type ActoConSitio } from "./sedesFestival";
import { esSlugDeSitio, eventosDelSitio, eventosParaLigar, hrefSitio, slugDeSitio, slugDelEvento, textoLigados, type EventoParaLigar } from "./sitios";

/** La ficha de un sitio fuera del directorio (OL-348): su slug, qué eventos lo nombran y cómo se arma con ellos (como una sede de festival). */

const SLP = "San Luis Potosí";
const enSitio = (inicio: string, sitio_texto: string, extra: Partial<ActoConSitio> = {}): ActoConSitio => ({ inicio, lugar_id: null, lugar: null, sitio_texto, ciudad: SLP, ...extra });

describe("slugDeSitio", () => {
  it("sale del nombre sin acentos, mayúsculas ni signos, con su ciudad detrás", () => {
    expect(slugDeSitio("Jardín de San Juan de Dios", SLP)).toBe("jardin-de-san-juan-de-dios-san-luis-potosi");
    expect(slugDeSitio("  ¡Plaza  de Armas!  ", "Querétaro")).toBe("plaza-de-armas-queretaro");
  });
  it("sin ciudad, solo el nombre; si el nombre ya termina con ella (o es ella), no se repite", () => {
    expect(slugDeSitio("Jardín de San Juan de Dios")).toBe("jardin-de-san-juan-de-dios");
    expect(slugDeSitio("Centro de las Artes San Luis Potosí", SLP)).toBe("centro-de-las-artes-san-luis-potosi");
    expect(slugDeSitio("San Luis Potosí", SLP)).toBe("san-luis-potosi");
  });
  it("un nombre sin letras ni números no da slug", () => {
    expect(slugDeSitio("¡¡!!", SLP)).toBe("");
  });
});

describe("hrefSitio", () => {
  it("un sitio fuera del directorio y público abre su ficha", () => {
    expect(hrefSitio({ lugar_id: null, sitio_texto: "Jardín de San Juan de Dios", ciudad: SLP })).toBe("/sitios/jardin-de-san-juan-de-dios-san-luis-potosi");
  });
  it("un lugar del directorio (tiene la suya), un sitio reservado (su dirección no se publica), sin sitio o sin letras: ninguna", () => {
    expect(hrefSitio({ lugar_id: "abc", sitio_texto: null })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: "Casa de Lu", sitio_reservado: true })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: null })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: "  " })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: "¡¡!!" })).toBeNull();
  });
});

describe("la ficha se arma con los eventos que nombran el sitio", () => {
  const eventos = [
    enSitio("2026-10-17T01:00:00Z", "Jardín de San Juan de Dios", { sitio_lat: 22.1511, sitio_lng: -100.9772 }),
    enSitio("2026-10-18T01:00:00Z", "jardin de san juan de dios", { sitio_direccion: "Calle Madero 1", sitio_lat: 22.1512, sitio_lng: -100.9771 }),
    enSitio("2026-10-19T01:00:00Z", "Jardín de San Juan de Dios", { ciudad: "Querétaro", sitio_lat: 20.59, sitio_lng: -100.39 }),
    enSitio("2026-10-20T01:00:00Z", "Jardín de San Juan de Dios", { sitio_reservado: true }),
    { inicio: "2026-10-21T01:00:00Z", lugar_id: "paz", lugar: { nombre: "Jardín de San Juan de Dios" }, sitio_texto: null, ciudad: SLP },
  ];
  const slug = slugDelEvento(eventos[0])!;

  it("el mismo nombre escrito distinto es el mismo sitio; en otra ciudad, otro; un reservado o un lugar del directorio no entran", () => {
    expect(eventosDelSitio(eventos, slug)).toEqual([eventos[0], eventos[1]]);
    expect(eventosDelSitio(eventos, slugDelEvento(eventos[2])!)).toEqual([eventos[2]]);
    expect(eventosDelSitio(eventos, "no-existe")).toEqual([]);
  });

  it("como una sede de festival: el nombre del primero, la dirección y el punto del primero que los diga, cuántos eventos y su ficha", () => {
    const [sede, ...otras] = sedesDeFestival(eventosDelSitio(eventos, slug));
    expect(otras).toEqual([]);
    expect(sede).toMatchObject({ nombre: "Jardín de San Juan de Dios", lugar: null, direccion: "Calle Madero 1", punto: { lat: 22.1511, lng: -100.9772 }, actos: 2, href: `/sitios/${slug}` });
  });
});

/** OL-366: al agregar un sitio al directorio, sus eventos pasan al lugar. Qué eventos se piden ligar y cómo se dice cuántos pasaron. */
describe("esSlugDeSitio", () => {
  it("la clave que arma `slugDeSitio`, y nada más", () => {
    expect(esSlugDeSitio(slugDeSitio("Jardín de San Juan de Dios", SLP))).toBe(true);
    expect(esSlugDeSitio("bar-el-33")).toBe(true);
    for (const malo of ["", "Jardin", "jardín", "-jardin", "jardin-", "jardin--de", "jardin de", "../lugares", "a".repeat(241), null, 7]) expect(esSlugDeSitio(malo)).toBe(false);
  });
});

describe("eventosParaLigar", () => {
  const ANA = "ana";
  const MARCOS = "marcos";
  const sitio = (id: string, extra: Partial<EventoParaLigar> = {}): EventoParaLigar => ({ id, lugar_id: null, sitio_texto: "Bar La Oficina", ciudad: SLP, creado_por: ANA, clase: "puntual", sitio_lat: 22.15, sitio_lng: -100.98, ...extra });
  const eventos = [
    sitio("propio"),
    sitio("escrito-distinto", { sitio_texto: "bar la oficina" }),
    sitio("de-marcos", { creado_por: MARCOS }),
    sitio("sin-autor", { creado_por: null }),
    sitio("marco", { clase: "festival" }),
    sitio("sin-punto", { sitio_lat: null, sitio_lng: null }),
    sitio("medio-punto", { sitio_lng: null }),
    sitio("reservado", { sitio_reservado: true }),
    sitio("con-lugar", { lugar_id: "lugar-1" }),
    sitio("otra-ciudad", { ciudad: "Querétaro" }),
    sitio("otro-sitio", { sitio_texto: "Café Paz" }),
  ];
  const slug = slugDeSitio("Bar La Oficina", SLP);

  it("quien registra el lugar: solo los suyos del sitio (el mismo nombre escrito distinto también), con punto y sin ser el marco de un festival", () => {
    expect(eventosParaLigar(eventos, slug, { id: ANA, esAdmin: false })).toEqual(["propio", "escrito-distinto"]);
    expect(eventosParaLigar(eventos, slug, { id: MARCOS, esAdmin: false })).toEqual(["de-marcos"]);
  });

  it("la administración: todos los del sitio, también los de otras personas y los que se quedaron sin autor", () => {
    expect(eventosParaLigar(eventos, slug, { id: "admin", esAdmin: true })).toEqual(["propio", "escrito-distinto", "de-marcos", "sin-autor"]);
  });

  it("nunca un sitio reservado, uno que ya tiene lugar, el de otra ciudad u otro sitio; con otro slug, nada", () => {
    const todos = eventosParaLigar(eventos, slug, { id: "admin", esAdmin: true });
    for (const fuera of ["reservado", "con-lugar", "otra-ciudad", "otro-sitio", "marco", "sin-punto", "medio-punto"]) expect(todos).not.toContain(fuera);
    expect(eventosParaLigar(eventos, "no-existe", { id: "admin", esAdmin: true })).toEqual([]);
  });
});

describe("textoLigados", () => {
  it("dice cuántos eventos pasaron al lugar", () => {
    expect(textoLigados(0)).toBe("Ningún evento ligado");
    expect(textoLigados(1)).toBe("1 evento ligado");
    expect(textoLigados(4)).toBe("4 eventos ligados");
  });
});
