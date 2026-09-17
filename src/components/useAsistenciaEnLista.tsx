"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { cambiarAsistencia } from "@/app/eventos/acciones";
import { accionesEvento, asistenciaTras, textoHecho, type Asistencia } from "@/lib/deslizar";
import { anotarIntencion } from "@/lib/intencionAvisos";
import ConsentimientoAvisos from "./ConsentimientoAvisos";
import Hecho from "./Hecho";
import type { AccionDeslizable } from "./ui/Deslizable";
import Hoja from "./ui/Hoja";
import { IconoEstrella, IconoOk } from "./ui/Iconos";
import type { AvisosLista } from "./useSeguirEnLista";

/** Lo que la persona decidió en cada evento cargado; null = sin sesión. */
export type Decididas = Record<string, Exclude<Asistencia, null>> | null;
type EventoLista = { id: string; titulo: string };
/** Lo que se eligió aquí y todavía no llegó de vuelta del servidor. */
type Elegida = { valor: Asistencia; guardada: boolean };

/**
 * Voy y Me interesa al deslizar un evento (decisión del founder, 2026-09-17; bitácora 085): lo que la persona decidió, las
 * dos acciones del renglón, el aviso con Deshacer y, tras el primer Voy, la misma pregunta de avisos que la ficha. Guarda
 * con la misma acción de la ficha, así el estado es uno solo; sin sesión, lleva a entrar y la ficha lo aplica al volver.
 *
 * Lo que llega del servidor manda (al volver de la ficha, tras refrescar): lo elegido aquí se superpone solo mientras se
 * guarda, para que el renglón no parpadee.
 */
export function useAsistenciaEnLista(decididas: Decididas, avisos: AvisosLista | null): { estado: (id: string) => Asistencia; acciones: (e: EventoLista) => AccionDeslizable[]; extras: ReactNode } {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [elegidas, setElegidas] = useState<Record<string, Elegida>>({});
  const [recibidas, setRecibidas] = useState(decididas);
  if (decididas !== recibidas) {
    // Datos nuevos del servidor: lo ya guardado se toma de ellos; lo que sigue guardándose, no.
    setRecibidas(decididas);
    setElegidas((e) => Object.fromEntries(Object.entries(e).filter(([, v]) => !v.guardada)));
  }
  const [preguntado, setPreguntado] = useState(avisos?.preguntado ?? true);
  const [hoja, setHoja] = useState<EventoLista | null>(null);
  const [hecho, setHecho] = useState<{ texto: string; deshacer: () => void; vez: number } | null>(null);

  const estado = (id: string): Asistencia => (id in elegidas ? elegidas[id].valor : (decididas?.[id] ?? null));

  function guardar(id: string, nuevo: Asistencia) {
    setElegidas((e) => ({ ...e, [id]: { valor: nuevo, guardada: false } }));
    iniciar(async () => {
      await cambiarAsistencia(id, nuevo);
      setElegidas((e) => (e[id]?.valor === nuevo ? { ...e, [id]: { valor: nuevo, guardada: true } } : e));
      router.refresh();
    });
  }

  function acciones(e: EventoLista): AccionDeslizable[] {
    const previo = estado(e.id);
    const ruta = `/eventos/${e.id}`;
    return accionesEvento(previo).map((accion) => ({
      ...accion,
      icono: accion.clave === "voy" || accion.clave === "no_voy" ? <IconoOk width={22} height={22} /> : <IconoEstrella width={22} height={22} />,
      alTocar: () => {
        const nuevo = asistenciaTras(accion.clave);
        if (decididas === null) {
          // Sin sesión: la ficha aplica la acción al volver de entrar (y, tras Voy, hace la pregunta de avisos una vez).
          if (nuevo === "voy") anotarIntencion(ruta);
          router.push(`/entrar?siguiente=${encodeURIComponent(`${ruta}?accion=${nuevo ?? ""}`)}`);
          return;
        }
        guardar(e.id, nuevo);
        setHecho((h) => ({ texto: textoHecho(accion.clave, e.titulo), deshacer: () => guardar(e.id, previo), vez: (h?.vez ?? 0) + 1 }));
        if (nuevo === "voy" && !preguntado && avisos) {
          setPreguntado(true);
          setHoja(e);
        }
      },
    }));
  }

  const extras = (
    <>
      {hecho && <Hecho key={hecho.vez} texto={hecho.texto} onDeshacer={hecho.deshacer} onCerrar={() => setHecho(null)} />}
      {hoja && avisos && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(null)}>
          <ConsentimientoAvisos contexto="voy" titulo={hoja.titulo} correo={avisos.correo} llavePush={avisos.llavePush} onListo={() => setHoja(null)} calendarioUrl={`/eventos/${hoja.id}/calendario`} />
        </Hoja>
      )}
    </>
  );

  return { estado, acciones, extras };
}
