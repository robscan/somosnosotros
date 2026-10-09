import { describe, expect, it } from "vitest";
import { cuandoSeRenueva, detalleDeLecturas, falloAlSubir, falloDeCorte, lecturaAgotada, lecturasQueQuedan, mesDelCupo, seLee } from "./estadoCartel";

/**
 * Los estados de la tarjeta del cartel. Las tres primeras pruebas salen de la revisión de la bitácora 095:
 * que un corte a mitad no deje la tarjeta colgada, que el fallo de subida no repita el titular, y que la
 * foto que ya estaba no se pierda cuando la nueva no llega.
 */
describe("estado del cartel", () => {
  it("un corte a mitad cae en fallo y no se queda leyendo", () => {
    const enMedio = { estado: "leyendo", foto: "https://x/nueva.jpg" } as const;
    const r = falloDeCorte(enMedio, null);
    expect(r.estado).toBe("fallo");
    expect(r.titulo).toBe("Se cortó a la mitad");
    expect(r.mensaje).toBe("Puede ser tu conexión.");
    expect(r.foto).toBe("https://x/nueva.jpg");
  });

  it("si el corte pasa antes de subir, se recupera la foto que ya estaba", () => {
    expect(falloDeCorte({ estado: "leyendo" }, "https://x/la-del-evento.jpg").foto).toBe("https://x/la-del-evento.jpg");
    expect(falloDeCorte(null, null).foto).toBeUndefined();
  });

  it("el fallo de subida dice la causa, no la orden que ya da el chip", () => {
    const pesa = falloAlSubir(null, "La imagen pesa más de 5 MB. Elige otra.", "pesa");
    expect(pesa.titulo).toBe("No pude subir el cartel");
    expect(pesa.mensaje).toBe("La imagen pesa más de 5 MB.");
    // Ni repite el titular ("no se pudo") ni el chip de abajo ("Probar con otra foto").
    const generico = falloAlSubir(null, "No se pudo subir la imagen. Intenta con otra.", "subida");
    expect(generico.mensaje).toBe("Puede ser tu conexión.");
    expect(generico.mensaje).not.toMatch(/otra foto|no se pudo/i);
    // OL-352: la imagen que el teléfono no pudo leer dice eso, sin el «Prueba con otra» que ya da el chip.
    expect(falloAlSubir(null, "No se pudo leer la imagen. Prueba con otra.", "lectura").mensaje).toBe("No se pudo leer la imagen.");
  });

  it("lo que se conserva es la imagen del evento, que es la que se publica", () => {
    // Si por "Más" se cambió la imagen, decir "el cartel de antes" sería mentira: se habla de la imagen real.
    const r = falloAlSubir("https://x/la-del-evento.jpg", "No se pudo subir la imagen. Intenta con otra.", "subida");
    expect(r.foto).toBe("https://x/la-del-evento.jpg");
    expect(r.mensaje).toBe("Puede ser tu conexión. La imagen que ya tenías se queda.");
    expect(falloAlSubir(null, "x", "subida").foto).toBeUndefined();
  });
});

/** El cupo de lecturas del mes (docs/rediseno/23): cuándo vuelve a haber. */
describe("cupo de lecturas", () => {
  it("dice cuándo se renueva, y en diciembre pasa a enero", () => {
    expect(cuandoSeRenueva(new Date("2026-09-17T21:00:00Z"))).toBe("el 1 de octubre");
    expect(cuandoSeRenueva(new Date("2026-12-31T23:00:00Z"))).toBe("el 1 de enero");
    expect(cuandoSeRenueva(new Date("2026-01-05T12:00:00Z"))).toBe("el 1 de febrero");
  });

  it.each(["Asia/Tokyo", "UTC", "America/Mexico_City"])("renueva segun Mexico aunque el dispositivo este en %s", (tz) => {
    const previa = process.env.TZ;
    try {
      process.env.TZ = tz;
      expect(mesDelCupo(new Date("2026-10-01T05:59:59Z"))).toBe("2026-09");
      expect(cuandoSeRenueva(new Date("2026-10-01T05:59:59Z"))).toBe("el 1 de octubre");
      expect(mesDelCupo(new Date("2026-10-01T06:00:00Z"))).toBe("2026-10");
      expect(cuandoSeRenueva(new Date("2026-10-01T06:00:00Z"))).toBe("el 1 de noviembre");
      expect(cuandoSeRenueva(new Date("2027-01-01T05:59:59Z"))).toBe("el 1 de enero");
    } finally {
      if (previa === undefined) delete process.env.TZ;
      else process.env.TZ = previa;
    }
  });
});

/** La lectura automática del alta por pasos y del perfil (OL-307, bitácora 335): seis al mes por cuenta, qué dice el contador y cuándo se lee. */
describe("lectura automática", () => {
  const cupo = (cambios = {}) => ({ usadas: 0, tope: 6, sinTope: false, ...cambios });

  it("cuenta las que quedan de las seis, nunca menos de cero, y la administración no tiene cuenta", () => {
    expect(lecturasQueQuedan(cupo())).toBe(6);
    expect(lecturasQueQuedan(cupo({ usadas: 2 }))).toBe(4);
    expect(lecturasQueQuedan(cupo({ usadas: 6 }))).toBe(0);
    expect(lecturasQueQuedan(cupo({ usadas: 9 }))).toBe(0);
    expect(lecturasQueQuedan(cupo({ usadas: 70, sinTope: true }))).toBeNull();
    expect(lecturasQueQuedan(null)).toBeNull();
  });

  it("se agota con la sexta; sin saber el cupo no se asume que se agotó", () => {
    expect(lecturaAgotada(cupo({ usadas: 5 }))).toBe(false);
    expect(lecturaAgotada(cupo({ usadas: 6 }))).toBe(true);
    expect(lecturaAgotada(cupo({ usadas: 70, sinTope: true }))).toBe(false);
    expect(lecturaAgotada(null)).toBe(false);
  });

  it("dice «Quedan N este mes», «Queda 1», cuándo se renueva con ninguna y «Sin límite» sin tope; sin cupo, nada", () => {
    const ahora = new Date("2026-10-06T18:00:00Z");
    expect(detalleDeLecturas(cupo({ usadas: 2 }), ahora)).toBe("Quedan 4 este mes");
    expect(detalleDeLecturas(cupo(), ahora)).toBe("Quedan 6 este mes");
    expect(detalleDeLecturas(cupo({ usadas: 5 }), ahora)).toBe("Queda 1 este mes");
    expect(detalleDeLecturas(cupo({ usadas: 6 }), ahora)).toBe("Se renueva el 1 de noviembre");
    expect(detalleDeLecturas(cupo({ usadas: 70, sinTope: true }), ahora)).toBe("Sin límite");
    expect(detalleDeLecturas(null, ahora)).toBeNull();
    for (const q of [0, 1, 2, 5, 6]) expect(detalleDeLecturas(cupo({ usadas: 6 - q }), ahora)).not.toMatch(/gratis/i);
  });

  it("se lee solo con servicio, con la casilla marcada y con lecturas que quedan", () => {
    const base = { servicio: true, marcada: true, cupo: cupo({ usadas: 2 }) };
    expect(seLee(base)).toBe(true);
    expect(seLee({ ...base, marcada: false })).toBe(false);
    expect(seLee({ ...base, servicio: false })).toBe(false);
    expect(seLee({ ...base, cupo: cupo({ usadas: 6 }) })).toBe(false);
    expect(seLee({ ...base, cupo: cupo({ usadas: 5 }) })).toBe(true);
  });

  it("la administración lee siempre que marque la casilla, y sin saber el cupo se intenta: el servidor decide", () => {
    expect(seLee({ servicio: true, marcada: true, cupo: cupo({ usadas: 70, sinTope: true }) })).toBe(true);
    expect(seLee({ servicio: true, marcada: true, cupo: null })).toBe(true);
    expect(seLee({ servicio: true, marcada: false, cupo: null })).toBe(false);
  });
});
