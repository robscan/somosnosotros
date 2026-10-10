import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
// `next/script` con `afterInteractive` no pinta nada en el servidor: aquí se pinta como <script> para ver qué carga.
vi.mock("next/script", () => ({ default: (p: { src?: string; id?: string }) => createElement("script", { src: p.src, id: p.id }) }));

import AnalyticsGoogle from "@/components/AnalyticsGoogle";
import { CONSENTIMIENTO_DENEGADO, idGoogleValido, iniciarGoogle, vistaGoogle } from "./analyticsGoogle";

const ID = "G-PRUEBA1234"; // inventado: nunca el de verdad en el repo

afterEach(() => vi.unstubAllGlobals());

/** Lo que quedó en la cola de `gtag`, como arreglos. */
const cola = (v: { dataLayer?: unknown[] }) => (v.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));

describe("AnalyticsGoogle: solo con identificador y en producción (OL-325)", () => {
  it("sin identificador no se monta nada", () => {
    expect(renderToStaticMarkup(createElement(AnalyticsGoogle, { id: undefined, produccion: true }))).toBe("");
    expect(renderToStaticMarkup(createElement(AnalyticsGoogle, { id: "", produccion: true }))).toBe("");
  });
  it("fuera de producción no se monta nada, aunque haya identificador", () => {
    expect(renderToStaticMarkup(createElement(AnalyticsGoogle, { id: ID, produccion: false }))).toBe("");
  });
  it("un identificador raro no se carga (ni se mete en un guion)", () => {
    expect(renderToStaticMarkup(createElement(AnalyticsGoogle, { id: "G-1');alert(1)//", produccion: true }))).toBe("");
    expect(renderToStaticMarkup(createElement(AnalyticsGoogle, { id: "UA-12345-1", produccion: true }))).toBe("");
    expect(idGoogleValido("GTM-ABCD12")).toBe(false);
  });
  it("con identificador y en producción carga gtag.js directo, sin Tag Manager", () => {
    const html = renderToStaticMarkup(createElement(AnalyticsGoogle, { id: ID, produccion: true }));
    expect(html).toContain(`src="https://www.googletagmanager.com/gtag/js?id=${ID}"`);
    expect(html).not.toContain("gtm.js");
  });
});

describe("iniciarGoogle: consentimiento denegado antes que la configuración", () => {
  it("el orden de la cola: consentimiento denegado, redacción, ubicación limpia, js, config", () => {
    const v: { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; location: { href: string } } = { location: { href: "https://somosnosotros.org/buscar?q=rosa" } };
    expect(iniciarGoogle(v, ID)).toBe(true);
    const c = cola(v);
    expect(c[0]).toEqual(["consent", "default", CONSENTIMIENTO_DENEGADO]);
    const iConfig = c.findIndex((x) => x[0] === "config");
    expect(iConfig).toBeGreaterThan(0);
    expect(c[iConfig]).toEqual(["config", ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false }]);
    expect(c).toContainEqual(["set", "ads_data_redaction", true]);
    expect(c).toContainEqual(["set", { page_location: "https://somosnosotros.org/buscar", page_title: "/buscar", page_referrer: "" }]);
    expect(JSON.stringify(c)).not.toContain("rosa");
    for (const clave of ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"]) expect(CONSENTIMIENTO_DENEGADO).toHaveProperty(clave, "denied");
    // Nunca se concede después.
    expect(c.some((x) => x[0] === "consent" && x[1] === "update")).toBe(false);
  });
  it("una sola vez; con identificador raro, nada", () => {
    const v = { location: { href: "https://somosnosotros.org/" } };
    expect(iniciarGoogle(v, ID)).toBe(true);
    expect(iniciarGoogle(v, ID)).toBe(false);
    const w: { dataLayer?: unknown[]; location: { href: string } } = { location: { href: "https://somosnosotros.org/" } };
    expect(iniciarGoogle(w, "G-x');")).toBe(false);
    expect(w.dataLayer).toBeUndefined();
  });
});

describe("vistaGoogle: vistas a mano con la URL limpia", () => {
  const conRol = (rol: "admin" | "otro" | null) =>
    vi.stubGlobal("document", { querySelector: (sel: string) => (rol && sel === "[data-medir-rol]" ? { getAttribute: () => rol } : null) });
  const sinAdmin = () => conRol("otro");
  it("manda page_view con la ruta limpia", () => {
    sinAdmin();
    const gtag = vi.fn();
    expect(vistaGoogle({ gtag, location: { href: "https://somosnosotros.org/agenda?q=rosa&filtro=siguiendo" } })).toBe(true);
    expect(gtag).toHaveBeenCalledWith("event", "page_view", { page_location: "https://somosnosotros.org/agenda?filtro=siguiendo", page_title: "/agenda", page_referrer: "" });
  });
  it("F13: ni el id de una persona ni un valor libre de un filtro llegan a Google", () => {
    sinAdmin();
    const persona = vi.fn();
    expect(vistaGoogle({ gtag: persona, location: { href: "https://somosnosotros.org/personas/00000000-0000-0000-0000-000000000001" } })).toBe(true);
    expect(persona).toHaveBeenCalledWith("event", "page_view", { page_location: "https://somosnosotros.org/personas", page_title: "/personas", page_referrer: "" });
    const libre = vi.fn();
    expect(vistaGoogle({ gtag: libre, location: { href: "https://somosnosotros.org/agenda?tipo=correo%40local.test" } })).toBe(true);
    expect(libre).toHaveBeenCalledWith("event", "page_view", { page_location: "https://somosnosotros.org/agenda", page_title: "/agenda", page_referrer: "" });
    expect(JSON.stringify([...persona.mock.calls, ...libre.mock.calls])).not.toMatch(/0000-0000|correo|local\.test/);
  });
  it("OL-340: la vista de una ficha llega a Google en su sección, sin el slug", () => {
    sinAdmin();
    const gtag = vi.fn();
    expect(vistaGoogle({ gtag, location: { href: "https://somosnosotros.org/sitios/plaza-inventada" } })).toBe(true);
    expect(gtag).toHaveBeenCalledWith("event", "page_view", { page_location: "https://somosnosotros.org/sitios", page_title: "/sitios", page_referrer: "" });
    const evento = vi.fn();
    expect(vistaGoogle({ gtag: evento, location: { href: "https://somosnosotros.org/eventos/fiesta-inventada/cartel" } })).toBe(true);
    expect(evento).toHaveBeenCalledWith("event", "page_view", { page_location: "https://somosnosotros.org/eventos", page_title: "/eventos", page_referrer: "" });
    expect(JSON.stringify([...gtag.mock.calls, ...evento.mock.calls])).not.toMatch(/inventada/);
  });
  it("una ruta privada no manda vista, pero lo que siga saliendo de ahí lleva solo su primer tramo", () => {
    sinAdmin();
    const gtag = vi.fn();
    expect(vistaGoogle({ gtag, location: { href: "https://somosnosotros.org/perfil/editar" } })).toBe(false);
    expect(gtag).toHaveBeenCalledWith("set", { page_location: "https://somosnosotros.org/perfil", page_title: "/perfil", page_referrer: "" });
    expect(gtag).not.toHaveBeenCalledWith("event", "page_view", expect.anything());
  });
  it("para la administración no manda nada", () => {
    conRol("admin");
    const gtag = vi.fn();
    expect(vistaGoogle({ gtag, location: { href: "https://somosnosotros.org/" } })).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });
  it("F10: mientras el rol no se sepa no manda vista", () => {
    conRol(null);
    const gtag = vi.fn();
    expect(vistaGoogle({ gtag, location: { href: "https://somosnosotros.org/" } })).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });
  it("nunca lanza, aunque gtag falle", () => {
    sinAdmin();
    expect(
      vistaGoogle({
        gtag: () => {
          throw new Error("bloqueado");
        },
        location: { href: "https://somosnosotros.org/" },
      }),
    ).toBe(false);
  });
});
