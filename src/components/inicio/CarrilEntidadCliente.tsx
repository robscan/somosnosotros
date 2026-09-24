"use client";

import Destacados from "@/components/Destacados";
import { useCanalDePantalla } from "@/components/useCanalDeListas";
import { useSeguirEnLista, type AvisosLista } from "@/components/useSeguirEnLista";
import type { Tarjeta } from "@/lib/destacados";

/**
 * El carril de lugares o artistas, ya en el cliente (mismo patrón que `CarrilEventosCliente`): el botón es Seguir.
 * `grande` (OL-165): «Artistas destacados» usa el mismo tamaño y tarjeta que la tira de destacados de la sección
 * Artistas (`ListaArtistas.tsx`, grande y sin `detalleCompleto`); los demás carriles siguen en chica (`redondas`).
 */
export default function CarrilEntidadCliente({ tarjetas, que, seguidos, avisos, titulo, memoria, verTodosHref, grande = false }: { tarjetas: Tarjeta[]; que: "lugar" | "artista"; seguidos: string[] | null; avisos: AvisosLista | null; titulo: string; memoria: string; verTodosHref: string; grande?: boolean }) {
  const canal = useCanalDePantalla();
  const seguir = useSeguirEnLista(que, seguidos, avisos, canal);
  return (
    <>
      <Destacados tarjetas={tarjetas} grande={grande} redondas={!grande} detalleCompleto={!grande} memoria={memoria} encabezado={titulo} verTodos={{ href: verTodosHref }} boton={(t) => seguir.boton(t.id, t.titulo)} />
      {seguir.extras}
    </>
  );
}
