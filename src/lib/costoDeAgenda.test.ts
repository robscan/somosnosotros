import { describe, expect, it } from "vitest";
import { formularioDeEvento, precioDeAgenda } from "./cargaEventos";
import { conNotaDeCosto, costoDeAgenda } from "./costoDeAgenda";
import { COOPERACION_SOLIDARIA, validarEvento } from "./eventos";

/**
 * OL-441: una sola regla de costo para lo que llega de una agenda. El founder aceptó «Altar vivo, instalación inmersiva» con «Entrada con acceso
 * al museo» y la bandeja dijo «No se publicó: Pon el precio, o marca que es gratis»: lo que no es cifra, gratis ni cooperación queda «Por
 * confirmar» en cualquier clase, y el texto de la agenda no se pierde (va al final de la descripción).
 */
describe("costoDeAgenda (OL-441)", () => {
  it("los seis costos de las agendas", () => {
    for (const opcional of [false, true]) {
      expect(costoDeAgenda("Entrada con acceso al museo", opcional)).toEqual({ costo: "por_confirmar", precio: "", nota: "Entrada con acceso al museo" });
      expect(costoDeAgenda("Gratis con boleto", opcional)).toEqual({ costo: "gratis", precio: "", nota: "Gratis con boleto" });
      expect(costoDeAgenda("Incluida en el boleto", opcional)).toEqual({ costo: "por_confirmar", precio: "", nota: "Incluida en el boleto" });
      expect(costoDeAgenda("Costo de recuperación", opcional)).toEqual({ costo: "cooperacion", precio: "", nota: null });
      expect(costoDeAgenda("$150 general, $100 niños", opcional)).toEqual({ costo: "precio", precio: "150", nota: "$150 general, $100 niños" });
      expect(costoDeAgenda("Donativo", opcional)).toEqual({ costo: "cooperacion", precio: "", nota: null });
    }
  });

  it("una cifra es el precio; con más texto, la primera y el texto a la nota", () => {
    for (const t of ["$150", "150", "150 pesos", "$150.00", "$ 150 MXN"]) expect(costoDeAgenda(t, false), t).toEqual({ costo: "precio", precio: "150", nota: null });
    expect(costoDeAgenda("$1,500", false)).toMatchObject({ costo: "precio", precio: "1500", nota: null });
    expect(costoDeAgenda("Desde $150", false)).toEqual({ costo: "precio", precio: "150", nota: "Desde $150" });
    expect(costoDeAgenda("Gratis para estudiantes; general $50", false)).toEqual({ costo: "precio", precio: "50", nota: "Gratis para estudiantes; general $50" });
    expect(costoDeAgenda("Cuota de recuperación $80", false)).toMatchObject({ costo: "precio", precio: "80" });
    // Un número que no se dice precio no se inventa como precio.
    expect(costoDeAgenda("Para mayores de 18 años", false)).toEqual({ costo: "por_confirmar", precio: "", nota: "Para mayores de 18 años" });
    expect(costoDeAgenda("Entrada libre, cupo limitado a 30 personas", false)).toEqual({ costo: "gratis", precio: "", nota: "Entrada libre, cupo limitado a 30 personas" });
    expect(costoDeAgenda("$0", false)).toEqual({ costo: "gratis", precio: "", nota: null });
  });

  it("gratis, cooperación y «por confirmar» escritos; cualquier otro texto, «Por confirmar» con su nota", () => {
    for (const t of ["Entrada libre", "ENTRADA LIBRE", "Acceso gratuito", "Gratuito", "Sin costo", "Libre", "Gratis"]) expect(costoDeAgenda(t, false), t).toEqual({ costo: "gratis", precio: "", nota: null });
    for (const t of ["Cooperación voluntaria", "Cooperación solidaria", "Aportación voluntaria", "A voluntad", "Cuota de recuperación"]) expect(costoDeAgenda(t, false), t).toEqual({ costo: "cooperacion", precio: "", nota: null });
    expect(costoDeAgenda("Donativo sugerido $50", false)).toEqual({ costo: "cooperacion", precio: "", nota: "Donativo sugerido $50" });
    for (const t of ["Por confirmar", "Por definir", "Costo por confirmar"]) expect(costoDeAgenda(t, false), t).toEqual({ costo: "por_confirmar", precio: "", nota: null });
    for (const t of ["Consultar", "Boletos en taquilla", "Incluido con tu boleto del festival"]) expect(costoDeAgenda(t, false), t).toEqual({ costo: "por_confirmar", precio: "", nota: t });
  });

  it("sin texto: «Por confirmar» donde el costo es opcional y gratis en un evento suelto (como antes)", () => {
    for (const t of [null, undefined, "", "   "]) {
      expect(costoDeAgenda(t, true)).toEqual({ costo: "por_confirmar", precio: "", nota: null });
      expect(costoDeAgenda(t, false)).toEqual({ costo: "gratis", precio: "", nota: null });
    }
  });

  it("nunca deja el evento sin publicar por el precio: lo que manda la regla al formulario pasa `validarEvento` en cualquier clase", () => {
    const base = { titulo: "Altar vivo, instalación inmersiva", fecha: "2026-10-30", hora: "18:00", descripcion: "", lugar: null, sitio: "Plaza de Armas", sitio_lat: 22.15, sitio_lng: -100.97 };
    const textos = ["Entrada con acceso al museo", "Gratis con boleto", "Incluida en el boleto", "Costo de recuperación", "$150 general, $100 niños", "Donativo", "Consultar", "Para mayores de 18 años", "$9,999,999", ""];
    for (const opcional of [false, true])
      for (const t of textos) {
        const c = costoDeAgenda(t, opcional);
        const precio = c.costo === "gratis" ? "Gratis" : c.costo === "cooperacion" ? COOPERACION_SOLIDARIA : c.costo === "precio" ? `$${c.precio}` : null;
        const entrada = formularioDeEvento({ ...base, precio }, null);
        if (c.costo === "por_confirmar") Object.assign(entrada, { gratis: "no", por_confirmar: "si" });
        expect(validarEvento(entrada, undefined, { costoOpcional: opcional || c.costo === "por_confirmar" }).errores, `${t} (${opcional})`).toEqual({});
      }
  });
});

describe("precioDeAgenda: lo que la rutina deja en la propuesta (OL-441)", () => {
  it("«Gratis» y «Cooperación solidaria» cuando es solo eso; lo demás, el texto de la agenda tal cual (su nota no se pierde)", () => {
    expect(precioDeAgenda("Entrada libre")).toBe("Gratis");
    expect(precioDeAgenda("Costo de recuperación")).toBe(COOPERACION_SOLIDARIA);
    expect(precioDeAgenda("Donativo")).toBe(COOPERACION_SOLIDARIA);
    for (const t of ["Entrada con acceso al museo", "Gratis con boleto", "Incluida en el boleto", "$150 general, $100 niños", "Entrada libre, cupo limitado"]) expect(precioDeAgenda(t), t).toBe(t);
    expect(precioDeAgenda("  Entrada   con acceso al museo ")).toBe("Entrada con acceso al museo");
  });

  it("leer otra vez lo que dejó la rutina da el mismo costo y la misma nota", () => {
    for (const t of ["Entrada libre", "Gratis con boleto", "Cooperación voluntaria", "Costo de recuperación", "Donativo", "$150", "$150 general, $100 niños", "Entrada con acceso al museo", "Por confirmar"])
      for (const opcional of [false, true]) {
        const directo = costoDeAgenda(t, opcional);
        const deLaPropuesta = costoDeAgenda(precioDeAgenda(t), opcional);
        expect(deLaPropuesta.costo, t).toBe(directo.costo);
        expect(deLaPropuesta.precio, t).toBe(directo.precio);
        expect(deLaPropuesta.nota, t).toBe(directo.nota);
      }
  });
});

describe("conNotaDeCosto (OL-441)", () => {
  it("el costo de la agenda al final de la descripción, como frase propia", () => {
    expect(conNotaDeCosto("Una instalación inmersiva sobre el Día de Muertos.", "Entrada con acceso al museo", 1000)).toBe("Una instalación inmersiva sobre el Día de Muertos. Costo: Entrada con acceso al museo.");
    expect(conNotaDeCosto("Una instalación inmersiva", "Entrada con acceso al museo", 1000)).toBe("Una instalación inmersiva. Costo: Entrada con acceso al museo.");
    expect(conNotaDeCosto("", "Consultar.", 1000)).toBe("Costo: Consultar.");
    expect(conNotaDeCosto("Algo", null, 1000)).toBe("Algo");
  });

  it("si la descripción ya lo dice, tal cual; si no cabe, se recorta la descripción y no la nota", () => {
    expect(conNotaDeCosto("Recorrido con entrada con acceso al museo.", "Entrada con acceso al museo", 1000)).toBe("Recorrido con entrada con acceso al museo.");
    const larga = "a".repeat(1000);
    const r = conNotaDeCosto(larga, "Entrada con acceso al museo", 1000);
    expect(r.length).toBeLessThanOrEqual(1000);
    expect(r.endsWith("… Costo: Entrada con acceso al museo.")).toBe(true);
  });
});
