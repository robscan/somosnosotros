import { describe, expect, it } from "vitest";
import { distanciaKm } from "@/lib/geo";
import {
  aliasNuevos,
  armarSugerencias,
  existenteDe,
  leerLugaresMapbox,
  municipiosDelArea,
  nombreCorto,
  nombreZona,
  puntosDeMuestra,
  RADIO_ALTA_KM,
  textoArea,
  textoHora,
  urlMapaArea,
  zoomParaArea,
  type CiudadExistente,
  type LugarMapbox,
} from "./alta";
import { baseMapbox } from "./mapbox";

// Miércoles 21 de octubre de 2026, 10:00 en San Luis Potosí.
const AHORA = new Date("2026-10-21T16:00:00Z");
const lugar = (nombre: string, region: string | null, extra: Partial<LugarMapbox> = {}): LugarMapbox => ({ nombre, region, pais: "México", codigoPais: "MX", lat: 17.0654, lng: -96.7236, ...extra });

describe("lo que dice Mapbox (Geocoding v6)", () => {
  it("lee nombre, estado, país y centro; ignora lo que no trae nombre o centro y no repite", () => {
    const f = (name: unknown, lat: unknown, region = "Oaxaca") => ({ properties: { name, coordinates: { latitude: lat, longitude: -96.72 }, context: { region: { name: region }, country: { name: "México", country_code: "mx" } } } });
    expect(leerLugaresMapbox({ features: [f("Oaxaca de Juárez", 17.06), f("Oaxaca de Juárez", 17.07), f("", 17), f("Sin centro", null), f("Salina Cruz", 16.17)] })).toEqual([
      { nombre: "Oaxaca de Juárez", region: "Oaxaca", pais: "México", codigoPais: "MX", lat: 17.06, lng: -96.72 },
      { nombre: "Salina Cruz", region: "Oaxaca", pais: "México", codigoPais: "MX", lat: 16.17, lng: -96.72 },
    ]);
    expect(leerLugaresMapbox(null)).toEqual([]);
    expect(leerLugaresMapbox({ features: "x" })).toEqual([]);
  });
  it("la dirección de Mapbox solo cambia hacia 127.0.0.1 (el respaldo local): el token nunca sale a otro sitio", () => {
    expect(baseMapbox(undefined)).toBe("https://api.mapbox.com");
    expect(baseMapbox("http://127.0.0.1:8823/mapbox/")).toBe("http://127.0.0.1:8823/mapbox");
    expect(baseMapbox("https://otro.example")).toBe("https://api.mapbox.com");
    expect(baseMapbox("http://127.0.0.1.example.com")).toBe("https://api.mapbox.com");
    expect(baseMapbox("http://localhost:8823")).toBe("https://api.mapbox.com");
  });
});

describe("el nombre en la app (respuesta 1)", () => {
  it("si el de Mapbox contiene el de su estado y es más largo, el del estado", () => {
    expect(nombreCorto(lugar("Oaxaca de Juárez", "Oaxaca"))).toBe("Oaxaca");
    expect(nombreCorto(lugar("Santiago de Querétaro", "Querétaro"))).toBe("Querétaro");
    expect(nombreCorto(lugar("Heroica Puebla de Zaragoza", "Puebla"))).toBe("Puebla");
  });
  it("si no, el de Mapbox tal cual", () => {
    expect(nombreCorto(lugar("San Luis Potosí", "San Luis Potosí"))).toBe("San Luis Potosí");
    expect(nombreCorto(lugar("Soledad de Graciano Sánchez", "San Luis Potosí"))).toBe("Soledad de Graciano Sánchez");
    expect(nombreCorto(lugar("Juchitán de Zaragoza", "Oaxaca"))).toBe("Juchitán de Zaragoza");
    expect(nombreCorto(lugar("Guadalajara", "Jalisco"))).toBe("Guadalajara");
  });
  it("fuera de México lleva su país, como la guarda la app; no dos veces", () => {
    expect(nombreCorto(lugar("Córdoba", "Andalucía", { pais: "España", codigoPais: "ES" }))).toBe("Córdoba, España");
    expect(nombreCorto(lugar("Córdoba, España", null, { pais: "España", codigoPais: "ES" }))).toBe("Córdoba, España");
  });
  it("los alias: el de Mapbox y los municipios del área, sin repetir y sin el nombre de la app", () => {
    expect(aliasNuevos("Oaxaca", ["Oaxaca de Juárez", "Santa Lucía del Camino", "oaxaca", "Santa Lucia del Camino", null, "  "])).toEqual(["Oaxaca de Juárez", "Santa Lucía del Camino"]);
  });
});

describe("el área (respuesta 2)", () => {
  it("diecisiete muestras: el centro, ocho a medio radio y ocho casi en el borde, todas dentro", () => {
    const centro = { lat: 17.0654, lng: -96.7236 };
    const p = puntosDeMuestra(centro, RADIO_ALTA_KM);
    expect(p).toHaveLength(17);
    expect(p[0]).toEqual(centro);
    for (const x of p) expect(distanciaKm(centro, x)).toBeLessThanOrEqual(RADIO_ALTA_KM);
    expect(Math.max(...p.map((x) => distanciaKm(centro, x)))).toBeGreaterThan(14);
  });
  it("los municipios que caen en ella, del centro hacia fuera, sin la ciudad ni repetidos", () => {
    const muestras = ["Oaxaca de Juárez", "Santa Lucía del Camino", null, "Oaxaca de Juárez", "Santa Cruz Xoxocotlán", "Santa Lucía del Camino"];
    expect(municipiosDelArea(muestras, ["Oaxaca", "Oaxaca de Juárez"])).toEqual(["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"]);
  });
  it("en una línea: el radio y qué cuenta; con alcaldías, solo ellas; sin respuesta de Mapbox, lo dice", () => {
    expect(textoArea(15, ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"])).toEqual({ titulo: "15 km alrededor del centro", detalle: "Cuenta también Santa Lucía del Camino y Santa Cruz Xoxocotlán" });
    expect(textoArea(15, [])).toEqual({ titulo: "15 km alrededor del centro", detalle: "Solo su municipio" });
    expect(textoArea(15, null).detalle).toBe("No pudimos ver qué municipios caen en el área");
    expect(textoArea(15, ["a", "b", "c", "d", "e", "f"]).detalle).toBe("Cuenta también a, b y 4 más");
    const cdmx = ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez", "Álvaro Obregón"];
    expect(textoArea(12, null, cdmx)).toEqual({ titulo: "12 km alrededor del centro", detalle: "Solo cuentan Cuauhtémoc, Miguel Hidalgo, Coyoacán, Benito Juárez y Álvaro Obregón" });
    expect(textoArea(7.5, []).titulo).toBe("7,5 km alrededor del centro");
  });
  it("el mapa chico: centrado en la ciudad, con el zoom del área; sin token, ninguno", () => {
    const url = urlMapaArea({ lat: 17.0654, lng: -96.7236 }, 15, "pk.prueba");
    expect(url).toMatch(/^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/light-v11\/static\/-96\.7236,17\.0654,8\.\d+,0\/600x240@2x\?access_token=pk\.prueba$/);
    expect(urlMapaArea({ lat: 17, lng: -96 }, 15, null)).toBeNull();
    expect(zoomParaArea(17, 15)).toBeGreaterThan(zoomParaArea(17, 30));
  });
});

describe("la hora (pantalla C)", () => {
  const slp = { nombre: "San Luis Potosí", zona: "America/Mexico_City" };
  it("las de México por su nombre de siempre y comparada con San Luis Potosí", () => {
    expect(textoHora("America/Mexico_City", slp, AHORA)).toEqual({ titulo: "Hora del centro de México", detalle: "La misma de San Luis Potosí" });
    expect(textoHora("America/Cancun", slp, AHORA)).toEqual({ titulo: "Hora del sureste de México", detalle: "1 hora más que San Luis Potosí" });
    expect(textoHora("America/Tijuana", slp, AHORA)).toEqual({ titulo: "Hora del noroeste de México", detalle: "1 hora menos que San Luis Potosí" });
    expect(textoHora("America/Mexico_City", null, AHORA)).toEqual({ titulo: "Hora del centro de México", detalle: null });
  });
  it("las demás, como las nombra el navegador", () => {
    expect(nombreZona("Europe/Madrid", AHORA)).toBe("Hora de Europa central");
    expect(textoHora("Europe/Madrid", slp, AHORA).detalle).toBe("8 horas más que San Luis Potosí");
  });
});

describe("las sugerencias (pantalla B)", () => {
  const ciudad = (slug: string, nombre: string, estado: CiudadExistente["estado"], consultas: number, alias: string[] = []): CiudadExistente => ({ slug, nombre, alias, estado, consultas });
  const slp = ciudad("san-luis-potosi", "San Luis Potosí", "abierta", 125, ["Soledad de Graciano Sánchez"]);
  const sma = ciudad("san-miguel-de-allende", "San Miguel de Allende", "abierta", 31);
  const ags = ciudad("aguascalientes", "Aguascalientes", "detectada", 9);
  it("una que ya está, por su nombre, su slug o sus alias", () => {
    expect(existenteDe(["Soledad de Graciano Sánchez"], [slp, sma])?.slug).toBe("san-luis-potosi");
    expect(existenteDe(["Oaxaca"], [slp, sma])).toBeNull();
  });
  it("primero las que ya están (por consultas, con su estado y país si Mapbox los dio), luego las nuevas de Mapbox; seis como mucho", () => {
    const mapbox = [lugar("San Luis Potosí", "San Luis Potosí"), lugar("San Cristóbal de las Casas", "Chiapas"), lugar("San Juan del Río", "Querétaro"), lugar("Santa Lucía del Camino", "Oaxaca")];
    const s = armarSugerencias("san", [ags, sma, slp], mapbox);
    expect(s.map((x) => (x.tipo === "existente" ? `${x.nombre} (${x.estado}) · ${x.detalle}` : `${x.lugar.nombre} · ${x.detalle}`))).toEqual([
      "San Luis Potosí (abierta) · San Luis Potosí, México",
      "San Miguel de Allende (abierta) · 31 consultas en 30 días",
      "San Cristóbal de las Casas · Chiapas, México",
      "San Juan del Río · Querétaro, México",
      "Santa Lucía del Camino · Oaxaca, México",
    ]);
  });
  it("un municipio que ya cuenta con otra ciudad sale con su nombre y «Cuenta con…», sin píldora", () => {
    const oax = ciudad("oaxaca", "Oaxaca", "abierta", 51, ["Oaxaca de Juárez", "Santa Lucía del Camino"]);
    const s = armarSugerencias("san", [slp, oax], [lugar("Santa Lucía del Camino", "Oaxaca"), lugar("San Cristóbal de las Casas", "Chiapas")]);
    expect(s).toEqual([
      { tipo: "existente", slug: "san-luis-potosi", nombre: "San Luis Potosí", estado: "abierta", pildora: true, detalle: "125 consultas en 30 días" },
      { tipo: "existente", slug: "oaxaca", nombre: "Santa Lucía del Camino", estado: "abierta", pildora: false, detalle: "Cuenta con Oaxaca" },
      { tipo: "nueva", clave: "san-cristobal-de-las-casas:17.065,-96.724", lugar: lugar("San Cristóbal de las Casas", "Chiapas"), detalle: "Chiapas, México" },
    ]);
  });
  it("una de Mapbox que ya está con otro nombre sale una vez, como la que ya está", () => {
    const oax = ciudad("oaxaca", "Oaxaca", "detectada", 4, ["Oaxaca de Juárez"]);
    const s = armarSugerencias("oaxa", [oax], [lugar("Oaxaca de Juárez", "Oaxaca"), lugar("Juchitán de Zaragoza", "Oaxaca")]);
    expect(s.map((x) => (x.tipo === "existente" ? x.slug : x.lugar.nombre))).toEqual(["oaxaca", "Juchitán de Zaragoza"]);
  });
});
