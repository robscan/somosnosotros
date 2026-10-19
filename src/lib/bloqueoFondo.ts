/**
 * El fondo de las capas (OL-419): mientras haya una capa abierta (una hoja, el mapa de una ficha) lo de detrás queda inerte y la página no se
 * desplaza; al cerrarse la última, todo vuelve a como estaba, se cierren en el orden que sea. Una sola pila para todas: antes cada capa ponía y
 * reponía el `inert` por su cuenta, y cerrar el mapa y luego una hoja podía dejar la pantalla inerte sin ninguna capa encima.
 *
 * Cada capa se registra con su dueño (un id) y el elemento que pinta al final del body (su portal, hijo directo del body); solo la de arriba
 * recibe toques y foco. Del resto de hijos del body se recuerda el `inert` que tenían antes de la primera capa y se les repone al vaciarse la
 * pila (un `inert` ajeno se conserva); lo que llega al body con capas abiertas queda inerte también. El desplazamiento se bloquea con
 * `html[data-capas]` (globals.css): un atributo y no un estilo en línea, para no pisar el de otras piezas (las historias, el mando), y solo en
 * `<html>` (con `<html>` y `<body>` a la vez la página volvía arriba al abrir una hoja: medido, de 300 a 0).
 * Sin React: lo usan `ui/Hoja` y `CapaMapa` desde sus efectos. Las historias de Inicio llevan su propio `html[data-historia]` (OL-412).
 */

/** Lo único que la pila toca de cada hijo del body. */
export type ConInert = { inert: boolean };

export type EntornoFondo<E extends ConInert> = {
  /** Los hijos directos del body, en su orden. */
  hijos: () => Iterable<E>;
  /** Bloquea (true) o suelta (false) el desplazamiento de la página. */
  bloquear: (si: boolean) => void;
  /** Avisa cuando cambian los hijos del body mientras hay capas; devuelve cómo dejar de vigilar. */
  vigilar?: (alCambiar: () => void) => () => void;
};

export function crearBloqueoFondo<E extends ConInert>(entorno: EntornoFondo<E>) {
  const pila: { dueno: string; capa: E }[] = [];
  /** El `inert` que tenía cada hijo del body antes de que la pila lo tocara. */
  const previo = new Map<E, boolean>();
  let dejarDeVigilar: (() => void) | null = null;

  function aplicar() {
    const superior = pila.at(-1)?.capa;
    const actuales = new Set(entorno.hijos());
    // Sin capas, todo recupera lo suyo; con capas, lo que ya salió del body deja de ser fondo y también.
    for (const [elemento, antes] of previo) {
      if (superior && actuales.has(elemento)) continue;
      elemento.inert = antes;
      previo.delete(elemento);
    }
    if (!superior) {
      entorno.bloquear(false);
      dejarDeVigilar?.();
      dejarDeVigilar = null;
      return;
    }
    for (const elemento of actuales) {
      if (!previo.has(elemento)) previo.set(elemento, elemento.inert);
      elemento.inert = elemento !== superior;
    }
    entorno.bloquear(true);
    if (!dejarDeVigilar && entorno.vigilar) dejarDeVigilar = entorno.vigilar(aplicar);
  }

  return {
    /** La capa de `dueno` se abre (o vuelve arriba si ya estaba): solo ella recibe toques. */
    abrir(dueno: string, capa: E) {
      const i = pila.findIndex((c) => c.dueno === dueno);
      if (i >= 0) pila.splice(i, 1);
      pila.push({ dueno, capa });
      aplicar();
    },
    /** La capa de `dueno` se cierra, esté donde esté en la pila; si era la última, el fondo se libera. */
    cerrar(dueno: string) {
      const i = pila.findIndex((c) => c.dueno === dueno);
      if (i >= 0) pila.splice(i, 1);
      aplicar();
    },
    /** Si la capa de `dueno` es la de arriba (la que atiende Escape y el foco). */
    esSuperior: (dueno: string) => pila.at(-1)?.dueno === dueno,
    /** Cuántas capas hay abiertas. */
    abiertas: () => pila.length,
  };
}

let navegador: ReturnType<typeof crearBloqueoFondo<HTMLElement>> | null = null;
function delNavegador() {
  navegador ??= crearBloqueoFondo<HTMLElement>({
    hijos: () => [...document.body.children].filter((e): e is HTMLElement => e instanceof HTMLElement),
    bloquear: (si) => document.documentElement.toggleAttribute("data-capas", si),
    vigilar: (alCambiar) => {
      const observador = new MutationObserver(alCambiar);
      observador.observe(document.body, { childList: true });
      return () => observador.disconnect();
    },
  });
  return navegador;
}

/** Abre la capa `capa` (hijo directo del body) a nombre de `dueno`: el resto del body, inerte, y la página, quieta. */
export function bloquearFondo(dueno: string, capa: HTMLElement) {
  delNavegador().abrir(dueno, capa);
}
/** Cierra la capa de `dueno`; con la última, el fondo vuelve a como estaba. */
export function soltarFondo(dueno: string) {
  delNavegador().cerrar(dueno);
}
/** Si la capa de `dueno` es la de arriba. */
export function esCapaSuperior(dueno: string) {
  return delNavegador().esSuperior(dueno);
}
