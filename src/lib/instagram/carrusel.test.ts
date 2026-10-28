import { describe, expect, it } from "vitest";
import { armarCarrusel, elegirImagenes, etiquetasPorImagen, imagenesPedidas, PORTADA, resumenCarrusel, textoImagenes, TOPE_CARRUSEL, type ParaCarrusel } from "./carrusel";
import { armarTexto, etiquetasDeLaFoto, type EventoIg } from "./texto";

/**
 * OL-464 (bitácora 496): el carrusel de un festival con varios carteles (founder: «para el caso de festivales que además tengan más de un cartel
 * en sus eventos, ¿se puede hacer un carrusel para publicar?» — «Sí»). La portada primero; después un cartel por cada cartel distinto de sus actos
 * por venir, en orden de fecha y sin repetir; hasta 10; las etiquetas de cada acto en la imagen de su cartel; y la misma función para «Esta
 * semana» (una lista cualquiera con una portada aparte).
 */
const ahora = new Date("2026-10-07T16:00:00Z"); // miércoles 7 de octubre, 10:00 en San Luis Potosí
const z = "America/Mexico_City";
const URL_FOTOS = "https://x.supabase.co/storage/v1/object/public/fotos/lugares/a";
const cartel = (n: string) => `${URL_FOTOS}/${n}.jpg`;
let id = 0;
const acto = (dia: number, hora: string, imagen: string | null, usuarios: string[] = [], extra: Partial<ParaCarrusel> = {}): ParaCarrusel => {
  const inicio = new Date(`2026-10-${String(dia).padStart(2, "0")}T${hora}:00-06:00`).toISOString();
  id++;
  return { id: `acto-${String(id).padStart(2, "0")}`, titulo: `Acto ${id}`, imagen, inicio, fin: new Date(new Date(inicio).getTime() + 3_600_000).toISOString(), usuarios, ...extra };
};
const claves = (xs: { clave: string }[]) => xs.map((x) => x.clave);

describe("armarCarrusel: las imágenes de un festival", () => {
  it("la portada primero; luego un cartel por cada cartel distinto de sus actos, en orden de fecha; los actos sin cartel no aportan imagen", () => {
    const a = acto(10, "19:00", cartel("dia-sab"), ["luna"]);
    const b = acto(9, "17:30", cartel("dia-vie"), ["martha"]);
    const c = acto(9, "21:00", cartel("dia-vie"), ["luna"]); // el mismo cartel que b: una sola imagen
    const d = acto(10, "13:00", null, ["paloma"]); // sin cartel
    const e = acto(11, "12:00", cartel("rocio"), ["rocio"]);
    const r = armarCarrusel({ portada: { titulo: "Cultura Mística", imagen: cartel("marco"), usuarios: ["organiza"] }, eventos: [a, b, c, d, e], ahora, zona: z });
    expect(claves(r)).toEqual([PORTADA, b.id, a.id, e.id]);
    expect(r.map((i) => i.imagen)).toEqual([cartel("marco"), cartel("dia-vie"), cartel("dia-sab"), cartel("rocio")]);
    expect(r[1]).toMatchObject({ eventos: [b.id, c.id], usuarios: ["martha", "luna"] });
    expect(r[0]).toMatchObject({ titulo: "Cultura Mística", eventos: [], usuarios: ["organiza"] });
  });

  it("sin cartel del marco, la portada es su diseño de Crear cartel (imagen null) y sigue primero", () => {
    const a = acto(9, "18:00", cartel("uno"));
    const r = armarCarrusel({ portada: { titulo: "Festival", imagen: null }, eventos: [a], ahora, zona: z });
    expect(r.map((i) => [i.clave, i.imagen])).toEqual([
      [PORTADA, null],
      [a.id, cartel("uno")],
    ]);
  });

  it("un acto con el mismo cartel que el marco se suma a la portada (y sus artistas se etiquetan ahí)", () => {
    const a = acto(9, "18:00", `${cartel("marco")}?v=2`, ["tambor"]);
    const b = acto(9, "20:00", cartel("otro"), ["luna"]);
    const r = armarCarrusel({ portada: { titulo: "F", imagen: cartel("marco") }, eventos: [a, b], ahora, zona: z });
    expect(claves(r)).toEqual([PORTADA, b.id]);
    expect(r[0]).toMatchObject({ eventos: [a.id], usuarios: ["tambor"] });
  });

  it("solo lo que está por venir: un acto que ya pasó no aporta; uno con funciones, mientras le quede una (y se ordena por la que sigue)", () => {
    const paso = acto(6, "19:00", cartel("paso"));
    const sesiones = [
      { inicio: "2026-10-05T01:00:00Z", fin: "2026-10-05T02:00:00Z" },
      { inicio: "2026-10-12T01:00:00Z", fin: "2026-10-12T02:00:00Z" },
    ];
    const conFunciones = acto(4, "19:00", cartel("funciones"), [], { sesiones });
    const manana = acto(8, "19:00", cartel("manana"));
    const r = armarCarrusel({ portada: { titulo: "F", imagen: null }, eventos: [paso, conFunciones, manana], ahora, zona: z });
    expect(claves(r)).toEqual([PORTADA, manana.id, conFunciones.id]);
  });

  it("con muchos carteles las arma todas; el tope lo pone elegirImagenes: van 10 (la portada y 9) y las últimas quedan fuera", () => {
    const actos = Array.from({ length: 12 }, (_, i) => acto(8 + Math.floor(i / 4), `${12 + (i % 4)}:00`, cartel(`c${i}`)));
    const todas = armarCarrusel({ portada: { titulo: "F", imagen: cartel("marco") }, eventos: actos, ahora, zona: z });
    expect(todas).toHaveLength(13);
    const { van, fuera } = elegirImagenes(todas);
    expect(van).toHaveLength(TOPE_CARRUSEL);
    expect(claves(van)).toEqual([PORTADA, ...actos.slice(0, 9).map((a) => a.id)]);
    expect(claves(fuera)).toEqual(actos.slice(9).map((a) => a.id));
  });
});

describe("elegirImagenes e imagenesPedidas: lo que eligió la hoja", () => {
  const actos = Array.from({ length: 11 }, (_, i) => acto(9, `${10 + i}:00`, cartel(`e${i}`)));
  const todas = armarCarrusel({ portada: { titulo: "F", imagen: null }, eventos: actos, ahora, zona: z });

  it("quitar una deja entrar a la primera que quedaba fuera", () => {
    expect(elegirImagenes(todas).fuera).toHaveLength(2);
    const { van, fuera } = elegirImagenes(todas, { quitadas: [actos[0].id] });
    expect(claves(van)).toEqual([PORTADA, ...actos.slice(1, 10).map((a) => a.id)]);
    expect(claves(fuera)).toEqual([actos[10].id]);
  });

  it("el orden de la hoja manda; lo que no dice va después en su orden; una clave que no existe no cuenta", () => {
    const { van } = elegirImagenes(todas, { orden: [actos[2].id, PORTADA, "inventada", actos[2].id], tope: 4 });
    expect(claves(van)).toEqual([actos[2].id, PORTADA, actos[0].id, actos[1].id]);
  });

  it("al publicar: solo claves que existen, sin repetir, en su orden y hasta 10; nada si no es una lista", () => {
    const pedidas = imagenesPedidas(todas, [actos[3].id, "https://otro.example/x.jpg", PORTADA, actos[3].id, 5, ...actos.map((a) => a.id)]);
    expect(claves(pedidas)).toEqual([actos[3].id, PORTADA, ...actos.filter((_, i) => i !== 3).slice(0, 8).map((a) => a.id)]);
    expect(imagenesPedidas(todas, "portada")).toEqual([]);
    expect(imagenesPedidas(todas, null)).toEqual([]);
  });
});

describe("etiquetasPorImagen: a quién en cada imagen", () => {
  const vie = acto(9, "17:30", cartel("vie"), ["martha", "luna"]);
  const sab = acto(10, "19:00", cartel("sab"), ["tambor", "martha"]);
  const dom = acto(11, "18:00", cartel("dom"), ["oraculo"]);
  const todas = armarCarrusel({ portada: { titulo: "F", imagen: cartel("marco"), usuarios: ["organiza"] }, eventos: [vie, sab, dom], ahora, zona: z });

  it("el lugar en todas; los artistas de cada acto en la imagen de su cartel; quien organiza en la portada", () => {
    const tags = etiquetasPorImagen(todas, { lugar: "aether", permitidas: ["aether", "organiza", "martha", "luna", "tambor", "oraculo"] });
    expect(tags).toEqual([
      ["aether", "organiza"],
      ["aether", "martha", "luna"],
      ["aether", "tambor", "martha"],
      ["aether", "oraculo"],
    ]);
  });

  it("lo quitado en la hoja no se etiqueta en ninguna; quien quedó sin imagen (su cartel quedó fuera) va en la portada", () => {
    const { van } = elegirImagenes(todas, { quitadas: [dom.id] });
    const tags = etiquetasPorImagen(van, { lugar: "aether", permitidas: ["aether", "organiza", "martha", "tambor", "oraculo"] });
    expect(tags).toEqual([
      ["aether", "organiza", "oraculo"],
      ["aether", "martha"],
      ["aether", "tambor", "martha"],
    ]);
  });

  it("sin la portada, las sueltas van en la primera; sin lugar permitido, nadie lo lleva", () => {
    const { van } = elegirImagenes(todas, { quitadas: [PORTADA] });
    expect(etiquetasPorImagen(van, { lugar: "aether", permitidas: ["organiza", "luna"] })).toEqual([["luna", "organiza"], [], []]);
  });

  it("hasta 20 por imagen", () => {
    const muchos = Array.from({ length: 25 }, (_, i) => `cuenta${i}`);
    const uno = acto(9, "12:00", cartel("lleno"), muchos);
    const r = armarCarrusel({ portada: { titulo: "F", imagen: null }, eventos: [uno], ahora, zona: z });
    const tags = etiquetasPorImagen(r, { lugar: "lugar", permitidas: ["lugar", ...muchos] });
    expect(tags[1]).toHaveLength(20);
    expect(tags[1][0]).toBe("lugar");
  });

  it("las permitidas son las de la foto del festival (etiquetasDeLaFoto, con las quitadas): la misma lista que ve la hoja", () => {
    const festival: EventoIg = {
      titulo: "F",
      inicio: vie.inicio,
      fin: dom.fin,
      zona: z,
      clase: "festival",
      precio: null,
      lugar: { nombre: "Aether", usuario: "aether" },
      ciudad: "San Luis Potosí",
      artistas: [{ nombre: "Organiza", usuario: "organiza", disciplina: null }],
      actos: [vie, sab, dom].map((a) => ({ titulo: a.titulo, inicio: a.inicio, fin: a.fin, precio: null, artistas: a.usuarios.map((u) => ({ id: u, nombre: u, usuario: u, disciplina: null })) })),
    };
    const permitidas = etiquetasDeLaFoto(festival, ["luna"]);
    const tags = etiquetasPorImagen(todas, { lugar: "aether", permitidas });
    expect(tags.flat()).not.toContain("luna");
    expect(new Set(tags.flat())).toEqual(new Set(permitidas));
    // El texto del carrusel es el del festival (OL-463): el mismo, con o sin carrusel.
    expect(armarTexto(festival, ahora, ["luna"])).toContain("@organiza");
  });
});

describe("«Esta semana»: una lista cualquiera con una portada aparte", () => {
  it("la portada de la semana primero y cada evento con su cartel o su diseño de Crear cartel (sinCartel: diseno), en orden de fecha, hasta 10", () => {
    const semana = Array.from({ length: 9 }, (_, i) => ({ ...acto(8 + (i % 5), `${18 + Math.floor(i / 5)}:00`, i % 3 ? cartel(`s${i}`) : null), titulo: `Evento ${i}` }));
    const todas = armarCarrusel({ portada: { titulo: "Esta semana en San Luis Potosí", imagen: null }, eventos: semana, ahora, zona: z, sinCartel: "diseno" });
    expect(todas).toHaveLength(10);
    expect(todas[0]).toMatchObject({ clave: PORTADA, imagen: null, titulo: "Esta semana en San Luis Potosí" });
    const orden = [...semana].sort((a, b) => a.inicio.localeCompare(b.inicio)).map((e) => e.id);
    expect(claves(todas.slice(1))).toEqual(orden);
    expect(todas.filter((i) => i.imagen === null)).toHaveLength(4); // la portada y los tres sin cartel
    const { van, fuera } = elegirImagenes(todas);
    expect([van.length, fuera.length]).toEqual([10, 0]);
  });

  it("dos eventos con el mismo cartel siguen siendo una imagen; uno que ya pasó no entra", () => {
    const a = acto(8, "19:00", cartel("misma"), ["a"]);
    const b = acto(9, "19:00", cartel("misma"), ["b"]);
    const paso = acto(5, "19:00", null);
    const todas = armarCarrusel({ portada: { titulo: "Semana", imagen: null }, eventos: [paso, a, b], ahora, zona: z, sinCartel: "diseno" });
    expect(claves(todas)).toEqual([PORTADA, a.id]);
    expect(todas[1].usuarios).toEqual(["a", "b"]);
  });
});

describe("lo que dice la hoja", () => {
  const todas = armarCarrusel({
    portada: { titulo: "F", imagen: null },
    eventos: Array.from({ length: 11 }, (_, i) => ({ ...acto(9, `${10 + i}:00`, cartel(`d${i}`)), titulo: `Acto ${String.fromCharCode(65 + i)}` })),
    ahora,
    zona: z,
  });

  it("cuántas van y cuáles quedan fuera", () => {
    const { van, fuera } = elegirImagenes(todas);
    expect(resumenCarrusel(van, fuera)).toEqual({ resumen: "Carrusel de 10 imágenes, en este orden:", fuera: "Instagram deja 10: quedan fuera «Acto J» y «Acto K»." });
    const una = elegirImagenes(todas, { quitadas: todas.slice(0, 11).map((i) => i.clave) });
    expect(resumenCarrusel(una.van, una.fuera)).toEqual({ resumen: "Solo queda 1 imagen: se publica como una foto.", fuera: null });
    const nueve = elegirImagenes(todas, { quitadas: [todas[1].clave] });
    expect(resumenCarrusel(nueve.van, nueve.fuera).fuera).toBe("Instagram deja 10: queda fuera «Acto K».");
  });

  it("«1 imagen», «5 imágenes»", () => {
    expect([textoImagenes(1), textoImagenes(5)]).toEqual(["1 imagen", "5 imágenes"]);
  });
});
