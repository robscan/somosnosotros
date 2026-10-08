import { describe, it, expect } from "vitest";
import { quienTrasLeerCartel } from "./gestosFlyer";
import { cambiarReserva, ponerPinManual, revisarNombreLegacy, sitioListo, textoDelSitio } from "./direccionEvento";
import { lugaresPorTexto, puntoValido } from "@/lib/buscarLugares";
import type { OtroSitio } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";

describe("quienTrasLeerCartel: 'Quién' refleja solo el cartel (founder, 2026-09-21: «me puso a mí y no se dice explícitamente en el cartel»)", () => {
  const yo = [{ id: "yo", nombre: "Quien publica" }];
  const delCartel = [{ id: "a1", nombre: "Artista del cartel" }];
  it("cartel con artistas reconocidos → los del cartel, aunque 'Quién' tuviera el prellenado automático", () => {
    expect(quienTrasLeerCartel(delCartel, yo, true)).toEqual(delCartel);
  });
  it("cartel sin artistas + prellenado automático → 'Quién' queda vacío, no se queda con quien publica", () => {
    expect(quienTrasLeerCartel([], yo, true)).toEqual([]);
  });
  it("cartel sin artistas pero 'Quién' ya tocado a mano → se respeta lo que la persona puso", () => {
    expect(quienTrasLeerCartel([], yo, false)).toEqual(yo);
  });
  it("quienInicial explícito (editar, duplicar, ficha de artista) → se respeta aunque el cartel traiga artistas distintos", () => {
    expect(quienTrasLeerCartel(delCartel, yo, false)).toEqual(yo);
  });
});

const otro: OtroSitio = { reservado: false, sitioTexto: "Foro", direccion: "Calle Prueba 123", sitioPunto: { lat: 22, lng: -100 }, direccionPrivada: "", privadoPunto: null, revelarHoras: 24, indicaciones: "", ciudad: "Ciudad" };
describe("direccion y privacidad", () => {
  it("sin pin no esta listo, tampoco el de antes con solo su nombre (OL-348)", () => {
    expect(sitioListo({...otro,sitioPunto:null})).toBe(false);
    expect(sitioListo({...otro,direccion:"",sitioPunto:null,nombreLegacy:true})).toBe(false);
    expect(sitioListo({...otro,direccion:"",nombreLegacy:true})).toBe(true);
    expect(sitioListo({...otro,pinPendiente:true})).toBe(false);
  });
  it("no separa texto legacy ni lo vuelve a usar como alias al revisar", () => {
    const legado={...otro,sitioTexto:"Foro · Patio · Calle 8",direccion:"",nombreLegacy:true};
    expect(revisarNombreLegacy(legado)).toMatchObject({sitioTexto:"",referenciaLegacy:legado.sitioTexto,nombreLegacy:false});
    expect(cambiarReserva(legado).sitioTexto).toBe("");
    expect(revisarNombreLegacy(otro)).toBe(otro);
  });
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
  it("el pin manual sin dirección queda listo sin inventar un nombre geocodificado", () => {
    const conPin = ponerPinManual({ ...otro, direccion: "", sitioPunto: null, ciudad: "Ciudad anterior" }, { lat: 22.3, lng: -100.3 });
    expect(conPin).toMatchObject({ sitioPunto: { lat: 22.3, lng: -100.3 }, ciudad: null, pinPendiente: false, direccion: "" });
    expect(sitioListo(conPin)).toBe(true);
  });
  it("busca palabras por nombre y direccion, sin distinguir acentos", () => {
    const lugares = [{ id: "uno", nombre: "Foro Ficticio", direccion: "Álvaro Obregón 123" }, { id: "dos", nombre: "Otro", direccion: "Norte 8" }] as LugarResumen[];
    expect(lugaresPorTexto(lugares, "obregon 123 foro").map(l => l.id)).toEqual(["uno"]);
    expect(lugaresPorTexto(lugares, "no existe")).toEqual([]);
    expect(lugaresPorTexto(lugares, "")).toEqual(lugares);
  });
  it.each([{ lat: NaN, lng: 1 }, { lat: 91, lng: 0 }, { lat: 0, lng: Infinity }, { lat: 0, lng: -181 }])("rechaza coordenadas invalidas: %j", p => expect(puntoValido(p)).toBe(false));
});
