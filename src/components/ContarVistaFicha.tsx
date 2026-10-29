"use client";

import { useEffect } from "react";
import { origenDeConsulta } from "@/lib/vistas";

/**
 * Cuenta una vista a la ficha de un artista o de un lugar que llegó por un enlace de la marca (OL-479, la semana de Instagram: la página de la
 * bio, la historia, Facebook): solo si la dirección trae la marca de origen (`?utm_source=instagram|facebook&utm_medium=…`); sin ella no manda
 * nada. Como `ContarVista` de los eventos: después de pintar, sin esperar nada, nunca en un navegador manejado por un programa; la base decide
 * si cuenta (una por visitante y día, nunca a la administración ni a quien gestiona la ficha). No pinta nada.
 */
export default function ContarVistaFicha({ tipo, id }: { tipo: "artista" | "lugar"; id: string }) {
  useEffect(() => {
    if (navigator.webdriver) return;
    const { origen } = origenDeConsulta(window.location.search);
    if (!origen) return;
    const medio = new URLSearchParams(window.location.search).get("utm_medium");
    const cuerpo = { [tipo]: id, origen, ...(medio && ["post", "story", "bio"].includes(medio) ? { medio } : {}) };
    fetch("/api/vista", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo), keepalive: true }).catch(() => {});
  }, [tipo, id]);
  return null;
}
