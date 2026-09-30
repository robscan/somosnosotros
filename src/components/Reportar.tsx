"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { MOTIVOS } from "@/lib/reportes";
import { reportar, type ResultadoReporte } from "@/app/reportes";
import Boton from "@/components/ui/Boton";
import { IconoBandera } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import styles from "./Reportar.module.css";

import type { TipoReportado } from "@/lib/reportes";

type Props = { tipo: TipoReportado; objetoId: string; volver: string; conSesion: boolean };

/** «Reportar», una fila del menú «···» de una ficha (como las de Ajustes); al tocarla, motivo y un renglón opcional. El admin lo revisa. */
export default function Reportar({ tipo, objetoId, volver, conSesion }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState("");
  const [resultado, enviar, enviando] = useActionState<ResultadoReporte | null, FormData>(reportar, null);

  if (resultado?.ok) return <p className={styles.gracias}>Gracias. La administración lo revisa.</p>;
  if (!conSesion)
    return (
      <Link href={`/entrar?siguiente=${encodeURIComponent(volver)}`} className={renglon.ajuste}>
        <IconoBandera width={20} height={20} />
        <b>Reportar</b>
      </Link>
    );
  if (!abierto)
    return (
      <button type="button" className={renglon.ajuste} onClick={() => setAbierto(true)}>
        <IconoBandera width={20} height={20} />
        <b>Reportar</b>
      </button>
    );
  return (
    <form action={enviar} className={styles.formulario}>
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="objeto_id" value={objetoId} />
      <input type="hidden" name="volver" value={volver} />
      <div className={styles.motivos} role="radiogroup" aria-label="Motivo">
        {MOTIVOS.map((m) => (
          <label key={m.valor} className={styles.motivo}>
            <input type="radio" name="motivo" value={m.valor} required /> {m.etiqueta}
          </label>
        ))}
      </div>
      <span className={limpiar.caja}>
        <input name="detalle" className={styles.detalle} placeholder="Algo más que deba saber la administración (opcional)" maxLength={500} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        <Limpiar visible={!!detalle} />
      </span>
      {resultado && !resultado.ok && (
        <p className={styles.error} role="alert">
          {resultado.error}
        </p>
      )}
      <div className={styles.acciones}>
        <Boton type="submit" alto="control" ancho="contenido" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar reporte"}
        </Boton>
        <button type="button" className={styles.enlace} onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
