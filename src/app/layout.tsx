import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import RegistroSW from "@/components/RegistroSW";
import "./globals.css";

/**
 * La única letra de la app (docs/diseno/LINEA_GRAFICA.md): Bricolage Grotesque variable, servida desde
 * nuestro dominio por next/font (sin llamada a Google en cada visita, sin salto al cargar).
 * Ejes: opsz (tamaño óptico automático) y wdth (condensada: 75 títulos, 80 texto).
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"], // español; latin-ext (56 KB) se quitó el 2026-09-14 por decisión del founder
  axes: ["opsz", "wdth"],
  display: "swap",
  variable: "--fuente-bricolage",
});

export const metadata: Metadata = {
  title: "Somos Nosotros",
  description:
    "Directorio de centros culturales y agenda de eventos de San Luis Potosí, para conocer gente local.",
  applicationName: "Somos Nosotros",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Somos Nosotros" },
  icons: { icon: "/icono-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={bricolage.variable}>
      <body>
        {children}
        <RegistroSW />
      </body>
    </html>
  );
}
