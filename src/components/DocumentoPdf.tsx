"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Boton from "./ui/Boton";
import { useConfirmacion } from "./ui/Confirmacion";
import Hoja from "./ui/Hoja";
import { IconoDescarga, IconoDocumento } from "./ui/Iconos";
import hoja from "./ui/Hoja.module.css";
import type { FormatoDocumento, PeriodoInforme } from "@/lib/documentos";
import { medirCliente } from "@/lib/medir";
import type { OpcionDocumento, PropsDocumento } from "@/lib/opcionesDocumento";
import styles from "./DocumentoPdf.module.css";

/** Descarga un archivo que ya está en memoria (un enlace con `download` hacia un `blob:` de este origen), como «Guardar» de «Tu año». */
function descargar(archivo: File) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const FORMATOS: { valor: FormatoDocumento; texto: string }[] = [
  { valor: "carta", texto: "Carta" },
  { valor: "a4", texto: "A4" },
];

/** Un segmento de opciones excluyentes (`.segmento` del prototipo): la elegida, en blanco con sombra. */
function Segmento<T extends string>({ etiqueta, opciones, valor, alElegir }: { etiqueta: string; opciones: { valor: T; texto: string }[]; valor: T; alElegir: (v: T) => void }) {
  return (
    <div className={styles.segmento} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => alElegir(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/**
 * «Presentación» (artista) e «Informe» (lugar) en PDF (OL-396; prototipo firmado `curriculo-propuestas.html`, «O junto a "Tu año"», «Q solo quien
 * gestiona», «X solo PDF»): la pastilla con borde junto a «Tu año» y, al tocarla, la hoja de opciones sobre la ficha (`ui/Hoja`): el título, la
 * línea de ayuda con cuántas páginas salen, en el lugar el periodo (el mes · el año · Todo), el tamaño (Carta / A4) y, anclado abajo, «Descargar
 * PDF». Quien la pinta ya sabe que quien mira gestiona la ficha y que hay algo pasado. OL-415 (bitácora 447): fuera el renglón apagado «Preparar
 * una reseña · Pronto», que prometía algo que no existe; la reseña con IA sigue siendo una pieza futura.
 *  · El PDF se pide al abrir la hoja y al cambiar una opción, y se reutiliza: Safari solo abre la hoja de compartir dentro del mismo toque.
 *  · En el teléfono que comparte archivos (`navigator.canShare({ files })`, el iPhone), la hoja de compartir con el PDF; si no, se descarga.
 * Se mide `documento` con el medio («hoja» o «guardado»); cerrar la hoja de compartir sin compartir no cuenta.
 */
export default function DocumentoPdf({ que, opciones, etiquetasPeriodo, className }: PropsDocumento & { className?: string }) {
  const [abierta, setAbierta] = useState(false);
  const [formato, setFormato] = useState<FormatoDocumento>("carta");
  const [periodo, setPeriodo] = useState<PeriodoInforme>("mes");
  const [ocupado, setOcupado] = useState(false);
  const { avisar, nodo } = useConfirmacion();
  const traidos = useRef(new Map<string, Promise<File>>());
  const esArtista = que === "artista";
  const titulo = esArtista ? "Presentación" : "Informe de actividad";
  const opcion: OpcionDocumento | undefined = opciones.find((o) => o.formato === formato && (esArtista || o.periodo === periodo));

  const traer = useCallback((o: OpcionDocumento): Promise<File> => {
    const guardado = traidos.current.get(o.href);
    if (guardado) return guardado;
    const pedido = fetch(o.href).then(async (r) => {
      if (!r.ok) throw new Error(`documento ${r.status}`);
      return new File([await r.blob()], o.archivo, { type: "application/pdf" });
    });
    traidos.current.set(o.href, pedido);
    pedido.catch(() => traidos.current.delete(o.href));
    return pedido;
  }, []);
  useEffect(() => {
    if (abierta && opcion) traer(opcion).catch(() => {});
  }, [abierta, opcion, traer]);

  async function bajar() {
    if (!opcion || ocupado) return;
    setOcupado(true);
    try {
      let pdf: File;
      try {
        pdf = await traer(opcion);
      } catch {
        avisar({ texto: "No se pudo preparar el PDF", fallo: true });
        return;
      }
      const datos = { files: [pdf], title: titulo };
      if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare(datos)) {
        try {
          await navigator.share(datos);
          medirCliente("documento", { que, medio: "hoja" });
          return;
        } catch (e) {
          // Cerró la hoja sin compartir: nada. Otro fallo de la hoja: se descarga.
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }
      descargar(pdf);
      avisar({ texto: "PDF descargado", fallo: false });
      medirCliente("documento", { que, medio: "guardado" });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button type="button" className={[styles.boton, className].filter(Boolean).join(" ")} onClick={() => setAbierta(true)} aria-haspopup="dialog">
        <IconoDocumento width={20} height={20} />
        {esArtista ? "Presentación" : "Informe"}
      </button>
      {abierta && opcion && (
        <Hoja
          etiqueta={titulo}
          titulo={titulo}
          onCerrar={() => setAbierta(false)}
          pie={
            <Boton type="button" forma="pildora" onClick={bajar} aria-busy={ocupado || undefined}>
              <IconoDescarga width={22} height={22} />
              Descargar PDF
            </Boton>
          }
        >
          <div className={styles.cuerpo}>
            <p className={hoja.nota}>{opcion.ayuda}</p>
            {!esArtista && etiquetasPeriodo && (
              <div className={styles.grupo}>
                <p className={styles.etiqueta}>Periodo</p>
                <Segmento<PeriodoInforme> etiqueta="Periodo" valor={periodo} alElegir={setPeriodo} opciones={(["mes", "anio", "todo"] as const).map((v) => ({ valor: v, texto: etiquetasPeriodo[v] }))} />
              </div>
            )}
            <Segmento<FormatoDocumento> etiqueta="Tamaño de la hoja" valor={formato} alElegir={setFormato} opciones={FORMATOS} />
          </div>
        </Hoja>
      )}
      {nodo}
    </>
  );
}
