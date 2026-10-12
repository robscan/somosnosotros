"use client";

import { useEffect, useSyncExternalStore } from "react";
import { diaLocal } from "@/lib/fechas";
import { medirCliente } from "@/lib/medir";
import { abrirInicio, bannerALaVista, cambiarGuardado, cerrarBanner, guardar, leerGuardado, marcarCompartido, mostrarBanner, ocultarBanner, suscribirseBanner } from "@/lib/visitasInicio";
import { useCanalDePantalla } from "../useCanalDeListas";
import { IconoCerrar, IconoCompartir } from "../ui/Iconos";
import SimboloBlanco from "./SimboloBlanco";
import styles from "./BannerCompartir.module.css";

/** El enlace que se comparte: el dominio principal (el founder, 2026-10-10: somosnosotrxs.org solo va en el cartel). */
export const ENLACE_APP = "https://somosnosotros.org";
const DATOS_COMPARTIR = { title: "Somos Nosotrxs", text: "¿Te gusta Somos Nosotrxs? Compártela con tus amigxs.", url: ENLACE_APP };
const DE = "compartir-app";

/**
 * El banner para compartir la app (OL-387; prototipo firmado `inicio-propuestas.html`, «Firmada»: B1 tras Destacados, B2 con el símbolo SN,
 * bitácora 417). El founder (2026-10-12): «un banner de ancho completo para que los usuarios compartan la app … para usuarios logueados que hayan
 * entrado más de 2 veces». Inicio lo pone solo con sesión; cuándo sale lo decide el teléfono (`lib/visitasInicio`: tres días distintos o más, la ×
 * descansa 30 días, tras compartir no vuelve). El servidor no sabe nada: se decide tras el primer pintado (como «lo nuevo» de Nuevos eventos), así
 * que mientras no sale no ocupa nada.
 *
 * «Compartir»: la hoja del teléfono (`navigator.share`) con somosnosotros.org; sin ella (escritorio), copia el enlace y avisa «Enlace copiado». Si
 * la persona cancela la hoja, no cuenta como compartido. Los avisos van por el canal único de Inicio (`PantallaConAviso`, OL-284).
 *
 * Se mide (OL-388, lista cerrada de `lib/medir`): `compartir` con `que: "app"` y el medio, «hoja» si la hoja se abrió y no se canceló, «copiado» si
 * se copió el enlace («copiar sí cuenta como compartir», founder, 2026-10-12). Cancelar la hoja no se mide.
 */
export default function BannerCompartir({ zona }: { zona: string }) {
  const visible = useSyncExternalStore(suscribirseBanner, bannerALaVista, () => false);
  const canal = useCanalDePantalla();

  // Anota la visita de hoy (una por día) y decide; en el servidor y al hidratar, nada.
  useEffect(() => abrirInicio(diaLocal(new Date(), zona)), [zona]);

  if (!visible) return null;

  function cerrar() {
    const antes = leerGuardado();
    cambiarGuardado((e) => cerrarBanner(e, diaLocal(new Date(), zona)));
    ocultarBanner();
    canal?.avisar({
      de: DE,
      texto: "Cerrado: no vuelve a salir en 30 días",
      boton: () => {
        if (antes) guardar(antes);
        mostrarBanner();
      },
    });
  }

  function compartido(texto: string) {
    cambiarGuardado(marcarCompartido);
    ocultarBanner();
    canal?.avisar({ de: DE, texto });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(ENLACE_APP);
      medirCliente("compartir", { que: "app", medio: "copiado" });
      compartido("Enlace copiado");
    } catch {
      canal?.avisar({ de: DE, texto: "No se pudo copiar el enlace", fallo: true });
    }
  }

  async function compartir() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(DATOS_COMPARTIR);
        medirCliente("compartir", { que: "app", medio: "hoja" });
        compartido("Gracias por compartir");
      } catch (e) {
        // Cerró la hoja sin compartir: el banner se queda. Cualquier otro fallo de la hoja: se copia el enlace.
        if (!(e instanceof DOMException && e.name === "AbortError")) await copiar();
      }
      return;
    }
    await copiar();
  }

  return (
    <section className={styles.banner} aria-label="Comparte la app">
      <span className={styles.icono}>
        <SimboloBlanco className={styles.simbolo} />
      </span>
      <p className={styles.titulo}>¿Te gusta Somos Nosotrxs?</p>
      <p className={styles.texto}>Compártela con tus amigxs.</p>
      <button type="button" className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">
        <IconoCerrar width={20} height={20} />
      </button>
      <button type="button" className={styles.compartir} onClick={compartir}>
        <IconoCompartir width={20} height={20} />
        Compartir
      </button>
    </section>
  );
}
