import { describe, expect, it, vi } from "vitest";
import { guardarConexion, tokenInstagram, tokenPorPeticion } from "./token";

// OL-471 (bitácora 503): el token de Vault primero; si no hay, el de respaldo de Vercel. Inventados.
const DE_VAULT = "EAAdevaultinventado471aaaaaaaaaaaaaaaa";
const RESPALDO = { INSTAGRAM_TOKEN: "EAArespaldoinventado471bbbbbbbbbbbbbb" };
const base = (r: { data?: unknown; error?: unknown } | Error) => ({ rpc: vi.fn(async () => (r instanceof Error ? Promise.reject(r) : r)) }) as never;

describe("tokenInstagram", () => {
  it("el de Vault manda", async () => {
    expect(await tokenInstagram(base({ data: DE_VAULT, error: null }), RESPALDO)).toBe(DE_VAULT);
  });
  it("sin token en Vault, sin la función o sin base: el de respaldo", async () => {
    expect(await tokenInstagram(base({ data: null, error: null }), RESPALDO)).toBe(RESPALDO.INSTAGRAM_TOKEN);
    expect(await tokenInstagram(base({ data: null, error: { code: "PGRST202" } }), RESPALDO)).toBe(RESPALDO.INSTAGRAM_TOKEN);
    expect(await tokenInstagram(base(new Error("sin red")), RESPALDO)).toBe(RESPALDO.INSTAGRAM_TOKEN);
    expect(await tokenInstagram(null, RESPALDO)).toBe(RESPALDO.INSTAGRAM_TOKEN);
    expect(await tokenInstagram(base({ data: [], error: null }), RESPALDO)).toBe(RESPALDO.INSTAGRAM_TOKEN);
  });
  it("sin ninguno, null", async () => {
    expect(await tokenInstagram(null, {})).toBeNull();
  });
});

describe("tokenPorPeticion", () => {
  it("lee una sola vez por petición", async () => {
    const leer = vi.fn(async () => DE_VAULT);
    const token = tokenPorPeticion(leer);
    expect(await Promise.all([token(), token(), token()])).toEqual([DE_VAULT, DE_VAULT, DE_VAULT]);
    expect(leer).toHaveBeenCalledTimes(1);
    // Otra petición, otra lectura.
    await tokenPorPeticion(leer)();
    expect(leer).toHaveBeenCalledTimes(2);
  });
});

describe("guardarConexion", () => {
  const c = { token: DE_VAULT, paginaId: "1374800000000471", paginaNombre: "Somos Nosotrxs", instagramId: "17841400000000471", instagramUsuario: "smsnstrsapp", permisos: ["instagram_basic"], conectadoPor: "11111111-2222-4333-8444-555555555555" };
  it("llama a instagram_guardar_conexion con todo", async () => {
    const db = base({ data: null, error: null }) as unknown as { rpc: ReturnType<typeof vi.fn> };
    expect(await guardarConexion(c, db as never)).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("instagram_guardar_conexion", expect.objectContaining({ p_token: DE_VAULT, p_pagina_id: c.paginaId, p_conectado_por: c.conectadoPor, p_permisos: c.permisos }));
  });
  it("si la base dice que no, false y una línea sin el token", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await guardarConexion(c, base({ data: null, error: { code: "55000", message: "Falta Vault" } }))).toBe(false);
    expect(JSON.stringify(aviso.mock.calls)).not.toContain(DE_VAULT);
    aviso.mockRestore();
    expect(await guardarConexion(c, null)).toBe(false);
  });
});
