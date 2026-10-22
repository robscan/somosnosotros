"use client";

import { useState, useTransition, type JSX, type SVGProps } from "react";
import { IconoEnlace, IconoEtiqueta, IconoLapiz, IconoOk, IconoTexto } from "@/components/ui/Iconos";
import { ETIQUETA_CAMPO, type CampoCompletar, type Sugerencia } from "@/lib/completarFicha";
import { completarFicha, descartarSugerencia } from "../acciones";
import admin from "../../admin.module.css";

type P = SVGProps<SVGSVGElement>;
const ICONO: Record<CampoCompletar, (p: P) => JSX.Element> = { disciplina: IconoEtiqueta, detalle: IconoLapiz, descripcion: IconoTexto, enlace: IconoEnlace };
type Hecha = { como: "completada" | "descartada"; sugerencia: Sugerencia };

/**
 * «Completar ficha» (OL-445): lo que las rutinas trajeron y su ficha pública no tiene (disciplina «por completar», qué hace, el texto de
 * «Sobre», un enlace a su página en una plataforma), en las tarjetas de «Por revisar»: qué falta y de dónde sale (con su enlace), el valor y
 * Descartar a la izquierda · Completar a la derecha. Completar escribe solo eso y nunca encima de lo que hay (la acción lo vuelve a mirar). Con la
 * ficha reclamada no se cambia nada: la tarjeta lo dice y solo queda Descartar. Al decidir queda la línea de lo hecho; descartar se deshace. Sin
 * sugerencias, no se pinta.
 */
export default function CompletarFicha({ artistaId, slug, sugerencias, reclamada }: { artistaId: string; slug: string; sugerencias: Sugerencia[]; reclamada: boolean }) {
  const [hechas, setHechas] = useState<Record<string, Hecha>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enCamino, iniciar] = useTransition();
  const lista = [...sugerencias, ...Object.values(hechas).map((h) => h.sugerencia).filter((s) => !sugerencias.some((x) => x.clave === s.clave))];
  const quedan = sugerencias.filter((s) => !hechas[s.clave]).length;
  if (!lista.length) return null;

  function decidir(s: Sugerencia, como: Hecha["como"]) {
    setErrores((e) => ({ ...e, [s.clave]: "" }));
    iniciar(async () => {
      const r = como === "completada" ? await completarFicha(artistaId, s.clave, slug) : await descartarSugerencia(artistaId, s.clave, slug);
      if (!r.ok) return setErrores((e) => ({ ...e, [s.clave]: r.error }));
      setHechas((h) => ({ ...h, [s.clave]: { como, sugerencia: s } }));
    });
  }
  function deshacer(s: Sugerencia) {
    iniciar(async () => {
      const r = await descartarSugerencia(artistaId, s.clave, slug, true);
      if (!r.ok) return setErrores((e) => ({ ...e, [s.clave]: r.error }));
      setHechas((h) => Object.fromEntries(Object.entries(h).filter(([clave]) => clave !== s.clave)));
    });
  }
  return (
    <>
      <h2 className={`${admin.grupo} ${admin.conNota}`}>
        Completar ficha {quedan > 0 && <b>{quedan}</b>}
      </h2>
      <p className={admin.nota}>{reclamada ? "Su ficha está reclamada: desde aquí no se cambia nada. Sugiéreselo a quien la lleva." : "Lo que trajeron las rutinas y su ficha no tiene. Completar no cambia lo que ya puso nadie."}</p>
      <ul className={admin.pendientes}>
        {lista.map((s) => {
          const hecha = hechas[s.clave];
          if (hecha)
            return (
              <li key={s.clave}>
                <p className={admin.hecho} role="status">
                  <IconoOk width={20} height={20} />
                  <span>
                    {hecha.como === "completada" ? "Completaste" : "Descartaste"} <b>{s.enlace ? s.texto : ETIQUETA_CAMPO[s.campo].toLowerCase()}</b>
                    {hecha.como === "completada" && " · ya está en su perfil"}
                  </span>
                  {hecha.como === "descartada" && (
                    <button type="button" className={admin.enlace} disabled={enCamino} onClick={() => deshacer(s)}>
                      Deshacer
                    </button>
                  )}
                </p>
              </li>
            );
          const Icono = ICONO[s.campo];
          return (
            <li key={s.clave} className={admin.pendiente}>
              <Icono width={20} height={20} />
              <b>{ETIQUETA_CAMPO[s.campo]} · falta en su ficha</b>
              {s.campo === "descripcion" ? (
                <q>{s.texto}</q>
              ) : s.enlace ? (
                <a className={admin.ficha} href={s.enlace.url} target="_blank" rel="noopener noreferrer">
                  {s.texto}
                </a>
              ) : (
                <span className={admin.ficha}>{s.texto}</span>
              )}
              <small>
                {s.direccion && `${s.direccion} · `}De:{" "}
                {s.origen.url ? (
                  <a href={s.origen.url} target="_blank" rel="noopener noreferrer">
                    {s.origen.texto}
                  </a>
                ) : (
                  s.origen.texto
                )}
              </small>
              {errores[s.clave] && <p role="alert">{errores[s.clave]}</p>}
              <button type="button" className={admin.dejar} disabled={enCamino} onClick={() => decidir(s, "descartada")}>
                Descartar
              </button>
              {reclamada ? (
                <span className={admin.apagada}>No se cambia: ficha reclamada</span>
              ) : (
                <button type="button" className={`${admin.actuar} ${admin.principal}`} disabled={enCamino} onClick={() => decidir(s, "completada")}>
                  Completar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
