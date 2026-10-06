import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { clienteServidor } from "@/lib/supabase/servidor";

vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));
const cliente = vi.mocked(clienteServidor);

const SUPABASE = "https://proyecto.supabase.co";
const ID = "00000000-0000-4000-8000-0000000000e1";
const IMAGEN = `${SUPABASE}/storage/v1/object/public/fotos/lugares/u1/evento-1.jpg`;
const evento = { slug: "lectura-en-voz-alta-ab12", imagen: IMAGEN, inicio: "2035-12-01T20:00:00Z", fin: null, zona: "America/Mexico_City", visible: true };

/** Un cliente que contesta a la consulta por slug con `porSlug` y a la de UUID con `porId`; dice por qué columnas se buscó. */
function consulta(porSlug: unknown, porId: unknown = null) {
  const buscadas: string[] = [];
  const from = vi.fn(() => {
    const c = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((columna: string) => {
        buscadas.push(columna);
        return c;
      }),
      maybeSingle: vi.fn(() => Promise.resolve({ data: buscadas.at(-1) === "slug" ? porSlug : porId })),
    };
    return c;
  });
  cliente.mockResolvedValue({ from } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  return buscadas;
}
const pedir = (id = ID) => GET(new Request("http://localhost/api/cartel/x"), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("GET /api/cartel/[id]", () => {
  it("entrega el cartel como descarga, con su tipo, su nombre por slug y caché", async () => {
    consulta(evento);
    const fetchSim = vi.fn().mockResolvedValue(new Response("bytes", { headers: { "content-type": "image/jpeg" } }));
    vi.stubGlobal("fetch", fetchSim);
    const r = await pedir();
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("bytes");
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="cartel-lectura-en-voz-alta-ab12.jpg"');
    expect(r.headers.get("cache-control")).toContain("s-maxage=3600");
    // Sigue la dirección de Storage tal cual y no acepta que lo manden a otro sitio.
    expect(fetchSim).toHaveBeenCalledWith(IMAGEN, { redirect: "error" });
  });

  it("la extensión sale del tipo de la imagen, no de la dirección", async () => {
    consulta(evento);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { headers: { "content-type": "image/png" } })));
    expect((await pedir()).headers.get("content-disposition")).toBe('attachment; filename="cartel-lectura-en-voz-alta-ab12.png"');
  });

  it("busca por slug y, si no aparece, por UUID (la dirección vieja)", async () => {
    const buscadas = consulta(null, evento);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { headers: { "content-type": "image/jpeg" } })));
    expect((await pedir()).status).toBe(200);
    expect(buscadas).toEqual(["slug", "id"]);
  });

  it("un texto que no es slug ni UUID no se busca por id", async () => {
    const buscadas = consulta(null, evento);
    expect((await pedir("no-existe")).status).toBe(404);
    expect(buscadas).toEqual(["slug"]);
  });

  it("un evento oculto, uno que ya pasó o uno sin imagen no se entregan", async () => {
    const fetchSim = vi.fn();
    vi.stubGlobal("fetch", fetchSim);
    for (const distinto of [{ visible: false }, { inicio: "2020-01-01T20:00:00Z" }, { imagen: null }]) {
      consulta({ ...evento, ...distinto });
      expect((await pedir()).status).toBe(404);
    }
    expect(fetchSim).not.toHaveBeenCalled();
  });

  it("una imagen que no es del Storage propio no se pide desde el servidor", async () => {
    const fetchSim = vi.fn();
    vi.stubGlobal("fetch", fetchSim);
    for (const imagen of ["https://otro.example/cartel.jpg", `${SUPABASE}/storage/v1/object/public/obras/privada.jpg`, `${SUPABASE}/storage/v1/object/public/fotos/../obras/x.jpg`, "http://127.0.0.1/admin"]) {
      consulta({ ...evento, imagen });
      expect((await pedir()).status).toBe(404);
    }
    expect(fetchSim).not.toHaveBeenCalled();
  });

  it("si Storage falla, no contesta con un cartel roto: 502; tampoco entrega algo que no sea imagen", async () => {
    consulta(evento);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("caído", { status: 503, headers: { "content-type": "image/jpeg" } })));
    expect((await pedir()).status).toBe(502);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    expect((await pedir()).status).toBe(502);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { headers: { "content-type": "text/html" } })));
    expect((await pedir()).status).toBe(502);
  });

  it("sin cliente de Supabase, 404", async () => {
    cliente.mockResolvedValue(null);
    expect((await pedir()).status).toBe(404);
  });
});
