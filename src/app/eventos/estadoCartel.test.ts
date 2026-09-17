import { describe, expect, it } from "vitest";
import { falloAlLeer, falloAlSubir, falloDeCorte, leido } from "./estadoCartel";

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
  });

  it("lo que se conserva es la imagen del evento, que es la que se publica", () => {
    // Si por "Más" se cambió la imagen, decir "el cartel de antes" sería mentira: se habla de la imagen real.
    const r = falloAlSubir("https://x/la-del-evento.jpg", "No se pudo subir la imagen. Intenta con otra.", "subida");
    expect(r.foto).toBe("https://x/la-del-evento.jpg");
    expect(r.mensaje).toBe("Puede ser tu conexión. La imagen que ya tenías se queda.");
    expect(falloAlSubir(null, "x", "subida").foto).toBeUndefined();
  });

  it("leer y fallar al leer se quedan con la foto nueva", () => {
    expect(falloAlLeer("https://x/nueva.jpg", "Llena los datos a mano.").foto).toBe("https://x/nueva.jpg");
    expect(leido("https://x/nueva.jpg", []).mensaje).toBe("Revisa que todo esté bien y publica.");
    expect(leido("https://x/nueva.jpg", ["la fecha", "dónde"]).mensaje).toBe("Revisa la fecha, dónde y publica.");
  });
});
