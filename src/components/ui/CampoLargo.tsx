"use client";

import { useEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import ContadorCaracteres from "./ContadorCaracteres";
import { IconoChevronDerecha } from "./Iconos";
import campo from "./Campo.module.css";
import styles from "./CampoLargo.module.css";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  describedBy?: string;
  mostrarContador?: boolean;
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
export default function CampoLargo({ id, etiqueta, ayuda, error, describedBy, mostrarContador, ...resto }: Props) {
  const { value, defaultValue, onChange, placeholder, name, ...campos } = resto;
  const [abierto, setAbierto] = useState(false);
  // Controlado (FormularioEvento: value+onChange), el valor de fuera manda siempre; sin controlar (Lugar,
  // Artista: defaultValue), este componente lleva su propio estado desde el valor inicial.
  const controlado = typeof value === "string";
  const [interno, setInterno] = useState(() => (typeof defaultValue === "string" ? defaultValue : ""));
  const texto = controlado ? value : interno;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const tope = typeof resto.maxLength === "number" ? resto.maxLength : 0;

  useEffect(() => {
    if (abierto) areaRef.current?.focus();
  }, [abierto]);

  function alCambiar(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!controlado) setInterno(e.target.value);
    onChange?.(e);
  }

  if (!abierto) {
    return (
      <div className={campo.campo}>
        <button
          type="button"
          id={id}
          className={error ? `${styles.renglon} ${styles.renglonError}` : styles.renglon}
          aria-describedby={describedBy}
          aria-label={etiqueta}
          onClick={() => setAbierto(true)}
        >
          <span className={styles.filaEtiqueta}>
            <span className={styles.etiquetaRenglon}>{etiqueta}</span>
            {mostrarContador && tope > 0 && <ContadorCaracteres valor={texto} tope={tope} error={error} />}
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
    <div className={styles.capa} role="dialog" aria-label={etiqueta}>
      <div className={styles.cabecera}>
        <h2>{etiqueta}</h2>
        {mostrarContador && tope > 0 && <ContadorCaracteres valor={texto} tope={tope} error={error} />}
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
