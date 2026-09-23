import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import Limpiar from "./Limpiar";
import ContadorCaracteres from "./ContadorCaracteres";
import CampoLargo from "./CampoLargo";
import limpiar from "./Limpiar.module.css";
import styles from "./Campo.module.css";

type Base = { etiqueta: string; ayuda?: string; error?: string; name: string; mostrarContador?: boolean };
type PropsInput = Base & { multilinea?: false } & InputHTMLAttributes<HTMLInputElement>;
type PropsArea = Base & { multilinea: true } & TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Campo de formulario con etiqueta visible, ayuda y error debajo. Multilínea (hoy: descripción de evento, lugar y
 * artista) se abre a pantalla completa al tocarlo — ver CampoLargo, OL-147.
 */
export default function Campo(props: PropsInput | PropsArea) {
  const { etiqueta, ayuda, error, name, mostrarContador } = props;
  const id = `campo-${name}`;
  const describedBy = [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  if (props.multilinea) {
    return <CampoLargo id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} describedBy={describedBy} mostrarContador={mostrarContador} {...omitir(props)} />;
  }
  const valor = typeof props.value === "string" ? props.value : "";
  const tope = typeof props.maxLength === "number" ? props.maxLength : 0;
  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.etiqueta}>
        {etiqueta}
        {mostrarContador && tope > 0 && <ContadorCaracteres valor={valor} tope={tope} error={error} />}
      </label>
      <span className={limpiar.caja}>
        <input id={id} className={styles.control} aria-invalid={!!error} aria-describedby={describedBy} {...omitir(props)} />
        <Limpiar visible={typeof props.value === "string" && props.value.length > 0} />
      </span>
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

function omitir<T extends Base & { multilinea?: boolean }>(p: T) {
  const { etiqueta: _e, ayuda: _a, error: _r, multilinea: _m, ...rest } = p;
  void _e;
  void _a;
  void _r;
  void _m;
  return rest;
}
