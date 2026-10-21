import type { JSX, SVGProps } from "react";
import { IconoBandera, IconoBoleto, IconoDocumento, IconoEnlace, IconoFacebook, IconoInstagram, IconoNota, IconoPincel, IconoSpotify, IconoYouTube } from "@/components/ui/Iconos";
import SoloLector from "@/components/ui/SoloLector";
import { etiquetaEstado, MAXIMO_RUBRICA, SENALES, type Estado, type Red, type TipoEvidencia, type Valor, type Valores } from "@/lib/showcase";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/**
 * Piezas del showcase que no se tocan (OL-426, lo firmado en OL-425): la píldora del estado, la rúbrica en color y los iconos de cada red y de
 * cada tipo de evidencia. Las usan la lista (tarjetas y tabla) y la ficha. OL-437: el puntaje de cada señal dice si lo propone la base o se fijó.
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

/**
 * El puntaje que vale de una señal (OL-437): el número (lo fijado a mano, relleno de su color; lo que propone la base, en contorno discontinuo:
 * lo pone el atributo `data-origen` de la casilla) o «sin datos», que no es un 0. Lo que se oye dice de dónde sale.
 */
export function PuntajeSenal({ valor }: { valor: Valor }) {
  if (valor.origen === "sin_datos") return <small className={s.sinDatos}>sin datos</small>;
  return (
    <>
      <b>{valor.puntaje}</b>
      <SoloLector>{valor.origen === "propuesto" ? ", propuesto" : ", fijado a mano"}</SoloLector>
    </>
  );
}
/** Los atributos de la casilla de una señal: el color por puntaje y el dibujo por origen. */
export const datosCasilla = (v: Valor) => ({ "data-n": v.puntaje ?? undefined, "data-origen": v.origen });
/**
 * La celda de una señal en la tabla: el número en su casilla (o una raya si no hay datos, para que las trece columnas sigan cabiendo) y, al lado,
 * lo que se oye entero («2, propuesto», «sin datos»). La casilla no se oye: el lector dice la frase una vez.
 */
export function PuntajeTabla({ valor }: { valor: Valor }) {
  const oye = valor.origen === "sin_datos" ? "sin datos" : `${valor.puntaje}, ${valor.origen === "propuesto" ? "propuesto" : "fijado a mano"}`;
  return (
    <>
      <span className={s.n} {...datosCasilla(valor)} aria-hidden="true">
        {valor.puntaje ?? "–"}
      </span>
      <SoloLector>{oye}</SoloLector>
    </>
  );
}

/** Las cuatro señales 0–2 en color (2 verde, 1 naranja, 0 gris), propuestas en contorno discontinuo o fijadas rellenas, y el total sobre 8. */
export function Rubrica({ valores, suma }: { valores: Valores; suma: number }) {
  return (
    <ul className={s.rubrica} aria-label={`Rúbrica: ${suma} de ${MAXIMO_RUBRICA}`}>
      {SENALES.map((x) => (
        <li key={x.clave} className={s.senal} {...datosCasilla(valores[x.clave])}>
          {x.etiqueta}
          <PuntajeSenal valor={valores[x.clave]} />
        </li>
      ))}
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
