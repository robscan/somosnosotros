import type { AvisosLista } from "@/components/useSeguirEnLista";
import type { Tarjeta } from "@/lib/destacados";
import CarrilEntidadCliente from "./CarrilEntidadCliente";

/** Componente de servidor: espera la consulta de lugares o artistas (independiente de la de la agenda, con su propio
 *  `<Suspense>`) y pasa las tarjetas ya resueltas al carril de cliente. */
export default async function CarrilEntidad({ promise, seguidosPromise, que, avisos, titulo, memoria, verTodosHref }: { promise: Promise<Tarjeta[]>; seguidosPromise: Promise<string[] | null>; que: "lugar" | "artista"; avisos: AvisosLista | null; titulo: string; memoria: string; verTodosHref: string }) {
  // Las dos, en paralelo: la propia consulta del carril y la de "qué sigue la persona" (que puede venir de otra
  // consulta más lenta, como `cargarAgenda`) no se bloquean una a la otra.
  const [tarjetas, seguidos] = await Promise.all([promise, seguidosPromise.catch(() => null)]);
  return <CarrilEntidadCliente tarjetas={tarjetas} que={que} seguidos={seguidos} avisos={avisos} titulo={titulo} memoria={memoria} verTodosHref={verTodosHref} />;
}
