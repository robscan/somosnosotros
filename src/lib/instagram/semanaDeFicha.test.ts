import { describe, expect, it } from "vitest";
import { PORTADA } from "./carrusel";
import { textoArtista, textoDeDestacado, textoLugar, type ArtistaDestacado, type LugarDestacado } from "./destacado";
import { bloqueDeLaSemana, carruselDeFicha, lineaDelCarrusel, obrasDeFilas, obrasDeLaSemana, renglonDeObra, tituloNormalizado, TOPE_EVENTOS_FICHA, ventanaDeLaSemana, type EventoDeFicha, type FilaDeFicha } from "./semanaDeFicha";
import { revisarTexto, TOPE_CARACTERES } from "./texto";

/**
 * OL-516 (bitácora 549): qué eventos de una ficha entran en su carrusel y en su texto (la semana, las funciones repetidas, el tope de cinco), las
 * imágenes (la tarjeta primero, el cartel o el diseño de cada obra) y el texto con la lista y su recorte. Con los casos reales de los ejemplos
 * (el Rinoceronte: dos funciones de una obra sin cartel; un artista con dos fechas y el mismo cartel).
 */
// Jueves 12 de noviembre de 2026, 10:00 en San Luis Potosí.
const AHORA = new Date("2026-11-12T16:00:00Z");
const ZONA = "America/Mexico_City";
const ig = (u: string) => [{ url: `https://www.instagram.com/${u}` }];
const ev = (o: Partial<EventoDeFicha> & { id: string }): EventoDeFicha => ({ titulo: "Obra", inicio: "2026-11-14T02:00:00Z", fin: null, zona: ZONA, imagen: null, usuarios: [], ...o });

describe("qué eventos entran", () => {
  it("las funciones de una misma obra (mismo título, sin acentos ni signos) son una: la primera fecha manda y guarda todas", () => {
    const obras = obrasDeLaSemana(
      [
        ev({ id: "b", titulo: "Awkward Latino, de Disco Bamba", inicio: "2026-11-16T01:00:00Z" }),
        ev({ id: "a", titulo: "Awkward  latino de Disco Bamba", inicio: "2026-11-15T02:00:00Z" }),
        ev({ id: "c", titulo: "Áwkward Latino — de disco bamba", inicio: "2026-11-15T20:00:00Z", imagen: "https://x.test/c.jpg" }),
      ],
      AHORA,
    );
    expect(obras).toHaveLength(1);
    expect(obras[0]).toMatchObject({ id: "a", inicio: "2026-11-15T02:00:00Z", imagen: "https://x.test/c.jpg" });
    expect(obras[0].funciones.map((f) => f.inicio)).toEqual(["2026-11-15T02:00:00Z", "2026-11-15T20:00:00Z", "2026-11-16T01:00:00Z"]);
    expect(tituloNormalizado("¡Entre rieleras y juanes!")).toBe("entre rieleras y juanes");
  });
  it("sin los que ya terminaron; en orden de fecha; obras distintas por separado y con las cuentas de todas sus funciones", () => {
    const obras = obrasDeLaSemana(
      [
        ev({ id: "paso", titulo: "Charla", inicio: "2026-11-12T14:00:00Z", fin: "2026-11-12T15:00:00Z" }),
        ev({ id: "sigue", titulo: "Expo de una semana", inicio: "2026-11-09T16:00:00Z", fin: "2026-11-15T05:59:00Z" }),
        ev({ id: "x2", titulo: "Concierto", inicio: "2026-11-15T02:00:00Z", usuarios: ["b"] }),
        ev({ id: "x1", titulo: "Concierto", inicio: "2026-11-14T02:00:00Z", usuarios: ["a"] }),
      ],
      AHORA,
    );
    expect(obras.map((o) => o.id)).toEqual(["sigue", "x1"]);
    expect(obras[1].usuarios).toEqual(["a", "b"]);
  });
});

describe("la semana y las filas de la base", () => {
  it("a mano (sin día): de hoy al domingo; un día de la semana por venir: desde ese día a las 0:00", () => {
    const v = ventanaDeLaSemana(undefined, AHORA, ZONA);
    // Lunes 9 a las 0:00 y lunes 16 a las 0:00 en San Luis Potosí; cuenta desde ahora.
    expect(v).toEqual({ desde: "2026-11-09T06:00:00.000Z", hasta: "2026-11-16T06:00:00.000Z", desdeDia: AHORA });
    const sab = ventanaDeLaSemana("2026-11-14", AHORA, ZONA);
    expect(sab.desdeDia.toISOString()).toBe("2026-11-14T06:00:00.000Z");
    expect(sab.hasta).toBe("2026-11-16T06:00:00.000Z");
    // Un domingo es de la semana que empezó el lunes anterior.
    expect(ventanaDeLaSemana("2026-11-15", AHORA, ZONA).desde).toBe("2026-11-09T06:00:00.000Z");
  });
  const fila = (o: Partial<FilaDeFicha> & { id: string }): FilaDeFicha => ({ slug: o.id, titulo: "Obra", inicio: "2026-11-14T02:00:00Z", fin: null, zona: ZONA, clase: "puntual", imagen: null, ...o });
  it("sin los marcos de festival (cuentan sus funciones); cada evento con las cuentas de sus artistas y, para el artista, su lugar", () => {
    const filas = [
      fila({ id: "marco", titulo: "Circuito Nacional de Artes Escénicas", clase: "festival", inicio: "2026-11-13T02:00:00Z", fin: "2026-11-20T05:00:00Z" }),
      fila({ id: "acto", titulo: "Awkward Latino", artistas: [ig("discobamba"), null, []], lugar: { nombre: "Teatro El Rinoceronte Enamorado", redes: ig("elrinoenamorado") } }),
      fila({ id: "otro", titulo: "Sin cuentas", clase: null, inicio: "2026-11-15T02:00:00Z", sitio_texto: "Plaza de Armas" }),
    ];
    const delLugar = obrasDeFilas(filas, AHORA, true);
    expect(delLugar.map((o) => o.id)).toEqual(["acto", "otro"]);
    expect(delLugar[0]).toMatchObject({ usuarios: ["discobamba"], lugar: null });
    const delArtista = obrasDeFilas(filas, AHORA, false);
    expect(delArtista[0]).toMatchObject({ usuarios: ["elrinoenamorado", "discobamba"], lugar: "Teatro El Rinoceronte Enamorado" });
    expect(delArtista[1]).toMatchObject({ usuarios: [], lugar: "Plaza de Armas" });
  });
});

describe("las imágenes", () => {
  const seis = Array.from({ length: 6 }, (_, i) => ev({ id: `e${i}`, titulo: `Obra ${i}`, inicio: `2026-11-1${3 + (i % 3)}T0${i}:00:00Z`, imagen: i % 2 ? `https://x.test/${i}.jpg` : null, usuarios: [`artista${i}`] }));
  it("la tarjeta primero y una por obra hasta cinco, en orden de fecha; sin cartel, el diseño (`imagen: null`)", () => {
    const obras = obrasDeLaSemana(seis, AHORA);
    const c = carruselDeFicha({ nombre: "Centro Raúl Gamboa", cuenta: "ipbaslp_", semana: obras }, AHORA);
    expect(c).toHaveLength(1 + TOPE_EVENTOS_FICHA);
    expect(c[0]).toMatchObject({ clave: PORTADA, titulo: "Centro Raúl Gamboa", imagen: null, usuarios: ["ipbaslp_"] });
    expect(c.slice(1).map((i) => i.clave)).toEqual(obras.slice(0, 5).map((o) => o.id));
    expect(c.slice(1).map((i) => !!i.imagen)).toEqual(obras.slice(0, 5).map((o) => !!o.imagen));
  });
  it("dos obras con el mismo cartel van en una imagen (no se repite)", () => {
    const mismo = "https://x.test/tour.jpg";
    const obras = obrasDeLaSemana([ev({ id: "leon", titulo: "Por ti me voy de tour en León", imagen: mismo }), ev({ id: "ags", titulo: "Por ti me voy de tour en Aguascalientes", inicio: "2026-11-15T02:00:00Z", imagen: mismo })], AHORA);
    const c = carruselDeFicha({ nombre: "Un León Marinero", cuenta: "unleonmarinero", semana: obras }, AHORA);
    expect(c.map((i) => i.clave)).toEqual([PORTADA, "leon"]);
    expect(c[1].eventos).toEqual(["leon", "ags"]);
    expect(lineaDelCarrusel(c.length, obras.length)).toBe("Sale con 2 imágenes: su tarjeta y los carteles de sus 2 eventos de esta semana.");
  });
  it("sin eventos, la tarjeta sola; las hojas no dicen nada", () => {
    expect(carruselDeFicha({ nombre: "Foro", cuenta: null, semana: [] }, AHORA).map((i) => i.clave)).toEqual([PORTADA]);
    expect(lineaDelCarrusel(1)).toBeNull();
    expect(lineaDelCarrusel(2)).toBe("Sale con 2 imágenes: su tarjeta y su evento de esta semana.");
    expect(lineaDelCarrusel(3)).toBe("Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana.");
  });
});

describe("el texto", () => {
  it("una función: como en «Esta semana»; varias a la misma hora, los días juntos; a otra hora, cada una con la suya", () => {
    const una = obrasDeLaSemana([ev({ id: "a", titulo: "Aires revolucionarios", inicio: "2026-11-14T01:30:00Z" })], AHORA)[0];
    expect(renglonDeObra(una, AHORA, false)).toBe("Vie 13 · 7:30 pm · Aires revolucionarios");
    const misma = obrasDeLaSemana([ev({ id: "a", titulo: "Obra", inicio: "2026-11-14T02:00:00Z" }), ev({ id: "b", titulo: "Obra", inicio: "2026-11-15T02:00:00Z" })], AHORA)[0];
    expect(renglonDeObra(misma, AHORA, false)).toBe("Vie 13 y sáb 14 · 8:00 pm · Obra");
    const otra = obrasDeLaSemana([ev({ id: "a", titulo: "Awkward Latino", inicio: "2026-11-15T02:00:00Z" }), ev({ id: "b", titulo: "Awkward Latino", inicio: "2026-11-16T01:00:00Z" })], AHORA)[0];
    expect(renglonDeObra(otra, AHORA, false)).toBe("Sáb 14, 8:00 pm y dom 15, 7:00 pm · Awkward Latino");
    // El artista: con el lugar y su cuenta, como en «Esta semana».
    const conLugar = { ...una, lugar: "Teatro de la Paz", lugarRedes: ig("teatrodelapazslp") };
    expect(renglonDeObra(conLugar, AHORA, true)).toBe("Vie 13 · 7:30 pm · Aires revolucionarios · Teatro de la Paz @teatrodelapazslp");
  });
  it("hasta cinco renglones y «Y N más en su ficha.»", () => {
    const obras = obrasDeLaSemana(Array.from({ length: 7 }, (_, i) => ev({ id: `e${i}`, titulo: `Obra ${i}`, inicio: `2026-11-14T0${i}:00:00Z` })), AHORA);
    const b = bloqueDeLaSemana(obras, AHORA, { conLugar: false })!;
    expect(b.split("\n")).toHaveLength(1 + 5 + 1);
    expect(b.startsWith("Esta semana:\n")).toBe(true);
    expect(b.endsWith("Y 2 más en su ficha.")).toBe(true);
    expect(bloqueDeLaSemana([], AHORA, { conLugar: false })).toBeNull();
  });

  const lugar: LugarDestacado = {
    nombre: "Teatro El Rinoceronte Enamorado",
    slug: "teatro-el-rinoceronte-enamorado",
    descripcion: "Sala teatral independiente de la compañía El Rinoceronte Enamorado, fundada en 1994. Programa temporadas propias y de compañías invitadas.",
    tipo: "foro",
    ciudad: "San Luis Potosí",
    direccion: "Carlos Tovar 315, Centro",
    redes: ig("elrinoenamorado"),
    semana: obrasDeLaSemana([ev({ id: "a", titulo: "Awkward Latino, de Disco Bamba", inicio: "2026-11-15T02:00:00Z" }), ev({ id: "b", titulo: "Awkward Latino, de Disco Bamba", inicio: "2026-11-16T01:00:00Z" })], AHORA),
  };
  it("el lugar: el bloque va después de qué es y dónde, sin repetir su nombre en cada renglón", () => {
    const t = textoLugar(lugar, AHORA);
    expect(t).toContain("Foro · San Luis Potosí\n📍 Carlos Tovar 315, Centro\n\nEsta semana:\nSáb 14, 8:00 pm y dom 15, 7:00 pm · Awkward Latino, de Disco Bamba\n\nLee su ficha en somosnosotrxs.org/lugares/teatro-el-rinoceronte-enamorado");
    expect(revisarTexto(t).problema).toBeNull();
  });
  it("el artista: el bloque en lugar de «Próxima fecha» (la tarjeta la sigue diciendo); sin eventos, «Próxima fecha» como antes", () => {
    const artista: ArtistaDestacado = {
      nombre: "Un León Marinero", slug: "un-leon-marinero", descripcion: "Proyecto solista de folk y canción de autor con raíces en San Luis Potosí, activo desde 2019.", disciplina: "musica", detalle: "folk", ciudad: "San Luis Potosí", redes: ig("unleonmarinero"),
      proxima: { inicio: "2026-11-14T02:00:00Z", zona: ZONA, lugar: "León" },
      semana: obrasDeLaSemana([ev({ id: "l", titulo: "Por ti me voy de tour en León", lugar: "León" }), ev({ id: "g", titulo: "Por ti me voy de tour en Aguascalientes", inicio: "2026-11-15T02:00:00Z", lugar: "Aguascalientes" })], AHORA),
    };
    const t = textoArtista(artista, AHORA);
    expect(t).toContain("Música · Folk · San Luis Potosí\n\nEsta semana:\nVie 13 · 8:00 pm · Por ti me voy de tour en León · León\nSáb 14 · 8:00 pm · Por ti me voy de tour en Aguascalientes · Aguascalientes\n\nLee su ficha");
    expect(t).not.toContain("Próxima fecha");
    expect(textoArtista({ ...artista, semana: [] }, AHORA)).toContain("Próxima fecha: viernes 13 de noviembre, 8:00 pm, en el León.");
  });
  it("si no cabe en Instagram, la lista se recorta con «Y N más en su ficha.» antes de rendirse", () => {
    const largo = "Una obra con un título larguísimo ".repeat(10).trim();
    const muchas = obrasDeLaSemana(Array.from({ length: 5 }, (_, i) => ev({ id: `e${i}`, titulo: `${largo} ${i}`, inicio: `2026-11-14T0${i}:00:00Z` })), AHORA);
    const datos = { ...lugar, semana: muchas };
    const completo = textoLugar(datos, AHORA);
    // Que el completo no quepa (si cabe, la prueba no prueba nada).
    const relleno = TOPE_CARACTERES - [...completo].length + 200;
    const enorme = { ...datos, direccion: `${"Calle ".repeat(Math.ceil(relleno / 6))}`.trim() };
    expect(revisarTexto(textoLugar(enorme, AHORA)).problema).not.toBeNull();
    const t = textoDeDestacado({ tipo: "lugar", datos: enorme, cuenta: "elrinoenamorado" }, AHORA);
    expect(revisarTexto(t).problema).toBeNull();
    expect(t).toMatch(/Y \d más en su ficha\./);
  });
});
