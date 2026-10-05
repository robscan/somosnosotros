import { describe, expect, it } from "vitest";
import type { EventoAgenda } from "./agenda";
import type { ArtistaLista } from "./artistas";
import { decididoVigente, enOrden, fechasValidas, opcionDestacar, ordenarTarjetasPorFoto, puedeDestacarse, selloDeTarjeta, SIN_DECIDIR, tarjetaArtista, tarjetaEvento, tarjetaLugar, textoDestacar, textoHecho, textoMotivo, type Destacado } from "./destacados";
import type { LugarLista } from "./lugares";

// Miércoles 16 de septiembre de 2026, 18:00 en San Luis Potosí.
const AHORA = new Date("2026-09-17T00:00:00Z");
const MANANA_19 = "2026-09-18T01:00:00Z";
const ZONA = "America/Mexico_City";

const evento = (cambios: Partial<EventoAgenda> = {}): EventoAgenda => ({
  id: "e1", titulo: "Gala de arias", inicio: MANANA_19, fin: null, imagen: null, precio: null, lugar_id: "l1", sitio_texto: null, sitio_reservado: false, zona: ZONA,
  lugar: { nombre: "Teatro de la Paz", portada: null }, creado_en: "2026-09-14T00:00:00Z", van: 0, ...cambios,
});
const lugar = (cambios: Partial<LugarLista> = {}): LugarLista => ({ id: "l1", nombre: "Casa de la Cultura", tipo: "casa_de_cultura", direccion: null, lat: 22.15, lng: -100.98, portada: null, proximo: null, ...cambios }) as LugarLista;
const artista = (cambios: Partial<ArtistaLista> = {}): ArtistaLista => ({ id: "a1", slug: "trio-potosino", nombre: "Trío Potosino", disciplina: "musica", detalle: null, tipo: "grupo", foto: null, proxima: null, ...cambios });

describe("enOrden", () => {
  it("deja las fichas en el orden de la tira y salta las que no llegaron", () => {
    const tira: Destacado[] = ["b", "x", "a"].map((id) => ({ id, motivo: "elegido", hasta: null, van: 0 }));
    expect(enOrden(tira, [{ id: "a" }, { id: "b" }, { id: "c" }]).map((f) => f.id)).toEqual(["b", "a"]);
  });
});

describe("ordenarTarjetasPorFoto", () => {
  it("pone la foto real antes de la que no tiene y conserva el orden dentro de cada grupo", () => {
    const tarjetas = ["sin-primero", "foto-primera", "sin-segundo", "foto-segunda"].map((id) => ({ id, href: `/${id}`, foto: id.startsWith("sin") ? null : `/${id}.jpg`, titulo: id, detalle: "", van: 0 }));
    expect(ordenarTarjetasPorFoto(tarjetas).map((t) => t.id)).toEqual(["foto-primera", "foto-segunda", "sin-primero", "sin-segundo"]);
  });
});

describe("selloDeTarjeta: un solo rótulo por foto (H-02)", () => {
  it("«Hoy» va antes que «N van»", () => {
    expect(selloDeTarjeta({ hoy: true, van: 5 })).toEqual({ texto: "Hoy", tuyo: false, hoy: true });
  });
  it("sin ser hoy, cuántos van: «1 va», «3 van»", () => {
    expect(selloDeTarjeta({ van: 1 })).toEqual({ texto: "1 va", tuyo: false, hoy: false });
    expect(selloDeTarjeta({ hoy: false, van: 3 })).toEqual({ texto: "3 van", tuyo: false, hoy: false });
  });
  it("sin ninguno de los dos, nada", () => {
    expect(selloDeTarjeta({ van: 0 })).toBeNull();
    expect(selloDeTarjeta({ hoy: false, van: 0 })).toBeNull();
  });
  it("lo que la persona ya decidió («Te interesa») va primero y es suyo; «Recién agregado» ya no es un sello", () => {
    expect(selloDeTarjeta({ hoy: true, van: 5 }, true)).toEqual({ texto: "Te interesa", tuyo: true, hoy: false });
    expect(selloDeTarjeta({ van: 0 }, true)).toEqual({ texto: "Te interesa", tuyo: true, hoy: false });
    expect(tarjetaEvento(evento({ creado_en: "2026-09-16T00:00:00Z" }), AHORA)).not.toHaveProperty("reciente");
  });
});

describe("tarjetas", () => {
  it("evento: su cartel, si no la foto del lugar, si no la imagen ancha del símbolo; cuándo y dónde en dos datos", () => {
    expect(tarjetaEvento(evento({ imagen: "/cartel.jpg", van: 14 }), AHORA)).toEqual({ id: "e1", href: "/eventos/e1", foto: "/cartel.jpg", titulo: "Gala de arias", detalle: "mañana · 19:00", sitio: "Teatro de la Paz", van: 14, cuando: true, hoy: false, inicio: MANANA_19, fin: null, zona: ZONA });
    expect(tarjetaEvento(evento({ lugar: { nombre: "Teatro de la Paz", portada: "/teatro.jpg" } }), AHORA).foto).toBe("/teatro.jpg");
    expect(tarjetaEvento(evento({ lugar: null, lugar_id: null, sitio_texto: "Plaza de Armas" }), AHORA)).toMatchObject({ foto: null, detalle: "mañana · 19:00", sitio: "Plaza de Armas" });
  });
  it("evento: el sitio va sin su dirección postal, como en las listas (H-09)", () => {
    expect(tarjetaEvento(evento({ lugar: null, lugar_id: null, sitio_texto: "Templo de San Francisco", sitio_direccion: "Calle Jardín Guerrero 7, 78000" }), AHORA).sitio).toBe("Templo de San Francisco");
  });
  it("evento: «hoy» marca lo que empieza el día de hoy en su zona, no lo de mañana", () => {
    expect(tarjetaEvento(evento({ inicio: "2026-09-17T02:00:00Z" }), AHORA)).toMatchObject({ hoy: true, detalle: "hoy · 20:00" });
    expect(tarjetaEvento(evento(), AHORA).hoy).toBe(false);
  });
  it("lugar: su próximo evento o, sin él, qué es", () => {
    expect(tarjetaLugar(lugar({ proximo: { id: "e1", inicio: MANANA_19, zona: ZONA, titulo: "Concierto" } }), AHORA)).toMatchObject({ href: "/lugares/l1", foto: null, detalle: "Próximo: mañana · 19:00", cuando: true });
    expect(tarjetaLugar(lugar({ portada: "/casa.jpg" }), AHORA)).toMatchObject({ foto: "/casa.jpg", detalle: "Casa de cultura" });
    expect(tarjetaLugar(lugar({ portada: "/casa.jpg" }), AHORA).cuando).toBeUndefined();
  });
  it("artista: la fecha sin el sitio, o lo que hace", () => {
    expect(tarjetaArtista(artista({ proxima: { id: "e1", inicio: MANANA_19, zona: ZONA, sitio: "Teatro de la Paz" } }), AHORA)).toMatchObject({ href: "/artistas/trio-potosino", foto: null, detalle: "mañana · 19:00" });
    expect(tarjetaArtista(artista({ foto: "/trio.jpg" }), AHORA)).toMatchObject({ foto: "/trio.jpg", detalle: "Música · Grupo" });
    expect(tarjetaArtista(artista({ foto: "/trio.jpg" }), AHORA).cuando).toBeUndefined(); // su detalle es la disciplina, no un cuándo
  });
});

describe("textos del menú", () => {
  it("destacar dice hasta cuándo", () => {
    expect(textoDestacar("evento", AHORA)).toBe("Hasta que pase el evento");
    expect(textoDestacar("lugar", AHORA)).toBe("Dos semanas: hasta el mié 30 de sep");
  });
  it("el motivo dice por qué y hasta cuándo", () => {
    expect(textoMotivo({ motivo: "asistentes", hasta: null, van: 14 }, "evento", AHORA)).toBe("Destacado: 14 van");
    expect(textoMotivo({ motivo: "asistentes", hasta: null, van: 5 }, "lugar", AHORA)).toBe("Destacado: 5 van a sus eventos");
    expect(textoMotivo({ motivo: "elegido", hasta: "2026-09-25T20:00:00Z", van: 0 }, "artista", AHORA)).toBe("Destacado hasta el vie 25 de sep");
    expect(textoMotivo({ motivo: "elegido", hasta: MANANA_19, van: 0 }, "lugar", AHORA)).toBe("Destacado hasta mañana");
    expect(textoMotivo({ motivo: "elegido", hasta: null, van: 0 }, "evento", AHORA)).toBe("Destacado hasta que pase");
  });
  it("lo hecho queda escrito", () => {
    expect(textoHecho("elegido", "lugar", AHORA)).toBe("Destacado hasta el mié 30 de sep");
    expect(textoHecho("elegido", "evento", AHORA)).toBe("Destacado hasta que pase");
    expect(textoHecho("quitado", "artista", AHORA)).toBe("Ya no es destacado");
  });
});

describe("lo decidido y el menú de la ficha", () => {
  const vigente = "2026-09-25T20:00:00Z";
  const vencido = "2026-09-10T20:00:00Z";
  const creado = "2026-09-11T20:00:00.123456+00:00";
  it("un plazo vencido cuenta como nada; lo vigente guarda su plazo y su fecha para Deshacer", () => {
    expect(decididoVigente(null, AHORA)).toEqual(SIN_DECIDIR);
    expect(decididoVigente({ quitado: true, hasta: vencido, creado_en: creado }, AHORA)).toEqual(SIN_DECIDIR);
    expect(decididoVigente({ quitado: true, hasta: vigente, creado_en: creado }, AHORA)).toEqual({ estado: "quitado", plazo: vigente, creado });
    expect(decididoVigente({ quitado: false, hasta: null, creado_en: creado }, AHORA)).toEqual({ estado: "elegido", plazo: null, creado });
  });
  it("lo que repone Deshacer, con los límites de la base: plazo por venir y de dos semanas como mucho, fecha no futura", () => {
    expect(fechasValidas(null, null, AHORA)).toBe(true);
    expect(fechasValidas(vigente, creado, AHORA)).toBe(true);
    expect(fechasValidas("2026-10-01T00:00:00Z", null, AHORA)).toBe(true);
    expect(fechasValidas("2026-10-01T00:00:01Z", null, AHORA)).toBe(false);
    expect(fechasValidas(vencido, null, AHORA)).toBe(false);
    expect(fechasValidas("infinity", null, AHORA)).toBe(false);
    expect(fechasValidas(null, "2026-09-17T00:00:01Z", AHORA)).toBe(false);
    expect(fechasValidas(null, "ayer", AHORA)).toBe(false);
  });
  it("lo elegido se ofrece quitar aunque no quepa en la tira, con su plazo", () => {
    expect(opcionDestacar("lugar", { estado: "elegido", plazo: vigente, creado }, null, AHORA)).toEqual({ quitar: true, detalle: "Destacado hasta el vie 25 de sep" });
  });
  it("lo que entra por asistentes se ofrece quitar; lo quitado vigente o sin nada, destacar", () => {
    const tira: Destacado = { id: "l1", motivo: "asistentes", hasta: null, van: 4 };
    expect(opcionDestacar("lugar", SIN_DECIDIR, tira, AHORA)).toEqual({ quitar: true, detalle: "Destacado: 4 van a sus eventos" });
    expect(opcionDestacar("lugar", { estado: "quitado", plazo: vigente, creado }, null, AHORA)).toEqual({ quitar: false, detalle: "Dos semanas: hasta el mié 30 de sep" });
    expect(opcionDestacar("evento", SIN_DECIDIR, null, AHORA)).toEqual({ quitar: false, detalle: "Hasta que pase el evento" });
  });
  it("las fechas van en la zona de la ficha", () => {
    // 25 de sep a las 23:30 en México es 26 de sep en Madrid.
    expect(textoMotivo({ motivo: "elegido", hasta: "2026-09-26T05:30:00Z", van: 0 }, "lugar", AHORA, "Europe/Madrid")).toBe("Destacado hasta el sáb 26 de sep");
  });
});

describe("qué se puede destacar", () => {
  it("con la regla de la tira: visible; un lugar, no privado; un evento, sin pasar y en un lugar que se ve", () => {
    const lugarVisto = { visible: true, privado: false };
    expect(puedeDestacarse({ visible: true })).toBe(true);
    expect(puedeDestacarse({ visible: false })).toBe(false);
    expect(puedeDestacarse({ visible: true, privado: true })).toBe(false);
    expect(puedeDestacarse({ visible: true, paso: false, lugar: null })).toBe(true);
    expect(puedeDestacarse({ visible: true, paso: false, lugar: lugarVisto })).toBe(true);
    expect(puedeDestacarse({ visible: true, paso: true, lugar: lugarVisto })).toBe(false);
    expect(puedeDestacarse({ visible: true, paso: false, lugar: { visible: true, privado: true } })).toBe(false);
    expect(puedeDestacarse({ visible: true, paso: false, lugar: { visible: false, privado: false } })).toBe(false);
  });
});


it("el recuento desconocido viaja hasta la tarjeta y no crea una cifra", () => {
  const tarjeta = tarjetaEvento(evento({ van: null }), AHORA);
  expect(tarjeta.van).toBeNull();
  expect(selloDeTarjeta(tarjeta)).toBeNull();
  expect(selloDeTarjeta({ hoy: true, van: null })?.texto).toBe("Hoy");
});


it("la tarjeta de artista lleva a su novedad exacta solo mientras es reciente", () => {
  const a: ArtistaLista = { id: "a", slug: "artista", nombre: "Artista", foto: "/a.jpg", disciplina: "musica", tipo: "solista", detalle: null, proxima: null,
    novedad: { novedad_id: "00000000-0000-4000-8000-000000000123", proveedor: "soundcloud", creado_en: AHORA.toISOString() } };
  expect(tarjetaArtista(a, AHORA).href).toBe("/artistas/artista?novedad=00000000-0000-4000-8000-000000000123");
  expect(tarjetaArtista(a, new Date(+AHORA + 168 * 3600000)).href).toBe("/artistas/artista");
  expect(tarjetaArtista({ ...a, novedad: null }, AHORA).novedad).toBeNull();
});
