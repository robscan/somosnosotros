import { createElement, isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import BotonCompartir from "@/components/BotonCompartir";
import FichaPersona from "@/components/FichaPersona";
import { TEXTO_INVITAR } from "@/lib/perfil";

/**
 * «Invitar a tus amigxs» (OL-416; founder, 2026-10-19): el renglón para compartir la app se mudó de Ajustes a Mi perfil. Sale en el perfil propio,
 * bajo la cabecera y antes de «Mis artistas» y de la actividad; nunca en la ficha de otra persona (ni en la propia vista como la ve la gente) y ya
 * no en Ajustes. Se llaman las páginas y se recorre el árbol de elementos sin pintarlo; `FichaPersona` (síncrona) se llama a mano para ver lo que
 * pinta.
 */

const m = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  rol: "usuario",
  yo: { id: "p-1", nombre: "Marcos", foto: null, colonia: "Centro", bio: "Toco el bajo.", rol: "usuario", reservado: false, avisos_correo: false },
  otra: { id: "p-2", nombre: "Ana", foto: null, colonia: "Tequis", bio: "Pinto murales.", rol: "usuario", reservado: false },
}));
vi.mock("next/navigation", () => ({
  redirect: m.redirect,
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioActual: vi.fn(async () => ({ correo: "marcos@example.com", perfil: { ...m.yo, rol: m.rol } })),
  clienteServidor: vi.fn(async () => ({})),
}));
vi.mock("@/app/personas/consultas", () => ({
  cargarPersona: vi.fn(async (id: string) => ({ perfil: id === m.otra.id ? m.otra : m.yo, eventos: [], interesan: [], lugares: [], artistas: [] })),
  relacionDe: vi.fn(() => ({ decididas: {}, seguidos: [] })),
  estaBloqueada: vi.fn(async () => false),
}));
vi.mock("@/app/artistas/consultas", () => ({ cargarMisArtistas: vi.fn(async () => []) }));
vi.mock("@/lib/cargarTuAnio", () => ({ cargarPasadosPersona: vi.fn(async () => []) }));
vi.mock("@/app/eventos/acciones", () => ({ cupoDeCartel: vi.fn(async () => null) }));
vi.mock("@/lib/cartel", () => ({ lecturaDeCartelActiva: vi.fn(() => false) }));
vi.mock("@/app/admin/consultas", () => ({ contarPendientes: vi.fn(async () => 0) }));
vi.mock("@/app/perfil/acciones", () => ({ borrarMiCuenta: vi.fn() }));

type El = ReactElement<Record<string, unknown>>;
type PropsFicha = Parameters<typeof FichaPersona>[0];

/** Todos los elementos del árbol en orden de documento, también los que van en otra prop (como `invitar`); sin pintar componentes. */
function* recorrer(nodo: unknown): Generator<El> {
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) yield* recorrer(hijo);
    return;
  }
  if (isValidElement(nodo)) {
    const el = nodo as El;
    yield el;
    for (const [clave, valor] of Object.entries(el.props)) if (clave !== "children" && isValidElement(valor)) yield* recorrer(valor);
    yield* recorrer(el.props.children);
  }
}
/** El texto de un árbol, pegado. */
function texto(nodo: unknown): string {
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(texto).join("");
  if (isValidElement(nodo)) return texto((nodo as El).props.children);
  return "";
}
/** Un renglón de invitar armado a mano, para probar `FichaPersona` sola. */
const renglonInvitar = () => createElement(BotonCompartir, { titulo: "Somos Nosotros", texto: TEXTO_INVITAR, url: "https://somosnosotros.org", className: "x", children: "Invitar a tus amigxs" });
const esInvitar = (e: El) => e.type === BotonCompartir && e.props.texto === TEXTO_INVITAR;
/** La ficha de persona que lleva la página: sus props y lo que pinta. */
function fichaDe(arbol: unknown) {
  const ficha = [...recorrer(arbol)].find((e) => e.type === FichaPersona);
  if (!ficha) throw new Error("la página no lleva FichaPersona");
  const props = ficha.props as unknown as PropsFicha;
  return { props, pinta: [...recorrer(FichaPersona(props))] };
}

describe("«Invitar a tus amigxs» en Mi perfil (OL-416)", () => {
  it("Mi perfil lo lleva: comparte la app (TEXTO_INVITAR y el enlace del sitio) con el texto «Invitar a tus amigxs»", async () => {
    const { default: PaginaPerfil } = await import("./page");
    const { props, pinta } = fichaDe(await PaginaPerfil());
    expect(props.mia).toBe(true);
    const invitar = pinta.filter(esInvitar);
    expect(invitar).toHaveLength(1);
    expect(invitar[0].props).toMatchObject({ titulo: "Somos Nosotros", url: "https://somosnosotros.org" });
    expect(texto(invitar[0])).toBe("Invitar a tus amigxsSe comparte el enlace del sitio");
  });

  it("va bajo la cabecera (nombre y sobre mí) y antes de la actividad (Voy · Interesan · Sigo)", async () => {
    const { default: PaginaPerfil } = await import("./page");
    const { pinta } = fichaDe(await PaginaPerfil());
    const nombre = pinta.findIndex((e) => e.type === "h1");
    const sobreMi = pinta.findIndex((e) => e.type === "p" && texto(e) === m.yo.bio);
    const invitar = pinta.findIndex(esInvitar);
    const actividad = pinta.findIndex((e) => typeof e.type === "function" && e.type.name === "ActividadPersona");
    expect(nombre).toBeGreaterThanOrEqual(0);
    expect(sobreMi).toBeGreaterThan(nombre);
    expect(invitar).toBeGreaterThan(sobreMi);
    expect(actividad).toBeGreaterThan(invitar);
  });

  it("con «Mis artistas», va antes de ellos", () => {
    const misArtistas = createElement("section", { id: "mis-artistas" });
    const renglon = renglonInvitar();
    const pinta = [...recorrer(FichaPersona({ perfil: m.yo as never, mia: true, eventos: [], lugares: [], artistas: [], gestos: null, origen: "https://somosnosotros.org", invitar: renglon, misArtistas }))];
    expect(pinta.findIndex(esInvitar)).toBeGreaterThanOrEqual(0);
    expect(pinta.findIndex((e) => e.props.id === "mis-artistas")).toBeGreaterThan(pinta.findIndex(esInvitar));
  });

  it("la ficha de otra persona no lo lleva", async () => {
    const { default: PaginaPersona } = await import("@/app/personas/[id]/page");
    const { props, pinta } = fichaDe(await PaginaPersona({ params: Promise.resolve({ id: m.otra.id }) }));
    expect(props.mia).toBe(false);
    expect(props.invitar).toBeUndefined();
    expect(pinta.filter(esInvitar)).toHaveLength(0);
    expect(pinta.map(texto).join(" ")).not.toContain("amigxs");
  });

  it("la propia ficha vista como la ve la gente («Así te ve la gente») tampoco", async () => {
    const { default: PaginaPersona } = await import("@/app/personas/[id]/page");
    const { props, pinta } = fichaDe(await PaginaPersona({ params: Promise.resolve({ id: m.yo.id }) }));
    expect(props.mia).toBe(false);
    expect(pinta.filter(esInvitar)).toHaveLength(0);
  });

  it("aunque se lo pasen, una ficha que no es la mía no lo pinta", () => {
    const renglon = renglonInvitar();
    const pinta = [...recorrer(FichaPersona({ perfil: m.otra as never, mia: false, eventos: [], lugares: [], artistas: [], gestos: null, origen: "https://somosnosotros.org", invitar: renglon }))];
    expect(pinta.filter(esInvitar)).toHaveLength(0);
  });

  it("Ajustes ya no lo lleva (tampoco con cuenta de administración) y su grupo «Somos Nosotros» sigue", async () => {
    const { default: Ajustes } = await import("@/app/ajustes/page");
    try {
      for (const rol of ["usuario", "admin"]) {
        m.rol = rol;
        const arbol = [...recorrer(await Ajustes({ searchParams: Promise.resolve({}) }))];
        expect(arbol.filter((e) => e.type === BotonCompartir)).toHaveLength(0);
        expect(arbol.map(texto).join(" ")).not.toMatch(/Invita|amistades|amigxs/);
        expect(arbol.some((e) => e.type === "h2" && texto(e) === "Somos Nosotros")).toBe(true);
        if (rol === "admin") expect(arbol.some((e) => e.props.href === "/admin")).toBe(true);
      }
    } finally {
      m.rol = "usuario";
    }
  });
});
