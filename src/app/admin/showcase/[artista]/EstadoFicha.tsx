"use client";

import { useState, useTransition } from "react";
import Hoja from "@/components/ui/Hoja";
import { IconoBandera, IconoChevronDerecha, IconoOk } from "@/components/ui/Iconos";
import type { Estado } from "@/lib/showcase";
import { cambiarEstado } from "../acciones";
import admin from "../../admin.module.css";
import hojaCss from "@/components/ui/Hoja.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import s from "../showcase.module.css";

type Props = {
  artistaId: string;
  slug: string;
  nombre: string;
  estado: Estado;
  /** «Invitado» y «Por ti el 18 oct · antes, revisado el 15 oct». */
  titulo: string;
  detalle: string;
  /** Los cinco estados con lo que quieren decir y, si ya lo tuvo, la última vez con quién y cuándo. */
  opciones: { valor: Estado; etiqueta: string; detalle: string }[];
};

/**
 * El estado del candidato en la ficha de showcase (lo firmado en OL-425): un renglón con quién y cuándo que abre la hoja de los cinco estados. La
 * base guarda quién lo cambió y cuándo (disparador de la migración 20261020130000); al volver de la acción, el renglón ya lo dice.
 */
export default function EstadoFicha({ artistaId, slug, nombre, estado, titulo, detalle, opciones }: Props) {
  const [abierta, setAbierta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();

  function elegir(valor: Estado) {
    if (valor === estado) return setAbierta(false);
    setError(null);
    iniciar(async () => {
      const r = await cambiarEstado(artistaId, valor, slug);
      if (!r.ok) return setError(r.error);
      setAbierta(false);
    });
  }
  return (
    <>
      <ul className={renglon.tarjeta}>
        <li>
          <button type="button" className={`${admin.fila} ${s.boton}`} aria-haspopup="dialog" data-ayuda="estado" onClick={() => (setError(null), setAbierta(true))}>
            <IconoBandera width={20} height={20} />
            <b>{titulo}</b>
            <small>{detalle}</small>
            <span className={admin.total}>
              <IconoChevronDerecha />
            </span>
          </button>
        </li>
      </ul>
      {abierta && (
        <Hoja etiqueta={`Estado de ${nombre}`} titulo="Estado" onCerrar={() => setAbierta(false)}>
          <p className={hojaCss.nota}>Cada cambio queda con quién y cuándo. Nada se publica fuera de Administración.</p>
          {error && (
            <p className="aviso-error" role="alert">
              {error}
            </p>
          )}
          <ul className={`${admin.menu} ${s.menu}`}>
            {opciones.map((o) => {
              const elegida = o.valor === estado;
              return (
                <li key={o.valor}>
                  <button type="button" className={`${admin.menuItem} ${s.opcion}`} aria-pressed={elegida} disabled={enCamino} onClick={() => elegir(o.valor)}>
                    <IconoOk width={20} height={20} className={elegida ? undefined : s.hueco} />
                    {o.etiqueta}
                    <small>{o.detalle}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </Hoja>
      )}
    </>
  );
}
