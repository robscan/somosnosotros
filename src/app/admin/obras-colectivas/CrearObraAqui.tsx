"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { ChipNativo } from "@/components/ui/Chip";
import { isoALocal, ZONA_INICIAL } from "@/lib/fechas";
import { distanciaKm } from "@/lib/geo";
import { cierreSugeridoIso } from "@/lib/obras-colectivas";
import { nombreSugerido, RADIO_CERCANIA_M } from "@/lib/pincel";
import { leerUbicacion, leerUbicacionConPrecision } from "@/lib/ubicacion";
import { crearParedAqui, crearPorUbicacion, type Resultado } from "./acciones";
import styles from "./obras.module.css";

type Lugar = { id: string; nombre: string; lat: number; lng: number; zona: string };

const SIN_RESULTADO: Resultado = { ok: true };

/**
 * «Crear obra aquí» (OL-088, bitácora 123): sin partir de un evento. Sugiere el lugar más cercano, un nombre y una
 * hora de cierre — los tres editables, sin formulario largo. La ubicación se lee una sola vez, aquí, y no se guarda
 * (mismo leerUbicacion() que ya usan Lugares y la Agenda); si no hay permiso o soporte, se elige el lugar a mano.
 *
 * «Crear pared aquí» (OL-127, founder: «también debe permitir crear pared en ubicación actual sin más»): un toque:
 * lee la ubicación (precisa) y crea la pared sin más pasos — con el lugar del directorio si hay uno a menos de
 * 200 m, o con sus propias coordenadas si no; nombre y cierre por defecto, editables después en su ficha.
 */
export default function CrearObraAqui({ lugares, puedeCrear }: { lugares: Lugar[]; puedeCrear: boolean }) {
  const router = useRouter();
  const primero = lugares[0];
  const [lugarId, setLugarId] = useState(primero?.id ?? "");
  const [nombre, setNombre] = useState(primero ? nombreSugerido(primero.nombre) : "");
  const [hora, setHora] = useState(() => isoALocal(cierreSugeridoIso(), ZONA_INICIAL).slice(11, 16));
  const [buscando, setBuscando] = useState(true);
  const tocado = useRef(false);
  const [resultado, accion, pendiente] = useActionState(crearPorUbicacion, SIN_RESULTADO);
  const [aqui, setAqui] = useState<{ estado: "quieto" | "ubicando" | "creando"; error: string | null }>({ estado: "quieto", error: null });

  useEffect(() => {
    let vivo = true;
    leerUbicacion()
      .then((punto) => {
        if (!vivo || tocado.current || lugares.length === 0) return;
        const cercano = [...lugares].sort((a, b) => distanciaKm(punto, a) - distanciaKm(punto, b))[0];
        setLugarId(cercano.id);
        setNombre(nombreSugerido(cercano.nombre));
      })
      .catch(() => {})
      .finally(() => vivo && setBuscando(false));
    return () => {
      vivo = false;
    };
    // Solo al montar: una lectura, no un seguimiento en vivo de la posición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crearAqui() {
    setAqui({ estado: "ubicando", error: null });
    let donde: { lat: number; lng: number; precisionM: number };
    try {
      const { punto, precisionM } = await leerUbicacionConPrecision();
      donde = { ...punto, precisionM };
    } catch (e) {
      setAqui({ estado: "quieto", error: e === "negado" ? "Activa la ubicación, o elige un lugar abajo." : "No se pudo leer tu ubicación. Elige un lugar abajo." });
      return;
    }
    setAqui({ estado: "creando", error: null });
    const r = await crearParedAqui(donde);
    if (!r.ok) {
      setAqui({ estado: "quieto", error: r.error });
      return;
    }
    router.push(`/admin/obras-colectivas/${r.id}`);
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className={styles.aqui}>
        <Boton type="button" disabled={aqui.estado !== "quieto" || !puedeCrear} onClick={crearAqui}>
          {aqui.estado === "ubicando" ? "Buscando tu ubicación…" : aqui.estado === "creando" ? "Creando la pared…" : "Crear pared aquí"}
        </Boton>
        <p className={styles.ayudaAqui}>
          Con tu ubicación, sin más pasos: si hay un lugar del directorio a menos de {RADIO_CERCANIA_M} m, la pared queda ahí; si no, con sus propias coordenadas.
        </p>
        {aqui.error && (
          <p className={styles.error} role="alert">
            {aqui.error}
          </p>
        )}
      </div>
      {lugares.length === 0 ? (
        <p className={styles.error}>Todavía no hay ningún lugar registrado.</p>
      ) : (
        <form action={accion} className={styles.form}>
          <p className={styles.oBien}>O elige el lugar:</p>
          <input type="hidden" name="hora" value={`${hoy}T${hora}`} />
          <label className={styles.campo}>
            <span>Lugar{buscando ? " (buscando tu ubicación…)" : ""}</span>
            <select
              name="lugar_id"
              value={lugarId}
              onChange={(e) => {
                tocado.current = true;
                setLugarId(e.target.value);
              }}
              required
            >
              {lugares.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </label>
          <Campo
            etiqueta="Nombre"
            name="nombre"
            value={nombre}
            maxLength={120}
            onChange={(e) => {
              tocado.current = true;
              setNombre(e.target.value);
            }}
            required
          />
          <div className={styles.hora}>
            <span>Cierra a las</span>
            <ChipNativo tipo="time" valor={hora} activo={false} etiqueta={hora} onCambio={setHora} ariaLabel="Hora de cierre" />
          </div>
          {!puedeCrear && (
            <p className={styles.error} role="alert">
              Ya hay dos obras abiertas; termina una para abrir otra.
            </p>
          )}
          {resultado && !resultado.ok && (
            <p className={styles.error} role="alert">
              {resultado.error}
            </p>
          )}
          <Boton type="submit" variante="secundario" disabled={pendiente || !puedeCrear}>
            Crear obra aquí
          </Boton>
        </form>
      )}
    </>
  );
}
