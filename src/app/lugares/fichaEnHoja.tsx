"use server";

import type { ReactNode } from "react";
import CuerpoLugar, { cargarFicha, OpcionesLugar, SeguirLugar } from "./[id]/CuerpoLugar";

/**
 * La ficha de un lugar que se abre dentro de la hoja de Lugares (docs/rediseno/50, P5b): las mismas piezas de la ficha a
 * pantalla completa (su cuerpo, su menú «···» y su barra de Seguir), armadas en el servidor con la sesión de quien mira y
 * enviadas ya listas, para que la hoja las ponga en su sitio sin volver a pedir la página entera. null si el lugar ya no
 * existe o quien mira no puede verlo: la hoja lo dice y ofrece abrir la ficha completa.
 */
export async function abrirFichaEnHoja(idOSlug: string): Promise<{ cuerpo: ReactNode; opciones: ReactNode; seguir: ReactNode } | null> {
  const f = await cargarFicha(idOSlug);
  return f ? { cuerpo: <CuerpoLugar f={f} />, opciones: <OpcionesLugar f={f} />, seguir: <SeguirLugar f={f} /> } : null;
}
