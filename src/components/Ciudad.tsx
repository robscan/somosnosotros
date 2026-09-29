"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ciudadMasCercana, type Ciudad, type CiudadConArtistas, type CiudadConDatos } from "@/lib/ciudad";
import { normalizarNombre } from "@/lib/lugares";
import { leerUbicacionCercana } from "@/lib/ubicacion";
import { CampoBuscar } from "./ui/Buscador";
import chip from "./ui/Chip.module.css";
import Hoja from "./ui/Hoja";
import { IconoBuscar, IconoCaret, IconoChevronDerecha, IconoOk, IconoPin, IconoUbicacion } from "./ui/Iconos";
import renglon from "./ui/Renglon.module.css";
import styles from "./Ciudad.module.css";

type Props = {
  ciudad: Ciudad;
  /** Las de la agenda y Lugares cuentan lugares y eventos; las de Artistas, artistas. La hoja habla de lo que se cuenta. */
  ciudades: CiudadConDatos[] | CiudadConArtistas[];
  /** A dónde lleva cada ciudad (la agenda, Lugares…). */
  hrefDe: (c: Ciudad) => string;
};

/**
 * El chip de ciudad, chip de contexto de ui/Cabecera, y su hoja «Dónde estás» (decisión del founder, 2026-09-16: siempre
 * se abre, aunque haya una sola ciudad). La ciudad ordena, no limita: por eso la hoja no filtra, dice desde dónde se mira.
 * «Cerca de ti» usa la ubicación del teléfono (solo tras el toque), la ciudad de ahora sale marcada y «Otra ciudad»
 * abre un campo con las demás, que se filtran al escribir, sin acentos. No hay alta de ciudad: una ciudad aparece en
 * cuanto alguien registra un lugar en ella (agenda y Lugares) o un artista (Artistas).
 */
export default function ChipCiudad({ ciudad, ciudades, hrefDe }: Props) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" className={`${chip.chip} ${chip.deContexto}`} onClick={() => setAbierta(true)} aria-haspopup="dialog">
        <IconoPin width={16} height={16} />
        <span>{ciudad.nombre}</span>
        <IconoCaret width={12} height={12} />
      </button>
      {abierta && <HojaDonde ciudad={ciudad} ciudades={ciudades} hrefDe={hrefDe} onCerrar={() => setAbierta(false)} />}
    </>
  );
}

function HojaDonde({ ciudad, ciudades, hrefDe, onCerrar }: Props & { onCerrar: () => void }) {
  const router = useRouter();
  const todas: readonly (CiudadConDatos | CiudadConArtistas)[] = ciudades;
  const deArtistas = todas.some((c) => "artistas" in c);
  const [otra, setOtra] = useState(false);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState(false);
  const buscado = normalizarNombre(texto);
  const demas = todas.filter((c) => c.slug !== ciudad.slug && normalizarNombre(c.nombre).includes(buscado));
  const actual = todas.find((c) => c.slug === ciudad.slug);

  async function cercaDeTi() {
    setAviso(false);
    try {
      const cerca = ciudadMasCercana(await leerUbicacionCercana(), todas);
      onCerrar();
      if (cerca.slug !== ciudad.slug) router.replace(hrefDe(cerca));
    } catch {
      setAviso(true);
    }
  }

  return (
    <Hoja etiqueta="Dónde estás" titulo="Dónde estás" onCerrar={onCerrar}>
      <p className={styles.nota}>Lo cercano va primero y lo demás después: la ciudad ordena, no limita.</p>
      <ul className={renglon.tarjeta}>
        <li>
          <button type="button" className={renglon.ajuste} onClick={cercaDeTi}>
            <IconoUbicacion width={20} height={20} />
            <b>Cerca de ti</b>
            <small>Usa la ubicación del teléfono</small>
            <IconoChevronDerecha />
          </button>
        </li>
        <li>
          <button type="button" className={renglon.ajuste} onClick={onCerrar} aria-current="true">
            <IconoPin width={20} height={20} />
            <b>{ciudad.nombre}</b>
            <small>{actual ? resumen(actual) : "Ciudad de ahora"}</small>
            <IconoOk />
          </button>
        </li>
        <li>
          <button type="button" className={renglon.ajuste} onClick={() => setOtra(true)} aria-expanded={otra}>
            <IconoBuscar width={20} height={20} />
            <b>Otra ciudad</b>
            <small>Escribe su nombre</small>
            <IconoChevronDerecha />
          </button>
        </li>
      </ul>
      {aviso && (
        <p className={styles.aviso} role="status">
          No pudimos leer tu ubicación. Elige una ciudad de la lista.
        </p>
      )}
      {otra && (
        <div className={styles.otra}>
          <CampoBuscar valor={texto} onCambiar={setTexto} placeholder="Nombre de la ciudad" ariaLabel="Nombre de la ciudad" autoFocus />
          {demas.length > 0 ? (
            <ul className={renglon.tarjeta}>
              {demas.map((c) => (
                <li key={c.slug}>
                  <Link href={hrefDe(c)} replace className={renglon.ajuste} onClick={onCerrar}>
                    <IconoPin width={20} height={20} />
                    <b>{c.nombre}</b>
                    <small>{resumen(c)}</small>
                    <IconoChevronDerecha />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.nota}>
              {buscado ? `Nada con «${texto.trim()}».` : "Aún no hay otras ciudades."} {deArtistas ? "Registra un artista en otra ciudad y aparecerá aquí." : "Registra un lugar en otra ciudad y aparecerá aquí."}
            </p>
          )}
        </div>
      )}
    </Hoja>
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
