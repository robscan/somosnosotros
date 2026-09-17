"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hoja from "@/components/ui/Hoja";
import { IconoEstrella, IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
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

/** Los mismos iconos que las acciones al deslizar (prototipo de la bitácora 071): Voy con palomita, Me interesa con estrella. */
const OK = <IconoOk width={20} height={20} />;
const ESTRELLA = <IconoEstrella width={20} height={20} />;

/**
 * Barra inferior pegajosa: la única acción primaria de la ficha. Sin decisión: "Me interesa" en texto y "Voy" lleno.
 * Con decisión, la barra pasa a estado: "✓ Voy · Ya estás en la lista" + Cancelar, o "✓ Me interesa" + Voy.
 * Sin sesión, los botones llevan a entrar y la decisión se aplica al volver. La hoja de avisos sale tras el toque de
 * "Voy" (o al volver de entrar tras tocarlo), nunca sola al abrir la ficha (decisión 6 de docs/rediseno/17).
 */
export default function Asistencia({ eventoId, titulo, miEstado, conSesion, avisosPreguntado, correo, llavePush }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [estado, fijarOptimista] = useOptimistic<EstadoAsistencia, EstadoAsistencia>(miEstado, (_a, nuevo) => nuevo);
  const [hoja, setHoja] = useState(false);
  const ruta = `/eventos/${eventoId}`;

  // Volvió de entrar tras tocar "Voy": la pregunta continúa ese toque, una sola vez.
  useEffect(() => {
    if (conSesion && miEstado === "voy" && !avisosPreguntado && tomarIntencion(ruta)) queueMicrotask(() => setHoja(true));
  }, [conSesion, miEstado, avisosPreguntado, ruta]);

  function cambiar(nuevo: EstadoAsistencia) {
    iniciar(async () => {
      fijarOptimista(nuevo);
      await cambiarAsistencia(eventoId, nuevo);
      if (nuevo === "voy" && !avisosPreguntado) setHoja(true);
    });
  }
  const entrar = (accion: string) => `/entrar?siguiente=${encodeURIComponent(`${ruta}?accion=${accion}`)}`;

  let contenido: React.ReactNode;
  if (!conSesion) {
    contenido = (
      <>
        <Link href={entrar("me_interesa")} className={styles.interesa}>
          {ESTRELLA}
          Me interesa
        </Link>
        <Link href={entrar("voy")} className={ficha.primaria} onClick={() => anotarIntencion(ruta)}>
          {OK}
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
          {ESTRELLA}
          Me interesa
          <small>Guardado en Mi perfil</small>
        </span>
        <button type="button" className={ficha.primaria} onClick={() => cambiar("voy")} disabled={pendiente}>
          {OK}
          Voy
        </button>
      </>
    );
  } else {
    contenido = (
      <>
        <button type="button" className={styles.interesa} onClick={() => cambiar("me_interesa")} disabled={pendiente}>
          {ESTRELLA}
          Me interesa
        </button>
        <button type="button" className={ficha.primaria} onClick={() => cambiar("voy")} disabled={pendiente}>
          {OK}
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
          <ConsentimientoAvisos contexto="voy" titulo={titulo} correo={correo} llavePush={llavePush} onListo={() => setHoja(false)} calendarioUrl={`${ruta}/calendario`} />
        </Hoja>
      )}
    </>
  );
}
