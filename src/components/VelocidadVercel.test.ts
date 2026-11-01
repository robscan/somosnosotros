import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MedicionVelocidad } from "./VelocidadVercel";

// `SpeedInsights` de Vercel, reducido a guardar el `beforeSend` que recibe: así se prueba lo que el componente le pasa de verdad.
const recibido: { beforeSend?: (m: MedicionVelocidad) => MedicionVelocidad | null } = {};
vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: (p: { beforeSend?: (m: MedicionVelocidad) => MedicionVelocidad | null }) => {
    recibido.beforeSend = p.beforeSend;
    return null;
  },
}));

import VelocidadVercel from "./VelocidadVercel";

/** La marca del rol que pinta `MarcaAdmin`: «admin», «otro» o ninguna (aún sin resolver). */
const marca = (rol: "admin" | "otro" | null) =>
  vi.stubGlobal("document", { querySelector: (sel: string) => (rol && sel === "[data-medir-rol]" ? { getAttribute: (a: string) => (a === "data-medir-rol" ? rol : null) } : null) });

afterEach(() => vi.unstubAllGlobals());

const O = "https://somosnosotros.org";
const vital = (ruta: string, route?: string): MedicionVelocidad => ({ type: "vital", url: O + ruta, ...(route ? { route } : {}) });

describe("VelocidadVercel (OL-499)", () => {
  renderToStaticMarkup(createElement(VelocidadVercel));
  const antes = (m: MedicionVelocidad) => recibido.beforeSend!(m);

  it("le pasa un beforeSend a Speed Insights", () => {
    expect(typeof recibido.beforeSend).toBe("function");
  });

  it("administración: se mide aunque mire la administración, con solo sus dos primeros tramos, sin ids ni consulta", () => {
    for (const rol of ["admin", "otro", null] as const) {
      marca(rol);
      expect(antes(vital("/admin"))).toEqual({ type: "vital", url: `${O}/admin`, route: "/admin" });
      expect(antes(vital("/admin/instagram?pestana=eventos"))).toEqual({ type: "vital", url: `${O}/admin/instagram`, route: "/admin/instagram" });
      expect(antes(vital("/admin/personas/00000000-0000-0000-0000-000000000001", "/admin/personas/[id]"))).toEqual({ type: "vital", url: `${O}/admin/personas`, route: "/admin/personas" });
      expect(antes(vital("/admin/ciudades/san-luis-potosi/propuestas"))).toEqual({ type: "vital", url: `${O}/admin/ciudades`, route: "/admin/ciudades" });
      // La barra codificada también corta.
      expect(antes(vital("/admin/showcase%2Fartista-inventado"))).toEqual({ type: "vital", url: `${O}/admin/showcase`, route: "/admin/showcase" });
    }
  });

  it("sinMedirEnPantalla: fuera de administración, con la marca de admin o sin rol resuelto no se manda nada", () => {
    for (const rol of ["admin", null] as const) {
      marca(rol);
      expect(antes(vital("/agenda"))).toBeNull();
      expect(antes(vital("/lugares/casa-inventada"))).toBeNull();
      expect(antes(vital("/perfil"))).toBeNull();
    }
  });

  it("rol «otro»: la página va con la limpieza de Analytics (lista blanca) y la ficha en su sección, con su ruta propia", () => {
    marca("otro");
    expect(antes(vital("/"))).toEqual({ type: "vital", url: `${O}/`, route: "/" });
    expect(antes(vital("/agenda?cuanto=gratis&q=rosa&lat=22.1&lng=-100.9"))).toEqual({ type: "vital", url: `${O}/agenda?cuanto=gratis`, route: "/agenda" });
    expect(antes(vital("/nuevo/lugar?nombre=Casa&lat=22.151123"))).toEqual({ type: "vital", url: `${O}/nuevo/lugar`, route: "/nuevo/lugar" });
    expect(antes(vital("/lugares"))).toEqual({ type: "vital", url: `${O}/lugares`, route: "/lugares" });
    // La ruta de la librería no se usa: con un slug con acentos la manda tal cual, con el slug.
    expect(antes(vital("/lugares/caf%C3%A9-inventado", "/lugares/caf%C3%A9-inventado"))).toEqual({ type: "vital", url: `${O}/lugares`, route: "/lugares/[ficha]" });
    expect(antes(vital("/eventos/fiesta-inventada/cartel", "/eventos/[slug]/cartel"))).toEqual({ type: "vital", url: `${O}/eventos`, route: "/eventos/[ficha]" });
    expect(antes(vital("/personas/00000000-0000-0000-0000-000000000001"))).toEqual({ type: "vital", url: `${O}/personas`, route: "/personas/[ficha]" });
  });

  it("rol «otro»: una ruta privada va con solo su primer tramo (interesa cuánto tarda, no quién la abre)", () => {
    marca("otro");
    expect(antes(vital("/perfil"))).toEqual({ type: "vital", url: `${O}/perfil`, route: "/perfil" });
    expect(antes(vital("/entrar?siguiente=%2Fnuevo%2Flugar%3Fnombre%3DCasa"))).toEqual({ type: "vital", url: `${O}/entrar`, route: "/entrar" });
    expect(antes(vital("/invitacion/codigo-inventado-123"))).toEqual({ type: "vital", url: `${O}/invitacion`, route: "/invitacion" });
    expect(antes(vital("/ajustes/cuenta"))).toEqual({ type: "vital", url: `${O}/ajustes`, route: "/ajustes" });
  });

  it("una URL que no se puede leer no se manda", () => {
    marca("otro");
    expect(antes({ type: "vital", url: "no es una url" })).toBeNull();
  });
});
