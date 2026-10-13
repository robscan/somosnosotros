import Link from "next/link";
import { Fragment } from "react";
import { fotoDeEvento, hrefEvento, sitioEnLista } from "@/lib/eventos";
import { agruparPorMes, artistasDelHistorial, cabeceraHistorial, cabeceraTrayectoria, cuandoPasado, listaCon, lugaresDeTrayectoria, otrosArtistas, realizados, type EventoPasado, type Historial as DatosHistorial, type Presencia } from "@/lib/historialFichas";
import { SIN_FOTO_REDONDA } from "@/lib/imagen";
import BotonTuAnio from "./BotonTuAnio";
import { IconoCalendario, IconoChevronDerecha, IconoEtiqueta, IconoPersonas, IconoPin } from "./ui/Iconos";
import Imagen from "./ui/Imagen";
import Plegado from "./ui/Plegado";
import Renglon from "./ui/Renglon";
import SeCancelo from "./ui/SeCancelo";
import styles from "./Historial.module.css";

/** `tuAnio`: la vista previa de «Tu año» (OL-394), si quien mira gestiona la ficha y hay algo este año; sin ella, no hay botón. */
type Props =
  /** La trayectoria de un artista: sus fechas pasadas, dónde y con quién. */
  | { de: "artista"; artistaId: string; historial: DatosHistorial; tuAnio?: string | null }
  /** El historial de un lugar: sus eventos pasados y quiénes pasaron por ahí. */
  | { de: "lugar"; historial: DatosHistorial; tuAnio?: string | null };

/**
 * Lo que ya pasó en la ficha de un artista («Trayectoria») o de un lugar («Historial»): OL-390, prototipo firmado `historial-propuestas.html`
 * («H1 plegado · H2 propio · H3 por mes · H4 · H5 · K1 todos · Q1 fotos»). Plegado bajo lo próximo (`ui/Plegado`), con la cuenta en su
 * renglón; al abrir, la fila de fotos (Q1) y lo pasado por mes, lo más reciente primero. Cada renglón abre la ficha del evento en pasado, en gris
 * y sin nada que parezca activo: a la derecha, «2 fueron» si alguien dijo «Voy» (H4) o el chevrón. Sin nada pasado, no existe. Lo que se marcó
 * «se canceló» (OL-391, C1) se queda en su mes, tachado y con su etiqueta, pero no cuenta: ni en la cabecera («2 fechas · 1 cancelado»), ni en
 * la fila de fotos.
 */
export default function Historial(props: Props) {
  const { eventos, lleno } = props.historial;
  if (eventos.length === 0) return null;
  const esArtista = props.de === "artista";
  const presencias = esArtista ? lugaresDeTrayectoria(eventos) : artistasDelHistorial(eventos);
  const titulo = esArtista ? "Trayectoria" : "Historial";
  const ocurridos = realizados(eventos).length;
  const cancelados = eventos.length - ocurridos;
  const cuenta = esArtista ? cabeceraTrayectoria(ocurridos, presencias.length, lleno, cancelados) : cabeceraHistorial(ocurridos, presencias.length, lleno, cancelados);
  const tituloFila = esArtista ? "Se ha presentado en" : "Han pasado por aquí";
  return (
    <Plegado id={esArtista ? "trayectoria" : "historial"} titulo={titulo} cuenta={cuenta}>
      {presencias.length > 0 && (
        <>
          <p>
            {tituloFila} · {presencias.length}
          </p>
          <ul className={styles.fila} aria-label={tituloFila}>
            {presencias.map((p) => (
              <FotoPresencia key={p.id} p={p} />
            ))}
          </ul>
        </>
      )}
      {agruparPorMes(eventos).map((g) => (
        <Fragment key={g.clave}>
          <h3>{g.titulo}</h3>
          <ul aria-label={g.titulo}>
            {g.eventos.map((e) => (
              <RenglonPasado key={e.id} e={e} conSitio={esArtista} con={props.de === "artista" ? otrosArtistas(e, props.artistaId) : null} />
            ))}
          </ul>
        </Fragment>
      ))}
      {props.tuAnio && <BotonTuAnio href={props.tuAnio} className={styles.tuAnio} />}
    </Plegado>
  );
}

/** Una foto de la fila: redonda (sin foto, el círculo oscuro con el símbolo SN), el nombre en dos líneas y «2 veces» si repite. */
function FotoPresencia({ p }: { p: Presencia }) {
  return (
    <li>
      <Link href={p.href} className={styles.presencia}>
        <Imagen src={p.foto ?? SIN_FOTO_REDONDA} alt="" width={60} height={60} sizes="60px" className={styles.foto} />
        <span className={styles.nombre}>{p.nombre}</span>
        {p.veces > 1 && <span className={styles.veces}>{p.veces} veces</span>}
      </Link>
    </li>
  );
}

/**
 * Un renglón pasado (`ui/Renglon`, como «Próximas fechas»): el título, cuándo fue, dónde (en el artista; en el lugar es obvio) con su festival en
 * gris, y con quién (`con`: los otros artistas, en la trayectoria) o quiénes (en el historial del lugar, los artistas del evento). La miniatura es
 * su cartel o el símbolo SN, nunca la foto del lugar. Si se canceló (OL-391), «Se canceló» delante de cuándo era, el título tachado y, a la
 * derecha, el chevrón: nadie fue a lo que no ocurrió.
 */
function RenglonPasado({ e, conSitio, con }: { e: EventoPasado; conSitio: boolean; con: string[] | null }) {
  const gente = con ?? e.artistas.map((a) => a.nombre);
  return (
    <Renglon
      href={hrefEvento(e)}
      foto={fotoDeEvento({ imagen: e.imagen, lugar: null })}
      titulo={e.titulo}
      accion={
        e.van > 0 && !e.cancelado ? (
          <span className={styles.fueron}>
            <b>{e.van}</b>
            {e.van === 1 ? "fue" : "fueron"}
          </span>
        ) : (
          <IconoChevronDerecha width={20} height={20} className={styles.chevron} />
        )
      }
    >
      <span>
        <IconoCalendario width={15} height={15} />
        {e.cancelado && <SeCancelo />}
        <b>{e.cancelado ? `· ${cuandoPasado(e)}` : cuandoPasado(e)}</b>
      </span>
      {conSitio ? (
        <span>
          <IconoPin width={15} height={15} />
          <span className={styles.sitio}>{sitioEnLista(e)}</span>
          {e.festival && <span className={styles.festival}>· {e.festival}</span>}
        </span>
      ) : (
        e.festival && (
          <span>
            <IconoEtiqueta width={15} height={15} />
            <span>{e.festival}</span>
          </span>
        )
      )}
      {gente.length > 0 && (
        <span>
          <IconoPersonas width={15} height={15} />
          <span>{con ? `con ${listaCon(gente)}` : gente.join(", ")}</span>
        </span>
      )}
    </Renglon>
  );
}
