"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip, Chips } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import { IconoBoleto, IconoEnlace, IconoInstagram, IconoMas, IconoOk, IconoPincel } from "@/components/ui/Iconos";
import { faltaEvidencia, LIMITES_EVIDENCIA, TIPO_DE_SENAL, TIPOS_EVIDENCIA, validarEvidencia, type DatosEvidencia, type Evidencia, type Puntaje, type Senal } from "@/lib/showcase";
import { anadirEvidencia, cambiarPuntaje } from "../acciones";
import { IconoTipo } from "../Piezas";
import admin from "../../admin.module.css";
import hojaCss from "@/components/ui/Hoja.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import s from "../showcase.module.css";

export type SenalVista = {
  clave: Senal;
  titulo: string;
  resumen: string;
  puntaje: Puntaje;
  niveles: readonly string[];
  /** Las aceptadas y las rechazadas de esta señal (las propuestas van en «Por revisar»), con su línea ya escrita. */
  evidencias: (Evidencia & { detalle: string })[];
};

const ICONO_SENAL = { circulacion: IconoBoleto, obra: IconoPincel, actividad: IconoInstagram, vinculo: IconoEnlace } as const;
const VACIA = (senal: Senal): DatosEvidencia => ({ senal, tipo: TIPO_DE_SENAL[senal], titulo: "", url: "", fecha: "", fuente: "" });

/**
 * Una señal de la rúbrica en la ficha de showcase (lo firmado en OL-425): su resumen (lo que dice la base o lo aceptado), su puntaje a la derecha
 * (tocar la señal abre la hoja con 0, 1 y 2 y la línea de ayuda de cada uno), sus evidencias enlazadas y «Añadir evidencia» (hoja con tipo, qué
 * es, enlace obligatorio http(s), fecha y fuente; el botón dice qué falta).
 */
export default function SenalFicha({ artistaId, slug, senal }: { artistaId: string; slug: string; senal: SenalVista }) {
  const [hoja, setHoja] = useState<"puntaje" | "evidencia" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const Icono = ICONO_SENAL[senal.clave];

  function puntuar(p: Puntaje) {
    if (p === senal.puntaje) return setHoja(null);
    setError(null);
    iniciar(async () => {
      const r = await cambiarPuntaje(artistaId, senal.clave, p, slug);
      if (!r.ok) return setError(r.error);
      setHoja(null);
    });
  }
  const opciones: { valor: Puntaje; etiqueta: string; detalle: string }[] = [
    ...senal.niveles.map((n, i) => ({ valor: i as Puntaje, etiqueta: String(i), detalle: n })),
    { valor: null, etiqueta: "Sin puntuar", detalle: "No cuenta en la suma" },
  ];
  return (
    <>
      <ul className={`${renglon.tarjeta} ${s.seguida}`} aria-label={senal.titulo}>
        <li>
          <button type="button" className={`${admin.fila} ${s.boton}`} aria-haspopup="dialog" data-ayuda={senal.clave} onClick={() => (setError(null), setHoja("puntaje"))}>
            <Icono width={20} height={20} />
            <b>{senal.titulo}</b>
            <small>{senal.resumen}</small>
            <span className={`${s.senal} ${s.chica}`} data-n={senal.puntaje ?? undefined}>
              <b>{senal.puntaje ?? "–"}</b>
            </span>
          </button>
        </li>
        {senal.evidencias.map((e) => (
          <li key={e.id} className={e.estado === "rechazada" ? s.rechazada : undefined}>
            <a href={e.url} target="_blank" rel="noopener noreferrer" className={admin.fila} data-ayuda="evidencias">
              <IconoTipo tipo={e.tipo} width={20} height={20} />
              <b>{e.titulo}</b>
              <small>{e.detalle}</small>
              <span className={admin.total}>
                <IconoEnlace width={18} height={18} />
              </span>
            </a>
          </li>
        ))}
        <li>
          <button type="button" className={`${admin.fila} ${s.boton}`} aria-haspopup="dialog" data-ayuda="evidencias" onClick={() => setHoja("evidencia")}>
            <IconoMas width={20} height={20} />
            <b>Añadir evidencia</b>
          </button>
        </li>
      </ul>
      {hoja === "puntaje" && (
        <Hoja etiqueta={`Puntaje de ${senal.titulo}`} titulo={senal.titulo} onCerrar={() => setHoja(null)}>
          <p className={hojaCss.nota}>{senal.resumen}</p>
          {error && (
            <p className="aviso-error" role="alert">
              {error}
            </p>
          )}
          <ul className={`${admin.menu} ${s.menu}`}>
            {opciones.map((o) => {
              const elegida = o.valor === senal.puntaje;
              return (
                <li key={String(o.valor)}>
                  <button type="button" className={`${admin.menuItem} ${admin.menuConDetalle} ${s.opcion}`} aria-pressed={elegida} disabled={enCamino} onClick={() => puntuar(o.valor)}>
                    <IconoOk width={20} height={20} className={elegida ? undefined : s.hueco} />
                    {o.etiqueta}
                    <small>{o.detalle}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </Hoja>
      )}
      {hoja === "evidencia" && <HojaEvidencia artistaId={artistaId} slug={slug} senal={senal} onCerrar={() => setHoja(null)} />}
    </>
  );
}

/** «Añadir evidencia»: la que añade una persona ya cuenta (la leyó ella). Sin enlace http(s) no se añade; el botón dice qué falta. */
export function HojaEvidencia({ artistaId, slug, senal, onCerrar }: { artistaId: string; slug: string; senal: Pick<SenalVista, "clave" | "titulo">; onCerrar: () => void }) {
  const [datos, setDatos] = useState<DatosEvidencia>(() => VACIA(senal.clave));
  const [errores, setErrores] = useState<Partial<Record<keyof DatosEvidencia, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const formulario = useId();
  const falta = faltaEvidencia(datos);
  const poner = (campo: keyof DatosEvidencia) => (e: { target: { value: string } }) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }));
    setErrores((x) => ({ ...x, [campo]: undefined }));
  };

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (falta || enCamino) return;
    const v = validarEvidencia(datos);
    if (!v.ok) {
      setErrores(v.errores);
      const primero = (["titulo", "url", "fecha"] as const).find((c) => v.errores[c]);
      if (primero) document.getElementById(`campo-${primero}`)?.focus();
      return;
    }
    setError(null);
    iniciar(async () => {
      const r = await anadirEvidencia(artistaId, datos, slug);
      if (!r.ok) {
        setError(r.error);
        if (r.errores) setErrores(r.errores);
        return;
      }
      onCerrar();
    });
  }
  return (
    <Hoja
      etiqueta={`Añadir evidencia a ${senal.titulo}`}
      titulo={`Añadir evidencia · ${senal.titulo}`}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={formulario} disabled={!!falta || enCamino} aria-busy={enCamino || undefined}>
            {falta ?? (enCamino ? "Añadiendo…" : "Añadir")}
          </Boton>
        </>
      }
    >
      <form id={formulario} onSubmit={enviar} noValidate>
        <fieldset className={s.grupoChips}>
          <legend className={s.etiquetaCampo}>Tipo</legend>
          <Chips ariaLabel="Tipo de evidencia" envuelve>
            {TIPOS_EVIDENCIA.map((t) => (
              <Chip key={t.valor} activo={datos.tipo === t.valor} onClick={() => setDatos((d) => ({ ...d, tipo: t.valor }))}>
                {t.etiqueta}
              </Chip>
            ))}
          </Chips>
        </fieldset>
        <Campo etiqueta="Qué es" name="titulo" value={datos.titulo} onChange={poner("titulo")} placeholder="Mención en un concurso estatal" maxLength={LIMITES_EVIDENCIA.titulo} error={errores.titulo} autoComplete="off" />
        <Campo
          etiqueta="Enlace"
          name="url"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={datos.url}
          onChange={poner("url")}
          placeholder="https://"
          maxLength={LIMITES_EVIDENCIA.url}
          ayuda="Sin enlace no hay evidencia: la dirección donde se lee."
          error={errores.url}
        />
        <Campo etiqueta="Fecha (si la tiene)" name="fecha" type="date" value={datos.fecha} onChange={poner("fecha")} error={errores.fecha} />
        <Campo etiqueta="Fuente (si no, el dominio del enlace)" name="fuente" value={datos.fuente} onChange={poner("fuente")} placeholder="cultura.slp.gob.mx" maxLength={LIMITES_EVIDENCIA.fuente} autoComplete="off" />
        {error && (
          <p className="aviso-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Hoja>
  );
}
