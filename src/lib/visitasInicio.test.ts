import { describe, expect, it } from "vitest";
import { abrirInicio, bannerALaVista, ocultarBanner, suscribirseBanner, anotarVisita, cambiarGuardado, cerrarBanner, LLAVE_COMPARTIR, leerEstado, marcarCompartido, MAXIMO_DIAS, sumarDias, tocaBanner, visitaDeInicio, type Almacen, type EstadoCompartir } from "./visitasInicio";

const almacen = (inicial?: EstadoCompartir): Almacen & { datos: Record<string, string> } => {
  const datos: Record<string, string> = inicial ? { [LLAVE_COMPARTIR]: JSON.stringify(inicial) } : {};
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => void (datos[k] = v) };
};
const estado = (cambios: Partial<EstadoCompartir> = {}): EstadoCompartir => ({ dias: [], cerradoHasta: null, compartido: false, ...cambios });

describe("El banner para compartir la app (OL-387): cuándo sale", () => {
  it("tres días distintos: sale; dos: no", () => {
    const a = almacen();
    expect(visitaDeInicio("2026-10-10", a)).toBe(false);
    expect(visitaDeInicio("2026-10-11", a)).toBe(false);
    expect(visitaDeInicio("2026-10-12", a)).toBe(true);
    expect(leerEstado(a.datos[LLAVE_COMPARTIR]).dias).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
  });
  it("el mismo día tres veces cuenta uno", () => {
    const a = almacen();
    for (let i = 0; i < 3; i++) expect(visitaDeInicio("2026-10-12", a)).toBe(false);
    expect(leerEstado(a.datos[LLAVE_COMPARTIR]).dias).toEqual(["2026-10-12"]);
  });
  it("cerrado hasta mañana: no sale hoy; sale mañana", () => {
    const tres = estado({ dias: ["2026-10-10", "2026-10-11", "2026-10-12"], cerradoHasta: "2026-10-13" });
    expect(tocaBanner(tres, "2026-10-12")).toBe(false);
    expect(tocaBanner(tres, "2026-10-13")).toBe(true);
  });
  it("la × lo esconde 30 días", () => {
    const tres = estado({ dias: ["2026-10-10", "2026-10-11", "2026-10-12"] });
    const cerrado = cerrarBanner(tres, "2026-10-12");
    expect(cerrado.cerradoHasta).toBe("2026-11-11");
    expect(tocaBanner(cerrado, "2026-11-10")).toBe(false);
    expect(tocaBanner(cerrado, "2026-11-11")).toBe(true);
  });
  it("compartido: no vuelve nunca", () => {
    const a = almacen(estado({ dias: ["2026-10-10", "2026-10-11"] }));
    expect(visitaDeInicio("2026-10-12", a)).toBe(true);
    expect(cambiarGuardado(marcarCompartido, a)).toBe(true);
    expect(visitaDeInicio("2026-10-13", a)).toBe(false);
    expect(visitaDeInicio("2027-10-13", a)).toBe(false);
  });
  it("guarda como mucho los últimos diez días", () => {
    let e = estado();
    for (let i = 0; i < 14; i++) e = anotarVisita(e, sumarDias("2026-10-01", i));
    expect(e.dias).toHaveLength(MAXIMO_DIAS);
    expect(e.dias[0]).toBe("2026-10-05");
    expect(e.dias.at(-1)).toBe("2026-10-14");
  });
  it("sin almacenamiento, o si no se puede guardar, no sale", () => {
    expect(visitaDeInicio("2026-10-12", null)).toBe(false);
    const roto: Almacen = { getItem: () => JSON.stringify(estado({ dias: ["2026-10-10", "2026-10-11"] })), setItem: () => { throw new Error("lleno"); } };
    expect(visitaDeInicio("2026-10-12", roto)).toBe(false);
    const bloqueado: Almacen = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => {} };
    expect(visitaDeInicio("2026-10-12", bloqueado)).toBe(false);
    expect(cambiarGuardado(marcarCompartido, null)).toBe(false);
  });
  it("lo ilegible o mal formado se lee como nada", () => {
    expect(leerEstado("no es json")).toEqual(estado());
    expect(leerEstado(null)).toEqual(estado());
    expect(leerEstado(JSON.stringify({ dias: ["ayer", 3, "2026-10-12", "2026-10-12"], cerradoHasta: "pronto", compartido: "sí" }))).toEqual(estado({ dias: ["2026-10-12"] }));
  });
  it("sumarDias cruza meses y años", () => {
    expect(sumarDias("2026-12-15", 30)).toBe("2027-01-14");
    expect(sumarDias("2026-10-12", 1)).toBe("2026-10-13");
  });
  it("Inicio decide al abrirse y avisa a quien pinta el banner", () => {
    const a = almacen(estado({ dias: ["2026-10-10", "2026-10-11"] }));
    let avisos = 0;
    const dejar = suscribirseBanner(() => avisos++);
    abrirInicio("2026-10-12", a);
    expect(bannerALaVista()).toBe(true);
    ocultarBanner();
    expect(bannerALaVista()).toBe(false);
    abrirInicio("2026-10-12", null);
    expect(bannerALaVista()).toBe(false);
    expect(avisos).toBe(2);
    dejar();
  });
});
