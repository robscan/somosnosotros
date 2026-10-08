import Link from "next/link";
import type { ReactNode } from "react";
import { IconoCandado, IconoChevronDerecha, IconoPin } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";

/**
 * Un sitio en una línea (`Renglon .dato`): el pin (el candado si es reservado), su nombre, su meta y, si tiene ficha, el ángulo que la abre.
 * Regla del founder (2026-10-08, OL-348): el ángulo de un lugar siempre abre una ficha, la del lugar del directorio o la de un sitio fuera de
 * él, nunca un mapa; «Cómo llegar» vive en las fichas. Sin `href` (un sitio reservado) no hay ángulo. Lo usan la lista de sedes de un
 * festival y el sitio de la ficha de un evento; la tarjeta del pin del mapa a pantalla completa (OL-349) puede ser esta misma.
 */
export default function TarjetaSede({ nombre, href, reservado = false, children }: { nombre: string; href: string | null; reservado?: boolean; children?: ReactNode }) {
  const contenido = (
    <>
      {reservado ? <IconoCandado width={20} height={20} /> : <IconoPin width={20} height={20} />}
      <b>{nombre}</b>
      {children}
    </>
  );
  if (!href) return <div className={renglon.dato}>{contenido}</div>;
  return (
    <Link href={href} className={renglon.dato}>
      {contenido}
      <IconoChevronDerecha />
    </Link>
  );
}
