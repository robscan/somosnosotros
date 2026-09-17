import { describe, expect, it } from "vitest";
import { falloAlLeer, falloAlSubir, falloDeCorte, leido } from "@/app/eventos/estadoCartel";

/**
 * Los estados de la tarjeta del cartel. Las tres primeras pruebas salen de la revisión de la bitácora 095:
 * que un corte a mitad no deje la tarjeta colgada, que el fallo de subida no repita el titular, y que la
 * foto que ya estaba no se pierda cuando la nueva no llega.
 */
describe("estado del cartel", () => {
  it("un corte a mitad cae en fallo y no se queda leyendo", () => {
    const enMedio = { estado: "leyendo", foto: "https://x/nueva.jpg" } as const;
    const r = falloDeCorte(enMedio, undefined);
    expect(r.estado).toBe("fallo");
    expect(r.titulo).toBe("Se cortó a la mitad");
    expect(r.foto).toBe("https://x/nueva.jpg");
  });

  it("si el corte pasa antes de subir, se recupera la foto que ya estaba", () => {
    expect(falloDeCorte({ estado: "leyendo" }, "https://x/vieja.jpg").foto).toBe("https://x/vieja.jpg");
    expect(falloDeCorte(null, undefined).foto).toBeUndefined();
  });

  it("el fallo de subida no repite el titular y dice el motivo cuando lo hay", () => {
    const pesa = falloAlSubir(undefined, "La imagen pesa más de 5 MB. Elige otra.", "pesa");
    expect(pesa.titulo).toBe("No pude subir el cartel");
    expect(pesa.mensaje).toBe("La imagen pesa más de 5 MB. Elige otra.");
    // El genérico del servidor ("No se pudo subir la imagen…") no se repite bajo un titular que ya lo dice.
    const generico = falloAlSubir(undefined, "No se pudo subir la imagen. Intenta con otra.", "subida");
    expect(generico.mensaje).toBe("Intenta con otra foto.");
    expect(generico.mensaje).not.toContain("No se pudo");
  });

  it("si la foto nueva no sube, la anterior se queda y se dice", () => {
    const r = falloAlSubir("https://x/vieja.jpg", "No se pudo subir la imagen. Intenta con otra.", "subida");
    expect(r.foto).toBe("https://x/vieja.jpg");
    expect(r.mensaje).toBe("Intenta con otra foto. El cartel de antes se queda.");
  });

  it("leer y fallar al leer se quedan con la foto nueva", () => {
    expect(falloAlLeer("https://x/nueva.jpg", "Llena los datos a mano.").foto).toBe("https://x/nueva.jpg");
    expect(leido("https://x/nueva.jpg", []).mensaje).toBe("Revisa que todo esté bien y publica.");
    expect(leido("https://x/nueva.jpg", ["la fecha", "dónde"]).mensaje).toBe("Revisa la fecha, dónde y publica.");
  });
});
