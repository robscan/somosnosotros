import type { Tarjeta } from "@/lib/destacados";
import CarrilEntidadCliente from "./CarrilEntidadCliente";

/** Componente de servidor: espera la consulta de lugares o artistas (independiente de la de la agenda, con su propio `<Suspense>`) y pasa las
 *  tarjetas ya resueltas al carril de cliente. `forma`: `artista` en «Artistas destacadxs» (E9) y `avatar` en «Lugares de la semana» y «Artistas
 *  de la semana» (E5); ninguno lleva botón, así que ya no espera lo que sigue la persona (OL-372). */
export default async function CarrilEntidad({ promise, que, titulo, memoria, verTodosHref, forma }: { promise: Promise<Tarjeta[]>; que: "lugar" | "artista"; titulo: string; memoria: string; verTodosHref: string; forma: "artista" | "avatar" }) {
  const tarjetas = await promise;
  return <CarrilEntidadCliente tarjetas={tarjetas} que={que} titulo={titulo} memoria={memoria} verTodosHref={verTodosHref} forma={forma} />;
}
