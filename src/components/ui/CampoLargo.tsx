"use client";

import { useEffect, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import ContadorCaracteres from "./ContadorCaracteres";
import { IconoChevronDerecha } from "./Iconos";
import useAreaVisible from "./useAreaVisible";
import campo from "./Campo.module.css";
import styles from "./CampoLargo.module.css";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  describedBy?: string;
  mostrarContador?: boolean;
  /** El contador a la vista desde el primer carácter (OL-458, el texto de Instagram); sin él, sale al 75 %. */
  contadorSiempre?: boolean;
};

/**
 * Campo de texto largo (descripción de evento, lugar y artista): cerrado es un renglón con el texto resumido a
 * dos líneas; al tocarlo se abre a pantalla completa (cabecera fija con el título, el contador si el campo tiene
 * límite hoy, y "Listo") para que el texto nunca se corte — variante B firmada por el founder
 * (docs/rediseno/39-texto-largo.md, OL-147). "Listo" cierra y vuelve al renglón resumido.
 *
 * Sin `pushState`: en Safari de iPhone el Atrás del navegador retrocede por documento, no por entrada añadida
 * (docs/heredado no aplica aquí; ver notas del proyecto), así que esta capa no toca el historial. El texto no se
 * pierde al cerrar (con "Listo" o dejando la pantalla) porque el valor vive en este componente, no en el DOM del
 * `<textarea>`: cerrado, un `<input type="hidden">` con el mismo `name` sigue llevando el valor al FormData del
 * formulario, controlado o no lo haya montado quien llama.
 */
export default function CampoLargo({ id, etiqueta, ayuda, error, describedBy, mostrarContador, contadorSiempre = false, ...resto }: Props) {
  const { value, defaultValue, onChange, placeholder, name, ...campos } = resto;
  const [abierto, setAbierto] = useState(false);
  // Controlado (lo opcional de los pasos del evento: value+onChange), el valor de fuera manda siempre; sin controlar (Lugar,
  // Artista: defaultValue), este componente lleva su propio estado desde el valor inicial.
  const controlado = typeof value === "string";
  const [interno, setInterno] = useState(() => (typeof defaultValue === "string" ? defaultValue : ""));
  const texto = controlado ? value : interno;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const renglonRef = useRef<HTMLButtonElement>(null);
  // Dónde estaba lo que se desplaza bajo el renglón al abrir (OL-468): con la capa abierta el renglón sale de ahí, lo de debajo se acorta y su
  // desplazamiento se recorta solo; al cerrar con «Listo» se repone, para volver al renglón y no a otra parte (en la hoja de Instagram, arriba).
  const vuelta = useRef<{ donde: Element; top: number } | null>(null);
  const tope = typeof resto.maxLength === "number" ? resto.maxLength : 0;

  // Con el teclado abierto, la capa arranca donde arranca el área visible (no en la ventana de maquetación, que el teclado deja
  // desplazada) y su blanco sigue hasta abajo de la ventana: el visualViewport termina antes de la barra translúcida de iOS 26
  // (flechas y píldora de la dirección), y por ahí se vería la página. El relleno inferior deja cabecera y texto en el área visible.
  const visible = useAreaVisible(abierto);

  useEffect(() => {
    const area = areaRef.current;
    if (!abierto || !area) return;
    area.focus();
    // El cursor al final del texto existente, y esa posición a la vista.
    area.setSelectionRange(area.value.length, area.value.length);
    area.scrollTop = area.scrollHeight;
  }, [abierto]);

  // Mientras la capa está abierta, la página de detrás no se mueve (OL-468). En la app de la tienda (WKWebView con el teclado en modo `body`) iOS
  // desplaza la página para revelar el área de texto al salir el teclado, aunque la capa ya la tenga a la vista y la página esté quieta
  // (`html[data-capas]`); con la página desplazada, lo fijo queda pintado más abajo de donde recibe los toques (medido en el simulador: 46 px, y
  // «Listo» no respondía: el toque caía en el área de texto). Detrás de una capa que lo cubre todo no hay nada que revelar: se devuelve.
  useEffect(() => {
    if (!abierto) return;
    const quieta = window.scrollY;
    const devolver = () => {
      if (Math.abs(window.scrollY - quieta) >= 1) window.scrollTo(0, quieta);
    };
    window.addEventListener("scroll", devolver, { passive: true });
    return () => window.removeEventListener("scroll", devolver);
  }, [abierto]);

  useLayoutEffect(() => {
    const antes = vuelta.current;
    if (abierto || !antes) return;
    vuelta.current = null;
    if (Math.abs(antes.donde.scrollTop - antes.top) >= 1) antes.donde.scrollTop = antes.top;
  }, [abierto]);

  function abrir() {
    const donde = renglonRef.current ? desplazableDe(renglonRef.current) : null;
    vuelta.current = donde ? { donde, top: donde.scrollTop } : null;
    setAbierto(true);
  }

  function alCambiar(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!controlado) setInterno(e.target.value);
    onChange?.(e);
  }

  if (!abierto) {
    return (
      <div className={campo.campo}>
        <button
          ref={renglonRef}
          type="button"
          id={id}
          className={error ? `${styles.renglon} ${styles.renglonError}` : styles.renglon}
          aria-describedby={describedBy}
          aria-label={etiqueta}
          onClick={abrir}
        >
          <span className={styles.filaEtiqueta}>
            <span className={styles.etiquetaRenglon}>{etiqueta}</span>
            {mostrarContador && tope > 0 && <ContadorCaracteres valor={texto} tope={tope} error={error} siempre={contadorSiempre} />}
          </span>
          <span className={texto ? styles.resumen : styles.resumenVacio}>{texto || placeholder}</span>
          <IconoChevronDerecha width={18} height={18} className={styles.chevron} />
        </button>
        <input type="hidden" name={name} value={texto} />
        {ayuda && !error && (
          <p id={`${id}-ayuda`} className={styles.ayuda}>
            {ayuda}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.capa} role="dialog" aria-label={etiqueta} style={visible ? { top: visible.top, height: visible.ventana, bottom: "auto", paddingBottom: visible.ventana - visible.height } : undefined}>
      <div className={styles.cabecera}>
        <h2>{etiqueta}</h2>
        {mostrarContador && tope > 0 && <ContadorCaracteres valor={texto} tope={tope} error={error} siempre={contadorSiempre} />}
        <button type="button" className={styles.listo} onClick={() => setAbierto(false)}>
          Listo
        </button>
      </div>
      <textarea
        ref={areaRef}
        id={id}
        name={name}
        className={styles.area}
        value={texto}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        aria-label={etiqueta}
        onChange={alCambiar}
        {...campos}
      />
    </div>
  );
}

/** Lo que se desplaza bajo el renglón: el ancestro más cercano con desplazamiento propio (el cuerpo de una hoja) o, si no hay, la página. */
function desplazableDe(el: HTMLElement): Element | null {
  for (let nodo = el.parentElement; nodo && nodo !== document.body; nodo = nodo.parentElement) {
    const { overflowY } = getComputedStyle(nodo);
    if (overflowY === "auto" || overflowY === "scroll") return nodo;
  }
  return document.scrollingElement;
}
