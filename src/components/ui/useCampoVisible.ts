"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sinMovimiento } from "@/lib/movimiento";

/** Aire que queda entre el campo y lo que lo rodea (el teclado, el pie pegado, la barra de arriba). */
const AIRE = 12;
/** Lo que se escribe: el campo que enfoca una persona con el teclado en pantalla. */
const ESCRIBIBLE = 'input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"], [type="button"], [type="submit"], [type="hidden"]), textarea, select, [contenteditable="true"]';
/** Cuánto se espera, tras soltar un campo, a ver si el foco entra en otro: al pasar de uno a otro el foco sale un instante antes de entrar. */
const ESPERA_SOLTAR_MS = 100;
/** Los eventos que el plugin `@capacitor/keyboard` manda a `window` dentro de la app de la tienda (compatibles con `cordova-plugin-ionic-keyboard`). */
const EVENTOS_DE_CAPACITOR = ["keyboardWillShow", "keyboardDidShow", "keyboardWillHide", "keyboardDidHide"] as const;
/**
 * Cuánto se vigila, cuadro a cuadro, después de enfocar un campo o de cambiar de paso (OL-376): en ese rato Safari de iOS 27 desplaza la
 * página y mueve lo fijo por su cuenta, a veces sin avisar con ningún evento del `visualViewport`. Medido en el simulador: se asienta entre
 * 0,2 y 0,7 s después del foco.
 */
const VIGILA_MS = 1200;
/**
 * Cuántos cuadros seguidos (unos 100 ms), sin ningún evento del `visualViewport`, tiene que durar la vista trabada para destrabarla (ver
 * `destrabar`). Mientras Safari anima su propio desplazamiento el área visible también descuadra, pero uno o dos cuadros: sus eventos llegan
 * enseguida y reinician la cuenta.
 */
const CUADROS_ATASCADA = 6;
/**
 * Cuántas veces, como mucho, se empuja la página en una vigilancia: un empujón mientras iOS todavía esconde el teclado (tarda casi medio
 * segundo) no la destraba —la página vuelve a recibir el teclado abierto—, así que si sigue atascada se repite cada `CUADROS_ATASCADA`.
 */
const EMPUJONES = 6;
/** Lo que dura, como mucho, el desplazamiento suave con que se lleva a la vista el campo recién enfocado (el de Safari, medido: unos 0,4 s). */
const DURA_SUAVE_MS = 500;

type Medida = {
  /** Lo que el teclado le quita a lo que se ve: su alto (0 sin teclado). Es el aire de abajo de la columna (`--teclado`). */
  teclado: number;
  /** El `bottom` de lo pegado sobre el teclado, medido desde el borde de abajo del bloque de lo fijo (`--abajo-visible`). Puede ser negativo. */
  abajoVisible: number;
  /** Dónde empieza y dónde termina lo que se ve, en el marco de `getBoundingClientRect`. */
  arriba: number;
  fondo: number;
};

/**
 * La medida `--abajo-visible` (px), para quien necesita el número en JavaScript y no solo en CSS (la barra «Agregar» y «Estoy aquí» de
 * `HojaDonde`, que se colocan con `style.bottom`): `useCampoVisible` la publica aquí cada vez que la publica en `<html>`. Así hay una sola
 * lógica del teclado —`visualViewport` y los eventos de Capacitor— y nadie la repite.
 */
let abajoVisibleActual = 0;
const oyentesDeAbajoVisible = new Set<() => void>();
function fijarAbajoVisible(px: number) {
  if (px === abajoVisibleActual) return;
  abajoVisibleActual = px;
  oyentesDeAbajoVisible.forEach((avisar) => avisar());
}
/** El mismo número, leído en el momento (para quien lo consulta en un bucle de cuadros, como `ui/ListaFlotante`). */
export function leerAbajoVisible(): number {
  return abajoVisibleActual;
}

/** Lo que vuelve a llevar a la vista el campo enfocado, mientras `useCampoVisible` está montado. */
let reasegurar: (() => void) | null = null;
/**
 * Vuelve a llevar a la vista el campo enfocado, en el cuadro siguiente, y vigila un rato que lo pegado siga anclado. Para quien cambió lo
 * que rodea al campo después de que este hook lo colocara: al cambiar de paso con el teclado abierto (`PorPasos`, OL-373), el campo del paso
 * nuevo toma el foco al montarse y se coloca antes de que el pie del paso nuevo publique su alto (`--alto-pie`), así que quedaba debajo del
 * pie; y justo después Safari de iOS 27 desplaza la página por su cuenta (OL-376).
 */
export function reasegurarCampo() {
  reasegurar?.();
}
/** A cuántos px del borde de abajo del bloque de lo fijo termina lo que se ve (0 sin teclado): lo mismo que `--abajo-visible`. */
export function useAbajoVisible(): number {
  return useSyncExternalStore(
    (avisar) => {
      oyentesDeAbajoVisible.add(avisar);
      return () => void oyentesDeAbajoVisible.delete(avisar);
    },
    () => abajoVisibleActual,
    () => 0,
  );
}

/**
 * Todo campo de texto queda dentro del área visible al enfocarse (regla del founder, 2026-10-05: «en cada input text asegúrate de que no sea
 * cubierto por el teclado»). Se monta una sola vez, en el armazón (`components/Armazon`), y escucha `focusin` en el documento: ningún campo
 * lleva nada de más ni hay que acordarse de él en una pantalla nueva.
 *
 * Qué pasa en el iPhone (medido en el simulador, bitácora 333): con el teclado abierto la ventana de maquetación no se encoge, solo el área
 * visible (`visualViewport`). Safari desplaza por su cuenta un campo que no cabe, pero no siempre: si la página no tiene más recorrido que
 * la ventana no la mueve y el teclado tapa el campo; y lo pegado abajo (el pie de los pasos) puede quedar justo encima del campo.
 *
 * **Safari de iOS 27 (bitácora 407, OL-376).** Con el teclado abierto, `window.innerHeight` ya no es la ventana: mide lo que queda de la
 * página desde lo que se ve (`min(ventana, scrollHeight − scrollY)`), así que cambia al desplazar y al cambiar el largo de la página. Y el
 * bloque de lo fijo (la ventana de maquetación, donde se ancla lo que lleva `position: fixed`) no siempre empieza donde empieza lo que se ve: tras
 * un cambio de paso con el teclado abierto Safari desplaza la página y deja lo fijo atrás, sin ningún evento del `visualViewport`
 * (`offsetTop` y `pageTop` se quedan en 0 mientras `scrollY` vale 335). Por eso aquí:
 * - el alto del teclado sale de la ventana de verdad, `clientHeight` (la del bloque inicial, que no cambia), y no de `innerHeight`: si sale de
 *   `innerHeight` el aire de abajo cambia el largo de la página, eso cambia `innerHeight` y la medida no se asienta (medido: 3,6 s yendo y
 *   viniendo, y a veces se queda con el pie a media pantalla o sin teclado para la app);
 * - dónde termina de verdad el bloque de lo fijo se mide con una sonda (un elemento fijo de alto 0 con `bottom: 0`) y no se supone;
 * - se vuelve a medir con cada desplazamiento de la página y, un rato después de enfocar o de cambiar de paso, en cada cuadro (`vigilar`);
 * - si en ese rato la vista se traba, se destraba (`destrabar`): el área visible atascada (`pageTop` ≠ `scrollY` varios cuadros sin
 *   eventos; a veces iOS ya cerró el teclado y la página lo sigue creyendo abierto) se arregla empujando la página un píxel, y la vista
 *   pasada del final de la página sin teclado, llevándola a su final;
 * - la página nunca se desplaza más allá de su final para llevar un campo a la vista.
 *
 * **La app de la tienda (Capacitor, `apps/ios`; bitácora 336) es otro caso.** Su WKWebView lleva `plugins.Keyboard.resize: "body"`
 * (OL-205): el plugin quita sus propios oyentes del WebView, deja el `contentInset` de la vista en cero (iOS no desplaza nada para revelar el
 * campo) y solo encoge a mano el alto del `<body>`; ni `window.innerHeight` ni `visualViewport.height` cambian ("Relative units are not
 * affected, because the viewport does not change", documentación de `@capacitor/keyboard`). Ahí la medida del `visualViewport` vale 0 y
 * lo pegado con `bottom: 0` queda bajo el teclado. Lo único que dice cuánto mide es el plugin, con eventos en `window`
 * (`keyboardWillShow` y `keyboardDidShow` traen `keyboardHeight` en px puesto directamente en el evento, no en `detail`;
 * `keyboardWillHide` y `keyboardDidHide` no traen nada: 0). Por eso este hook los escucha también y toma como medida **la mayor entre la del
 * `visualViewport` y la de Capacitor**: en Safari y en la web instalada Capacitor no existe (0) y en la app el `visualViewport` no se mueve (0).
 *
 * Con esa medida, este hook hace dos cosas:
 * 1. Publica en `<html>`, mientras haya un campo enfocado (y 0 sin él), dos medidas del teclado y `data-teclado`:
 *    - `--teclado`: lo que el teclado le quita a la ventana, su alto (la mayor de las dos medidas). No cambia aunque Safari mueva la vista ni
 *      con el largo de la página. Las pantallas lo suman a su relleno de abajo (`plantilla.pagina`, `PorPasos`) para que haya por dónde
 *      desplazar el campo hasta quedar sobre el teclado.
 *    - `--abajo-visible`: a cuánto del borde de abajo del bloque de lo fijo termina lo que se ve (lo que mide la sonda menos dónde termina lo
 *      que se ve). Es el `bottom` de todo lo que va pegado sobre el teclado: el pie con las acciones (`PiePaso`, en la columna de los pasos y
 *      en la capa fija de «¿Dónde es?»). Regla del founder, 2026-10-06: con el teclado abierto, las acciones quedan sobre él. Puede ser
 *      negativo: si Safari dejó lo fijo más arriba de lo que se ve, el pie baja por debajo de su bloque hasta el borde de lo que se ve.
 * 2. Al enfocar un campo, y cada vez que el área visible cambia (el teclado tarda en asentarse y no se espera con un temporizador a ciegas),
 *    desplaza lo que se desplaza —la hoja o la página— lo justo para que el campo quede en el centro de lo que sí se ve: entre la barra de
 *    arriba y el teclado. Si ya se ve entero no se mueve nada.
 */
export default function useCampoVisible() {
  useEffect(() => {
    const raiz = document.documentElement;
    const vv = window.visualViewport;
    const sonda = crearSonda(raiz);
    let campo: HTMLElement | null = null;
    /** El alto del teclado que dijo Capacitor en su último evento (0 en Safari, en la web instalada y con el teclado cerrado). */
    let deCapacitor = 0;

    /**
     * Las medidas del teclado, con la mayor entre el `visualViewport` y Capacitor (ver arriba).
     * `teclado`: lo que le falta al área visible para llegar a la ventana (`clientHeight`, que con el teclado no cambia; `innerHeight` sí, en
     * iOS 27). Es el mismo aunque Safari desplace la vista o lo fijo.
     * `fondo`: dónde termina lo que se ve, en el marco de las cajas: el desfase del área visible más su alto (en la app de la tienda, la
     * ventana menos lo que dijo Capacitor, porque ahí el `visualViewport` no se encoge).
     * `abajoVisible`: cuánto hay del borde de abajo del bloque de lo fijo (la sonda) a ese fondo. Solo cambia la posición de lo pegado, nunca
     * el largo de la página, así que no hace saltar el desplazamiento.
     */
    const medir = (): Medida => {
      const arriba = vv ? desfaseVisible(vv) : 0;
      const alto = vv ? vv.height : window.innerHeight;
      if (!campo) return { teclado: 0, abajoVisible: 0, arriba, fondo: arriba + alto };
      const delArea = vv ? Math.max(0, Math.round(raiz.clientHeight - vv.height)) : 0;
      const teclado = Math.max(delArea, deCapacitor);
      const fondo = arriba + alto - Math.max(0, deCapacitor - delArea);
      const abajoVisible = teclado > 0 ? Math.round(sonda.getBoundingClientRect().top - fondo) : 0;
      return { teclado, abajoVisible, arriba, fondo };
    };
    // Lo último que se publicó: con el teclado abierto se mide en cada desplazamiento y en cada cuadro de la vigilancia, y solo se escribe en
    // `<html>` lo que cambió (cada escritura recalcula estilos).
    let publicado = { teclado: -1, abajoVisible: Number.NaN };
    const publicar = () => {
      const m = medir();
      if (m.teclado !== publicado.teclado) {
        raiz.style.setProperty("--teclado", `${m.teclado}px`);
        raiz.toggleAttribute("data-teclado", m.teclado > 0);
      }
      if (m.abajoVisible !== publicado.abajoVisible) raiz.style.setProperty("--abajo-visible", `${m.abajoVisible}px`);
      publicado = { teclado: m.teclado, abajoVisible: m.abajoVisible };
      fijarAbajoVisible(m.abajoVisible);
      return m;
    };

    // Hasta cuándo sigue el desplazamiento suave que empezó al enfocar: mientras tanto no se corrige encima de golpe. Lo dispara su propio
    // movimiento (cada cuadro cambia el área visible) y en iOS 27 uno de golpe a medio camino hace que el suave siga de largo, más allá del
    // final de la página, con lo pegado abajo a media pantalla (OL-376, medido con «Accesibilidad grande»). Al terminar se vuelve a mirar.
    let suaveHasta = 0;
    const asegurar = (suave: boolean) => {
      if (!campo?.isConnected || campo !== document.activeElement) return;
      if (!suave && performance.now() < suaveHasta) return;
      const libre = bandaLibre(campo, medir());
      const caja = campo.getBoundingClientRect();
      if (caja.top >= libre.arriba && caja.bottom <= libre.abajo) return;
      // Al centro de lo libre; si es más alto que eso (un área de texto), su arranque arriba, que es donde se escribe.
      const cabe = caja.height <= libre.abajo - libre.arriba;
      const delta = cabe ? (caja.top + caja.bottom) / 2 - (libre.arriba + libre.abajo) / 2 : caja.top - libre.arriba;
      // Suave solo al enfocar; al cambiar el área visible se corrige de golpe, para no apilar desplazamientos a medias.
      const comportamiento = suave && !sinMovimiento() ? "smooth" : "auto";
      if (desplazar(campo, delta, comportamiento) && comportamiento === "smooth") {
        suaveHasta = performance.now() + DURA_SUAVE_MS;
        setTimeout(() => asegurar(false), DURA_SUAVE_MS);
      }
    };

    /**
     * Un rato de vigilancia cuadro a cuadro (OL-376): se vuelve a medir y a publicar en cada cuadro, aunque no llegue ningún evento, porque
     * Safari de iOS 27 mueve la página y lo fijo sin avisar. Y si en ese rato la vista queda trabada `CUADROS_ATASCADA` cuadros seguidos sin
     * eventos del `visualViewport` (ver `destrabar`), se destraba, hasta `EMPUJONES` veces.
     */
    let vigilaHasta = 0;
    let vigilando = false;
    let cuadrosAtascada = 0;
    let empujones = 0;
    const vigilar = () => {
      vigilaHasta = performance.now() + VIGILA_MS;
      cuadrosAtascada = 0;
      empujones = 0;
      if (vigilando) return;
      vigilando = true;
      const cuadro = () => {
        if (!campo || performance.now() > vigilaHasta) {
          vigilando = false;
          return;
        }
        const m = publicar();
        const remedio = vv ? destrabar(vv, m.teclado) : null;
        cuadrosAtascada = remedio ? cuadrosAtascada + 1 : 0;
        if (remedio && cuadrosAtascada >= CUADROS_ATASCADA && empujones < EMPUJONES) {
          empujones += 1;
          cuadrosAtascada = 0;
          remedio();
        }
        requestAnimationFrame(cuadro);
      };
      requestAnimationFrame(cuadro);
    };

    const enfocado = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement) || !el.matches(ESCRIBIBLE)) return;
      campo = el;
      publicar();
      vigilar();
      // Tras el siguiente cuadro, con la maquetación ya puesta; si el teclado aún no llegó, el cambio del área visible lo repite.
      requestAnimationFrame(() => asegurar(true));
    };
    const alEnfocar = (e: FocusEvent) => enfocado(e.target);
    // Solo si no llegó otro campo se suelta: así el aire de abajo no se encoge entre un campo y el siguiente y la pantalla no salta.
    const alSoltar = () =>
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement && document.activeElement.matches(ESCRIBIBLE)) return;
        campo = null;
        publicar();
      }, ESPERA_SOLTAR_MS);
    // El aire de abajo recién publicado tarda en contar en la maquetación: con «reducir movimiento», la transición de 0,01 ms de `globals.css`
    // lo deja en su valor de antes durante el cuadro siguiente. Se asegura dos cuadros después, y una sola vez para varios cambios seguidos.
    let pendiente = false;
    const alCambiarElArea = () => {
      cuadrosAtascada = 0;
      publicar();
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          pendiente = false;
          asegurar(false);
        }),
      );
    };
    // Al desplazarse la página solo se vuelve a anclar lo pegado (en iOS 27 lo fijo se queda atrás al desplazar con el teclado abierto); el
    // campo no se vuelve a colocar: quien desplaza puede ser la persona.
    const alDesplazar = () => {
      if (campo) publicar();
    };

    // La app de la tienda: los eventos del plugin de teclado de Capacitor llegan a `window` con `keyboardHeight` en el propio evento.
    const alTecladoDeCapacitor = (e: Event) => {
      const alto = (e as Event & { keyboardHeight?: number }).keyboardHeight;
      deCapacitor = typeof alto === "number" && alto > 0 ? Math.round(alto) : 0;
      alCambiarElArea();
    };

    document.addEventListener("focusin", alEnfocar);
    document.addEventListener("focusout", alSoltar);
    vv?.addEventListener("resize", alCambiarElArea);
    vv?.addEventListener("scroll", alCambiarElArea);
    window.addEventListener("scroll", alDesplazar, { passive: true });
    for (const evento of EVENTOS_DE_CAPACITOR) window.addEventListener(evento, alTecladoDeCapacitor);
    // Dos cuadros después, como al cambiar el área: el aire de abajo que suma el pie nuevo (`--alto-pie`) tarda un cuadro en contar con «reducir
    // movimiento». Y la vigilancia, porque justo después del cambio de paso es cuando Safari desplaza la página por su cuenta.
    reasegurar = () => {
      vigilar();
      requestAnimationFrame(() => requestAnimationFrame(() => asegurar(false)));
    };
    // El campo que ya está enfocado al montar (un `autoFocus` que se hidrató antes que este efecto).
    enfocado(document.activeElement);
    return () => {
      reasegurar = null;
      campo = null;
      vigilaHasta = 0;
      document.removeEventListener("focusin", alEnfocar);
      document.removeEventListener("focusout", alSoltar);
      vv?.removeEventListener("resize", alCambiarElArea);
      vv?.removeEventListener("scroll", alCambiarElArea);
      window.removeEventListener("scroll", alDesplazar);
      for (const evento of EVENTOS_DE_CAPACITOR) window.removeEventListener(evento, alTecladoDeCapacitor);
      sonda.remove();
      raiz.style.removeProperty("--teclado");
      raiz.style.removeProperty("--abajo-visible");
      raiz.removeAttribute("data-teclado");
      fijarAbajoVisible(0);
    };
  }, []);
}

/**
 * La sonda del bloque de lo fijo (OL-376): un elemento fijo de alto 0 pegado a su borde de abajo (`bottom: 0`), invisible y sin toques. Su
 * `top` dice dónde termina de verdad el bloque en el marco de las cajas, que en Safari de iOS 27 con el teclado abierto no es `innerHeight`
 * ni se deduce del `visualViewport`. Cuelga de `<html>` y no de `<body>`: así `pegados` no la cuenta entre lo pegado.
 */
function crearSonda(raiz: HTMLElement) {
  const sonda = document.createElement("div");
  sonda.setAttribute("aria-hidden", "true");
  sonda.style.cssText = "position:fixed;bottom:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none";
  raiz.appendChild(sonda);
  return sonda;
}

/**
 * Dónde empieza el área visible en el marco de `getBoundingClientRect`: `pageTop - scrollY`. No es `offsetTop`: en Safari del iPhone, con el
 * teclado y la página desplazada, `offsetTop` no coincide con el marco de las cajas (medido en el simulador); `pageTop - scrollY` da 0 allí y da
 * el `offsetTop` donde la vista se amplió con los dedos. Mientras la vista se reacomoda `pageTop` puede ir un cuadro atrás, y en iOS 27 puede
 * quedarse atrás del todo (ver `destrabar`): nunca negativo.
 */
function desfaseVisible(vv: VisualViewport) {
  return Math.max(0, vv.pageTop - window.scrollY);
}

/**
 * Lo que destraba la vista de Safari de iOS 27, si está trabada de una de las dos maneras medidas en el simulador (bitácora 407); null si no
 * lo está (o si se amplió con los dedos, que tiene sus propias reglas).
 * 1. **El área visible atascada, con el teclado abierto para la página**: `pageTop` no coincide con la página. Sin ampliar, `pageTop` es `scrollY`
 *    (en Safari de iOS) o `scrollY + offsetTop` (la norma, y Chrome cuando el teclado solo encoge el área visible); tras el desplazamiento
 *    que hace Safari al cambiar de paso con el teclado abierto, `pageTop` y `offsetTop` se quedan en 0 mientras `scrollY` vale 335, y a veces
 *    iOS ya cerró el teclado y la página lo sigue creyendo abierto (el pie a media pantalla y nada debajo). Remedio: empujar la página un
 *    píxel (hacia arriba, que siempre se puede, salvo arriba del todo); al desplazarse de verdad, Safari le vuelve a mandar lo que se ve y
 *    los oyentes de siempre corrigen lo pegado. Desplazarla a donde ya está no sirve: no va y vuelve de Safari.
 * 2. **La vista pasada del final de la página, sin teclado**: lo que se ve sigue más abajo de donde termina el documento, cosa que solo se
 *    puede con el teclado abierto (su hueco cuenta para desplazar). Pasa si la página se desplaza justo cuando iOS cierra el teclado: el
 *    desplazamiento suave sigue de largo y lo pegado abajo, que se ancla al final de la página, queda a media pantalla (medido con
 *    «Accesibilidad grande»). Remedio: llevar la página a su final de verdad.
 */
function destrabar(vv: VisualViewport, teclado: number): (() => void) | null {
  if (Math.abs(vv.scale - 1) >= 0.01) return null;
  const desfase = vv.pageTop - window.scrollY;
  if (teclado > 0 && Math.abs(desfase) > 1 && Math.abs(desfase - vv.offsetTop) > 1) return () => window.scrollBy(0, window.scrollY >= 1 ? -1 : 1);
  const final = document.documentElement.scrollHeight - vv.height;
  if (teclado === 0 && vv.pageTop > final + 1) return () => window.scrollTo(0, Math.max(0, final));
  return null;
}

/**
 * Lo que se ve de verdad para un campo, en el marco de `getBoundingClientRect`: el área visible (sin el teclado), recortada por lo pegado que
 * lo tapa —hermanos suyos o de algún ancestro, con `position: sticky` o `fixed`: la barra de arriba, un pie— y por la caja de lo que se
 * desplaza si es más chica (el cuerpo de una hoja).
 */
function bandaLibre(campo: HTMLElement, medida: Medida) {
  let arriba = medida.arriba;
  // Hasta dónde llega lo que se ve: el fondo del área visible (en la app de la tienda, la ventana menos el teclado de Capacitor).
  let abajo = medida.fondo;
  const contenedor = desplazable(campo);
  if (contenedor) {
    const c = contenedor.getBoundingClientRect();
    arriba = Math.max(arriba, c.top);
    abajo = Math.min(abajo, c.bottom);
  }
  const mitad = (arriba + abajo) / 2;
  for (const pegado of pegados(campo)) {
    const p = pegado.getBoundingClientRect();
    if (p.bottom <= arriba || p.top >= abajo) continue;
    if (p.top + p.height / 2 < mitad) arriba = Math.max(arriba, p.bottom);
    else abajo = Math.min(abajo, p.top);
  }
  return { arriba: arriba + AIRE, abajo: abajo - AIRE };
}

/** Los elementos pegados (sticky o fixed) que comparten pantalla con el campo sin contenerlo: hermanos de él o de alguno de sus ancestros. */
function pegados(campo: HTMLElement): HTMLElement[] {
  const hallados: HTMLElement[] = [];
  for (let nodo: HTMLElement | null = campo; nodo && nodo !== document.body; nodo = nodo.parentElement) {
    for (const hermano of nodo.parentElement?.children ?? []) {
      if (hermano === nodo || !(hermano instanceof HTMLElement)) continue;
      const posicion = getComputedStyle(hermano).position;
      if (posicion === "sticky" || posicion === "fixed") hallados.push(hermano);
    }
  }
  return hallados;
}

/** El ancestro más cercano que se desplaza por su cuenta (una hoja, su cuerpo); null si lo que se desplaza es la página. */
function desplazable(campo: HTMLElement): HTMLElement | null {
  for (let nodo = campo.parentElement; nodo && nodo !== document.documentElement; nodo = nodo.parentElement) {
    const { overflowY } = getComputedStyle(nodo);
    if ((overflowY === "auto" || overflowY === "scroll") && nodo.scrollHeight > nodo.clientHeight) return nodo;
  }
  return null;
}

/**
 * Mueve `delta` px lo que se desplaza: el ancestro que lo hace, o la página. Una capa fija sin desplazamiento propio (`ui/CampoLargo`) no
 * tiene nada que mover. La página, nunca más allá de su final (lo que mide menos lo que se ve): Safari de iOS 27 deja que un desplazamiento
 * suave siga de largo si otro lo alcanza mientras se cierra el teclado (OL-376).
 */
function desplazar(campo: HTMLElement, delta: number, behavior: ScrollBehavior): boolean {
  const contenedor = desplazable(campo);
  if (contenedor) {
    if (Math.abs(delta) < 1) return false;
    contenedor.scrollBy({ top: delta, behavior });
    return true;
  }
  if (enCapaFija(campo)) return false;
  const alto = window.visualViewport?.height ?? window.innerHeight;
  const final = Math.max(0, document.documentElement.scrollHeight - alto);
  const hacia = Math.min(Math.max(window.scrollY + delta, 0), Math.max(final, window.scrollY));
  if (Math.abs(hacia - window.scrollY) < 1) return false;
  window.scrollBy({ top: hacia - window.scrollY, behavior });
  return true;
}

function enCapaFija(campo: HTMLElement) {
  for (let nodo = campo.parentElement; nodo && nodo !== document.body; nodo = nodo.parentElement) if (getComputedStyle(nodo).position === "fixed") return true;
  return false;
}
