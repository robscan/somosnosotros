"use client";

import Image from "next/image";
import { useState } from "react";
import { optimizable } from "@/lib/imagenOptima";

type Props = {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  sizes: string;
  loading?: "eager" | "lazy";
};

/** Una sola imagen, sin envoltorio. Vercel entrega una variante del Storage
 * propio. Ante un fallo/cuota del optimizador, un único intento del original
 * mantiene visible el contenido; nunca reintenta en bucle ni conserva srcset.
 */
export default function Imagen({ src, alt, loading = "lazy", ...props }: Props) {
  const [fallida, setFallida] = useState<string | null>(null);
  if (!optimizable(src) || fallida === src) {
    // eslint-disable-next-line @next/next/no-img-element -- original/externa o recuperación sin optimizador
    return <img {...props} src={src} alt={alt} loading={loading} decoding="async" />;
  }
  return <Image {...props} src={src} alt={alt} loading={loading} quality={75} onError={() => setFallida(src)} />;
}
