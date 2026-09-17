"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Hoja from "@/components/ui/Hoja";
import { IconoDestello, IconoLapiz, IconoOjo, IconoOjoTachado, IconoPuntos } from "@/components/ui/Iconos";
import { TIPO_DE, textoDestacar, textoMotivo, type Destacado } from "@/lib/destacados";
import { rutaEditar, textoOcultar } from "@/lib/panel";
import { cambiarDestacado, cambiarVisibilidad } from "../acciones";
import styles from "../admin.module.css";

/**
 * Los tres puntos de cada renglón (decisión 10): el mismo menú de las fichas, con ocultar al final y aparte. Ocultar no
 * pregunta: el menú es la capa y la etiqueta "Oculto" del renglón, que llega de nuevo del servidor, es la evidencia.
 */
export default function MenuFicha({ seccion, id, nombre, visible, destacado }: { seccion: "lugares" | "eventos" | "artistas"; id: string; nombre: string; visible: boolean; destacado: Destacado | null }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();

  function alternar() {
    setError(null);
    iniciar(async () => {
      const r = await cambiarVisibilidad(TIPO_DE[seccion], id, !visible);
      if (r.ok) setAbierto(false);
      else setError(r.error);
    });
  }

  // Destacar o quitar no pregunta: el menú es la capa y la etiqueta del renglón, la evidencia (como Ocultar).
  function destacar() {
    setError(null);
    iniciar(async () => {
      const r = await cambiarDestacado(TIPO_DE[seccion], id, destacado ? "quitado" : "elegido");
      if (r.ok) setAbierto(false);
      else setError(r.error);
    });
  }

  return (
    <>
      <button type="button" className={styles.puntos} onClick={() => setAbierto(true)} aria-label={`Más acciones de ${nombre}`} aria-haspopup="dialog">
        <IconoPuntos width={22} height={22} />
      </button>
      {abierto && (
        <Hoja etiqueta={`Acciones de ${nombre}`} onCerrar={() => setAbierto(false)}>
          <h3>{nombre}</h3>
          <ul className={styles.menu}>
            <li>
              <Link href={`/${seccion}/${id}`} className={styles.menuItem}>
                <IconoOjo width={20} height={20} />
                Ver la ficha
              </Link>
            </li>
            <li>
              <Link href={rutaEditar(seccion, id)} className={styles.menuItem}>
                <IconoLapiz width={20} height={20} />
                Editar
              </Link>
            </li>
            {visible && (
              <li>
                <button type="button" className={`${styles.menuItem} ${styles.menuDestacar}`} disabled={enCamino} onClick={destacar}>
                  <IconoDestello width={20} height={20} />
                  {destacado ? "Quitar de destacados" : "Destacar"}
                  <small>{destacado ? textoMotivo(destacado, TIPO_DE[seccion]) : textoDestacar(TIPO_DE[seccion])}</small>
                </button>
              </li>
            )}
            <li>
              <button type="button" className={styles.menuItem} disabled={enCamino} onClick={alternar}>
                {visible ? <IconoOjoTachado width={20} height={20} /> : <IconoOjo width={20} height={20} />}
                {enCamino ? (visible ? "Ocultando…" : "Mostrando…") : textoOcultar(seccion, visible)}
              </button>
            </li>
          </ul>
          {error && (
            <p className="aviso-error" role="alert">
              {error}
            </p>
          )}
        </Hoja>
      )}
    </>
  );
}
