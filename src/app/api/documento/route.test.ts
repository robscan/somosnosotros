import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La ruta del PDF (OL-396): solo quien gestiona (Q firmado), con el mismo permiso que «Tu año»: el autor, una cuenta ligada o la administración.
 * A cualquier otro, 404 (sin sesión, ficha ajena, sin nada pasado, parámetros que no existen). Lo demás es real: la lectura (`cargarDocumento`,
 * con un cliente de Supabase de prueba), el dibujo de las páginas (satori y sharp) y el PDF.
 */

type Quien = { id: string; rol: "admin" | "usuario" } | null;
const estado = vi.hoisted(() => ({ quien: null as Quien, ligados: [] as { perfil_id: string }[], pasados: [] as unknown[] }));

const ARTISTA = { id: "a-1", slug: "leo-traeger", nombre: "Leo Traeger", detalle: "rock", tipo: "solista", ciudad: "San Luis Potosí", descripcion: "Guitarrista.", redes: null, foto: null, portada: null, creado_por: "autor-1" };
const LUGAR = { id: "l-1", slug: "ache-galeria", nombre: "ACHE Galería", direccion: "Calle 1", portada: null, creado_por: "autor-1", zona: "America/Mexico_City" };

/** Una consulta encadenable de prueba: los filtros se ignoran; contesta según la tabla. */
function consulta(tabla: string) {
  const datos = () => {
    if (tabla === "artistas") return { data: ARTISTA };
    if (tabla === "lugares") return { data: LUGAR };
    if (tabla === "artistas_cuentas" || tabla === "lugares_cuentas") return { data: estado.ligados };
    if (tabla === "eventos") return { data: estado.pasados };
    return { data: [] };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = {};
  for (const m of ["select", "eq", "in", "or", "order", "limit", "lt", "not"]) q[m] = () => q;
  q.maybeSingle = async () => datos();
  q.then = (ok: (v: unknown) => void, mal: (e: unknown) => void) => Promise.resolve(datos()).then(ok, mal);
  return q;
}

vi.mock("@/lib/supabase/servidor", () => ({
  clienteServidor: vi.fn(async () => ({ from: consulta, rpc: async () => ({ data: [] }) })),
  usuarioActual: vi.fn(async () => (estado.quien ? { correo: null, perfil: { nombre: "Marcos", foto: null, colonia: null, bio: null, ...estado.quien } } : null)),
}));

const pasado = (id: string, inicio: string) => ({ id, slug: id, titulo: id, inicio, fin: null, zona: "America/Mexico_City", imagen: null, lugar_id: "l-1", sitio_texto: null, sitio_direccion: null, sitio_reservado: false, cancelado: false, clase: "puntual", evento_padre_id: null, lugar: { id: "l-1", slug: "ache-galeria", nombre: "ACHE Galería", portada: null } });

async function pedir(consultaUrl: string) {
  const { GET } = await import("./route");
  return GET(new Request(`https://somosnosotros.org/api/documento?${consultaUrl}`));
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-12T20:00:00Z"));
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  estado.quien = null;
  estado.ligados = [];
  estado.pasados = [pasado("e1", "2026-10-03T02:00:00Z"), pasado("e2", "2026-09-20T02:00:00Z")];
});

describe("GET /api/documento (OL-396)", () => {
  it("parámetros que no existen: 404", async () => {
    estado.quien = { id: "admin-1", rol: "admin" };
    expect((await pedir("que=persona&id=x")).status).toBe(404);
    expect((await pedir("que=artista&id=leo-traeger&formato=oficio")).status).toBe(404);
    expect((await pedir("que=lugar&id=ache-galeria&periodo=semana")).status).toBe(404);
    expect((await pedir("que=artista")).status).toBe(404);
  });

  it("sin sesión o ajeno: 404", async () => {
    expect((await pedir("que=artista&id=leo-traeger")).status).toBe(404);
    estado.quien = { id: "otra", rol: "usuario" };
    expect((await pedir("que=artista&id=leo-traeger")).status).toBe(404);
    expect((await pedir("que=lugar&id=ache-galeria")).status).toBe(404);
  });

  it("su autor: 200, un PDF carta con su nombre de archivo y caché de un día", async () => {
    estado.quien = { id: "autor-1", rol: "usuario" };
    const r = await pedir("que=artista&id=leo-traeger");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="presentacion-leo-traeger.pdf"');
    expect(r.headers.get("cache-control")).toBe("private, max-age=86400");
    const pdf = Buffer.from(await r.arrayBuffer()).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("/MediaBox [0 0 612 792]");
    expect(pdf).toContain("/Width 1275 /Height 1650");
  });

  it("una cuenta ligada o la administración: 200; el informe en A4 y por año", async () => {
    estado.quien = { id: "ligada", rol: "usuario" };
    estado.ligados = [{ perfil_id: "ligada" }];
    const r = await pedir("que=lugar&id=ache-galeria&periodo=anio&formato=a4");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="informe-ache-galeria-2026.pdf"');
    const pdf = Buffer.from(await r.arrayBuffer()).toString("latin1");
    expect(pdf).toContain("/MediaBox [0 0 595 842]");
    estado.ligados = [];
    estado.quien = { id: "admin-1", rol: "admin" };
    const m = await pedir("que=lugar&id=ache-galeria");
    expect(m.headers.get("content-disposition")).toBe('attachment; filename="informe-ache-galeria-2026-10.pdf"');
  });

  it("quien gestiona pero sin nada pasado: 404", async () => {
    estado.quien = { id: "autor-1", rol: "usuario" };
    estado.pasados = [];
    expect((await pedir("que=artista&id=leo-traeger")).status).toBe(404);
    expect((await pedir("que=lugar&id=ache-galeria")).status).toBe(404);
  });
});
