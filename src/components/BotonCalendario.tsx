"use client";

import type { MouseEvent, ReactNode } from "react";
import type { EventoCalendarioNativo } from "@/lib/calendario";
import { calendarioDelSistema, type VentanaConCalendario } from "@/lib/calendarioNativo";

/**
 * «A mi calendario» (OL-214, bitácora 243): fuera de la app, el `<a>` de siempre descarga el .ics (`href`, sin
 * JavaScript de por medio — mejora progresiva, mismo patrón que `BotonCompartir`). Dentro de la app de iPhone, en
 * cuanto `window.Capacitor` trae el plugin `Calendario`, se cancela esa descarga y se abre la hoja nativa del
 * sistema con los mismos datos (`CalendarioPlugin.swift`, `EKEventEditViewController`).
 */
export default function BotonCalendario({ datos, href, className, children }: { datos: EventoCalendarioNativo; href: string; className: string; children: ReactNode }) {
  async function alTocar(ev: MouseEvent<HTMLAnchorElement>) {
    const calendario = calendarioDelSistema(window as unknown as VentanaConCalendario);
    if (!calendario) return; // fuera de la app: sigue como <a> normal
    ev.preventDefault();
    try {
      await calendario.agregarEvento(datos);
    } catch {
      // cancelado, o sin pantalla donde mostrar la hoja: no hay nada más que hacer aquí
    }
  }
  return (
    <a href={href} className={className} onClick={alTocar}>
      {children}
    </a>
  );
}
