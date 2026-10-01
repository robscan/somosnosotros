/**
 * Marca propia de navegación (Atrás coherente, OL-055): cada entrada del historial que pisa la app lleva en su estado
 * cuántas pantallas de la app tiene detrás y, si se apiló desde otra pantalla de la app, cuál era (ruta y consulta).
 * Atrás vuelve con el historial solo si hay alguna pantalla detrás; si no (enlace compartido, app recién abierta, o ya
 * de vuelta en la primera) va a la pantalla madre. `history.length` no sirve para decidirlo: cuenta también las entradas
 * de adelante y las de otros sitios. Terminar una tarea (guardar, entrar) mira de qué pantalla se vino para volver a ella.
 * La instala `Navegacion` (en el layout) sobre el historial del navegador; Atrás la lee al tocar.
 * Aquí vive también la vuelta de entrar con Apple o Google (OL-069 y OL-249), que es el único camino por el que la app sale del
 * sitio y regresa con una carga completa.
 */
import { rutaSegura } from "./rutas";

/** Dónde va la marca dentro del estado de la entrada (Next.js guarda ahí lo suyo con otras llaves). */
export const LLAVE_MARCA = "somosnosotros";
/** Dónde va la pantalla desde la que se apiló la entrada. */
export const LLAVE_DESDE = "somosnosotrosDesde";

function comoObjeto(estado: unknown): Record<string, unknown> {
  return typeof estado === "object" && estado !== null ? (estado as Record<string, unknown>) : {};
}

/** La marca de una entrada: cuántas pantallas de la app tiene detrás, o null si no lleva (entrada nueva o ajena). */
export function leerMarca(estado: unknown): number | null {
  const v = comoObjeto(estado)[LLAVE_MARCA];
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

/** Dónde va la pantalla de detrás de la pantalla de detrás: la que quedaría tras entrar y volver con una carga completa (OL-250). */
export const LLAVE_ANTES = "somosnosotrosAntes";

/** La pantalla desde la que se apiló la entrada (ruta y consulta), o null si no se sabe. */
export function leerDesde(estado: unknown): string | null {
  const v = comoObjeto(estado)[LLAVE_DESDE];
  return typeof v === "string" && v.startsWith("/") ? v : null;
}

/** La pantalla de detrás de la pantalla de detrás de la entrada (ruta y consulta), o null si no se sabe. */
export function leerAntes(estado: unknown): string | null {
  const v = comoObjeto(estado)[LLAVE_ANTES];
  return typeof v === "string" && v.startsWith("/") ? v : null;
}

/**
 * El estado de la entrada con la marca (y, si se sabe, la pantalla de detrás y la de antes de esa) puesta, sin tocar lo demás. La de antes sirve a
 * Entrar: apuntarla permite, tras entrar con Apple en la app de iPhone, dejar la pantalla de la que se vino detrás del destino.
 */
export function conMarca(estado: unknown, marca: number, desde: string | null = null, antes: string | null = null): Record<string, unknown> {
  const nuevo: Record<string, unknown> = { ...comoObjeto(estado), [LLAVE_MARCA]: marca };
  if (desde) nuevo[LLAVE_DESDE] = desde;
  else delete nuevo[LLAVE_DESDE];
  if (antes) nuevo[LLAVE_ANTES] = antes;
  else delete nuevo[LLAVE_ANTES];
  return nuevo;
}

/** Al apilar una pantalla nueva: una más que la entrada de la que se sale. */
export function marcaAlApilar(desde: number | null): number {
  return (desde ?? 0) + 1;
}

/**
 * Al reemplazar (un filtro, "Ver más", la salida a la pantalla madre): la entrada es la misma y conserva su marca.
 * Si ya no la tiene, vale la que traiga el estado nuevo; si tampoco, ninguna pantalla detrás.
 */
export function marcaAlReemplazar(actual: number | null, nueva: number | null): number {
  return actual ?? nueva ?? 0;
}

/**
 * Rutas del sitio que no son pantallas: venir de ellas no es venir de una pantalla de la app. Hoy, la ida y la vuelta
 * de Apple y de Google (`/auth/...`), que pasan por el sitio pero dejan detrás al proveedor, no una pantalla nuestra.
 */
function esRutaTecnica(ruta: string): boolean {
  return ruta === "/auth" || ruta.startsWith("/auth/");
}

/**
 * Una entrada que se abre sin marca (enlace compartido, app instalada, carga completa desde otra pantalla):
 * tiene una pantalla de la app detrás solo si la trajo un enlace del mismo sitio y el historial tiene de dónde
 * (una pestaña nueva abierta desde la app trae el referente, pero nada detrás).
 * Volver de Apple o de Google no cuenta, aunque el referente sea del sitio: lo que queda detrás es la pantalla del
 * proveedor (OL-069). Su relevo (`/auth/[proveedor]`) no deja entrada propia —se reenvía antes de terminar de cargar,
 * y entonces el navegador reemplaza la entrada en vez de apilarla—, así que sin esto Atrás salía del sitio.
 */
export function marcaDeLlegada(referente: string, origen: string, largoDelHistorial: number): number {
  if (!referente || largoDelHistorial <= 1) return 0;
  try {
    const u = new URL(referente);
    return u.origin === origen && !esRutaTecnica(u.pathname) ? 1 : 0;
  } catch {
    return 0;
  }
}

/** Lo que la pantalla de Entrar deja apuntado antes de salir hacia Apple o Google, para deshacer al volver lo que el proveedor añade al historial. */
export const APUNTE_VUELTA = "sn_vuelta";
/** Lo que deja el rebobinado (`rebobinar`) para comprobar dónde se aterrizó. */
export const APUNTE_REBOBINADO = "sn_rebobinado";
/** El apunte caduca con el intento de entrar (10 minutos): pasado eso, la carga ya no es aquella vuelta. */
const VIGENCIA_APUNTE_MS = 600_000;
/** Lo que deja la vuelta de entrar en la app de iPhone para una segunda carga de la misma pantalla (`aterrizarEnApp`). */
export const APUNTE_PREVIA = "sn_previa";
/** Esa segunda carga es cosa de un instante. */
const VIGENCIA_PREVIA_MS = 30_000;
/** El aterrizaje del rebobinado es cosa de unos segundos. */
const VIGENCIA_REBOBINADO_MS = 60_000;
/** Lo más que se retrocede: Apple y Google añaden una o dos entradas; más de esto no es lo que se esperaba. */
const MAXIMO_PASOS = 12;

/** Lo que se usa del almacén de la pestaña (en las pruebas, uno de mentira). */
export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Lo que apunta Entrar al llegar y al tocar el botón del proveedor: a dónde iba la persona (`siguiente`), cuántas entradas tenía el historial
 * (`largo`), hasta dónde se retrocede al volver (`hacia`): `origen` si la pantalla de la que se vino es la misma a la que se vuelve (Voy desde una
 * ficha, que vuelve a esa ficha), y `entrar` si es otra (el «+» desde Agenda, que va a /nuevo); y si se sabe que Entrar tiene una pantalla de la app detrás
 * (`detras`), para que la que aterrice en su lugar lo sepa también y Atrás pueda volver con el historial.
 */
export type Apunte = { siguiente: string; largo: number; hacia: "origen" | "entrar"; detras: boolean; cuando: number; previa?: string | null };

/**
 * La pantalla de la app de la que se vino, leída del referente. Sirve cuando la entrada no la anotó porque se llegó
 * con una carga completa (un toque antes de que la pantalla responda al dedo, un enlace compartido): entonces no hay
 * `somosnosotrosDesde`, pero el navegador sí dice de dónde vino. No cuenta si viene de fuera, de una ruta técnica
 * (la vuelta de un proveedor) o de esta misma pantalla (una recarga). Null cuando no se sabe.
 */
export function desdeElReferente(referente: string, origen: string, aqui: string): string | null {
  if (!referente) return null;
  try {
    const u = new URL(referente);
    if (u.origin !== origen || esRutaTecnica(u.pathname) || u.pathname === aqui) return null;
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** Entrar lo apunta al llegar y al tocar "Continuar con Apple" o "Continuar con Google". Si el almacén no está, no pasa nada. */
export function apuntarVuelta(almacen: Almacen | null, apunte: Apunte): void {
  try {
    almacen?.setItem(APUNTE_VUELTA, JSON.stringify(apunte));
  } catch {}
}

/** Hasta dónde retroceder al volver: a la pantalla de origen si es la misma a la que se vuelve (misma ruta); si no, a Entrar. */
export function haciaDonde(desde: string | null, siguiente: string): Apunte["hacia"] {
  return desde !== null && rutaDe(desde) === rutaDe(siguiente) ? "origen" : "entrar";
}

/**
 * El apunte, leído y borrado (sirve una sola vez, como el intento). Null si no hay, si no se entiende, si caducó o si esta carga no es la vuelta que
 * esperaba: solo cuenta la que llega a la ruta de destino, y por cualquier otro camino Atrás hace lo de siempre. Cuenta la ruta y no la dirección
 * entera porque la pantalla de destino aplica la intención (`?accion=voy`) y se redirige a su dirección limpia: la carga de la vuelta nunca lleva
 * la consulta con la que se salió.
 */
export function leerVuelta(almacen: Almacen | null, url: string, ahora: number): Apunte | null {
  let crudo: string | null = null;
  try {
    crudo = almacen?.getItem(APUNTE_VUELTA) ?? null;
    almacen?.removeItem(APUNTE_VUELTA);
  } catch {
    return null;
  }
  if (!crudo) return null;
  try {
    const a = JSON.parse(crudo) as Partial<Apunte>;
    if (typeof a.siguiente !== "string" || !Number.isInteger(a.largo) || (a.hacia !== "origen" && a.hacia !== "entrar") || typeof a.detras !== "boolean" || typeof a.cuando !== "number") return null;
    if (ahora - a.cuando > VIGENCIA_APUNTE_MS || a.cuando > ahora + 60_000) return null;
    if (rutaDe(a.siguiente) !== rutaDe(url)) return null;
    const previa = typeof a.previa === "string" && a.previa.startsWith("/") ? rutaSegura(a.previa, "/") : null;
    return { siguiente: rutaSegura(a.siguiente, "/"), largo: a.largo as number, hacia: a.hacia, detras: a.detras, cuando: a.cuando, ...(previa ? { previa } : {}) };
  } catch {
    return null;
  }
}

/**
 * Cuántas entradas retroceder: las que se añadieron desde Entrar (las del proveedor y la de esta carga) y una más si se llega hasta la pantalla de
 * origen. Null si no cuadra (el historial no tiene las entradas que debía, o son demasiadas).
 */
export function pasosParaRebobinar(a: Apunte, largoAhora: number): number | null {
  const pasos = largoAhora - a.largo + (a.hacia === "origen" ? 1 : 0);
  return pasos >= 1 && pasos <= MAXIMO_PASOS ? pasos : null;
}

/** Lo que se usa del historial para rebobinar (en las pruebas, uno de mentira). */
export type HistorialRebobinable = { readonly length: number; go(delta: number): void };

/**
 * Deshace al volver lo que Apple o Google añadieron al historial (OL-249, ajuste 6). La vuelta del proveedor llega con una carga completa, con su
 * pantalla —y las que ella apile— entre las de la persona y el destino: con Atrás, o con el gesto de deslizar desde el borde, se salía del sitio o
 * se volvía a la ficha. Apilar una entrada de reemplazo no sirve: el navegador se salta las que una página crea sin que la persona haya tocado
 * nada (la «intervención del historial»), y justo el gesto es lo que usa la persona. Se retrocede de verdad, con `history.go`, hasta la pantalla
 * de origen o hasta Entrar, que son entradas que la persona sí creó, y ahí `alAterrizar` hace el resto: queda el historial de antes de salir,
 * con el destino en el lugar de Entrar. No se usa en la app de iPhone (OL-250): ahí Apple y Google se abren fuera del WKWebView (sus páginas nunca entran al historial),
 * la vuelta la carga el envoltorio a mano y `GestoAtrasPlugin` cancela todo retroceso entre documentos, así que `history.go` no llegaría a ninguna parte
 * (ver `previaTrasEntrarEnApp`). Devuelve cuántas entradas retrocedió, o null si esta carga no es la vuelta de entrar con un proveedor.
 */
export function rebobinar(h: HistorialRebobinable, almacen: Almacen | null, url: string, ahora: number): number | null {
  const a = leerVuelta(almacen, url, ahora);
  if (a === null) return null;
  const pasos = pasosParaRebobinar(a, h.length);
  if (pasos === null) return null;
  try {
    almacen?.setItem(APUNTE_REBOBINADO, JSON.stringify({ siguiente: a.siguiente, detras: a.detras, cuando: ahora }));
  } catch {}
  h.go(-pasos);
  return pasos;
}

/**
 * La vuelta de entrar, en la app de iPhone (OL-250): el envoltorio carga a mano la vuelta y no hay nada que rebobinar. Lo único que importa es qué pantalla
 * debe quedar detrás del destino (`previa`: la de antes de entrar, que Entrar apuntó), para que Atrás vuelva a ella con una navegación del router y no con
 * `history.back()`, que cruzaría a un documento anterior y el envoltorio cancela. Consume el apunte. Null si esta carga no es esa vuelta o no se sabe.
 */
export function previaTrasEntrarEnApp(almacen: Almacen | null, url: string, ahora: number): string | null {
  return leerVuelta(almacen, url, ahora)?.previa ?? null;
}

/**
 * Lo que hace la app de iPhone al cargar cada documento (OL-250), con el historial ya marcado (`ponerMarca`): si es la vuelta de entrar, deja anotada como
 * pantalla de detrás la que apuntó Entrar; y devuelve la marca de la entrada con la que cargó el documento, su base (ver `hayPantallaAnterior`).
 */
export function aterrizarEnApp(h: Historial, almacen: Almacen | null, url: string, ahora: number): number {
  let previa = previaTrasEntrarEnApp(almacen, url, ahora);
  try {
    if (previa) {
      // La pantalla de destino puede redirigirse a su dirección limpia con una carga completa (quita `?accion=voy`) y esa carga reemplaza la entrada
      // sin su estado: se deja la pantalla de detrás para esa segunda carga, que la usa una vez y caduca pronto.
      almacen?.setItem(APUNTE_PREVIA, JSON.stringify({ previa, ruta: rutaDe(url), cuando: ahora }));
    } else {
      const crudo = almacen?.getItem(APUNTE_PREVIA) ?? null;
      almacen?.removeItem(APUNTE_PREVIA);
      const p = crudo ? (JSON.parse(crudo) as { previa?: unknown; ruta?: unknown; cuando?: unknown }) : null;
      if (p && typeof p.previa === "string" && p.ruta === rutaDe(url) && typeof p.cuando === "number" && ahora - p.cuando <= VIGENCIA_PREVIA_MS && p.cuando <= ahora + 60_000) {
        previa = rutaSegura(p.previa, "/");
      }
    }
  } catch {}
  if (previa && leerDesde(h.state) === null) h.replaceState(conMarca(h.state, leerMarca(h.state) ?? 0, previa), "");
  return leerMarca(h.state) ?? 0;
}

/** Lo que dice `alAterrizar`: qué hacer (`recargar` la pantalla, o `reemplazar` por el destino; ninguna, si todo está bien) y si hay una pantalla de la app detrás. */
export type Aterrizaje = { accion: "nada" | "recargar" | "reemplazar"; destino: string; detras: boolean };

/**
 * Qué hacer al aterrizar tras `rebobinar` (en la carga, o al restaurarse la página desde la memoria del navegador, `restaurada`). Si se aterrizó en
 * la ruta del destino no hay nada que mover (la pantalla de origen, o Entrar, que con sesión ya redirigió al destino); restaurada de la memoria
 * del navegador, esa pantalla enseña lo que tenía al salir, sin la intención aplicada, así que se recarga. En cualquier otra ruta, algo no salió
 * como se esperaba y se reemplaza por el destino, que es lo que pasaba antes. Null si esta carga no es un aterrizaje. `detras`: la entrada que
 * aterriza en lugar de Entrar no conserva su marca (la redirección del servidor la deja sin estado), así que se le dice si hay una pantalla detrás.
 */
export function alAterrizar(almacen: Almacen | null, ruta: string, ahora: number, restaurada: boolean): Aterrizaje | null {
  let crudo: string | null = null;
  try {
    crudo = almacen?.getItem(APUNTE_REBOBINADO) ?? null;
    almacen?.removeItem(APUNTE_REBOBINADO);
  } catch {
    return null;
  }
  if (!crudo) return null;
  try {
    const a = JSON.parse(crudo) as { siguiente?: unknown; detras?: unknown; cuando?: unknown };
    if (typeof a.siguiente !== "string" || typeof a.cuando !== "number" || ahora - a.cuando > VIGENCIA_REBOBINADO_MS || a.cuando > ahora + 60_000) return null;
    const destino = rutaSegura(a.siguiente, "/");
    const detras = a.detras === true;
    if (rutaDe(destino) !== rutaDe(ruta)) return { accion: "reemplazar", destino, detras };
    return { accion: restaurada ? "recargar" : "nada", destino, detras };
  } catch {
    return null;
  }
}

/**
 * Atrás vuelve con el historial si la entrada tiene una pantalla de la app detrás y el historial tiene de dónde.
 * `baseDelDocumento` (solo en la app de iPhone, OL-250): la marca de la entrada con la que cargó este documento. El envoltorio cancela todo retroceso que
 * cruza de un documento a otro (`GestoAtrasPlugin.swift`: la web decide), y `history.back()` hacia una entrada de otro documento es justo eso; un documento
 * nuevo (la vuelta de Apple cargada a mano, una recarga) solo puede retroceder a las entradas que él mismo apiló, las de marca mayor que la suya. De ahí
 * para atrás no hay historial al que volver: Atrás va a la pantalla madre, nunca a una navegación que el envoltorio se traga.
 */
export function hayPantallaAnterior(marca: number | null, largoDelHistorial: number, baseDelDocumento: number | null = null): boolean {
  return (marca ?? 0) > 0 && largoDelHistorial > 1 && (baseDelDocumento === null || (marca ?? 0) > baseDelDocumento);
}

/** La ruta de una URL de la app, sin consulta ni ancla. */
export function rutaDe(url: string): string {
  return url.split(/[?#]/)[0];
}

/**
 * Si terminar una tarea puede volver con el historial a `destino`: la pantalla de detrás es de la app y tiene su misma
 * ruta (se vino de la ficha a editarla, de la ficha a entrar, del alta de evento a registrar un lugar).
 */
export function vuelveA(estado: unknown, largoDelHistorial: number, destino: string, baseDelDocumento: number | null = null): boolean {
  const desde = leerDesde(estado);
  return hayPantallaAnterior(leerMarca(estado), largoDelHistorial, baseDelDocumento) && desde !== null && rutaDe(desde) === rutaDe(destino);
}

/** Lo que se usa del historial del navegador (en las pruebas, uno de mentira). */
export type Historial = {
  readonly state: unknown;
  pushState(estado: unknown, titulo: string, url?: string | URL | null): void;
  replaceState(estado: unknown, titulo: string, url?: string | URL | null): void;
};

/**
 * Pone la marca donde se escribe el historial. Next.js reescribe el estado de la entrada al navegar y al refrescar sin
 * conservar lo ajeno, así que apilar y reemplazar se envuelven:
 * - apilar suma una a la entrada de la que se sale y anota esa pantalla (`ubicacion`, la URL que aún está en la barra);
 * - reemplazar conserva la marca y la pantalla de detrás de la entrada.
 * La entrada actual, si no tiene marca, recibe la de llegada. Envolver dos veces da las mismas marcas: las dos capas
 * las calculan de la misma entrada.
 */
export function ponerMarca(h: Historial, llegada: number, ubicacion: () => string): void {
  const apilar = h.pushState;
  const reemplazar = h.replaceState;
  h.pushState = function (estado, titulo, url) {
    apilar.call(h, conMarca(estado, marcaAlApilar(leerMarca(h.state)), ubicacion(), leerDesde(h.state)), titulo, url);
  };
  h.replaceState = function (estado, titulo, url) {
    reemplazar.call(h, conMarca(estado, marcaAlReemplazar(leerMarca(h.state), leerMarca(estado)), leerDesde(h.state) ?? leerDesde(estado), leerAntes(h.state) ?? leerAntes(estado)), titulo, url);
  };
  if (leerMarca(h.state) === null) reemplazar.call(h, conMarca(h.state, llegada), "");
}
