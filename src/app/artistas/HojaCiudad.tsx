"use client";

import { useEffect, useState } from "react";
import Hoja from "@/components/ui/Hoja";
import Limpiar from "@/components/ui/Limpiar";
import { IconoBuscar, IconoPin } from "@/components/ui/Iconos";
import { CIUDAD_INICIAL, type CiudadConArtistas } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { buscarCiudades, type CiudadEncontrada } from "@/lib/geocodificar";
import canon from "@/components/ui/FormularioCanon.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./HojaCiudad.module.css";

type Props = {
  /** La ciudad que tiene el renglón ahora. */
  ciudad: string;
  /** Las ciudades que ya tienen artistas, con cuántos (las mismas de la hoja del chip de Artistas). */
  ciudades: CiudadConArtistas[];
  onElegir: (ciudad: string) => void;
  onCerrar: () => void;
};

type Busqueda = { texto: string; ciudades: CiudadEncontrada[] } | { texto: string; error: true };

/**
 * Hoja "Ciudad" del alta y la edición de artista (pedido del founder, 2026-09-16, noche). Un artista no tiene punto del
 * que deducir su ciudad y su ubicación no se pide al teléfono (DEFINICION: la ubicación solo ordena por cercanía): se
 * busca por nombre. Sin escribir, las ciudades que ya tienen artistas; al escribir, las de Mapbox de cualquier país,
 * primero las cercanas a la ciudad que se ve (el contexto ordena, no limita). Un toque elige y cierra.
 */
export default function HojaCiudad({ ciudad, ciudades, onElegir, onCerrar }: Props) {
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const texto = q.trim();
  const buscando = texto.length >= 2;

  // Nombre → ciudades de Mapbox (300 ms tras dejar de escribir), cerca de la ciudad que tiene el renglón.
  useEffect(() => {
    const { mapboxToken } = configPublica();
    if (texto.length < 2 || !mapboxToken) return;
    const cerca = ciudades.find((c) => c.nombre === ciudad)?.centro ?? CIUDAD_INICIAL.centro;
    let vigente = true;
    const t = setTimeout(async () => {
      try {
        const encontradas = await buscarCiudades(texto, mapboxToken, cerca);
        if (vigente) setBusqueda({ texto, ciudades: encontradas });
      } catch {
        if (vigente) setBusqueda({ texto, error: true });
      }
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
    // la ciudad y la lista solo acercan la búsqueda; no hace falta buscar de nuevo cuando cambian
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  // Sin llave de Mapbox no hay búsqueda: se dice como un error, no se queda "Buscando…".
  const llego: Busqueda | null = buscando && !configPublica().mapboxToken ? { texto, error: true } : busqueda?.texto === texto ? busqueda : null;
  const elegir = (c: string) => {
    onElegir(c);
    onCerrar();
  };

  return (
    <Hoja etiqueta="Ciudad" onCerrar={onCerrar}>
      <h3>Ciudad</h3>
      <label className={`${canon.campo} ${styles.pegajoso}`}>
        <IconoBuscar width={20} height={20} />
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca la ciudad" aria-label="Buscar la ciudad" autoComplete="off" autoCapitalize="words" autoFocus />
        <Limpiar visible={!!q} />
      </label>

      {!buscando && (
        <ul className={sug.lista} role="listbox" aria-label="Ciudades con artistas">
          {ciudades.map((c) => (
            <li key={c.slug}>
              <button type="button" className={sug.renglon} onClick={() => elegir(c.nombre)} role="option" aria-selected={c.nombre === ciudad}>
                <IconoPin width={20} height={20} />
                <b>{c.nombre}</b>
                <small>{c.artistas === 1 ? "1 artista" : c.artistas ? `${c.artistas} artistas` : "Sin artistas todavía"}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {buscando && !llego && (
        <p className={styles.nota} role="status">
          Buscando…
        </p>
      )}
      {llego && "error" in llego && (
        <p className={canon.error} role="alert">
          No se pudo buscar. Revisa tu conexión e intenta de nuevo.
        </p>
      )}
      {llego && "ciudades" in llego && llego.ciudades.length === 0 && (
        <p className={styles.nota} role="status">
          No encontramos «{texto}». Prueba con el país, como «San José, Costa Rica».
        </p>
      )}
      {llego && "ciudades" in llego && llego.ciudades.length > 0 && (
        <ul className={sug.lista} role="listbox" aria-label="Ciudades encontradas">
          {llego.ciudades.map((c) => (
            <li key={`${c.ciudad}|${c.donde}`}>
              <button type="button" className={sug.renglon} onClick={() => elegir(c.ciudad)} role="option" aria-selected={c.ciudad === ciudad}>
                <IconoPin width={20} height={20} />
                <b>{c.ciudad}</b>
                {c.donde && <small>{c.donde}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Hoja>
  );
}
