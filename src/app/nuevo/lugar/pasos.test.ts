import { describe, expect, it } from "vitest";
import type { Candidato } from "../evento/pasos";
import { avance, estadoInicial, faltaParaPublicar, faltan, flujo, pasoActual, resumenMas, type Accion, type Estado } from "./pasos";

/** OL-315 (bitácora 343): el camino del alta de lugar por pasos, sin DOM. Casos del prototipo firmado: 1 con sugerencia, 2 sin ella, 4 un café. */
const correr = (e: Estado, ...acciones: Accion[]) => acciones.reduce(flujo, e);
const SUGERENCIA: Candidato = { nombre: "Casa del Poeta Ramón López Velarde", direccion: "Vallejo 150, Centro, San Luis Potosí", punto: { lat: 22.151, lng: -100.978 }, ciudad: "San Luis Potosí", categorias: ["museum"], origen: "busqueda" };
const CAFE: Candidato = { ...SUGERENCIA, nombre: "Café del Jardín", direccion: "Jardín Guerrero 12", categorias: ["cafe"] };
const SITIO = { punto: SUGERENCIA.punto, direccion: SUGERENCIA.direccion, ciudad: "San Luis Potosí" };

describe("alta de lugar por pasos", () => {
  it("caso 1 · con sugerencia del mapa: el nombre y el tipo salen de ella, se confirma en el mapa y se llega a «Revisa» sin preguntar el tipo", () => {
    const e = correr(estadoInicial(), { tipo: "nombrar", nombre: "Casa del Poeta" }, { tipo: "sugerencia", candidato: SUGERENCIA });
    expect(pasoActual(e)).toBe("mapa");
    expect(e.r).toMatchObject({ nombre: "Casa del Poeta Ramón López Velarde", tipo: "museo" });
    const fin = flujo(e, { tipo: "ubicar", sitio: SITIO });
    expect(fin.pila).toEqual(["nombre", "mapa", "revisa"]);
    expect(faltaParaPublicar(fin.r, "San Luis Potosí")).toBeNull();
  });

  it("caso 2 · sin sugerencia: «Siguiente» lleva al mapa («¿Dónde está?», sin candidato) y después se pregunta el tipo; elegir avanza a «Revisa»", () => {
    // Un nombre sin pista («Taller La Grieta» diría colectivo).
    let e = correr(estadoInicial(), { tipo: "nombrar", nombre: "La Grieta" }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("mapa");
    expect(e.candidato).toBeNull();
    e = flujo(e, { tipo: "ubicar", sitio: SITIO });
    expect(pasoActual(e)).toBe("tipo");
    e = flujo(e, { tipo: "tipo", valor: "galeria" });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.r.tipo).toBe("galeria");
  });

  it("caso 4 · un café entra con su tipo, deducido de lo que dice el mapa", () => {
    const e = correr(estadoInicial(), { tipo: "nombrar", nombre: "Café del" }, { tipo: "sugerencia", candidato: CAFE }, { tipo: "ubicar", sitio: SITIO });
    expect(e.r.tipo).toBe("cafe_bar");
    expect(pasoActual(e)).toBe("revisa");
  });

  it("«Otro» pregunta qué es (opcional) y sigue a «Revisa»; cambiar a otro tipo borra el «qué es»", () => {
    let e = correr(estadoInicial(), { tipo: "nombrar", nombre: "La Grieta" }, { tipo: "seguir" }, { tipo: "ubicar", sitio: SITIO }, { tipo: "tipo", valor: "otro" });
    expect(pasoActual(e)).toBe("otro");
    e = correr(e, { tipo: "cambiar", cambios: { detalle: "taller de cerámica" } }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.r.detalle).toBe("taller de cerámica");
    e = correr(e, { tipo: "abrir", paso: "tipo" }, { tipo: "tipo", valor: "foro" });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.r).toMatchObject({ tipo: "foro", detalle: "" });
  });

  it("el tipo elegido a mano no lo pisa lo que se deduzca después; sin elegir, el nombre lo vuelve a deducir (o lo deja por preguntar)", () => {
    let e = correr(estadoInicial(), { tipo: "nombrar", nombre: "Museo X" });
    expect(e.r.tipo).toBe("museo");
    e = flujo(e, { tipo: "nombrar", nombre: "La Grieta" });
    expect(e.r.tipo).toBeNull();
    e = correr(e, { tipo: "seguir" }, { tipo: "ubicar", sitio: SITIO }, { tipo: "tipo", valor: "foro" }, { tipo: "atras", desde: "revisa" }, { tipo: "atras", desde: "tipo" }, { tipo: "atras", desde: "mapa" }, { tipo: "nombrar", nombre: "Museo de la Grieta" });
    expect(e.r.tipo).toBe("foro");
  });

  it("«Buscar otro» vuelve al nombre; escribir otro nombre suelta la sugerencia y el mapa pasa a «¿Dónde está?»", () => {
    let e = correr(estadoInicial(), { tipo: "nombrar", nombre: "Casa del Poeta" }, { tipo: "sugerencia", candidato: SUGERENCIA }, { tipo: "atras", desde: "mapa" });
    expect(pasoActual(e)).toBe("nombre");
    expect(e.candidato).not.toBeNull();
    e = correr(e, { tipo: "nombrar", nombre: "Otra casa" }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("mapa");
    expect(e.candidato).toBeNull();
  });

  it("el punto de entrada (el dedo sostenido en Lugares) es el candidato: el mapa pregunta «¿Es aquí?» y escribir el nombre no lo suelta", () => {
    let e = estadoInicial({ nombre: "Foro del Carmen", punto: { lat: 22.15, lng: -100.97 } });
    expect(e.r).toMatchObject({ nombre: "Foro del Carmen", tipo: "foro" });
    e = correr(e, { tipo: "nombrar", nombre: "Foro del Carmen 2" }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("mapa");
    expect(e.candidato?.punto).toEqual({ lat: 22.15, lng: -100.97 });
  });

  it("desde «Revisa»: «Cambiar» la dirección abre «¿Dónde está?» (sin la sugerencia de antes) y al confirmarla se vuelve a «Revisa»", () => {
    let e = correr(estadoInicial(), { tipo: "nombrar", nombre: "Casa" }, { tipo: "sugerencia", candidato: SUGERENCIA }, { tipo: "ubicar", sitio: SITIO });
    e = flujo(e, { tipo: "abrir", paso: "mapa" });
    expect(pasoActual(e)).toBe("mapa");
    expect(e.candidato).toBeNull();
    e = flujo(e, { tipo: "ubicar", sitio: { ...SITIO, direccion: "Otra calle 1" } });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.direccion).toBe("vuelve");
    expect(e.r.sitio?.direccion).toBe("Otra calle 1");
  });

  it("lo opcional («mas») vuelve a «Revisa» con «Listo»; publicar deja solo el final", () => {
    let e = correr(estadoInicial(), { tipo: "nombrar", nombre: "Casa" }, { tipo: "sugerencia", candidato: SUGERENCIA }, { tipo: "ubicar", sitio: SITIO }, { tipo: "abrir", paso: "mas" });
    expect(pasoActual(e)).toBe("mas");
    e = correr(e, { tipo: "cambiar", cambios: { descripcion: "Un museo" } }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("revisa");
    e = flujo(e, { tipo: "publicado" });
    expect(e.pila).toEqual(["publicado"]);
  });

  it("lo que falta y lo que dice el botón: también la ciudad, que no es un paso", () => {
    const r = estadoInicial().r;
    expect(faltan(r)).toEqual(["nombre", "mapa", "tipo"]);
    expect(faltaParaPublicar({ ...r, nombre: "Casa", sitio: SITIO, tipo: "museo" }, null)).toBe("Falta la ciudad");
    expect(faltaParaPublicar({ ...r, nombre: "Casa" }, null)).toBe("Falta la ubicación, el tipo y la ciudad");
  });

  it("avance: el nombre al principio, «Revisa» casi al final, «Publicado» lleno", () => {
    expect(avance("nombre")).toBe(0);
    expect(avance("mapa")).toBe(0.25);
    expect(avance("otro")).toBe(avance("tipo"));
    expect(avance("mas")).toBe(avance("revisa"));
    expect(avance("publicado")).toBe(1);
  });

  it("el renglón opcional dice lo que ya se agregó", () => {
    expect(resumenMas({ portada: null, descripcion: " ", redes: [] })).toBeNull();
    expect(resumenMas({ portada: "/f.jpg", descripcion: "Algo", redes: [{ url: "https://instagram.com/x", red: "instagram" }, { url: "https://x.com/y", red: "x" }] as never })).toBe("Foto, descripción y 2 redes");
    expect(resumenMas({ portada: null, descripcion: "", redes: [{ url: "https://instagram.com/x", red: "instagram" }] as never })).toBe("1 red");
  });
});
