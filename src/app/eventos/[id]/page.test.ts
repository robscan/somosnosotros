import { afterEach, describe, expect, it, vi } from "vitest";
import { Suspense } from "react";
import Heroe from "@/components/ui/Heroe";
import { Kpi } from "@/components/ui/Kpi";
import BotonCalendario from "@/components/BotonCalendario";
import BotonCompartir from "@/components/BotonCompartir";
import EventosPorDia from "@/components/EventosPorDia";
import Asistencia from "./Asistencia";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

/**
 * OL-161 (bitácora 196): la cabecera de la ficha (foto, nombre, cuándo, dónde, JSON-LD, canonical) tiene que salir
 * en el HTML inicial, sin esperar "quién va" (nombres, cuántos van), que es su propia consulta y va en `<Suspense>`.
 * No se renderiza a HTML de verdad (evita arrastrar Mapbox/Link con su contexto de router): se llama a la función de
 * la página con datos de prueba y se recorre el árbol de elementos que devuelve, sin pintarlo — basta para
 * comprobar qué queda fuera de cualquier `<Suspense>` y qué queda dentro.
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
  for (const metodo of ["select", "eq", "neq", "is", "ilike", "in", "or", "order", "limit", "not", "upsert"]) objeto[metodo] = () => objeto;
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

const EVENTO = {
  id: "evento-1",
  slug: "evento-de-prueba",
  lugar_id: null,
  titulo: "Evento de prueba",
  inicio: "2099-01-01T20:00:00Z",
  fin: null,
  descripcion: null,
  imagen: null,
  precio: null,
  enlace: null,
  creado_por: "autor-1",
  visible: true,
  sitio_texto: "Foro de prueba",
  sitio_direccion: "Calle Uno 123",
  sitio_lat: null,
  sitio_lng: null,
  sitio_reservado: false,
  sitio_revelar_desde: null,
  zona: "America/Mexico_City",
  ciudad: "San Luis Potosí",
  lugar: null,
  autor: { id: "autor-1", nombre: "Autora de prueba" },
};

vi.mock("@/lib/supabase/servidor", () => ({
  clienteServidor: vi.fn(async () => clienteFalso({ eventos: { data: EVENTO }, asistencias: { data: [] } }, { van_por_evento: { data: [] } })),
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
    yield* recorrer(el.props?.banda); // los números de la cabecera oscura (`ui/Heroe`, OL-351)
  }
}

describe("ficha de evento: la cabecera pinta antes que quién va (OL-161)", () => {
  it("el árbol inicial trae el título, el JSON-LD y deja «Van», «Artistas» y «Quién va» en Suspense", async () => {
    const { default: FichaEvento } = await import("./page");
    const arbol = await FichaEvento({ params: Promise.resolve({ id: "evento-de-prueba" }), searchParams: Promise.resolve({}) });
    const elementos = [...recorrer(arbol)];

    // El héroe (portada y título, `ui/Heroe`) sale con la página, sin esperar nada.
    const heroe = elementos.find((e) => e.type === Heroe);
    expect(heroe?.props?.titulo).toBe("Evento de prueba");

    const jsonLd = elementos.find((e) => e.type === "script" && e.props?.type === "application/ld+json");
    expect(jsonLd).toBeTruthy();
    const datos = JSON.parse((jsonLd!.props.dangerouslySetInnerHTML as { __html: string }).__html);
    expect(datos["@type"]).toBe("Event");
    expect(datos.name).toBe("Evento de prueba");
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({ params: Promise.resolve({ id: EVENTO.slug }) });
    expect(datos.url).toBe(metadata.alternates?.canonical);

    // El número «Van», el bloque «Artistas» y la sección «Quién va»: cada uno su límite, con su propia consulta.
    const suspenses = elementos.filter((e) => e.type === Suspense);
    expect(suspenses.length).toBe(3);
  });

  it("una ficha por UUID redirige (308 permanente) a su slug — el candado y el resto de la cabecera no esperan nada más", async () => {
    const { default: FichaEvento } = await import("./page");
    await expect(FichaEvento({ params: Promise.resolve({ id: "evento-1" }), searchParams: Promise.resolve({}) })).rejects.toThrow("PERMANENT_REDIRECT:/eventos/evento-de-prueba");
  });

  it("generateMetadata trae el canonical de la ficha", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "evento-de-prueba" }) });
    expect(metadata.alternates?.canonical).toBe("https://somosnosotros.org/eventos/evento-de-prueba");
    expect(metadata.title).toBe("Evento de prueba · Somos Nosotros");
  });
});

describe("JSON-LD de un evento activo reservado (OL-278)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });

  it("no publica Event aunque la sesión reciba la dirección privada autorizada", async () => {
    const evento = { ...EVENTO, sitio_reservado: true, sitio_direccion: null };
    const cliente = clienteFalso({
      eventos: { data: evento },
      asistencias: { data: null },
      eventos_sitio_privado: { data: { direccion: "Calle reservada 278", lat: 22, lng: -100, indicaciones: null } },
    });
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    vi.mocked(usuarioActual).mockResolvedValue({ correo: "prueba@example.com", perfil: { id: "lectora", nombre: "Prueba", rol: "usuario", foto: null, colonia: null, bio: null } });
    const { default: FichaEvento } = await import("./page");
    const elementos = [...recorrer(await FichaEvento({ params: Promise.resolve({ id: EVENTO.slug }) }))];
    expect(elementos.some(e => e.type === "b" && e.props.children === "Calle reservada 278")).toBe(true);
    const estructurados = elementos.filter(e => e.type === "script" && e.props.type === "application/ld+json")
      .map(e => JSON.parse((e.props.dangerouslySetInnerHTML as { __html: string }).__html));
    expect(estructurados.some(d => d["@type"] === "Event")).toBe(false);
    expect(JSON.stringify(estructurados)).not.toContain("Calle reservada 278");
  });
});

describe("dirección reservada tras el fin (OL-257)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });

  const preparar = (privado: boolean, sesion = true, autor = false, reservado = true, visible = true) => {
    const upsert = vi.fn();
    const evento = { ...EVENTO, inicio: "2000-01-01T19:00:00Z", fin: "2000-01-01T20:00:00Z", sitio_reservado: reservado, visible };
    const cliente = clienteFalso({ eventos: { data: evento }, eventos_sitio_privado: { data: privado ? { direccion: "Calle reservada 257", lat: 22, lng: -100, indicaciones: null } : null } });
    const from = cliente.from;
    cliente.from = (tabla: string) => tabla === "asistencias" ? { ...chain({ data: [] }), upsert } : from(tabla);
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    vi.mocked(usuarioActual).mockResolvedValue(sesion ? { correo: "prueba@example.com", perfil: { id: autor ? "autor-1" : "lectora", nombre: "Prueba", rol: "usuario", foto: null, colonia: null, bio: null } } : null);
    return upsert;
  };
  const ficha = async (accion?: string) => {
    const { default: FichaEvento } = await import("./page");
    return FichaEvento({ params: Promise.resolve({ id: EVENTO.slug }), searchParams: Promise.resolve({ accion }) });
  };
  it("con fila autorizada por RLS permite consultar la dirección y explica que el evento terminó", async () => {
    preparar(true);
    const elementos = [...recorrer(await ficha())];
    expect(elementos.find(e => e.type === "b" && e.props.children === "Calle reservada 257")).toBeTruthy();
    expect(elementos.find(e => e.props.role === "status")?.props.children).toBe("Este evento ya terminó. La dirección sigue disponible hasta dos horas después de su fin.");
    expect(elementos.some(e => e.type === Asistencia)).toBe(false);
    expect(elementos.some(e => e.type === "script" && e.props.type === "application/ld+json")).toBe(false);
  });
  it("no ejecuta un Voy pendiente después del fin", async () => {
    const upsert = preparar(true);
    await ficha("voy");
    expect(upsert).not.toHaveBeenCalled();
  });
  it("un evento terminado no invita a registrarse: en pasado, «Quién fue» y sin nadie no se pinta (OL-383, OL-388)", async () => {
    preparar(true);
    const elementos = [...recorrer(await ficha())];
    const diferido = elementos.find(e => typeof e.type === "function" && (e.type as { name?: string }).name === "QuienVaDiferido");
    expect(diferido?.props.pasado).toBe(true);
    expect(await (diferido!.type as (p: unknown) => Promise<unknown>)(diferido!.props)).toBeNull();
    expect(elementos.some(e => e.props?.id === "quien-va")).toBe(false);
  });
  it.each([
    [false, true, true], // ventana vencida/revocada: RLS no devuelve fila.
    [false, false, true], // anónimo.
    [true, false, true], // ni una respuesta privada inesperada sustituye la sesión.
    [false, true, false], // evento ordinario pasado.
  ])("oculto y sin acceso reservado vigente conserva 404: %j", async (privado, sesion, reservado) => {
    preparar(privado, sesion, false, reservado, false);
    await expect(ficha()).rejects.toThrow("NOT_FOUND");
  });
  it.each([
    [false, true], // ventana vencida/revocada: RLS no devuelve fila.
    [false, false], // anónimo.
    [true, false], // ni una respuesta privada inesperada sustituye la sesión.
  ])("visible y sin acceso reservado vigente: la ficha en pasado, sin la dirección (OL-383): %j", async (privado, sesion) => {
    preparar(privado, sesion);
    const elementos = [...recorrer(await ficha())];
    expect(elementos.find(e => e.type === Heroe)?.props.etiqueta).toBe("Ya pasó");
    expect(elementos.some(e => e.type === "b" && e.props.children === "Calle reservada 257")).toBe(false);
    expect(elementos.some(e => e.type === "small" && e.props.children === "La dirección ya no está disponible por privacidad.")).toBe(true);
    expect(elementos.some(e => e.props?.role === "status")).toBe(false);
  });
  it("la autora conserva acceso a su evento pasado aunque no haya dirección privada", async () => {
    preparar(false, true, true);
    const elementos = [...recorrer(await ficha())];
    expect(elementos.find(e => e.type === Heroe)?.props.titulo).toBe(EVENTO.titulo);
    expect(elementos.some(e => e.type === "small" && e.props.children === "La dirección ya no está disponible por privacidad.")).toBe(true);
  });
});

describe("la ficha distingue «no existe» de «falló la lectura» (OL-289)", () => {
  /** Corre `fn` con un cliente que responde `respuesta` a la consulta de la ficha (o sin cliente, si es `null`). */
  async function con(respuesta: unknown, fn: () => Promise<void>) {
    m.notFound.mockClear();
    const { clienteServidor } = await import("@/lib/supabase/servidor");
    const previo = vi.mocked(clienteServidor).getMockImplementation()!;
    vi.mocked(clienteServidor).mockImplementation((async () => (respuesta === null ? null : clienteFalso({ eventos: respuesta }))) as never);
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
    return Ficha({ params: Promise.resolve({ id: "evento-de-prueba" }), searchParams: Promise.resolve({}) });
  };
  const metadatos = async () => {
    const { generateMetadata } = await import("./page");
    return generateMetadata({ params: Promise.resolve({ id: "evento-de-prueba" }) });
  };

  it("sin fila y sin error es «no existe»: notFound y título de ficha inexistente", async () => {
    await con({ data: null, error: null }, async () => {
      await expect(pedir()).rejects.toThrow("NOT_FOUND");
      expect((await metadatos()).title).toBe("Evento · Somos Nosotros");
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


describe("horario por día en la ficha (OL-311)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });

  // Del 1 al 3 de enero de 2099: el jueves de 20:00 a 21:00, el viernes desde las 18:00 y el sábado de 20:00 a 21:00 (UTC−6).
  const EVENTO_POR_DIA = { ...EVENTO, inicio: "2099-01-02T02:00:00Z", fin: "2099-01-04T03:00:00Z" };
  const SESIONES = [
    { inicio: "2099-01-04T02:00:00Z", fin: "2099-01-04T03:00:00Z" },
    { inicio: "2099-01-02T02:00:00Z", fin: "2099-01-02T03:00:00Z" },
    { inicio: "2099-01-03T00:00:00Z", fin: null },
  ];
  const ficha = async (evento: unknown) => {
    vi.mocked(clienteServidor).mockResolvedValue(clienteFalso({ eventos: { data: evento }, asistencias: { data: [] } }, { van_por_evento: { data: [] } }) as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { default: FichaEvento } = await import("./page");
    return [...recorrer(await FichaEvento({ params: Promise.resolve({ id: EVENTO.slug }), searchParams: Promise.resolve({}) }))];
  };
  /** El texto plano de un elemento: lo que lleva dentro, en orden. */
  const textoDe = (hijos: unknown): string => (Array.isArray(hijos) ? hijos.map(textoDe).join("") : typeof hijos === "string" || typeof hijos === "number" ? String(hijos) : "");

  it("el número de la fecha dice los días y «Por día», y debajo va la lista de días con sus horas en 24 h", async () => {
    const elementos = await ficha({ ...EVENTO_POR_DIA, sesiones: SESIONES });
    const cuando = elementos.find((e) => e.type === Kpi && e.props.icono !== undefined && typeof e.props.valor === "string" && e.props.etiqueta === "Por día");
    expect(cuando?.props.valor).toMatch(/^Del 1 al 3 de ene de 2099$/);
    const seccion = elementos.find((e) => e.type === "section" && e.props["aria-label"] === "Horarios por día");
    expect(seccion).toBeTruthy();
    const filas = [...recorrer(seccion!.props.children)].filter((e) => e.type === "li").map((li) => [...recorrer(li.props.children)].filter((x) => x.type === "b" || x.type === "small").map((x) => textoDe(x.props.children)));
    expect(filas).toEqual([
      ["jue 1 de ene de 2099", "20:00–21:00"],
      ["vie 2 de ene de 2099", "18:00"],
      ["sáb 3 de ene de 2099", "20:00–21:00"],
    ]);
  });

  it("«A mi calendario» lleva el primer día y los demás en las notas; el texto de compartir dice «horarios por día»", async () => {
    const elementos = await ficha({ ...EVENTO_POR_DIA, sesiones: SESIONES });
    const calendario = elementos.find((e) => e.type === BotonCalendario);
    const datos = calendario?.props.datos as { inicio: string; fin: string; notas: string | null };
    expect(datos.inicio).toBe("2099-01-02T02:00:00Z");
    expect(datos.fin).toBe("2099-01-02T03:00:00Z");
    expect(datos.notas).toBe("jue 1 de ene de 2099 · 20:00–21:00\nvie 2 de ene de 2099 · 18:00\nsáb 3 de ene de 2099 · 20:00–21:00");
    const compartir = elementos.find((e) => e.props.texto && String(e.props.texto).includes("Foro de prueba"));
    expect(compartir?.props.texto).toContain("Del 1 al 3 de ene de 2099 · horarios por día");
  });

  it("sin sesiones la ficha es la de siempre: ni lista ni «Por día»", async () => {
    const elementos = await ficha({ ...EVENTO_POR_DIA, sesiones: [] });
    expect(elementos.some((e) => e.type === "section" && e.props["aria-label"] === "Horarios por día")).toBe(false);
    expect(elementos.some((e) => e.type === Kpi && e.props.etiqueta === "Por día")).toBe(false);
    const sinCampo = await ficha(EVENTO_POR_DIA);
    expect(sinCampo.some((e) => e.type === "section" && e.props["aria-label"] === "Horarios por día")).toBe(false);
  });

  it("si el evento se editó por el formulario y sus horas ya no coinciden con las sesiones, se lee con su inicio y su fin", async () => {
    const elementos = await ficha({ ...EVENTO_POR_DIA, inicio: "2099-01-02T01:00:00Z", sesiones: SESIONES });
    expect(elementos.some((e) => e.type === "section" && e.props["aria-label"] === "Horarios por día")).toBe(false);
    expect(elementos.some((e) => e.type === Kpi && e.props.etiqueta === "Por día")).toBe(false);
  });
});

describe("las acciones del evento siguen en su ficha al editar por pasos (OL-319)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });

  const ficha = async (rol: "usuario" | "admin", id: string) => {
    vi.mocked(clienteServidor).mockResolvedValue(clienteFalso({ eventos: { data: EVENTO }, asistencias: { data: [] } }, { van_por_evento: { data: [] } }) as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    vi.mocked(usuarioActual).mockResolvedValue({ correo: "prueba@example.com", perfil: { id, nombre: "Prueba", rol, foto: null, colonia: null, bio: null } });
    const { default: FichaEvento } = await import("./page");
    return [...recorrer(await FichaEvento({ params: Promise.resolve({ id: EVENTO.slug }), searchParams: Promise.resolve({}) }))];
  };
  const enlaces = (elementos: { props: Record<string, unknown> }[]) => elementos.map((e) => e.props.href).filter((h): h is string => typeof h === "string");

  it("su autora tiene «Editar» (la misma ruta, que ahora abre el flujo por pasos), «Duplicar con otra fecha» y «Borrar el evento», que confirma", async () => {
    const { default: Borrar } = await import("@/components/Borrar");
    const elementos = await ficha("usuario", "autor-1");
    expect(enlaces(elementos)).toEqual(expect.arrayContaining(["/eventos/evento-de-prueba/editar", "/nuevo/evento?desde=evento-1"]));
    expect(elementos.find((e) => e.type === Borrar)?.props).toMatchObject({ que: "el evento", fila: true });
  });

  it("la administración además oculta o vuelve a mostrar el evento", async () => {
    const elementos = await ficha("admin", "admin-1");
    expect(enlaces(elementos)).toContain("/eventos/evento-de-prueba/editar");
    expect(elementos.some((e) => e.type === "b" && e.props.children === "Ocultar de la agenda")).toBe(true);
  });

  it("quien no es su autora ni la administración no ve ninguna de las tres", async () => {
    const elementos = await ficha("usuario", "lectora");
    expect(enlaces(elementos).some((h) => h.endsWith("/editar") || h.includes("desde="))).toBe(false);
  });
});

describe("la ficha según cómo ocurre (OL-321)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });
  const abrir = async (evento: Record<string, unknown>, tablas: Record<string, unknown> = {}) => {
    const cliente = clienteFalso({ eventos: { data: evento }, asistencias: { data: [] }, ...tablas }, { van_por_evento: { data: [] } });
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { default: FichaEvento } = await import("./page");
    return [...recorrer(await FichaEvento({ params: Promise.resolve({ id: String(evento.slug) }), searchParams: Promise.resolve({}) }))];
  };

  it("una exposición: «Hasta» y el horario en vez de «Van», su horario en un bloque y solo «Me interesa»", async () => {
    const expo = { ...EVENTO, clase: "exposicion", inicio: "2099-01-01T06:00:00Z", fin: "2099-02-01T05:59:00Z" };
    const elementos = await abrir(expo, { eventos_horarios: { data: [{ dias: [1, 2, 3, 4, 5, 6, 7], abre: "10:00:00", cierra: "18:00:00" }] } });
    const kpis = elementos.filter((e) => e.type === Kpi).map((e) => e.props.etiqueta);
    expect(kpis).toEqual(["Hasta", "Costo", "Abre"]);
    expect(elementos.filter((e) => e.type === Suspense).length).toBe(1);
    expect(elementos.find((e) => e.type === Asistencia)?.props.soloInteres).toBe(true);
    expect(elementos.some((e) => e.props?.["aria-label"] === "Horario")).toBe(true);
  });

  it("un festival: su programa y «Me interesa» en el marco; un evento suelto sigue con «Voy»", async () => {
    const festival = { ...EVENTO, clase: "festival", inicio: "2099-01-01T01:00:00Z", fin: "2099-01-04T06:00:00Z" };
    const elementos = await abrir(festival);
    expect(elementos.some((e) => e.props?.["aria-label"] === "Programa")).toBe(true);
    expect(elementos.find((e) => e.type === Asistencia)?.props.soloInteres).toBe(true);
    expect(elementos.filter((e) => e.type === Kpi).map((e) => e.props.etiqueta)).toEqual(["Actos", "Costo", "Sedes"]);
    const suelto = await abrir(EVENTO);
    expect(suelto.find((e) => e.type === Asistencia)?.props.soloInteres).toBe(false);
  });
});

describe("la cabecera oscura de exposición, taller y festival (OL-351)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });
  const abrir = async (evento: Record<string, unknown>) => {
    const cliente = clienteFalso({ eventos: { data: evento }, asistencias: { data: [] } }, { van_por_evento: { data: [] } });
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { default: FichaEvento } = await import("./page");
    const elementos = [...recorrer(await FichaEvento({ params: Promise.resolve({ id: String(evento.slug) }), searchParams: Promise.resolve({}) }))];
    const heroe = elementos.find((e) => e.type === Heroe)!;
    // Los números de la banda (dentro del héroe) y los del cuerpo (fuera): un mismo `Kpi` no sale en los dos.
    const enBanda = [...recorrer(heroe.props.banda)].filter((e) => e.type === Kpi).map((e) => e.props.etiqueta);
    return { heroe, enBanda, todos: elementos.filter((e) => e.type === Kpi).map((e) => e.props.etiqueta) };
  };

  it("el festival: «FESTIVAL», su periodo y su programa bajo el título, y «Actos · Costo · Sedes» en la banda", async () => {
    const { heroe, enBanda, todos } = await abrir({ ...EVENTO, clase: "festival", inicio: "2099-01-01T01:00:00Z", fin: "2099-01-04T06:00:00Z" });
    expect(heroe.props.etiqueta).toBe("Festival");
    expect(heroe.props.meta).toMatch(/· Programa por confirmar$/);
    expect(enBanda).toEqual(["Actos", "Costo", "Sedes"]);
    expect(todos).toEqual(enBanda);
  });

  it("la exposición: sin línea bajo el título (repetía sus números) y «Hasta · Costo · Horario» en la banda", async () => {
    const { heroe, enBanda, todos } = await abrir({ ...EVENTO, clase: "exposicion", inicio: "2000-01-01T06:00:00Z", fin: "2099-02-01T05:59:00Z" });
    expect(heroe.props.etiqueta).toBe("Exposición");
    expect(heroe.props.meta).toBeUndefined();
    expect(enBanda).toEqual(["Hasta", "Costo", "Horario"]);
    expect(todos).toEqual(enBanda);
  });

  it("el taller: cuándo y dónde bajo el título y «Sesiones · Costo» y «Van» (diferido) en la banda; sin «Cupo»", async () => {
    const { heroe, enBanda } = await abrir({ ...EVENTO, clase: "taller", precio: "$50" });
    expect(heroe.props.etiqueta).toBe("Taller");
    expect(heroe.props.meta).toMatch(/· Foro de prueba$/);
    expect(enBanda).toEqual(["Sesiones", "Costo"]);
    expect([...recorrer(heroe.props.banda)].some((e) => e.type === Suspense)).toBe(true);
    expect(JSON.stringify(enBanda)).not.toContain("Cupo");
  });

  it("un evento suelto no cambia: el héroe sin banda, etiqueta ni meta, y sus números en el cuerpo", async () => {
    const { heroe, todos } = await abrir(EVENTO);
    expect(heroe.props.banda).toBeUndefined();
    expect(heroe.props.etiqueta).toBeUndefined();
    expect(heroe.props.meta).toBeUndefined();
    expect(todos).toHaveLength(2); // cuándo y «Costo»; «Van» es `KpiVan`, diferido
    expect(todos[1]).toBe("Costo");
  });
});

describe("la ficha en pasado (OL-383)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });
  /** Un cliente cuya tabla `eventos` da la ficha a `maybeSingle` y la lista de actos a la consulta del programa. */
  const abrir = async (evento: Record<string, unknown>, actos: Record<string, unknown>[] = []) => {
    const cliente = {
      from: (tabla: string) => {
        if (tabla !== "eventos") return chain({ data: tabla === "asistencias" ? [] : null });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = chain({ data: actos });
        c.maybeSingle = () => Promise.resolve({ data: evento });
        return c;
      },
      rpc: () => Promise.resolve({ data: null }),
    };
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { default: FichaEvento } = await import("./page");
    return [...recorrer(await FichaEvento({ params: Promise.resolve({ id: String(evento.slug) }), searchParams: Promise.resolve({}) }))];
  };
  const PASADO = { ...EVENTO, inicio: "2000-01-01T19:00:00Z", fin: "2000-01-01T20:00:00Z", borrador: false };

  it("un evento pasado que se ve: «Ya pasó» en la cabecera, el cuándo en pasado, solo «Compartir»; sin «Voy», calendario, «Cómo llegar» ni «Quién va»", async () => {
    const elementos = await abrir(PASADO);
    expect(elementos.find((e) => e.type === Heroe)?.props.etiqueta).toBe("Ya pasó");
    expect(elementos.find((e) => e.type === Kpi)?.props.etiqueta).toMatch(/^Fue · /);
    expect(elementos.some((e) => e.type === BotonCompartir)).toBe(true);
    expect(elementos.some((e) => e.type === BotonCalendario)).toBe(false);
    expect(elementos.some((e) => e.type === Asistencia)).toBe(false);
    expect(elementos.some((e) => [e.props?.children].flat().includes("Cómo llegar"))).toBe(false);
    expect(elementos.some((e) => e.props?.id === "quien-va")).toBe(false);
    // Lo demás, tal cual: el sitio en «Dónde» y el pie.
    expect(elementos.some((e) => e.props?.nombre === "Foro de prueba")).toBe(true);
  });

  it("un borrador o un evento oculto que ya pasó sigue en «Esto ya no está»", async () => {
    await expect(abrir({ ...PASADO, borrador: true, visible: false })).rejects.toThrow("NOT_FOUND");
    await expect(abrir({ ...PASADO, visible: false })).rejects.toThrow("NOT_FOUND");
  });

  it("el título dice que ya pasó, sin imagen para compartir ni noindex", async () => {
    const cliente = clienteFalso({ eventos: { data: PASADO } });
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { generateMetadata } = await import("./page");
    const meta = await generateMetadata({ params: Promise.resolve({ id: PASADO.slug }) });
    expect(meta.title).toBe("Evento de prueba · Ya pasó · Somos Nosotros");
    expect(meta.openGraph).toBeUndefined();
    expect(meta.robots).toBeUndefined();
  });

  it("el festival: «Programa» solo con lo que viene y, aparte y plegado, «Ya pasó» con los pasados enlazados a su ficha", async () => {
    const festival = { ...EVENTO, id: "fest-1", slug: "festival-de-prueba", clase: "festival", inicio: "2000-01-01T19:00:00Z", fin: "2099-01-04T06:00:00Z" };
    const acto = (n: number, inicio: string) => ({ id: `acto-${n}`, slug: `acto-${n}`, titulo: `Acto ${n}`, inicio, fin: null, zona: "America/Mexico_City", imagen: null, precio: null, lugar_id: null, sitio_texto: "Foro", sitio_reservado: false, visible: true, borrador: false, lugar: null });
    const actos = [acto(1, "2000-01-01T19:00:00Z"), acto(2, "2000-01-02T19:00:00Z"), acto(3, "2000-01-03T19:00:00Z"), acto(4, "2099-01-01T19:00:00Z"), acto(5, "2099-01-02T19:00:00Z"), acto(6, "2099-01-03T19:00:00Z")];
    const elementos = await abrir(festival, actos);
    const programa = elementos.find((e) => e.props?.["aria-label"] === "Programa")!;
    const enPrograma = [...recorrer(programa)];
    const porDia = enPrograma.find((e) => Array.isArray(e.props?.eventos))!;
    expect((porDia.props.eventos as { id: string }[]).map((a) => a.id)).toEqual(["acto-4", "acto-5", "acto-6"]);
    expect(enPrograma.some((e) => e.type === "p" && [e.props.children].flat().join("") === "Programa registrado: 6 actividades · 3 por venir")).toBe(true);
    const yaPaso = elementos.find((e) => e.type === "details")!;
    expect(yaPaso.props.open).toBeUndefined();
    const dentro = [...recorrer(yaPaso)];
    expect(dentro.find((e) => e.type === "h2")?.props.children).toBe("Ya pasó");
    expect(dentro.find((e) => e.type === "small")?.props.children).toBe("3 actividades");
    const renglones = dentro.filter((e) => (e.props?.evento as { id?: string } | undefined)?.id);
    expect(renglones.map((e) => (e.props.evento as { id: string }).id)).toEqual(["acto-1", "acto-2", "acto-3"]);
    expect(renglones.every((e) => e.props.nota === "ya pasó" && !e.props.boton)).toBe(true);
    // El número de actos sigue contándolos todos.
    const heroe = elementos.find((e) => e.type === Heroe)!;
    expect([...recorrer(heroe.props.banda)].find((e) => e.type === Kpi && e.props.etiqueta === "Actos")?.props.valor).toBe(6);
  });

  it("un festival sin actos pasados no lleva «Ya pasó» y su línea es la de siempre", async () => {
    const festival = { ...EVENTO, id: "fest-2", slug: "festival-futuro", clase: "festival", inicio: "2099-01-01T19:00:00Z", fin: "2099-01-04T06:00:00Z" };
    const actos = [{ id: "a", slug: "a", titulo: "A", inicio: "2099-01-01T19:00:00Z", fin: null, zona: "America/Mexico_City", imagen: null, precio: null, lugar_id: null, sitio_texto: "Foro", sitio_reservado: false, visible: true, borrador: false, lugar: null }];
    const elementos = await abrir(festival, actos);
    expect(elementos.some((e) => e.type === "details")).toBe(false);
    expect(elementos.some((e) => e.type === "p" && [e.props.children].flat().join("") === "Programa registrado: 1 actividad")).toBe(true);
  });
});

describe("lo ligado que ya pasó se enlaza y se ve pasado (OL-388, sustituye a OL-380)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });
  /** Un cliente cuya tabla `eventos` responde según lo pedido: la ficha por su slug, y el ligado por su id o (si no es un festival) por `inaugura_id`. */
  const abrir = async (evento: Record<string, unknown>, ligado: Record<string, unknown>) => {
    const cliente = {
      from: (tabla: string) => {
        if (tabla !== "eventos") return chain({ data: tabla === "asistencias" ? [] : null });
        let respuesta: unknown = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = chain({ data: [] });
        c.eq = (columna: string, valor: unknown) => {
          if (columna === "slug" && valor === evento.slug) respuesta = evento;
          if ((columna === "id" && valor === ligado.id) || (columna === "inaugura_id" && ligado.clase !== "festival")) respuesta = ligado;
          return c;
        };
        c.maybeSingle = () => Promise.resolve({ data: respuesta });
        return c;
      },
      rpc: () => Promise.resolve({ data: null }),
    };
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { default: FichaEvento } = await import("./page");
    return [...recorrer(await FichaEvento({ params: Promise.resolve({ id: String(evento.slug) }), searchParams: Promise.resolve({}) }))];
  };
  /** El renglón de lo ligado (`RenglonLigado`) que enlaza a `href`: sus props dicen título, fecha y si está en pasado. */
  const renglonA = (els: { type: unknown; props: Record<string, unknown> }[], href: string) => els.find((e) => e.props?.href === href && "pasado" in e.props)?.props;
  const EXPO = { ...EVENTO, clase: "exposicion", inicio: "2000-01-01T06:00:00Z", fin: "2099-02-01T05:59:00Z", inaugura_id: "inaug-1" };
  const INAUG = { id: "inaug-1", slug: "inauguracion-de-prueba", titulo: "Inauguración de prueba", fin: null, zona: "America/Mexico_City" };

  it("la expo enlaza la inauguración que ya pasó, en pasado: «Fue el …»", async () => {
    const els = await abrir(EXPO, { ...INAUG, inicio: "2000-01-08T02:00:00Z" });
    expect(renglonA(els, "/eventos/inauguracion-de-prueba")).toMatchObject({ titulo: "Inauguración", meta: "Fue el viernes 7 de enero de 2000 · 20:00", pasado: true });
  });

  it("la inauguración que viene, como siempre: su fecha y su enlace, sin nada de pasado", async () => {
    const els = await abrir(EXPO, { ...INAUG, inicio: "2099-01-10T02:00:00Z" });
    const r = renglonA(els, "/eventos/inauguracion-de-prueba");
    expect(r).toMatchObject({ titulo: "Inauguración", pasado: false });
    expect(String(r?.meta).startsWith("Fue el")).toBe(false);
  });

  it("el acto enlaza la exposición que ya cerró, en pasado («Inauguró …», «Cerró el …»); si sigue abierta, como siempre", async () => {
    const acto = { ...EVENTO, clase: "puntual" };
    const cerrada = { id: "expo-1", slug: "expo-cerrada", titulo: "Expo cerrada", inicio: "2000-01-01T06:00:00Z", fin: "2000-02-01T05:59:00Z", zona: "America/Mexico_City" };
    const els = await abrir(acto, cerrada);
    expect(renglonA(els, "/eventos/expo-cerrada")).toMatchObject({ titulo: "Inauguró Expo cerrada", meta: "Exposición · Cerró el lunes 31 de enero de 2000", pasado: true });
    const abierta = await abrir(acto, { ...cerrada, fin: "2099-02-01T05:59:00Z" });
    expect(renglonA(abierta, "/eventos/expo-cerrada")).toMatchObject({ titulo: "Inaugura Expo cerrada", meta: "Exposición", pasado: false });
  });

  it("«Parte de {festival}» enlaza el festival que ya terminó, en pasado; si sigue, como siempre", async () => {
    const acto = { ...EVENTO, clase: "puntual", evento_padre_id: "fest-1" };
    const festival = { id: "fest-1", slug: "festival-de-prueba", titulo: "Festival de prueba", clase: "festival", inicio: "2000-01-01T06:00:00Z", fin: "2000-01-04T05:59:00Z", zona: "America/Mexico_City" };
    const els = await abrir(acto, festival);
    expect(renglonA(els, "/eventos/festival-de-prueba")).toMatchObject({ titulo: "Parte de Festival de prueba", meta: "Festival · Terminó el lunes 3 de enero de 2000", pasado: true });
    const sigue = await abrir(acto, { ...festival, fin: "2099-01-04T05:59:00Z" });
    expect(renglonA(sigue, "/eventos/festival-de-prueba")).toMatchObject({ meta: "Festival", pasado: false });
  });

  it("lo ligado que ya pasó y se canceló (OL-391) dice «Se canceló» en vez de «Fue el …» y va tachado", async () => {
    const els = await abrir(EXPO, { ...INAUG, inicio: "2000-01-08T02:00:00Z", cancelado: true });
    expect(renglonA(els, "/eventos/inauguracion-de-prueba")).toMatchObject({ titulo: "Inauguración", meta: "Se canceló", pasado: true, cancelado: true });
    const acto = { ...EVENTO, clase: "puntual", evento_padre_id: "fest-1" };
    const festival = { id: "fest-1", slug: "festival-de-prueba", titulo: "Festival de prueba", clase: "festival", inicio: "2000-01-01T06:00:00Z", fin: "2000-01-04T05:59:00Z", zona: "America/Mexico_City", cancelado: true };
    expect(renglonA(await abrir(acto, festival), "/eventos/festival-de-prueba")).toMatchObject({ meta: "Festival · Se canceló", cancelado: true });
  });
});

describe("«Quién fue» en la ficha en pasado (OL-388)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });
  const PASADO = { ...EVENTO, inicio: "2000-01-01T19:00:00Z", fin: "2000-01-01T20:00:00Z", borrador: false };
  const persona = (id: string, nombre: string) => ({ usuario_id: id, estado: "voy", perfil: { id, nombre, foto: null } });
  /** La ficha en pasado con estas asistencias; y los bloques diferidos (`KpiVan`, `QuienVaDiferido`), ya resueltos como los pintaría React. */
  const abrir = async (asistencias: unknown[]) => {
    const cliente = clienteFalso({ eventos: { data: PASADO }, asistencias: { data: asistencias } }, { van_por_evento: { data: [{ evento_id: PASADO.id, n: asistencias.length }] } });
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { default: FichaEvento } = await import("./page");
    const els = [...recorrer(await FichaEvento({ params: Promise.resolve({ id: PASADO.slug }), searchParams: Promise.resolve({}) }))];
    const diferido = async (nombre: string) => {
      const e = els.find((x) => typeof x.type === "function" && (x.type as { name?: string }).name === nombre);
      expect(e, nombre).toBeTruthy();
      return (await (e!.type as (p: unknown) => Promise<{ type: unknown; props: Record<string, unknown> } | null>)(e!.props)) ?? null;
    };
    return { els, kpi: await diferido("KpiVan"), quien: await diferido("QuienVaDiferido") };
  };

  it("con gente: «Fueron 2» baja a «Quién fue», la lista de quienes dijeron «Voy», sin invitar a nadie", async () => {
    const { kpi, quien } = await abrir([persona("p1", "Ana"), persona("p2", "Luis")]);
    expect(kpi?.type).toBe(Kpi);
    expect(kpi?.props).toMatchObject({ etiqueta: "Fueron", valor: 2, salto: "quien-va" });
    expect(quien?.props).toMatchObject({ pasado: true, total: 2 });
    expect((quien?.props.van as { nombre: string }[]).map((a) => a.nombre)).toEqual(["Ana", "Luis"]);
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(quien as Parameters<typeof renderToStaticMarkup>[0]);
    expect(html).toContain("<h2>Quién fue</h2>");
    expect(html).toContain('aria-label="Quién fue"');
    expect(html).toContain('id="quien-va"');
    expect(html).not.toContain("Quién va");
    expect(html).not.toContain("primera persona");
    expect(html).toContain("Fueron 2: Ana y Luis");
  });

  it("con nadie: ni el número «Fueron» ni la sección", async () => {
    const { els, kpi, quien } = await abrir([]);
    expect(kpi).toBeNull();
    expect(quien).toBeNull();
    // Mientras llega, tampoco un esqueleto de «Quién va».
    const limite = els.find((e) => e.type === Suspense && (e.props.children as { type?: { name?: string } } | undefined)?.type?.name === "QuienVaDiferido");
    expect(limite).toBeTruthy();
    expect(limite!.props.fallback).toBeNull();
  });

  it("y nada que parezca activo: sin «Voy» / «Me interesa», calendario ni «Cómo llegar»; solo «Compartir»", async () => {
    const { els } = await abrir([persona("p1", "Ana")]);
    expect(els.some((e) => e.type === Asistencia)).toBe(false);
    expect(els.some((e) => e.type === BotonCalendario)).toBe(false);
    expect(els.some((e) => [e.props?.children].flat().includes("Cómo llegar"))).toBe(false);
    expect(els.some((e) => e.type === BotonCompartir)).toBe(true);
  });
});

describe("las otras funciones de lo mismo (OL-385)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });
  /** Un cliente cuya tabla `eventos` da la ficha a `maybeSingle` y los candidatos (mismo sitio) a la lista; anota los filtros de la lista. */
  const abrir = async (evento: Record<string, unknown>, candidatos: Record<string, unknown>[]) => {
    const filtros: string[] = [];
    const cliente = {
      from: (tabla: string) => {
        if (tabla !== "eventos") return chain({ data: tabla === "asistencias" ? [] : null });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = chain({ data: candidatos });
        for (const metodo of ["eq", "neq", "is", "ilike"]) c[metodo] = (...args: unknown[]) => (filtros.push(`${metodo}:${args.join("=")}`), c);
        c.maybeSingle = () => Promise.resolve({ data: evento });
        return c;
      },
      rpc: () => Promise.resolve({ data: null }),
    };
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { default: FichaEvento } = await import("./page");
    const elementos = [...recorrer(await FichaEvento({ params: Promise.resolve({ id: String(evento.slug) }), searchParams: Promise.resolve({}) }))];
    return { elementos, filtros, heroe: elementos.find((e) => e.type === Heroe)!, seccion: elementos.find((e) => e.type === "section" && e.props["aria-label"] === "Otras funciones") };
  };
  const funcion = (id: string, inicio: string, cambios: Record<string, unknown> = {}) => ({ ...EVENTO, id, slug: id, titulo: "Las cosas extraordinarias", lugar_id: "teatro", sitio_texto: null, inicio, creado_en: "2098-12-01T00:00:00Z", clase: "puntual", evento_padre_id: null, ...cambios });
  const segunda = funcion("ext-2", "2099-01-02T02:00:00Z");

  it("con funciones hermanas: «Otras funciones» con una por renglón (mismo título y lugar, sin ella misma) y «Función 2 de 3» en la cabecera", async () => {
    const candidatos = [funcion("ext-1", "2099-01-02T00:00:00Z"), segunda, funcion("ext-3", "2099-01-03T02:00:00Z", { titulo: "LAS COSAS EXTRAORDINARIAS" }), funcion("otra", "2099-01-03T02:00:00Z", { titulo: "Otra obra" })];
    const { seccion, heroe, elementos, filtros } = await abrir(segunda, candidatos);
    expect(seccion).toBeTruthy();
    const lista = elementos.find((e) => e.type === EventosPorDia)!;
    expect((lista.props.eventos as { id: string }[]).map((e) => e.id)).toEqual(["ext-1", "ext-3"]);
    expect(lista.props.sinSitio).toBe(true);
    expect(heroe.props.etiqueta).toBe("Función 2 de 3");
    // Los candidatos son los del mismo lugar, visibles y sin ella misma (la comparación de títulos va en TypeScript).
    expect(filtros).toEqual(expect.arrayContaining(["eq:lugar_id=teatro", "eq:visible=true", "neq:id=ext-2"]));
  });
  it("sin lugar, por el sitio escrito (sin importar mayúsculas, sin comodines) y en su ciudad", async () => {
    const enForo = { ...segunda, lugar_id: null, sitio_texto: "Foro 100%_café" };
    const { filtros } = await abrir(enForo, []);
    expect(filtros).toEqual(expect.arrayContaining(["is:lugar_id=", "eq:ciudad=San Luis Potosí", "ilike:sitio_texto=Foro 100\\%\\_café"]));
  });
  it("sin funciones hermanas la ficha no cambia: ni el bloque ni la etiqueta", async () => {
    const { seccion, heroe } = await abrir(segunda, [funcion("otra", "2099-01-03T02:00:00Z", { titulo: "Otra obra" })]);
    expect(seccion).toBeUndefined();
    expect(heroe.props.etiqueta).toBeUndefined();
  });
});

describe("«Se canceló»: anunciado vs. realizado (OL-391)", () => {
  afterEach(() => { vi.mocked(clienteServidor).mockRestore(); vi.mocked(usuarioActual).mockRestore(); });
  const PASADO = { ...EVENTO, inicio: "2000-01-01T19:00:00Z", fin: "2000-01-01T20:00:00Z", borrador: false };
  /** La ficha de `evento` vista por `quien` (sin sesión, la autora, otra cuenta o la administración); con `actos`, los del programa de un festival. */
  const abrir = async (evento: Record<string, unknown>, quien: { id: string; rol: "usuario" | "admin" } | null = null, actos: Record<string, unknown>[] = []) => {
    const cliente = {
      from: (tabla: string) => {
        if (tabla !== "eventos") return chain({ data: tabla === "asistencias" ? [] : null });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = chain({ data: actos });
        c.maybeSingle = () => Promise.resolve({ data: evento });
        return c;
      },
      rpc: () => Promise.resolve({ data: [{ evento_id: evento.id, n: 2 }] }),
    };
    vi.mocked(clienteServidor).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    vi.mocked(usuarioActual).mockResolvedValue(quien ? { correo: "prueba@example.com", perfil: { id: quien.id, nombre: "Prueba", rol: quien.rol, foto: null, colonia: null, bio: null } } : null);
    const { default: FichaEvento } = await import("./page");
    return [...recorrer(await FichaEvento({ params: Promise.resolve({ id: String(evento.slug) }), searchParams: Promise.resolve({}) }))];
  };
  const fila = async (els: { type: unknown; props: Record<string, unknown> }[]) => {
    const { default: RenglonCancelado } = await import("./MarcarCancelado");
    return els.find((e) => e.type === RenglonCancelado)?.props;
  };
  const AUTORA = { id: "autor-1", rol: "usuario" as const };

  it("el menú «···» ofrece «Se canceló» a la autora de un evento que ya pasó, y marcado, «No se canceló»", async () => {
    expect(await fila(await abrir(PASADO, AUTORA))).toEqual({ eventoId: "evento-1", cancelado: false });
    expect(await fila(await abrir({ ...PASADO, cancelado: true }, AUTORA))).toEqual({ eventoId: "evento-1", cancelado: true });
    // La administración también, aunque no sea suyo.
    expect(await fila(await abrir(PASADO, { id: "admin-1", rol: "admin" }))).toBeTruthy();
  });

  it("no lo ofrece si no ha pasado, a quien no lo gestiona, ni en un borrador u oculto", async () => {
    expect(await fila(await abrir(EVENTO, AUTORA))).toBeUndefined();
    expect(await fila(await abrir(PASADO, { id: "lectora", rol: "usuario" }))).toBeUndefined();
    expect(await fila(await abrir(PASADO, null))).toBeUndefined();
    expect(await fila(await abrir({ ...PASADO, visible: false }, AUTORA))).toBeUndefined();
    expect(await fila(await abrir({ ...PASADO, visible: false, borrador: true }, AUTORA))).toBeUndefined();
  });

  it("quien lo gestiona tiene el aviso con Deshacer en la ficha (fuera del menú); un visitante no", async () => {
    const { AvisoCancelado } = await import("./MarcarCancelado");
    expect((await abrir(PASADO, AUTORA)).some((e) => e.type === AvisoCancelado)).toBe(true);
    expect((await abrir(PASADO, null)).some((e) => e.type === AvisoCancelado)).toBe(false);
  });

  it("la ficha cancelada en pasado: el chip dice «Se canceló» (en rojo) en vez de «Ya pasó», «Era · hora», sin «Fueron» ni «Quién fue», y se comparte", async () => {
    const els = await abrir({ ...PASADO, cancelado: true });
    const heroe = els.find((e) => e.type === Heroe)!;
    expect(heroe.props).toMatchObject({ etiqueta: "Se canceló", cancelado: true });
    expect(els.find((e) => e.type === Kpi)?.props.etiqueta).toMatch(/^Era · /);
    const diferido = async (nombre: string) => {
      const e = els.find((x) => typeof x.type === "function" && (x.type as { name?: string }).name === nombre)!;
      return (e.type as (p: unknown) => Promise<unknown>)(e.props);
    };
    // Aunque dos dijeron «Voy», nadie fue a lo que no ocurrió.
    expect(await diferido("KpiVan")).toBeNull();
    expect(await diferido("QuienVaDiferido")).toBeNull();
    expect(els.some((e) => e.type === BotonCompartir)).toBe(true);
    expect(els.some((e) => e.type === Asistencia)).toBe(false);
  });

  it("sin la marca, la ficha en pasado no cambia: «Ya pasó» y «Fue · hora»", async () => {
    const els = await abrir(PASADO);
    expect(els.find((e) => e.type === Heroe)?.props).toMatchObject({ etiqueta: "Ya pasó", cancelado: false });
    expect(els.find((e) => e.type === Kpi)?.props.etiqueta).toMatch(/^Fue · /);
  });

  it("una marca en algo que no ha pasado no cuenta (la acción no lo deja, pero si llegara): la ficha viva de siempre", async () => {
    const els = await abrir({ ...EVENTO, cancelado: true });
    expect(els.find((e) => e.type === Heroe)?.props.etiqueta).toBeUndefined();
    expect(els.some((e) => e.type === Asistencia)).toBe(true);
  });

  it("el título de la pestaña dice «Se canceló»", async () => {
    vi.mocked(clienteServidor).mockResolvedValue(clienteFalso({ eventos: { data: { ...PASADO, cancelado: true } } }) as unknown as Awaited<ReturnType<typeof clienteServidor>>);
    const { generateMetadata } = await import("./page");
    const meta = await generateMetadata({ params: Promise.resolve({ id: PASADO.slug }) });
    expect(meta.title).toBe("Evento de prueba · Se canceló · Somos Nosotros");
    expect(meta.description).toMatch(/^Se canceló: era el /);
    expect(meta.openGraph).toBeUndefined();
  });

  it("en el «Ya pasó» del festival, el acto cancelado lleva la etiqueta (`cancelado`) y los demás no", async () => {
    const festival = { ...EVENTO, id: "fest-1", slug: "festival-de-prueba", clase: "festival", inicio: "2000-01-01T19:00:00Z", fin: "2099-01-04T06:00:00Z" };
    const acto = (n: number, cancelado = false) => ({ id: `acto-${n}`, slug: `acto-${n}`, titulo: `Acto ${n}`, inicio: `2000-01-0${n}T19:00:00Z`, fin: null, zona: "America/Mexico_City", imagen: null, precio: null, lugar_id: null, sitio_texto: "Foro", sitio_reservado: false, visible: true, borrador: false, cancelado, lugar: null });
    const els = await abrir(festival, null, [acto(1), acto(2, true)]);
    const dentro = [...recorrer(els.find((e) => e.type === "details"))];
    const renglones = dentro.filter((e) => (e.props?.evento as { id?: string } | undefined)?.id);
    expect(renglones.map((e) => [(e.props.evento as { id: string }).id, e.props.cancelado])).toEqual([
      ["acto-1", false],
      ["acto-2", true],
    ]);
  });
});
