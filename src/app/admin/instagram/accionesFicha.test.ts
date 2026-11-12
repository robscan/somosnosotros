import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FichaParaPublicar } from "@/lib/instagram/ficha";

/**
 * OL-515 (bitácora 548): las acciones de «Publicar en Instagram» desde la ficha de un artista o de un lugar, con dobles de la sesión, de la ficha y
 * de la base. Solo la administración; una ficha oculta, fuera de Instagram o sin material no se manda; un texto que no cabe tampoco; el trabajo se
 * guarda por `redes_encolar_ficha` con la sesión (nunca con la llave de servicio), con el pedido limpio; «duplicado» dice que ya va en camino y
 * «repetido» pide confirmar, y confirmando se manda `p_repetir`.
 */
const m = vi.hoisted(() => ({
  usuario: vi.fn(),
  cliente: vi.fn(),
  rpc: vi.fn(),
  cargarFicha: vi.fn(),
  material: vi.fn(),
  fuera: vi.fn(),
  en: vi.fn(),
  despues: vi.fn(),
  disparar: vi.fn(),
  servicio: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Map([["host", "somosnosotros.org"]]) }));
vi.mock("next/server", () => ({ after: m.despues }));
vi.mock("@/lib/rutinas/disparar", () => ({ dispararPaso: m.disparar, origenPropio: () => "https://somosnosotros.org" }));
vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.usuario, clienteServidor: m.cliente }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: m.servicio }));
vi.mock("@/lib/instagram/ficha", async (original) => ({ ...(await original<typeof import("@/lib/instagram/ficha")>()), cargarFicha: m.cargarFicha, fichaConMaterial: m.material }));
vi.mock("./semana", () => ({ comoCliente: (x: unknown) => x, fueraDeInstagram: m.fuera, enInstagramDeFicha: m.en }));

const { prepararFicha, publicarFicha } = await import("./accionesFicha");

const ID = "b0000000-0000-4000-8000-000000000515";
const lugar = (o: Partial<FichaParaPublicar> = {}): FichaParaPublicar => ({
  tipo: "lugar", id: ID, slug: "teatro-rino", nombre: "Teatro El Rino", ciudad: "San Luis Potosí", ciudadSlug: "san-luis-potosi", visible: true, grupo: true,
  ceja: "Teatro", cuenta: "teatrorino", portada: null, foto: null, proxima: null, semana: [],
  datos: { nombre: "Teatro El Rino", slug: "teatro-rino", descripcion: "Sala de teatro independiente con temporadas propias y de compañías invitadas.", tipo: "foro", ciudad: "San Luis Potosí", direccion: null, redes: [{ url: "https://www.instagram.com/teatrorino" }], semana: [] },
  ubicacion: { id: "108000000000458", nombre: "San Luis Potosí" },
  ...o,
});
const PEDIDO = { texto: null, quitadas: [], facebook: true };

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
  m.cliente.mockResolvedValue({ rpc: m.rpc });
  m.cargarFicha.mockResolvedValue(lugar());
  m.material.mockReturnValue(true);
  m.fuera.mockResolvedValue(null);
  m.en.mockResolvedValue({ salio: null, publicando: false, programada: null });
  m.rpc.mockResolvedValue({ data: { id: "t1" }, error: null });
});

describe("prepararFicha", () => {
  it("la administración: el contenido para armar el texto, la cuenta, la ubicación, la ciudad y cómo va en Instagram", async () => {
    m.en.mockResolvedValue({ salio: "Salió en Instagram hace 9 días", publicando: false, programada: "el mié 18 de nov" });
    const r = await prepararFicha("lugar", ID);
    expect(r).toMatchObject({ ok: true, tipo: "lugar", nombre: "Teatro El Rino", contenido: { tipo: "lugar", cuenta: "teatrorino", credito: null }, ubicacion: { nombre: "San Luis Potosí" }, ciudad: { nombre: "San Luis Potosí" }, en: { salio: "Salió en Instagram hace 9 días", programada: "el mié 18 de nov" } });
  });
  it("no es la administración, el id no es válido o la ficha no existe: no prepara nada", async () => {
    m.usuario.mockResolvedValue({ perfil: { id: "p", rol: "persona" } });
    expect(await prepararFicha("lugar", ID)).toEqual({ ok: false, mensaje: "Solo la administración publica en Instagram." });
    m.usuario.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
    expect((await prepararFicha("lugar", "no-es-uuid")).ok).toBe(false);
    expect((await prepararFicha("evento" as "lugar", ID)).ok).toBe(false);
    m.cargarFicha.mockResolvedValue(null);
    expect(await prepararFicha("lugar", ID)).toEqual({ ok: false, mensaje: "Esa ficha ya no existe." });
    expect(m.cargarFicha).toHaveBeenCalledOnce();
  });
  it("oculta, fuera de Instagram o sin material: la frase y nada más", async () => {
    m.cargarFicha.mockResolvedValueOnce(lugar({ visible: false }));
    expect(await prepararFicha("lugar", ID)).toEqual({ ok: false, mensaje: "Esta ficha está oculta: no se publica en Instagram." });
    m.fuera.mockResolvedValueOnce("el mié 7 de oct");
    expect((await prepararFicha("lugar", ID)) as { mensaje: string }).toMatchObject({ mensaje: expect.stringMatching(/^Dijo que no a salir en Instagram/) });
    m.material.mockReturnValueOnce(false);
    expect(await prepararFicha("artista", ID)).toEqual({ ok: false, mensaje: "A esta ficha le falta su foto en la app: súbela antes de publicarla." });
  });
});

describe("publicarFicha", () => {
  it("no es la administración: no llama a la base", async () => {
    m.usuario.mockResolvedValue(null);
    expect(await publicarFicha("lugar", ID, PEDIDO)).toEqual({ ok: false, mensaje: "Solo la administración publica en Instagram." });
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("guarda por `redes_encolar_ficha` con la sesión (no con la llave de servicio), con el pedido limpio, y pide el primer intento", async () => {
    const r = await publicarFicha("lugar", ID, { texto: "  Mi texto  ", quitadas: ["teatrorino", 3 as unknown as string], facebook: false, casilla: "x" } as never);
    expect(r).toEqual({ ok: true });
    expect(m.rpc).toHaveBeenCalledWith("redes_encolar_ficha", { p_tipo: "lugar", p_ficha: ID, p_pedido: { texto: "Mi texto", quitadas: ["teatrorino"], facebook: false }, p_repetir: false });
    expect(m.servicio).not.toHaveBeenCalled();
    expect(m.despues).toHaveBeenCalledOnce();
  });

  it("ficha oculta, fuera de Instagram o sin material: no se guarda", async () => {
    m.cargarFicha.mockResolvedValueOnce(lugar({ visible: false }));
    expect(await publicarFicha("lugar", ID, PEDIDO)).toMatchObject({ ok: false, mensaje: expect.stringMatching(/oculta/) });
    m.fuera.mockResolvedValueOnce("el mié 7 de oct");
    expect(await publicarFicha("lugar", ID, PEDIDO)).toMatchObject({ ok: false, mensaje: expect.stringMatching(/^Dijo que no/) });
    m.material.mockReturnValueOnce(false);
    expect(await publicarFicha("artista", ID, PEDIDO)).toMatchObject({ ok: false, mensaje: expect.stringMatching(/le falta su foto/) });
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("un texto que no cabe: lo dice y no se guarda", async () => {
    const r = await publicarFicha("lugar", ID, { ...PEDIDO, texto: "a".repeat(2300) });
    expect(r).toEqual({ ok: false, mensaje: expect.stringMatching(/^El texto pasa de 2,200 caracteres/) });
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("ya va en camino (duplicado): lo dice, sin botón de repetir", async () => {
    m.rpc.mockResolvedValue({ data: { duplicado: "t0" }, error: null });
    expect(await publicarFicha("lugar", ID, PEDIDO)).toEqual({ ok: false, yaIba: true, mensaje: "Ya se está publicando. Te avisamos en el teléfono cuando salga." });
    expect(m.despues).not.toHaveBeenCalled();
  });

  it("ya salió: sin confirmar pide confirmar («Salió en Instagram hace 9 días»); confirmando manda `p_repetir`", async () => {
    m.rpc.mockResolvedValueOnce({ data: { repetido: new Date(Date.now() - 9 * 86_400_000 - 60_000).toISOString() }, error: null });
    expect(await publicarFicha("lugar", ID, PEDIDO)).toEqual({ ok: false, repetido: "Salió en Instagram hace 9 días" });
    expect(m.despues).not.toHaveBeenCalled();
    expect(await publicarFicha("lugar", ID, PEDIDO, true)).toEqual({ ok: true });
    expect(m.rpc).toHaveBeenLastCalledWith("redes_encolar_ficha", expect.objectContaining({ p_repetir: true }));
  });

  it("lo que dice la base cuando no se puede, en frases llanas", async () => {
    const con = (code: string, message: string) => m.rpc.mockResolvedValueOnce({ data: null, error: { code, message } });
    con("42501", "Solo la administración publica en redes.");
    expect(await publicarFicha("lugar", ID, PEDIDO)).toEqual({ ok: false, mensaje: "Solo la administración publica en Instagram." });
    con("22023", "Esa ficha está fuera de Instagram.");
    expect(await publicarFicha("lugar", ID, PEDIDO)).toMatchObject({ mensaje: expect.stringMatching(/^Dijo que no/) });
    con("22023", "A esa ficha le falta material: su foto.");
    expect(await publicarFicha("lugar", ID, PEDIDO)).toMatchObject({ mensaje: expect.stringMatching(/le falta su foto/) });
    con("23503", "No existe esa ficha.");
    expect(await publicarFicha("lugar", ID, PEDIDO)).toEqual({ ok: false, mensaje: "Esa ficha ya no existe." });
    con("XX000", "algo raro");
    expect(await publicarFicha("lugar", ID, PEDIDO)).toEqual({ ok: false, mensaje: "No se pudo guardar la publicación. Intenta de nuevo; no se publicó nada." });
  });
});
