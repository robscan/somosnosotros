import { afterEach, describe, expect, it, vi } from "vitest";
import { Suspense } from "react";
import Heroe from "@/components/ui/Heroe";
import { Kpi } from "@/components/ui/Kpi";
import BotonCalendario from "@/components/BotonCalendario";
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

  const preparar = (privado: boolean, sesion = true, autor = false, reservado = true) => {
    const upsert = vi.fn();
    const evento = { ...EVENTO, inicio: "2000-01-01T19:00:00Z", fin: "2000-01-01T20:00:00Z", sitio_reservado: reservado };
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
  it("sin asistentes, el bloque diferido no invita a registrarse para un evento terminado", async () => {
    preparar(true);
    const diferido = [...recorrer(await ficha())].find(e => typeof e.type === "function" && e.props.consultaTrasFin === true);
    expect(diferido).toBeTruthy();
    const componente = diferido!.type as (props: Record<string, unknown>) => Promise<unknown>;
    const elementos = [...recorrer(await componente(diferido!.props))];
    expect(elementos.find(e => e.type === "p")?.props.children).toBe("Nadie confirmó asistencia.");
  });
  it.each([
    [false, true, true], // ventana vencida/revocada: RLS no devuelve fila.
    [false, false, true], // anónimo.
    [true, false, true], // ni una respuesta privada inesperada sustituye la sesión.
    [false, true, false], // evento ordinario pasado.
  ])("sin acceso reservado vigente conserva 404: %j", async (privado, sesion, reservado) => {
    preparar(privado, sesion, false, reservado);
    await expect(ficha()).rejects.toThrow("NOT_FOUND");
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
    expect(kpis).toEqual(["Hasta", "Abre", "Costo"]);
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
