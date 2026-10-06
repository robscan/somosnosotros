"use client";

import { useEffect } from "react";
import { sinMovimiento } from "@/lib/movimiento";

/** Aire que queda entre el campo y lo que lo rodea (el teclado, el pie pegado, la barra de arriba). */
const AIRE = 12;
/** Lo que se escribe: el campo que enfoca una persona con el teclado en pantalla. */
const ESCRIBIBLE = 'input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"], [type="button"], [type="submit"], [type="hidden"]), textarea, select, [contenteditable="true"]';
/** Cuánto se espera, tras soltar un campo, a ver si el foco entra en otro: al pasar de uno a otro el foco sale un instante antes de entrar. */
const ESPERA_SOLTAR_MS = 100;

/**
 * Todo campo de texto queda dentro del área visible al enfocarse (regla del founder, 2026-10-05: «en cada input text asegúrate de que no sea
 * cubierto por el teclado»). Se monta una sola vez, en el armazón (`components/Armazon`), y escucha `focusin` en el documento: ningún campo
 * lleva nada de más ni hay que acordarse de él en una pantalla nueva.
 *
 * Qué pasa en el iPhone (medido en el simulador, bitácora 333): con el teclado abierto la ventana de maquetación no se encoge, solo el área
 * visible (`visualViewport`). Safari desplaza por su cuenta un campo que no cabe, pero no siempre: si la página no tiene más recorrido que
 * la ventana no la mueve y el teclado tapa el campo; y lo pegado abajo (el pie de los pasos) puede quedar justo encima del campo. Por eso
 * este hook hace dos cosas:
 * 1. Publica `--teclado` en `<html>` —lo que el teclado le quita a la ventana: su alto— y `data-teclado` mientras haya un campo enfocado. Las
 *    pantallas suman `--teclado` a su relleno de abajo (`plantilla.pagina`, `PorPasos`) para que haya por dónde desplazar, y el pie de los
 *    pasos deja de estar pegado (`PorPasos.module.css`): en el flujo, tras el campo, queda sobre el teclado al fondo del recorrido.
 * 2. Al enfocar un campo, y cada vez que el área visible cambia (el teclado tarda en asentarse y no se espera con un temporizador a ciegas),
 *    desplaza lo que se desplaza —la hoja o la página— lo justo para que el campo quede en el centro de lo que sí se ve: entre la barra de
 *    arriba y el teclado. Si ya se ve entero no se mueve nada.
 */
export default function useCampoVisible() {
  useEffect(() => {
    const raiz = document.documentElement;
    const vv = window.visualViewport;
    let campo: HTMLElement | null = null;

    /** El alto del teclado: lo que le falta al área visible para llegar a la ventana. Es el mismo aunque Safari desplace la vista (a diferencia de `offsetTop`). */
    const publicar = () => {
      const tapado = campo && vv ? Math.max(0, Math.round(window.innerHeight - vv.height)) : 0;
      raiz.style.setProperty("--teclado", `${tapado}px`);
      raiz.toggleAttribute("data-teclado", tapado > 0);
    };

    const asegurar = (suave: boolean) => {
      if (!campo?.isConnected || campo !== document.activeElement) return;
      const libre = bandaLibre(campo, vv);
      const caja = campo.getBoundingClientRect();
      if (caja.top >= libre.arriba && caja.bottom <= libre.abajo) return;
      // Al centro de lo libre; si es más alto que eso (un área de texto), su arranque arriba, que es donde se escribe.
      const cabe = caja.height <= libre.abajo - libre.arriba;
      const delta = cabe ? (caja.top + caja.bottom) / 2 - (libre.arriba + libre.abajo) / 2 : caja.top - libre.arriba;
      // Suave solo al enfocar; al cambiar el área visible se corrige de golpe, para no apilar desplazamientos a medias.
      desplazar(campo, delta, suave && !sinMovimiento() ? "smooth" : "auto");
    };

    const enfocado = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement) || !el.matches(ESCRIBIBLE)) return;
      campo = el;
      publicar();
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

    document.addEventListener("focusin", alEnfocar);
    document.addEventListener("focusout", alSoltar);
    vv?.addEventListener("resize", alCambiarElArea);
    vv?.addEventListener("scroll", alCambiarElArea);
    // El campo que ya está enfocado al montar (un `autoFocus` que se hidrató antes que este efecto).
    enfocado(document.activeElement);
    return () => {
      document.removeEventListener("focusin", alEnfocar);
      document.removeEventListener("focusout", alSoltar);
      vv?.removeEventListener("resize", alCambiarElArea);
      vv?.removeEventListener("scroll", alCambiarElArea);
      raiz.style.removeProperty("--teclado");
      raiz.removeAttribute("data-teclado");
    };
  }, []);
}

/**
 * Lo que se ve de verdad para un campo, en el marco de `getBoundingClientRect`: el área visible (sin el teclado), recortada por lo pegado que
 * lo tapa —hermanos suyos o de algún ancestro, con `position: sticky` o `fixed`: la barra de arriba, un pie— y por la caja de lo que se
 * desplaza si es más chica (el cuerpo de una hoja).
 */
function bandaLibre(campo: HTMLElement, vv: VisualViewport | null) {
  // Dónde empieza el área visible en ese marco: `pageTop - scrollY`. No es `offsetTop`: en Safari del iPhone, con el teclado y la página
  // desplazada, `offsetTop` no coincide con el marco de las cajas (medido en el simulador); `pageTop - scrollY` da 0 allí y da el
  // `offsetTop` donde la vista se amplió con los dedos. Mientras la vista se reacomoda `pageTop` puede ir un cuadro atrás: nunca negativo.
  const desfase = vv ? Math.max(0, vv.pageTop - window.scrollY) : 0;
  let arriba = desfase;
  let abajo = vv ? desfase + vv.height : window.innerHeight;
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

/** Mueve `delta` px lo que se desplaza: el ancestro que lo hace, o la página. Una capa fija sin desplazamiento propio (`ui/CampoLargo`) no tiene nada que mover. */
function desplazar(campo: HTMLElement, delta: number, behavior: ScrollBehavior) {
  if (Math.abs(delta) < 1) return;
  const contenedor = desplazable(campo);
  if (contenedor) contenedor.scrollBy({ top: delta, behavior });
  else if (!enCapaFija(campo)) window.scrollBy({ top: delta, behavior });
}

function enCapaFija(campo: HTMLElement) {
  for (let nodo = campo.parentElement; nodo && nodo !== document.body; nodo = nodo.parentElement) if (getComputedStyle(nodo).position === "fixed") return true;
  return false;
}
