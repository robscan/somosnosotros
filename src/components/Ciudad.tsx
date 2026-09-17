"use client";

import Link from "next/link";
import { useState } from "react";
import type { Ciudad, CiudadConArtistas, CiudadConDatos } from "@/lib/ciudad";
import chip from "./ui/Chip.module.css";
import Hoja from "./ui/Hoja";
import { IconoCaret, IconoPin } from "./ui/Iconos";
import styles from "./Ciudad.module.css";

type Props = {
  ciudad: Ciudad;
  /** Las de la agenda y Lugares cuentan lugares y eventos; las de Artistas, artistas. La hoja habla de lo que se cuenta. */
  ciudades: CiudadConDatos[] | CiudadConArtistas[];
  /** A dónde lleva cada ciudad (la agenda, Lugares…). */
  hrefDe: (c: Ciudad) => string;
  className?: string;
};

/**
 * El chip de ciudad y su hoja (decisión del founder, 2026-09-16): siempre se abre, aunque haya una sola ciudad, y lista
 * las ciudades que hay con lo que tienen. No hay alta de ciudad: una ciudad aparece en cuanto alguien registra un lugar
 * en ella (agenda y Lugares) o un artista (Artistas).
 */
export default function ChipCiudad({ ciudad, ciudades, hrefDe, className = "" }: Props) {
  const [abierta, setAbierta] = useState(false);
  const deArtistas = ciudades.some((c) => "artistas" in c);
  return (
    <>
      <button type="button" className={`${chip.chip} ${className}`} onClick={() => setAbierta(true)} aria-haspopup="dialog">
        <IconoPin width={16} height={16} />
        <span>{ciudad.nombre}</span>
        <IconoCaret width={12} height={12} />
      </button>
      {abierta && (
        <Hoja etiqueta="Dónde" onCerrar={() => setAbierta(false)}>
          <h3>Dónde</h3>
          <p>{deArtistas ? "Las ciudades donde ya hay artistas registrados. Registra un artista en otra ciudad y aparecerá aquí." : "Las ciudades donde ya hay lugares registrados. Registra un lugar en otra ciudad y aparecerá aquí."}</p>
          {ciudades.map((c) => (
            <Link key={c.slug} href={hrefDe(c)} className={`${styles.opcion} ${c.slug === ciudad.slug ? styles.elegida : ""}`} onClick={() => setAbierta(false)} aria-current={c.slug === ciudad.slug ? "true" : undefined}>
              <span>{c.nombre}</span>
              <span>{resumen(c)}</span>
            </Link>
          ))}
        </Hoja>
      )}
    </>
  );
}

/** "58 lugares · 85 eventos", "1 lugar" o "Sin lugares todavía"; en Artistas, "522 artistas" o "Sin artistas todavía". */
function resumen(c: CiudadConDatos | CiudadConArtistas): string {
  if ("artistas" in c) return c.artistas === 1 ? "1 artista" : c.artistas ? `${c.artistas} artistas` : "Sin artistas todavía";
  const partes: string[] = [];
  if (c.lugares) partes.push(c.lugares === 1 ? "1 lugar" : `${c.lugares} lugares`);
  if (c.eventos) partes.push(c.eventos === 1 ? "1 evento" : `${c.eventos} eventos`);
  return partes.length ? partes.join(" · ") : "Sin lugares todavía";
}
