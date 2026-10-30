"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import { IconoCalendario, IconoCartel, IconoDocumento, IconoEstrella, IconoPin } from "@/components/ui/Iconos";
import { pegado, verboDe, type LineaBusqueda, type Pildora, type TipoHoja } from "@/lib/ciudadesAdmin";
import { cancelarCorrida } from "./acciones";
import HojaCorrer from "./HojaCorrer";
import styles from "../admin.module.css";
import css from "./ciudades.module.css";

const ICONO: Record<TipoHoja, typeof IconoPin> = { lugares: IconoPin, agendas: IconoCalendario, artistas: IconoEstrella, carteles: IconoCartel, fichas: IconoDocumento };
/** «Carteles» (OL-444): su número son los eventos próximos sin cartel. «Fichas» (OL-489): las fichas con fecha a las que les falta algo. */
const TITULO: Record<TipoHoja, string> = { lugares: "Lugares", agendas: "Eventos próximos", artistas: "Artistas", carteles: "Carteles", fichas: "Fichas" };
/** La píldora de una búsqueda es la de Corridas (`corridas/page.tsx`). */
const CLASE_PILDORA: Record<Pildora["tono"], string> = {
  gris: styles.etiqueta,
  violeta: `${styles.etiqueta} ${styles.etiquetaRol}`,
  verde: `${styles.etiqueta} ${css.ok}`,
  naranja: `${styles.etiqueta} ${styles.destacada}`,
  rojo: `${styles.etiqueta} ${css.fallo}`,
};

type Props = {
  slug: string;
  ciudad: string;
  tipo: TipoHoja;
  /** El número de la tarjeta (lugares, eventos próximos, artistas o eventos próximos sin cartel) ya escrito, y lo que dice debajo. */
  valor: string;
  base: string | null;
  /** La última búsqueda de este botón, bajo la raya; null si nunca corrió. */
  linea: LineaBusqueda | null;
  /** El siguiente paso de la ciudad: el único botón violeta de la pantalla. */
  principal: boolean;
  /** La corrida que espera turno (su tarjeta lleva «Cancelar la búsqueda») o null. */
  pendiente: string | null;
  /** Una búsqueda que corre no se vuelve a correr: su tarjeta va sin botón. */
  corre: boolean;
  credito: string;
  vezPasada: string | null;
};

/**
 * Una tarjeta del panel de la ciudad (prototipo firmado OL-431, pantallas D, E y F): la de «Últimos 7 días» de la portada con su número y lo
 * que dice debajo, y bajo una raya la búsqueda que la alimenta (su píldora, su detalle, su razón si falló o llegó al tope, su barra si corre)
 * y su botón. «Pendiente» lleva «Cancelar la búsqueda»; «Corriendo», ninguno.
 */
export default function TarjetaBusqueda({ slug, ciudad, tipo, valor, base, linea, principal, pendiente, corre, credito, vezPasada }: Props) {
  const [abierta, setAbierta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, iniciar] = useTransition();
  const Icono = ICONO[tipo];
  const verbo = verboDe(tipo);

  function cancelar() {
    if (!pendiente) return;
    setError(null);
    iniciar(async () => {
      const r = await cancelarCorrida(pendiente);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <li className={css.ancha}>
      <div className={`${styles.indicador} ${css.tarjeta}`} role="group" aria-label={TITULO[tipo]}>
        <span className={`${styles.nombreIndicador} ${css.nombre}`}>
          <Icono width={18} height={18} />
          {TITULO[tipo]}
        </span>
        <b>{valor}</b>
        {base && <small>{base}</small>}
        {linea && (
          <p className={css.corrida}>
            <span className={CLASE_PILDORA[linea.pildora.tono]}>{linea.pildora.texto}</span>
            <span>{pegado(linea.texto)}</span>
          </p>
        )}
        {linea?.razon && <p className={[css.razon, linea.alerta && css.alerta].filter(Boolean).join(" ")}>{pegado(linea.razon)}</p>}
        {linea?.avance != null && (
          <span
            className={`${styles.barraEmbudo} ${css.barra}`}
            role="progressbar"
            aria-label={`Avance de ${verbo.toLowerCase()}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(linea.avance * 100)}
          >
            <i style={{ width: `${Math.round(linea.avance * 100)}%` }} />
          </span>
        )}
        {error && <p role="alert">{error}</p>}
        {pendiente ? (
          <Boton variante="secundario" ancho="contenido" className={css.accion} disabled={cancelando} aria-busy={cancelando} onClick={cancelar}>
            {cancelando ? "Cancelando…" : "Cancelar la búsqueda"}
          </Boton>
        ) : (
          !corre && (
            <Boton variante={principal ? "primario" : "secundario"} ancho="contenido" className={css.accion} aria-haspopup="dialog" onClick={() => setAbierta(true)}>
              {verbo}
            </Boton>
          )
        )}
      </div>
      {abierta && <HojaCorrer slug={slug} ciudad={ciudad} tipo={tipo} credito={credito} vezPasada={vezPasada} onCerrar={() => setAbierta(false)} />}
    </li>
  );
}
