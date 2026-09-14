"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Hoja from "@/components/ui/Hoja";
import { IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import type { MotivoReclamo } from "@/lib/reportes";
import { reclamarArtista } from "../acciones";
import styles from "./EsMiNombre.module.css";

type Props = {
  artistaId: string;
  nombre: string;
  conSesion: boolean;
  /** Correo enmascarado: por dónde responde el administrador. */
  correo: string;
  /** Al volver de entrar con la intención puesta: la pregunta emerge sola en una hoja. */
  soloHoja?: boolean;
};

/**
 * "Es mi nombre" (decisión 11): el artista real que encuentra su ficha registrada por otra persona.
 * Dentro del menú ··· se despliega en el sitio, como Reportar y Borrar: dos salidas, "Quiero editarlo yo"
 * o "Quiero que se quite". Termina con evidencia, no promesa: quién lo revisa y por dónde responde.
 * Sin sesión, entra y vuelve con la pregunta ya abierta.
 */
export default function EsMiNombre({ artistaId, nombre, conSesion, correo, soloHoja = false }: Props) {
  const [abierta, setAbierta] = useState(soloHoja);
  const [paso, setPaso] = useState<"elegir" | "hecho">("elegir");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  if (!conSesion) {
    return (
      <Link href={`/entrar?siguiente=${encodeURIComponent(`/artistas/${artistaId}?accion=mio`)}`} className={styles.enlace}>
        Es mi nombre
      </Link>
    );
  }
  function pedir(motivo: MotivoReclamo) {
    iniciar(async () => {
      const r = await reclamarArtista(artistaId, motivo);
      if (r.ok) setPaso("hecho");
      else setError(r.error);
    });
  }
  const cuerpo =
    paso === "hecho" ? (
      <>
        <h3 className={styles.titulo}>Listo</h3>
        <p className={styles.hecho}>
          <IconoOk width={18} height={18} />
          <span>El administrador lo revisa y te escribe a {correo}.</span>
        </p>
      </>
    ) : (
      <>
        <h3 className={styles.titulo}>¿Qué quieres hacer con {nombre}?</h3>
        <p className={styles.porque}>Lo registró otra persona. Puedes pedir la ficha para editarla tú, o pedir que se quite.</p>
        <button type="button" className={`${ficha.primaria} ${styles.editar}`} onClick={() => pedir("es_mio")} disabled={pendiente}>
          Quiero editarlo yo
        </button>
        <button type="button" className={`${ficha.secundario} ${styles.quitar}`} onClick={() => pedir("retirar")} disabled={pendiente}>
          Quiero que se quite
        </button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </>
    );

  if (soloHoja) {
    return abierta ? (
      <Hoja etiqueta="Es mi nombre" onCerrar={() => setAbierta(false)}>
        {cuerpo}
      </Hoja>
    ) : null;
  }
  if (!abierta) {
    return (
      <button type="button" className={styles.enlace} onClick={() => setAbierta(true)}>
        Es mi nombre
      </button>
    );
  }
  return (
    <div className={styles.caja} role="group" aria-label="Es mi nombre">
      {cuerpo}
    </div>
  );
}
