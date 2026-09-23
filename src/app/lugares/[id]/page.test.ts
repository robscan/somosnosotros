import { describe, expect, it, vi } from "vitest";
import { Suspense } from "react";

/**
 * OL-161 (bitácora 196): la cabecera de la ficha (foto, nombre, dirección, JSON-LD, canonical) tiene que salir en
 * el HTML inicial, sin esperar cuánta gente sigue el lugar ni sus próximos eventos — consultas aparte, en
 * `<Suspense>`. Mismo método que la ficha de evento: se llama a la función de la página y se recorre el árbol de
 * elementos sin pintarlo, para no arrastrar Mapbox/Link con su contexto de router.
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

const LUGAR = {
  id: "lugar-1",
  slug: "lugar-de-prueba",
  nombre: "Lugar de prueba",
  tipo: "centro_cultural",
  direccion: "Calle Uno 123",
  lat: 22.15,
  lng: -100.98,
  portada: null,
  descripcion: null,
  ciudad: "San Luis Potosí",
  redes: [],
  creado_por: "autor-1",
  visible: true,
  privado: false,
  origen: null,
  autor: { id: "autor-1", nombre: "Autora de prueba" },
};

vi.mock("@/lib/supabase/servidor", () => ({
  clienteServidor: vi.fn(async () => clienteFalso({ lugares: { data: LUGAR }, eventos: { data: [] } }, { cuenta_seguidores: { data: 0 } })),
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

describe("ficha de lugar: la cabecera pinta antes que sus eventos (OL-161)", () => {
  it("el árbol inicial trae el nombre, el JSON-LD y deja quién sigue y sus eventos en Suspense", async () => {
    const { default: FichaLugar } = await import("./page");
    const arbol = await FichaLugar({ params: Promise.resolve({ id: "lugar-de-prueba" }), searchParams: Promise.resolve({}) });
    const elementos = [...recorrer(arbol)];

    const h1 = elementos.find((e) => e.type === "h1");
    expect(h1?.props?.children).toBe("Lugar de prueba");

    const jsonLd = elementos.find((e) => e.type === "script" && e.props?.type === "application/ld+json");
    expect(jsonLd).toBeTruthy();
    const datos = JSON.parse((jsonLd!.props.dangerouslySetInnerHTML as { __html: string }).__html);
    expect(datos["@type"]).toBe("Place");
    expect(datos.name).toBe("Lugar de prueba");

    // Cuánta gente lo sigue + su próximo evento (un renglón, un Suspense) y "Próximos eventos" (otro): dos límites.
    const suspenses = elementos.filter((e) => e.type === Suspense);
    expect(suspenses.length).toBe(2);
  });

  it("una ficha por UUID redirige (308 permanente) a su slug", async () => {
    const { default: FichaLugar } = await import("./page");
    await expect(FichaLugar({ params: Promise.resolve({ id: "lugar-1" }), searchParams: Promise.resolve({}) })).rejects.toThrow("PERMANENT_REDIRECT:/lugares/lugar-de-prueba");
  });

  it("generateMetadata trae el canonical de la ficha", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "lugar-de-prueba" }) });
    expect(metadata.alternates?.canonical).toBe("https://somosnosotros.org/lugares/lugar-de-prueba");
    expect(metadata.title).toBe("Lugar de prueba · Somos Nosotros");
  });
});
