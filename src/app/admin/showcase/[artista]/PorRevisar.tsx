"use client";

import { useState, useTransition } from "react";
import { IconoOk } from "@/components/ui/Iconos";
import { etiquetaTipo, type Evidencia } from "@/lib/showcase";
import { decidirEvidencia } from "../acciones";
import { IconoTipo } from "../Piezas";
import admin from "../../admin.module.css";

type Propuesta = Evidencia & { detalle: string; dominio: string };
type Hecha = { como: "aceptada" | "rechazada"; propuesta: Propuesta };

/**
 * «Por revisar» (lo firmado en OL-425): lo que propuso la rutina (OL-428) con su enlace, en la tarjeta de «Pendiente» del panel: qué es, el título
 * que abre el enlace (el único enlace de la tarjeta: dos seguidos se pisaban el toque), la fuente y cuándo se leyó; Rechazar a la izquierda y Aceptar a la derecha. Al decidir queda la línea de lo hecho con
 * «Deshacer» (vuelve a propuesta). Solo lo aceptado cuenta para la rúbrica y, desde OL-445, se publica en su perfil («Reconocimientos y obra»,
 * salvo redes); deshacer o rechazar lo retira. Sin propuestas ni nada recién decidido, no se pinta.
 */
export default function PorRevisar({ propuestas, slug }: { propuestas: Propuesta[]; slug: string }) {
  const [hechas, setHechas] = useState<Record<string, Hecha>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enCamino, iniciar] = useTransition();
  // Las que vuelven del servidor y las recién decididas (que el servidor ya no manda como propuestas), en su sitio.
  const lista = [...propuestas, ...Object.values(hechas).map((h) => h.propuesta).filter((p) => !propuestas.some((x) => x.id === p.id))];
  const quedan = propuestas.filter((p) => !hechas[p.id]).length;
  if (!lista.length) return null;

  function decidir(p: Propuesta, como: "aceptada" | "rechazada") {
    setErrores((e) => ({ ...e, [p.id]: "" }));
    iniciar(async () => {
      const r = await decidirEvidencia(p.id, como, slug);
      if (!r.ok) return setErrores((e) => ({ ...e, [p.id]: r.error }));
      setHechas((h) => ({ ...h, [p.id]: { como, propuesta: p } }));
    });
  }
  function deshacer(p: Propuesta) {
    iniciar(async () => {
      const r = await decidirEvidencia(p.id, "propuesta", slug);
      if (!r.ok) return setErrores((e) => ({ ...e, [p.id]: r.error }));
      setHechas((h) => Object.fromEntries(Object.entries(h).filter(([id]) => id !== p.id)));
    });
  }
  return (
    <>
      <h2 className={`${admin.grupo} ${admin.conNota}`}>
        Por revisar {quedan > 0 && <b>{quedan}</b>}
      </h2>
      <p className={admin.nota}>Lo que trajo la rutina. Lo que aceptas cuenta para la rúbrica y se publica en su perfil.</p>
      <ul className={admin.pendientes}>
        {lista.map((p) => {
          const hecha = hechas[p.id];
          if (hecha)
            return (
              <li key={p.id}>
                <p className={admin.hecho} role="status">
                  <IconoOk width={20} height={20} />
                  <span>
                    {hecha.como === "aceptada" ? "Aceptaste" : "Rechazaste"} <b>{p.titulo}</b>
                    {hecha.como === "aceptada" && p.tipo !== "redes" && " · ya está en su perfil"}
                  </span>
                  <button type="button" className={admin.enlace} disabled={enCamino} onClick={() => deshacer(p)}>
                    Deshacer
                  </button>
                </p>
              </li>
            );
          return (
            <li key={p.id} className={admin.pendiente} data-ayuda="evidencias">
              <IconoTipo tipo={p.tipo} width={20} height={20} />
              <b>
                {etiquetaTipo(p.tipo)} · propuesta por {p.leida_por === "rutina" ? "la rutina" : "una persona"}
              </b>
              <a className={admin.ficha} href={p.url} target="_blank" rel="noopener noreferrer">
                {p.titulo}
              </a>
              <small>
                Fuente: {p.fuente || p.dominio} · {p.detalle}
              </small>
              {errores[p.id] && <p role="alert">{errores[p.id]}</p>}
              <button type="button" className={admin.dejar} disabled={enCamino} onClick={() => decidir(p, "rechazada")}>
                Rechazar
              </button>
              <button type="button" className={`${admin.actuar} ${admin.principal}`} disabled={enCamino} onClick={() => decidir(p, "aceptada")}>
                Aceptar
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
