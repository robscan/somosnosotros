"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HojaMaterial from "@/components/instagram/HojaMaterial";
import Grupo from "@/components/ui/Grupo";
import Renglon from "@/components/ui/Renglon";
import renglonCss from "@/components/ui/Renglon.module.css";
import lista from "@/components/Lista.module.css";
import { SIN_FOTO } from "@/lib/imagen";
import type { FaltaMaterial } from "./semana";
import styles from "./SemanaInstagram.module.css";

/**
 * El renglón «Falta material» de Administración › Instagram (OL-488, bitácora 520): quién se quedó fuera de la semana por falta de foto o portada;
 * tocarlo abre su hoja (`HojaMaterial`, con «Pedírselo» y «Subir yo»). Va al final de «Semana» y, OL-495, arriba de «Eventos» cuando la semana
 * está vacía por eso. Quien lo pinta guarda si la hoja está abierta (la semana también la abre desde un día sin material).
 */
export default function RenglonFalta({ falta, usuarioId, abierta, onAbrir, onCerrar }: { falta: FaltaMaterial; usuarioId: string; abierta: boolean; onAbrir: () => void; onCerrar: () => void }) {
  const router = useRouter();
  return (
    <>
      <Grupo>
        <Renglon
          href="/admin/instagram"
          foto={falta.fichas.find((f) => f.foto)?.foto ?? SIN_FOTO}
          redonda
          titulo="Falta material"
          onClick={(e) => {
            e.preventDefault();
            onAbrir();
          }}
        >
          <span className={renglonCss.envuelve}>{falta.resumen}</span>
          <span className={`${renglonCss.envuelve} ${styles.falta}`}>Pedírselo o subirla tú</span>
        </Renglon>
      </Grupo>
      {abierta && <HojaMaterial falta={falta} usuarioId={usuarioId} onCerrar={onCerrar} onCambio={() => router.refresh()} />}
    </>
  );
}

/** OL-495: arriba de «Eventos», con la semana vacía por falta de material: la línea que lo dice y el renglón «Falta material» con su hoja. */
export function SemanaSinMaterial({ falta, usuarioId }: { falta: FaltaMaterial; usuarioId: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <p className={lista.conteo}>Esta semana no hay nada programado: a nadie le alcanza el material.</p>
      <RenglonFalta falta={falta} usuarioId={usuarioId} abierta={abierta} onAbrir={() => setAbierta(true)} onCerrar={() => setAbierta(false)} />
    </>
  );
}
