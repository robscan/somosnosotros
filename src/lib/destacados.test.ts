import { describe, expect, it } from "vitest";
import type { EventoAgenda } from "./agenda";
import type { ArtistaLista } from "./artistas";
import { enOrden, estadoVigente, opcionDestacar, tarjetaArtista, tarjetaEvento, tarjetaLugar, textoDestacar, textoHecho, textoMotivo, type Destacado } from "./destacados";
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
const artista = (cambios: Partial<ArtistaLista> = {}): ArtistaLista => ({ id: "a1", nombre: "Trío Potosino", disciplina: "musica", detalle: null, tipo: "grupo", foto: null, proxima: null, ...cambios });

describe("enOrden", () => {
  it("deja las fichas en el orden de la tira y salta las que no llegaron", () => {
    const tira: Destacado[] = ["b", "x", "a"].map((id) => ({ id, motivo: "elegido", hasta: null, van: 0 }));
    expect(enOrden(tira, [{ id: "a" }, { id: "b" }, { id: "c" }]).map((f) => f.id)).toEqual(["b", "a"]);
  });
});

describe("tarjetas", () => {
  it("evento: su cartel, si no la foto del lugar, si no la imagen ancha del símbolo; cuándo y dónde", () => {
    expect(tarjetaEvento(evento({ imagen: "/cartel.jpg", van: 14 }), AHORA)).toEqual({ id: "e1", href: "/eventos/e1", foto: "/cartel.jpg", titulo: "Gala de arias", detalle: "mañana · 19:00 · Teatro de la Paz", van: 14 });
    expect(tarjetaEvento(evento({ lugar: { nombre: "Teatro de la Paz", portada: "/teatro.jpg" } }), AHORA).foto).toBe("/teatro.jpg");
    expect(tarjetaEvento(evento({ lugar: null, lugar_id: null, sitio_texto: "Plaza de Armas" }), AHORA)).toMatchObject({ foto: SIN_FOTO_ANCHA, detalle: "mañana · 19:00 · Plaza de Armas" });
  });
  it("lugar: su próximo evento o, sin él, qué es", () => {
    expect(tarjetaLugar(lugar({ proximo: { id: "e1", inicio: MANANA_19, zona: ZONA } }), AHORA)).toMatchObject({ href: "/lugares/l1", foto: SIN_FOTO_ANCHA, detalle: "Próximo: mañana · 19:00" });
    expect(tarjetaLugar(lugar({ portada: "/casa.jpg" }), AHORA)).toMatchObject({ foto: "/casa.jpg", detalle: "Casa de cultura" });
  });
  it("artista: la fecha sin el sitio, o lo que hace", () => {
    expect(tarjetaArtista(artista({ proxima: { id: "e1", inicio: MANANA_19, zona: ZONA, sitio: "Teatro de la Paz" } }), AHORA)).toMatchObject({ href: "/artistas/a1", foto: SIN_FOTO, detalle: "mañana · 19:00" });
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
  it("un plazo vencido cuenta como nada; un evento no lleva plazo", () => {
    expect(estadoVigente(null, AHORA)).toBe("ninguno");
    expect(estadoVigente({ quitado: true, hasta: vencido }, AHORA)).toBe("ninguno");
    expect(estadoVigente({ quitado: true, hasta: vigente }, AHORA)).toBe("quitado");
    expect(estadoVigente({ quitado: false, hasta: vigente }, AHORA)).toBe("elegido");
    expect(estadoVigente({ quitado: false, hasta: null }, AHORA)).toBe("elegido");
  });
  it("lo elegido se ofrece quitar aunque no quepa en la tira, con su plazo", () => {
    expect(opcionDestacar("lugar", "elegido", vigente, null, AHORA)).toEqual({ quitar: true, detalle: "Destacado hasta el vie 25 de sep" });
  });
  it("lo que entra por asistentes se ofrece quitar; lo quitado vigente o sin nada, destacar", () => {
    const tira: Destacado = { id: "l1", motivo: "asistentes", hasta: null, van: 4 };
    expect(opcionDestacar("lugar", "ninguno", null, tira, AHORA)).toEqual({ quitar: true, detalle: "Destacado: 4 van a sus eventos" });
    expect(opcionDestacar("lugar", "quitado", vigente, null, AHORA)).toEqual({ quitar: false, detalle: "Dos semanas: hasta el mié 30 de sep" });
    expect(opcionDestacar("evento", "ninguno", null, null, AHORA)).toEqual({ quitar: false, detalle: "Hasta que pase el evento" });
  });
  it("las fechas van en la zona de la ficha", () => {
    // 25 de sep a las 23:30 en México es 26 de sep en Madrid.
    expect(textoMotivo({ motivo: "elegido", hasta: "2026-09-26T05:30:00Z", van: 0 }, "lugar", AHORA, "Europe/Madrid")).toBe("Destacado hasta el sáb 26 de sep");
  });
});

