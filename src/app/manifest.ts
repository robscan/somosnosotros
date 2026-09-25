import type { MetadataRoute } from "next";

/** La app se instala en el teléfono desde el navegador (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Somos Nosotros",
    short_name: "Somos Nosotros",
    description: "Agenda y directorio de la cultura local. Mira qué hay, conoce a la gente.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    // ?v=2: símbolo SN nuevo (OL-200); mismo nombre de archivo, iOS/Android guardan el icono por URL.
    icons: [
      { src: "/icono-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png?v=2", sizes: "512x512", type: "image/png" },
      { src: "/icono-maskable-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
