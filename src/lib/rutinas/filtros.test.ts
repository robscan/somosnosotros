import { describe, expect, it } from "vitest";
import { armarConocidos, cajaAlrededor, dentroDelArea, existeCerca, motivoPorNombre, municipioDeLaCiudad, nombresParecidos, otroMunicipioEnTexto, palabrasDeCiudad, radioDeCiudadKm, rechazadosNoCulturales } from "./filtros";

const SLP = { lat: 22.1497, lng: -100.9764 };
const NOMBRES = ["San Luis Potosí", "Soledad de Graciano Sánchez"];

describe("el área de la ciudad", () => {
  it("15 km con el zoom de ciudad; el doble por cada nivel menos, hasta 60", () => {
    expect(radioDeCiudadKm(13)).toBe(15);
    expect(radioDeCiudadKm(14)).toBe(15);
    expect(radioDeCiudadKm(12)).toBe(30);
    expect(radioDeCiudadKm(11)).toBe(60);
    expect(radioDeCiudadKm(5)).toBe(60);
    expect(radioDeCiudadKm(null)).toBe(15);
  });

  it("dentro: el Centro Histórico y Soledad; fuera: Ciudad Valles y Rioverde", () => {
    expect(dentroDelArea({ lat: 22.1514, lng: -100.9762 }, SLP, 15)).toBe(true);
    expect(dentroDelArea({ lat: 22.183, lng: -100.938 }, SLP, 15)).toBe(true);
    expect(dentroDelArea({ lat: 21.9833, lng: -99.0167 }, SLP, 15)).toBe(false);
    expect(dentroDelArea({ lat: 21.9293, lng: -99.9946 }, SLP, 15)).toBe(false);
  });

  it("la caja para Mapbox encierra el círculo (±15 km ≈ ±0,135° de latitud)", () => {
    const c = cajaAlrededor(SLP, 15);
    expect(c.norte - SLP.lat).toBeCloseTo(0.1347, 3);
    expect(c.este - SLP.lng).toBeGreaterThan(c.norte - SLP.lat);
    expect(c.oeste).toBeLessThan(SLP.lng);
  });

  it("el municipio de la fuente: la ciudad o un alias cuentan; otro municipio no; sin municipio decide el punto", () => {
    expect(municipioDeLaCiudad("San Luis Potosí", NOMBRES)).toBe(true);
    expect(municipioDeLaCiudad("SOLEDAD DE GRACIANO SANCHEZ", NOMBRES)).toBe(true);
    expect(municipioDeLaCiudad("San Luis Potosí, S.L.P.", NOMBRES)).toBe(true);
    expect(municipioDeLaCiudad("Villa de Pozos", NOMBRES)).toBe(false);
    expect(municipioDeLaCiudad("San Luis de la Paz", NOMBRES)).toBe(false);
    expect(municipioDeLaCiudad(null, NOMBRES)).toBe(true);
    expect(municipioDeLaCiudad("Santa Lucía del Camino", ["Oaxaca", "Oaxaca de Juárez"])).toBe(false);
  });
});

describe("nombres parecidos", () => {
  const ciudad = palabrasDeCiudad("San Luis Potosí");
  it("el mismo sitio dicho de otra manera", () => {
    expect(nombresParecidos("Museo Laberinto", "Museo Laberinto de las Ciencias y las Artes", ciudad)).toBe(true);
    expect(nombresParecidos("Teatro de la Paz", "Teatro de la Paz San Luis Potosí", ciudad)).toBe(true);
    expect(nombresParecidos("CENTRO DE LAS ARTES", "Centro de las Artes", ciudad)).toBe(true);
  });
  it("dos sitios distintos no se confunden", () => {
    expect(nombresParecidos("Casa de la Cultura", "Casa de la Cultura de Soledad", ciudad)).toBe(false);
    expect(nombresParecidos("Teatro de la Paz", "Plaza de la Paz", ciudad)).toBe(false);
    expect(nombresParecidos("Museo del Ferrocarril", "Museo de la Máscara", ciudad)).toBe(false);
  });
});

describe("lo que ya se conoce en la ciudad", () => {
  const conocidos = armarConocidos(
    [{ nombre: "Centro de las Artes", lat: 22.1453, lng: -100.9868 }],
    [
      { nombre: "Foro Ya Propuesto", estado: "propuesta", motivo: null },
      { nombre: "Galería Aceptada", estado: "aceptada", motivo: null },
      { nombre: "Salón de Fiestas Los Arcos", estado: "rechazada", motivo: "no_cultural" },
      { nombre: "Patio de Otro Municipio", estado: "rechazada", motivo: "fuera_de_la_ciudad" },
    ],
    NOMBRES,
  );

  it("lo rechazado no vuelve, con cualquier motivo y escrito como sea (la rutina aprende)", () => {
    expect(motivoPorNombre("SALÓN DE FIESTAS LOS ARCOS", conocidos)).toBe("rechazado_antes");
    expect(motivoPorNombre("Patio de otro municipio", conocidos)).toBe("rechazado_antes");
  });
  it("lo que ya está en el directorio o ya se propuso, tampoco", () => {
    expect(motivoPorNombre("centro de las artes", conocidos)).toBe("ya_existe");
    expect(motivoPorNombre("Foro ya propuesto", conocidos)).toBe("ya_propuesto");
    expect(motivoPorNombre("Galería Aceptada", conocidos)).toBe("ya_propuesto");
    expect(motivoPorNombre("Foro Nuevo", conocidos)).toBeNull();
  });
  it("con el punto: un nombre parecido a menos de 150 m ya existe; lejos, no", () => {
    expect(existeCerca("Centro de las Artes San Luis", { lat: 22.1455, lng: -100.987 }, conocidos)).toBe(true);
    expect(existeCerca("Centro de las Artes San Luis", { lat: 22.16, lng: -100.95 }, conocidos)).toBe(false);
    expect(existeCerca("Foro Nuevo", { lat: 22.1453, lng: -100.9868 }, conocidos)).toBe(false);
  });
  it("los rechazados por no ser culturales se le enseñan al modelo; la lista de conocidos no repite", () => {
    expect(rechazadosNoCulturales([{ nombre: "Salón X", estado: "rechazada", motivo: "no_cultural" }, { nombre: "Y", estado: "rechazada", motivo: "duplicado" }])).toEqual(["Salón X"]);
    expect(conocidos.lista).toEqual(["Foro Ya Propuesto", "Galería Aceptada", "Salón de Fiestas Los Arcos", "Patio de Otro Municipio", "Centro de las Artes"]);
  });
});

describe("otro municipio en el texto de la agenda (OL-433)", () => {
  it("«Cd. Valles», «Ciudad Fernández» o «municipio de Rioverde» junto a la sede: es de otro municipio", () => {
    expect(otroMunicipioEnTexto(["Museo Tamuantzán, Cd. Valles", null], NOMBRES)).toBe("valles");
    expect(otroMunicipioEnTexto(["Casa de Cultura de Ciudad Fernández"], NOMBRES)).toBe("fernandez");
    expect(otroMunicipioEnTexto(["Plaza principal", "municipio de Rioverde"], NOMBRES)).toBe("rioverde");
    expect(otroMunicipioEnTexto(["Jardín, Cd. del Maíz"], NOMBRES)).toBe("del maiz");
  });

  it("la ciudad misma, sus alias, «Ciudad Universitaria» o nada de eso: no decide (decide el mapa)", () => {
    expect(otroMunicipioEnTexto(["Teatro de la Paz", "San Luis Potosí"], NOMBRES)).toBeNull();
    expect(otroMunicipioEnTexto(["Plaza de Armas, Ciudad de San Luis Potosí"], NOMBRES)).toBeNull();
    expect(otroMunicipioEnTexto(["Casa de la Cultura", "municipio de Soledad de Graciano Sánchez"], NOMBRES)).toBeNull();
    expect(otroMunicipioEnTexto(["Auditorio de Ciudad Universitaria"], NOMBRES)).toBeNull();
    expect(otroMunicipioEnTexto(["Museo Tamuantzán"], NOMBRES)).toBeNull();
    expect(otroMunicipioEnTexto(["Palacio de Bellas Artes", "Ciudad de México"], ["Ciudad de México"])).toBeNull();
  });
});
