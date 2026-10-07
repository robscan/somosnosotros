import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

/**
 * OL-312 (bitácora 340), OL-315 (343) y OL-316 (346): `/nuevo` ya no es una pantalla (el proxy responde 308 al alta por pasos de cada tipo;
 * lo prueban `proxy.test.ts` y `lib/armazon.test.ts`). Se llama a la función de cada alta por pasos con la consulta y datos de prueba (sin
 * pintar nada): sin sesión, a Entrar con la misma dirección; con ella, lo que arma con la consulta (`/nuevo/evento`: su arranque y a dónde
 * sale la ✕; `/nuevo/lugar`: el nombre y el punto de entrada; `/nuevo/artista`: el nombre, la ciudad y las subcategorías).
 */

const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`PERMANENT_REDIRECT:${url}`);
  }),
  usuarioActual: vi.fn(),
  tablas: {} as Record<string, unknown>,
  quien: [] as { id: string; nombre: string }[],
  subcategorias: {} as Record<string, { detalle: string; artistas: number }[]>,
  ciudadesArtistas: [] as unknown[],
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect, permanentRedirect: m.permanentRedirect }));
vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.usuarioActual, clienteServidor: async () => clienteFalso() }));
vi.mock("@/app/artistas/acciones", () => ({ crearArtista: vi.fn(), actualizarArtista: vi.fn() }));
vi.mock("@/app/lugares/acciones", () => ({ crearLugar: vi.fn() }));
vi.mock("@/app/eventos/acciones", () => ({ crearEvento: vi.fn(), cupoDeCartel: vi.fn(async () => null) }));
vi.mock("@/app/artistas/consultas", () => ({ cargarMisArtistas: vi.fn(async () => []), cargarQuien: vi.fn(async () => m.quien) }));
vi.mock("@/lib/ciudades", () => ({ cargarCiudades: vi.fn(async () => []), cargarCiudadesDeArtistas: vi.fn(async () => m.ciudadesArtistas) }));
vi.mock("@/lib/cartel", () => ({ lecturaDeCartelActiva: () => false }));
vi.mock("./artista/AltaArtista", () => ({ default: function AltaArtista() { return null; } }));
vi.mock("./evento/AltaEvento", () => ({ default: function AltaEvento() { return null; } }));
vi.mock("./lugar/AltaLugar", () => ({ default: function AltaLugar() { return null; } }));

/** Una consulta de Supabase encadenable de prueba: el resultado de cada tabla es fijo. */
function clienteFalso() {
  return {
    rpc: async (nombre: string, args: { p_disciplina?: string }) => ({ data: nombre === "subcategorias_de" ? (m.subcategorias[args.p_disciplina ?? ""] ?? []) : null }),
    from: (tabla: string) => {
      const resultado = Promise.resolve(m.tablas[tabla] ?? { data: null });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const consulta: any = {};
      for (const metodo of ["select", "eq", "gte", "order", "limit"]) consulta[metodo] = () => consulta;
      consulta.maybeSingle = () => resultado;
      consulta.then = (bien: (v: unknown) => void, mal: (e: unknown) => void) => resultado.then(bien, mal);
      return consulta;
    },
  };
}

const LUGAR = "0b0b0b0b-0000-4000-8000-000000000001";
const ARTISTA = "0a0a0a0a-0000-4000-8000-000000000009";
const EVENTO = "0e0e0e0e-0000-4000-8000-000000000001";
const TEATRO = { id: LUGAR, nombre: "Teatro de la Paz", tipo: "foro", direccion: "Villerías 205", lat: 22.15, lng: -100.97, portada: null, zona: "America/Mexico_City", privado: false };
const SESION = { perfil: { id: "usuaria-1", rol: "usuario" } };

const consulta = (q: Record<string, string>) => ({ searchParams: Promise.resolve(q) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

beforeEach(() => {
  vi.clearAllMocks();
  m.usuarioActual.mockResolvedValue(SESION);
  m.tablas = { lugares: { data: [TEATRO] } };
  m.quien = [];
  m.subcategorias = {};
  m.ciudadesArtistas = [];
});

describe("/nuevo/evento", () => {
  it("sin sesión, a Entrar con la misma dirección completa", async () => {
    const { default: NuevoEvento } = await import("./evento/page");
    m.usuarioActual.mockResolvedValue(null);
    await expect(NuevoEvento(consulta({ lugar: LUGAR, ciudad: "queretaro" }))).rejects.toThrow(`REDIRECT:/entrar?siguiente=${encodeURIComponent(`/nuevo/evento?lugar=${LUGAR}&ciudad=queretaro`)}`);
  });
  it("de cero: sin arranque y la ✕ al inicio", async () => {
    const { default: NuevoEvento } = await import("./evento/page");
    const el = (await NuevoEvento(consulta({}))) as ReactElement<Props>;
    expect(el.props.arranque).toBeNull();
    expect(el.props.salida).toEqual({ href: "/", texto: "Volver" });
  });
  it("`?lugar=`: el sitio contestado con ese lugar y la ✕ a su ficha; un id que no es id o que no está en el directorio no contesta nada", async () => {
    const { default: NuevoEvento } = await import("./evento/page");
    const el = (await NuevoEvento(consulta({ lugar: LUGAR }))) as ReactElement<Props>;
    expect(el.props.arranque).toMatchObject({ r: { sitio: { modo: "lugar", lugarId: LUGAR } }, entrar: false });
    expect(el.props.salida.href).toBe(`/lugares/${LUGAR}`);
    for (const raro of ["x", "0b0b0b0b-0000-4000-8000-0000000000ff"]) {
      const otro = (await NuevoEvento(consulta({ lugar: raro }))) as ReactElement<Props>;
      expect(otro.props.arranque, raro).toBeNull();
      expect(otro.props.salida.href).toBe("/");
    }
  });
  it("`?artista=`: Quién con el artista y la ✕ a su ficha", async () => {
    const { default: NuevoEvento } = await import("./evento/page");
    m.tablas.artistas = { data: { id: ARTISTA, nombre: "Lucía Montaño" } };
    const el = (await NuevoEvento(consulta({ artista: ARTISTA }))) as ReactElement<Props>;
    expect(el.props.arranque).toEqual({ r: { quien: [{ id: ARTISTA, nombre: "Lucía Montaño" }] }, entrar: false });
    expect(el.props.salida.href).toBe(`/artistas/${ARTISTA}`);
  });
  it("`?desde=`: las respuestas del evento, entrar en lo que falte y la ✕ al evento", async () => {
    const { default: NuevoEvento } = await import("./evento/page");
    m.tablas.eventos = { data: { id: EVENTO, slug: "ecos-de-papel", titulo: "Ecos de papel", lugar_id: LUGAR, precio: null, descripcion: null, enlace: null, sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, ciudad: "San Luis Potosí" } };
    m.quien = [{ id: ARTISTA, nombre: "Lucía Montaño" }];
    const el = (await NuevoEvento(consulta({ desde: EVENTO }))) as ReactElement<Props>;
    expect(el.props.arranque).toEqual({
      r: { nombre: "Ecos de papel", sitio: expect.objectContaining({ modo: "lugar", lugarId: LUGAR }), costo: "gratis", precio: "", quien: [{ id: ARTISTA, nombre: "Lucía Montaño" }], descripcion: "", enlace: "" },
      entrar: true,
    });
    expect(el.props.salida.href).toBe("/eventos/ecos-de-papel");
  });
  it("`?festival=` (OL-321): «Parte de un festival» con uno que se puede elegir y la ✕ a su ficha; uno que no está entre ellos no contesta nada", async () => {
    const { default: NuevoEvento } = await import("./evento/page");
    const FESTIVAL = "0f0f0f0f-0000-4000-8000-000000000001";
    m.tablas.eventos = { data: [{ id: FESTIVAL, titulo: "Festival de Cine", inicio: "2026-11-12T01:00:00Z", fin: "2026-11-15T06:00:00Z", zona: "America/Mexico_City" }] };
    m.tablas.lugares_horarios = { data: [{ lugar_id: LUGAR, dias: [2, 3], abre: "10:00:00", cierra: "18:00:00" }] };
    const el = (await NuevoEvento(consulta({ festival: FESTIVAL }))) as ReactElement<Props>;
    expect(el.props.arranque).toEqual({ r: { padre: { id: FESTIVAL, titulo: "Festival de Cine" } }, entrar: false });
    expect(el.props.salida.href).toBe(`/eventos/${FESTIVAL}`);
    expect(el.props.contexto.horarios).toEqual({ [LUGAR]: [{ dias: [2, 3], abre: "10:00", cierra: "18:00" }] });
    const ajeno = (await NuevoEvento(consulta({ festival: "0f0f0f0f-0000-4000-8000-0000000000ff" }))) as ReactElement<Props>;
    expect(ajeno.props.arranque).toBeNull();
  });
});

describe("/nuevo/lugar (OL-315)", () => {
  it("sin sesión, a Entrar con la misma dirección completa", async () => {
    const { default: NuevoLugar } = await import("./lugar/page");
    m.usuarioActual.mockResolvedValue(null);
    await expect(NuevoLugar(consulta({ ciudad: "queretaro", nombre: "Foro", lat: "22.15", lng: "-100.97" }))).rejects.toThrow(`REDIRECT:/entrar?siguiente=${encodeURIComponent("/nuevo/lugar?ciudad=queretaro&nombre=Foro&lat=22.15&lng=-100.97")}`);
  });
  it("con sesión: los lugares del directorio, el nombre y el punto de entrada, y la ciudad de la dirección tal cual para la tira", async () => {
    const { default: NuevoLugar } = await import("./lugar/page");
    const el = (await NuevoLugar(consulta({ ciudad: "queretaro", nombre: "  Foro del Carmen ", lat: "22.15", lng: "-100.97" }))) as ReactElement<Props>;
    expect(el.props.lugares).toEqual([TEATRO]);
    expect(el.props.arranque).toEqual({ nombre: "Foro del Carmen", punto: { lat: 22.15, lng: -100.97 } });
    expect(el.props.conCiudad).toBe("queretaro");
    expect(el.props.esAdmin).toBe(false);
  });
  it("lo ilegible se ignora: sin punto ni nombre, y sin `?ciudad=` la búsqueda se acerca a San Luis Potosí", async () => {
    const { default: NuevoLugar } = await import("./lugar/page");
    const el = (await NuevoLugar(consulta({ lat: "x", lng: "999" }))) as ReactElement<Props>;
    expect(el.props.arranque).toEqual({ nombre: "", punto: null });
    expect(el.props.conCiudad).toBeNull();
    expect(el.props.ciudadContexto.slug).toBe("san-luis-potosi");
  });
});

describe("/nuevo/artista (OL-316)", () => {
  it("sin sesión, a Entrar con la misma dirección completa", async () => {
    const { default: NuevoArtista } = await import("./artista/page");
    m.usuarioActual.mockResolvedValue(null);
    await expect(NuevoArtista(consulta({ ciudad: "queretaro", nombre: "Trio" }))).rejects.toThrow(`REDIRECT:/entrar?siguiente=${encodeURIComponent("/nuevo/artista?ciudad=queretaro&nombre=Trio")}`);
  });
  it("con sesión: el nombre de entrada, la ciudad de Artistas (la de la dirección o la inicial) y la ✕ a Artistas en esa ciudad", async () => {
    const { default: NuevoArtista } = await import("./artista/page");
    m.ciudadesArtistas = [{ slug: "queretaro", nombre: "Querétaro", centro: { lng: -100.39, lat: 20.59 }, zoom: 13, artistas: 3 }];
    const el = (await NuevoArtista(consulta({ ciudad: "queretaro", nombre: "  Trío Xochitl " }))) as ReactElement<Props>;
    expect(el.props.arranque).toEqual({ nombre: "Trío Xochitl", ciudad: "Querétaro" });
    expect(el.props.conCiudad).toBe("queretaro");
    expect(el.props.salida).toEqual({ href: "/artistas?ciudad=queretaro", texto: "Artistas" });
    const sin = (await NuevoArtista(consulta({}))) as ReactElement<Props>;
    expect(sin.props.arranque).toEqual({ nombre: "", ciudad: "San Luis Potosí" });
    expect(sin.props.conCiudad).toBeNull();
    expect(sin.props.salida.href).toBe("/artistas");
  });
  it("trae de una vez las subcategorías ya usadas de cada disciplina, tal como las ordena la base", async () => {
    const { default: NuevoArtista } = await import("./artista/page");
    m.subcategorias = { teatro: [{ detalle: "Compañía de teatro", artistas: 12 }, { detalle: "Títeres", artistas: 4 }] };
    const el = (await NuevoArtista(consulta({}))) as ReactElement<Props>;
    expect(Object.keys(el.props.subcategorias).sort()).toEqual(["artes_visuales", "cine", "circo", "danza", "letras", "musica", "otro", "teatro"]);
    expect(el.props.subcategorias.teatro).toEqual(m.subcategorias.teatro);
    expect(el.props.subcategorias.musica).toEqual([]);
  });
});
