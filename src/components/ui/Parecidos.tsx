import Link from "next/link";
import type { ReactNode } from "react";
import Boton from "./Boton";
import { IconoCalendario, IconoPin } from "./Iconos";
import Imagen from "./Imagen";
import styles from "./Parecidos.module.css";
import renglon from "./Renglon.module.css";

type Props = {
  /** Lo que se encontró, tras «¿Es este?»: «Ya hay un lugar con ese nombre muy cerca:». */
  texto: string;
  /** Un elemento por cada parecido (el enlace a su ficha), cada uno ya dentro de su `li`. */
  children: ReactNode;
  /** Renglones con foto (un evento con su cartel) en vez de la lista con viñetas de los lugares. */
  conFoto?: boolean;
  /** «No, es otro: publicar de todos modos». */
  onConfirmar: () => void;
};

/**
 * «¿Es este?» del servidor al publicar (el lugar desde la Fase 2; el evento desde OL-384): lo que ya está publicado y se parece, con el enlace a
 * su ficha, y «No, es otro: publicar de todos modos». Va en «Revisa», encima del pie. Un solo bloque para los dos, para que se vean iguales.
 */
export default function Parecidos({ texto, children, conFoto, onConfirmar }: Props) {
  return (
    <div className={styles.parecidos} role="alert">
      <p>
        <b>¿Es este?</b> {texto}
      </p>
      <ul className={conFoto ? styles.conFoto : undefined}>{children}</ul>
      <Boton type="button" variante="secundario" onClick={onConfirmar}>
        No, es otro: publicar de todos modos
      </Boton>
    </div>
  );
}

/**
 * Un evento de «¿Es este?» (OL-384): el renglón de lista (`ui/Renglon`, `.frente`) con su cartel (o el símbolo SN), el título, el día y la hora
 * en su zona, y el sitio. Un toque abre su ficha en lugar del alta, como el lugar parecido.
 */
export function RenglonParecido({ href, imagen, titulo, cuando, donde }: { href: string; imagen: string; titulo: string; cuando: string; donde: string }) {
  return (
    <li>
      <Link href={href} replace className={renglon.frente}>
        <Imagen src={imagen} alt="" width={56} height={56} sizes="56px" className={renglon.foto} loading="eager" />
        <b>{titulo}</b>
        <small>
          <span>
            <IconoCalendario width={15} height={15} />
            <b>{cuando}</b>
          </span>
          {donde && (
            <span>
              <IconoPin width={15} height={15} />
              <span>{donde}</span>
            </span>
          )}
        </small>
      </Link>
    </li>
  );
}
