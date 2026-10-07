import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

/**
 * OL-312 (bitácora 340): `/nuevo` ya no publica eventos y `/nuevo/evento` es la única alta de evento. Se llama a la función de cada página
 * con la consulta y datos de prueba (sin pintar nada): `/nuevo` con un evento redirige, permanente y antes de pedir sesión, a `/nuevo/evento`
 * con los mismos datos; y `/nuevo/evento` arma con la consulta su arranque (`?lugar=`, `?artista=`, `?desde=`) y a dónde sale la ✕.
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
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect, permanentRedirect: m.permanentRedirect }));
vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.usuarioActual, clienteServidor: async () => clienteFalso() }));
vi.mock("@/app/artistas/acciones", () => ({ crearArtista: vi.fn() }));
vi.mock("@/app/lugares/acciones", () => ({ crearLugar: vi.fn() }));
vi.mock("@/app/eventos/acciones", () => ({ crearEvento: vi.fn(), cupoDeCartel: vi.fn(async () => null) }));
vi.mock("@/app/artistas/consultas", () => ({ cargarMisArtistas: vi.fn(async () => []), cargarQuien: vi.fn(async () => m.quien) }));
vi.mock("@/lib/ciudades", () => ({ cargarCiudades: vi.fn(async () => []), cargarCiudadesDeArtistas: vi.fn(async () => []) }));
vi.mock("@/lib/cartel", () => ({ lecturaDeCartelActiva: () => false }));
vi.mock("./Alta", () => ({ default: function Alta() { return null; } }));
vi.mock("./evento/AltaEvento", () => ({ default: function AltaEvento() { return null; } }));
vi.mock("./lugar/AltaLugar", () => ({ default: function AltaLugar() { return null; } }));

/** Una consulta de Supabase encadenable de prueba: el resultado de cada tabla es fijo. */
function clienteFalso() {
  return {
    from: (tabla: string) => {
      const resultado = Promise.resolve(m.tablas[tabla] ?? { data: null });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const consulta: any = {};
      for (const metodo of ["select", "eq", "order", "limit"]) consulta[metodo] = () => consulta;
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
});

describe("/nuevo con un evento", () => {
  it("se va, permanente y antes de mirar la sesión, a /nuevo/evento con lugar, artista, desde y ciudad", async () => {
    const { default: Nuevo } = await import("./page");
    for (const [q, destino] of [
      [{}, "/nuevo/evento"],
      [{ tipo: "evento", ciudad: "queretaro" }, "/nuevo/evento?ciudad=queretaro"],
      [{ lugar: LUGAR, nombre: "x", lat: "22", lng: "-100" }, `/nuevo/evento?lugar=${LUGAR}`],
      [{ artista: ARTISTA }, `/nuevo/evento?artista=${ARTISTA}`],
      [{ desde: EVENTO, ciudad: "queretaro" }, `/nuevo/evento?desde=${EVENTO}&ciudad=queretaro`],
    ] as const) {
      await expect(Nuevo(consulta(q))).rejects.toThrow(`PERMANENT_REDIRECT:${destino}`);
    }
    expect(m.usuarioActual).not.toHaveBeenCalled();
  });
  it("un lugar se va, permanente y antes de mirar la sesión, a /nuevo/lugar con la ciudad, el nombre y el punto (OL-315)", async () => {
    const { default: Nuevo } = await import("./page");
    await expect(Nuevo(consulta({ tipo: "lugar" }))).rejects.toThrow("PERMANENT_REDIRECT:/nuevo/lugar");
    await expect(Nuevo(consulta({ tipo: "lugar", ciudad: "queretaro", nombre: "Foro", lat: "22.15", lng: "-100.97" }))).rejects.toThrow("PERMANENT_REDIRECT:/nuevo/lugar?ciudad=queretaro&nombre=Foro&lat=22.15&lng=-100.97");
    expect(m.usuarioActual).not.toHaveBeenCalled();
  });
  it("un artista se queda: sin sesión, a Entrar con la misma dirección", async () => {
    const { default: Nuevo } = await import("./page");
    m.usuarioActual.mockResolvedValue(null);
    await expect(Nuevo(consulta({ tipo: "artista", nombre: "Trio" }))).rejects.toThrow(`REDIRECT:/entrar?siguiente=${encodeURIComponent("/nuevo?tipo=artista&nombre=Trio")}`);
    expect(m.permanentRedirect).not.toHaveBeenCalled();
  });
  it("con sesión, la pantalla del artista, con «Evento» y «Lugar» hacia sus altas por pasos y la ciudad que se veía", async () => {
    const { default: Nuevo } = await import("./page");
    const el = (await Nuevo(consulta({ tipo: "artista", ciudad: "queretaro" }))) as ReactElement<Props>;
    expect(el.props.evento).toBe("/nuevo/evento?ciudad=queretaro");
    expect(el.props.lugar).toBe("/nuevo/lugar?ciudad=queretaro");
    expect(el.props.salida.texto).toBe("Artistas");
  });
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
