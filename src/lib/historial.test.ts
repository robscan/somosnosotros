import { describe, expect, it } from "vitest";
import { alAterrizar, APUNTE_PREVIA, aterrizarEnApp, leerAntes, previaTrasEntrarEnApp, APUNTE_REBOBINADO, APUNTE_VUELTA, apuntarVuelta, conMarca, desdeElReferente, haciaDonde, hayPantallaAnterior, leerDesde, leerMarca, leerVuelta, marcaAlApilar, marcaAlReemplazar, marcaDeLlegada, pasosParaRebobinar, ponerMarca, rebobinar, rutaDe, vuelveA, type Almacen, type Apunte, type Historial } from "./historial";

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
  /** `history.go`: se mueve entre las entradas, sin pasarse de los extremos. */
  go(delta: number) {
    this.i = Math.min(this.entradas.length - 1, Math.max(0, this.i + delta));
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
    next.apilar(h, "/nuevo?lugar=7");
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
    const bueno: Apunte = { siguiente: "/perfil", largo: 3, hacia: "entrar", detras: true, cuando: 1000 };
    const a = conApunte(bueno);
    expect(leerVuelta(a, "/perfil", 2000)).toEqual(bueno);
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
    expect(leerVuelta(conApunte({ ...bueno, hacia: "otro" }), "/perfil", 2000)).toBeNull();
    expect(leerVuelta(conApunte({ ...bueno, largo: 2.5 }), "/perfil", 2000)).toBeNull();
    expect(leerVuelta(conApunte({ ...bueno, detras: "sí" }), "/perfil", 2000)).toBeNull();
  });
  it("la vuelta se reconoce por la ruta: la pantalla aplica la intención y se redirige a su dirección limpia", () => {
    const a = (siguiente: string): Apunte => ({ siguiente, largo: 3, hacia: "origen", detras: true, cuando: 1000 });
    expect(leerVuelta(conApunte(a("/eventos/1?accion=voy")), "/eventos/1", 2000)?.siguiente).toBe("/eventos/1?accion=voy");
    expect(leerVuelta(conApunte(a("/lugares/7?accion=seguir")), "/lugares/7", 2000)).not.toBeNull();
    expect(leerVuelta(conApunte(a("/eventos/1?accion=voy")), "/eventos/2", 2000)).toBeNull();
    expect(leerVuelta(conApunte(a("/eventos/1?accion=voy")), "/entrar?siguiente=/eventos/1&error=apple", 2000)).toBeNull();
  });
  it("el apunte no puede mandar a la persona fuera del sitio", () => {
    const fuera = (siguiente: string) => leerVuelta(conApunte({ siguiente, largo: 3, hacia: "entrar", detras: true, cuando: 1000 }), rutaDe(siguiente), 2000)?.siguiente;
    expect(fuera("/lugares/7")).toBe("/lugares/7");
    expect(fuera("/artistas?hace=musica#fechas")).toBe("/artistas?hace=musica#fechas");
    // Lo que no es una ruta del sitio se cambia por el inicio (con la misma ruta que lee la vuelta, aquí «/»).
    const raro = (siguiente: string) => leerVuelta(conApunte({ siguiente, largo: 3, hacia: "entrar", detras: true, cuando: 1000 }), siguiente, 2000)?.siguiente;
    expect(raro("https://otro.sitio/robo")).toBe("/");
    expect(raro("//otro.sitio/robo")).toBe("/");
    expect(raro("/\\otro.sitio")).toBe("/");
    expect(raro("javascript:alert(1)")).toBe("/");
    expect(raro(" //otro.sitio")).toBe("/");
  });
  it("sin almacén o con el almacén bloqueado, el historial se queda como estaba", () => {
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
    expect(() => apuntarVuelta(bloqueado, { siguiente: "/perfil", largo: 3, hacia: "entrar", detras: true, cuando: 1000 })).not.toThrow();
    expect(leerVuelta(bloqueado, "/perfil", 2000)).toBeNull();
    const h = new HistorialDePrueba("/perfil");
    instalar(h);
    const antes = structuredClone(h.entradas);
    expect(rebobinar(h, bloqueado, "/perfil", 2000)).toBeNull();
    expect(rebobinar(h, null, "/perfil", 2000)).toBeNull();
    expect(alAterrizar(bloqueado, "/perfil", 2000, false)).toBeNull();
    expect(alAterrizar(null, "/perfil", 2000, false)).toBeNull();
    expect(h.entradas).toEqual(antes);
    expect(h.i).toBe(0);
  });
  it("hasta dónde retroceder: a la pantalla de origen si es la misma a la que se vuelve, y si no, a Entrar", () => {
    expect(haciaDonde("/eventos/1", "/eventos/1?accion=voy")).toBe("origen");
    expect(haciaDonde("/lugares/7?x=1", "/lugares/7?accion=seguir")).toBe("origen");
    expect(haciaDonde("/novedades", "/novedades")).toBe("origen");
    expect(haciaDonde("/agenda", "/nuevo?tipo=evento")).toBe("entrar"); // el «+»
    expect(haciaDonde("/lugares", "/lugares/7?accion=seguir")).toBe("entrar"); // Seguir desde la lista
    expect(haciaDonde("/agenda", "/perfil")).toBe("entrar");
    expect(haciaDonde(null, "/eventos/1?accion=voy")).toBe("entrar"); // sin saber de dónde se vino
  });
  it("cuántas entradas retroceder: las que se añadieron desde Entrar y, hacia el origen, una más", () => {
    const entrar = (largo: number): Apunte => ({ siguiente: "/perfil", largo, hacia: "entrar", detras: true, cuando: 1 });
    const origen = (largo: number): Apunte => ({ siguiente: "/eventos/1", largo, hacia: "origen", detras: true, cuando: 1 });
    // Entrar era la entrada 4 (largo 4); el proveedor añadió una y esta carga otra: 6 entradas, dos de más.
    expect(pasosParaRebobinar(entrar(4), 6)).toBe(2);
    expect(pasosParaRebobinar(origen(4), 6)).toBe(3);
    // Sin entradas añadidas (la carga ocupó el lugar de Entrar): nada que retroceder hacia Entrar; hacia el origen, una.
    expect(pasosParaRebobinar(entrar(4), 4)).toBeNull();
    expect(pasosParaRebobinar(origen(4), 4)).toBe(1);
    // Lo que no cuadra: menos entradas de las que había, o demasiadas.
    expect(pasosParaRebobinar(entrar(4), 3)).toBeNull();
    expect(pasosParaRebobinar(entrar(4), 40)).toBeNull();
  });
  describe("el historial real, entrada por entrada", () => {
    /** Agenda → ficha del evento → Entrar (con lo que apunta Entrar al llegar), como queda tras tocar «Voy» sin cuenta. */
    function hastaEntrar(siguiente: string, camino: string[], pantallaDeEntrar = "/entrar") {
      const h = new HistorialDePrueba("/agenda");
      instalar(h);
      for (const ruta of camino) next.apilar(h, ruta);
      next.apilar(h, `${pantallaDeEntrar}?siguiente=${encodeURIComponent(siguiente)}`);
      const almacen = new AlmacenDePrueba();
      apuntarVuelta(almacen, { siguiente, largo: h.length, hacia: haciaDonde(leerDesde(h.state), siguiente), detras: leerDesde(h.state) !== null, cuando: 1000 });
      return { h, almacen };
    }
    /** La persona sale al proveedor (que añade `paginas` entradas) y vuelve con una carga completa en `destino`: una entrada más, sin marca. */
    function volverDelProveedor(h: HistorialDePrueba, destino: string, paginas = 1) {
      // Entradas de otros documentos: no pasan por la marca (que envuelve solo el historial del documento de la app).
      const apilar = (url: string) => HistorialDePrueba.prototype.pushState.call(h, null, "", url);
      for (let i = 0; i < paginas; i++) apilar(`https://appleid.apple.com/paso-${i}`);
      apilar(destino);
      instalar(h, marcaDeLlegada("", "https://somosnosotros.org", h.length));
    }
    it("Voy en una ficha: se retrocede hasta la ficha, que es la entrada que la persona creó, y Atrás lleva a Agenda", () => {
      for (const paginas of [1, 2, 3]) {
        const { h, almacen } = hastaEntrar("/eventos/1?accion=voy", ["/eventos/1"]);
        volverDelProveedor(h, "/eventos/1", paginas);
        expect(atrasVuelve(h)).toBe(false); // sin rebobinar, Atrás saldría a la pantalla del proveedor
        expect(rebobinar(h, almacen, "/eventos/1", 2000)).toBe(paginas + 2);
        expect(h.url).toBe("/eventos/1"); // la ficha de antes de entrar, con su marca y su pantalla de detrás
        expect(leerMarca(h.state)).toBe(1);
        expect(leerDesde(h.state)).toBe("/agenda");
        expect(atrasVuelve(h)).toBe(true);
        h.back();
        expect(h.url).toBe("/agenda");
      }
    });
    it("el «+», Perfil y las demás tareas hacia otra ruta: se retrocede hasta Entrar, que con sesión redirige al destino", () => {
      const { h, almacen } = hastaEntrar("/nuevo?tipo=evento", [], "/entrar");
      volverDelProveedor(h, "/nuevo?tipo=evento", 2);
      expect(rebobinar(h, almacen, "/nuevo?tipo=evento", 2000)).toBe(3);
      expect(h.url).toMatch(/^\/entrar/);
      next.reemplazar(h, "/nuevo?tipo=evento"); // el servidor redirige a la entrada de Entrar y Next.js la reemplaza por el destino
      expect(h.entradas.slice(0, h.i + 1).map((e) => e.url)).toEqual(["/agenda", "/nuevo?tipo=evento"]);
      expect(leerDesde(h.state)).toBe("/agenda");
      h.back();
      expect(h.url).toBe("/agenda");
    });
    it("el aterrizaje: en la ruta del destino no hay nada que mover; restaurada de la memoria, se recarga; en otra, se reemplaza por el destino", () => {
      const aterrizar = (ruta: string, restaurada: boolean, detras = true) => {
        const a = new AlmacenDePrueba();
        a.setItem(APUNTE_REBOBINADO, JSON.stringify({ siguiente: "/eventos/1?accion=voy", detras, cuando: 5000 }));
        return alAterrizar(a, ruta, 5000, restaurada);
      };
      expect(aterrizar("/eventos/1", false)).toEqual({ accion: "nada", destino: "/eventos/1?accion=voy", detras: true });
      expect(aterrizar("/eventos/1", true)?.accion).toBe("recargar");
      expect(aterrizar("/entrar", false)?.accion).toBe("reemplazar");
      expect(aterrizar("/entrar", true)).toEqual({ accion: "reemplazar", destino: "/eventos/1?accion=voy", detras: true });
      expect(aterrizar("/lugares", false)?.accion).toBe("reemplazar");
      expect(aterrizar("/eventos/1", false, false)?.detras).toBe(false);
      // Sirve una sola vez y caduca: una carga cualquiera, más tarde, no es un aterrizaje.
      const a = new AlmacenDePrueba();
      a.setItem(APUNTE_REBOBINADO, JSON.stringify({ siguiente: "/eventos/1", detras: true, cuando: 5000 }));
      expect(alAterrizar(a, "/lugares", 5000 + 60_001, false)).toBeNull();
      expect(a.getItem(APUNTE_REBOBINADO)).toBeNull();
      expect(alAterrizar(a, "/lugares", 5000, false)).toBeNull();
    });
    it("por cualquier otro camino el historial se queda como estaba", () => {
      const h = new HistorialDePrueba("/lugares");
      instalar(h);
      next.apilar(h, "/perfil");
      const antes = structuredClone(h.entradas);
      expect(rebobinar(h, new AlmacenDePrueba(), "/perfil", 2000)).toBeNull();
      expect(h.entradas).toEqual(antes);
      expect(h.i).toBe(1);
    });
  });
});

describe("la app de iPhone: la vuelta de Apple cargada a mano, sin páginas del proveedor (OL-250)", () => {
  /** Agenda → ficha → Entrar (con lo que apunta Entrar), y el envoltorio carga la vuelta: una entrada más de OTRO documento, con la ficha ya sin consulta. */
  function entrarYVolver(siguiente: string, camino: string[]) {
    const h = new HistorialDePrueba("/agenda");
    instalar(h);
    for (const ruta of camino) next.apilar(h, ruta);
    next.apilar(h, `/entrar?siguiente=${encodeURIComponent(siguiente)}`);
    const almacen = new AlmacenDePrueba();
    const desde = leerDesde(h.state);
    const hacia = haciaDonde(desde, siguiente);
    apuntarVuelta(almacen, { siguiente, largo: h.length, hacia, detras: desde !== null, cuando: 1000, previa: hacia === "origen" ? leerAntes(h.state) : desde });
    return { h, almacen };
  }
  /** El documento nuevo: una entrada más sin marca (el referente es la pantalla de Entrar, del mismo sitio: llega con marca 1) y sus marcas puestas de nuevo. */
  function cargarDocumento(h: HistorialDePrueba, destino: string, almacen: AlmacenDePrueba) {
    HistorialDePrueba.prototype.pushState.call(h, null, "", destino);
    instalar(h, marcaDeLlegada("https://somosnosotros.org/entrar", "https://somosnosotros.org", h.length));
    return aterrizarEnApp(h, almacen, destino, 2000);
  }
  const atras = (h: HistorialDePrueba, base: number) => hayPantallaAnterior(leerMarca(h.state), h.length, base);

  it("la entrada de Entrar apunta la pantalla de antes de la de origen", () => {
    const { h } = entrarYVolver("/eventos/1?accion=voy", ["/eventos/1"]);
    expect(leerDesde(h.state)).toBe("/eventos/1");
    expect(leerAntes(h.state)).toBe("/agenda");
  });
  it("Voy desde una ficha: no se rebobina, Atrás no usa el historial y lleva a Agenda, y desde un lugar abierto después vuelve a la ficha", () => {
    const { h, almacen } = entrarYVolver("/eventos/1?accion=voy", ["/eventos/1"]);
    const largo = h.length;
    const base = cargarDocumento(h, "/eventos/1", almacen);
    expect(h.length).toBe(largo + 1); // nada retrocedió ni se apiló de más
    expect(almacen.getItem(APUNTE_VUELTA)).toBeNull(); // el apunte se consumió: no queda nada vivo
    expect(almacen.getItem(APUNTE_REBOBINADO)).toBeNull();
    expect(atras(h, base)).toBe(false); // retroceder cruzaría a otro documento: el envoltorio lo cancelaría
    expect(leerDesde(h.state)).toBe("/agenda"); // a dónde ir en su lugar
    next.apilar(h, "/lugares/1"); // abrir el lugar es del mismo documento
    expect(atras(h, base)).toBe(true);
    h.back();
    expect(h.url).toBe("/eventos/1");
    expect(atras(h, base)).toBe(false); // y de vuelta en la ficha, otra vez a Agenda
  });
  it("el «+» desde Agenda: tras entrar, Atrás desde el destino lleva a Agenda", () => {
    const { h, almacen } = entrarYVolver("/nuevo?tipo=evento", []);
    const base = cargarDocumento(h, "/nuevo", almacen);
    expect(atras(h, base)).toBe(false);
    expect(leerDesde(h.state)).toBe("/agenda");
  });
  it("la pantalla de destino que se recarga entera para quitar `?accion=`: la segunda carga, sin estado, conserva la pantalla de detrás", () => {
    const { h, almacen } = entrarYVolver("/eventos/1?accion=voy", ["/eventos/1"]);
    cargarDocumento(h, "/eventos/1?accion=voy", almacen);
    expect(leerDesde(h.state)).toBe("/agenda");
    // `location.replace` a la dirección limpia: la misma entrada, sin estado; el referente es la carga anterior.
    h.entradas[h.i] = { estado: null, url: "/eventos/1" };
    instalar(h, 1);
    expect(leerDesde(h.state)).toBeNull();
    const base = aterrizarEnApp(h, almacen, "/eventos/1", 3000);
    expect(leerDesde(h.state)).toBe("/agenda");
    expect(atras(h, base)).toBe(false);
    expect(almacen.getItem(APUNTE_PREVIA)).toBeNull(); // se usa una vez
    // Caducada, o de otra ruta, no se usa.
    const viejo = new AlmacenDePrueba();
    viejo.setItem(APUNTE_PREVIA, JSON.stringify({ previa: "/agenda", ruta: "/eventos/1", cuando: 1000 }));
    h.entradas[h.i] = { estado: null, url: "/eventos/1" };
    instalar(h, 1);
    aterrizarEnApp(h, viejo, "/eventos/1", 1000 + 30_001);
    expect(leerDesde(h.state)).toBeNull();
    viejo.setItem(APUNTE_PREVIA, JSON.stringify({ previa: "/agenda", ruta: "/lugares/1", cuando: 1000 }));
    aterrizarEnApp(h, viejo, "/eventos/1", 1500);
    expect(leerDesde(h.state)).toBeNull();
  });
  it("si no se sabe de qué pantalla se vino, Atrás no usa el historial: la pantalla madre", () => {
    const h = new HistorialDePrueba("/eventos/1");
    instalar(h);
    next.apilar(h, "/entrar?siguiente=%2Feventos%2F1");
    const almacen = new AlmacenDePrueba();
    apuntarVuelta(almacen, { siguiente: "/eventos/1", largo: h.length, hacia: "origen", detras: false, cuando: 1000 });
    const base = cargarDocumento(h, "/eventos/1", almacen);
    expect(atras(h, base)).toBe(false);
    expect(leerDesde(h.state)).toBeNull();
  });
  it("sin apunte, o caducado, una carga cualquiera tampoco deja a Atrás sin efecto", () => {
    const h = new HistorialDePrueba("/agenda");
    instalar(h);
    next.apilar(h, "/eventos/1");
    expect(previaTrasEntrarEnApp(new AlmacenDePrueba(), "/eventos/1", 2000)).toBeNull();
    const viejo = new AlmacenDePrueba();
    apuntarVuelta(viejo, { siguiente: "/eventos/1", largo: 2, hacia: "origen", detras: true, cuando: 1000, previa: "/agenda" });
    expect(previaTrasEntrarEnApp(viejo, "/eventos/1", 1000 + 600_001)).toBeNull();
    const base = cargarDocumento(h, "/eventos/1", new AlmacenDePrueba());
    expect(atras(h, base)).toBe(false);
  });
  it("la base solo se usa en la app: sin ella (Safari, Chrome) el historial sigue siendo lo que decide", () => {
    expect(hayPantallaAnterior(1, 5)).toBe(true);
    expect(hayPantallaAnterior(1, 5, null)).toBe(true);
    expect(hayPantallaAnterior(1, 5, 1)).toBe(false);
    expect(hayPantallaAnterior(2, 5, 1)).toBe(true);
    expect(hayPantallaAnterior(0, 5, 0)).toBe(false);
    expect(vuelveA({ somosnosotros: 1, somosnosotrosDesde: "/eventos/1" }, 5, "/eventos/1")).toBe(true);
    expect(vuelveA({ somosnosotros: 1, somosnosotrosDesde: "/eventos/1" }, 5, "/eventos/1", 1)).toBe(false);
  });
  it("una recarga de la pantalla también es un documento nuevo: sus entradas de detrás no se alcanzan con el historial", () => {
    const h = new HistorialDePrueba("/agenda");
    instalar(h);
    next.apilar(h, "/eventos/1");
    next.apilar(h, "/lugares/1");
    instalar(h); // otra carga del documento: la entrada actual ya trae su marca (2)
    const base = leerMarca(h.state) as number;
    expect(atras(h, base)).toBe(false);
  });
});
