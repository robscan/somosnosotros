import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

// La petición de Next: sus cabeceras y `after()`, que aquí solo se anota (lo que hace después de responder se prueba aparte).
const peticion = vi.hoisted(() => ({ cabeceras: new Headers() as Headers | null, despues: [] as (() => unknown)[] }));
vi.mock("next/headers", () => ({
  headers: async () => {
    if (!peticion.cabeceras) throw new Error("`headers` was called outside a request scope");
    return peticion.cabeceras;
  },
}));
vi.mock("next/server", () => ({ after: (f: () => unknown) => void peticion.despues.push(f) }));
// El cliente de verdad: se anota con qué se crea (sin la llave de servicio, que aquí no hay).
const supa = vi.hoisted(() => ({ creados: [] as unknown[][], llamadas: [] as unknown[][] }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    supa.creados.push(args);
    return { rpc: async (...a: unknown[]) => (supa.llamadas.push(a), { data: true, error: null }) };
  },
}));
vi.mock("./supabase/admin", () => ({ clienteAdmin: () => null }));

import { anotarConsulta, contarConsulta, registrarVistaCiudad } from "./ciudadesVistas";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const cabeceras = (h: Record<string, string>) => new Headers(h);
const QRO = { slug: "queretaro", nombre: "Querétaro", centro: { lat: 20.59, lng: -100.39 }, zoom: 13, zona: "America/Mexico_City", centroConocido: true };

/** Un cliente de mentira que anota cada llamada: así se ve exactamente qué sale hacia la base. */
function cliente(respuestas: unknown[]) {
  const llamadas: { que: string; args: unknown }[] = [];
  const c = {
    rpc: vi.fn(async (nombre: string, args: unknown) => {
      llamadas.push({ que: `rpc ${nombre}`, args });
      return { data: respuestas.shift(), error: null };
    }),
    from: vi.fn((tabla: string) => ({
      upsert: vi.fn(async (fila: unknown, opciones: unknown) => {
        llamadas.push({ que: `upsert ${tabla}`, args: { fila, opciones } });
        return { error: null };
      }),
    })),
  };
  return { c: c as unknown as SupabaseClient, llamadas };
}

describe("detección de ciudades: una consulta es solo la ciudad y el día", () => {
  it("cuenta las páginas que ve alguien; no lo que Next pide de antemano, ni lo que repinta una acción, ni los robots", () => {
    expect(contarConsulta(cabeceras({ "user-agent": IPHONE }))).toBe(true);
    expect(contarConsulta(cabeceras({ "user-agent": IPHONE, "next-router-prefetch": "1" }))).toBe(false);
    expect(contarConsulta(cabeceras({ "user-agent": IPHONE, "sec-purpose": "prefetch;prerender" }))).toBe(false);
    expect(contarConsulta(cabeceras({ "user-agent": IPHONE, "next-action": "abc123" }))).toBe(false);
    expect(contarConsulta(cabeceras({ "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }))).toBe(false);
    expect(contarConsulta(cabeceras({ "user-agent": "WhatsApp/2.23.20.0" }))).toBe(false);
    expect(contarConsulta(cabeceras({}))).toBe(false);
  });

  it("una ciudad conocida: una sola llamada con el slug y nada más (sin persona)", async () => {
    const anonimo = cliente([true]);
    const servicio = cliente([]);
    expect(await registrarVistaCiudad(QRO, { anonimo: () => anonimo.c, servicio: () => servicio.c })).toBe("contada");
    expect(anonimo.llamadas).toEqual([{ que: "rpc registrar_ciudad_vista", args: { p_slug: "queretaro" } }]);
    expect(servicio.llamadas).toEqual([]);
  });

  it("una ciudad que no está: se da de alta como detectada con lo que la app sabe y se cuenta", async () => {
    const anonimo = cliente([false, true]);
    const servicio = cliente([]);
    expect(await registrarVistaCiudad(QRO, { anonimo: () => anonimo.c, servicio: () => servicio.c })).toBe("detectada");
    expect(servicio.llamadas).toEqual([
      { que: "upsert ciudades", args: { fila: { slug: "queretaro", nombre: "Querétaro", lat: 20.59, lng: -100.39, zoom: 13, zona: "America/Mexico_City", estado: "detectada" }, opciones: { onConflict: "slug", ignoreDuplicates: true } } },
    ]);
    expect(anonimo.llamadas.map((l) => l.args)).toEqual([{ p_slug: "queretaro" }, { p_slug: "queretaro" }]);
  });

  it("sin centro conocido, solo el nombre", async () => {
    const anonimo = cliente([false, true]);
    const servicio = cliente([]);
    await registrarVistaCiudad({ ...QRO, centroConocido: false }, { anonimo: () => anonimo.c, servicio: () => servicio.c });
    expect(servicio.llamadas[0].args).toMatchObject({ fila: { lat: null, lng: null, estado: "detectada" } });
  });

  it("sin clientes de prueba: un cliente anónimo, con la llave pública y sin sesión ni cookies de quien consulta", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:9");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "llave-anon");
    expect(await registrarVistaCiudad(QRO)).toBe("contada");
    expect(supa.creados).toEqual([["http://127.0.0.1:9", "llave-anon", { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }]]);
    expect(supa.llamadas).toEqual([["registrar_ciudad_vista", { p_slug: "queretaro" }]]);
    vi.unstubAllEnvs();
  });

  it("si algo falla no lanza ni toca nada más: solo no cuenta", async () => {
    const roto = { rpc: vi.fn(async () => { throw new Error("sin red"); }) } as unknown as SupabaseClient;
    expect(await registrarVistaCiudad(QRO, { anonimo: () => roto, servicio: () => null })).toBe("sin contar");
    const sinFuncion = cliente([[]]);
    const servicio = cliente([]);
    expect(await registrarVistaCiudad(QRO, { anonimo: () => sinFuncion.c, servicio: () => servicio.c })).toBe("sin contar");
    expect(servicio.llamadas).toEqual([]);
    expect(await registrarVistaCiudad(QRO, { anonimo: () => null, servicio: () => null })).toBe("sin contar");
  });
});

describe("Inicio y Lugares anotan la consulta sin esperar a la base", () => {
  beforeEach(() => {
    peticion.despues = [];
  });
  it("una consulta de alguien deja el registro para después de responder", async () => {
    peticion.cabeceras = cabeceras({ "user-agent": IPHONE, cookie: "sb-127-auth-token=de-alguien" });
    await anotarConsulta(QRO);
    expect(peticion.despues).toHaveLength(1);
  });
  it("lo que Next pide de antemano o un robot no se anota", async () => {
    peticion.cabeceras = cabeceras({ "user-agent": IPHONE, "next-router-prefetch": "1" });
    await anotarConsulta(QRO);
    peticion.cabeceras = cabeceras({ "user-agent": "Googlebot/2.1" });
    await anotarConsulta(QRO);
    expect(peticion.despues).toHaveLength(0);
  });
  it("fuera de una petición no tumba la página", async () => {
    peticion.cabeceras = null;
    await expect(anotarConsulta(QRO)).resolves.toBeUndefined();
    expect(peticion.despues).toHaveLength(0);
  });
});
