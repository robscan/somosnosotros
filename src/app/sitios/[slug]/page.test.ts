import { beforeEach, describe, expect, it, vi } from "vitest";
import { slugDeSitio } from "@/lib/sitios";
import AccionesSitio from "./AccionesSitio";
import LigarEventos from "./LigarEventos";

/**
 * OL-366 (bitácora 397): las acciones de la ficha de un sitio fuera del directorio, en sus tres variantes. Sin lugar en el directorio, «Agregar
 * al directorio» (con sesión), que lleva la clave del sitio al alta; con su lugar ya en el directorio (su mismo nombre a menos de 150 m:
 * `lugares_parecidos`), «Ver en el directorio» en su lugar, para todos; y para la administración, además, «Ligar sus eventos». Mismo método
 * que la ficha de lugar: se llama a la página y se recorre el árbol de elementos sin pintarlo.
 */
const m = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  actual: vi.fn(),
  parecidos: vi.fn(),
  rpc: vi.fn(),
  ligar: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/app/eventos/decididas", () => ({ decididasDe: async () => null }));
vi.mock("../acciones", () => ({ ligarSitioALugar: m.ligar }));

const SLP = "San Luis Potosí";
const SLUG = slugDeSitio("Bar La Oficina", SLP);
const EVENTO = {
  id: "00000000-0000-4000-8000-0000000000c1", slug: "noche-de-boleros", titulo: "Noche de boleros", inicio: "2030-11-13T02:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, precio: null,
  clase: "puntual", lugar_id: null, sitio_texto: "Bar La Oficina", sitio_direccion: "Calle Madero 4, Centro", sitio_lat: 22.1501, sitio_lng: -100.9802, sitio_reservado: false, ciudad: SLP, creado_en: "2030-11-01T00:00:00Z", creado_por: "autora",
};
const LUGAR = { id: "00000000-0000-4000-8000-0000000000b1", slug: "bar-la-oficina" };

function consulta(resultado: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};
  for (const metodo of ["select", "is", "eq", "not", "or", "order", "limit", "in"]) c[metodo] = () => c;
  c.then = (ok: (v: unknown) => void, mal: (e: unknown) => void) => Promise.resolve(resultado).then(ok, mal);
  return c;
}

vi.mock("@/lib/supabase/servidor", () => ({
  clienteServidor: vi.fn(async () => ({
    from: (tabla: string) => consulta(tabla === "eventos" ? { data: [EVENTO], error: null } : { data: [] }),
    rpc: (nombre: string, args: unknown) => {
      m.rpc(nombre, args);
      return Promise.resolve(nombre === "lugares_parecidos" ? { data: m.parecidos(), error: null } : { data: [], error: null });
    },
  })),
  usuarioActual: m.actual,
}));

type Quien = { correo: string; perfil: { id: string; nombre: string; foto: null; colonia: null; bio: null; rol: "admin" | "usuario" } };
const ANA: Quien = { correo: "ana@example.com", perfil: { id: "autora", nombre: "Ana", foto: null, colonia: null, bio: null, rol: "usuario" } };
const ADMIN: Quien = { correo: "admin@example.com", perfil: { ...ANA.perfil, id: "admin", rol: "admin" } };

/** Recorre el árbol de elementos de React sin pintarlo (sin `render`): cada nodo, en orden de aparición. */
function* recorrer(nodo: unknown): Generator<{ type: unknown; props: Record<string, unknown> }> {
  if (nodo == null || typeof nodo === "boolean" || typeof nodo === "string" || typeof nodo === "number") return;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) yield* recorrer(hijo);
    return;
  }
  if (typeof nodo === "object" && "$$typeof" in nodo) {
    const el = nodo as unknown as { type: unknown; props: Record<string, unknown> };
    yield el;
    yield* recorrer(el.props?.children);
  }
}
/** El texto de un elemento y sus hijos, sin pintarlo. */
const texto = (nodo: unknown): string => [...recorrer(nodo)].flatMap((e) => [e.props?.children].flat().filter((h) => typeof h === "string")).join(" ");

/** La ficha del sitio con quien mira y el lugar del directorio que contesta la base: las props de sus acciones y lo que pintan. */
async function acciones(actual: Quien | null, lugar: typeof LUGAR | null) {
  m.actual.mockResolvedValue(actual);
  m.parecidos.mockReturnValue(lugar ? [{ ...LUGAR, nombre: "Bar La Oficina", lat: 22.15, lng: -100.98 }] : []);
  const { default: FichaSitio } = await import("./page");
  const arbol = await FichaSitio({ params: Promise.resolve({ slug: SLUG }) });
  const el = [...recorrer(arbol)].find((e) => e.type === AccionesSitio);
  expect(el).toBeTruthy();
  const props = el!.props as Parameters<typeof AccionesSitio>[0];
  const pintado = [...recorrer(AccionesSitio(props))];
  const enlaces = pintado.filter((e) => typeof e.props?.href === "string").map((e) => ({ href: e.props.href as string, texto: texto(e) }));
  return { props, enlaces, ligar: pintado.find((e) => e.type === LigarEventos) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ficha de sitio: sus acciones según el directorio y quién mira (OL-366)", () => {
  it("sin lugar en el directorio y con sesión: «Cómo llegar» y «Agregar al directorio», que lleva al alta el nombre, el punto, la ciudad y la clave del sitio", async () => {
    const { enlaces, ligar } = await acciones(ANA, null);
    expect(enlaces.map((e) => e.texto)).toEqual(["Cómo llegar", "Agregar al directorio"]);
    const alta = new URL(enlaces[1].href, "https://somosnosotros.org");
    expect(alta.pathname).toBe("/nuevo/lugar");
    expect(Object.fromEntries(alta.searchParams)).toEqual({ ciudad: "san-luis-potosi", nombre: "Bar La Oficina", lat: "22.150100", lng: "-100.980200", sitio: SLUG });
    expect(ligar).toBeUndefined();
    // El lugar del directorio se busca con el nombre y el punto del sitio (el criterio de «¿Es este?» del alta).
    expect(m.rpc).toHaveBeenCalledWith("lugares_parecidos", { p_nombre: "Bar La Oficina", p_lat: 22.1501, p_lng: -100.9802 });
  });

  it("sin sesión y sin lugar en el directorio: solo «Cómo llegar»", async () => {
    const { enlaces } = await acciones(null, null);
    expect(enlaces.map((e) => e.texto)).toEqual(["Cómo llegar"]);
  });

  it("con su lugar ya en el directorio: «Ver en el directorio» abre ese lugar en vez de «Agregar al directorio» (con o sin sesión); sin «Ligar sus eventos»", async () => {
    for (const quien of [ANA, null]) {
      const { props, enlaces, ligar } = await acciones(quien, LUGAR);
      expect(enlaces).toEqual([expect.objectContaining({ texto: "Cómo llegar" }), { href: "/lugares/bar-la-oficina", texto: "Ver en el directorio" }]);
      expect(props.ligar).toBeNull();
      expect(ligar).toBeUndefined();
    }
  });

  it("la administración, con el lugar en el directorio: además «Ligar sus eventos», con el sitio y el lugar atados y diferido", async () => {
    const { props, enlaces, ligar } = await acciones(ADMIN, LUGAR);
    expect(enlaces.map((e) => e.texto)).toEqual(["Cómo llegar", "Ver en el directorio"]);
    expect(ligar).toBeTruthy();
    m.ligar.mockResolvedValue({ ok: true, ligados: 1 });
    await (props.ligar as () => Promise<unknown>)();
    expect(m.ligar).toHaveBeenCalledWith(SLUG, LUGAR.id, true);
  });

  it("la administración sin lugar en el directorio: «Agregar al directorio», como cualquiera (nada que ligar todavía)", async () => {
    const { props, enlaces } = await acciones(ADMIN, null);
    expect(enlaces.map((e) => e.texto)).toEqual(["Cómo llegar", "Agregar al directorio"]);
    expect(props.ligar).toBeNull();
  });
});
