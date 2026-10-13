import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

    // Cuántos eventos vienen y cuánta gente lo sigue (dos números, un Suspense), "Próximos eventos" (otro) y el historial (OL-390, otro).
    const suspenses = elementos.filter((e) => e.type === Suspense);
    expect(suspenses.length).toBe(3);
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

describe("el historial del lugar (OL-390)", () => {
  const pasado = (id: string, artistas: { id: string; slug: string; nombre: string }[]) => ({
    evento: { id, slug: id, titulo: id, inicio: "2026-10-09T01:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, lugar_id: LUGAR.id, sitio_texto: null, sitio_direccion: null, sitio_reservado: false, evento_padre_id: null, lugar: { id: LUGAR.id, slug: LUGAR.slug, nombre: LUGAR.nombre, portada: null } },
    artistas: artistas.map((a, i) => ({ evento_id: id, orden: i + 1, artista: { ...a, foto: null } })),
  });

  /** El cuerpo del lugar con esos eventos pasados y esa persona mirando: el elemento `Historial` que pinta su sección, ya resuelta. */
  async function seccionCon(pasados: ReturnType<typeof pasado>[], quien: { id: string; rol: "admin" | "usuario" } | null = null) {
    const { clienteServidor, usuarioActual } = await import("@/lib/supabase/servidor");
    const { default: Historial } = await import("@/components/Historial");
    const { default: CuerpoLugar } = await import("./CuerpoLugar");
    const previo = vi.mocked(clienteServidor).getMockImplementation()!;
    if (quien) vi.mocked(usuarioActual).mockResolvedValueOnce({ correo: null, perfil: { id: quien.id, rol: quien.rol, nombre: "Quien mira", foto: null, colonia: null, bio: null } });
    const base = clienteFalso({ lugares: { data: LUGAR }, eventos_artistas: { data: pasados.flatMap((p) => p.artistas) } }, { cuenta_seguidores: { data: 0 }, van_por_evento: { data: [] } });
    const cliente = {
      ...base,
      from: (tabla: string) => {
        if (tabla !== "eventos") return base.from(tabla);
        let enPasado = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = {};
        for (const metodo of ["select", "eq", "in", "or", "order", "limit", "not"]) q[metodo] = () => q;
        q.lt = () => ((enPasado = true), q);
        q.then = (ok: (v: unknown) => void, mal: (e: unknown) => void) => Promise.resolve({ data: enPasado ? pasados.map((p) => p.evento) : [] }).then(ok, mal);
        return q;
      },
    };
    vi.mocked(clienteServidor).mockImplementation((async () => cliente) as never);
    try {
      const { cargarFicha } = await import("./CuerpoLugar");
      const f = await cargarFicha(LUGAR.slug);
      const cuerpo = [...recorrer(CuerpoLugar({ f: f! }))];
      const diferidos = cuerpo.filter((e) => e.type === Suspense).map((s) => s.props.children as { type: (p: unknown) => unknown; props: unknown });
      const seccion = diferidos.find((d) => d.type.name === "SeccionHistorialLugar")!;
      const el = (await seccion.type(seccion.props)) as { type: unknown; props: Parameters<typeof Historial>[0] };
      expect(el.type).toBe(Historial);
      return el;
    } finally {
      vi.mocked(clienteServidor).mockImplementation(previo);
    }
  }

  /** Lo que pinta la sección de historial, ya resuelta (sin nadie mirando). */
  async function historial(pasados: ReturnType<typeof pasado>[]) {
    const { default: Historial } = await import("@/components/Historial");
    return Historial((await seccionCon(pasados)).props) as { props: Record<string, unknown> } | null;
  }

  it("sin eventos pasados la sección no existe", async () => {
    expect(await historial([])).toBeNull();
  });

  it("con eventos pasados sale «Historial» con eventos y artistas distintos", async () => {
    const LEO = { id: "a-leo", slug: "leo", nombre: "Leo Traeger" };
    const LATIFE = { id: "a-latife", slug: "latife", nombre: "Latife Zetune" };
    const raiz = await historial([pasado("a", [LEO, LATIFE]), pasado("b", [LEO]), pasado("c", [])]);
    expect(raiz?.props.titulo).toBe("Historial");
    expect(raiz?.props.id).toBe("historial");
    expect(raiz?.props.cuenta).toBe("3 eventos · 2 artistas");
  });

  describe("«Tu año» al final (OL-394)", () => {
    beforeAll(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-12T20:00:00Z"));
    });
    afterAll(() => vi.useRealTimers());

    it("quien gestiona el lugar (su autor o la administración) y con eventos de este año: el botón", async () => {
      expect((await seccionCon([pasado("a", [])], { id: "autor-1", rol: "usuario" })).props.tuAnio).toBe("/lugares/lugar-de-prueba/tu-anio");
      expect((await seccionCon([pasado("a", [])], { id: "admin-1", rol: "admin" })).props.tuAnio).toBe("/lugares/lugar-de-prueba/tu-anio");
    });

    it("sin sesión o quien no lo gestiona: sin botón", async () => {
      expect((await seccionCon([pasado("a", [])])).props.tuAnio).toBeNull();
      expect((await seccionCon([pasado("a", [])], { id: "otra", rol: "usuario" })).props.tuAnio).toBeNull();
    });

    it("solo con eventos del año pasado: sin botón", async () => {
      const viejo = pasado("a", []);
      viejo.evento.inicio = "2025-10-09T01:00:00Z";
      expect((await seccionCon([viejo], { id: "autor-1", rol: "usuario" })).props.tuAnio).toBeNull();
    });
  });

  describe("«Informe» en PDF junto a «Tu año» (OL-396)", () => {
    beforeAll(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-12T20:00:00Z"));
    });
    afterAll(() => vi.useRealTimers());

    it("quien gestiona el lugar, con algo pasado aunque sea de otro año: las seis opciones (mes, año, todo × carta, A4) y los nombres del periodo", async () => {
      const viejo = pasado("a", []);
      viejo.evento.inicio = "2025-10-09T01:00:00Z";
      const { documento } = (await seccionCon([viejo], { id: "autor-1", rol: "usuario" })).props;
      expect(documento?.que).toBe("lugar");
      expect(documento?.etiquetasPeriodo).toEqual({ mes: "Octubre", anio: "2026", todo: "Todo" });
      expect(documento?.opciones.map((o) => `${o.periodo}/${o.formato}/${o.paginas}`)).toEqual(["mes/carta/1", "mes/a4/1", "anio/carta/1", "anio/a4/1", "todo/carta/1", "todo/a4/1"]);
      expect(documento?.opciones[0].archivo).toBe("informe-lugar-de-prueba-2026-10.pdf");
      expect((await seccionCon([pasado("a", [])], { id: "admin-1", rol: "admin" })).props.documento?.que).toBe("lugar");
    });

    it("sin sesión o quien no lo gestiona: sin botón", async () => {
      expect((await seccionCon([pasado("a", [])])).props.documento).toBeNull();
      expect((await seccionCon([pasado("a", [])], { id: "otra", rol: "usuario" })).props.documento).toBeNull();
    });
  });
});
