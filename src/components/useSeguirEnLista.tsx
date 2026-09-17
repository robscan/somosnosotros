"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { cambiarSeguimientoArtista } from "@/app/artistas/acciones";
import { cambiarSeguimiento } from "@/app/lugares/acciones";
import { accionSeguir, textoHecho } from "@/lib/deslizar";
import { anotarIntencion } from "@/lib/intencionAvisos";
import ConsentimientoAvisos from "./ConsentimientoAvisos";
import Hecho from "./Hecho";
import type { AccionDeslizable } from "./ui/Deslizable";
import Hoja from "./ui/Hoja";
import { IconoMas, IconoOk } from "./ui/Iconos";

/** Lo que pide la pregunta de avisos tras el primer Seguir (como en la ficha). */
export type AvisosLista = { preguntado: boolean; correo: string; llavePush: string };

/**
 * Seguir al deslizar un renglón de Lugares o Artistas (decisión del founder, 2026-09-16; bitácora 071): lo que la persona
 * sigue, la acción de cada renglón, el aviso con Deshacer y, la primera vez, la misma pregunta de avisos que la ficha.
 * Se guarda con la misma acción de la ficha. Sin sesión, lleva a entrar y la ficha lo aplica al volver.
 */
export function useSeguirEnLista(que: "lugar" | "artista", iniciales: string[] | null, avisos: AvisosLista | null): { sigo: (id: string) => boolean; acciones: (id: string, nombre: string) => AccionDeslizable[]; extras: ReactNode } {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [seguidos, setSeguidos] = useState(() => new Set(iniciales ?? []));
  const [preguntado, setPreguntado] = useState(avisos?.preguntado ?? true);
  const [hoja, setHoja] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ texto: string; deshacer: () => void; vez: number } | null>(null);
  const ruta = (id: string) => `/${que === "lugar" ? "lugares" : "artistas"}/${id}`;

  function guardar(id: string, seguir: boolean) {
    setSeguidos((s) => {
      const nuevos = new Set(s);
      if (seguir) nuevos.add(id);
      else nuevos.delete(id);
      return nuevos;
    });
    iniciar(async () => {
      await (que === "lugar" ? cambiarSeguimiento(id, seguir) : cambiarSeguimientoArtista(id, seguir));
      // Los datos de la página al día: en Lugares la lista se vuelve a montar al pasar por el Mapa y los necesita.
      router.refresh();
    });
  }

  function acciones(id: string, nombre: string): AccionDeslizable[] {
    const sigo = seguidos.has(id);
    const accion = accionSeguir(sigo);
    return [
      {
        ...accion,
        icono: sigo ? <IconoOk width={22} height={22} /> : <IconoMas width={22} height={22} />,
        alTocar: () => {
          if (iniciales === null) {
            anotarIntencion(ruta(id));
            router.push(`/entrar?siguiente=${encodeURIComponent(`${ruta(id)}?accion=seguir`)}`);
            return;
          }
          guardar(id, !sigo);
          setHecho((h) => ({ texto: textoHecho(accion.clave, nombre, que), deshacer: () => guardar(id, sigo), vez: (h?.vez ?? 0) + 1 }));
          if (!sigo && !preguntado && avisos) {
            setPreguntado(true);
            setHoja(nombre);
          }
        },
      },
    ];
  }

  const extras = (
    <>
      {hecho && <Hecho key={hecho.vez} texto={hecho.texto} onDeshacer={hecho.deshacer} onCerrar={() => setHecho(null)} />}
      {hoja && avisos && (
        <Hoja etiqueta="Avisos" onCerrar={() => setHoja(null)}>
          <ConsentimientoAvisos contexto={que === "artista" ? "seguir-artista" : "seguir"} titulo={hoja} correo={avisos.correo} llavePush={avisos.llavePush} onListo={() => setHoja(null)} />
        </Hoja>
      )}
    </>
  );

  return { sigo: (id) => seguidos.has(id), acciones, extras };
}
