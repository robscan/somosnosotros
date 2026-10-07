import { describe, expect, it } from "vitest";
import { avisoDelCartel, destinoDelCartel, etiquetaDelCartel, fotosDelSistema, textosDelCartel } from "./guardarCartel";

const guardarFoto = async () => ({ guardado: true });

describe("fotosDelSistema", () => {
  it("el plugin de la app, si la compilación lo trae", () => {
    expect(fotosDelSistema({ Capacitor: { Plugins: { Fotos: { guardarFoto } } } })).toEqual({ guardarFoto });
  });
  it("sin Capacitor (Safari, Chrome), con Capacitor sin plugins o con una compilación vieja de la app: nada", () => {
    expect(fotosDelSistema({})).toBeNull();
    expect(fotosDelSistema({ Capacitor: {} })).toBeNull();
    expect(fotosDelSistema({ Capacitor: { Plugins: {} } })).toBeNull();
  });
  it("un plugin sin su método no cuenta", () => {
    expect(fotosDelSistema({ Capacitor: { Plugins: { Fotos: {} as never } } })).toBeNull();
  });
});

describe("destino y texto según el entorno", () => {
  it("la app con el plugin de Fotos: guarda en Fotos y lo dice", () => {
    expect(destinoDelCartel({ conFotos: true })).toBe("fotos");
    expect(textosDelCartel("fotos")).toEqual({ reposo: "Guardar en Fotos", preparando: "Guardando…", listo: "Guardado en Fotos", fallo: "No se pudo guardar" });
  });

  it("la app sin el plugin (una compilación vieja) se porta como la web: descarga", () => {
    const conFotos = fotosDelSistema({ Capacitor: { Plugins: {} } }) !== null;
    expect(destinoDelCartel({ conFotos })).toBe("descarga");
  });

  it("la web (Safari, la web instalada, cualquier navegador): descarga el archivo y dice «Descargar el cartel», sin prometer «Fotos»", () => {
    const conFotos = fotosDelSistema({}) !== null;
    expect(destinoDelCartel({ conFotos })).toBe("descarga");
    const textos = textosDelCartel("descarga");
    expect(textos).toEqual({ reposo: "Descargar el cartel", preparando: "Preparando…", listo: "Cartel descargado", fallo: "No se pudo descargar" });
    expect(Object.values(textos).join(" ")).not.toMatch(/fotos/i);
  });
});

describe("el aviso flotante (OL-318)", () => {
  it("la app: «Cartel guardado en Fotos»; si falla, «No se pudo guardar» marcado como fallo", () => {
    expect(avisoDelCartel("fotos", false)).toEqual({ texto: "Cartel guardado en Fotos", fallo: false });
    expect(avisoDelCartel("fotos", true)).toEqual({ texto: "No se pudo guardar", fallo: true });
  });
  it("la web: «Cartel descargado»; si falla, «No se pudo descargar», y nunca promete «Fotos»", () => {
    expect(avisoDelCartel("descarga", false)).toEqual({ texto: "Cartel descargado", fallo: false });
    expect(avisoDelCartel("descarga", true)).toEqual({ texto: "No se pudo descargar", fallo: true });
    expect(avisoDelCartel("descarga", false).texto + avisoDelCartel("descarga", true).texto).not.toMatch(/fotos/i);
  });
});

describe("letreros cortos de la ficha", () => {
  it("web: «Cartel» / «Descargado» / «No se pudo», con el nombre completo aparte", () => {
    expect(textosDelCartel("descarga", true)).toEqual({ reposo: "Cartel", preparando: "Preparando…", listo: "Descargado", fallo: "No se pudo" });
    expect(etiquetaDelCartel("descarga")).toBe("Descargar el cartel");
  });
  it("app: «En Fotos» / «Guardado» / «No se pudo», con el nombre completo aparte", () => {
    expect(textosDelCartel("fotos", true)).toEqual({ reposo: "En Fotos", preparando: "Guardando…", listo: "Guardado", fallo: "No se pudo" });
    expect(etiquetaDelCartel("fotos")).toBe("Guardar en Fotos");
  });
});
