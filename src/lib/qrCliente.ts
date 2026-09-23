"use client";

/**
 * Rasteriza a PNG cuadrado (con fondo blanco de margen) el QR que ya dibujó el servidor como SVG (`lib/qr.ts`),
 * para poder descargarlo (OL-159, doc 40e). Se hace en el navegador porque solo ahí hay `<canvas>`; el dibujo del
 * código en sí sigue siendo del servidor, esto solo lo convierte de formato.
 */
export function svgAPng(svg: string, tamano: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => {
      const lienzo = document.createElement("canvas");
      lienzo.width = tamano;
      lienzo.height = tamano;
      const ctx = lienzo.getContext("2d");
      if (!ctx) {
        reject(new Error("Sin contexto de dibujo"));
        return;
      }
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, tamano, tamano);
      ctx.drawImage(imagen, 0, 0, tamano, tamano);
      resolve(lienzo.toDataURL("image/png"));
    };
    imagen.onerror = () => reject(new Error("No se pudo dibujar el código QR."));
    imagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Dispara la descarga de un data URL con el nombre dado, sin abrir pestaña ni depender de un enlace ya en el DOM. */
export function descargarDataUrl(dataUrl: string, nombreArchivo: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
