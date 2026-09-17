"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { cambiarAsistencia } from "@/app/eventos/acciones";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { accionesEvento, asistenciaTras, recortar, textoHecho, type Asistencia, type ClaveAccion } from "@/lib/deslizar";
import { anotarIntencion } from "@/lib/intencionAvisos";
import { alRecibir, elegir, esElUltimo, siSigueSiendoElUltimo, tocar, trasGuardar, type Elegidas, type Toques } from "@/lib/toques";
import ConsentimientoAvisos from "./ConsentimientoAvisos";
import type { AccionDeslizable } from "./ui/Deslizable";
import Hoja from "./ui/Hoja";
import { IconoEstrella, IconoOk } from "./ui/Iconos";
import { AvisoAbajo, HojaAbierta, useCanalDeListas, type CanalDeListas } from "./useCanalDeListas";
import type { AvisosLista } from "./useSeguirEnLista";

/** Lo que la persona decidió en cada evento cargado; null = sin sesión. */
export type Decididas = Record<string, Exclude<Asistencia, null>> | null;
type EventoLista = { id: string; titulo: string };

/**
 * Voy y Me interesa al deslizar un evento (decisión del founder, 2026-09-17; bitácora 085): lo que la persona decidió, las
 * dos acciones del renglón, el aviso con Deshacer y, tras el primer Voy guardado, la misma pregunta de avisos que la
 * ficha. Guarda con la misma acción de la ficha, así el estado es uno solo; sin sesión, lleva a entrar y la ficha lo
 * aplica al volver. Si no se pudo guardar, deshace lo mostrado y ofrece Reintentar, sin tumbar la pantalla.
 *
 * Lo que llega del servidor manda (al volver de la ficha, en la respuesta de la acción): lo elegido aquí se superpone
 * solo mientras se guarda. Cada toque lleva su número por renglón (lib/toques): lo que trae un guardado viejo se ignora.
 *
 * `canal`: el aviso y la pregunta de avisos compartidos con las otras listas de la pantalla (useCanalDeListas); sin él,
 * la lista tiene los suyos y pinta su aviso en `extras`.
 */
export function useAsistenciaEnLista(decididas: Decididas, avisos: AvisosLista | null, canal?: CanalDeListas): { estado: (id: string) => Asistencia; acciones: (e: EventoLista) => AccionDeslizable[]; extras: ReactNode } {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [elegidas, setElegidas] = useState<Elegidas<Asistencia>>({});
  const [recibidas, setRecibidas] = useState(decididas);
  if (decididas !== recibidas) {
    setRecibidas(decididas);
    setElegidas(alRecibir);
  }
  const toques = useRef<Toques>({});
  const propio = useCanalDeListas();
  const { avisar, tomarPregunta } = canal ?? propio;
  const [hoja, setHoja] = useState<EventoLista | null>(null);

  const estado = (id: string): Asistencia => (id in elegidas ? elegidas[id].valor : (decididas?.[id] ?? null));

  /**
   * Un toque: muestra `valor` al momento y lo guarda. Si al terminar ya hubo otro toque en el renglón, no hace nada más.
   * Si no se pudo guardar, quita lo mostrado y ofrece `reintentar`; si se guardó, `alGuardar`. Devuelve el número del toque.
   */
  function guardar(e: EventoLista, valor: Asistencia, reintentar: () => void, alGuardar?: () => void): number {
    const vez = tocar(toques.current, e.id);
    setElegidas((x) => elegir(x, e.id, valor, vez));
    iniciar(async () => {
      let guardado = false;
      try {
        guardado = await cambiarAsistencia(e.id, valor);
      } catch {
        guardado = false;
      }
      if (!esElUltimo(toques.current, e.id, vez)) return;
      setElegidas((x) => trasGuardar(x, e.id, vez, guardado));
      if (!guardado) {
        avisar({ texto: `No se pudo guardar «${recortar(e.titulo)}»`, boton: siSigueSiendoElUltimo(toques.current, e.id, vez, reintentar), etiqueta: "Reintentar", fallo: true });
        return;
      }
      alGuardar?.();
    });
    return vez;
  }

  function hacer(e: EventoLista, clave: ClaveAccion, previo: Asistencia) {
    const nuevo = asistenciaTras(clave);
    const vez = guardar(
      e,
      nuevo,
      () => hacer(e, clave, previo),
      () => {
        // La pregunta, tras el primer Voy guardado de la pantalla; no si esta cuenta ya contestó en esta visita (la página
        // puede ser de hace un rato). Se toma al guardar, no al pintar: dos Voy seguidos no la hacen dos veces.
        if (nuevo !== "voy" || !avisos || !hayQuePreguntar(avisos.cuenta, avisos.preguntado) || !tomarPregunta()) return;
        setHoja(e);
      },
    );
    avisar({ texto: textoHecho(clave, e.titulo), boton: siSigueSiendoElUltimo(toques.current, e.id, vez, () => deshacer(e, previo)) });
  }

  function deshacer(e: EventoLista, previo: Asistencia) {
    guardar(e, previo, () => deshacer(e, previo));
  }

  function acciones(e: EventoLista): AccionDeslizable[] {
    const previo = estado(e.id);
    const ruta = `/eventos/${e.id}`;
    return accionesEvento(previo).map((accion) => ({
      ...accion,
      icono: accion.clave === "voy" || accion.clave === "no_voy" ? <IconoOk width={22} height={22} /> : <IconoEstrella width={22} height={22} />,
      alTocar: () => {
        if (decididas === null) {
          // Sin sesión: la ficha aplica la acción al volver de entrar (y, tras Voy, hace la pregunta de avisos una vez).
          const nuevo = asistenciaTras(accion.clave);
          if (nuevo === "voy") anotarIntencion(ruta);
          router.push(`/entrar?siguiente=${encodeURIComponent(`${ruta}?accion=${nuevo ?? ""}`)}`);
          return;
        }
        hacer(e, accion.clave, previo);
      },
    }));
  }

  const extras = (
    <>
      {!canal && <AvisoAbajo canal={propio} />}
      {hoja && <HojaAbierta canal={canal ?? propio} />}
      {hoja && avisos && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(null)}>
          <ConsentimientoAvisos contexto="voy" titulo={hoja.titulo} cuenta={avisos.cuenta} correo={avisos.correo} llavePush={avisos.llavePush} onListo={() => setHoja(null)} calendarioUrl={`/eventos/${hoja.id}/calendario`} />
        </Hoja>
      )}
    </>
  );

  return { estado, acciones, extras };
}
