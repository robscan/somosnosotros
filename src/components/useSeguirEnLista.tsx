"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { cambiarSeguimientoArtista } from "@/app/artistas/acciones";
import { cambiarSeguimiento } from "@/app/lugares/acciones";
import { avisosYaContestados } from "@/lib/avisosPreguntados";
import { accionSeguir, recortar, textoHecho, type ClaveAccion } from "@/lib/deslizar";
import { anotarIntencion } from "@/lib/intencionAvisos";
import ConsentimientoAvisos from "./ConsentimientoAvisos";
import Hecho from "./Hecho";
import type { AccionDeslizable } from "./ui/Deslizable";
import Hoja from "./ui/Hoja";
import { IconoMas, IconoOk } from "./ui/Iconos";

/** Lo que pide la pregunta de avisos tras el primer Seguir (como en la ficha). */
export type AvisosLista = { preguntado: boolean; correo: string; llavePush: string };
/** Lo que se eligió aquí y todavía no llegó de vuelta del servidor. */
type Elegido = { valor: boolean; guardado: boolean };
/** El aviso de abajo: lo hecho con Deshacer, o que no se pudo guardar con Reintentar. */
type Aviso = { texto: string; boton: () => void; etiqueta?: string; fallo?: boolean; vez: number };

/**
 * Seguir al deslizar un renglón de Lugares o Artistas (decisión del founder, 2026-09-16; bitácora 071): lo que la persona
 * sigue, la acción de cada renglón, el aviso con Deshacer y, tras el primer Seguir guardado, la misma pregunta de avisos
 * que la ficha. Se guarda con la misma acción de la ficha; sin sesión, lleva a entrar y la ficha lo aplica al volver. Si
 * no se pudo guardar, deshace lo mostrado y ofrece Reintentar, sin tumbar la pantalla (bitácora 085).
 *
 * Lo que llega del servidor manda: lo elegido aquí se superpone solo mientras se guarda (como en la agenda).
 */
export function useSeguirEnLista(que: "lugar" | "artista", iniciales: string[] | null, avisos: AvisosLista | null): { sigo: (id: string) => boolean; acciones: (id: string, nombre: string) => AccionDeslizable[]; extras: ReactNode } {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [elegidos, setElegidos] = useState<Record<string, Elegido>>({});
  const [recibidos, setRecibidos] = useState(iniciales);
  if (iniciales !== recibidos) {
    // Datos nuevos del servidor: lo ya guardado se toma de ellos; lo que sigue guardándose, no.
    setRecibidos(iniciales);
    setElegidos((e) => Object.fromEntries(Object.entries(e).filter(([, v]) => !v.guardado)));
  }
  // Una sola pregunta por pantalla. Se lee al guardar, no al pintar: dos Seguir seguidos no la hacen dos veces.
  const pregunte = useRef(false);
  const [hoja, setHoja] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const ruta = (id: string) => `/${que === "lugar" ? "lugares" : "artistas"}/${id}`;

  const sigo = (id: string) => (id in elegidos ? elegidos[id].valor : !!iniciales?.includes(id));
  const avisar = (a: Omit<Aviso, "vez">) => setAviso((previo) => ({ ...a, vez: (previo?.vez ?? 0) + 1 }));

  /** Muestra el cambio al momento y lo guarda; si no se pudo, lo deshace y ofrece `reintentar`. `alGuardar`, solo si se guardó. */
  function guardar(id: string, nombre: string, seguir: boolean, reintentar: () => void, alGuardar?: () => void) {
    setElegidos((x) => ({ ...x, [id]: { valor: seguir, guardado: false } }));
    iniciar(async () => {
      let guardado = false;
      try {
        guardado = await (que === "lugar" ? cambiarSeguimiento(id, seguir) : cambiarSeguimientoArtista(id, seguir));
      } catch {
        guardado = false;
      }
      if (!guardado) {
        setElegidos((x) => {
          if (x[id]?.valor !== seguir) return x;
          const sin = { ...x };
          delete sin[id];
          return sin;
        });
        avisar({ texto: `No se pudo guardar «${recortar(nombre)}»`, boton: reintentar, etiqueta: "Reintentar", fallo: true });
        return;
      }
      setElegidos((x) => (x[id]?.valor === seguir ? { ...x, [id]: { valor: seguir, guardado: true } } : x));
      alGuardar?.();
      // Los datos de la página al día: en Lugares la lista se vuelve a montar al pasar por el Mapa y los necesita.
      router.refresh();
    });
  }

  function hacer(id: string, nombre: string, clave: ClaveAccion, antes: boolean) {
    const deshacer = () => guardar(id, nombre, antes, deshacer);
    avisar({ texto: textoHecho(clave, nombre, que), boton: deshacer });
    guardar(
      id,
      nombre,
      !antes,
      () => hacer(id, nombre, clave, antes),
      () => {
        // La pregunta, tras el primer Seguir guardado; no si ya se contestó en esta visita (la página puede ser de hace un rato).
        if (antes || !avisos || avisos.preguntado || pregunte.current || avisosYaContestados()) return;
        pregunte.current = true;
        setHoja(nombre);
      },
    );
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
      {/* Con la hoja de avisos abierta, el aviso espera: sale (con su tiempo completo) al cerrarla. Cada aviso cierra solo
          el suyo: Reintentar pone uno nuevo en el mismo toque. */}
      {aviso && !hoja && <Hecho key={aviso.vez} texto={aviso.texto} onDeshacer={aviso.boton} etiqueta={aviso.etiqueta} fallo={aviso.fallo} onCerrar={() => setAviso((a) => (a?.vez === aviso.vez ? null : a))} />}
      {hoja && avisos && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(null)}>
          <ConsentimientoAvisos contexto={que === "artista" ? "seguir-artista" : "seguir"} titulo={hoja} correo={avisos.correo} llavePush={avisos.llavePush} onListo={() => setHoja(null)} />
        </Hoja>
      )}
    </>
  );

  return { sigo, acciones, extras };
}
