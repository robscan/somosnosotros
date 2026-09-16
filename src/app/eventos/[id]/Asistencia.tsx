"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hoja from "@/components/ui/Hoja";
import { IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { cambiarAsistencia, type EstadoAsistencia } from "../acciones";
import styles from "./ficha.module.css";

type Props = {
  eventoId: string;
  titulo: string;
  miEstado: EstadoAsistencia;
  conSesion: boolean;
  /** Ya se le preguntó por los avisos; no se vuelve a preguntar. */
  avisosPreguntado: boolean;
  /** Correo enmascarado, para la confirmación. */
  correo: string;
  llavePush: string;
};

const OK = <IconoOk width={20} height={20} />;

/**
 * Barra inferior pegajosa: la única acción primaria de la ficha. Sin decisión: "Me interesa" en texto y "Voy" lleno.
 * Con decisión, la barra pasa a estado: "✓ Voy · Ya estás en la lista" + Cancelar, o "✓ Me interesa" + Voy.
 * Sin sesión, los botones llevan a entrar y la decisión se aplica al volver. Tras el primer Voy emerge la hoja de avisos.
 */
export default function Asistencia({ eventoId, titulo, miEstado, conSesion, avisosPreguntado, correo, llavePush }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [estado, fijarOptimista] = useOptimistic<EstadoAsistencia, EstadoAsistencia>(miEstado, (_a, nuevo) => nuevo);
  // La hoja de avisos aparece una sola vez, tras el primer "Voy" (también si venía de entrar con ?accion=voy).
  const [hoja, setHoja] = useState(!avisosPreguntado && miEstado === "voy" && conSesion);

  function cambiar(nuevo: EstadoAsistencia) {
    iniciar(async () => {
      fijarOptimista(nuevo);
      await cambiarAsistencia(eventoId, nuevo);
      if (nuevo === "voy" && !avisosPreguntado) setHoja(true);
    });
  }
  const entrar = (accion: string) => `/entrar?siguiente=${encodeURIComponent(`/eventos/${eventoId}?accion=${accion}`)}`;

  let contenido: React.ReactNode;
  if (!conSesion) {
    contenido = (
      <>
        <Link href={entrar("me_interesa")} className={styles.interesa}>
          Me interesa
        </Link>
        <Link href={entrar("voy")} className={ficha.primaria}>
          Voy
        </Link>
      </>
    );
  } else if (estado === "voy") {
    contenido = (
      <>
        <span className={ficha.seleccionado} aria-live="polite">
          {OK}
          Voy
          <small>Ya estás en la lista</small>
        </span>
        <button type="button" className={ficha.secundario} onClick={() => cambiar(null)} disabled={pendiente}>
          Cancelar
        </button>
      </>
    );
  } else if (estado === "me_interesa") {
    contenido = (
      <>
        <span className={ficha.seleccionado} aria-live="polite">
          {OK}
          Me interesa
          <small>Guardado en Mi perfil</small>
        </span>
        <button type="button" className={ficha.primaria} onClick={() => cambiar("voy")} disabled={pendiente}>
          Voy
        </button>
      </>
    );
  } else {
    contenido = (
      <>
        <button type="button" className={styles.interesa} onClick={() => cambiar("me_interesa")} disabled={pendiente}>
          Me interesa
        </button>
        <button type="button" className={ficha.primaria} onClick={() => cambiar("voy")} disabled={pendiente}>
          Voy
        </button>
      </>
    );
  }

  return (
    <>
      <div className={`${ficha.accionFija} ${estado ? ficha.accionEstado : ""}`}>{contenido}</div>
      {hoja && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(false)}>
          <ConsentimientoAvisos contexto="voy" titulo={titulo} correo={correo} llavePush={llavePush} onListo={() => setHoja(false)} />
        </Hoja>
      )}
    </>
  );
}
