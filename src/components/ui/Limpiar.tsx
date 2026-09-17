"use client";

import { IconoCerrar } from "./Iconos";
import styles from "./Limpiar.module.css";

/**
 * La ✕ que vacía un campo de texto (pedido del founder, 2026-09-16). Va justo después del input, dentro de una caja
 * con `position: relative` (el campo del canon o `caja`), y solo aparece cuando hay texto. Vacía el campo como si la
 * persona hubiera borrado (dispara el evento `input`, así el `onChange` de React y todo lo que cuelga de él corren),
 * y deja el foco en el campo para seguir escribiendo.
 */
export default function Limpiar({ visible, etiqueta = "Borrar lo escrito" }: { visible: boolean; etiqueta?: string }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className={styles.limpiar}
      aria-label={etiqueta}
      onMouseDown={(e) => e.preventDefault()} /* el campo no pierde el foco ni se cierra el teclado */
      onClick={(e) => {
        const campo = e.currentTarget.previousElementSibling;
        if (!(campo instanceof HTMLInputElement) && !(campo instanceof HTMLTextAreaElement)) return;
        const proto = campo instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(campo, "");
        campo.dispatchEvent(new Event("input", { bubbles: true }));
        campo.focus();
      }}
    >
      <IconoCerrar width={16} height={16} />
    </button>
  );
}
