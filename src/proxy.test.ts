import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El proxy con la base fingida: qué consulta hace cada dirección y qué responde (OL-123). Lo que se mide aquí es
 * el contrato HTTP (308 + Location absoluta sobre el mismo origen, query conservada, cookies refrescadas) y el costo (una consulta solo
 * cuando la ruta trae UUID); la consulta real la comprueba `curl` contra `next start` con un respaldo local.
 */
const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const consultas: { tabla: string; columnas: string; filtro: [string, string] }[] = [];
let filas: Record<string, { slug: string | null } | null> = {};
let cookiesRefrescadas: { name: string; value: string; options?: Record<string, unknown> }[] = [];

vi.mock("@/lib/config", () => ({ configPublica: () => ({ supabaseUrl: "http://base.local", supabaseAnonKey: "llave" }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _llave: string, opciones: { cookies: { setAll: (c: typeof cookiesRefrescadas) => void } }) => ({
    auth: {
      getClaims: async () => {
        if (cookiesRefrescadas.length) opciones.cookies.setAll(cookiesRefrescadas);
        return { data: null };
      },
    },
    from: (tabla: string) => ({
      select: (columnas: string) => ({
        eq: (col: string, val: string) => ({
          maybeSingle: async () => {
            consultas.push({ tabla, columnas, filtro: [col, val] });
            return { data: filas[val] ?? null };
          },
        }),
      }),
    }),
  }),
}));

const { proxy } = await import("./proxy");
const pedir = (ruta: string) => proxy(new NextRequest(`https://somosnosotros.org${ruta}`));

beforeEach(() => {
  consultas.length = 0;
  filas = { [UUID]: { slug: "noche-de-jazz" } };
  cookiesRefrescadas = [];
});

describe("proxy: 308 real desde la dirección con UUID", () => {
  it("responde 308 con Location absoluta sobre el mismo origen y una sola consulta de la columna slug", async () => {
    const r = await pedir(`/eventos/${UUID}`);
    expect(r.status).toBe(308);
    expect(r.headers.get("location")).toBe("https://somosnosotros.org/eventos/noche-de-jazz");
    expect(consultas).toEqual([{ tabla: "eventos", columnas: "slug", filtro: ["id", UUID] }]);
  });
  it("conserva la query y el tramo posterior", async () => {
    const r = await pedir(`/lugares/${UUID}/editar?nuevo=1&accion=seguir`);
    expect(r.status).toBe(308);
    expect(r.headers.get("location")).toBe("https://somosnosotros.org/lugares/noche-de-jazz/editar?nuevo=1&accion=seguir");
    expect(consultas[0]?.tabla).toBe("lugares");
  });
  it("pregunta en la tabla de la sección (artistas)", async () => {
    const r = await pedir(`/artistas/${UUID}`);
    expect(r.headers.get("location")).toBe("https://somosnosotros.org/artistas/noche-de-jazz");
    expect(consultas[0]?.tabla).toBe("artistas");
  });
  it("las direcciones con slug pasan sin ninguna consulta", async () => {
    const r = await pedir("/eventos/noche-de-jazz?accion=voy");
    expect(r.status).toBe(200);
    expect(r.headers.get("location")).toBeNull();
    expect(consultas).toEqual([]);
  });
  it("otras rutas tampoco consultan", async () => {
    for (const ruta of ["/", "/eventos", `/obra/${UUID}`, `/personas/${UUID}`]) {
      const r = await pedir(ruta);
      expect(r.status).toBe(200);
    }
    expect(consultas).toEqual([]);
  });
  it("si la fila no existe o no es visible, deja pasar para que la página decida (404 o su propio redirect)", async () => {
    filas = {};
    const r = await pedir(`/eventos/${UUID}`);
    expect(r.status).toBe(200);
    expect(r.headers.get("location")).toBeNull();
    expect(consultas).toHaveLength(1);
  });
  it("si la fila no tiene slug todavía, deja pasar", async () => {
    filas = { [UUID]: { slug: null } };
    const r = await pedir(`/eventos/${UUID}`);
    expect(r.status).toBe(200);
  });
  it("las cookies refrescadas en esta petición viajan también con el 308", async () => {
    cookiesRefrescadas = [{ name: "sb-token", value: "nuevo", options: { path: "/" } }];
    const r = await pedir(`/eventos/${UUID}`);
    expect(r.status).toBe(308);
    expect(r.cookies.get("sb-token")?.value).toBe("nuevo");
  });
});
