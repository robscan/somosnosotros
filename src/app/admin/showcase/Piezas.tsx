import type { JSX, SVGProps } from "react";
import { IconoBandera, IconoBoleto, IconoDocumento, IconoEnlace, IconoFacebook, IconoInstagram, IconoNota, IconoPincel, IconoSpotify, IconoYouTube } from "@/components/ui/Iconos";
import { etiquetaEstado, MAXIMO_RUBRICA, SENALES, type Estado, type Puntajes, type Red, type TipoEvidencia } from "@/lib/showcase";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/**
 * Piezas del showcase que no se tocan (OL-426, lo firmado en OL-425): la píldora del estado, la rúbrica en color y los iconos de cada red y de
 * cada tipo de evidencia. Las usan la lista (tarjetas y tabla) y la ficha.
 */

/** Candidato en gris, revisado en violeta, invitado en naranja, confirmado en verde y descartado tachado: las píldoras del panel. */
const CLASE_ESTADO: Record<Estado, string> = {
  candidato: "",
  revisado: admin.etiquetaRol,
  invitado: admin.destacada,
  confirmado: s.ok,
  descartado: s.tachada,
};
export function PildoraEstado({ estado, className }: { estado: Estado; className?: string }) {
  return <span className={[admin.etiqueta, CLASE_ESTADO[estado], className].filter(Boolean).join(" ")}>{etiquetaEstado(estado)}</span>;
}

/** Las cuatro señales 0–2 en color (2 verde, 1 naranja, 0 gris; sin puntuar, una raya) y el total sobre 8. */
export function Rubrica({ puntajes, suma }: { puntajes: Puntajes; suma: number }) {
  return (
    <ul className={s.rubrica} aria-label={`Rúbrica: ${suma} de ${MAXIMO_RUBRICA}`}>
      {SENALES.map((x) => {
        const p = puntajes[x.clave];
        return (
          <li key={x.clave} className={s.senal} data-n={p ?? undefined}>
            {x.etiqueta}
            <b>{p ?? "–"}</b>
          </li>
        );
      })}
      <li className={s.total}>
        {suma}
        <small>de {MAXIMO_RUBRICA}</small>
      </li>
    </ul>
  );
}

type P = SVGProps<SVGSVGElement>;
const ICONO_RED: Record<Red, (p: P) => JSX.Element> = { instagram: IconoInstagram, facebook: IconoFacebook, youtube: IconoYouTube, spotify: IconoSpotify, otra: IconoEnlace };
export function IconoRed({ red, ...p }: P & { red: Red }) {
  const Icono = ICONO_RED[red];
  return <Icono {...p} />;
}
const ICONO_TIPO: Record<TipoEvidencia, (p: P) => JSX.Element> = { presentacion: IconoBoleto, obra: IconoPincel, premio: IconoBandera, beca: IconoBandera, prensa: IconoDocumento, redes: IconoNota };
export function IconoTipo({ tipo, ...p }: P & { tipo: TipoEvidencia }) {
  const Icono = ICONO_TIPO[tipo];
  return <Icono {...p} />;
}
