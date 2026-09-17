import { describe, expect, it } from "vitest";
import { APUNTE_VUELTA, apuntarVuelta, conMarca, desdeElReferente, hayPantallaAnterior, leerDesde, leerMarca, leerVuelta, marcaAlApilar, marcaAlReemplazar, marcaDeLlegada, ponerMarca, reponerPantallaAnterior, rutaDe, vuelveA, type Almacen, type Historial } from "./historial";

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

/** El almacén de la pestaña, de mentira. */
class AlmacenDePrueba implements Almacen {
  datos = new Map<string, string>();
  getItem(k: string) {
    return this.datos.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v);
  }
  removeItem(k: string) {
    this.datos.delete(k);
  }
}

const conApunte = (apunte: unknown) => {
  const a = new AlmacenDePrueba();
  a.setItem(APUNTE_VUELTA, JSON.stringify(apunte));
  return a;
};

describe("volver de entrar con Apple o Google (OL-069)", () => {
  it("el relevo del proveedor no cuenta como pantalla de la app detrás", () => {
    const origen = "https://somosnosotros.org";
    // Detrás de la llegada está la pantalla del proveedor, aunque el referente sea del sitio.
    expect(marcaDeLlegada(`${origen}/auth/google`, origen, 4)).toBe(0);
    expect(marcaDeLlegada(`${origen}/auth/apple`, origen, 4)).toBe(0);
    expect(marcaDeLlegada(`${origen}/auth/callback?siguiente=/perfil`, origen, 4)).toBe(0);
    expect(marcaDeLlegada(`${origen}/auth`, origen, 4)).toBe(0);
    // Una pantalla de la app sigue contando, incluso si su ruta empieza parecido.
    expect(marcaDeLlegada(`${origen}/entrar`, origen, 4)).toBe(1);
    expect(marcaDeLlegada(`${origen}/authores`, origen, 4)).toBe(1);
  });
  it("sin marca en la entrada, de dónde se vino lo dice el referente", () => {
    const origen = "https://somosnosotros.org";
    // Llegada a Entrar con una carga completa (el toque llegó antes que el JavaScript, o es un enlace compartido).
    expect(desdeElReferente(`${origen}/lugares?ciudad=slp`, origen, "/entrar")).toBe("/lugares?ciudad=slp");
    // No cuenta: de fuera, de la vuelta de un proveedor, de esta misma pantalla (una recarga), o sin referente.
    expect(desdeElReferente("https://www.google.com/", origen, "/entrar")).toBeNull();
    expect(desdeElReferente(`${origen}/auth/google`, origen, "/entrar")).toBeNull();
    expect(desdeElReferente(`${origen}/entrar?siguiente=/perfil`, origen, "/entrar")).toBeNull();
    expect(desdeElReferente("", origen, "/entrar")).toBeNull();
    expect(desdeElReferente("no es una url", origen, "/entrar")).toBeNull();
  });
  it("el apunte sirve una sola vez, caduca y solo vale para la vuelta que esperaba", () => {
    const bueno = { desde: "/lugares?ciudad=slp", siguiente: "/perfil", cuando: 1000 };
    const a = conApunte(bueno);
    expect(leerVuelta(a, "/perfil", 2000)).toBe("/lugares?ciudad=slp");
    expect(a.getItem(APUNTE_VUELTA)).toBeNull(); // se borra al leerlo
    expect(leerVuelta(a, "/perfil", 2000)).toBeNull();
    // Caducado (más de 10 minutos) o con la hora movida hacia atrás.
    expect(leerVuelta(conApunte(bueno), "/perfil", 1000 + 600_001)).toBeNull();
    expect(leerVuelta(conApunte({ ...bueno, cuando: 500_000 }), "/perfil", 1000)).toBeNull();
    // Otra carga: el proveedor falló y volvió a Entrar, o la persona fue a otro sitio.
    expect(leerVuelta(conApunte(bueno), "/entrar?siguiente=/perfil&error=google", 2000)).toBeNull();
    // Sin apunte, ilegible o incompleto: Atrás hace lo de siempre.
    expect(leerVuelta(new AlmacenDePrueba(), "/perfil", 2000)).toBeNull();
    expect(leerVuelta(null, "/perfil", 2000)).toBeNull();
    const roto = new AlmacenDePrueba();
    roto.setItem(APUNTE_VUELTA, "{no es json");
    expect(leerVuelta(roto, "/perfil", 2000)).toBeNull();
    expect(leerVuelta(conApunte({ siguiente: "/perfil", cuando: 1000 }), "/perfil", 2000)).toBeNull();
  });
  it("el apunte no puede mandar a la persona fuera del sitio", () => {
    const fuera = (desde: string) => leerVuelta(conApunte({ desde, siguiente: "/perfil", cuando: 1000 }), "/perfil", 2000);
    expect(fuera("https://otro.sitio/robo")).toBe("/");
    expect(fuera("http://otro.sitio/robo")).toBe("/");
    expect(fuera("//otro.sitio/robo")).toBe("/");
    expect(fuera("/\\otro.sitio")).toBe("/");
    expect(fuera("javascript:alert(1)")).toBe("/");
    expect(fuera("")).toBe("/");
    // Con espacios o saltos de línea delante, para colarse por delante de la comprobación.
    expect(fuera(" //otro.sitio")).toBe("/");
    expect(fuera("\n//otro.sitio")).toBe("/");
    expect(fuera("\t//otro.sitio")).toBe("/");
    expect(fuera("\nhttps://otro.sitio")).toBe("/");
    expect(fuera(" /lugares")).toBe("/");
    // Y lo que sí es una ruta del sitio pasa entera, con su consulta y su ancla.
    expect(fuera("/lugares/7")).toBe("/lugares/7");
    expect(fuera("/artistas?hace=musica#fechas")).toBe("/artistas?hace=musica#fechas");
  });
  it("sin almacén, con el almacén bloqueado o sin apunte, el historial se queda como estaba", () => {
    // Modo privado o almacenamiento negado: el navegador lanza al leer o al escribir.
    const bloqueado: Almacen = {
      getItem() {
        throw new Error("bloqueado");
      },
      setItem() {
        throw new Error("bloqueado");
      },
      removeItem() {
        throw new Error("bloqueado");
      },
    };
    expect(() => apuntarVuelta(bloqueado, { desde: "/lugares", siguiente: "/perfil", cuando: 1000 })).not.toThrow();
    expect(leerVuelta(bloqueado, "/perfil", 2000)).toBeNull();
    const h = new HistorialDePrueba("/perfil");
    instalar(h);
    const antes = structuredClone(h.entradas);
    expect(reponerPantallaAnterior(h, bloqueado, "/perfil", 2000)).toBeNull();
    expect(reponerPantallaAnterior(h, null, "/perfil", 2000)).toBeNull();
    expect(h.entradas).toEqual(antes);
    // Y Atrás sigue decidiendo con la marca de siempre.
    expect(atrasVuelve(h)).toBe(false);
  });
  it("lo apuntado por Entrar es lo que lee la vuelta", () => {
    const a = new AlmacenDePrueba();
    apuntarVuelta(a, { desde: "/artistas", siguiente: "/eventos/1?accion=voy", cuando: 1000 });
    expect(leerVuelta(a, "/eventos/1?accion=voy", 1500)).toBe("/artistas");
    expect(() => apuntarVuelta(null, { desde: "/x", siguiente: "/y", cuando: 1 })).not.toThrow();
  });
  it("Atrás vuelve a la pantalla de la que se vino, no a la del proveedor", () => {
    // El historial tal como queda medido: la pantalla del proveedor y, encima, el destino. El relevo no deja entrada
    // propia (se reenvía antes de cargar del todo), así que el proveedor queda pegado detrás.
    const h = new HistorialDePrueba("https://accounts.google.com/o/oauth2/v2/auth");
    h.pushState(null, "", "/perfil");
    instalar(h, marcaDeLlegada("https://somosnosotros.org/auth/google", "https://somosnosotros.org", h.length));
    expect(atrasVuelve(h)).toBe(false); // sin la reposición, Atrás iría a la pantalla madre
    expect(reponerPantallaAnterior(h, conApunte({ desde: "/artistas?hace=musica", siguiente: "/perfil", cuando: 1000 }), "/perfil", 2000)).toBe("/artistas?hace=musica");
    next.reemplazar(h, "/perfil"); // Next.js arranca sobre el destino
    expect(h.url).toBe("/perfil");
    expect(atrasVuelve(h)).toBe(true);
    h.back();
    expect(h.url).toBe("/artistas?hace=musica");
    expect((h.state as { __NA?: true }).__NA).toBeUndefined(); // sin la pantalla guardada de Next.js: la recarga entera
    expect(atrasVuelve(h)).toBe(false); // y desde ahí, a la pantalla madre: tampoco sale a la del proveedor
  });
  it("por cualquier otro camino el historial se queda como estaba", () => {
    const h = new HistorialDePrueba("/lugares");
    instalar(h);
    next.apilar(h, "/perfil");
    const antes = structuredClone(h.entradas);
    expect(reponerPantallaAnterior(h, new AlmacenDePrueba(), "/perfil", 2000)).toBeNull();
    expect(h.entradas).toEqual(antes);
    expect(h.length).toBe(2);
  });
});
