import { describe, expect, it, vi } from "vitest";
import type { Encontrado } from "./buscarUnificado";
import { conReciente, guardarReciente, guardarRecientesAlDia, LLAVE_RECIENTES, leerRecientes, MAXIMO_RECIENTES, recientesAlDia, suscribirseRecientes, type Almacen, type Reciente } from "./recientesBusqueda";

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
  it("lo que es (OL-338) se lee si es un texto", () => {
    expect(leerRecientes(JSON.stringify([{ ...reciente("1"), clase: "Festival" }, { ...reciente("2"), clase: 3 }])).map((r) => [r.id, r.clase])).toEqual([["1", "Festival"]]);
  });
});

describe("Recientes al día (OL-338): la foto guardada no se queda vieja", () => {
  const SLP = "San Luis Potosí";
  const vigente = (id: string, cambios: Partial<Encontrado> = {}): Encontrado => ({ id, href: `/eventos/${id}-nuevo`, foto: "/nueva.png", titulo: `Título ${id} (nuevo)`, detalle: "sáb 10 oct", sitio: "MUNI", van: 0, ciudad: SLP, ...cambios });

  it("pone la foto, el nombre, los datos, lo que es y la dirección de hoy; el que ya no se ve sale; el que no se preguntó se queda", () => {
    const lista = [reciente("1"), reciente("2"), reciente("3")];
    const alDia = recientesAlDia(lista, { "eventos:1": vigente("1", { clase: "Festival", detalle: "Del 16 al 18 de oct", sitio: "Programa registrado: 3 actividades" }), "eventos:2": null }, SLP);
    expect(alDia).toEqual([
      { grupo: "eventos", id: "1", href: "/eventos/1-nuevo", foto: "/nueva.png", titulo: "Título 1 (nuevo)", meta: ["Del 16 al 18 de oct · Programa registrado: 3 actividades"], clase: "Festival" },
      reciente("3"),
    ]);
  });
  it("un lugar abierto desde Lugares sigue llevando al mapa; la ciudad va en la meta si no es la que se ve", () => {
    const lugar: Reciente = { grupo: "lugares", id: "l1", href: "/lugares?lugar=viejo", foto: null, titulo: "Viejo", meta: ["Museo"] };
    const [r] = recientesAlDia([lugar], { "lugares:l1": vigente("l1", { href: "/lugares/museo-nuevo", detalle: "Museo", sitio: undefined, ciudad: "Córdoba, España" }) }, SLP);
    expect(r.href).toBe("/lugares?ciudad=cordoba-espana&lugar=museo-nuevo");
    expect(r.meta).toEqual(["Museo", "Córdoba, España"]);
  });
  it("guarda y avisa solo si algo cambió", () => {
    const a = almacen();
    guardarReciente(reciente("1"), a);
    const escucha = vi.fn();
    const soltar = suscribirseRecientes(escucha);
    guardarRecientesAlDia({ "eventos:1": vigente("1") }, SLP, a);
    expect(leerRecientes(a.datos[LLAVE_RECIENTES])[0].foto).toBe("/nueva.png");
    expect(escucha).toHaveBeenCalledTimes(1);
    guardarRecientesAlDia({ "eventos:1": vigente("1") }, SLP, a);
    expect(escucha).toHaveBeenCalledTimes(1);
    soltar();
  });
});
