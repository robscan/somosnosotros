import type { MetadataRoute } from "next";
import { ORIGEN } from "@/lib/sitemap";

/**
 * Qué puede rastrear Google (OL-059, bitácora 088). Lo privado o personal (cuenta, panel, fichas de persona) también
 * lleva `robots: {index:false}` en su propia página, por si alguien llega por enlace directo; esto es lo que evita
 * que un buscador ni lo intente.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/ajustes", "/perfil", "/entrar", "/avisos", "/borrado", "/personas", "/auth"],
    },
    sitemap: `${ORIGEN}/sitemap.xml`,
  };
}
