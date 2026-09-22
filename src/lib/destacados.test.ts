import { describe, expect, it } from "vitest";
import type { EventoAgenda } from "./agenda";
import type { ArtistaLista } from "./artistas";
import { decididoVigente, enOrden, fechasValidas, opcionDestacar, ordenarTarjetasPorFoto, puedeDestacarse, SIN_DECIDIR, tarjetaArtista, tarjetaEvento, tarjetaLugar, textoDestacar, textoHecho, textoMotivo, type Destacado } from "./destacados";
import { SIN_FOTO, SIN_FOTO_ANCHA } from "./imagen";
import type { LugarLista } from "./lugares";

// Miércoles 16 de septiembre de 2026, 18:00 en San Luis Potosí.
const AHORA = new Date("2026-09-17T00:00:00Z");
const MANANA_19 = "2026-09-18T01:00:00Z";
const ZONA = "America/Mexico_City";

const evento = (cambios: Partial<EventoAgenda> = {}): EventoAgenda => ({
  id: "e1", titulo: "Gala de arias", inicio: MANANA_19, fin: null, imagen: null, precio: null, lugar_id: "l1", sitio_texto: null, sitio_reservado: false, zona: ZONA,
  lugar: { nombre: "Teatro de la Paz", portada: null }, creado_en: "2026-09-14T00:00:00Z", lat: null, lng: null, van: 0, ...cambios,
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
  it("pone foto real antes del placeholder y conserva el orden dentro de cada grupo", () => {
    const tarjetas = ["sin-primero", "foto-primera", "sin-segundo", "foto-segunda"].map((id) => ({ id, href: `/${id}`, foto: id.startsWith("sin") ? SIN_FOTO_ANCHA : `/${id}.jpg`, titulo: id, detalle: "", van: 0 }));
    expect(ordenarTarjetasPorFoto(tarjetas).map((t) => t.id)).toEqual(["foto-primera", "foto-segunda", "sin-primero", "sin-segundo"]);
  });
});

describe("tarjetas", () => {
  it("evento: su cartel, si no la foto del lugar, si no la imagen ancha del símbolo; cuándo y dónde", () => {
    expect(tarjetaEvento(evento({ imagen: "/cartel.jpg", van: 14 }), AHORA)).toEqual({ id: "e1", href: "/eventos/e1", foto: "/cartel.jpg", titulo: "Gala de arias", detalle: "mañana · 19:00 · Teatro de la Paz", van: 14 });
    expect(tarjetaEvento(evento({ lugar: { nombre: "Teatro de la Paz", portada: "/teatro.jpg" } }), AHORA).foto).toBe("/teatro.jpg");
    expect(tarjetaEvento(evento({ lugar: null, lugar_id: null, sitio_texto: "Plaza de Armas" }), AHORA)).toMatchObject({ foto: SIN_FOTO_ANCHA, detalle: "mañana · 19:00 · Plaza de Armas" });
  });
  it("lugar: su próximo evento o, sin él, qué es", () => {
    expect(tarjetaLugar(lugar({ proximo: { id: "e1", inicio: MANANA_19, zona: ZONA, titulo: "Concierto" } }), AHORA)).toMatchObject({ href: "/lugares/l1", foto: SIN_FOTO_ANCHA, detalle: "Próximo: mañana · 19:00" });
    expect(tarjetaLugar(lugar({ portada: "/casa.jpg" }), AHORA)).toMatchObject({ foto: "/casa.jpg", detalle: "Casa de cultura" });
  });
  it("artista: la fecha sin el sitio, o lo que hace", () => {
    expect(tarjetaArtista(artista({ proxima: { id: "e1", inicio: MANANA_19, zona: ZONA, sitio: "Teatro de la Paz" } }), AHORA)).toMatchObject({ href: "/artistas/trio-potosino", foto: SIN_FOTO, detalle: "mañana · 19:00" });
    expect(tarjetaArtista(artista({ foto: "/trio.jpg" }), AHORA)).toMatchObject({ foto: "/trio.jpg", detalle: "Música · Grupo" });
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
