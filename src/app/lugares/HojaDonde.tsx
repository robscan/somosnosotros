"use client";

import { useEffect, useState } from "react";
import Mapa from "@/components/Mapa";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import Limpiar from "@/components/ui/Limpiar";
import { IconoBuscar, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { buscarDirecciones, type Sugerencia } from "@/lib/geocodificar";
import type { Punto } from "@/lib/geo";
import canon from "@/components/ui/FormularioCanon.module.css";
import mapa from "@/components/Mapa.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./HojaDonde.module.css";

type Props = {
  /** Con foco en el campo de dirección (se entró por "Buscar"); sin foco, se entró por "Cambiar". */
  conFoco: boolean;
  punto: Punto | null;
  direccion: string;
  /** La persona en el mapa (punto azul), si ya se ubicó. */
  yo: (Punto & { vez: number }) | null;
  ubicando: boolean;
  onPunto: (p: Punto) => void;
  onDireccion: (d: string) => void;
  /** La ciudad de la dirección elegida (Mapbox la da; la inicial si no). */
  onCiudad: (c: string) => void;
  onEstoyAqui: () => void;
  onCerrar: () => void;
};

/**
 * Hoja "Dónde está" del alta de lugar (docs/rediseno/13, decisión 10): campo de dirección con sugerencias, mapa con
 * el pin y el botón de ubicación del mapa de Lugares, y la dirección deducida del pin. Se abre solo si hace falta.
 */
export default function HojaDonde({ conFoco, punto, direccion, yo, ubicando, onPunto, onDireccion, onCiudad, onEstoyAqui, onCerrar }: Props) {
  const [q, setQ] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);

  // Dirección → sugerencias de Mapbox (350 ms tras dejar de escribir).
  useEffect(() => {
    const texto = q.trim();
    const { mapboxToken } = configPublica();
    const corta = texto.length < 3 || !mapboxToken;
    const t = setTimeout(async () => setSugerencias(corta ? [] : await buscarDirecciones(texto, mapboxToken!, punto ?? yo ?? CIUDAD_INICIAL.centro)), corta ? 0 : 350);
    return () => clearTimeout(t);
    // el punto solo afina la cercanía; no hace falta buscar de nuevo cuando cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function elegir(s: Sugerencia) {
    setSugerencias([]);
    setQ("");
    onDireccion(s.direccion);
    if (s.ciudad) onCiudad(s.ciudad);
    onPunto({ lat: s.lat, lng: s.lng });
  }

  return (
    <Hoja etiqueta="Dónde está" onCerrar={onCerrar}>
      <h3>Dónde está</h3>
      <label className={canon.campo}>
        <IconoBuscar width={20} height={20} />
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Calle y número, o colonia" aria-label="Buscar la dirección" autoComplete="off" autoFocus={conFoco} />
        <Limpiar visible={!!q} />
      </label>
      {sugerencias.length > 0 && (
        <ul className={`${sug.lista} ${styles.sugerencias}`} role="listbox" aria-label="Direcciones encontradas">
          {sugerencias.map((s) => (
            <li key={`${s.lat},${s.lng}`}>
              <button type="button" className={sug.renglon} onClick={() => elegir(s)} role="option" aria-selected={false}>
                <IconoPin width={20} height={20} />
                <b>{s.nombre || s.direccion}</b>
                {s.nombre && <small>{s.direccion}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.mapa}>
        <Mapa modo="elegir" valor={punto} onCambio={onPunto} ubicacion={yo} />
        <button type="button" className={mapa.ubicame} onClick={onEstoyAqui} disabled={ubicando} aria-label="Estoy aquí">
          <IconoUbicacion width={22} height={22} />
        </button>
      </div>
      <p className={styles.deducida}>
        <IconoPin width={20} height={20} />
        <span>
          {direccion ? (
            <>
              <b>{direccion}</b> · se dedujo del pin
            </>
          ) : punto ? (
            "Pin puesto; la dirección se deduce sola"
          ) : (
            "Toca el mapa donde está: la dirección se deduce sola"
          )}
        </span>
      </p>
      <Boton type="button" onClick={onCerrar}>
        Listo
      </Boton>
    </Hoja>
  );
}
