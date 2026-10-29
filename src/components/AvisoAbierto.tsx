"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { leerAvisoAbierto, type TipoAvisoAbierto } from "@/lib/avisoAbierto";
import { medirCliente, rolEnPantalla } from "@/lib/medir";

/** Cuánto se espera a saber quién mira (la marca del layout llega en streaming) antes de contar igual. */
const ESPERA_ROL_MS = 5000;
const PASO_MS = 250;

/** Cuenta una apertura cuando se sabe que no es la administración (como el resto de «Últimos 7 días»); sin marca a tiempo, cuenta. */
function contar(tipo: TipoAvisoAbierto, esperado = 0) {
  const rol = rolEnPantalla();
  if (rol === null && esperado < ESPERA_ROL_MS) {
    window.setTimeout(() => contar(tipo, esperado + PASO_MS), PASO_MS);
    return;
  }
  if (rol === "admin") return;
  medirCliente("aviso_abierto", { tipo });
  try {
    void fetch("/api/avisos/abierto", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ tipo }) }).catch(() => {});
  } catch {
    // sin red: no se cuenta
  }
}

/**
 * OL-480 (bitácora 512): al abrir la app desde un aviso al teléfono (`?desde=aviso&tipo=…`), cuenta la apertura una vez, sin saber quién
 * (`lib/avisoAbierto`), y quita esos dos datos de la dirección con `replaceState` (la pantalla no cambia ni se apila nada): recargar no cuenta
 * otra vez y compartir la ficha no los lleva. Lee la dirección de la barra, no la del render: así la segunda pasada del efecto (o la vuelta del
 * router tras limpiar) ya no encuentra nada. No pinta nada.
 */
export default function AvisoAbierto() {
  const ruta = usePathname();
  const consulta = useSearchParams().toString();
  useEffect(() => {
    const { tipo, limpia } = leerAvisoAbierto(window.location.href);
    if (limpia === null) return;
    try {
      window.history.replaceState(window.history.state, "", limpia);
    } catch {
      // sin historial: se queda la dirección
    }
    if (tipo) contar(tipo);
  }, [ruta, consulta]);
  return null;
}
