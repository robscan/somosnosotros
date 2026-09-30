"use client";

import { useLinkStatus } from "next/link";

/**
 * Va dentro de un `<Link>`: mientras el servidor responde a su toque aparece este marcador y el CSS del enlace (que lo
 * ve con `:has(> .enCamino)`) lo pone en camino. Sin marcador el toque no dice nada hasta que llega la pantalla
 * (founder, 2026-09-16: «a veces no pasa nada»).
 */
export default function EnCamino({ className }: { className: string }) {
  const { pending } = useLinkStatus();
  return pending ? <span className={className} aria-hidden="true" /> : null;
}
