import { describe, expect, it } from "vitest";
import { claveDeUrl, guardarMemoria, guardarScroll, guardarUrlSeccion, leerMemoria, leerScroll, leerUrlSeccion, type Almacen } from "./memoriaPantalla";

function almacen(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => void datos.set(k, v), removeItem: (k) => void datos.delete(k) };
}

describe("memoria de pantalla", () => {
  it("guarda y devuelve el estado de una URL", () => {
    const a = almacen();
    guardarMemoria("/", { estado: { filtro: "nuevos", busqueda: "jazz" } }, a);
    expect(leerMemoria("/", a)).toEqual({ estado: { filtro: "nuevos", busqueda: "jazz" } });
    expect(leerMemoria("/lugares", a)).toBeNull();
  });
  it("guarda y devuelve el scroll de una URL, aparte del estado", () => {
    const a = almacen();
    guardarScroll("/", 1800.4, a);
    guardarScroll("/eventos/x", -3, a);
    expect(leerScroll("/", a)).toBe(1800);
    expect(leerScroll("/eventos/x", a)).toBe(0);
    expect(leerScroll("/lugares", a)).toBeNull();
    expect(leerScroll("/", null)).toBeNull();
  });
  it("sin almacén (modo privado) no rompe: no hay memoria", () => {
    expect(leerMemoria("/", null)).toBeNull();
    guardarMemoria("/", { estado: 1 }, null);
    expect(leerUrlSeccion("agenda", null)).toBeNull();
  });
  it("ignora lo que no sea una memoria válida", () => {
    const a = almacen();
    a.setItem("somosnosotros:pantalla:/", "no es json");
    expect(leerMemoria("/", a)).toBeNull();
    a.setItem("somosnosotros:pantalla:/", JSON.stringify({ scroll: 5 }));
    expect(leerMemoria("/", a)).toBeNull();
    a.setItem("somosnosotros:pantalla:/", JSON.stringify({ estado: { x: 1 } }));
    expect(leerMemoria("/", a)).toEqual({ estado: { x: 1 } });
  });
  it("recuerda la última URL de cada sección, solo si es una ruta de la app", () => {
    const a = almacen();
    guardarUrlSeccion("artistas", "/artistas?hace=musica", a);
    expect(leerUrlSeccion("artistas", a)).toBe("/artistas?hace=musica");
    a.setItem("somosnosotros:seccion:lugares", "https://otro.sitio/");
    expect(leerUrlSeccion("lugares", a)).toBeNull();
  });
  it("la clave es la ruta con su consulta", () => {
    expect(claveDeUrl({ pathname: "/lugares", search: "?vista=lista&tipo=museo" })).toBe("/lugares?vista=lista&tipo=museo");
    expect(claveDeUrl({ pathname: "/", search: "" })).toBe("/");
  });
});
