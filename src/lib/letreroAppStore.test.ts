import { describe, expect, it } from "vitest";
import { APP_STORE_ID, contenidoLetreroAppStore } from "./letreroAppStore";

/** OL-474: el letrero de Apple en Safari («Ver»/«Abrir») lleva a la misma página que la persona está viendo. */
describe("contenidoLetreroAppStore", () => {
  it("usa el Apple ID de la ficha de la tienda", () => {
    expect(APP_STORE_ID).toBe("6812916453");
  });

  it("pasa la dirección canónica de producción de la página actual", () => {
    expect(contenidoLetreroAppStore("/")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/");
    expect(contenidoLetreroAppStore("/eventos/concierto-en-el-jardin")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/eventos/concierto-en-el-jardin");
    expect(contenidoLetreroAppStore("/lugares/museo-leonora-carrington")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/lugares/museo-leonora-carrington");
    expect(contenidoLetreroAppStore("/artistas/ana")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/artistas/ana");
    expect(contenidoLetreroAppStore("/agenda")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/agenda");
  });

  it("deja fuera la consulta y el ancla (rastreos de Instagram o Google, filtros)", () => {
    expect(contenidoLetreroAppStore("/eventos/x?utm_source=ig&fbclid=abc")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/eventos/x");
    expect(contenidoLetreroAppStore("/agenda#hoy")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/agenda");
  });

  it("codifica acentos, espacios y comas (la coma separa los parámetros de la etiqueta)", () => {
    expect(contenidoLetreroAppStore("/artistas/josé luis")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/artistas/jos%C3%A9%20luis");
    expect(contenidoLetreroAppStore("/artistas/a,b")).toBe("app-id=6812916453, app-argument=https://somosnosotros.org/artistas/a%2Cb");
  });

  it("no va en Administración, entrar ni la API", () => {
    for (const ruta of ["/admin", "/admin/instagram", "/admin/grafo", "/auth", "/auth/callback", "/auth/google/fin", "/api/estado"]) {
      expect(contenidoLetreroAppStore(ruta), ruta).toBeNull();
    }
  });

  it("sí va en rutas que solo empiezan igual", () => {
    expect(contenidoLetreroAppStore("/administrar")).not.toBeNull();
    expect(contenidoLetreroAppStore("/authors")).not.toBeNull();
  });

  it("nunca apunta a otro dominio", () => {
    expect(contenidoLetreroAppStore("//otro.example/x")).toBeNull();
    expect(contenidoLetreroAppStore("https://otro.example/x")).toBeNull();
  });
});
