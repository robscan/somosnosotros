import { describe, it, expect } from "vitest";
import { crearGestosFlyer } from "./gestosFlyer";
import { cambiarReserva, lugaresPorTexto, puntoValido, textoDelSitio } from "./direccionEvento";
import type { OtroSitio } from "./HojaDondeEs";
import type { LugarResumen } from "@/lib/lugares";

describe("gestos frente a OCR y geocodificacion", () => {
  it("protege campos preexistentes sin bloquear los vacios", () => {
    const g = crearGestosFlyer(["titulo", "donde"]);
    expect(g.puedeCompletar("titulo")).toBe(false);
    expect(g.puedeCompletar("donde")).toBe(false);
    expect(g.puedeCompletar("descripcion")).toBe(true);
  });
  it("borrar o volver al mismo valor sigue siendo una edicion", () => {
    const g = crearGestosFlyer();
    const primera = g.tocar("titulo");
    g.tocar("titulo");
    expect(g.puedeCompletar("titulo")).toBe(false);
    expect(g.vigente("titulo", primera)).toBe(false);
  });
  it("solo el ultimo gesto de cada campo admite respuestas", () => {
    const g = crearGestosFlyer();
    const mapa = g.tocar("donde");
    g.tocar("titulo");
    expect(g.vigente("donde", mapa)).toBe(true);
    const ultimo = g.tocar("donde");
    expect(g.vigente("donde", mapa)).toBe(false);
    expect(g.vigente("donde", ultimo)).toBe(true);
  });
});

const otro: OtroSitio = { reservado: false, sitioTexto: "Foro", direccion: "Calle Prueba 123", sitioPunto: { lat: 22, lng: -100 }, direccionPrivada: "", privadoPunto: null, revelarHoras: 24, indicaciones: "", ciudad: "Ciudad" };
describe("direccion y privacidad", () => {
  it("une nombre y direccion solo en el texto publico", () => {
    expect(textoDelSitio(otro)).toBe("Foro · Calle Prueba 123");
    expect(textoDelSitio({ ...otro, sitioTexto: "" })).toBe("Calle Prueba 123");
    expect(textoDelSitio({ ...otro, sitioTexto: otro.direccion! })).toBe("Calle Prueba 123");
  });
  it("reservar mueve direccion y coordenadas sin publicarlas", () => {
    const privado = cambiarReserva(otro);
    expect(textoDelSitio(privado)).toBe("Foro");
    expect(privado.direccion).toBe("");
    expect(privado.sitioPunto).toBeNull();
    expect(privado.direccionPrivada).toBe(otro.direccion);
    expect(privado.privadoPunto).toEqual(otro.sitioPunto);
  });
  it("volver a publico no revela automaticamente la direccion privada", () => {
    const publico = cambiarReserva(cambiarReserva(otro));
    expect(textoDelSitio(publico)).toBe("Foro");
    expect(publico.sitioPunto).toBeNull();
  });
  it("una direccion privada preexistente no se pisa al reservar", () => {
    const privado = cambiarReserva({ ...otro, direccionPrivada: "Privada previa", privadoPunto: { lat: 1, lng: 2 } });
    expect(privado.direccionPrivada).toBe("Privada previa");
    expect(privado.privadoPunto).toEqual({ lat: 1, lng: 2 });
  });
  it("busca palabras por nombre y direccion, sin distinguir acentos", () => {
    const lugares = [{ id: "uno", nombre: "Foro Ficticio", direccion: "Álvaro Obregón 123" }, { id: "dos", nombre: "Otro", direccion: "Norte 8" }] as LugarResumen[];
    expect(lugaresPorTexto(lugares, "obregon 123 foro").map(l => l.id)).toEqual(["uno"]);
    expect(lugaresPorTexto(lugares, "no existe")).toEqual([]);
    expect(lugaresPorTexto(lugares, "")).toEqual(lugares);
  });
  it.each([{ lat: NaN, lng: 1 }, { lat: 91, lng: 0 }, { lat: 0, lng: Infinity }, { lat: 0, lng: -181 }])("rechaza coordenadas invalidas: %j", p => expect(puntoValido(p)).toBe(false));
});
