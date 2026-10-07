import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import Armazon from "@/components/Armazon";
import BarraApp from "@/components/BarraApp";
import Navegacion from "@/components/Navegacion";
import NavSecciones from "@/components/NavSecciones";
import PerfilEnNav from "@/components/PerfilEnNav";
import AnalyticsGoogle from "@/components/AnalyticsGoogle";
import AnalyticsVercel from "@/components/AnalyticsVercel";
import MarcaAdmin from "@/components/MarcaAdmin";
import MedirInstalacion from "@/components/MedirInstalacion";
import RegistroSW from "@/components/RegistroSW";
import MemoriaScroll from "@/components/MemoriaScroll";
import Sesion, { AccesoAdmin } from "@/components/Sesion";
import TituloInstalada from "@/components/TituloInstalada";
import { IconoPersona } from "@/components/ui/Iconos";
import { GUION_APP_NATIVA } from "@/lib/appNativa";
import { GUION_AVISO_INSTALAR } from "@/lib/avisoInstalar";
import { jsonLdSitio } from "@/lib/estructurados";
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
    "Agenda y directorio de la cultura local. Mira qué hay, conoce a la gente. Sin cuenta para mirar.",
  applicationName: "Somos Nosotros",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Somos Nosotros" },
  // El favicon (símbolo SN sobre el degradado del icono) lo sirve src/app/favicon.ico; el icono de "Añadir a inicio", apple-touch-icon y el manifiesto (docs/diseno/logotipo/iconos-sn.mjs).
  icons: { apple: "/apple-touch-icon.png" },
  // Vista previa al pegar el enlace del sitio (WhatsApp, Messages): el logotipo sobre hueso, docs/diseno/logotipo/portada.html.
  metadataBase: new URL("https://somosnosotros.org"),
  openGraph: { title: "Somos Nosotros", description: "Agenda y directorio de la cultura local. Mira qué hay, conoce a la gente. Sin cuenta para mirar.", url: "https://somosnosotros.org", type: "website", images: [{ url: "/portada.png", width: 1200, height: 630 }], locale: "es_MX", siteName: "Somos Nosotros" },
  twitter: { card: "summary_large_image", title: "Somos Nosotros", description: "Agenda y directorio de la cultura local. Mira qué hay, conoce a la gente. Sin cuenta para mirar.", images: ["/portada.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android (Chrome y la web instalada desde Chrome; no hay app Android, OL-308): con el teclado abierto, Chrome encoge por omisión solo el
  // área visible (`resizes-visual`, desde Chrome 108, como Safari de iPhone). Con `resizes-content` encoge la ventana de maquetación: lo pegado
  // abajo (el pie de los pasos) queda sobre el teclado sin más, y `ui/useCampoVisible` no suma aire dos veces (`--teclado` queda en 0).
  // Safari de iPhone y la app de la tienda lo ignoran. Referencia: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport#interactive-widget
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={bricolage.variable}>
      <body>
        {/* WebSite (OL-143, bitácora 178): una sola vez, para todo el sitio; sin datos de personas. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSitio()).replace(/</g, "\\u003c") }} />
        {/* Guarda el aviso de instalar de Chrome, Edge o Android antes de que cargue React: llega una sola vez. */}
        <Script id="aviso-instalar" strategy="beforeInteractive">
          {GUION_AVISO_INSTALAR}
        </Script>
        {/* Dentro de la app de iPhone (OL-205): pone ".app-nativa" en <html> antes de que React pinte nada, por el
            sello de user-agent que añade Capacitor (`src/lib/appNativa.ts`). Sin esto, Safari y Chrome normales
            nunca la traen. */}
        <Script id="app-nativa" strategy="beforeInteractive">
          {GUION_APP_NATIVA}
        </Script>
        {/* El armazón (docs/rediseno/50, P4 y P7): la barra de la app, la pantalla y la navegación, una sola vez para todas las
            rutas. La sesión (la campana; sin sesión, nada) se lee aquí, en el servidor, sin frenar a la pantalla. La barra lee
            la ciudad de la consulta: en la pantalla «No está», que se prerenderiza, esa lectura espera al teléfono. */}
        <Armazon
          barra={
            <Suspense fallback={null}>
              <BarraApp admin={<Suspense fallback={null}><AccesoAdmin /></Suspense>} sesion={<Suspense fallback={null}><Sesion /></Suspense>} />
            </Suspense>
          }
          nav={<NavSecciones perfil={<Suspense fallback={<IconoPersona width={26} height={26} />}><PerfilEnNav /></Suspense>} />}
        >
          {children}
        </Armazon>
        <RegistroSW />
        <Navegacion />
        {/* El campo escondido que la lupa de la barra enfoca con el toque, para que el teclado del iPhone no se cierre al llegar a Buscar (`BarraApp`). */}
        <input id="cebo-de-teclado" className="cebo-de-teclado" type="text" tabIndex={-1} aria-hidden="true" autoComplete="off" />
        {/* Lee la consulta de la URL: en las pantallas estáticas se monta ya en el teléfono, sin frenar al resto. */}
        <Suspense fallback={null}>
          <MemoriaScroll />
        </Suspense>
        <TituloInstalada />
        {/* La medición (OL-325) arranca cuando la sesión dice quién mira: `MarcaAdmin` pinta la marca del rol y, solo si no es
            administración, monta la analítica. Mientras tanto no se mide nada; para un admin, nunca (F10 de OL-327). */}
        <Suspense fallback={null}>
          <MarcaAdmin>
            {/* Vercel Analytics: vistas de página, sin cookies ni identificación de personas (OL-111, 2026-09-21), y las acciones de la
                lista cerrada de `src/lib/medir.ts`. */}
            <AnalyticsVercel />
            {/* Google Analytics 4: solo con `NEXT_PUBLIC_GA_ID` y en producción, leídos aquí en el servidor; consentimiento denegado, sin
                cookies, solo para las vistas (las acciones van por el servidor). Sin el identificador no se carga nada de Google. */}
            <AnalyticsGoogle id={process.env.NEXT_PUBLIC_GA_ID} produccion={process.env.VERCEL_ENV === "production"} />
            <MedirInstalacion />
          </MarcaAdmin>
        </Suspense>
      </body>
    </html>
  );
}
