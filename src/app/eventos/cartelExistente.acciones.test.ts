import { beforeEach, describe, expect, it, vi } from "vitest";
import { parecidosDelCartel, ponerMiCartel } from "./cartelExistente";

// OL-467 (bitácora 499): «Sí, es este: ponerle mi cartel». La regla de quién puede vive en la base (`poner_cartel_a_evento`, banco en
// supabase/tests/pg/cartel-a-evento-existente.test.mjs); aquí, qué se manda, qué se avisa y a quién, y qué vuelve para el final.
const m = vi.hoisted(() => ({ rpc: vi.fn(), sesion: vi.fn(), after: vi.fn(), avisar: vi.fn(), bajar: vi.fn(), colores: vi.fn(), huella: vi.fn(), admin: vi.fn(), esAdmin: vi.fn(), lecturas: [] as { tabla: string; columnas: string }[], huellas: [] as unknown[] }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ esAdminDeSesion: m.esAdmin }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: m.admin }));
vi.mock("@/lib/redes/herramientas", () => ({ avisarAlTelefono: m.avisar }));
vi.mock("@/lib/rutinas/imagenWeb", () => ({ bajarImagen: m.bajar }));
vi.mock("@/lib/coloresCartelServidor", () => ({ coloresDeImagenEnMemoria: m.colores }));
vi.mock("@/lib/carteles/huellaServidor", () => ({ huellaDeCartel: m.huella }));
vi.mock("@/lib/config", () => ({ configPublica: () => ({ supabaseUrl: "https://proyecto.supabase.co", supabaseAnonKey: "anon" }) }));

const ANA = "00000000-0000-4000-8000-0000000000a1";
const MARCOS = "00000000-0000-4000-8000-0000000000a2";
const EVENTO = "00000000-0000-4000-8000-0000000000e1";
const LUGAR = "00000000-0000-4000-8000-0000000000f1";
const CARTEL = `https://proyecto.supabase.co/storage/v1/object/public/fotos/lugares/${ANA}/evento-123.jpg`;
const PALETA = ["#7a1f2b", "#3d0f15", "#fff6e0", "#e9b949"];
const FILA = { id: EVENTO, slug: "noche-de-danzon", titulo: "Noche de danzón con la Orquesta Típica", inicio: "2026-10-10T02:00:00.000Z", fin: "2026-10-10T05:00:00.000Z", zona: "America/Mexico_City", imagen: CARTEL, precio: "$150", lugar_id: LUGAR, sitio_texto: null, sitio_direccion: null, sitio_reservado: false, creado_en: "2026-10-01T00:00:00.000Z", clase: "puntual", evento_padre_id: null, lugar: { nombre: "Teatro de la Paz", portada: null } };

function formulario(cambios: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ imagen: CARTEL, descripcion: "Baile de salón.", gratis: "no", cooperacion: "no", precio: "150", fin: "2026-10-09T23:00", quien: JSON.stringify([{ nombre: "Orquesta Típica de San Luis" }]), ...cambios })) fd.set(k, v);
  return fd;
}

let respuesta: { data: unknown; error: unknown };
let creadoPor: { id: string; creado_por: string }[];
beforeEach(() => {
  vi.clearAllMocks();
  m.lecturas.length = 0;
  m.huellas.length = 0;
  respuesta = { data: { id: EVENTO, slug: "noche-de-danzon", lugar_id: LUGAR, dueno: MARCOS, completado: ["descripcion", "precio", "fin", "artistas"], reemplazado: false, artistas: ["art-1"] }, error: null };
  creadoPor = [];
  const from = vi.fn((tabla: string) => ({
    select: vi.fn((columnas: string) => {
      m.lecturas.push({ tabla, columnas });
      const fila = tabla === "perfiles" ? { nombre: "Ana" } : tabla === "lugares" ? { zona: "America/Mexico_City" } : columnas.startsWith("id, zona") ? { id: EVENTO, zona: "America/Mexico_City", clase: "puntual", evento_padre_id: null } : FILA;
      return { eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: fila, error: null }) })), in: vi.fn().mockResolvedValue({ data: creadoPor, error: null }) };
    }),
  }));
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc, from }, user: { id: ANA } });
  m.esAdmin.mockResolvedValue(false);
  m.rpc.mockImplementation(async (nombre: string) => (nombre === "poner_cartel_a_evento" ? respuesta : { data: [], error: null }));
  m.bajar.mockResolvedValue(Buffer.from("jpg"));
  m.colores.mockResolvedValue(PALETA);
  m.huella.mockResolvedValue("h".repeat(10));
  m.admin.mockReturnValue({ from: () => ({ update: (v: unknown) => { m.huellas.push(v); return { eq: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }) }; } }) });
  m.after.mockImplementation((fn: () => unknown) => fn());
  m.avisar.mockResolvedValue(undefined);
});
const llamada = (nombre: string) => m.rpc.mock.calls.find(([n]) => n === nombre)?.[1];

describe("ponerMiCartel", () => {
  it("manda el cartel, sus colores y lo leído en la zona del evento; avisa a quien lo publicó", async () => {
    const r = await ponerMiCartel(EVENTO, formulario());
    expect(llamada("poner_cartel_a_evento")).toEqual({
      p_evento: EVENTO,
      p_imagen: CARTEL,
      p_colores: PALETA,
      p_completar: { descripcion: "Baile de salón.", precio: "$150", fin: "2026-10-10T05:00:00.000Z", quien: [{ nombre: "Orquesta Típica de San Luis", tipo: "grupo" }] },
      p_reemplazar: false,
    });
    expect(r).toMatchObject({ ok: true, completado: ["descripcion", "precio", "fin", "artistas"], reemplazado: false, evento: { id: EVENTO, slug: "noche-de-danzon", titulo: FILA.titulo, imagen: CARTEL, lugar: { nombre: "Teatro de la Paz", portada: null }, van: null } });
    expect(m.huellas).toEqual([{ cartel_huella: "h".repeat(10) }]);
    expect(m.avisar).toHaveBeenCalledTimes(1);
    expect(m.avisar.mock.calls[0][1]).toBe(MARCOS);
    expect(m.avisar.mock.calls[0][2]).toEqual({ titulo: "Tu evento tiene cartel", cuerpo: "Ana le puso cartel a tu evento «Noche de danzón con la Orquesta Típica»", url: "/eventos/noche-de-danzon", tag: `cartel-${EVENTO}` });
  });

  it("a mi propio evento no me aviso", async () => {
    respuesta = { data: { ...(respuesta.data as object), dueno: ANA }, error: null };
    expect(await ponerMiCartel(EVENTO, formulario())).toMatchObject({ ok: true });
    expect(m.avisar).not.toHaveBeenCalled();
  });

  it("cambiar su cartel no completa nada", async () => {
    respuesta = { data: { ...(respuesta.data as object), completado: [], reemplazado: true }, error: null };
    const r = await ponerMiCartel(EVENTO, formulario(), true);
    expect(llamada("poner_cartel_a_evento")).toMatchObject({ p_completar: null, p_reemplazar: true });
    expect(r).toMatchObject({ ok: true, reemplazado: true, completado: [] });
  });

  it("sin bajar la imagen, los colores del teléfono y sin huella", async () => {
    m.bajar.mockResolvedValue(null);
    await ponerMiCartel(EVENTO, formulario({ colores_cartel: JSON.stringify(PALETA) }));
    expect(llamada("poner_cartel_a_evento")).toMatchObject({ p_colores: PALETA });
    expect(m.huellas).toEqual([]);
  });

  it("solo una imagen de la carpeta de quien la sube", async () => {
    const ajena = `https://proyecto.supabase.co/storage/v1/object/public/fotos/lugares/${MARCOS}/evento-1.jpg`;
    expect(await ponerMiCartel(EVENTO, formulario({ imagen: ajena }))).toEqual({ ok: false, mensaje: "No se pudo poner tu cartel. Sube la imagen otra vez." });
    expect(await ponerMiCartel(EVENTO, formulario({ imagen: "https://otro.sitio/cartel.jpg" }))).toMatchObject({ ok: false });
    expect(await ponerMiCartel("no-es-id", formulario())).toMatchObject({ ok: false });
    expect(llamada("poner_cartel_a_evento")).toBeUndefined();
  });

  it("los «no» de la base, en frases", async () => {
    respuesta = { data: null, error: { code: "23505", message: "ya_tiene_cartel" } };
    expect(await ponerMiCartel(EVENTO, formulario())).toEqual({ ok: false, mensaje: "Alguien le acaba de poner cartel a ese evento.", yaTieneCartel: true });
    respuesta = { data: null, error: { code: "42501", message: "solo_quien_lo_publico" } };
    expect(await ponerMiCartel(EVENTO, formulario(), true)).toEqual({ ok: false, mensaje: "Solo quien lo publicó puede cambiarlo." });
    expect(m.avisar).not.toHaveBeenCalled();
  });
});

describe("parecidosDelCartel (al leer el cartel)", () => {
  const PARECIDO = { id: EVENTO, slug: "noche-de-danzon", titulo: "Noche de danzón", inicio: "2026-10-10T02:00:00.000Z", zona: "America/Mexico_City", imagen: null, lugar_id: LUGAR, lugar_nombre: "Teatro de la Paz", sitio_texto: null };

  it("pregunta a eventos_parecidos con la hora en la zona del lugar", async () => {
    m.rpc.mockResolvedValue({ data: [PARECIDO], error: null });
    expect(await parecidosDelCartel({ titulo: "Noche de Danzón", inicio: "2026-10-09T20:00", clase: "puntual", lugarId: LUGAR, sitioTexto: null })).toEqual([PARECIDO]);
    expect(m.rpc).toHaveBeenCalledWith("eventos_parecidos", { p_titulo: "Noche de Danzón", p_inicio: "2026-10-10T02:00:00.000Z", p_zona: "America/Mexico_City", p_lugar_id: LUGAR, p_sitio_texto: null });
  });

  it("de uno con cartel dice si quien mira puede cambiarlo (lo publicó)", async () => {
    m.rpc.mockResolvedValue({ data: [{ ...PARECIDO, imagen: "c.jpg" }], error: null });
    creadoPor = [{ id: EVENTO, creado_por: MARCOS }];
    expect((await parecidosDelCartel({ titulo: "Noche", inicio: "2026-10-09T20:00", clase: "puntual", lugarId: LUGAR, sitioTexto: null }))[0].puede_cambiar).toBe(false);
    creadoPor = [{ id: EVENTO, creado_por: ANA }];
    expect((await parecidosDelCartel({ titulo: "Noche", inicio: "2026-10-09T20:00", clase: "puntual", lugarId: LUGAR, sitioTexto: null }))[0].puede_cambiar).toBe(true);
    m.esAdmin.mockResolvedValue(true);
    creadoPor = [];
    expect((await parecidosDelCartel({ titulo: "Noche", inicio: "2026-10-09T20:00", clase: "puntual", lugarId: LUGAR, sitioTexto: null }))[0].puede_cambiar).toBe(true);
  });

  it("sin nombre, sin sitio, una exposición o si la base falla: nada", async () => {
    expect(await parecidosDelCartel({ titulo: "", inicio: "2026-10-09T20:00", clase: "puntual", lugarId: LUGAR, sitioTexto: null })).toEqual([]);
    expect(await parecidosDelCartel({ titulo: "Noche", inicio: "2026-10-09T20:00", clase: "puntual", lugarId: null, sitioTexto: "" })).toEqual([]);
    expect(await parecidosDelCartel({ titulo: "Noche", inicio: "2026-10-09T20:00", clase: "exposicion", lugarId: LUGAR, sitioTexto: null })).toEqual([]);
    expect(m.rpc).not.toHaveBeenCalled();
    m.rpc.mockResolvedValue({ data: null, error: { message: "sin red" } });
    expect(await parecidosDelCartel({ titulo: "Noche", inicio: "2026-10-09T20:00", clase: "puntual", lugarId: null, sitioTexto: "Teatro de la Paz" })).toEqual([]);
  });
});
