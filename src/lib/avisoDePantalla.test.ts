import { describe, expect, it } from "vitest";
import { alAvisar, alCerrar, alLimpiar, cerrojoDePregunta, type Aviso } from "./avisoDePantalla";

const nada = () => {};
const aviso = (de: string, texto: string, fallo = false): Omit<Aviso, "vez"> => ({ texto, boton: nada, de, fallo });

describe("el aviso de abajo de una pantalla", () => {
  it("el nuevo reemplaza al anterior y cada uno cierra solo el suyo", () => {
    const uno = alAvisar(null, aviso("lista", "Te interesa"));
    expect(uno.vez).toBe(1);
    const dos = alAvisar(uno, aviso("barra", "No se pudo guardar", true));
    expect([dos.texto, dos.vez]).toEqual(["No se pudo guardar", 2]);
    // Al primero se le acaba el tiempo tarde: no se lleva al segundo por delante.
    expect(alCerrar(dos, uno.vez)).toBe(dos);
    expect(alCerrar(dos, dos.vez)).toBeNull();
  });

  it("un toque nuevo limpia lo suyo y respeta el fallo de otro", () => {
    const deLaLista = alAvisar(null, aviso("lista", "No se pudo guardar «Lectura»", true));
    // La barra toca: no puede borrar el Reintentar del renglón, que se quedaría sin guardar y sin verse.
    expect(alLimpiar(deLaLista, "barra")).toBe(deLaLista);
    // Su propio aviso anterior sí lo quita.
    const deLaBarra = alAvisar(deLaLista, aviso("barra", "No se pudo guardar", true));
    expect(alLimpiar(deLaBarra, "barra")).toBeNull();
    expect(alLimpiar(null, "barra")).toBeNull();
  });
});

describe("el cerrojo de la pregunta de avisos", () => {
  it("evita dos hojas a la vez, pero cerrarla sin contestar la deja volver", () => {
    const c = cerrojoDePregunta();
    expect(c.tomar()).toBe(true);
    // La barra intenta abrir la suya con la de la lista abierta: no.
    expect(c.tomar()).toBe(false);
    // Se cerró sin contestar (la ✕, tocar fuera o Escape): el siguiente Voy vuelve a preguntar, como en main.
    c.soltar();
    expect(c.tomar()).toBe(true);
    c.soltar();
    c.soltar();
    expect(c.tomar()).toBe(true);
  });
});
