"use client";

import { useEffect, useState } from "react";
import type { ArtistaResumen } from "@/lib/artistas";
import { clienteNavegador } from "@/lib/supabase/navegador";

/** Un artista del directorio cuyo nombre contiene lo escrito, con su ciudad (el mismo nombre en otra ciudad es otro artista). */
export type Candidato = ArtistaResumen & { ciudad: string };

/**
 * Los artistas del directorio cuyo nombre contiene lo escrito (`artistas_con_nombre`: visibles, sin acentos ni mayúsculas, seis como mucho),
 * 300 ms después de dejar de escribir, como el formulario de siempre: sirven para decir «Ya tiene ficha» mientras se escribe y, en «Revisa»,
 * para no publicar uno repetido en la misma ciudad. Lo que llegó para otro texto se descarta: la lista siempre es la del nombre de ahora.
 */
export default function useArtistasConNombre(nombre: string): Candidato[] {
  const q = nombre.trim();
  const [llegado, setLlegado] = useState<{ q: string; artistas: Candidato[] }>({ q: "", artistas: [] });
  useEffect(() => {
    if (q.length < 2) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const supabase = clienteNavegador();
      if (!supabase) return;
      const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: q });
      if (vigente) setLlegado({ q, artistas: (data ?? []) as Candidato[] });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q]);
  return llegado.q === q ? llegado.artistas : [];
}
