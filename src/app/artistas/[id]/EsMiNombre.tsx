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
  /** En la ficha por confirmar (del CAPO): al final, un letrero discreto "¿Eres tú o tu banda?" que abre la hoja. */
  discreto?: boolean;
  /** De qué catálogo se tomó la ficha; se dice dentro de la hoja, no en la ficha. */
  origen?: string;
};

/**
 * "Soy yo / es mi grupo" (decisión 11; texto elegido por el founder el 2026-09-14, el mismo del interruptor del alta):
 * el artista real que encuentra su ficha registrada por otra persona.
 * Dentro del menú ··· se despliega en el sitio, como Reportar y Borrar: dos salidas, "Quiero editarlo yo"
 * o "Quiero que se quite". Termina con evidencia, no promesa: quién lo revisa y por dónde responde.
 * Sin sesión, entra y vuelve con la pregunta ya abierta.
 */
export default function EsMiNombre({ artistaId, nombre, conSesion, correo, soloHoja = false, discreto = false, origen }: Props) {
  const [abierta, setAbierta] = useState(soloHoja);
  const [paso, setPaso] = useState<"elegir" | "hecho">("elegir");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const claseDisparador = discreto ? styles.discreto : styles.enlace;
  const textoDisparador = discreto ? "¿Eres tú o tu banda?" : "Soy yo / es mi grupo";

  if (!conSesion) {
    return (
      <Link href={`/entrar?siguiente=${encodeURIComponent(`/artistas/${artistaId}?accion=mio`)}`} className={claseDisparador}>
        {textoDisparador}
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
        <h3 className={styles.titulo}>¿Eres {nombre}?</h3>
        <p className={styles.porque}>
          {origen ? `Esta ficha se tomó del ${origen} y está por confirmar. Si es tuya, puedes llevarla tú: la editas, le pones foto y publicas tus fechas. O puedes pedir que se quite.` : "Esta ficha la registró otra persona. Puedes pedirla para llevarla tú, o pedir que se quite."}
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
    );

  if (soloHoja || discreto) {
    // Discreto: el letrero abre la hoja con todo el texto; mientras, en la ficha solo se ve la pregunta.
    return (
      <>
        {discreto && !soloHoja && (
          <button type="button" className={styles.discreto} onClick={() => setAbierta(true)}>
            {textoDisparador}
          </button>
        )}
        {abierta && (
          <Hoja etiqueta={discreto ? "¿Eres tú o tu banda?" : "Soy yo / es mi grupo"} onCerrar={() => setAbierta(false)}>
            {cuerpo}
          </Hoja>
        )}
      </>
    );
  }
  if (!abierta) {
    return (
      <button type="button" className={claseDisparador} onClick={() => setAbierta(true)}>
        {textoDisparador}
      </button>
    );
  }
  return (
    <div className={styles.caja} role="group" aria-label="Soy yo / es mi grupo">
      {cuerpo}
    </div>
  );
}
