"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import hojaCss from "@/components/ui/Hoja.module.css";
import { IconoBuscar, IconoCaret, IconoOk } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { errorTope } from "@/lib/ciudadesAdmin";
import { dolares, TOPE_INVESTIGAR } from "@/lib/showcase";
import { investigar } from "../acciones";
import admin from "../../admin.module.css";
import s from "../showcase.module.css";

/** Dónde busca la rutina, en el orden en que lo hace (lo mismo que dice la ⓘ y el manual). */
const DONDE = ["Premios, becas y convocatorias", "Prensa", "Festivales y presentaciones", "Obra publicada"] as const;

type Props = {
  artistaId: string;
  slug: string;
  nombre: string;
  ciudad: string;
  /** Lo que dice el renglón («Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD», «Investigado el 21 oct · …»). */
  texto: string;
  /** La barra mientras corre (0 a 1), o null. */
  avance: number | null;
  /** Hay una investigación pendiente o corriendo: la hoja la dice en vez del tope. */
  enCurso: boolean;
  /** «Crédito: 187,40 USD · vence el 11 de noviembre», o null si no se pudo leer. */
  credito: string | null;
};

/**
 * «Investigar» en la ficha de showcase (OL-430; la hoja del prototipo firmado en OL-425): un renglón que dice cómo va la última investigación
 * y abre su hoja. La hoja dice qué hace y dónde busca, y pide el tope de gasto (1,00 USD por omisión, con su ✕); «Investigar» deja la corrida
 * pendiente y el servidor pide su primer paso. Lo que traiga llega a «Por revisar». Mientras hay una en curso, la hoja solo la dice.
 */
export default function InvestigarFicha({ artistaId, slug, nombre, ciudad, texto, avance, enCurso, credito }: Props) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <ul className={renglon.tarjeta}>
        <li>
          <button type="button" className={`${renglon.ajuste} ${s.boton}`} aria-haspopup="dialog" data-ayuda="investigar" onClick={() => setAbierta(true)}>
            <IconoBuscar width={20} height={20} />
            <b>Investigar</b>
            <small>{texto}</small>
            <span>
              <IconoCaret width={16} height={16} />
            </span>
            {avance != null && (
              <span className={`${admin.barraEmbudo} ${s.barraInvestigar}`} role="progressbar" aria-label="Avance de la investigación" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance * 100)}>
                <i style={{ width: `${Math.round(avance * 100)}%` }} />
              </span>
            )}
          </button>
        </li>
      </ul>
      {abierta && <HojaInvestigar artistaId={artistaId} slug={slug} nombre={nombre} ciudad={ciudad} texto={texto} enCurso={enCurso} credito={credito} onCerrar={() => setAbierta(false)} />}
    </>
  );
}

function HojaInvestigar({ artistaId, slug, nombre, ciudad, texto, enCurso, credito, onCerrar }: Omit<Props, "avance"> & { onCerrar: () => void }) {
  const [tope, setTope] = useState(dolares(TOPE_INVESTIGAR));
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const errorDelTope = tocado ? errorTope(tope) : null;

  function correr() {
    setTocado(true);
    if (errorTope(tope)) return;
    setError(null);
    iniciar(async () => {
      const r = await investigar(artistaId, tope, slug);
      if (!r.ok) return setError(r.error);
      onCerrar();
    });
  }

  const pie = enCurso ? (
    <Boton variante="secundario" onClick={onCerrar}>
      Cerrar
    </Boton>
  ) : (
    <>
      <Boton variante="secundario" disabled={enCamino} onClick={onCerrar}>
        Cancelar
      </Boton>
      <Boton disabled={enCamino} aria-busy={enCamino} onClick={correr}>
        {enCamino ? "Guardando…" : "Investigar"}
      </Boton>
    </>
  );

  return (
    <Hoja etiqueta={`Investigar a ${nombre}`} titulo={`Investigar a ${nombre}`} onCerrar={onCerrar} pie={pie}>
      <p className={hojaCss.nota}>
        Busca en la web premios, becas, prensa, festivales y obra publicada con su nombre, {ciudad ? `su ciudad (${ciudad})` : "su ciudad"} y su disciplina. Solo propone lo que dice una página que abrió y leyó, con su enlace; tú lo aceptas. No lee redes.
      </p>
      <p className={hojaCss.nota}>
        <b>Dónde busca, en este orden</b>
      </p>
      <ul className={admin.puede}>
        {DONDE.map((d) => (
          <li key={d}>
            <IconoOk width={18} height={18} />
            {d}
          </li>
        ))}
      </ul>
      {enCurso ? (
        <p className={hojaCss.nota} role="status">
          {texto}. Lo que encuentre llega a «Por revisar».
        </p>
      ) : (
        <Campo
          etiqueta="Tope de gasto (USD)"
          name="tope-investigar"
          value={tope}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="go"
          onChange={(e) => {
            setTope(e.target.value);
            setError(null);
          }}
          onBlur={() => setTocado(true)}
          onKeyDown={(e) => {
            // «Ir» del teclado investiga; sin el preventDefault, el mismo Intro tocaría el renglón que recupera el foco al cerrarse la hoja.
            if (e.key !== "Enter") return;
            e.preventDefault();
            correr();
          }}
          error={errorDelTope ?? undefined}
          ayuda={["Se estima entre 0,20 y 0,60 USD: cuatro búsquedas. Al llegar al tope se detiene y guarda lo encontrado.", credito ? `${credito}.` : null].filter(Boolean).join(" ")}
        />
      )}
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}
