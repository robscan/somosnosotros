import { createElement, Suspense, type ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

// La sesión que lee el layout, con retraso controlado a mano (la de `usuarioDeLaBarra`).
let resolverSesion: (v: { perfil: { rol: "admin" | "usuario" } } | null) => void = () => {};
vi.mock("./usuarioDeLaBarra", () => ({
  usuarioDeLaBarra: () => new Promise((ok) => (resolverSesion = ok)),
}));
// Vercel: cada vez que se monta su componente, deja una huella en el HTML (con él montado saldría la primera vista).
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => createElement("b", { "data-vercel": "" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/script", () => ({ default: (p: { src?: string }) => createElement("script", { src: p.src }) }));

import AnalyticsGoogle from "./AnalyticsGoogle";
import AnalyticsVercel from "./AnalyticsVercel";
import MarcaAdmin from "./MarcaAdmin";

/** El trozo del layout de verdad: la marca dentro de `Suspense`, con la analítica dentro de la marca. */
const trozo = () =>
  createElement(
    Suspense,
    { fallback: null },
    createElement(
      MarcaAdmin as unknown as (p: { children?: ReactNode }) => ReactNode,
      null,
      createElement(AnalyticsVercel, { key: "v" }),
      createElement(AnalyticsGoogle, { key: "g", id: "G-PRUEBA1234", produccion: true }),
    ),
  );

/** Pinta en streaming: lo que sale antes de que la sesión responda (el armazón) y lo que sale al final. */
function pintar(): { armazon: Promise<string>; final: Promise<string> } {
  let html = "";
  let avisarArmazon: (s: string) => void = () => {};
  let avisarFinal: (s: string) => void = () => {};
  const armazon = new Promise<string>((ok) => (avisarArmazon = ok));
  const final = new Promise<string>((ok) => (avisarFinal = ok));
  const salida = new Writable({
    write(trozo, _c, listo) {
      html += String(trozo);
      listo();
    },
    final(listo) {
      avisarFinal(html);
      listo();
    },
  });
  const flujo = renderToPipeableStream(trozo(), {
    onShellReady() {
      flujo.pipe(salida);
      setTimeout(() => avisarArmazon(html), 20);
    },
  });
  return { armazon, final };
}

describe("MarcaAdmin: la medición arranca cuando se sabe quién mira (OL-325, F10 de OL-327)", () => {
  it("con una sesión de administración que responde con retraso, ninguna analítica se monta: ni antes ni después", async () => {
    const { armazon, final } = pintar();
    const antes = await armazon;
    expect(antes).not.toContain("data-vercel");
    expect(antes).not.toContain("googletagmanager");
    expect(antes).not.toContain("data-medir-rol"); // aún sin rol: nada se mide (`sinMedirEnPantalla`)
    await new Promise((ok) => setTimeout(ok, 60)); // la sesión tarda
    resolverSesion({ perfil: { rol: "admin" } });
    const html = await final;
    expect(html).toContain('data-medir-rol="admin"');
    expect(html).not.toContain("data-vercel");
    expect(html).not.toContain("googletagmanager");
  });

  it("con una sesión que no es admin (o sin sesión), la analítica se monta solo cuando el rol ya se resolvió", async () => {
    for (const sesion of [{ perfil: { rol: "usuario" as const } }, null]) {
      const { armazon, final } = pintar();
      expect(await armazon).not.toContain("data-vercel");
      await new Promise((ok) => setTimeout(ok, 30));
      resolverSesion(sesion);
      const html = await final;
      expect(html).toContain('data-medir-rol="otro"');
      expect(html).toContain("data-vercel");
      expect(html).toContain("googletagmanager.com/gtag/js?id=G-PRUEBA1234");
      expect(html.indexOf("data-medir-rol")).toBeLessThan(html.indexOf("data-vercel")); // la marca va antes que la analítica
    }
  });
});
