import type { MetadataRoute } from "next";
import { ORIGEN } from "@/lib/sitemap";

/**
 * Qué puede rastrear Google (OL-059, bitácora 088). Corregido tras revisión de gestión de cambios: un `disallow`
 * aquí le gana al `robots: {index:false}` de la propia página — si Google no puede ni leerla, tampoco lee la
 * etiqueta que le dice que no la indexe, y la URL puede salir igual en resultados (con el texto del enlace que
 * la trajo, por ejemplo el nombre de la persona en "quién va"). Google lo explica así en «Block Search indexing
 * with noindex». Por eso `/admin`, `/ajustes`, `/perfil`, `/entrar`, `/borrado` y `/personas` NO van aquí: ya
 * llevan su propio `noindex` y necesitan que Google pueda entrar a leerlo.
 * Lo que sigue bloqueado es lo que de verdad conviene que Google ni intente:
 *   `/avisos` sirve HTML sin `noindex` (la baja de correo) y, peor, verla ejecuta la baja — nunca debe rastrearse;
 *   `/auth` sí responde a GET (manda a Apple o Google y vuelve a traer la sesión), pero solo para redirigir — no
 *   hay ninguna página propia que enseñar, así que no hace falta que Google ni lo intente.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/avisos", "/auth"],
    },
    sitemap: `${ORIGEN}/sitemap.xml`,
  };
}
