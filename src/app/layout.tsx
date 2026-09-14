import type { Metadata, Viewport } from "next";
import RegistroSW from "@/components/RegistroSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "somosnosotros",
  description:
    "Directorio de centros culturales y agenda de eventos de San Luis Potosí, para conocer gente local.",
  applicationName: "somosnosotros",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "somosnosotros" },
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
    <html lang="es">
      <body>
        {children}
        <RegistroSW />
      </body>
    </html>
  );
}
