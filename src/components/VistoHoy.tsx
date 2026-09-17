"use client";

import { useEffect } from "react";
import { marcarVisto } from "@/app/visto";
import { diaLocal } from "@/lib/fechas";

const CLAVE = "somosnosotros:visto";

/**
 * Deja constancia de que la persona abrió la app hoy (D3): un aviso al servidor por día y por teléfono, recordado en el
 * propio teléfono (no es una cookie: el aviso de privacidad solo usa la de sesión). No pinta nada.
 */
export default function VistoHoy() {
  useEffect(() => {
    const hoy = diaLocal(new Date());
    try {
      if (localStorage.getItem(CLAVE) === hoy) return;
    } catch {}
    marcarVisto()
      .then((ok) => {
        if (!ok) return;
        try {
          localStorage.setItem(CLAVE, hoy);
        } catch {}
      })
      .catch(() => {});
  }, []);
  return null;
}
