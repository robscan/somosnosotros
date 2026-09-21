"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { ChipNativo } from "@/components/ui/Chip";
import { isoALocal, ZONA_INICIAL } from "@/lib/fechas";
import { distanciaKm } from "@/lib/geo";
import { cierreSugeridoIso } from "@/lib/obras-colectivas";
import { nombreSugerido } from "@/lib/pincel";
import { leerUbicacion } from "@/lib/ubicacion";
import { crearPorUbicacion, type Resultado } from "./acciones";
import styles from "./obras.module.css";

type Lugar = { id: string; nombre: string; lat: number; lng: number; zona: string };

const SIN_RESULTADO: Resultado = { ok: true };

/**
 * «Crear obra aquí» (OL-088, bitácora 123): sin partir de un evento. Sugiere el lugar más cercano, un nombre y una
 * hora de cierre — los tres editables, sin formulario largo. La ubicación se lee una sola vez, aquí, y no se guarda
 * (mismo leerUbicacion() que ya usan Lugares y la Agenda); si no hay permiso o soporte, se elige el lugar a mano.
 */
export default function CrearObraAqui({ lugares }: { lugares: Lugar[] }) {
  const primero = lugares[0];
  const [lugarId, setLugarId] = useState(primero?.id ?? "");
  const [nombre, setNombre] = useState(primero ? nombreSugerido(primero.nombre) : "");
  const [hora, setHora] = useState(() => isoALocal(cierreSugeridoIso(), ZONA_INICIAL).slice(11, 16));
  const [buscando, setBuscando] = useState(true);
  const tocado = useRef(false);
  const [resultado, accion, pendiente] = useActionState(crearPorUbicacion, SIN_RESULTADO);

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

  if (lugares.length === 0) return <p className={styles.error}>Todavía no hay ningún lugar registrado.</p>;

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={accion} className={styles.form}>
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
      {resultado && !resultado.ok && (
        <p className={styles.error} role="alert">
          {resultado.error}
        </p>
      )}
      <Boton type="submit" disabled={pendiente}>
        Crear obra aquí
      </Boton>
    </form>
  );
}
