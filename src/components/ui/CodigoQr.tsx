import styles from "./CodigoQr.module.css";

/**
 * Un código QR ya dibujado (SVG que viene del servidor, `lib/qr.ts`), como imagen: sin `innerHTML`, escala
 * sin perder nitidez en pantalla y en papel. Quien lo usa decide el ancho con `className`.
 */
export default function CodigoQr({ svg, alt, className = "" }: { svg: string; alt: string; className?: string }) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  // eslint-disable-next-line @next/next/no-img-element -- dibujo generado en el servidor, no hay nada que optimizar
  return <img className={`${styles.qr} ${className}`} src={src} alt={alt} draggable={false} />;
}
