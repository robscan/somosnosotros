import { describe, expect, it, vi } from "vitest";
import { crearRegistroVolver } from "./gestoAtras";

describe("registro de quién puede volver (gesto de deslizar)", () => {
  it("sin nadie registrado, disparar no hace nada", () => {
    const r = crearRegistroVolver();
    expect(r.disparar()).toBe(false);
  });

  it("llama a quien se registró", () => {
    const r = crearRegistroVolver();
    const fn = vi.fn();
    r.registrar(fn);
    expect(r.disparar()).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("el segundo registro reemplaza al primero (cambiar de pantalla)", () => {
    const r = crearRegistroVolver();
    const uno = vi.fn();
    const dos = vi.fn();
    r.registrar(uno);
    r.registrar(dos);
    r.disparar();
    expect(uno).not.toHaveBeenCalled();
    expect(dos).toHaveBeenCalledOnce();
  });

  it("darse de baja solo quita el propio registro, no el de quien lo reemplazó", () => {
    const r = crearRegistroVolver();
    const uno = vi.fn();
    const dos = vi.fn();
    const bajaUno = r.registrar(uno);
    r.registrar(dos);
    bajaUno();
    expect(r.disparar()).toBe(true);
    expect(dos).toHaveBeenCalledOnce();
  });

  it("darse de baja cuando sí eres el actual deja a nadie registrado", () => {
    const r = crearRegistroVolver();
    const fn = vi.fn();
    const baja = r.registrar(fn);
    baja();
    expect(r.disparar()).toBe(false);
  });

  it("dos instancias no se pisan entre sí", () => {
    const a = crearRegistroVolver();
    const b = crearRegistroVolver();
    const fnA = vi.fn();
    a.registrar(fnA);
    expect(b.disparar()).toBe(false);
    expect(fnA).not.toHaveBeenCalled();
  });
});
