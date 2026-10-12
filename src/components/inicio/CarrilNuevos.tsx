"use client";

import type { ComponentProps } from "react";
import { corteNuevos, eventosNuevos, LIMITE_NUEVOS } from "@/lib/agenda";
import type { TarjetaConFecha } from "@/lib/destacados";
import { MINIMO_NUEVOS } from "@/lib/inicio";
import { juntarPiezas } from "@/lib/series";
import { tarjetaDePieza } from "@/lib/tarjetaInicio";
import { useMarcaNuevos } from "../useMarcaNuevos";
import CarrilEventosCliente from "./CarrilEventosCliente";

/** Una tarjeta de evento con cuándo se publicó (lo que hace falta para saber si sigue siendo nuevo para esta persona) y con quién va (`grupoDe`,
 *  `lib/series`: su festival o su serie; null, suelta). */
export type TarjetaNueva = TarjetaConFecha & { creado_en: string; grupo?: string | null };

/**
 * «Nuevos eventos» de Inicio, ya en el teléfono. El servidor trae lo publicado en los últimos 7 días (`carrilNuevos`) sin saber cuándo miró
 * la persona por última vez: esa marca vive en su teléfono (`lib/nuevosVisto`). Aquí se deja lo que sigue siendo nuevo para ella
 * (`eventosNuevos`, la misma definición de la pestaña Nuevos de Agenda, a donde lleva su «Ver la agenda»), así el carril y la pestaña nunca
 * se contradicen: tras mirar la pestaña, el carril se va. Lo que queda se junta en piezas (OL-385, `juntarPiezas`: los actos de un festival en la
 * tarjeta de su festival, que llega aparte en `festivales`; las funciones de lo mismo en una tarjeta), y el mínimo y el tope cuentan piezas. Con
 * menos de `MINIMO_NUEVOS` no se pinta, igual que en el servidor.
 */
export default function CarrilNuevos({ ciudad, tarjetas, festivales = {}, ...resto }: Omit<ComponentProps<typeof CarrilEventosCliente>, "tarjetas"> & { ciudad: string; tarjetas: TarjetaNueva[]; festivales?: Record<string, TarjetaNueva> }) {
  const marca = useMarcaNuevos(ciudad);
  const piezas = juntarPiezas(eventosNuevos(tarjetas, corteNuevos(marca)), (t) => t.grupo, (id) => festivales[id]);
  const nuevas = piezas.length < MINIMO_NUEVOS ? [] : piezas.slice(0, LIMITE_NUEVOS).map((p) => tarjetaDePieza(p));
  return <CarrilEventosCliente {...resto} tarjetas={nuevas} resuelto={marca !== undefined} />;
}
