import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La ruta de la imagen de «Tu año» (OL-394): solo quien gestiona (Q firmado). La persona, su propio año; el artista o el lugar, su autor, una
 * cuenta ligada o la administración. A cualquier otro, 404 (sin sesión, ficha ajena, un sujeto que no existe, nada pasado este año). Lo demás
 * es real: la lectura (`cargarTuAnio`, con un cliente de Supabase de prueba) y el dibujo (satori y sharp).
 */

type Quien = { id: string; rol: "admin" | "usuario"; nombre?: string; foto?: string | null } | null;
const estado = vi.hoisted(() => ({
  quien: null as Quien,
  ligados: [] as { perfil_id: string }[],
  pasados: [] as unknown[],
  asistencias: [] as unknown[],
}));

const ARTISTA = { id: "a-1", slug: "leo-traeger", nombre: "Leo Traeger", foto: null, portada: null, creado_por: "autor-1" };
const LUGAR = { id: "l-1", slug: "ache-galeria", nombre: "ACHE Galería", portada: null, creado_por: "autor-1", zona: "America/Mexico_City" };

/** Una consulta encadenable de prueba: los filtros se ignoran; contesta según la tabla. */
function consulta(tabla: string) {
  const datos = () => {
    if (tabla === "artistas") return { data: ARTISTA };
    if (tabla === "lugares") return { data: LUGAR };
    if (tabla === "artistas_cuentas" || tabla === "lugares_cuentas") return { data: estado.ligados };
    if (tabla === "eventos") return { data: estado.pasados };
    if (tabla === "asistencias") return { data: estado.asistencias };
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
  usuarioActual: vi.fn(async () => (estado.quien ? { correo: null, perfil: { nombre: "Marcos Ledesma", foto: null, colonia: null, bio: null, ...estado.quien } } : null)),
}));

const pasado = (id: string, inicio: string) => ({ id, slug: id, titulo: id, inicio, fin: null, zona: "America/Mexico_City", imagen: null, lugar_id: "l-1", sitio_texto: null, sitio_direccion: null, sitio_reservado: false, evento_padre_id: null, lugar: { id: "l-1", slug: "ache-galeria", nombre: "ACHE Galería", portada: null } });

async function pedir(consultaUrl: string) {
  const { GET } = await import("./route");
  return GET(new Request(`https://somosnosotros.org/api/tu-anio?${consultaUrl}`));
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
  estado.asistencias = estado.pasados.map((e) => ({ evento: e }));
});

describe("GET /api/tu-anio (OL-394)", () => {
  it("un sujeto que no es persona, artista ni lugar: 404", async () => {
    expect((await pedir("que=evento&id=x")).status).toBe(404);
    expect((await pedir("")).status).toBe(404);
  });

  it("sin sesión, nadie: 404 (también la persona)", async () => {
    expect((await pedir("que=persona")).status).toBe(404);
    expect((await pedir("que=artista&id=leo-traeger")).status).toBe(404);
  });

  it("la persona con sesión ve su propio año: 200, JPEG de 1080×1350 y caché de un día", async () => {
    estado.quien = { id: "p-1", rol: "usuario" };
    const r = await pedir("que=persona");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect(r.headers.get("cache-control")).toBe("private, max-age=86400");
    const meta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
    expect([meta.width, meta.height]).toEqual([1080, 1350]);
  });

  it("a 720 para la vista previa; con `descarga=1`, como archivo y sin guardar", async () => {
    estado.quien = { id: "p-1", rol: "usuario" };
    const vista = await pedir("que=persona&ancho=700");
    expect((await sharp(Buffer.from(await vista.arrayBuffer())).metadata()).width).toBe(720);
    const archivo = await pedir("que=persona&descarga=1");
    expect(archivo.headers.get("content-disposition")).toBe('attachment; filename="tu-2026.jpg"');
    expect(archivo.headers.get("cache-control")).toBe("private, no-store");
  });

  it("la persona sin nada pasado este año: 404", async () => {
    estado.quien = { id: "p-1", rol: "usuario" };
    estado.asistencias = [{ evento: pasado("viejo", "2025-10-03T02:00:00Z") }];
    expect((await pedir("que=persona")).status).toBe(404);
  });

  it("un artista ajeno: 404; su autor, una cuenta ligada o la administración: 200", async () => {
    estado.quien = { id: "otra", rol: "usuario" };
    expect((await pedir("que=artista&id=leo-traeger")).status).toBe(404);
    estado.quien = { id: "autor-1", rol: "usuario" };
    expect((await pedir("que=artista&id=leo-traeger")).status).toBe(200);
    estado.quien = { id: "ligada", rol: "usuario" };
    estado.ligados = [{ perfil_id: "ligada" }];
    expect((await pedir("que=artista&id=leo-traeger")).status).toBe(200);
    estado.ligados = [];
    estado.quien = { id: "admin-1", rol: "admin" };
    const r = await pedir("que=artista&id=leo-traeger&descarga=1");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="tu-2026-leo-traeger.jpg"');
  });

  it("un artista o un lugar sin `id`: 404", async () => {
    estado.quien = { id: "admin-1", rol: "admin" };
    expect((await pedir("que=artista")).status).toBe(404);
    expect((await pedir("que=lugar")).status).toBe(404);
  });

  it("un lugar ajeno: 404; quien lo gestiona: 200", async () => {
    estado.quien = { id: "otra", rol: "usuario" };
    expect((await pedir("que=lugar&id=ache-galeria")).status).toBe(404);
    estado.ligados = [{ perfil_id: "otra" }];
    expect((await pedir("que=lugar&id=ache-galeria")).status).toBe(200);
  });

  it("quien gestiona pero sin nada pasado este año: 404", async () => {
    estado.quien = { id: "autor-1", rol: "usuario" };
    estado.pasados = [];
    expect((await pedir("que=lugar&id=ache-galeria")).status).toBe(404);
  });
});
