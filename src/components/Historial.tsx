import { artistasDelHistorial, cabeceraHistorial, cabeceraTrayectoria, filasPasadas, lugaresDeTrayectoria, realizados, type Historial as DatosHistorial } from "@/lib/historialFichas";
import type { PropsDocumento } from "@/lib/opcionesDocumento";
import BotonTuAnio from "./BotonTuAnio";
import DocumentoPdf from "./DocumentoPdf";
import HistorialCuerpo from "./HistorialCuerpo";
import Plegado from "./ui/Plegado";
import type { AvisosLista } from "./useSeguirEnLista";
import styles from "./Historial.module.css";

/**
 * `tuAnio`: la vista previa de «Tu año» (OL-394), si quien mira gestiona la ficha y hay algo este año; sin ella, no hay botón. `documento`: las
 * opciones del PDF (OL-396, «Presentación» o «Informe»), si quien mira gestiona la ficha y hay algo pasado; sin ellas, no hay botón.
 * `seguidos` y `avisos` (OL-473): el «Seguir» de cada renglón de la hoja «Ver los N», como en Artistas y Lugares: lo que sigue quien mira entre
 * quienes pasaron (null sin sesión: Seguir lleva a entrar) y lo que pide la pregunta de avisos tras el primero.
 */
type Extras = { tuAnio?: string | null; documento?: PropsDocumento | null; seguidos?: string[] | null; avisos?: AvisosLista | null };
type Props =
  /** La trayectoria de un artista: sus fechas pasadas, dónde y con quién. */
  | ({ de: "artista"; artistaId: string; historial: DatosHistorial } & Extras)
  /** El historial de un lugar: sus eventos pasados y quiénes pasaron por ahí. */
  | ({ de: "lugar"; historial: DatosHistorial } & Extras);

/**
 * Lo que ya pasó en la ficha de un artista («Trayectoria») o de un lugar («Historial»): OL-390, prototipo firmado `historial-propuestas.html`
 * («H1 plegado · H2 propio · H3 por mes · H4 · H5 · K1 todos · Q1 fotos»), escalable desde OL-473 (prototipo firmado `historial-escalable.html`,
 * bitácora 501, «F1 · L1 · A1»). Plegado bajo lo próximo (`ui/Plegado`), con la cuenta en su renglón («84 eventos · 9 artistas registrados»;
 * «30 fechas · 8 lugares»). Al abrir, lo primero «Tu año» y el PDF (A1, solo para quien gestiona la ficha), enteros; luego quiénes pasaron en
 * el carril de Inicio con «Ver los N» (F1) y lo pasado por año y mes, de 20 en 20 (L1): `HistorialCuerpo`, en el cliente. Cada renglón abre la
 * ficha del evento en pasado, en gris; lo que se marcó «se canceló» (OL-391, C1) se queda en su mes, tachado, pero no cuenta: ni en la cabecera
 * («2 fechas · 1 cancelado») ni entre quienes pasaron. Sin nada pasado, no existe.
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
  const id = esArtista ? "trayectoria" : "historial";
  return (
    <Plegado id={id} titulo={titulo} cuenta={cuenta}>
      {(props.tuAnio || props.documento) && (
        // A1 (OL-473): lo primero de la sección, a lo ancho y enteros; «O junto a "Tu año"» (OL-396) y «O en la sección» (OL-394) se conservan.
        <div className={styles.botones}>
          {props.tuAnio && <BotonTuAnio href={props.tuAnio} />}
          {props.documento && <DocumentoPdf {...props.documento} />}
        </div>
      )}
      <HistorialCuerpo
        de={props.de}
        plegado={id}
        titulo={esArtista ? "Se ha presentado en" : "Han pasado por aquí"}
        presencias={presencias}
        filas={filasPasadas(eventos, props.de === "artista" ? props.artistaId : null)}
        seguidos={props.seguidos ?? null}
        avisos={props.avisos ?? null}
      />
    </Plegado>
  );
}
