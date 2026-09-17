"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hecho from "@/components/Hecho";
import Hoja from "@/components/ui/Hoja";
import { IconoEstrella, IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
import { cambiarAsistencia, type EstadoAsistencia } from "../acciones";
import styles from "./ficha.module.css";

type Props = {
  eventoId: string;
  titulo: string;
  miEstado: EstadoAsistencia;
  conSesion: boolean;
  /** El id de quien mira ("" sin sesión), para la pregunta de avisos. */
  cuenta: string;
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
 * "Voy" (o al volver de entrar tras tocarlo), nunca sola al abrir la ficha (decisión 6 de docs/rediseno/17). Si no se
 * pudo guardar (o no hay red), la barra vuelve a como estaba y un aviso ofrece Reintentar, como en las listas (bitácora 085).
 */
export default function Asistencia({ eventoId, titulo, miEstado, conSesion, cuenta, avisosPreguntado, correo, llavePush }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [estado, fijarOptimista] = useOptimistic<EstadoAsistencia, EstadoAsistencia>(miEstado, (_a, nuevo) => nuevo);
  const [hoja, setHoja] = useState(false);
  const [fallo, setFallo] = useState<{ nuevo: EstadoAsistencia; vez: number } | null>(null);
  const ruta = `/eventos/${eventoId}`;

  // Volvió de entrar tras tocar "Voy": la pregunta continúa ese toque, una sola vez.
  useEffect(() => {
    if (conSesion && miEstado === "voy" && hayQuePreguntar(cuenta, avisosPreguntado) && tomarIntencion(ruta)) queueMicrotask(() => setHoja(true));
  }, [conSesion, miEstado, cuenta, avisosPreguntado, ruta]);

  function cambiar(nuevo: EstadoAsistencia) {
    iniciar(async () => {
      fijarOptimista(nuevo);
      let guardado = false;
      try {
        guardado = await cambiarAsistencia(eventoId, nuevo);
      } catch {
        guardado = false;
      }
      if (!guardado) {
        setFallo((f) => ({ nuevo, vez: (f?.vez ?? 0) + 1 }));
        return;
      }
      // La pregunta solo tras guardar, y no si esta cuenta ya contestó en esta visita (la ficha puede venir de una copia de hace un rato).
      if (nuevo === "voy" && hayQuePreguntar(cuenta, avisosPreguntado)) setHoja(true);
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
      {fallo && <Hecho key={fallo.vez} texto="No se pudo guardar" etiqueta="Reintentar" fallo sobreBarra onDeshacer={() => cambiar(fallo.nuevo)} onCerrar={() => setFallo((f) => (f?.vez === fallo.vez ? null : f))} />}
      {hoja && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(false)}>
          <ConsentimientoAvisos contexto="voy" titulo={titulo} cuenta={cuenta} correo={correo} llavePush={llavePush} onListo={() => setHoja(false)} calendarioUrl={`${ruta}/calendario`} />
        </Hoja>
      )}
    </>
  );
}
