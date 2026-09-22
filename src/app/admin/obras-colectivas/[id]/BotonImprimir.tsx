"use client";

import Boton from "@/components/ui/Boton";

/** Imprimir el QR de la obra (OL-118): abre el diálogo del navegador; la hoja de impresión de `obras.module.css`
 * deja solo el nombre, el código y el enlace. */
export default function BotonImprimir({ className }: { className?: string }) {
  return (
    <Boton type="button" variante="secundario" className={className} onClick={() => window.print()}>
      Imprimir
    </Boton>
  );
}
