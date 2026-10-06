"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

type Textos = { reposo: string; preparando: string; listo: string; fallo: string };
const TEXTOS: Textos = { reposo: "Descargar el cartel", preparando: "Preparando…", listo: "Cartel descargado", fallo: "No se pudo descargar" };
/** Cuánto se queda «Cartel descargado» (o el aviso de fallo) antes de volver al texto de siempre. */
const AVISO_MS = 4000;

type Cartel = { blob: Blob; nombre: string };

type Props = {
  /** El evento: su slug o su UUID, como los entiende `/api/cartel/[id]`. */
  id: string;
  /** El título del evento, para la hoja de compartir. */
  titulo: string;
  className: string;
  /** Lo que va antes del texto (el icono; en la ficha, dentro de su círculo). */
  icono?: ReactNode;
  /** Lo que dice en cada momento; lo que no se da queda como en `TEXTOS`. */
  textos?: Partial<Textos>;
  /** Lo que lee el lector de pantalla cuando el texto es corto («Cartel»). */
  etiqueta?: string;
  /** Pide el cartel al montarse, para que el toque ya lo tenga: la hoja de compartir del iPhone solo se abre si el toque la pide al instante. */
  precargar?: boolean;
};

/** El nombre que trae la respuesta (`Content-Disposition`), o uno genérico. */
function nombreDe(r: Response, tipo: string): string {
  return /filename="?([^";]+)"?/i.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? `cartel.${tipo === "image/png" ? "png" : "jpg"}`;
}

/** Descarga un archivo que ya está en memoria: un enlace con `download` hacia un `blob:` de este mismo origen. */
function guardar({ blob, nombre }: Cartel) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * «Descargar el cartel» (OL-304; pedido del founder: «ofrece opción de descargar cartel de eventos. Al final del flujo y en la ficha
 * del evento»): sirve para llevarlo a WhatsApp o a Instagram. Donde el navegador puede compartir archivos (el iPhone) abre la hoja del
 * sistema con la imagen, que ofrece «Guardar imagen», WhatsApp e Instagram; donde no, la descarga de siempre. La imagen vive en otro
 * origen, así que se pide a `/api/cartel/[id]`, que la entrega como archivo. Mientras se trae dice «Preparando…»; al terminar, «Cartel
 * descargado» unos segundos. Es un enlace de verdad (mejora progresiva, como `BotonCalendario`): sin JavaScript descarga igual.
 */
export default function BotonDescargarCartel({ id, titulo, className, icono, textos, etiqueta, precargar = false }: Props) {
  const dice = { ...TEXTOS, ...textos };
  const href = `/api/cartel/${encodeURIComponent(id)}`;
  const [estado, setEstado] = useState<"reposo" | "preparando" | "listo" | "fallo">("reposo");
  const aviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // El cartel que ya se trajo (o se está trayendo): una sola petición aunque se toque dos veces.
  const traido = useRef<Promise<Cartel> | null>(null);
  useEffect(() => () => clearTimeout(aviso.current), []);

  const traer = useCallback((): Promise<Cartel> => {
    traido.current ??= fetch(href).then(async (r) => {
      if (!r.ok) throw new Error(`cartel ${r.status}`);
      const blob = await r.blob();
      return { blob, nombre: nombreDe(r, blob.type) };
    });
    // Un fallo no se queda guardado: el siguiente toque vuelve a pedirlo.
    const pedido = traido.current;
    pedido.catch(() => {
      if (traido.current === pedido) traido.current = null;
    });
    return pedido;
  }, [href]);
  useEffect(() => {
    if (precargar) traer().catch(() => {});
  }, [precargar, traer]);

  const avisar = (nuevo: "listo" | "fallo") => {
    setEstado(nuevo);
    clearTimeout(aviso.current);
    aviso.current = setTimeout(() => setEstado("reposo"), AVISO_MS);
  };

  async function alTocar(ev: MouseEvent<HTMLAnchorElement>) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    if (estado === "preparando") return;
    clearTimeout(aviso.current);
    setEstado("preparando");
    let cartel: Cartel;
    try {
      cartel = await traer();
    } catch {
      avisar("fallo");
      return;
    }
    const archivo = new File([cartel.blob], cartel.nombre, { type: cartel.blob.type });
    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: titulo });
        avisar("listo");
        return;
      } catch (e) {
        // Cerrar la hoja sin elegir nada no es un fallo ni una descarga; cualquier otra cosa cae en la descarga de siempre.
        if (e instanceof DOMException && e.name === "AbortError") {
          setEstado("reposo");
          return;
        }
      }
    }
    guardar(cartel);
    avisar("listo");
  }

  return (
    <a href={href} download className={className} onClick={alTocar} aria-label={estado === "reposo" ? etiqueta : undefined} aria-busy={estado === "preparando" || undefined} aria-live="polite">
      {icono}
      {dice[estado]}
    </a>
  );
}
