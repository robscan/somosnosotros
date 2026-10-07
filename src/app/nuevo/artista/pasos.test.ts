import { describe, expect, it } from "vitest";
import { avance, estadoInicial, faltaParaPublicar, faltan, flujo, pasoActual, resumenMas, type Accion, type Estado } from "./pasos";

/** OL-316 (bitácora 346): el camino del alta de artista por pasos, sin DOM. Casos del prototipo firmado: 5 con pista en el nombre, 6 sin ella. */
const correr = (e: Estado, ...acciones: Accion[]) => acciones.reduce(flujo, e);
const SUBCATEGORIAS = {
  teatro: [
    { detalle: "Compañía de teatro", artistas: 12 },
    { detalle: "Títeres", artistas: 5 },
    { detalle: "Teatro", artistas: 3 },
  ],
  danza: [{ detalle: "Folclórica", artistas: 7 }],
};
const nuevo = (nombre = "") => estadoInicial({ arranque: { nombre, ciudad: "San Luis Potosí" }, subcategorias: SUBCATEGORIAS });

describe("alta de artista por pasos", () => {
  it("caso 5 · con pista en el nombre: disciplina, subcategoría y grupo salen de él y «Siguiente» va directo a «Revisa»", () => {
    const e = correr(nuevo(), { tipo: "nombrar", nombre: "Compañía de Teatro La Rendija" }, { tipo: "seguir" });
    expect(e.r).toMatchObject({ disciplina: "teatro", detalle: "Compañía de teatro", tipo: "grupo" });
    expect(e.pila).toEqual(["nombre", "revisa"]);
    expect(faltaParaPublicar(e.r)).toBeNull();
  });

  it("caso 6 · sin pista: se pregunta qué hace, después qué tipo, y elegir avanza a «Revisa»; solista o grupo queda por decir", () => {
    let e = correr(nuevo(), { tipo: "nombrar", nombre: "Mariana Ruvalcaba" }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("hace");
    expect(e.r.disciplina).toBeNull();
    e = flujo(e, { tipo: "hace", valor: "teatro" });
    expect(pasoActual(e)).toBe("sub");
    e = flujo(e, { tipo: "sub", detalle: "Títeres" });
    expect(e.pila).toEqual(["nombre", "hace", "sub", "revisa"]);
    expect(e.r).toMatchObject({ disciplina: "teatro", detalle: "Títeres", tipo: null });
    // Nada sale por omisión: el botón dice qué falta.
    expect(faltaParaPublicar(e.r)).toBe("Falta si es solista o grupo");
    e = flujo(e, { tipo: "es", valor: "solista" });
    expect(faltaParaPublicar(e.r)).toBeNull();
  });

  it("«Otra…» escrita y «Seguir sin especificar» llegan a «Revisa» con lo escrito, recortado a su tope, o sin subcategoría", () => {
    const hasta = (detalle: string) => correr(nuevo(), { tipo: "nombrar", nombre: "Ana Ruiz" }, { tipo: "seguir" }, { tipo: "hace", valor: "letras" }, { tipo: "sub", detalle });
    expect(hasta("  Poesía en voz alta ").r.detalle).toBe("Poesía en voz alta");
    expect(hasta("x".repeat(60)).r.detalle).toHaveLength(40);
    const sin = hasta("");
    expect(pasoActual(sin)).toBe("revisa");
    expect(sin.r.detalle).toBe("");
  });

  it("la subcategoría solo sale del nombre si está escrita entera y no es la disciplina misma", () => {
    expect(correr(nuevo(), { tipo: "nombrar", nombre: "Teatro Rodante" }).r).toMatchObject({ disciplina: "teatro", detalle: "" });
    expect(correr(nuevo(), { tipo: "nombrar", nombre: "Los Títeres de Ana" }).r).toMatchObject({ disciplina: "teatro", detalle: "Títeres", tipo: "grupo" });
    // Sin la disciplina en el nombre no se busca la subcategoría: «Folclórica» sola no dice que es danza.
    expect(correr(nuevo(), { tipo: "nombrar", nombre: "Folclórica Ruiz" }).r).toMatchObject({ disciplina: null, detalle: "" });
    expect(correr(nuevo(), { tipo: "nombrar", nombre: "Ballet Folclórica" }).r).toMatchObject({ disciplina: "danza", detalle: "Folclórica" });
  });

  it("lo elegido a mano no lo pisa el nombre; lo deducido sí cambia con él", () => {
    let e = correr(nuevo(), { tipo: "nombrar", nombre: "Cineclub Alameda" });
    expect(e.r.disciplina).toBe("cine");
    e = flujo(e, { tipo: "nombrar", nombre: "Ana Ruiz" });
    expect(e.r.disciplina).toBeNull();
    e = correr(e, { tipo: "seguir" }, { tipo: "hace", valor: "danza" }, { tipo: "sub", detalle: "Folclórica" }, { tipo: "es", valor: "solista" });
    e = correr(e, { tipo: "abrir", paso: "nombre" }, { tipo: "nombrar", nombre: "Trío Ana Ruiz" }, { tipo: "seguir" });
    expect(e.r).toMatchObject({ nombre: "Trío Ana Ruiz", disciplina: "danza", detalle: "Folclórica", tipo: "solista" });
    expect(pasoActual(e)).toBe("revisa");
  });

  it("el nombre de entrada (Buscar) ya deduce lo suyo, y la ciudad es la de contexto", () => {
    const e = estadoInicial({ arranque: { nombre: "  Ballet Folclórico Universitario  ", ciudad: "Querétaro" }, subcategorias: {} });
    expect(e.r).toMatchObject({ nombre: "Ballet Folclórico Universitario", disciplina: "danza", tipo: "grupo", ciudad: "Querétaro", soy: false });
    expect(e.pila).toEqual(["nombre"]);
  });

  it("«Cambiar» la disciplina desde «Revisa»: «¿Qué hace?», luego su tipo, y se vuelve a «Revisa» sin apilar de más; Atrás desde la pregunta vuelve a «Revisa»", () => {
    let e = correr(nuevo(), { tipo: "nombrar", nombre: "Compañía de Teatro La Rendija" }, { tipo: "seguir" }, { tipo: "abrir", paso: "hace" });
    expect(pasoActual(e)).toBe("hace");
    expect(flujo(e, { tipo: "atras", desde: "hace" }).pila).toEqual(["nombre", "revisa"]);
    e = correr(e, { tipo: "hace", valor: "danza" });
    expect(e.r).toMatchObject({ disciplina: "danza", detalle: "" });
    e = flujo(e, { tipo: "sub", detalle: "Folclórica" });
    expect(e.pila).toEqual(["nombre", "revisa"]);
    expect(e.direccion).toBe("vuelve");
  });

  it("lo que falta, en orden y en el botón; un nombre que ya tiene ficha en la ciudad no se publica", () => {
    const e = nuevo();
    expect(faltan(e.r)).toEqual(["nombre", "hace"]);
    expect(faltaParaPublicar(e.r)).toBe("Falta el nombre, la disciplina y si es solista o grupo");
    const listo = correr(e, { tipo: "nombrar", nombre: "Los Vecinos" }, { tipo: "seguir" }, { tipo: "hace", valor: "musica" }, { tipo: "sub", detalle: "" });
    expect(faltaParaPublicar(listo.r)).toBeNull();
    expect(faltaParaPublicar(listo.r, true)).toBe("Ese nombre ya tiene ficha");
  });

  it("lo opcional, la ciudad y «Soy yo» se cambian sin dejar «Revisa»; «Publicado» no tiene vuelta", () => {
    let e = correr(nuevo("Los Vecinos"), { tipo: "seguir" }, { tipo: "hace", valor: "musica" }, { tipo: "sub", detalle: "" }, { tipo: "abrir", paso: "mas" });
    expect(pasoActual(e)).toBe("mas");
    e = correr(e, { tipo: "cambiar", cambios: { foto: "/f.png", descripcion: "Cumbia", redes: [{ url: "https://instagram.com/vecinos", tipo: "instagram" }] as never } }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("revisa");
    expect(resumenMas(e.r)).toBe("Foto, descripción y 1 red");
    e = correr(e, { tipo: "cambiar", cambios: { ciudad: "Querétaro", soy: true } }, { tipo: "publicado" });
    expect(e.r).toMatchObject({ ciudad: "Querétaro", soy: true });
    expect(e.pila).toEqual(["publicado"]);
    expect(flujo(e, { tipo: "atras", desde: "publicado" })).toBe(e);
  });

  it("la línea de avance: nombre, qué hace, qué tipo, «Revisa» (lo opcional cuenta como «Revisa») y el final", () => {
    expect([avance("nombre"), avance("hace"), avance("sub"), avance("revisa"), avance("mas"), avance("publicado")]).toEqual([0, 0.25, 0.5, 0.75, 0.75, 1]);
    expect(resumenMas({ foto: null, portada: "/p.png", descripcion: " ", redes: [] })).toBe("Portada");
    expect(resumenMas({ foto: null, portada: null, descripcion: "", redes: [] })).toBeNull();
  });
});
