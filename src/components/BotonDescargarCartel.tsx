"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { CONFIRMACION_MS, useConfirmacion } from "@/components/ui/Confirmacion";
import { IconoOk } from "@/components/ui/Iconos";
import { hrefCartelSubido } from "@/lib/cartelDescarga";
import { avisoDelCartel, destinoDelCartel, etiquetaDelCartel, fotosDelSistema, textosDelCartel, type VentanaConFotos } from "@/lib/guardarCartel";

type Cartel = { blob: Blob; nombre: string };
type Estado = "reposo" | "preparando" | "listo" | "fallo";

type Props = {
  /** El evento: su slug o su UUID, como los entiende `/api/cartel/[id]`. */
  id: string;
  /** La imagen del cartel subido: versiona la dirección de la descarga (OL-338, `hrefCartelSubido`), así un cartel nuevo no baja el anterior. */
  imagen?: string | null;
  className: string;
  /** Lo que va antes del texto (el icono; en la ficha, dentro de su círculo). */
  icono?: ReactNode;
  /** El icono mientras confirma («listo»): la palomita, en el mismo sitio y con el mismo envoltorio que `icono` (en la ficha, dentro de su círculo). Por defecto, una palomita sola. */
  iconoListo?: ReactNode;
  /** Letrero corto («Cartel», «En Fotos») para la ficha, donde va bajo un círculo como las demás acciones; el nombre completo queda en `aria-label`. */
  corto?: boolean;
  /** Pide el cartel al montarse, para que el toque ya lo tenga y la descarga o el guardado salgan al instante. */
  precargar?: boolean;
  /** Otra dirección de la imagen: el cartel generado por el creador (OL-324, `/api/cartel-nuevo/…&descarga=1`). Sin ella, el cartel subido. */
  href?: string;
  /** Al quedar guardado (descargado o en Fotos): el creador lo mide (OL-336). Un fallo no llama. */
  alGuardar?: () => void;
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

/** La imagen en base64 sin el prefijo `data:…;base64,`: así viaja por el puente de Capacitor hacia `FotosPlugin`. */
function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(",")[1] ?? "");
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });
}

/** La app trae (o no) el plugin de Fotos: no cambia mientras la página vive, así que no hay a qué suscribirse; en el servidor, no. */
const sinSuscripcion = () => () => {};
const hayFotos = () => fotosDelSistema(window as unknown as VentanaConFotos) !== null;
const hayFotosEnServidor = () => false;

/**
 * «Descargar el cartel» (OL-304; pedido del founder: «ofrece opción de descargar cartel de eventos. Al final del flujo y en la ficha del
 * evento») y «Guardar en Fotos» (OL-317; «agrega la opción de guardar en Fotos del celular»). Una sola pieza con dos comportamientos
 * según el entorno (`lib/guardarCartel`):
 * - **En la app de iPhone** (Capacitor con `FotosPlugin`): «Guardar en Fotos», un toque y la imagen queda en Fotos («Guardado en Fotos»).
 *   Si falla o la persona negó el permiso: «No se pudo guardar» (no cae en la descarga: dentro de la app un `blob:` descargable no tiene a dónde ir).
 * - **En la web** (Safari, la web instalada, cualquier navegador; y la app con una compilación vieja, sin el plugin): «Descargar el
 *   cartel» descarga el archivo de verdad, sin hoja de compartir (decisión del founder, 2026-10-06: «en web que se descargue como promete»).
 * La imagen vive en otro origen, así que se pide a `/api/cartel/[id]`, que la entrega como archivo. Es un enlace de verdad (mejora
 * progresiva, como `BotonCalendario`): sin JavaScript descarga igual.
 *
 * Confirma sin dejar dudas (OL-318; pedido del founder tras probar la 1.0 (5): «cambia el letrero del botón pero no es claro y terminé guardando
 * 3 veces el cartel»): al terminar sale el aviso flotante de `ui/Confirmacion` («Cartel guardado en Fotos», «Cartel descargado», o el fallo con su ✕),
 * y el botón, esos mismos 2,5 s, muestra la palomita y no responde a más toques (`aria-disabled`, no `disabled`: el estilo no se apaga).
 */
export default function BotonDescargarCartel({ id, imagen, className, icono, iconoListo, corto = false, precargar = false, href: otra, alGuardar }: Props) {
  const conFotos = useSyncExternalStore(sinSuscripcion, hayFotos, hayFotosEnServidor);
  const destino = destinoDelCartel({ conFotos });
  const dice = textosDelCartel(destino, corto);
  const href = otra ?? hrefCartelSubido(id, imagen);
  const [estado, setEstado] = useState<Estado>("reposo");
  const aviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // El cartel que ya se trajo (o se está trayendo): una sola petición aunque se toque dos veces.
  const traido = useRef<Promise<Cartel> | null>(null);
  useEffect(() => () => clearTimeout(aviso.current), []);
  // Otra imagen (en el creador, otro diseño o formato): lo traído antes ya no vale.
  useEffect(() => {
    traido.current = null;
  }, [href]);

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

  // El aviso flotante (OL-318): confirma con su palomita, su texto llano y, donde se puede, una vibración; el botón, durante el mismo tiempo, dice
  // «listo» con la suya y no responde a más toques, para que nadie guarde tres veces.
  const { avisar: confirmar, nodo } = useConfirmacion();
  const avisar = (nuevo: "listo" | "fallo") => {
    setEstado(nuevo);
    confirmar(avisoDelCartel(destino, nuevo === "fallo"));
    clearTimeout(aviso.current);
    aviso.current = setTimeout(() => setEstado("reposo"), CONFIRMACION_MS);
  };

  async function alTocar(ev: MouseEvent<HTMLAnchorElement>) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    // Ya se hizo (o se está haciendo): un toque más no pide ni guarda otra vez. Sigue siendo un enlace (sin `disabled`: no apaga el estilo).
    if (estado === "preparando" || estado === "listo") return;
    clearTimeout(aviso.current);
    setEstado("preparando");
    let cartel: Cartel;
    try {
      cartel = await traer();
    } catch {
      avisar("fallo");
      return;
    }
    const fotos = fotosDelSistema(window as unknown as VentanaConFotos);
    if (fotos) {
      try {
        await fotos.guardarFoto({ datos: await aBase64(cartel.blob), tipo: cartel.blob.type });
      } catch {
        avisar("fallo");
        return;
      }
    } else {
      guardar(cartel);
    }
    avisar("listo");
    alGuardar?.();
  }

  return (
    <>
      <a
        href={href}
        download
        className={className}
        onClick={alTocar}
        aria-label={corto && estado === "reposo" ? etiquetaDelCartel(destino) : undefined}
        aria-busy={estado === "preparando" || undefined}
        aria-disabled={estado === "listo" || undefined}
      >
        {estado === "listo" && icono ? (iconoListo ?? <IconoOk width={20} height={20} />) : icono}
        {dice[estado]}
      </a>
      {nodo}
    </>
  );
}
