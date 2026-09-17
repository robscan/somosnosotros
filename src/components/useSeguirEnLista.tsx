"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { cambiarSeguimientoArtista } from "@/app/artistas/acciones";
import { cambiarSeguimiento } from "@/app/lugares/acciones";
import { hayQuePreguntar } from "@/lib/avisosPreguntados";
import { accionSeguir, recortar, textoHecho, type ClaveAccion } from "@/lib/deslizar";
import { anotarIntencion } from "@/lib/intencionAvisos";
import { alRecibir, elegir, esElUltimo, siSigueSiendoElUltimo, tocar, trasGuardar, type Elegidas, type Toques } from "@/lib/toques";
import ConsentimientoAvisos from "./ConsentimientoAvisos";
import type { AccionDeslizable } from "./ui/Deslizable";
import Hoja from "./ui/Hoja";
import { IconoMas, IconoOk } from "./ui/Iconos";
import { AvisoAbajo, HojaAbierta, useCanalDeListas, type CanalDeListas } from "./useCanalDeListas";

/** Lo que pide la pregunta de avisos tras el primer Voy o Seguir (como en la ficha); `cuenta`, el id de quien mira. */
export type AvisosLista = { cuenta: string; preguntado: boolean; correo: string; llavePush: string };

/**
 * Seguir al deslizar un renglón de Lugares o Artistas (decisión del founder, 2026-09-16; bitácora 071): lo que la persona
 * sigue, la acción de cada renglón, el aviso con Deshacer y, tras el primer Seguir guardado, la misma pregunta de avisos
 * que la ficha. Se guarda con la misma acción de la ficha; sin sesión, lleva a entrar y la ficha lo aplica al volver. Si
 * no se pudo guardar, deshace lo mostrado y ofrece Reintentar, sin tumbar la pantalla (bitácora 085).
 *
 * Lo que llega del servidor manda (la respuesta de la acción trae la página al día): lo elegido aquí se superpone solo
 * mientras se guarda, y cada toque lleva su número por renglón (lib/toques), como en la agenda.
 *
 * `canal`: el aviso y la pregunta de avisos compartidos con las otras listas de la pantalla (useCanalDeListas); sin él,
 * la lista tiene los suyos y pinta su aviso en `extras`.
 */
export function useSeguirEnLista(que: "lugar" | "artista", iniciales: string[] | null, avisos: AvisosLista | null, canal?: CanalDeListas): { sigo: (id: string) => boolean; sigoGuardado: (id: string) => boolean; fallos: number; acciones: (id: string, nombre: string) => AccionDeslizable[]; extras: ReactNode } {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [elegidos, setElegidos] = useState<Elegidas<boolean>>({});
  const [recibidos, setRecibidos] = useState(iniciales);
  if (iniciales !== recibidos) {
    setRecibidos(iniciales);
    setElegidos(alRecibir);
  }
  const toques = useRef<Toques>({});
  const propio = useCanalDeListas();
  const { avisar, tomarPregunta, soltarPregunta } = canal ?? propio;
  // El dueño de sus avisos en la pantalla: nadie más los limpia sin poner otro en su lugar.
  const de = useId();
  const [hoja, setHoja] = useState<string | null>(null);
  // Cuántos guardados han fallado: quien pinte pestañas devuelve lo que añadió un toque que no se guardó.
  const [fallos, setFallos] = useState(0);
  const ruta = (id: string) => `/${que === "lugar" ? "lugares" : "artistas"}/${id}`;

  const sigo = (id: string) => (id in elegidos ? elegidos[id].valor : !!iniciales?.includes(id));
  /** Lo mismo, pero solo con lo que ya quedó guardado: lo que se está guardando (y lo que falló) no cuenta. */
  const sigoGuardado = (id: string) => (elegidos[id]?.guardada ? elegidos[id].valor : !!iniciales?.includes(id));

  /**
   * Un toque: muestra `seguir` al momento y lo guarda. Si al terminar ya hubo otro toque en el renglón, no hace nada más.
   * Si no se pudo guardar, quita lo mostrado y ofrece `reintentar`; si se guardó, `alGuardar`. Devuelve el número del toque.
   */
  function guardar(id: string, nombre: string, seguir: boolean, reintentar: () => void, alGuardar?: () => void): number {
    const vez = tocar(toques.current, id);
    setElegidos((x) => elegir(x, id, seguir, vez));
    iniciar(async () => {
      let guardado = false;
      try {
        guardado = await (que === "lugar" ? cambiarSeguimiento(id, seguir) : cambiarSeguimientoArtista(id, seguir));
      } catch {
        guardado = false;
      }
      if (!esElUltimo(toques.current, id, vez)) return;
      setElegidos((x) => trasGuardar(x, id, vez, guardado));
      if (!guardado) {
        setFallos((n) => n + 1);
        avisar({ texto: `No se pudo guardar «${recortar(nombre)}»`, boton: siSigueSiendoElUltimo(toques.current, id, vez, reintentar), etiqueta: "Reintentar", fallo: true, de });
        return;
      }
      alGuardar?.();
    });
    return vez;
  }

  function hacer(id: string, nombre: string, clave: ClaveAccion, antes: boolean) {
    const vez = guardar(
      id,
      nombre,
      !antes,
      () => hacer(id, nombre, clave, antes),
      () => {
        // La pregunta, tras el primer Seguir guardado de la pantalla; no si esta cuenta ya contestó en esta visita (la página
        // puede ser de hace un rato). Se toma al guardar, no al pintar: dos Seguir seguidos no la hacen dos veces.
        if (antes || !avisos || !hayQuePreguntar(avisos.cuenta, avisos.preguntado) || !tomarPregunta()) return;
        setHoja(nombre);
      },
    );
    avisar({ texto: textoHecho(clave, nombre, que), boton: siSigueSiendoElUltimo(toques.current, id, vez, () => deshacer(id, nombre, antes)), de });
  }

  function deshacer(id: string, nombre: string, antes: boolean) {
    guardar(id, nombre, antes, () => deshacer(id, nombre, antes));
  }

  /** Se cerró la hoja sin que la respuesta quedara guardada (la ✕, tocar fuera, Escape): la pregunta vuelve a estar libre. */
  function cerrarHoja() {
    setHoja(null);
    soltarPregunta();
  }

  function acciones(id: string, nombre: string): AccionDeslizable[] {
    const antes = sigo(id);
    const accion = accionSeguir(antes);
    return [
      {
        ...accion,
        icono: antes ? <IconoOk width={22} height={22} /> : <IconoMas width={22} height={22} />,
        alTocar: () => {
          if (iniciales === null) {
            anotarIntencion(ruta(id));
            router.push(`/entrar?siguiente=${encodeURIComponent(`${ruta(id)}?accion=seguir`)}`);
            return;
          }
          hacer(id, nombre, accion.clave, antes);
        },
      },
    ];
  }

  const extras = (
    <>
      {!canal && <AvisoAbajo canal={propio} />}
      {hoja && <HojaAbierta canal={canal ?? propio} />}
      {hoja && avisos && (
        <Hoja etiqueta="Avisos" onCerrar={cerrarHoja}>
          <ConsentimientoAvisos contexto={que === "artista" ? "seguir-artista" : "seguir"} titulo={hoja} cuenta={avisos.cuenta} correo={avisos.correo} llavePush={avisos.llavePush} onListo={() => setHoja(null)} />
        </Hoja>
      )}
    </>
  );

  return { sigo, sigoGuardado, fallos, acciones, extras };
}
