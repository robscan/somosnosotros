"use client";

import { useEffect, type ReactNode } from "react";
import { prestarALaBarra } from "./prestamoBarra";

/**
 * La cabecera interior de una ficha le presta a la barra de la app su menú «···» (`prestamoBarra.ts`): desde 792 la ficha
 * no lleva barra propia (solo su Atrás, sobre la portada) y el menú vive en la de la app. No pinta nada.
 */
export default function EnBarra({ menu }: { menu?: ReactNode }) {
  useEffect(() => prestarALaBarra({ menu }), [menu]);
  return null;
}
