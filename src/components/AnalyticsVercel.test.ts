import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeforeSendEvent } from "@vercel/analytics/next";

// `Analytics` de Vercel, reducido a guardar el `beforeSend` que recibe: así se prueba lo que el componente le pasa de verdad.
const recibido: { beforeSend?: (e: BeforeSendEvent) => BeforeSendEvent | null } = {};
vi.mock("@vercel/analytics/next", () => ({
  Analytics: (p: { beforeSend?: (e: BeforeSendEvent) => BeforeSendEvent | null }) => {
    recibido.beforeSend = p.beforeSend;
    return null;
  },
}));

import AnalyticsVercel from "./AnalyticsVercel";

/** La marca del rol que pinta `MarcaAdmin`: «admin», «otro» o ninguna (aún sin resolver). */
const marca = (rol: "admin" | "otro" | null) =>
  vi.stubGlobal("document", { querySelector: (sel: string) => (rol && sel === "[data-medir-rol]" ? { getAttribute: (a: string) => (a === "data-medir-rol" ? rol : null) } : null) });
const pagina = (admin: boolean) => marca(admin ? "admin" : "otro");

afterEach(() => vi.unstubAllGlobals());

describe("AnalyticsVercel (OL-111, OL-325)", () => {
  renderToStaticMarkup(createElement(AnalyticsVercel));
  const antes = (e: BeforeSendEvent) => recibido.beforeSend!(e);

  it("le pasa un beforeSend a Vercel", () => {
    expect(typeof recibido.beforeSend).toBe("function");
  });
  it("F10: con la marca de admin en la página no manda ni vistas ni acciones", () => {
    pagina(true);
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/agenda" })).toBeNull();
    expect(antes({ type: "event", url: "https://somosnosotros.org/eventos/fiesta" })).toBeNull();
  });
  it("F10: sin rol resuelto (la marca aún no llegó) no manda nada", () => {
    marca(null);
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/agenda" })).toBeNull();
    expect(antes({ type: "event", url: "https://somosnosotros.org/eventos/fiesta" })).toBeNull();
  });
  it("rol «otro»: la vista va limpia (lista blanca: ni nombre ni posición)", () => {
    pagina(false);
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/nuevo/lugar?nombre=Casa&lat=22.151123&lng=-100.977456" })).toEqual({ type: "pageview", url: "https://somosnosotros.org/nuevo/lugar" });
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/perfil" })).toBeNull();
  });
  it("rol «otro»: una acción en una ruta privada lleva solo su primer tramo", () => {
    pagina(false);
    expect(antes({ type: "event", url: "https://somosnosotros.org/entrar?siguiente=%2Fnuevo%2Flugar%3Fnombre%3DCasa" })).toEqual({ type: "event", url: "https://somosnosotros.org/entrar" });
  });
});
