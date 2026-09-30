"use client";

import type { ComponentProps } from "react";
import { corteNuevos, eventosNuevos } from "@/lib/agenda";
import type { TarjetaConFecha } from "@/lib/destacados";
import { MINIMO_NUEVOS } from "@/lib/inicio";
import { useMarcaNuevos } from "../useMarcaNuevos";
import CarrilEventosCliente from "./CarrilEventosCliente";

/** Una tarjeta de evento con cuándo se publicó: lo que hace falta para saber si sigue siendo nuevo para esta persona. */
export type TarjetaNueva = TarjetaConFecha & { creado_en: string };

/**
 * «Nuevos eventos» de Inicio, ya en el teléfono. El servidor trae lo publicado en los últimos 7 días (`carrilNuevos`) sin saber cuándo miró
 * la persona por última vez: esa marca vive en su teléfono (`lib/nuevosVisto`). Aquí se deja lo que sigue siendo nuevo para ella
 * (`eventosNuevos`, la misma definición de la pestaña Nuevos de Agenda, a donde lleva su «Ver la agenda»), así el carril y la pestaña nunca
 * se contradicen: tras mirar la pestaña, el carril se va. Con menos de `MINIMO_NUEVOS` no se pinta, igual que en el servidor.
 */
export default function CarrilNuevos({ ciudad, tarjetas, ...resto }: Omit<ComponentProps<typeof CarrilEventosCliente>, "tarjetas"> & { ciudad: string; tarjetas: TarjetaNueva[] }) {
  const marca = useMarcaNuevos(ciudad);
  const nuevas = eventosNuevos(tarjetas, corteNuevos(marca));
  return <CarrilEventosCliente {...resto} tarjetas={nuevas.length < MINIMO_NUEVOS ? [] : nuevas} />;
}
