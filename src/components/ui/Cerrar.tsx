"use client";

import BotonIcono from "./BotonIcono";
import { useVolver } from "./Atras";
import { IconoCerrar } from "./Iconos";

/**
 * Cerrar (pedido del founder, 2026-09-16): en los formularios de alta no hay Atrás sino una ✕ en el extremo derecho
 * de la barra, como se cierra una tarea que empezó y no se terminó. Vuelve igual que Atrás (pantalla anterior o
 * `href`) y respeta la guardia de salida ("¿Salir sin publicar?"). Botón redondo, solo icono; el texto va para quien lo lea. Contorno
 * en las altas; plano junto al campo de Buscar. Con `alCerrar`, sale por ahí en vez de volver (el creador de cartel, OL-336).
 */
export default function Cerrar({ href, texto, relieve = "contorno", alCerrar }: { href: string; texto: string; relieve?: "plano" | "contorno"; alCerrar?: () => void }) {
  const volver = useVolver(href, alCerrar);
  return (
    <BotonIcono href={href} prefetch={false} relieve={relieve} onClick={volver} aria-label={`Cerrar (${texto})`}>
      <IconoCerrar width={20} height={20} />
    </BotonIcono>
  );
}
