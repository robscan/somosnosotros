"use client";

import Destacados from "@/components/Destacados";
import type { Tarjeta } from "@/lib/destacados";
import { useCarrilResuelto } from "./EstadoCarriles";

/**
 * El carril de lugares o artistas, ya en el cliente (mismo patrón que `CarrilEventosCliente`), con las tarjetas firmadas el 2026-10-10 (prototipo
 * `inicio-tarjetas.html`, «Firmada»; OL-372): `artista`, «Artistas destacadxs» con la tarjeta mediana de un evento (E9); `avatar`, «Lugares de la
 * semana» y «Artistas de la semana» en avatares de 64 (E5). Sin botón de seguir ni de campana: seguir queda en la ficha.
 * Su enlace dice a dónde lleva: «Ver lugares» o «Ver artistas».
 */
export default function CarrilEntidadCliente({ tarjetas, que, titulo, memoria, verTodosHref, forma }: { tarjetas: Tarjeta[]; que: "lugar" | "artista"; titulo: string; memoria: string; verTodosHref: string; forma: "artista" | "avatar" }) {
  useCarrilResuelto(memoria, tarjetas.length);
  return <Destacados tarjetas={tarjetas} forma={forma} memoria={memoria} encabezado={titulo} verTodos={{ href: verTodosHref, etiqueta: que === "lugar" ? "Ver lugares" : "Ver artistas" }} />;
}
