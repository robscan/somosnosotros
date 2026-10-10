"use client";

import type { ComponentProps } from "react";
import CarrilEventosCliente from "./CarrilEventosCliente";
import { useCarrilResuelto, useEstadoCarriles } from "./EstadoCarriles";

type Props = Pick<ComponentProps<typeof CarrilEventosCliente>, "tarjetas" | "asistencias" | "avisos"> & { verTodosHref: string };
export default function CarrilMasAdelanteCliente({ tarjetas, verTodosHref, ...resto }: Props) {
  const { eventosResueltos, hayEventos } = useEstadoCarriles();
  const cantidad = eventosResueltos ? (hayEventos ? 0 : tarjetas.length) : null;
  useCarrilResuelto("inicio-mas-adelante", cantidad);
  return cantidad ? <CarrilEventosCliente {...resto} tarjetas={tarjetas} titulo="Más adelante" tamano="mediana" memoria="inicio-mas-adelante" verTodos={{ href: verTodosHref, etiqueta: "Ver la agenda" }} /> : null;
}
