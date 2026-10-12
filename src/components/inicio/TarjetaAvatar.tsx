"use client";

import Link from "next/link";
import type { Tarjeta } from "@/lib/destacados";
import { SIN_FOTO } from "@/lib/imagen";
import { tamanoImagenCarril } from "@/lib/imagenOptima";
import { avatarDeInicio } from "@/lib/tarjetaInicio";
import Imagen from "../ui/Imagen";
import { useTextoEnPalabra } from "./useTextoEnPalabra";
import styles from "./TarjetaAvatar.module.css";

/**
 * E5 (OL-372; prototipo firmado `inicio-tarjetas.html`, «Firmada», bitácora 398) con N (OL-382; prototipo `inicio-propuestas.html`, «Firmada»,
 * bitácora 408; founder, 2026-10-12: «probemos un tamaño más grande para generar más ancho y quepa más texto»): un lugar o un artista en
 * «Lugares de la semana» y «Artistas de la semana». La foto redonda de 88 (sin foto, la imagen ya generada con el símbolo SN), el nombre centrado
 * debajo en dos líneas como mucho, cortado en palabra entera con «…» (`useTextoEnPalabra`), y, solo si hay una novedad vigente, «Nuevo video» o
 * «Nuevo audio» en violeta (`avatarDeInicio`). Todo es un enlace a la ficha, cuyo nombre lleva el nombre entero; sin botón de seguir ni de
 * campana: seguir queda en la ficha.
 */
export default function TarjetaAvatar({ t }: { t: Tarjeta }) {
  const a = avatarDeInicio(t);
  const nombre = useTextoEnPalabra(a.nombre);
  return (
    <Link href={t.href} className={styles.avatar} aria-label={a.etiqueta}>
      <Imagen src={t.foto ?? SIN_FOTO} alt="" className={styles.foto} width={384} height={384} sizes={tamanoImagenCarril("avatar")} />
      <span ref={nombre} className={styles.nombre}>
        {a.nombre}
      </span>
      {a.nuevo && <span className={styles.nuevo}>{a.nuevo}</span>}
    </Link>
  );
}
