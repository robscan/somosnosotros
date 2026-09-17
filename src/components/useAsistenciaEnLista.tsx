"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { cambiarAsistencia } from "@/app/eventos/acciones";
import { avisosYaContestados } from "@/lib/avisosPreguntados";
import { accionesEvento, asistenciaTras, recortar, textoHecho, type Asistencia, type ClaveAccion } from "@/lib/deslizar";
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
/** El aviso de abajo: lo hecho con Deshacer, o que no se pudo guardar con Reintentar. */
type Aviso = { texto: string; boton: () => void; etiqueta?: string; fallo?: boolean; vez: number };

/**
 * Voy y Me interesa al deslizar un evento (decisión del founder, 2026-09-17; bitácora 085): lo que la persona decidió, las
 * dos acciones del renglón, el aviso con Deshacer y, tras el primer Voy guardado, la misma pregunta de avisos que la
 * ficha. Guarda con la misma acción de la ficha, así el estado es uno solo; sin sesión, lleva a entrar y la ficha lo
 * aplica al volver. Si no se pudo guardar, deshace lo mostrado y ofrece Reintentar, sin tumbar la pantalla.
 *
 * Lo que llega del servidor manda (al volver de la ficha, en la respuesta de la acción): lo elegido aquí se superpone
 * solo mientras se guarda.
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
  // Una sola pregunta por pantalla. Se lee al guardar, no al pintar: dos Voy seguidos no la hacen dos veces.
  const pregunte = useRef(false);
  const [hoja, setHoja] = useState<EventoLista | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const estado = (id: string): Asistencia => (id in elegidas ? elegidas[id].valor : (decididas?.[id] ?? null));
  const avisar = (a: Omit<Aviso, "vez">) => setAviso((previo) => ({ ...a, vez: (previo?.vez ?? 0) + 1 }));

  /** Muestra el cambio al momento y lo guarda; si no se pudo, lo deshace y ofrece `reintentar`. `alGuardar`, solo si se guardó. */
  function guardar(e: EventoLista, nuevo: Asistencia, reintentar: () => void, alGuardar?: () => void) {
    setElegidas((x) => ({ ...x, [e.id]: { valor: nuevo, guardada: false } }));
    iniciar(async () => {
      let guardado = false;
      try {
        guardado = await cambiarAsistencia(e.id, nuevo);
      } catch {
        guardado = false;
      }
      if (!guardado) {
        setElegidas((x) => {
          if (x[e.id]?.valor !== nuevo) return x;
          const sin = { ...x };
          delete sin[e.id];
          return sin;
        });
        avisar({ texto: `No se pudo guardar «${recortar(e.titulo)}»`, boton: reintentar, etiqueta: "Reintentar", fallo: true });
        return;
      }
      setElegidas((x) => (x[e.id]?.valor === nuevo ? { ...x, [e.id]: { valor: nuevo, guardada: true } } : x));
      alGuardar?.();
    });
  }

  function hacer(e: EventoLista, clave: ClaveAccion, previo: Asistencia) {
    const nuevo = asistenciaTras(clave);
    const deshacer = () => guardar(e, previo, deshacer);
    avisar({ texto: textoHecho(clave, e.titulo), boton: deshacer });
    guardar(
      e,
      nuevo,
      () => hacer(e, clave, previo),
      () => {
        // La pregunta, tras el primer Voy guardado; no si ya se contestó en esta visita (la página puede ser de hace un rato).
        if (nuevo !== "voy" || !avisos || avisos.preguntado || pregunte.current || avisosYaContestados()) return;
        pregunte.current = true;
        setHoja(e);
      },
    );
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
      {/* Con la hoja de avisos abierta, el aviso espera: sale (con su tiempo completo) al cerrarla. Cada aviso cierra solo
          el suyo: Reintentar pone uno nuevo en el mismo toque. */}
      {aviso && !hoja && <Hecho key={aviso.vez} texto={aviso.texto} onDeshacer={aviso.boton} etiqueta={aviso.etiqueta} fallo={aviso.fallo} onCerrar={() => setAviso((a) => (a?.vez === aviso.vez ? null : a))} />}
      {hoja && avisos && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(null)}>
          <ConsentimientoAvisos contexto="voy" titulo={hoja.titulo} correo={avisos.correo} llavePush={avisos.llavePush} onListo={() => setHoja(null)} calendarioUrl={`/eventos/${hoja.id}/calendario`} />
        </Hoja>
      )}
    </>
  );

  return { estado, acciones, extras };
}
