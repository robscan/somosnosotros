"use client";

import { useState, useTransition } from "react";
import Hoja from "@/components/ui/Hoja";
import { IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import styles from "@/components/ui/Reclamar.module.css";
import type { MotivoReclamo } from "@/lib/reportes";
import { reclamarLugar } from "../acciones";

type Props = {
  lugarId: string;
  nombre: string;
  /** Correo enmascarado: por dónde responde el administrador. */
  correo: string;
  /** De qué catálogo se tomó la ficha; se dice dentro de la hoja, no en la ficha. */
  origen?: string;
};

/**
 * "¿Es tu espacio?" (OL-015, 1b): el mismo camino que "Soy yo / es mi grupo" en Artistas, para los lugares
 * que no tienen dueño (los del catálogo y los institucionales). Al final de la ficha, un letrero discreto en
 * gris que abre la hoja con el origen y dos salidas: llevar la ficha o pedir que se quite. Termina con
 * evidencia, no promesa: quién lo revisa y por dónde responde. Solo se ofrece con sesión y a quien no puede
 * editar ya (sin sesión no se ofrece, para no invitar a reclamos ajenos).
 */
export default function EsMiEspacio({ lugarId, nombre, correo, origen }: Props) {
  const [abierta, setAbierta] = useState(false);
  const [paso, setPaso] = useState<"elegir" | "hecho">("elegir");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function pedir(motivo: MotivoReclamo) {
    iniciar(async () => {
      const r = await reclamarLugar(lugarId, motivo);
      if (r.ok) setPaso("hecho");
      else setError(r.error);
    });
  }

  return (
    <>
      <button type="button" className={styles.discreto} onClick={() => setAbierta(true)}>
        ¿Es tu espacio?
      </button>
      {abierta && (
        <Hoja etiqueta="¿Es tu espacio?" onCerrar={() => setAbierta(false)}>
          {paso === "hecho" ? (
            <>
              <h3 className={styles.titulo}>Listo</h3>
              <p className={styles.hecho}>
                <IconoOk width={18} height={18} />
                <span>El administrador lo revisa y te escribe a {correo}.</span>
              </p>
            </>
          ) : (
            <>
              <h3 className={styles.titulo}>¿Llevas tú {nombre}?</h3>
              <p className={styles.porque}>
                {origen
                  ? `Esta ficha se tomó del ${origen} y está por confirmar. Si el espacio es tuyo, puedes llevarla tú: la editas, le pones foto y publicas lo que pasa ahí. O puedes pedir que se quite.`
                  : "Esta ficha la registró otra persona. Puedes pedirla para llevarla tú: la editas, le pones foto y publicas lo que pasa ahí. O puedes pedir que se quite."}
              </p>
              <button type="button" className={`${ficha.primaria} ${styles.editar}`} onClick={() => pedir("es_mio")} disabled={pendiente}>
                Sí, quiero llevar yo la ficha
              </button>
              <button type="button" className={`${ficha.secundario} ${styles.quitar}`} onClick={() => pedir("retirar")} disabled={pendiente}>
                Sí, y quiero que se quite
              </button>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </Hoja>
      )}
    </>
  );
}
