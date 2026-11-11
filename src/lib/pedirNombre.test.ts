import { describe, expect, it } from "vitest";
import { CLAVE_NOMBRE_PEDIDO, destinoPedirNombre, marcarPedido, yaSePidio } from "./pedirNombre";

describe("pedir el nombre al entrar (OL-512)", () => {
  it("la lleva a editar su ficha con el nombre pedido y la vuelta a donde estaba", () => {
    expect(destinoPedirNombre("/eventos/noche-de-danzon", "?dia=hoy", false)).toBe("/ajustes/editar?pedir=nombre&siguiente=%2Feventos%2Fnoche-de-danzon%3Fdia%3Dhoy");
    expect(destinoPedirNombre("/", "", false)).toBe("/ajustes/editar?pedir=nombre&siguiente=%2F");
    expect(destinoPedirNombre("/ajustes", "", false)).toBe("/ajustes/editar?pedir=nombre");
  });

  it("una sola vez por sesión", () => {
    expect(destinoPedirNombre("/", "", true)).toBeNull();
  });

  it("no la saca de editar, de entrar ni de un alta a medias", () => {
    for (const ruta of ["/ajustes/editar", "/entrar", "/auth/callback", "/nuevo/evento", "/obra/1/mando"]) expect(destinoPedirNombre(ruta, "", false)).toBeNull();
    expect(destinoPedirNombre("/nuevos", "", false)).not.toBeNull();
  });

  it("la marca vive en sessionStorage y sin almacenamiento no la desvía", () => {
    const datos = new Map<string, string>();
    const almacen = { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
    expect(yaSePidio(almacen)).toBe(false);
    marcarPedido(almacen);
    expect(datos.get(CLAVE_NOMBRE_PEDIDO)).toBe("1");
    expect(yaSePidio(almacen)).toBe(true);
    expect(yaSePidio(null)).toBe(true);
    expect(yaSePidio({ getItem: () => { throw new Error("bloqueado"); } })).toBe(true);
    expect(() => marcarPedido({ setItem: () => { throw new Error("lleno"); } })).not.toThrow();
  });
});
