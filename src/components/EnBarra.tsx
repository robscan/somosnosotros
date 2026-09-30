"use client";

import { useEffect, type ReactNode } from "react";
import { prestarALaBarra } from "./prestamoBarra";

/**
 * La cabecera interior de una ficha le presta a la barra de la app su Atrás y su menú «···» (`prestamoBarra.ts`):
 * desde 792 la ficha no lleva barra propia y esos dos botones viven en la de la app. No pinta nada.
 */
export default function EnBarra({ volver, menu }: { volver: { href: string; texto: string }; menu?: ReactNode }) {
  useEffect(() => prestarALaBarra({ volver, menu }), [volver, menu]);
  return null;
}
