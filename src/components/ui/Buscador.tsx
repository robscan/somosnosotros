"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { IconoBuscar } from "./Iconos";
import styles from "./Buscador.module.css";

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
  return (
    <label className={styles.buscar}>
      <IconoBuscar width={18} height={18} />
      <input type="search" placeholder={placeholder} aria-label={ariaLabel} value={texto} onChange={(e) => cambiar(e.target.value)} autoCapitalize="none" autoCorrect="off" />
      {texto && (
        <button type="button" className={styles.limpiar} onClick={() => cambiar("")} aria-label="Borrar la búsqueda">
          ✕
        </button>
      )}
    </label>
  );
}
