import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Suspense } from "react";
import Heroe from "@/components/ui/Heroe";
import { MARCA } from "@/lib/marca";

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

    // Sus tres números (un Suspense), "Próximas fechas" (otro), la trayectoria (OL-390, otro) y «Reconocimientos y obra» (OL-445, otro):
    // cuatro límites.
    const suspenses = elementos.filter((e) => e.type === Suspense);
    expect(suspenses.length).toBe(4);
  });

  it("una ficha por UUID redirige (308 permanente) a su slug", async () => {
    const { default: FichaArtista } = await import("./page");
    await expect(FichaArtista({ params: Promise.resolve({ id: "artista-1" }), searchParams: Promise.resolve({}) })).rejects.toThrow("PERMANENT_REDIRECT:/artistas/artista-de-prueba");
  });

  it("generateMetadata trae el canonical de la ficha", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "artista-de-prueba" }) });
    expect(metadata.alternates?.canonical).toBe("https://somosnosotros.org/artistas/artista-de-prueba");
    expect(metadata.title).toBe(`Artista de prueba · ${MARCA}`);
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
      expect((await metadatos()).title).toBe(`Artista · ${MARCA}`);
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

describe("la trayectoria del artista (OL-390)", () => {
  const PROXIMA = { id: "e-proxima", slug: "proxima", titulo: "Próxima", inicio: "2099-10-10T01:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, precio: null, lugar_id: "l-paz", sitio_texto: null, sitio_direccion: null, sitio_reservado: false, creado_en: "2026-10-01T00:00:00Z", lugar: { nombre: "Teatro de la Paz", portada: null } };
  const pasada = (id: string, lugar: { id: string; slug: string; nombre: string } | null) => ({ id, slug: id, titulo: id, inicio: "2026-10-09T01:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, lugar_id: lugar?.id ?? null, sitio_texto: lugar ? null : "Jardín Colón", sitio_direccion: null, sitio_reservado: false, evento_padre_id: null, lugar: lugar && { ...lugar, portada: null } });
  const CDC = { id: "l-cdc", slug: "cdc", nombre: "Centro de Difusión Cultural Raúl Gamboa" };

  /** Un cliente cuya consulta de eventos contesta lo pasado si se filtró con `lt` (`termina < ahora`) y lo próximo si no. */
  function clienteConFechas(proximas: unknown[], pasadas: unknown[]) {
    const base = clienteFalso({ artistas: { data: ARTISTA }, artistas_cuentas: { data: [] }, eventos_artistas: { data: [] } }, { cuenta_seguidores: { data: 0 }, novedades_recientes_artistas: { data: [] }, van_por_evento: { data: [] } });
    return {
      ...base,
      from: (tabla: string) => {
        if (tabla !== "eventos") return base.from(tabla);
        let pasado = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = {};
        for (const metodo of ["select", "eq", "in", "or", "order", "limit", "not"]) q[metodo] = () => q;
        q.lt = () => ((pasado = true), q);
        q.then = (ok: (v: unknown) => void, mal: (e: unknown) => void) => Promise.resolve({ data: pasado ? pasadas : proximas }).then(ok, mal);
        return q;
      },
    };
  }

  /** Corre la ficha con esas fechas y devuelve el árbol de los números y de la trayectoria, ya resueltos. */
  async function ficha(proximas: unknown[], pasadas: unknown[]) {
    const { clienteServidor } = await import("@/lib/supabase/servidor");
    const { Kpi } = await import("@/components/ui/Kpi");
    const { default: Historial } = await import("@/components/Historial");
    const previo = vi.mocked(clienteServidor).getMockImplementation()!;
    vi.mocked(clienteServidor).mockImplementation((async () => clienteConFechas(proximas, pasadas)) as never);
    try {
      const { default: FichaArtista } = await import("./page");
      const arbol = await FichaArtista({ params: Promise.resolve({ id: ARTISTA.slug }), searchParams: Promise.resolve({}) });
      const diferidos = [...recorrer(arbol)].filter((e) => e.type === Suspense).map((s) => s.props.children as { type: (p: unknown) => Promise<unknown>; props: unknown });
      const resueltos = await Promise.all(diferidos.map((d) => d.type(d.props)));
      const elementos = resueltos.flatMap((r) => [...recorrer(r)]);
      const historial = elementos.find((e) => e.type === Historial);
      const lugares = elementos.find((e) => e.type === Kpi && e.props.etiqueta === "Lugares");
      return { seccion: historial ? Historial(historial.props as Parameters<typeof Historial>[0]) : undefined, lugares };
    } finally {
      vi.mocked(clienteServidor).mockImplementation(previo);
    }
  }

  it("sin fechas pasadas la sección no existe", async () => {
    const { seccion, lugares } = await ficha([PROXIMA], []);
    expect(seccion).toBeNull();
    expect(lugares?.props.valor).toBe(1);
  });

  it("con fechas pasadas sale «Trayectoria» con su cuenta", async () => {
    const { seccion } = await ficha([], [pasada("a", CDC), pasada("b", CDC), pasada("c", null)]);
    const raiz = seccion as { props: Record<string, unknown> };
    expect(raiz.props.titulo).toBe("Trayectoria");
    expect(raiz.props.id).toBe("trayectoria");
    expect(raiz.props.cuenta).toBe("3 fechas · 1 lugar");
  });

  it("«Lugares» cuenta pasadas y próximas; con próximas baja a ellas", async () => {
    const { lugares } = await ficha([PROXIMA], [pasada("a", CDC)]);
    expect(lugares?.props.valor).toBe(2);
    expect(lugares?.props.salto).toBe("fechas");
  });

  it("sin próximas, «Lugares» baja a la trayectoria", async () => {
    const { lugares } = await ficha([], [pasada("a", CDC)]);
    expect(lugares?.props.valor).toBe(1);
    expect(lugares?.props.salto).toBe("trayectoria");
  });

  it("sin lugares con ficha, «Lugares» no lleva a ninguna parte", async () => {
    const { lugares } = await ficha([], [pasada("a", null)]);
    expect(lugares?.props.valor).toBe(0);
    expect(lugares?.props.salto).toBeUndefined();
  });
});

describe("«Tu año» al final de la trayectoria (OL-394)", () => {
  const pasada = (id: string, inicio: string) => ({ id, slug: id, titulo: id, inicio, fin: null, zona: "America/Mexico_City", imagen: null, lugar_id: null, sitio_texto: "Jardín Colón", sitio_direccion: null, sitio_reservado: false, evento_padre_id: null, lugar: null });
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T20:00:00Z"));
  });
  afterAll(() => vi.useRealTimers());

  /** La trayectoria resuelta con esas fechas pasadas y esa persona mirando: la dirección del botón, o nada. */
  async function botonCon(pasadas: unknown[], quien: { id: string; rol: "admin" | "usuario" } | null) {
    return (await propsCon(pasadas, quien))?.tuAnio;
  }

  /** Las props de la trayectoria resuelta con esas fechas pasadas y esa persona mirando. */
  async function propsCon(pasadas: unknown[], quien: { id: string; rol: "admin" | "usuario" } | null) {
    const { clienteServidor, usuarioActual } = await import("@/lib/supabase/servidor");
    const { default: Historial } = await import("@/components/Historial");
    const previo = vi.mocked(clienteServidor).getMockImplementation()!;
    const base = clienteFalso({ artistas: { data: ARTISTA }, artistas_cuentas: { data: [] }, eventos_artistas: { data: [] }, seguimientos: { data: null } }, { cuenta_seguidores: { data: 0 }, novedades_recientes_artistas: { data: [] }, van_por_evento: { data: [] } });
    vi.mocked(clienteServidor).mockImplementation((async () => ({
      ...base,
      from: (tabla: string) => {
        if (tabla !== "eventos") return base.from(tabla);
        let pasado = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = {};
        for (const metodo of ["select", "eq", "in", "or", "order", "limit", "not"]) q[metodo] = () => q;
        q.lt = () => ((pasado = true), q);
        q.then = (ok: (v: unknown) => void, mal: (e: unknown) => void) => Promise.resolve({ data: pasado ? pasadas : [] }).then(ok, mal);
        return q;
      },
    })) as never);
    if (quien) vi.mocked(usuarioActual).mockResolvedValueOnce({ correo: null, perfil: { id: quien.id, rol: quien.rol, nombre: "Quien mira", foto: null, colonia: null, bio: null } });
    try {
      const { default: FichaArtista } = await import("./page");
      const arbol = await FichaArtista({ params: Promise.resolve({ id: ARTISTA.slug }), searchParams: Promise.resolve({}) });
      const diferidos = [...recorrer(arbol)].filter((e) => e.type === Suspense).map((s) => s.props.children as { type: (p: unknown) => Promise<unknown>; props: unknown });
      const resueltos = await Promise.all(diferidos.map((d) => d.type(d.props)));
      return resueltos.flatMap((r) => [...recorrer(r)]).find((e) => e.type === Historial)?.props as Parameters<typeof Historial>[0] | undefined;
    } finally {
      vi.mocked(clienteServidor).mockImplementation(previo);
    }
  }

  it("quien la gestiona (su autor) y con fechas pasadas de este año: el botón lleva a la vista previa", async () => {
    expect(await botonCon([pasada("a", "2026-10-09T01:00:00Z")], { id: "autor-1", rol: "usuario" })).toBe("/artistas/artista-de-prueba/tu-anio");
  });

  it("la administración también", async () => {
    expect(await botonCon([pasada("a", "2026-10-09T01:00:00Z")], { id: "admin-1", rol: "admin" })).toBe("/artistas/artista-de-prueba/tu-anio");
  });

  it("sin sesión o quien no la gestiona: sin botón", async () => {
    expect(await botonCon([pasada("a", "2026-10-09T01:00:00Z")], null)).toBeNull();
    expect(await botonCon([pasada("a", "2026-10-09T01:00:00Z")], { id: "otra", rol: "usuario" })).toBeNull();
  });

  it("solo con fechas del año pasado: sin botón (la trayectoria sí sale)", async () => {
    expect(await botonCon([pasada("a", "2025-10-09T01:00:00Z")], { id: "autor-1", rol: "usuario" })).toBeNull();
  });

  it("«Presentación» en PDF (OL-396): quien la gestiona, con algo pasado aunque sea de otro año, recibe las opciones de la hoja", async () => {
    const props = await propsCon([pasada("a", "2025-10-09T01:00:00Z")], { id: "autor-1", rol: "usuario" });
    expect(props?.documento?.que).toBe("artista");
    expect(props?.documento?.opciones.map((o) => [o.formato, o.paginas, o.archivo])).toEqual([["carta", 1, "presentacion-artista-de-prueba.pdf"], ["a4", 1, "presentacion-artista-de-prueba.pdf"]]);
    expect(props?.documento?.opciones[0].href).toMatch(/^\/api\/documento\?que=artista&id=artista-de-prueba&formato=carta&v=/);
    expect((await propsCon([pasada("a", "2026-10-09T01:00:00Z")], { id: "admin-1", rol: "admin" }))?.documento?.que).toBe("artista");
  });

  it("«Presentación» en PDF: sin sesión o ajeno, sin botón", async () => {
    expect((await propsCon([pasada("a", "2026-10-09T01:00:00Z")], null))?.documento).toBeNull();
    expect((await propsCon([pasada("a", "2026-10-09T01:00:00Z")], { id: "otra", rol: "usuario" }))?.documento).toBeNull();
  });
});
