import { describe, expect, it } from "vitest";
import { validarEvento } from "../../src/lib/eventos";
import { direccionParaBuscar, elegirPunto, enCiudad, finLocal, formularioDeEvento, mismaCalle, mismaCalleYNumero, nombresCoinciden, resolverLugar, tipoDeInstitucion } from "./instituciones";

describe("tipoDeInstitucion", () => {
  it("museo y escuela con su tipo, teatro con Foro, centro cultural con Casa de cultura, librería con Otro", () => {
    expect(tipoDeInstitucion({ categoria: "museo" })).toBe("museo");
    expect(tipoDeInstitucion({ categoria: "teatro" })).toBe("foro");
    expect(tipoDeInstitucion({ categoria: "centro_cultural" })).toBe("casa_de_cultura");
    expect(tipoDeInstitucion({ categoria: "escuela" })).toBe("escuela");
    expect(tipoDeInstitucion({ categoria: "libreria" })).toBe("otro");
  });

  it("el tipo escrito a mano gana", () => {
    expect(tipoDeInstitucion({ categoria: "espacio_independiente", tipo: "colectivo" })).toBe("colectivo");
  });
});

describe("nombresCoinciden", () => {
  it("el nombre corto dentro del largo, sin importar mayúsculas ni acentos", () => {
    expect(nombresCoinciden("Museo Laberinto de las Ciencias y las Artes", "Museo Laberinto")).toBe(true);
    expect(nombresCoinciden("Museo Nacional de la Máscara", "Museo de la Mascara")).toBe(true);
    expect(nombresCoinciden("Teatro de la Paz", "Teatro De La Paz")).toBe(true);
  });

  it("lo genérico no identifica ni confunde", () => {
    expect(nombresCoinciden("Casa de la Cultura de San Luis Potosí", "Casa de la Cultura de Soledad")).toBe(false);
    expect(nombresCoinciden("Teatro de la Paz", "Plaza de la Paz")).toBe(false);
    expect(nombresCoinciden("Museo Federico Silva", "Museo Regional Potosino")).toBe(false);
    expect(nombresCoinciden("Cineteca Alameda", "Alameda Juan Sarabia")).toBe(false);
  });
});

describe("dirección", () => {
  it("se busca sin ciudad, estado ni país", () => {
    expect(direccionParaBuscar("Av. Venustiano Carranza 1815, Tequisquiapan, 78250 San Luis Potosí, S.L.P.")).toBe("Av. Venustiano Carranza 1815, Tequisquiapan, 78250");
    expect(direccionParaBuscar("Jardín Guerrero 6, Centro, San Luis Potosí, S.L.P., México")).toBe("Jardín Guerrero 6, Centro");
  });

  it("la respuesta tiene que ser de la misma calle", () => {
    expect(mismaCalle("Av. Venustiano Carranza 1815", "Avenida Venustiano Carranza 1815, 78250 San Luis Potosí")).toBe(true);
    expect(mismaCalle("Av. Venustiano Carranza 1815", "Calle Zaragoza 200, San Luis Potosí")).toBe(false);
  });

  it("calle y número: el número de la casa, no el de la calle ni el código postal", () => {
    expect(mismaCalleYNumero("Santa Martha 521, Fracc. Rancho Blanco, Soledad de Graciano Sánchez", "Calle Sta. Martha 521, 78436 Soledad de Graciano Sánchez, Mexico")).toBe(true);
    expect(mismaCalleYNumero("Santa Martha 522, Fracc. Rancho Blanco", "Calle Sta. Martha 521, 78436 Soledad")).toBe(false);
    expect(mismaCalleYNumero("5 de Mayo 610, Centro Histórico", "Calle 5 de Mayo 1100, 78339 San Luis Potosí")).toBe(false);
    expect(mismaCalleYNumero("Av. Universidad s/n esq. Negrete, Centro", "Av. Universidad, 78000 San Luis Potosí")).toBe(false);
  });

  it("la caja de la ciudad incluye Soledad y deja fuera el resto del estado", () => {
    expect(enCiudad({ lat: 22.1497, lng: -100.9764 })).toBe(true);
    expect(enCiudad({ lat: 22.1833, lng: -100.9333 })).toBe(true);
    expect(enCiudad({ lat: 23.65, lng: -100.64 })).toBe(false);
  });
});

describe("elegirPunto", () => {
  const direccion = { lat: 22.15, lng: -100.976, direccion: "Calle 1" };
  const nombreCerca = { lat: 22.151, lng: -100.9765, direccion: "", nombre: "Museo" };
  const nombreLejos = { lat: 22.16, lng: -100.976, direccion: "", nombre: "Museo" };

  it("si por nombre y por dirección coinciden, gana el nombre (la puerta del edificio)", () => {
    expect(elegirPunto(null, nombreCerca, direccion)).toEqual({ punto: nombreCerca, como: "Mapbox por nombre", nota: null });
  });

  it("si discrepan, gana la dirección y se pide revisar; la fuente desempata", () => {
    const sinFuente = elegirPunto(null, nombreLejos, direccion);
    expect(sinFuente?.como).toBe("Mapbox por dirección");
    expect(sinFuente?.nota).toMatch(/revisar/);
    expect(elegirPunto({ ...nombreLejos, direccion: "" }, nombreLejos, direccion)?.como).toBe("Mapbox por nombre");
  });

  it("si discrepan pero el lugar por nombre está en la calle y el número investigados, gana el nombre", () => {
    const teatro = { ...nombreLejos, direccion: "Calle Sta. Martha 521, 78436 Soledad de Graciano Sánchez, Mexico", nombre: "Teatro Doroteo Arango" };
    expect(elegirPunto(null, teatro, direccion, "Santa Martha 521, Fracc. Rancho Blanco, Soledad de Graciano Sánchez, S.L.P.")?.como).toBe("Mapbox por nombre");
    expect(elegirPunto(null, teatro, direccion, "Santa Martha 800, Fracc. Rancho Blanco")?.como).toBe("Mapbox por dirección");
  });

  it("con solo la dirección, si la ficha oficial discrepa gana la ficha; con solo el nombre, se pide revisar", () => {
    const ficha = { lat: 22.1415, lng: -100.9731, direccion: "" };
    const interpolada = { lat: 22.1381, lng: -100.9714, direccion: "Calzada de Guadalupe 489" };
    expect(elegirPunto(ficha, null, interpolada)).toMatchObject({ punto: ficha, como: "coordenadas de la fuente" });
    expect(elegirPunto(ficha, { ...interpolada, nombre: "Casa de Cultura" }, null)).toMatchObject({ como: "Mapbox por nombre", nota: expect.stringMatching(/revisar/) });
  });

  it("sin Mapbox, la fuente con aviso; sin nada, null", () => {
    expect(elegirPunto(direccion, null, null)?.nota).toMatch(/revisar/);
    expect(elegirPunto(null, null, null)).toBeNull();
  });
});

describe("eventos propuestos", () => {
  const lugares = [
    { id: "a", nombre: "Teatro de la Paz" },
    { id: "b", nombre: "Museo Laberinto de las Ciencias y las Artes" },
    { id: "c", nombre: "Casa de la Cultura de San Luis Potosí" },
    { id: "d", nombre: "Casa de la Cultura de Soledad" },
  ];
  const base = { titulo: "Concierto de otoño", fecha: "2026-10-02", hora: "20:00", descripcion: "Programa de cámara." };

  it("el lugar se encuentra por su nombre aunque venga corto o sin acentos; lo ambiguo no se adivina", () => {
    expect(resolverLugar("teatro de la paz", lugares)?.id).toBe("a");
    expect(resolverLugar("Museo Laberinto", lugares)?.id).toBe("b");
    expect(resolverLugar("Casa de la Cultura", lugares)).toBeNull();
    expect(resolverLugar("Foro Desconocido", lugares)).toBeNull();
  });

  it("la hora de fin que no es posterior al inicio es del día siguiente", () => {
    expect(finLocal("2026-09-30", "19:00", "21:00")).toBe("2026-09-30T21:00");
    expect(finLocal("2026-09-30", "22:00", "01:00")).toBe("2026-10-01T01:00");
    expect(finLocal("2026-12-31", "22:00", "00:30")).toBe("2027-01-01T00:30");
    expect(finLocal("2026-09-30", "19:00", null)).toBe("");
  });

  it("gratis o con precio, en un lugar registrado o en otro sitio", () => {
    expect(formularioDeEvento({ ...base, precio: "Gratis" }, "a")).toMatchObject({ modo_sitio: "lugar", lugar_id: "a", gratis: "si", precio: "", inicio: "2026-10-02T20:00" });
    expect(formularioDeEvento({ ...base, precio: "$150" }, "a")).toMatchObject({ gratis: "no", precio: "$150" });
    expect(formularioDeEvento({ ...base, sitio: "Plaza de Armas" }, null)).toMatchObject({ modo_sitio: "otro", sitio_texto: "Plaza de Armas", gratis: "si" });
  });

  it("pasa la misma validación que el formulario de alta", () => {
    const { datos, errores } = validarEvento(formularioDeEvento({ ...base, precio: "$150", hora_fin: "22:00", enlace: "https://example.org/agenda" }, "11111111-1111-1111-1111-111111111111"));
    expect(errores).toEqual({});
    expect(datos.inicio).toBe("2026-10-03T02:00:00.000Z");
    expect(datos.fin).toBe("2026-10-03T04:00:00.000Z");
    expect(datos.precio).toBe("$150");
  });
});
