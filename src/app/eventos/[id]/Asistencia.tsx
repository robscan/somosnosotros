"use client";

import Link from "next/link";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import ConsentimientoAvisos from "@/components/ConsentimientoAvisos";
import Hoja from "@/components/ui/Hoja";
import { IconoEstrella, IconoOk } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { useAltoBarraFija } from "@/components/ui/useAltoBarraFija";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { anotarIntencion, tomarIntencion } from "@/lib/intencionAvisos";
import { esElUltimo, siSigueSiendoElUltimo, tocar, type Toques } from "@/lib/toques";
import { AvisoAbajo, HojaAbierta, useCanalDeListas, useCanalDePantalla } from "@/components/useCanalDeListas";
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
 * Cada toque lleva su número (lib/toques): uno nuevo cierra el aviso de un fallo anterior, y Reintentar solo actúa si su
 * toque sigue siendo el último. El aviso y la pregunta son de toda la pantalla (useCanalDeListas), como en las demás fichas.
 */
export default function Asistencia({ eventoId, titulo, miEstado, conSesion, cuenta, avisosPreguntado, correo, llavePush }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [estado, fijarOptimista] = useOptimistic<EstadoAsistencia, EstadoAsistencia>(miEstado, (_a, nuevo) => nuevo);
  const [hoja, setHoja] = useState(false);
  const toques = useRef<Toques>({});
  const barra = useAltoBarraFija<HTMLDivElement>();
  const propio = useCanalDeListas();
  const dePantalla = useCanalDePantalla();
  const canal = dePantalla ?? propio;
  const { avisar, limpiar, tomarPregunta } = canal;
  // El dueño de sus avisos en la pantalla: al tocar quita el suyo, nunca el Reintentar de un renglón.
  const de = useId();
  const ruta = `/eventos/${eventoId}`;

  // Volvió de entrar tras tocar "Voy": la pregunta continúa ese toque, una sola vez.
  useEffect(() => {
    if (conSesion && miEstado === "voy" && hayQuePreguntar(cuenta, avisosPreguntado) && tomarIntencion(ruta) && tomarPregunta()) queueMicrotask(() => setHoja(true));
  }, [conSesion, miEstado, cuenta, avisosPreguntado, ruta, tomarPregunta]);

  function cambiar(nuevo: EstadoAsistencia) {
    const vez = tocar(toques.current, eventoId);
    limpiar(de);
    iniciar(async () => {
      fijarOptimista(nuevo);
      let guardado = false;
      try {
        guardado = await cambiarAsistencia(eventoId, nuevo);
      } catch {
        guardado = false;
      }
      if (!esElUltimo(toques.current, eventoId, vez)) return;
      if (!guardado) {
        avisar({ texto: "No se pudo guardar", etiqueta: "Reintentar", fallo: true, de, boton: siSigueSiendoElUltimo(toques.current, eventoId, vez, () => cambiar(nuevo)) });
        return;
      }
      // La pregunta solo tras guardar, una por pantalla, y no si esta cuenta ya contestó en esta visita.
      if (nuevo === "voy" && hayQuePreguntar(cuenta, avisosPreguntado) && tomarPregunta()) setHoja(true);
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
      <div ref={barra} className={`${ficha.accionFija} ${estado ? ficha.accionEstado : ""}`}>
        {contenido}
      </div>
      {!dePantalla && <AvisoAbajo canal={propio} />}
      {hoja && <HojaAbierta canal={canal} />}
      {hoja && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(false)}>
          <ConsentimientoAvisos contexto="voy" titulo={titulo} cuenta={cuenta} correo={correo} llavePush={llavePush} onListo={() => setHoja(false)} calendarioUrl={`${ruta}/calendario`} />
        </Hoja>
      )}
    </>
  );
}
