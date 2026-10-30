import { describe, expect, it } from "vitest";
import { lineaInstagram, lineaRutinas, lineaShowcase, pendienteInstagram } from "./portadaAdmin";

// miércoles 7 de octubre de 2026, 10:00 en la Ciudad de México (el reloj de `medir`)
const AHORA = new Date("2026-10-07T16:00:00Z");

describe("las líneas de estado de la portada (OL-494, textos de la bitácora 525)", () => {
  it("Instagram: la cuenta, lo publicado y lo que se queda sin material", () => {
    expect(lineaInstagram("smsnstrsapp", 4, 5)).toBe("@smsnstrsapp · 4 publicadas esta semana · 5 sin material");
    expect(lineaInstagram("smsnstrsapp", 1, 0)).toBe("@smsnstrsapp · 1 publicada esta semana");
    expect(lineaInstagram("smsnstrsapp", 0, null)).toBe("@smsnstrsapp · 0 publicadas esta semana");
    // Lo que no se pudo leer no se escribe: nunca un cero inventado.
    expect(lineaInstagram("smsnstrsapp", null, null)).toBe("@smsnstrsapp");
  });
  it("Showcase: qué es y sus dos cifras", () => {
    expect(lineaShowcase({ candidatos: 16, invitados: 2 })).toBe("Artistas para presentar a foros · 16 candidatos · 2 invitados");
    expect(lineaShowcase({ candidatos: 1, invitados: 0 })).toBe("Artistas para presentar a foros · 1 candidato");
    expect(lineaShowcase(null)).toBe("Artistas para presentar a foros");
  });
  it("Rutinas: el interruptor en palabras y el crédito", () => {
    expect(lineaRutinas(false, "192,29")).toBe("Completar fichas: apagada · 192,29 USD de crédito");
    expect(lineaRutinas(true, "192,29")).toBe("Completar fichas: encendida · 192,29 USD de crédito");
    expect(lineaRutinas(null, null)).toBe("Las que corren solas cada semana");
  });
});

describe("«Instagram dejó de publicar» en Pendiente (OL-494)", () => {
  const fallo = (error: string, terminado_en = "2026-10-05T18:00:00Z") => ({ estado: "fallido", error, terminado_en });
  it("nada si el último trabajo salió o no hay ninguno", () => {
    expect(pendienteInstagram(null, null, null, AHORA)).toBeNull();
    expect(pendienteInstagram({ estado: "publicado", error: null, terminado_en: "2026-10-06T18:00:00Z" }, null, null, AHORA)).toBeNull();
  });
  it("la conexión caducó: el permiso falló después de la última conexión", () => {
    expect(pendienteInstagram(fallo("permiso"), "2026-10-01T12:00:00Z", null, AHORA)).toEqual({ titulo: "Instagram dejó de publicar", detalle: "La conexión caducó el lun 5 de oct: reconecta" });
    expect(pendienteInstagram(fallo("permiso"), null, null, AHORA)?.detalle).toBe("La conexión caducó el lun 5 de oct: reconecta");
  });
  it("si se reconectó después del fallo, ya no pide nada", () => {
    expect(pendienteInstagram(fallo("permiso"), "2026-10-06T12:00:00Z", null, AHORA)).toBeNull();
  });
  it("otro error: qué no salió y por qué, en llano", () => {
    expect(pendienteInstagram(fallo("imagen"), null, "Noche de son huasteco", AHORA)?.detalle).toBe("No salió «Noche de son huasteco»: Instagram no aceptó la imagen");
    expect(pendienteInstagram(fallo("cupo"), null, null, AHORA)?.detalle).toBe("La última no salió: hoy ya van 100 publicaciones en Instagram");
    expect(pendienteInstagram(fallo("raro"), null, null, AHORA)?.detalle).toBe("La última no salió: Instagram no respondió");
  });
  it("un evento que ya había empezado no es que Instagram dejara de publicar", () => {
    expect(pendienteInstagram(fallo("empezo"), null, "Taller", AHORA)).toBeNull();
  });
});
