"use client";

import { useRef, useState } from "react";
import { CIRCULO } from "@/components/ui/Ficha";
import ficha from "@/components/ui/Ficha.module.css";
import { IconoEnlace } from "@/components/ui/Iconos";
import { useCanalDePantalla } from "@/components/useCanalDeListas";
import { textoLigados } from "@/lib/sitios";
import type { ResultadoLigar } from "../acciones";

const DE = "ligar";

/**
 * «Ligar sus eventos» (OL-366), solo para la administración y solo cuando el sitio ya tiene su lugar en el directorio: pasa a ese lugar todos
 * los eventos del sitio que cumplen la regla de la base (`religar_sitio_a_lugar`) y lo dice en el aviso de abajo de la ficha, el de siempre:
 * cuántos ligó o, si no se pudo, «No se pudo guardar» con Reintentar. La ficha no se vuelve a pintar (sin sus eventos sería «Esto ya no está»):
 * el lugar los enseña en «Ver en el directorio». `ligar` llega con el sitio y el lugar atados en el servidor.
 */
export default function LigarEventos({ ligar }: { ligar: () => Promise<ResultadoLigar> }) {
  const canal = useCanalDePantalla();
  const [ligando, setLigando] = useState(false);
  const enCurso = useRef(false);

  async function alTocar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setLigando(true);
    canal?.limpiar(DE);
    const r = await ligar().catch((): ResultadoLigar => ({ ok: false }));
    enCurso.current = false;
    setLigando(false);
    if (r.ok) canal?.avisar({ texto: textoLigados(r.ligados), de: DE });
    else canal?.avisar({ texto: "No se pudo guardar", etiqueta: "Reintentar", fallo: true, de: DE, boton: () => void alTocar() });
  }

  return (
    <button type="button" className={ficha.accion} aria-busy={ligando || undefined} onClick={() => void alTocar()}>
      <span className={CIRCULO}>
        <IconoEnlace />
      </span>
      <span className={ficha.accionEtiqueta}>Ligar sus eventos</span>
    </button>
  );
}
