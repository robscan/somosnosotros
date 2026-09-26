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
 *
 * `tusPlanes` (OL-222, bitácora 251): solo en "Tus planes" (`CarrilTusPlanes`), una tarjeta que la persona quita
 * (Voy y Me interesa, las dos a "ya no") desaparece de este carril al momento — con Deshacer, como cualquier otro
 * toque; `useAsistenciaEnLista` es quien decide el estado (con lo optimista y con lo corregido de esta visita), así
 * que basta con leer `asistencia.estado` para filtrar. Los demás carriles (Estelar, Esta semana…) no filtran: ahí el
 * evento se queda con su check al día, nunca desaparece bajo el dedo (OL-221).
 */
export default function CarrilEventosCliente({ tarjetas, asistencias, avisos, titulo, tamano, memoria, verTodosHref, tusPlanes = false }: { tarjetas: Tarjeta[]; asistencias: Decididas; avisos: AvisosLista | null; titulo: string; tamano: "grande" | "mediana"; memoria: string; verTodosHref: string; tusPlanes?: boolean }) {
  const canal = useCanalDePantalla();
  const asistencia = useAsistenciaEnLista(asistencias, avisos, canal);
  const visibles = tusPlanes ? tarjetas.filter((t) => asistencia.estado(t.id) !== null) : tarjetas;
  return (
    <>
      <Destacados tarjetas={visibles} grande={tamano === "grande"} memoria={memoria} encabezado={titulo} verTodos={{ href: verTodosHref }} boton={(t) => asistencia.boton(t)} estadoDe={asistencia.estado} />
      {asistencia.extras}
    </>
  );
}
