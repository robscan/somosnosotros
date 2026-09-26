"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bloquear } from "@/app/personas/acciones";
import Hoja from "@/components/ui/Hoja";
import { IconoBloquear } from "@/components/ui/Iconos";
import styles from "./Bloquear.module.css";

type Props = { personaId: string; nombre: string; volver: string; conSesion: boolean };

/**
 * "Bloquear" en el menú "···" de la ficha ajena (OL-203, guía 1.2 de App Store: mecanismo de bloqueo de quien
 * abusa, junto al de reportar). Un renglón que abre una hoja de confirmación en texto llano: qué pasa, que no se
 * avisa a la otra persona, y que se deshace. Sin sesión, lleva a entrar (mismo criterio que Reportar).
 */
export default function Bloquear({ personaId, nombre, volver, conSesion }: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!conSesion)
    return (
      <Link href={`/entrar?siguiente=${encodeURIComponent(volver)}`} className={styles.enlace}>
        Bloquear
      </Link>
    );

  function confirmar() {
    setError(null);
    iniciar(async () => {
      const r = await bloquear(personaId);
      if (r.ok) {
        setAbierta(false);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <>
      <button type="button" className={styles.enlace} onClick={() => setAbierta(true)}>
        Bloquear
      </button>
      {abierta && (
        <Hoja etiqueta={`Bloquear a ${nombre}`} onCerrar={() => setAbierta(false)}>
          <div className={styles.confirmar}>
            <span className={styles.icono} aria-hidden="true">
              <IconoBloquear width={28} height={28} />
            </span>
            <h3>¿Bloquear a {nombre}?</h3>
            <p>Dejas de ver sus eventos y sus novedades en Inicio y en la Agenda. {nombre} no recibe ningún aviso. Puedes deshacerlo cuando quieras, desde Ajustes.</p>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button type="button" className={styles.confirmarBoton} disabled={pendiente} onClick={confirmar}>
              {pendiente ? "Bloqueando…" : "Sí, bloquear"}
            </button>
            <button type="button" className={styles.cancelar} onClick={() => setAbierta(false)} disabled={pendiente}>
              Cancelar
            </button>
          </div>
        </Hoja>
      )}
    </>
  );
}
