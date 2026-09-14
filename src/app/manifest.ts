import type { MetadataRoute } from "next";

/** La app se instala en el teléfono desde el navegador (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Somos Nosotros",
    short_name: "Somos Nosotros",
    description: "Centros culturales y agenda de San Luis Potosí, para conocer gente local.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
