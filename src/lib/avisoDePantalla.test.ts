import { describe, expect, it } from "vitest";
import { alAvisar, alCerrar, alLimpiar, cerrojoDePregunta, VECES_QUE_PREGUNTA, type Aviso } from "./avisoDePantalla";

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
  it("nunca dos hojas a la vez", () => {
    const c = cerrojoDePregunta();
    expect(c.tomar()).toBe(true);
    // La barra intenta abrir la suya con la de la lista abierta: no.
    expect(c.tomar()).toBe(false);
  });

  it("la segunda vez sí, la tercera ya no", () => {
    const c = cerrojoDePregunta();
    // Primer Voy: sale. Se cierra sin contestar (la ✕, tocar fuera, Escape) y el gesto siguiente vuelve a preguntar.
    expect(c.tomar()).toBe(true);
    c.soltar();
    expect(c.tomar()).toBe(true);
    // Y ya no más en esta pantalla: no se insiste gesto tras gesto ni se tapa el Deshacer.
    c.soltar();
    expect(c.tomar()).toBe(false);
    c.soltar();
    expect(c.tomar()).toBe(false);
    expect(VECES_QUE_PREGUNTA).toBe(2);
  });

  it("soltarla de más no regala preguntas", () => {
    const c = cerrojoDePregunta();
    // Se suelta por cualquier camino (cerrada, contestada, "Ahora no" que cierra sola, o la pantalla que se va).
    c.soltar();
    c.soltar();
    expect(c.tomar()).toBe(true);
    c.soltar();
    expect(c.tomar()).toBe(true);
    c.soltar();
    expect(c.tomar()).toBe(false);
  });
});
