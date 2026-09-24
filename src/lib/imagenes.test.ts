import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { imagenPermitida } from "./imagenes";

const SUPABASE_URL = "https://xyz.supabase.co";
const PROPIA = `${SUPABASE_URL}/storage/v1/object/public/fotos/artistas/abc/foto-1.jpg`;
const AJENA = "https://evil.example/tracking.png";

describe("imagenPermitida (S-01, docs/rediseno/46)", () => {
  let antes: string | undefined;
  beforeEach(() => {
    antes = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = antes;
  });

  it("vacía pasa, sea o no admin", () => {
    expect(imagenPermitida("", { esAdmin: false })).toBe(true);
    expect(imagenPermitida(null, { esAdmin: false })).toBe(true);
    expect(imagenPermitida(undefined, { esAdmin: true })).toBe(true);
  });

  it("una URL del Storage propio pasa, sea o no admin", () => {
    expect(imagenPermitida(PROPIA, { esAdmin: false })).toBe(true);
    expect(imagenPermitida(PROPIA, { esAdmin: true })).toBe(true);
  });

  it("un dominio ajeno falla para quien no es admin y pasa para admin (el hallazgo del doc 46)", () => {
    expect(imagenPermitida(AJENA, { esAdmin: false })).toBe(false);
    expect(imagenPermitida(AJENA, { esAdmin: true })).toBe(true);
  });

  it("http:// falla, sea o no admin", () => {
    expect(imagenPermitida("http://evil.example/x.png", { esAdmin: false })).toBe(false);
    expect(imagenPermitida("http://evil.example/x.png", { esAdmin: true })).toBe(false);
  });

  it("con espacios falla aunque sea https", () => {
    expect(imagenPermitida("https://evil.example/x y.png", { esAdmin: true })).toBe(false);
  });

  it("una URL parecida pero de otro dominio (no literalmente el prefijo propio) no cuela", () => {
    expect(imagenPermitida(`https://xyz.supabase.co.evil.com/storage/v1/object/public/fotos/x.jpg`, { esAdmin: false })).toBe(false);
  });

  it("igual a la que ya estaba guardada (`actual`) pasa aunque sea de otro dominio y no sea admin: no rompe una ficha del CAPO", () => {
    expect(imagenPermitida(AJENA, { esAdmin: false, actual: AJENA })).toBe(true);
  });

  it("distinta de la actual, sigue las reglas normales", () => {
    expect(imagenPermitida(AJENA, { esAdmin: false, actual: "https://otra.example/y.png" })).toBe(false);
  });

  it("sin NEXT_PUBLIC_SUPABASE_URL configurado, ninguna URL cuenta como del Storage propio", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(imagenPermitida(PROPIA, { esAdmin: false })).toBe(false);
    expect(imagenPermitida(PROPIA, { esAdmin: true })).toBe(true);
  });
});
