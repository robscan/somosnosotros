"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { descartarSugerencia, ligarExposicionSugerida, publicarExposicionSugerida, relacionarFestivalSugerido, unirParecidoSugerido, Aceptada } from "@/app/eventos/sugerencias";
import { medirCliente } from "@/lib/medir";
import type { Pistas, Sugerencia } from "@/lib/sugerencias";

/** Las acciones del servidor de las sugerencias (`app/eventos/sugerencias.ts`): la página las pasa al alta, como `accion`. */
export type AccionesSugerencia = {
  buscar: (id: string, pistas: Pistas) => Promise<Sugerencia | null>;
  publicarExposicion: typeof publicarExposicionSugerida;
  ligarExposicion: typeof ligarExposicionSugerida;
  relacionarFestival: typeof relacionarFestivalSugerido;
  /** OL-341: el evento igual que ya estaba publicado («Sí, publicar como parte de él» / «Sí, es mi participación en él»). */
  unirParecido: typeof unirParecidoSugerido;
  descartar: typeof descartarSugerencia;
};

/** Los días de visita que se contestan en «¿Cuándo se puede visitar?» (H2) y, si se puso, el horario propio (franjas en JSON). */
export type PeriodoContestado = { desde: string; hasta: string; horario: string | null };

export type EstadoSugerencia =
  /** Buscando, o no hay nada que sugerir. */
  | { fase: "nada" }
  /** La ficha en punteado, con el error de su acción si lo hubo. */
  | { fase: "abierta"; s: Sugerencia; enviando: boolean; error: string | null }
  /** Aceptada: la tarjeta de lo creado o ligado. `visita`: los días de la exposición; `actos`: el programa registrado del festival; `titulo`: el
   *  nombre con que el evento entró al festival (OL-341), que la tarjeta del evento también enseña. */
  | { fase: "hecha"; s: Sugerencia; creado: Aceptada; visita: { desde: string; hasta: string } | null; actos: number | null; titulo?: string }
  /** «Ahora no»: ya no se ve. */
  | { fase: "descartada" };

/** La clave con que se anota un descarte: la del festival (para no ofrecer otra vez la misma agrupación por un tercer acto). */
const claveDe = (s: Sugerencia): string | null => (s.tipo === "festival" ? s.clave : null);
/** El caso del evento igual (OL-341) como se mide: lo que ya estaba es un festival o un evento suelto. */
const casoDe = (s: Extract<Sugerencia, { tipo: "parecido" }>) => ({ caso: s.modo });

/**
 * La sugerencia de «Publicado» (OL-323): se pide una vez, cuando el servidor ya publicó (la publicación no espera nada), y llega sin robar el
 * foco. Aceptar es una sola acción del servidor con su clave de operación (un reintento no crea dos); el error se dice solo en la sugerencia.
 * Ignorar no es confirmar: si la pantalla se va con la sugerencia sin tocar («Publicar otro», la ✕, la tarjeta del evento, Atrás) o con
 * «Ahora no», se anota como descartada y no vuelve a salir. El descarte al desmontar espera un turno para no contar el desmontaje de prueba
 * del modo estricto de React (que vuelve a montar enseguida).
 */
export function useSugerencia(acciones: AccionesSugerencia | undefined, evento: string | null, pistas: Pistas) {
  const [estado, setEstado] = useState<EstadoSugerencia>({ fase: "nada" });
  const pedida = useRef<string | null>(null);
  const operacion = useRef<string | null>(null);
  const pistasActuales = useRef(pistas);
  const actual = useRef(estado);
  useEffect(() => {
    pistasActuales.current = pistas;
    actual.current = estado;
  });

  useEffect(() => {
    if (!acciones || !evento || pedida.current === evento) return;
    pedida.current = evento;
    acciones
      .buscar(evento, pistasActuales.current)
      .then((s) => {
        if (!s) return;
        setEstado({ fase: "abierta", s, enviando: false, error: null });
        if (s.tipo === "parecido") medirCliente("festival_parecido_visto", casoDe(s));
      })
      .catch(() => {
        // Sin sugerencia: el final se ve igual.
      });
  }, [acciones, evento]);

  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      setTimeout(() => {
        const e = actual.current;
        if (montado.current || !acciones || !evento || e.fase !== "abierta") return;
        acciones.descartar(evento, e.s.tipo, claveDe(e.s)).catch(() => {});
      }, 0);
    };
  }, [acciones, evento]);

  const aceptar = useCallback(
    /** `periodo`: los días de H2; `titulo`: el nombre de la participación (OL-341), si la sugerencia lo deja cambiar. */
    async (periodo?: PeriodoContestado, titulo?: string) => {
      const e = actual.current;
      if (e.fase !== "abierta" || e.enviando || !acciones || !evento) return;
      const s = e.s;
      operacion.current ??= crypto.randomUUID();
      const enviando: EstadoSugerencia = { fase: "abierta", s, enviando: true, error: null };
      actual.current = enviando;
      setEstado(enviando);
      try {
        let visita: { desde: string; hasta: string } | null = null;
        let actos: number | null = null;
        let r;
        let final: string | undefined;
        if (s.tipo === "parecido") {
          final = (s.editable ? (titulo ?? s.titulo) : s.titulo).trim();
          const con = s.modo === "festival" ? s.marco.id : s.existente.id;
          const hecho = await acciones.unirParecido(evento, { modo: s.modo, con, titulo: final }, operacion.current);
          actos = hecho.ok ? (hecho.actos ?? null) : null;
          if (hecho.ok) medirCliente("festival_parecido_si", casoDe(s));
          r = hecho;
        } else if (s.tipo === "exposicion" && s.modo === "ligar") {
          r = await acciones.ligarExposicion(evento, s.exposicion.id);
          visita = { desde: s.exposicion.desde, hasta: s.exposicion.hasta };
        } else if (s.tipo === "exposicion") {
          visita = s.modo === "crear" ? s.visita : periodo ? { desde: periodo.desde, hasta: periodo.hasta } : null;
          if (!visita) return setEstado({ ...enviando, enviando: false });
          r = await acciones.publicarExposicion(evento, { titulo: s.titulo, ...visita, horario: periodo?.horario ?? null }, operacion.current);
        } else {
          const hecho = await acciones.relacionarFestival(evento, { otro: s.otro?.id ?? null, marco: s.modo === "marco" ? s.marco.id : null, titulo: s.mencion }, operacion.current);
          actos = hecho.ok ? (hecho.actos ?? null) : null;
          r = hecho;
        }
        setEstado(r.ok ? { fase: "hecha", s, creado: r.creado, visita, actos, titulo: final } : { fase: "abierta", s, enviando: false, error: r.error });
      } catch {
        setEstado({ fase: "abierta", s, enviando: false, error: "Sin conexión. Intenta de nuevo." });
      }
    },
    [acciones, evento],
  );

  /** «Ahora no» (o «No, es otro evento», OL-341): se anota ya y la ficha se va. */
  const ahoraNo = useCallback(() => {
    const e = actual.current;
    if (e.fase !== "abierta" || !acciones || !evento) return;
    setEstado({ fase: "descartada" });
    if (e.s.tipo === "parecido") medirCliente("festival_parecido_no", casoDe(e.s));
    acciones.descartar(evento, e.s.tipo, claveDe(e.s)).catch(() => {});
  }, [acciones, evento]);

  return { estado, aceptar, ahoraNo };
}
