import { notFound } from "next/navigation";
import { cargarArtistaLetrero } from "@/app/artistas/consultas";
import { hrefArtista, textoLetrero } from "@/lib/artistas";
import { qrDeUrl } from "@/lib/qr";
import CodigoQr from "@/components/ui/CodigoQr";
import { ORIGEN } from "@/lib/sitemap";
import ImprimirAlAbrir from "./ImprimirAlAbrir";
import styles from "./letrero.module.css";

export const metadata = { title: "Letrero para imprimir · Somos Nosotros", robots: { index: false, follow: false } };

type Params = { params: Promise<{ id: string }> };

/**
 * El letrero listo para imprimir de un artista (OL-159, doc 40e): pedido del founder tras el QR descargable, para
 * pegarlo donde se presenta. Página aparte, sin la cabecera ni la barra de la app (nada que estorbe al imprimir),
 * A4 con `@page` en `letrero.module.css` — se abre desde la hoja de compartir y se imprime sola al cargar
 * (`ImprimirAlAbrir`); "Guardar como PDF" en el cuadro de impresión del navegador entrega el PDF, sin generarlo
 * a mano ni sumar una dependencia nueva.
 */
export default async function LetreroArtista({ params }: Params) {
  const { id } = await params;
  const a = await cargarArtistaLetrero(id);
  if (!a) notFound();
  const url = `${ORIGEN}${hrefArtista(a)}`;
  const svg = await qrDeUrl(url);
  const { titulo, subtitulo } = textoLetrero(a.nombre);
  return (
    <main className={styles.pagina}>
      <ImprimirAlAbrir />
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG fijo de public, sin optimizar */}
      <img src="/logotipo.svg" alt="Somos Nosotros" className={styles.logo} />
      <div className={styles.qrCaja}>
        <CodigoQr svg={svg} alt={`Código QR de ${a.nombre}`} />
      </div>
      <h1 className={styles.titulo}>{titulo}</h1>
      <p className={styles.subtitulo}>{subtitulo}</p>
      <p className={styles.pie}>{url.replace(/^https:\/\//, "")}</p>
      <p className={styles.ayuda}>
        Se imprime sola al abrir. Si no, usa Imprimir (⌘/Ctrl P) y elige “Guardar como PDF”; en las opciones, quita
        encabezados y pies de página.
      </p>
    </main>
  );
}
