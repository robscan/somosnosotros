"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { cambiarSeguimiento } from "../acciones";
import styles from "./ficha.module.css";

type Props = { lugarId: string; sigo: boolean; seguidores: number; conSesion: boolean };

/** Seguir un lugar con un toque (optimista). Sin sesión, lleva a entrar y se aplica al volver. */
export default function Seguir({ lugarId, sigo, seguidores, conSesion }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [estado, fijar] = useOptimistic(sigo, (_a, nuevo: boolean) => nuevo);
  const n = seguidores + (estado && !sigo ? 1 : 0) - (!estado && sigo ? 1 : 0);
  const texto = n === 0 ? "" : n === 1 ? "1 persona lo sigue" : `${n} personas lo siguen`;

  if (!conSesion) {
    return (
      <div className={styles.seguir}>
        <Link href={`/entrar?siguiente=${encodeURIComponent(`/lugares/${lugarId}?accion=seguir`)}`} className={styles.botonSeguir}>
          Seguir
        </Link>
        {texto && <span className={styles.seguidores}>{texto}</span>}
      </div>
    );
  }
  return (
    <div className={styles.seguir}>
      <button
        type="button"
        className={`${styles.botonSeguir} ${estado ? styles.botonSeguirActivo : ""}`}
        aria-pressed={estado}
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            fijar(!estado);
            await cambiarSeguimiento(lugarId, !estado);
          })
        }
      >
        {estado ? "✓ Siguiendo" : "Seguir"}
      </button>
      {texto && <span className={styles.seguidores}>{texto}</span>}
    </div>
  );
}
