"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { esAppNativa } from "@/lib/appNativa";
import { rutaDeEnlaceApp } from "@/lib/enlaceApp";

type Oyente = { remove: () => void | Promise<void> };
/** `@capacitor/app` por el puente que la app inyecta (`window.Capacitor.Plugins.App`), sin el paquete de npm en la web. */
type PuenteApp = { addListener: (evento: "appUrlOpen", fn: (datos: { url?: string }) => void) => Promise<Oyente> | Oyente };

/**
 * Solo dentro de la app de la tienda (OL-474): cuando la app recibe una dirección de fuera («Abrir» del letrero de Apple en Safari, o un
 * enlace con la app ya abierta), navega a esa ruta con el router (`lib/enlaceApp`). Si ya se está ahí no hace nada: los enlaces universales
 * los carga además el envoltorio (`SceneDelegate.swift`), y `appUrlOpen` se guarda hasta que alguien lo escucha, así que puede llegar otra
 * vez a la página que ya los cargó. En Safari y Chrome no existe el puente y esto no hace nada. No pinta nada.
 */
export default function AbrirEnlaceApp() {
  const router = useRouter();
  useEffect(() => {
    if (!esAppNativa(window.navigator.userAgent)) return;
    const puente = (window as Window & { Capacitor?: { Plugins?: { App?: PuenteApp } } }).Capacitor?.Plugins?.App;
    if (!puente) return;
    let oyente: Oyente | null = null;
    let vivo = true;
    const alAbrir = (datos: { url?: string }) => {
      const ruta = rutaDeEnlaceApp(datos?.url);
      if (!ruta) return;
      if (ruta === window.location.pathname + window.location.search + window.location.hash) return;
      router.push(ruta);
    };
    try {
      // Por el puente la app puede devolver el oyente directo o una promesa (OL-220, `lib/pushCliente.ts`): se aceptan las dos.
      const r = puente.addListener("appUrlOpen", alAbrir);
      if (r && typeof (r as Promise<Oyente>).then === "function") {
        (r as Promise<Oyente>).then((o) => (vivo ? (oyente = o) : o.remove())).catch(() => {});
      } else oyente = r as Oyente;
    } catch {}
    return () => {
      vivo = false;
      try {
        oyente?.remove();
      } catch {}
    };
  }, [router]);
  return null;
}
