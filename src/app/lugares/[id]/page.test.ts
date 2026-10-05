import { describe, expect, it, vi } from "vitest";
import { Suspense } from "react";
import Heroe from "@/components/ui/Heroe";

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
    const { default: CuerpoLugar } = await import("./CuerpoLugar");
    const arbol = await FichaLugar({ params: Promise.resolve({ id: "lugar-de-prueba" }), searchParams: Promise.resolve({}) });
    const enPagina = [...recorrer(arbol)];
    // El cuerpo (datos, acciones, eventos) es un componente aparte, el mismo de la hoja de Lugares: se abre igual, sin pintarlo.
    const cuerpo = enPagina.find((e) => e.type === CuerpoLugar);
    expect(cuerpo).toBeTruthy();
    const elementos = [...enPagina, ...recorrer(CuerpoLugar(cuerpo!.props as Parameters<typeof CuerpoLugar>[0]))];

    // El héroe (portada y nombre, `ui/Heroe`) sale con la página, sin esperar nada.
    const heroe = elementos.find((e) => e.type === Heroe);
    expect(heroe?.props?.titulo).toBe("Lugar de prueba");

    const jsonLd = elementos.find((e) => e.type === "script" && e.props?.type === "application/ld+json");
    expect(jsonLd).toBeTruthy();
    const datos = JSON.parse((jsonLd!.props.dangerouslySetInnerHTML as { __html: string }).__html);
    expect(datos["@type"]).toBe("Place");
    expect(datos.name).toBe("Lugar de prueba");

    // Cuántos eventos vienen y cuánta gente lo sigue (dos números, un Suspense) y "Próximos eventos" (otro): dos límites.
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

describe("la ficha distingue «no existe» de «falló la lectura» (OL-289)", () => {
  /** Corre `fn` con un cliente que responde `respuesta` a la consulta de la ficha (o sin cliente, si es `null`). */
  async function con(respuesta: unknown, fn: () => Promise<void>) {
    m.notFound.mockClear();
    const { clienteServidor } = await import("@/lib/supabase/servidor");
    const previo = vi.mocked(clienteServidor).getMockImplementation()!;
    vi.mocked(clienteServidor).mockImplementation((async () => (respuesta === null ? null : clienteFalso({ lugares: respuesta }))) as never);
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await fn();
      // La traza dice qué lectura falló, nunca la respuesta remota.
      for (const llamada of aviso.mock.calls) expect(JSON.stringify(llamada)).not.toContain("secreto-remoto");
    } finally {
      aviso.mockRestore();
      vi.mocked(clienteServidor).mockImplementation(previo);
    }
  }
  const pedir = async () => {
    const { default: Ficha } = await import("./page");
    return Ficha({ params: Promise.resolve({ id: "lugar-de-prueba" }), searchParams: Promise.resolve({}) });
  };
  const metadatos = async () => {
    const { generateMetadata } = await import("./page");
    return generateMetadata({ params: Promise.resolve({ id: "lugar-de-prueba" }) });
  };

  it("sin fila y sin error es «no existe»: notFound y título de ficha inexistente", async () => {
    await con({ data: null, error: null }, async () => {
      await expect(pedir()).rejects.toThrow("NOT_FOUND");
      expect((await metadatos()).title).toBe("Lugar · Somos Nosotros");
    });
  });

  it("un error de la consulta (402 de cuota, 5xx, más de una fila) lanza y no es notFound", async () => {
    await con({ data: null, error: { code: "PGRST000", message: "secreto-remoto" } }, async () => {
      await expect(pedir()).rejects.toThrow("No pudimos cargar la ficha.");
      expect(m.notFound).not.toHaveBeenCalled();
    });
  });

  it("un error con datos de relleno tampoco hace pasar la ficha por viva", async () => {
    await con({ data: {}, error: { message: "secreto-remoto" } }, async () => {
      await expect(pedir()).rejects.toThrow("No pudimos cargar la ficha.");
    });
  });

  it("sin cliente (variables de entorno ausentes) lanza", async () => {
    await con(null, async () => {
      await expect(pedir()).rejects.toThrow("No pudimos cargar la ficha.");
    });
  });

  it("generateMetadata ante un fallo no lleva robots ni canonical (rigen las etiquetas del sitio) y no lanza", async () => {
    await con({ data: null, error: { message: "secreto-remoto" } }, async () => {
      expect(await metadatos()).toEqual({});
    });
  });
});
