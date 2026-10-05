import { describe, expect, it, vi } from "vitest";
import { Suspense } from "react";
import Heroe from "@/components/ui/Heroe";

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
  clienteServidor: vi.fn(async () => clienteFalso({ artistas: { data: ARTISTA }, eventos: { data: [] }, artistas_cuentas: { data: [] } }, { cuenta_seguidores: { data: 0 }, novedades_recientes_artistas: { data: [] } })),
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

    // El héroe (portada, avatar y nombre, `ui/Heroe`) sale con la página, sin esperar nada.
    const heroe = elementos.find((e) => e.type === Heroe);
    expect(heroe?.props?.titulo).toBe("Artista de prueba");

    const jsonLd = elementos.find((e) => e.type === "script" && e.props?.type === "application/ld+json");
    expect(jsonLd).toBeTruthy();
    const datos = JSON.parse((jsonLd!.props.dangerouslySetInnerHTML as { __html: string }).__html);
    expect(datos.name).toBe("Artista de prueba");

    // Sus tres números (un Suspense) y "Próximas fechas" (otro): dos límites.
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


it("la redirección UUID conserva el destino de la publicación exacta", async () => {
  const { default: FichaArtista } = await import("./page");
  const novedad = "00000000-0000-4000-8000-000000000123";
  await expect(FichaArtista({ params: Promise.resolve({ id: "artista-1" }), searchParams: Promise.resolve({ novedad }) })).rejects.toThrow(`PERMANENT_REDIRECT:/artistas/artista-de-prueba?novedad=${novedad}`);
});

it("el destino fuera de las primeras50 se carga por esta ficha y visible, sin pedir el catálogo completo", async () => {
  const { clienteServidor } = await import("@/lib/supabase/servidor");
  const { default: SeccionNovedades } = await import("./SeccionNovedades");
  const { default: FichaArtista } = await import("./page");
  const previo = vi.mocked(clienteServidor).getMockImplementation()!;
  const destino = { id: "00000000-0000-4000-8000-000000000123", creado_en: "2026-09-01T00:00:00Z", visible: true, proveedor: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", embed_id: null, titulo: "Destino", texto: null };
  const consultas: ReturnType<typeof chain>[] = [];
  const cliente = clienteFalso({ artistas: { data: ARTISTA }, artistas_cuentas: { data: [] } }, { novedades_recientes_artistas: { data: [] } });
  const from = cliente.from;
  cliente.from = (tabla) => {
    if (tabla !== "novedades_artista") return from(tabla);
    const q = chain({ data: Array.from({ length: 50 }, (_, i) => ({ ...destino, id: `previa-${i}`, creado_en: "2026-10-01T00:00:00Z" })) });
    q.eq = vi.fn(() => q);
    q.limit = vi.fn(() => q);
    q.maybeSingle = vi.fn(async () => ({ data: destino }));
    consultas.push(q);
    return q;
  };
  vi.mocked(clienteServidor).mockResolvedValue(cliente as never);
  try {
    const arbol = await FichaArtista({ params: Promise.resolve({ id: ARTISTA.slug }), searchParams: Promise.resolve({ novedad: destino.id }) });
    const seccion = [...recorrer(arbol)].find(e => e.type === SeccionNovedades)!;
    expect(seccion.props.novedadId).toBe(destino.id);
    expect(seccion.props.novedades).toHaveLength(51);
    expect(consultas).toHaveLength(2);
    expect(consultas[0].limit).toHaveBeenCalledWith(50);
    expect(consultas[1].eq.mock.calls).toEqual([["artista_id", ARTISTA.id], ["id", destino.id], ["visible", true]]);
  } finally { vi.mocked(clienteServidor).mockImplementation(previo); }
});

describe("la ficha distingue «no existe» de «falló la lectura» (OL-289)", () => {
  /** Corre `fn` con un cliente que responde `respuesta` a la consulta de la ficha (o sin cliente, si es `null`). */
  async function con(respuesta: unknown, fn: () => Promise<void>) {
    m.notFound.mockClear();
    const { clienteServidor } = await import("@/lib/supabase/servidor");
    const previo = vi.mocked(clienteServidor).getMockImplementation()!;
    vi.mocked(clienteServidor).mockImplementation((async () => (respuesta === null ? null : clienteFalso({ artistas: respuesta }))) as never);
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
    return Ficha({ params: Promise.resolve({ id: "artista-de-prueba" }), searchParams: Promise.resolve({}) });
  };
  const metadatos = async () => {
    const { generateMetadata } = await import("./page");
    return generateMetadata({ params: Promise.resolve({ id: "artista-de-prueba" }) });
  };

  it("sin fila y sin error es «no existe»: notFound y título de ficha inexistente", async () => {
    await con({ data: null, error: null }, async () => {
      await expect(pedir()).rejects.toThrow("NOT_FOUND");
      expect((await metadatos()).title).toBe("Artista · Somos Nosotros");
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
