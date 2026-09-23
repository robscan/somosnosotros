"use client";

import type { Decididas } from "@/components/useAsistenciaEnLista";
import { useAsistenciaEnLista } from "@/components/useAsistenciaEnLista";
import { useCanalDePantalla } from "@/components/useCanalDeListas";
import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Tarjeta } from "@/lib/destacados";
import Destacados from "@/components/Destacados";

/**
 * El carril, ya en el cliente: la parte de datos la resolvió un componente de servidor (streaming, OL-156) y le pasó
 * `tarjetas` (ya serializable); aquí vive el botón Voy, con el mismo canal de aviso que comparten los demás carriles
 * de Inicio (`useCanalDePantalla`, la misma pieza que ya usan las fichas y Lugares — ver `PantallaConAviso`).
 */
export default function CarrilEventosCliente({ tarjetas, asistencias, avisos, titulo, tamano, memoria, verTodosHref }: { tarjetas: Tarjeta[]; asistencias: Decididas; avisos: AvisosLista | null; titulo: string; tamano: "grande" | "mediana"; memoria: string; verTodosHref: string }) {
  const canal = useCanalDePantalla();
  const asistencia = useAsistenciaEnLista(asistencias, avisos, canal);
  return (
    <>
      <Destacados tarjetas={tarjetas} grande={tamano === "grande"} memoria={memoria} encabezado={titulo} verTodos={{ href: verTodosHref }} boton={(t) => asistencia.boton(t)} />
      {asistencia.extras}
    </>
  );
}
