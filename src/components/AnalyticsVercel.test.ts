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
import { limpiarUrlGoogle } from "@/lib/limpiarUrlAnalitica";

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
  it("F13: la ficha de una persona va a Vercel como /personas, sin su id", () => {
    pagina(false);
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/personas/00000000-0000-0000-0000-000000000001" })).toEqual({ type: "pageview", url: "https://somosnosotros.org/personas" });
    expect(antes({ type: "event", url: "https://somosnosotros.org/personas/00000000-0000-0000-0000-000000000001" })).toEqual({ type: "event", url: "https://somosnosotros.org/personas" });
  });
  it("OL-340: la ficha va a Vercel en su sección, sin slug, como vista y como acción", () => {
    pagina(false);
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/lugares/casa-inventada" })).toEqual({ type: "pageview", url: "https://somosnosotros.org/lugares" });
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/sitios/plaza-inventada" })).toEqual({ type: "pageview", url: "https://somosnosotros.org/sitios" });
    expect(antes({ type: "event", url: "https://somosnosotros.org/eventos/fiesta-inventada" })).toEqual({ type: "event", url: "https://somosnosotros.org/eventos" });
    expect(antes({ type: "event", url: "https://somosnosotros.org/eventos/fiesta-inventada/cartel" })).toEqual({ type: "event", url: "https://somosnosotros.org/eventos" });
  });
  it("F13: un valor libre en un filtro permitido no sale a Vercel; uno de su lista sí", () => {
    pagina(false);
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/agenda?tipo=correo%40local.test" })).toEqual({ type: "pageview", url: "https://somosnosotros.org/agenda" });
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/lugares?tipo=museo" })).toEqual({ type: "pageview", url: "https://somosnosotros.org/lugares?tipo=museo" });
    expect(antes({ type: "pageview", url: "https://somosnosotros.org/agenda?cuanto=gratis,cooperacion&que=talleres&filtro=siguiendo" })).toEqual({ type: "pageview", url: "https://somosnosotros.org/agenda?cuanto=gratis%2Ccooperacion&que=talleres&filtro=siguiendo" });
  });
  it("F13: Vercel y Google ven exactamente la misma URL", () => {
    pagina(false);
    const urls = [
      "https://somosnosotros.org/personas/00000000-0000-0000-0000-000000000001",
      "https://somosnosotros.org/agenda?tipo=correo%40local.test",
      "https://somosnosotros.org/agenda?cuanto=gratis&q=rosa&lat=22.1&lng=-100.9",
      "https://somosnosotros.org/artistas?hace=musica&que=Los%20Vecinos",
      "https://somosnosotros.org/lugares?tipo=museo&tipo=otro@x.mx",
      "https://somosnosotros.org/nuevo/lugar?nombre=Casa&lat=22.151123&lng=-100.977456",
      "https://somosnosotros.org/lugares/casa-de-la-cultura",
      "https://somosnosotros.org/eventos/fiesta-inventada/editar",
      "https://somosnosotros.org/e/fiesta-inventada",
      "https://somosnosotros.org/perfil",
      "https://somosnosotros.org/entrar?siguiente=/",
      "https://somosnosotros.org/",
    ];
    for (const url of urls) {
      const enVercel = antes({ type: "pageview", url });
      expect(enVercel === null ? null : enVercel.url).toBe(limpiarUrlGoogle(url));
    }
  });
});
