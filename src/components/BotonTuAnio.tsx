import Link from "next/link";
import { IconoRegalo } from "./ui/Iconos";
import styles from "./BotonTuAnio.module.css";

/**
 * El botón «Tu año» (OL-394; prototipo firmado `tu-anio-propuestas.html`, «O en la sección» y «Q solo quien gestiona»): una píldora del violeta
 * suave con el regalo, al final de «Trayectoria» (artista) y de «Historial» (lugar), y en Mi perfil para la persona. Solo lo pinta quien ya sabe
 * que quien mira lo gestiona y que hay algo pasado este año; abre la vista previa con la imagen. `className`: el aire que le da quien lo usa.
 */
export default function BotonTuAnio({ href, className }: { href: string; className?: string }) {
  return (
    <Link href={href} className={[styles.boton, className].filter(Boolean).join(" ")}>
      <IconoRegalo width={20} height={20} />
      Tu año
    </Link>
  );
}
