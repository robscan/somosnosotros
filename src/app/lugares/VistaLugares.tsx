"use client";

import { useState } from "react";
import ListaLugares from "@/components/ListaLugares";
import Mapa from "@/components/Mapa";
import { IconoLista, IconoMapa } from "@/components/ui/Iconos";
import type { Ciudad } from "@/lib/ciudad";
import type { LugarResumen } from "@/lib/lugares";
import styles from "./lugares.module.css";

type Vista = "lista" | "mapa";
type Props = { lugares: LugarResumen[]; ciudad: Ciudad; conSesion: boolean; centrarEn: LugarResumen | null; vistaInicial: Vista };

/** Lista · Mapa como dos vistas del mismo directorio; la lista es la primera. */
export default function VistaLugares({ lugares, ciudad, conSesion, centrarEn, vistaInicial }: Props) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  return (
    <>
      <div className={styles.pestanas} role="tablist" aria-label="Cómo ver los lugares">
        <button type="button" role="tab" className={styles.pestana} aria-selected={vista === "lista"} onClick={() => setVista("lista")}>
          <IconoLista width={18} height={18} /> Lista
        </button>
        <button type="button" role="tab" className={styles.pestana} aria-selected={vista === "mapa"} onClick={() => setVista("mapa")}>
          <IconoMapa width={18} height={18} /> Mapa
        </button>
      </div>
      {vista === "lista" ? (
        <div className={styles.contenido}>
          <ListaLugares lugares={lugares} conSesion={conSesion} conAlta={lugares.length === 0} />
        </div>
      ) : (
        <div className={styles.cajaMapa}>
          <Mapa lugares={lugares} centrarEn={centrarEn} ciudad={ciudad} presentacion="caja" />
        </div>
      )}
    </>
  );
}
