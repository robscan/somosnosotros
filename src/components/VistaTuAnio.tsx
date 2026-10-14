"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useVolver } from "./ui/Atras";
import { useConfirmacion } from "./ui/Confirmacion";
import { IconoChevronIzquierda, IconoCerrar, IconoCompartir, IconoDescarga } from "./ui/Iconos";
import { fotosDelSistema, type VentanaConFotos } from "@/lib/guardarCartel";
import { medirCliente } from "@/lib/medir";
import type { SujetoTuAnio } from "@/lib/tuAnio";
import styles from "./VistaTuAnio.module.css";

type Props = {
  /** «Tu 2026». */
  titulo: string;
  /** De quién es el año (solo para medir: nunca cuál). */
  que: SujetoTuAnio;
  /** La ficha (o el perfil) a la que vuelven Atrás y la ✕ si no hay pantalla anterior. */
  volver: string;
  /** La imagen a 720 (la que se ve), a 1080 (la que se comparte) y a 1080 como archivo (la de «Guardar» sin JavaScript). */
  imagen: string;
  completa: string;
  descarga: string;
  /** El nombre del archivo («tu-2026-feleal.jpg»). */
  archivo: string;
  /** Lo que lee el lector de pantalla de la imagen. */
  alt: string;
};

/** La app trae (o no) el plugin de Fotos (`lib/guardarCartel`, el mismo del cartel). */
const fotos = () => fotosDelSistema(window as unknown as VentanaConFotos);

/** La imagen en base64 sin el prefijo `data:…;base64,`, como la pide el plugin de Fotos. */
function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(",")[1] ?? "");
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });
}

/** Descarga un archivo que ya está en memoria (un enlace con `download` hacia un `blob:` de este origen). */
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

/**
 * La vista previa de «Tu año» (OL-394; prototipo firmado `tu-anio-propuestas.html`, `htmlPrevia`): fondo oscuro, la barra con Atrás, el título
 * y la ✕; la imagen al centro; abajo, anclados, «Compartir» (violeta, principal) y «Guardar». Solo publicación 4:5 (sin «Publicación / Historia»
 * ni «Otra pinta»: lo firmado).
 *  · Compartir abre la hoja del teléfono con la imagen como archivo (`navigator.share` con `files`, si `navigator.canShare({ files })`); donde no se
 *    pueden compartir archivos, guarda. La imagen de 1080 se pide al abrir la pantalla: Safari solo abre la hoja si se pide en el mismo toque.
 *  · Guardar, como el cartel (`BotonDescargarCartel`): en la app de iPhone, a Fotos; en la web, descarga el archivo. Es un enlace de verdad.
 * Se mide `tu_anio` con el medio («hoja» o «guardado»); cerrar la hoja sin compartir no cuenta.
 */
export default function VistaTuAnio({ titulo, que, volver, imagen, completa, descarga, archivo, alt }: Props) {
  const irse = useVolver(volver);
  const { avisar, nodo } = useConfirmacion();
  const [ocupado, setOcupado] = useState(false);
  const traido = useRef<Promise<File> | null>(null);

  const traer = useCallback((): Promise<File> => {
    traido.current ??= fetch(completa).then(async (r) => {
      if (!r.ok) throw new Error(`tu año ${r.status}`);
      const blob = await r.blob();
      return new File([blob], archivo, { type: blob.type || "image/jpeg" });
    });
    const pedido = traido.current;
    pedido.catch(() => {
      if (traido.current === pedido) traido.current = null;
    });
    return pedido;
  }, [completa, archivo]);
  useEffect(() => {
    traer().catch(() => {});
  }, [traer]);

  async function guardar() {
    let imagenLista: File;
    try {
      imagenLista = await traer();
    } catch {
      avisar({ texto: "No se pudo guardar", fallo: true });
      return;
    }
    const puente = fotos();
    if (puente) {
      try {
        await puente.guardarFoto({ datos: await aBase64(imagenLista), tipo: imagenLista.type });
      } catch {
        avisar({ texto: "No se pudo guardar", fallo: true });
        return;
      }
      avisar({ texto: "Imagen guardada en Fotos", fallo: false });
    } else {
      descargar(imagenLista);
      avisar({ texto: "Imagen descargada", fallo: false });
    }
    medirCliente("tu_anio", { que, medio: "guardado" });
  }

  async function compartir() {
    if (ocupado) return;
    setOcupado(true);
    try {
      let imagenLista: File;
      try {
        imagenLista = await traer();
      } catch {
        avisar({ texto: "No se pudo preparar la imagen", fallo: true });
        return;
      }
      const datos = { files: [imagenLista], title: titulo };
      if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare(datos)) {
        try {
          await navigator.share(datos);
          medirCliente("tu_anio", { que, medio: "hoja" });
        } catch (e) {
          // Cerró la hoja sin compartir: nada. Otro fallo de la hoja: se guarda.
          if (!(e instanceof DOMException && e.name === "AbortError")) await guardar();
        }
        return;
      }
      await guardar();
    } finally {
      setOcupado(false);
    }
  }

  function alGuardar(ev: MouseEvent<HTMLAnchorElement>) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    void guardar();
  }

  return (
    <main className={styles.previa}>
      <header className={styles.barra}>
        <a href={volver} onClick={irse} aria-label="Atrás">
          <IconoChevronIzquierda width={24} height={24} />
        </a>
        <h1>{titulo}</h1>
        <a href={volver} onClick={irse} aria-label="Cerrar">
          <IconoCerrar width={24} height={24} />
        </a>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la dibuja el servidor a 720 de ancho, como la vista previa del cartel */}
      <img className={styles.imagen} src={imagen} alt={alt} width={720} height={900} />
      <div className={styles.pie}>
        <button type="button" className={styles.principal} onClick={compartir} aria-busy={ocupado || undefined}>
          <IconoCompartir width={22} height={22} />
          Compartir
        </button>
        <a href={descarga} download={archivo} className={styles.secundario} onClick={alGuardar}>
          <IconoDescarga width={22} height={22} />
          Guardar
        </a>
      </div>
      {nodo}
    </main>
  );
}
