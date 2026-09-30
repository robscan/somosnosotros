import { describe, expect, it } from "vitest";
import { conReciente, guardarReciente, LLAVE_RECIENTES, leerRecientes, MAXIMO_RECIENTES, type Almacen, type Reciente } from "./recientesBusqueda";

const reciente = (id: string, grupo: Reciente["grupo"] = "eventos", href = `/eventos/${id}`): Reciente => ({ grupo, id, href, foto: "/f.png", titulo: `Título ${id}`, meta: ["vie 2 oct · MUNI"] });
const almacen = (): Almacen & { datos: Record<string, string> } => {
  const datos: Record<string, string> = {};
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => void (datos[k] = v) };
};

describe("Recientes de Buscar", () => {
  it("lo último abierto va primero, sin repetirse, y solo caben cinco", () => {
    expect(conReciente([reciente("1"), reciente("2")], reciente("2")).map((r) => r.id)).toEqual(["2", "1"]);
    const seis = ["1", "2", "3", "4", "5", "6"].reduce<Reciente[]>((lista, id) => conReciente(lista, reciente(id)), []);
    expect(seis.map((r) => r.id)).toEqual(["6", "5", "4", "3", "2"]);
    expect(seis).toHaveLength(MAXIMO_RECIENTES);
  });
  it("el mismo id de otro tipo es otro reciente", () => {
    expect(conReciente([reciente("1", "lugares", "/lugares/1")], reciente("1")).map((r) => r.grupo)).toEqual(["eventos", "lugares"]);
  });
  it("guarda y lee del almacén; sin almacén no pasa nada", () => {
    const a = almacen();
    guardarReciente(reciente("1"), a);
    guardarReciente(reciente("2", "artistas", "/artistas/2"), a);
    expect(leerRecientes(a.datos[LLAVE_RECIENTES]).map((r) => r.id)).toEqual(["2", "1"]);
    expect(() => guardarReciente(reciente("3"), null)).not.toThrow();
  });
  it("lo ilegible, o que no lleva a una ruta de la app, no se lee", () => {
    expect(leerRecientes("no es json")).toEqual([]);
    expect(leerRecientes(null)).toEqual([]);
    expect(leerRecientes(JSON.stringify([reciente("1"), { ...reciente("2"), href: "https://otro.example.com" }, { ...reciente("3"), href: "//otro.example.com/x" }, { id: "4" }])).map((r) => r.id)).toEqual(["1"]);
  });
});
