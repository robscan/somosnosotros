import { describe, expect, it } from "vitest";
import { limpiarDescripcion } from "./candidatos";

/**
 * OL-509: ninguna descripción propuesta lleva teléfonos, correos ni direcciones web. Los dos casos del 2 de noviembre (con el número cambiado:
 * el repositorio es público) y los de las fuentes nuevas sin la API.
 */
describe("limpiarDescripcion", () => {
  it("los dos casos reales del 2 de noviembre: se va la frase del teléfono, queda la descripción", () => {
    expect(limpiarDescripcion("Taller de lightpainting para adultos que incluye pincel; inscripciones al 444 000 1234.")).toBe("Taller de lightpainting para adultos que incluye pincel.");
    expect(limpiarDescripcion("Obra teatral de la Compañía UNA; boletos al 444 000 5678.")).toBe("Obra teatral de la Compañía UNA.");
  });

  it("teléfonos sueltos en cualquier forma, correos y direcciones web", () => {
    expect(limpiarDescripcion("Concierto de son huasteco. Llama al (444) 123-4567 o al 4441234567.")).toBe("Concierto de son huasteco.");
    expect(limpiarDescripcion("Noche de jazz con el trío local (WhatsApp +52 444 123 4567).")).toBe("Noche de jazz con el trío local.");
    expect(limpiarDescripcion("Recital de piano 444.123.45.67")).toBe("Recital de piano");
    expect(limpiarDescripcion("Cosplay literario. Inscripciones en el enlace: https://forms.gle/abc al correo: otaku@example.com ¡Prepara tu personaje!")).toBe("Cosplay literario. ¡Prepara tu personaje!");
    expect(limpiarDescripcion("Homenaje a Soda Stereo. Boletos: https://boletos.example.com/evento/1 También en taquilla. Desde $220.")).toBe("Homenaje a Soda Stereo. Desde $220.");
    expect(limpiarDescripcion("Lectura de poesía, más información en www.ejemplo.mx y en contacto@ejemplo.mx.")).toBe("Lectura de poesía.");
    expect(limpiarDescripcion("Danza folklórica. Informes: 444 000 3456. Entrada libre.")).toBe("Danza folklórica. Entrada libre.");
  });

  it("no toca fechas, horas, precios ni años", () => {
    const t = "Del 5 al 11 de noviembre de 2026, funciones a las 16:30 y 19:30 horas. Cuota de $100 (2025-2026).";
    expect(limpiarDescripcion(t)).toBe(t);
    expect(limpiarDescripcion("")).toBe("");
    expect(limpiarDescripcion(null)).toBe("");
  });
});
