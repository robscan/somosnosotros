import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * «Exportar para el consejo» (OL-426): solo la administración descarga el CSV; a cualquier otro, 404. El CSV respeta los filtros y el orden de la
 * pantalla y sale entero (sin la página). La lectura de candidatos es de prueba (la real se prueba en la pantalla y en PostgreSQL).
 */
type Quien = { id: string; rol: "admin" | "usuario" } | null;
const estado = vi.hoisted(() => ({ quien: null as Quien, falla: false }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioActual: vi.fn(async () => (estado.quien ? { correo: null, perfil: { nombre: "Admin", foto: null, colonia: null, bio: null, ...estado.quien } } : null)),
  clienteServidor: vi.fn(async () => null),
}));
vi.mock("@/app/admin/showcase/consultas", () => {
  const base = { ciudad: "San Luis Potosí", foto: null, instagram: null, nota: null, programadoPor: [], redes: null, eventos: 0, foros: 0, festivales: 0 };
  const puntajes = (c: number, o: number) => ({ circulacion: c, obra: o, actividad: null, vinculo: null });
  return {
    cargarCandidatos: vi.fn(async () =>
      estado.falla
        ? null
        : [
            { ...base, id: "1", slug: "pargazz", nombre: "Pargazz", disciplina: "musica", estado: "revisado", puntajes: puntajes(1, 1), suma: 2 },
            { ...base, id: "2", slug: "sangre-de-coyote", nombre: "Sangre de Coyote", disciplina: "musica", estado: "invitado", puntajes: puntajes(2, 1), suma: 3, nota: "=1+1" },
            { ...base, id: "3", slug: "iyari", nombre: "IYARI, teatro de la vida", disciplina: "teatro", estado: "candidato", puntajes: puntajes(0, 0), suma: 0 },
          ],
    ),
  };
});

async function pedir(consulta = "") {
  const { GET } = await import("./route");
  return GET(new Request(`https://somosnosotros.org/api/showcase/csv${consulta}`));
}

beforeEach(() => {
  estado.quien = null;
  estado.falla = false;
});

describe("GET /api/showcase/csv (OL-426)", () => {
  it("sin sesión o sin el rol de administración: 404", async () => {
    expect((await pedir()).status).toBe(404);
    estado.quien = { id: "u-1", rol: "usuario" };
    expect((await pedir()).status).toBe(404);
  });
  it("la administración descarga la lista entera, en el orden de la pantalla (puntaje por defecto), sin caché compartida", async () => {
    estado.quien = { id: "a-1", rol: "admin" };
    const r = await pedir();
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(r.headers.get("Content-Disposition")).toMatch(/^attachment; filename="showcase-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // con BOM, para que Excel lea los acentos
    const lineas = new TextDecoder().decode(bytes).split("\r\n");
    expect(lineas[0].startsWith("artista,disciplina,ciudad,estado,circulacion")).toBe(true);
    expect(lineas.slice(1, 4).map((l) => l.split(",")[0])).toEqual(["Sangre de Coyote", "Pargazz", '"IYARI']);
    expect(lineas[1].endsWith(",'=1+1")).toBe(true);
  });
  it("con los filtros de la pantalla: disciplina, estado y búsqueda", async () => {
    estado.quien = { id: "a-1", rol: "admin" };
    const teatro = (await (await pedir("?disciplina=teatro")).text()).split("\r\n").filter(Boolean);
    expect(teatro).toHaveLength(2);
    const invitados = (await (await pedir("?estado=invitado&q=coyote")).text()).split("\r\n").filter(Boolean);
    expect(invitados.slice(1).map((l) => l.split(",")[0])).toEqual(["Sangre de Coyote"]);
  });
  it("si no se pudo leer, lo dice (503) y no manda un CSV a medias", async () => {
    estado.quien = { id: "a-1", rol: "admin" };
    estado.falla = true;
    expect((await pedir()).status).toBe(503);
  });
});
