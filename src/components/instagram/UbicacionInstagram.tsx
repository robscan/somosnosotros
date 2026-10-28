"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoCaret, IconoInstagram } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { guardarUbicacionInstagram } from "@/app/admin/instagram/acciones";
import styles from "./UbicacionInstagram.module.css";

/**
 * «Ubicación en Instagram» de una ciudad en su panel de Administración (OL-458, prototipo firmado, pantalla F; bitácora 490): el renglón de
 * Ajustes dice si falta o cuál es, y abre una hoja con el campo del enlace de la página de Facebook de la ciudad (con su ✕) y un solo botón
 * («Falta el enlace» o «Guardar»). Se guarda una vez y la usan las publicaciones de la ciudad cuyo lugar no tenga la suya. Buscarla por la API
 * pide a Meta un permiso con revisión; por eso se pega a mano (decisión del founder al firmar).
 */
export default function UbicacionInstagram({ tipo, clave, nombre, guardada }: { tipo: "ciudad" | "lugar"; clave: string; nombre: string; guardada: string | null }) {
  const [abierta, setAbierta] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();
  const router = useRouter();
  const guardar = () =>
    empezar(async () => {
      setError(null);
      const r = await guardarUbicacionInstagram(tipo, clave, enlace).catch(() => ({ ok: false as const, mensaje: "No se pudo guardar. Intenta de nuevo." }));
      if (!r.ok) return setError(r.mensaje);
      setAbierta(false);
      setEnlace("");
      router.refresh();
    });
  return (
    <>
      <ul className={`${renglon.tarjeta} ${styles.renglon}`}>
        <li>
          <button type="button" className={renglon.ajuste} aria-haspopup="dialog" onClick={() => setAbierta(true)}>
            <IconoInstagram width={20} height={20} />
            <b>Ubicación en Instagram</b>
            <small>{guardada ? `${guardada} · la usan sus publicaciones sin ubicación propia` : "Falta: sus publicaciones salen sin ubicación"}</small>
            <span>
              <IconoCaret width={16} height={16} />
            </span>
          </button>
        </li>
      </ul>
      {abierta && (
        <Hoja
          etiqueta="Ubicación en Instagram"
          titulo="Ubicación en Instagram"
          onCerrar={() => !guardando && setAbierta(false)}
          pie={
            <Boton type="button" onClick={guardar} disabled={!enlace.trim() || guardando} aria-busy={guardando || undefined}>
              {guardando ? "Guardando…" : enlace.trim() ? "Guardar" : "Falta el enlace"}
            </Boton>
          }
        >
          <p className={hoja.nota}>Es el lugar que Instagram muestra arriba de la foto. Se guarda una vez y lo usan todos los eventos de {nombre} cuyo lugar no tenga la suya.</p>
          <Campo name="ubicacion-instagram" etiqueta="Enlace de su página de Facebook" value={enlace} onChange={(e) => setEnlace(e.target.value)} inputMode="url" autoComplete="off" placeholder="facebook.com/…" error={error ?? undefined} />
        </Hoja>
      )}
    </>
  );
}
