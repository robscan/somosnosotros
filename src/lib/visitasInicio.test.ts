import { describe, expect, it } from "vitest";
import { sumarDiasIso } from "./calendario";
import { abrirInicio, anotarVisita, bannerALaVista, cerradoEnEstaSesion, cerrarEnEstaSesion, LLAVE_CERRADO, LLAVE_COMPARTIR, leerEstado, MAXIMO_DIAS, ocultarBanner, reabrirEnEstaSesion, suscribirseBanner, tocaBanner, visitaDeInicio, type Almacen, type AlmacenSesion, type EstadoCompartir } from "./visitasInicio";

/** Un almacén de mentira: `localStorage` (con lo que ya hubiera guardado, de cualquier forma) o `sessionStorage`. */
const almacen = (inicial?: unknown): AlmacenSesion & { datos: Record<string, string> } => {
  const datos: Record<string, string> = inicial ? { [LLAVE_COMPARTIR]: JSON.stringify(inicial) } : {};
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => void (datos[k] = v), removeItem: (k) => void delete datos[k] };
};
const estado = (cambios: Partial<EstadoCompartir> = {}): EstadoCompartir => ({ dias: [], ...cambios });

describe("El banner para compartir la app (OL-387): cuándo sale", () => {
  it("desde el primer día y cada día (OL-397)", () => {
    const a = almacen();
    const s = almacen();
    expect(visitaDeInicio("2026-10-10", a, s)).toBe(true);
    expect(visitaDeInicio("2026-10-11", a, s)).toBe(true);
    expect(visitaDeInicio("2026-10-12", a, s)).toBe(true);
    expect(leerEstado(a.datos[LLAVE_COMPARTIR]).dias).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
  });
  it("el mismo día tres veces cuenta uno", () => {
    const a = almacen();
    for (let i = 0; i < 3; i++) expect(visitaDeInicio("2026-10-12", a, almacen())).toBe(true);
    expect(leerEstado(a.datos[LLAVE_COMPARTIR]).dias).toEqual(["2026-10-12"]);
  });
  it("OL-407: la × lo esconde en esta sesión de uso, también otro día; en la siguiente sesión vuelve", () => {
    const a = almacen(estado({ dias: ["2026-10-12"] }));
    const sesion = almacen();
    expect(visitaDeInicio("2026-10-12", a, sesion)).toBe(true);
    expect(cerrarEnEstaSesion(sesion)).toBe(true);
    expect(sesion.datos[LLAVE_CERRADO]).toBe("1");
    expect(visitaDeInicio("2026-10-12", a, sesion)).toBe(false);
    expect(visitaDeInicio("2026-10-13", a, sesion)).toBe(false);
    // Se vuelve a abrir la app: sesión de uso nueva, lo del teléfono igual.
    expect(visitaDeInicio("2026-10-13", a, almacen())).toBe(true);
  });
  it("«Deshacer» la × lo devuelve en la misma sesión", () => {
    const sesion = almacen();
    cerrarEnEstaSesion(sesion);
    expect(cerradoEnEstaSesion(sesion)).toBe(true);
    reabrirEnEstaSesion(sesion);
    expect(cerradoEnEstaSesion(sesion)).toBe(false);
    expect(visitaDeInicio("2026-10-12", almacen(), sesion)).toBe(true);
  });
  it("tocaBanner: solo la × de esta sesión lo quita", () => {
    expect(tocaBanner(estado({ dias: ["2026-10-12"] }), false)).toBe(true);
    expect(tocaBanner(estado({ dias: ["2026-10-12"] }), true)).toBe(false);
    expect(tocaBanner(estado(), false)).toBe(false);
  });
  it("OL-407: lo que guardaban los teléfonos antes (ya compartido, cerrado 30 días) ya no lo esconde", () => {
    const yaCompartido = almacen({ dias: ["2026-10-11"], cerradoHasta: null, compartido: true });
    expect(visitaDeInicio("2026-10-12", yaCompartido, almacen())).toBe(true);
    const cerrado30 = almacen({ dias: ["2026-10-11"], cerradoHasta: "2026-11-10", compartido: false });
    expect(visitaDeInicio("2026-10-12", cerrado30, almacen())).toBe(true);
    expect(leerEstado(cerrado30.datos[LLAVE_COMPARTIR])).toEqual(estado({ dias: ["2026-10-11", "2026-10-12"] }));
  });
  it("guarda como mucho los últimos diez días", () => {
    let e = estado();
    for (let i = 0; i < 14; i++) e = anotarVisita(e, sumarDiasIso("2026-10-01", i));
    expect(e.dias).toHaveLength(MAXIMO_DIAS);
    expect(e.dias[0]).toBe("2026-10-05");
    expect(e.dias.at(-1)).toBe("2026-10-14");
  });
  it("sin almacenamiento, o si no se puede guardar, no sale", () => {
    expect(visitaDeInicio("2026-10-12", null, almacen())).toBe(false);
    expect(visitaDeInicio("2026-10-12", almacen(), null)).toBe(false);
    const roto: Almacen = { getItem: () => JSON.stringify(estado({ dias: ["2026-10-10", "2026-10-11"] })), setItem: () => { throw new Error("lleno"); } };
    expect(visitaDeInicio("2026-10-12", roto, almacen())).toBe(false);
    const bloqueado: Almacen = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => {} };
    expect(visitaDeInicio("2026-10-12", bloqueado, almacen())).toBe(false);
    const sesionBloqueada: AlmacenSesion = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); }, removeItem: () => { throw new Error("bloqueado"); } };
    expect(visitaDeInicio("2026-10-12", almacen(), sesionBloqueada)).toBe(false);
    expect(cerrarEnEstaSesion(sesionBloqueada)).toBe(false);
    expect(cerrarEnEstaSesion(null)).toBe(false);
    expect(() => reabrirEnEstaSesion(sesionBloqueada)).not.toThrow();
  });
  it("lo ilegible o mal formado se lee como nada", () => {
    expect(leerEstado("no es json")).toEqual(estado());
    expect(leerEstado(null)).toEqual(estado());
    expect(leerEstado(JSON.stringify({ dias: ["ayer", 3, "2026-10-12", "2026-10-12"], cerradoHasta: "pronto", compartido: "sí" }))).toEqual(estado({ dias: ["2026-10-12"] }));
  });
  it("Inicio decide al abrirse y avisa a quien pinta el banner", () => {
    const a = almacen(estado({ dias: ["2026-10-10", "2026-10-11"] }));
    let avisos = 0;
    const dejar = suscribirseBanner(() => avisos++);
    abrirInicio("2026-10-12", a, almacen());
    expect(bannerALaVista()).toBe(true);
    ocultarBanner();
    expect(bannerALaVista()).toBe(false);
    abrirInicio("2026-10-12", null, almacen());
    expect(bannerALaVista()).toBe(false);
    expect(avisos).toBe(2);
    dejar();
  });
});
