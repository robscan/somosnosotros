import { describe, expect, it } from "vitest";
import { claveDeUrl, guardarMemoria, guardarUrlSeccion, leerMemoria, leerUrlSeccion, type Almacen } from "./memoriaPantalla";

function almacen(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => void datos.set(k, v), removeItem: (k) => void datos.delete(k) };
}

describe("memoria de pantalla", () => {
  it("guarda y devuelve el estado y el scroll de una URL", () => {
    const a = almacen();
    guardarMemoria("/", { estado: { filtro: "nuevos", busqueda: "jazz" }, scroll: 1800 }, a);
    expect(leerMemoria("/", a)).toEqual({ estado: { filtro: "nuevos", busqueda: "jazz" }, scroll: 1800 });
    expect(leerMemoria("/lugares", a)).toBeNull();
  });
  it("sin almacén (modo privado) no rompe: no hay memoria", () => {
    expect(leerMemoria("/", null)).toBeNull();
    guardarMemoria("/", { estado: 1, scroll: 0 }, null);
    expect(leerUrlSeccion("agenda", null)).toBeNull();
  });
  it("ignora lo que no sea una memoria válida", () => {
    const a = almacen();
    a.setItem("somosnosotros:pantalla:/", "no es json");
    expect(leerMemoria("/", a)).toBeNull();
    a.setItem("somosnosotros:pantalla:/", JSON.stringify({ estado: { x: 1 }, scroll: -5 }));
    expect(leerMemoria("/", a)).toEqual({ estado: { x: 1 }, scroll: 0 });
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
