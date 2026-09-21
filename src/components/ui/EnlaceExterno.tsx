"use client";

import { useState, type ReactNode } from "react";
import Hoja from "./Hoja";
import { IconoEnlace } from "./Iconos";
import { debeAvisar, guardarSinAvisoSalida, sinAvisoSalida } from "@/lib/avisoSalida";
import { dominioDe } from "@/lib/enlaces";
import styles from "./EnlaceExterno.module.css";

type Props = { href: string; className?: string; children: ReactNode; ariaLabel?: string };

const alm = () => (typeof window === "undefined" ? null : window.localStorage);

/**
 * Un enlace de verdad (`<a href>`, `target="_blank" rel="noopener noreferrer"`) a un tercero donde pueden pedir
 * pago o datos (boletos de un evento, redes o sitio de un artista o lugar). Antes de salir, una hoja dice a qué
 * dominio se va (OL-105, docs/rediseno/29-aviso-al-salir.md). Sin JavaScript, con clic central o Ctrl/Cmd+clic
 * sigue funcionando como cualquier enlace — la hoja es una mejora, nunca un paso obligado.
 */
export default function EnlaceExterno({ href, className, children, ariaLabel }: Props) {
  const [abierta, setAbierta] = useState(false);
  const [marcar, setMarcar] = useState(false);

  function alTocar(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!debeAvisar({ href, boton: e.button, meta: e.metaKey, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, sinAviso: sinAvisoSalida(alm()) })) return;
    e.preventDefault();
    setMarcar(false);
    setAbierta(true);
  }
  function guardarSiMarco() {
    if (marcar) guardarSinAvisoSalida(alm(), true);
  }
  function continuar() {
    guardarSiMarco();
    setAbierta(false);
    window.open(href, "_blank", "noopener,noreferrer");
  }
  function quedarme() {
    guardarSiMarco();
    setAbierta(false);
  }

  return (
    <>
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} onClick={alTocar}>
        {children}
      </a>
      {abierta && (
        <Hoja etiqueta="Vas a salir de Somos Nosotros" onCerrar={quedarme}>
          <h3>Vas a salir de Somos Nosotros</h3>
          <div className={styles.dominio}>
            <IconoEnlace width={20} height={20} />
            <span className={styles.texto}>Vas a {dominioDe(href)}</span>
          </div>
          <p className={styles.porque}>Ahí puede que te pidan un pago o tus datos.</p>
          <button type="button" className={styles.continuar} onClick={continuar}>
            Continuar
          </button>
          <button type="button" className={styles.quedarme} onClick={quedarme}>
            Quedarme aquí
          </button>
          <label className={styles.marcar}>
            <input type="checkbox" checked={marcar} onChange={(e) => setMarcar(e.target.checked)} />
            No volver a avisarme
          </label>
        </Hoja>
      )}
    </>
  );
}
