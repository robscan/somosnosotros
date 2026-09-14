import { describe, expect, it } from "vitest";
import { cartelAFormulario, enlaceDesdeCartel, nombreSitio, textoCompartir, validarEvento } from "./eventos";

const LUGAR = "2a63c4d0-6a3e-4d75-bc67-8c3226d4401b";
const base = { modo_sitio: "lugar", lugar_id: LUGAR, titulo: "Noche de jazz", inicio: "2026-09-20T19:00", fin: "", descripcion: "", imagen: "", gratis: "si", precio: "", enlace: "" };

describe("validarEvento", () => {
  it("acepta un evento mínimo en un lugar registrado; gratis por defecto", () => {
    const { datos, errores } = validarEvento(base);
    expect(errores).toEqual({});
    expect(datos.inicio).toBe("2026-09-21T01:00:00.000Z");
    expect(datos.precio).toBeNull();
    expect(datos.lugar_id).toBe(LUGAR);
    expect(datos.sitio_reservado).toBe(false);
    expect(datos.privado).toBeNull();
  });
  it("sin fecha no se publica; el fin va después del inicio", () => {
    expect(validarEvento({ ...base, inicio: "" }).errores.inicio).toBeTruthy();
    expect(validarEvento({ ...base, fin: "2026-09-20T18:00" }).errores.fin).toBeTruthy();
    expect(validarEvento({ ...base, fin: "2026-09-20T21:00" }).errores).toEqual({});
  });
  it("con precio hay que decir cuánto; el enlace se completa con https", () => {
    expect(validarEvento({ ...base, gratis: "no", precio: "" }).errores.precio).toBeTruthy();
    const { datos } = validarEvento({ ...base, gratis: "no", precio: "$150", enlace: "boletos.mx/jazz" });
    expect(datos.precio).toBe("$150");
    expect(datos.enlace).toBe("https://boletos.mx/jazz");
  });
  it("otro sitio: texto obligatorio, pin opcional, sin lugar", () => {
    expect(validarEvento({ ...base, modo_sitio: "otro", sitio_texto: "" }).errores.sitio_texto).toBeTruthy();
    const { datos, errores } = validarEvento({ ...base, modo_sitio: "otro", sitio_texto: "Plaza de Armas", sitio_lat: "22.15", sitio_lng: "-100.97" });
    expect(errores).toEqual({});
    expect(datos.lugar_id).toBeNull();
    expect(datos.sitio_texto).toBe("Plaza de Armas");
    expect(datos.sitio_lat).toBeCloseTo(22.15);
  });
  it("sitio reservado: texto público, dirección privada y hora de revelar", () => {
    expect(validarEvento({ ...base, modo_sitio: "reservado", sitio_texto: "Casa en Tequis" }).errores.direccion_privada).toBeTruthy();
    const { datos, errores } = validarEvento({ ...base, modo_sitio: "reservado", sitio_texto: "Casa en Tequis", direccion_privada: "Calle X 12", indicaciones: "Tocar el timbre azul", revelar_horas: "24" });
    expect(errores).toEqual({});
    expect(datos.sitio_reservado).toBe(true);
    expect(datos.sitio_texto).toBe("Casa en Tequis");
    expect(datos.sitio_revelar_desde).toBe("2026-09-20T01:00:00.000Z"); // 24 h antes de las 19:00 del 20
    expect(datos.privado).toEqual({ direccion: "Calle X 12", lat: null, lng: null, indicaciones: "Tocar el timbre azul", revelar_desde: "2026-09-20T01:00:00.000Z" });
  });
  it("lugar registrado inválido", () => {
    expect(validarEvento({ ...base, lugar_id: "x" }).errores.lugar_id).toBeTruthy();
  });
});

describe("nombreSitio", () => {
  it("prefiere el lugar; marca el sitio reservado", () => {
    expect(nombreSitio({ lugar: { nombre: "Teatro", portada: null }, sitio_texto: null, sitio_reservado: false })).toBe("Teatro");
    expect(nombreSitio({ lugar: null, sitio_texto: "Casa en Tequis", sitio_reservado: true })).toBe("Casa en Tequis · sitio reservado");
    expect(nombreSitio({ lugar: null, sitio_texto: null, sitio_reservado: false })).toBe("Sitio por confirmar");
  });
});

describe("cartelAFormulario", () => {
  it("convierte la lectura en valores del formulario y tolera huecos", () => {
    const v = cartelAFormulario({ titulo: " Noche de jazz ", fecha: "2026-09-20", hora: "20:30", hora_fin: "22:00", lugar: "Casa 1100", direccion: null, gratis: false, precio: "$150", descripcion: "Trío local.", enlace: null });
    expect(v.inicio).toBe("2026-09-20T20:30");
    expect(v.fin).toBe("2026-09-20T22:00");
    expect(v.gratis).toBe(false);
    expect(v.titulo).toBe("Noche de jazz");
    const sinHora = cartelAFormulario({ titulo: null, fecha: "2026-09-20", hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null });
    expect(sinHora.inicio).toBe("2026-09-20T19:00");
    expect(sinHora.gratis).toBe(true);
    expect(cartelAFormulario({ titulo: "x", fecha: "20 sep", hora: "8pm", hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null }).inicio).toBe("");
  });
});

describe("enlaceDesdeCartel", () => {
  it("convierte @usuario en Instagram, deja enlaces y descarta teléfonos", () => {
    expect(enlaceDesdeCartel("@casa1100slp")).toBe("https://instagram.com/casa1100slp");
    expect(enlaceDesdeCartel("boletos.mx/jazz")).toBe("boletos.mx/jazz");
    expect(enlaceDesdeCartel("https://x.org")).toBe("https://x.org");
    expect(enlaceDesdeCartel("444 123 4567")).toBe("");
    expect(enlaceDesdeCartel(null)).toBe("");
  });
});

describe("textoCompartir", () => {
  it("arma título, cuándo, dónde y enlace", () => {
    expect(textoCompartir("Noche de jazz", "Hoy · 19:00", "Teatro de la Paz", "https://somosnosotros.org/eventos/1")).toBe(
      "Noche de jazz\nHoy · 19:00 · Teatro de la Paz\nhttps://somosnosotros.org/eventos/1",
    );
  });
});
