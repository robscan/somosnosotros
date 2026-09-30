"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type Ref } from "react";
import { IconoBuscar, IconoCerrar } from "./Iconos";
import styles from "./Buscador.module.css";

type PropsCampo = {
  valor: string;
  onCambiar: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** Con foco al aparecer. */
  autoFocus?: boolean;
  /** Para enfocar el campo desde fuera. */
  inputRef?: Ref<HTMLInputElement>;
  /** Con texto, la ✕ que lo borra (por defecto sí). Buscar no la lleva: junto a su campo va la de cerrar. */
  borrar?: boolean;
};

/** El campo de búsqueda a secas (icono, texto, ✕): lo usan el Buscador de la URL (administración), Buscar y «Otra ciudad». */
export function CampoBuscar({ valor, onCambiar, placeholder, ariaLabel, autoFocus = false, inputRef, borrar = true }: PropsCampo) {
  return (
    <label className={styles.buscar}>
      <IconoBuscar width={18} height={18} />
      <input ref={inputRef} type="search" placeholder={placeholder} aria-label={ariaLabel} value={valor} onChange={(e) => onCambiar(e.target.value)} autoCapitalize="none" autoCorrect="off" autoFocus={autoFocus} enterKeyHint="search" />
      {borrar && valor && (
        <button type="button" className={styles.limpiar} onMouseDown={(e) => e.preventDefault()} onClick={() => onCambiar("")} aria-label="Borrar la búsqueda">
          <IconoCerrar width={16} height={16} />
        </button>
      )}
    </label>
  );
}

type Props = { valor: string; placeholder: string; ariaLabel: string };

/**
 * Búsqueda que vive en la URL (`?q=`): lo escrito se manda al servidor 300 ms después de dejar de teclear,
 * la página vuelve filtrada y el enlace se puede compartir o volver atrás sin perder nada.
 * Al cambiar la búsqueda se vuelve a la primera página (`n` fuera). Lo usa la administración; la búsqueda de la app es Buscar.
 */
export default function Buscador({ valor, placeholder, ariaLabel }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(valor);
  const espera = useRef<number | undefined>(undefined);

  function ir(v: string) {
    const p = new URLSearchParams(params.toString());
    if (v.trim()) p.set("q", v.trim());
    else p.delete("q");
    p.delete("n");
    const cadena = p.toString();
    router.replace(cadena ? `${ruta}?${cadena}` : ruta, { scroll: false });
  }
  function cambiar(v: string) {
    setTexto(v);
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => ir(v), 300);
  }
  return <CampoBuscar valor={texto} onCambiar={cambiar} placeholder={placeholder} ariaLabel={ariaLabel} />;
}
