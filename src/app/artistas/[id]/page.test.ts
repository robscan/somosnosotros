import { describe, expect, it, vi } from "vitest";
import { Suspense } from "react";

/**
 * OL-161 (bitácora 196): la cabecera de la ficha (foto, nombre, etiqueta, JSON-LD, canonical) tiene que salir en el
 * HTML inicial, sin esperar cuánta gente sigue al artista ni sus próximas fechas — consultas aparte, en
 * `<Suspense>`. Mismo método que las otras dos fichas: se llama a la función de la página y se recorre el árbol de
 * elementos sin pintarlo, para no arrastrar Link con su contexto de router.
 */

const m = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`PERMANENT_REDIRECT:${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ notFound: m.notFound, redirect: m.redirect, permanentRedirect: m.permanentRedirect }));

/** Una consulta de Supabase encadenable de prueba: cualquier método intermedio se ignora, el resultado es fijo. */
function chain(resultado: unknown) {
  const promesa = Promise.resolve(resultado);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objeto: any = {};
  for (const metodo of ["select", "eq", "in", "or", "order", "limit", "not", "upsert"]) objeto[metodo] = () => objeto;
  objeto.maybeSingle = () => promesa;
  objeto.single = () => promesa;
  objeto.then = (resuelto: (v: unknown) => void, rechazado: (e: unknown) => void) => promesa.then(resuelto, rechazado);
  return objeto;
}

function clienteFalso(tablas: Record<string, unknown>, rpcs: Record<string, unknown> = {}) {
  return {
    from: (tabla: string) => chain(tablas[tabla] ?? { data: null }),
    rpc: (nombre: string) => Promise.resolve(rpcs[nombre] ?? { data: null }),
  };
}

const ARTISTA = {
  id: "artista-1",
  slug: "artista-de-prueba",
  nombre: "Artista de prueba",
  disciplina: "musica",
  detalle: null,
  tipo: "solista",
  foto: null,
  descripcion: null,
  ciudad: "San Luis Potosí",
  redes: [],
  creado_por: "autor-1",
  visible: true,
  origen: null,
  autor: { id: "autor-1", nombre: "Autora de prueba" },
};

vi.mock("@/lib/supabase/servidor", () => ({
  clienteServidor: vi.fn(async () => clienteFalso({ artistas: { data: ARTISTA }, eventos: { data: [] }, artistas_cuentas: { data: [] } }, { cuenta_seguidores: { data: 0 } })),
  usuarioActual: vi.fn(async () => null),
}));

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

describe("ficha de artista: la cabecera pinta antes que sus fechas (OL-161)", () => {
  it("el árbol inicial trae el nombre, el JSON-LD y deja quién lo sigue y sus fechas en Suspense", async () => {
    const { default: FichaArtista } = await import("./page");
    const arbol = await FichaArtista({ params: Promise.resolve({ id: "artista-de-prueba" }), searchParams: Promise.resolve({}) });
    const elementos = [...recorrer(arbol)];

    const h1 = elementos.find((e) => e.type === "h1");
    expect(h1?.props?.children).toBe("Artista de prueba");

    const jsonLd = elementos.find((e) => e.type === "script" && e.props?.type === "application/ld+json");
    expect(jsonLd).toBeTruthy();
    const datos = JSON.parse((jsonLd!.props.dangerouslySetInnerHTML as { __html: string }).__html);
    expect(datos.name).toBe("Artista de prueba");

    // Cuánta gente lo sigue + su próxima fecha (un renglón, un Suspense) y "Se presenta en" (otro): dos límites.
    const suspenses = elementos.filter((e) => e.type === Suspense);
    expect(suspenses.length).toBe(2);
  });

  it("una ficha por UUID redirige (308 permanente) a su slug", async () => {
    const { default: FichaArtista } = await import("./page");
    await expect(FichaArtista({ params: Promise.resolve({ id: "artista-1" }), searchParams: Promise.resolve({}) })).rejects.toThrow("PERMANENT_REDIRECT:/artistas/artista-de-prueba");
  });

  it("generateMetadata trae el canonical de la ficha", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "artista-de-prueba" }) });
    expect(metadata.alternates?.canonical).toBe("https://somosnosotros.org/artistas/artista-de-prueba");
    expect(metadata.title).toBe("Artista de prueba · Somos Nosotros");
  });
});
