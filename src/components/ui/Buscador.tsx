"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { IconoBuscar, IconoCerrar } from "./Iconos";
import styles from "./Buscador.module.css";

type PropsCampo = {
  valor: string;
  onCambiar: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** Con foco al aparecer (cuando lo abre un toque, como la lupa de la agenda). */
  autoFocus?: boolean;
  /** Al borrar con la ✕ (si no se da, la ✕ solo vacía el texto). */
  onCerrar?: () => void;
  onFocus?: () => void;
  className?: string;
};

/** El campo de búsqueda a secas (icono, texto, ✕): lo usan el Buscador de la URL y la agenda, que filtra en el teléfono. */
export function CampoBuscar({ valor, onCambiar, placeholder, ariaLabel, autoFocus = false, onCerrar, onFocus, className = "" }: PropsCampo) {
  return (
    <label className={`${styles.buscar} ${className}`}>
      <IconoBuscar width={18} height={18} />
      <input type="search" placeholder={placeholder} aria-label={ariaLabel} value={valor} onChange={(e) => onCambiar(e.target.value)} autoCapitalize="none" autoCorrect="off" autoFocus={autoFocus} onFocus={onFocus} enterKeyHint="search" />
      {(valor || onCerrar) && (
        <button type="button" className={styles.limpiar} onMouseDown={(e) => e.preventDefault()} onClick={() => (onCerrar ? onCerrar() : onCambiar(""))} aria-label={onCerrar ? "Cerrar la búsqueda" : "Borrar la búsqueda"}>
          <IconoCerrar width={16} height={16} />
        </button>
      )}
    </label>
  );
}

type Props = { valor: string; placeholder: string; ariaLabel: string; clave?: string };

/**
 * Búsqueda que vive en la URL (`?q=`): lo escrito se manda al servidor 300 ms después de dejar de teclear,
 * la página vuelve filtrada y el enlace se puede compartir o volver atrás sin perder nada.
 * Al cambiar la búsqueda se vuelve a la primera página (`n` fuera).
 */
export default function Buscador({ valor, placeholder, ariaLabel, clave = "q" }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(valor);
  const espera = useRef<number | undefined>(undefined);

  function ir(v: string) {
    const p = new URLSearchParams(params.toString());
    if (v.trim()) p.set(clave, v.trim());
    else p.delete(clave);
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
