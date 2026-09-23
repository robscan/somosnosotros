"use client";

import { useState, type ReactNode } from "react";
import Boton from "./Boton";
import Hoja from "./Hoja";
import { IconoEnlace } from "./Iconos";
import { debeAvisar, guardarSinAvisoSalida, sinAvisoSalida } from "@/lib/avisoSalida";
import { dominioDe } from "@/lib/enlaces";
import styles from "./EnlaceExterno.module.css";

type Props = { href: string; className?: string; children: ReactNode; ariaLabel?: string };

const alm = () => (typeof window === "undefined" ? null : window.localStorage);

/**
 * Un enlace de verdad (`<a href>`, `target="_blank" rel="noopener noreferrer"`) a un tercero (boletos de un evento,
 * redes o sitio de un artista o lugar). Antes de salir, una hoja dice a qué dominio se va (OL-105,
 * docs/rediseno/29-aviso-al-salir.md). Sin JavaScript, con clic central o Ctrl/Cmd+clic sigue funcionando como
 * cualquier enlace — la hoja es una mejora, nunca un paso obligado. OL-139 (founder, 2026-09-23: «decimos que puede
 * que te pidan dinero o tus datos. No podríamos generalizar»): la hoja ya no afirma qué le pedirán; solo dice que
 * ese sitio es ajeno (las tres opciones de texto, en la bitácora 174).
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
          {/* Todo dentro de un mismo contenedor (como ui/SalirSinPublicar), no directo hijo de la hoja: así el
              título no hereda el margen que ui/Hoja.module.css da a "h3 seguido de p" (aquí sigue una tarjeta,
              no un párrafo) y el espaciado se resuelve con una sola regla de grid, no botón por botón. */}
          <div className={styles.contenido}>
            <h3>Vas a salir de Somos Nosotros</h3>
            <div className={styles.dominio}>
              <IconoEnlace width={20} height={20} />
              <span className={styles.texto}>{dominioDe(href)}</span>
            </div>
            <p className={styles.porque}>Ese sitio no es de Somos Nosotros: tiene sus propias reglas.</p>
            <Boton type="button" onClick={continuar}>
              Continuar
            </Boton>
            <Boton type="button" variante="secundario" onClick={quedarme}>
              Quedarme aquí
            </Boton>
            <label className={styles.marcar}>
              <input type="checkbox" checked={marcar} onChange={(e) => setMarcar(e.target.checked)} />
              No volver a avisarme
            </label>
          </div>
        </Hoja>
      )}
    </>
  );
}
