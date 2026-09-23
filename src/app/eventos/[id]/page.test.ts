import { describe, expect, it, vi } from "vitest";
import { Suspense } from "react";

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
  it("el árbol inicial trae el título, el JSON-LD y deja «quién va» en Suspense", async () => {
    const { default: FichaEvento } = await import("./page");
    const arbol = await FichaEvento({ params: Promise.resolve({ id: "evento-de-prueba" }), searchParams: Promise.resolve({}) });
    const elementos = [...recorrer(arbol)];

    const h1 = elementos.find((e) => e.type === "h1");
    expect(h1?.props?.children).toBe("Evento de prueba");

    const jsonLd = elementos.find((e) => e.type === "script" && e.props?.type === "application/ld+json");
    expect(jsonLd).toBeTruthy();
    const datos = JSON.parse((jsonLd!.props.dangerouslySetInnerHTML as { __html: string }).__html);
    expect(datos["@type"]).toBe("Event");
    expect(datos.name).toBe("Evento de prueba");

    // "Con quién" + "Van N personas" (un solo Suspense en la lista de datos) y la sección "Quién va": dos límites.
    const suspenses = elementos.filter((e) => e.type === Suspense);
    expect(suspenses.length).toBe(2);
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
