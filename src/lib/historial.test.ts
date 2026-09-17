import { describe, expect, it } from "vitest";
import { conMarca, hayPantallaAnterior, leerMarca, marcaAlApilar, marcaAlReemplazar, marcaDeLlegada, ponerMarca, type Historial } from "./historial";

/** Un historial de navegador de mentira: entradas con estado y URL, apilar corta las de adelante, atrás y adelante. */
class HistorialDePrueba implements Historial {
  entradas: { estado: unknown; url: string }[];
  i = 0;
  constructor(url: string, estado: unknown = null) {
    this.entradas = [{ estado, url }];
  }
  get state() {
    return this.entradas[this.i].estado;
  }
  get length() {
    return this.entradas.length;
  }
  get url() {
    return this.entradas[this.i].url;
  }
  pushState(estado: unknown, _titulo: string, url?: string | URL | null) {
    this.entradas.splice(this.i + 1);
    this.entradas.push({ estado: structuredClone(estado), url: String(url ?? this.url) });
    this.i++;
  }
  replaceState(estado: unknown, _titulo: string, url?: string | URL | null) {
    this.entradas[this.i] = { estado: structuredClone(estado), url: String(url ?? this.url) };
  }
  back() {
    if (this.i > 0) this.i--;
  }
}

/** Lo que hace Next.js: al navegar o refrescar escribe su estado sin conservar lo ajeno; al volver, lo conserva. */
const next = {
  apilar: (h: Historial, url: string) => h.pushState({ __NA: true, arbol: url }, "", url),
  reemplazar: (h: Historial, url: string) => h.replaceState({ __NA: true, arbol: url }, "", url),
  volver: (h: HistorialDePrueba) => {
    h.back();
    h.replaceState({ ...(h.state as object), __NA: true, arbol: h.url }, "", h.url);
  },
};
const atrasVuelve = (h: HistorialDePrueba) => hayPantallaAnterior(leerMarca(h.state), h.length);

describe("marca de navegación: la lógica", () => {
  it("lee solo marcas válidas", () => {
    expect(leerMarca(null)).toBeNull();
    expect(leerMarca("x")).toBeNull();
    expect(leerMarca({ __NA: true })).toBeNull();
    expect(leerMarca({ somosnosotros: -1 })).toBeNull();
    expect(leerMarca({ somosnosotros: 1.5 })).toBeNull();
    expect(leerMarca({ somosnosotros: "2" })).toBeNull();
    expect(leerMarca({ somosnosotros: 0 })).toBe(0);
    expect(leerMarca({ somosnosotros: 3, __NA: true })).toBe(3);
  });
  it("pone la marca sin tocar lo de Next.js", () => {
    expect(conMarca({ __NA: true, arbol: "x" }, 2)).toEqual({ __NA: true, arbol: "x", somosnosotros: 2 });
    expect(conMarca(null, 0)).toEqual({ somosnosotros: 0 });
  });
  it("apilar suma una; reemplazar conserva la de la entrada", () => {
    expect(marcaAlApilar(null)).toBe(1);
    expect(marcaAlApilar(2)).toBe(3);
    expect(marcaAlReemplazar(2, null)).toBe(2);
    expect(marcaAlReemplazar(null, 4)).toBe(4);
    expect(marcaAlReemplazar(null, null)).toBe(0);
  });
  it("al llegar sin marca, hay una pantalla detrás solo si la trajo un enlace del mismo sitio", () => {
    expect(marcaDeLlegada("", "https://somosnosotros.org")).toBe(0);
    expect(marcaDeLlegada("https://l.instagram.com/?u=x", "https://somosnosotros.org")).toBe(0);
    expect(marcaDeLlegada("https://somosnosotros.org/entrar", "https://somosnosotros.org")).toBe(1);
    expect(marcaDeLlegada("no es una url", "https://somosnosotros.org")).toBe(0);
  });
  it("Atrás vuelve con el historial solo con una pantalla detrás y un historial con de dónde", () => {
    expect(hayPantallaAnterior(null, 5)).toBe(false);
    expect(hayPantallaAnterior(0, 5)).toBe(false);
    expect(hayPantallaAnterior(1, 1)).toBe(false); // pestaña nueva abierta desde la app: el referente engaña
    expect(hayPantallaAnterior(1, 2)).toBe(true);
  });
});

describe("marca de navegación: sobre un historial", () => {
  it("enlace compartido a una ficha: Atrás va a la pantalla madre, también tras ir y volver (el hallazgo de OL-050)", () => {
    const h = new HistorialDePrueba("/eventos/1");
    ponerMarca(h, marcaDeLlegada("", "https://somosnosotros.org"));
    next.reemplazar(h, "/eventos/1"); // Next.js arranca
    expect(atrasVuelve(h)).toBe(false);
    next.apilar(h, "/lugares/2");
    expect(atrasVuelve(h)).toBe(true);
    next.volver(h);
    expect(h.url).toBe("/eventos/1");
    expect(h.length).toBe(2); // history.length diría que hay a dónde volver…
    expect(atrasVuelve(h)).toBe(false); // …pero es la primera entrada: a la pantalla madre
  });
  it("un refresco o un filtro no borran la marca de la entrada", () => {
    const h = new HistorialDePrueba("/lugares");
    ponerMarca(h, 0);
    next.apilar(h, "/lugares/2");
    next.reemplazar(h, "/lugares/2"); // Voy, Seguir: revalidatePath refresca
    expect(leerMarca(h.state)).toBe(1);
    next.apilar(h, "/artistas?hace=musica");
    next.reemplazar(h, "/artistas?hace=teatro"); // chip de filtro
    next.reemplazar(h, "/artistas?hace=teatro&n=48"); // "Ver más"
    expect(leerMarca(h.state)).toBe(2);
    expect(atrasVuelve(h)).toBe(true);
    next.volver(h);
    expect(leerMarca(h.state)).toBe(1);
    next.volver(h);
    expect(atrasVuelve(h)).toBe(false);
  });
  it("salir a la pantalla madre reemplaza: la entrada sigue siendo la primera", () => {
    const h = new HistorialDePrueba("/artistas/9");
    ponerMarca(h, 0);
    next.reemplazar(h, "/artistas");
    expect(h.length).toBe(1);
    expect(atrasVuelve(h)).toBe(false);
  });
  it("una carga completa desde otra pantalla de la app conserva la vuelta; una recarga conserva la marca", () => {
    const h = new HistorialDePrueba("/reglas");
    h.entradas.unshift({ estado: { somosnosotros: 3 }, url: "/entrar" });
    h.i = 1;
    ponerMarca(h, marcaDeLlegada("https://somosnosotros.org/entrar", "https://somosnosotros.org"));
    expect(atrasVuelve(h)).toBe(true);
    const recargada = new HistorialDePrueba("/eventos/1", { __NA: true, somosnosotros: 4 });
    ponerMarca(recargada, 0);
    expect(leerMarca(recargada.state)).toBe(4);
  });
  it("envolver dos veces da las mismas marcas", () => {
    const h = new HistorialDePrueba("/");
    ponerMarca(h, 0);
    ponerMarca(h, 0);
    next.apilar(h, "/eventos/1");
    next.reemplazar(h, "/eventos/1");
    next.apilar(h, "/lugares/2");
    expect(h.entradas.map((e) => leerMarca(e.estado))).toEqual([0, 1, 2]);
  });
});
