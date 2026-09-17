import { describe, expect, it } from "vitest";
import { conMarca, hayPantallaAnterior, leerDesde, leerMarca, marcaAlApilar, marcaAlReemplazar, marcaDeLlegada, ponerMarca, rutaDe, vuelveA, type Historial } from "./historial";

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
const instalar = (h: HistorialDePrueba, llegada = 0) => ponerMarca(h, llegada, () => h.url);
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
  it("pone la marca y la pantalla de detrás sin tocar lo de Next.js", () => {
    expect(conMarca({ __NA: true, arbol: "x" }, 2)).toEqual({ __NA: true, arbol: "x", somosnosotros: 2 });
    expect(conMarca(null, 0)).toEqual({ somosnosotros: 0 });
    expect(conMarca({ __NA: true }, 1, "/lugares?tipo=museo")).toEqual({ __NA: true, somosnosotros: 1, somosnosotrosDesde: "/lugares?tipo=museo" });
    expect(conMarca({ somosnosotrosDesde: "/viejo" }, 0)).toEqual({ somosnosotros: 0 });
    expect(leerDesde({ somosnosotrosDesde: "/lugares/1" })).toBe("/lugares/1");
    expect(leerDesde({ somosnosotrosDesde: "https://otro.sitio/" })).toBeNull();
    expect(leerDesde(null)).toBeNull();
  });
  it("apilar suma una; reemplazar conserva la de la entrada", () => {
    expect(marcaAlApilar(null)).toBe(1);
    expect(marcaAlApilar(2)).toBe(3);
    expect(marcaAlReemplazar(2, null)).toBe(2);
    expect(marcaAlReemplazar(null, 4)).toBe(4);
    expect(marcaAlReemplazar(null, null)).toBe(0);
  });
  it("al llegar sin marca, hay una pantalla detrás solo si la trajo un enlace del mismo sitio y el historial tiene de dónde", () => {
    expect(marcaDeLlegada("", "https://somosnosotros.org", 3)).toBe(0);
    expect(marcaDeLlegada("https://l.instagram.com/?u=x", "https://somosnosotros.org", 3)).toBe(0);
    expect(marcaDeLlegada("https://somosnosotros.org/entrar", "https://somosnosotros.org", 3)).toBe(1);
    expect(marcaDeLlegada("no es una url", "https://somosnosotros.org", 3)).toBe(0);
    // Pestaña nueva abierta desde la app (Cmd+clic, "abrir en pestaña nueva"): trae el referente, pero nada detrás.
    expect(marcaDeLlegada("https://somosnosotros.org/lugares", "https://somosnosotros.org", 1)).toBe(0);
  });
  it("Atrás vuelve con el historial solo con una pantalla detrás y un historial con de dónde", () => {
    expect(hayPantallaAnterior(null, 5)).toBe(false);
    expect(hayPantallaAnterior(0, 5)).toBe(false);
    expect(hayPantallaAnterior(1, 1)).toBe(false);
    expect(hayPantallaAnterior(1, 2)).toBe(true);
  });
  it("terminar una tarea vuelve solo a la misma ruta que tiene detrás", () => {
    expect(rutaDe("/eventos/1?accion=voy#quien-va")).toBe("/eventos/1");
    const estado = { somosnosotros: 2, somosnosotrosDesde: "/lugares/7" };
    expect(vuelveA(estado, 3, "/lugares/7")).toBe(true);
    expect(vuelveA(estado, 3, "/lugares/7?accion=seguir")).toBe(true);
    expect(vuelveA(estado, 3, "/lugares/8")).toBe(false);
    expect(vuelveA({ somosnosotros: 0, somosnosotrosDesde: "/lugares/7" }, 3, "/lugares/7")).toBe(false);
    expect(vuelveA({ somosnosotros: 1 }, 3, "/lugares/7")).toBe(false); // llegó por carga completa: no se sabe de dónde
  });
});

describe("marca de navegación: sobre un historial", () => {
  it("enlace compartido a una ficha: Atrás va a la pantalla madre, también tras ir y volver (el hallazgo de OL-050)", () => {
    const h = new HistorialDePrueba("/eventos/1");
    instalar(h, marcaDeLlegada("", "https://somosnosotros.org", 1));
    next.reemplazar(h, "/eventos/1"); // Next.js arranca
    expect(atrasVuelve(h)).toBe(false);
    next.apilar(h, "/lugares/2");
    expect(atrasVuelve(h)).toBe(true);
    next.volver(h);
    expect(h.url).toBe("/eventos/1");
    expect(h.length).toBe(2); // history.length diría que hay a dónde volver…
    expect(atrasVuelve(h)).toBe(false); // …pero es la primera entrada: a la pantalla madre
  });
  it("un refresco o un filtro no borran la marca ni la pantalla de detrás", () => {
    const h = new HistorialDePrueba("/lugares");
    instalar(h);
    next.apilar(h, "/lugares/2");
    next.reemplazar(h, "/lugares/2"); // Voy, Seguir: revalidatePath refresca
    expect(leerMarca(h.state)).toBe(1);
    expect(leerDesde(h.state)).toBe("/lugares");
    next.apilar(h, "/artistas?hace=musica");
    next.reemplazar(h, "/artistas?hace=teatro"); // chip de filtro
    next.reemplazar(h, "/artistas?hace=teatro&n=48"); // "Ver más"
    expect(leerMarca(h.state)).toBe(2);
    expect(leerDesde(h.state)).toBe("/lugares/2");
    expect(atrasVuelve(h)).toBe(true);
    next.volver(h);
    expect(leerMarca(h.state)).toBe(1);
    next.volver(h);
    expect(atrasVuelve(h)).toBe(false);
  });
  it("editar desde la ficha: al guardar se puede volver a ella; publicar algo nuevo, no", () => {
    const h = new HistorialDePrueba("/lugares");
    instalar(h);
    next.apilar(h, "/lugares/7");
    next.apilar(h, "/lugares/7/editar");
    expect(vuelveA(h.state, h.length, "/lugares/7")).toBe(true);
    next.volver(h);
    next.apilar(h, "/eventos/nuevo?lugar=7");
    expect(vuelveA(h.state, h.length, "/eventos/9?nuevo=1")).toBe(false);
  });
  it("salir a la pantalla madre reemplaza: la entrada sigue siendo la primera", () => {
    const h = new HistorialDePrueba("/artistas/9");
    instalar(h);
    next.reemplazar(h, "/artistas");
    expect(h.length).toBe(1);
    expect(atrasVuelve(h)).toBe(false);
  });
  it("una carga completa desde otra pantalla de la app conserva la vuelta; una recarga conserva la marca", () => {
    const h = new HistorialDePrueba("/reglas");
    h.entradas.unshift({ estado: { somosnosotros: 3 }, url: "/entrar" });
    h.i = 1;
    instalar(h, marcaDeLlegada("https://somosnosotros.org/entrar", "https://somosnosotros.org", h.length));
    expect(atrasVuelve(h)).toBe(true);
    const recargada = new HistorialDePrueba("/eventos/1", { __NA: true, somosnosotros: 4, somosnosotrosDesde: "/" });
    instalar(recargada);
    expect(leerMarca(recargada.state)).toBe(4);
    expect(leerDesde(recargada.state)).toBe("/");
  });
  it("pestaña nueva abierta desde la app: tras apilar y volver, Atrás no se queda sin salida", () => {
    const h = new HistorialDePrueba("/lugares/3");
    instalar(h, marcaDeLlegada("https://somosnosotros.org/lugares", "https://somosnosotros.org", h.length));
    next.apilar(h, "/eventos/4");
    next.volver(h);
    expect(h.length).toBe(2);
    expect(atrasVuelve(h)).toBe(false);
  });
  it("envolver dos veces da las mismas marcas", () => {
    const h = new HistorialDePrueba("/");
    instalar(h);
    instalar(h);
    next.apilar(h, "/eventos/1");
    next.reemplazar(h, "/eventos/1");
    next.apilar(h, "/lugares/2");
    expect(h.entradas.map((e) => [leerMarca(e.estado), leerDesde(e.estado)])).toEqual([
      [0, null],
      [1, "/"],
      [2, "/eventos/1"],
    ]);
  });
});
