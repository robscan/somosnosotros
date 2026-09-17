import { describe, expect, it } from "vitest";
import { ZONA_INICIAL } from "./fechas";
import { zonaDelSitio, zonaDePunto } from "./zona";

describe("zona de un punto", () => {
  it("da la zona de donde está, en México y fuera", () => {
    expect(zonaDePunto(22.1497, -100.9764)).toBe("America/Mexico_City"); // San Luis Potosí
    expect(zonaDePunto(21.1619, -86.8515)).toBe("America/Cancun");
    expect(zonaDePunto(32.5149, -117.0382)).toBe("America/Tijuana");
    expect(zonaDePunto(9.9281, -84.0907)).toBe("America/Costa_Rica");
    expect(zonaDePunto(40.4168, -3.7038)).toBe("Europe/Madrid");
    expect(zonaDePunto(28.1235, -15.4363)).toBe("Atlantic/Canary");
    expect(zonaDePunto(-31.4201, -64.1888)).toBe("America/Argentina/Cordoba");
  });
  it("sin punto o con uno imposible, la de la ciudad inicial", () => {
    expect(zonaDePunto(null, null)).toBe(ZONA_INICIAL);
    expect(zonaDePunto(undefined, -100)).toBe(ZONA_INICIAL);
    expect(zonaDePunto(Number.NaN, -100)).toBe(ZONA_INICIAL);
    expect(zonaDePunto(123, -100)).toBe(ZONA_INICIAL);
  });
});

describe("zona del sitio de un evento", () => {
  it("la del punto público, la del reservado si lo es, y sin punto la de la ciudad inicial, como al guardar", () => {
    expect(zonaDelSitio({ sitio_lat: 40.4153, sitio_lng: -3.6845 })).toBe("Europe/Madrid");
    expect(zonaDelSitio({ sitio_reservado: true, sitio_lat: 40.4, sitio_lng: -3.7 }, { lat: 4.6, lng: -74.08 })).toBe("America/Bogota");
    expect(zonaDelSitio({ sitio_reservado: true }, null)).toBe(ZONA_INICIAL);
    expect(zonaDelSitio({ sitio_lat: null, sitio_lng: null })).toBe(ZONA_INICIAL);
    expect(zonaDelSitio(undefined)).toBe(ZONA_INICIAL);
  });
});
