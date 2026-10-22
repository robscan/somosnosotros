"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import hojaCss from "@/components/ui/Hoja.module.css";
import { IconoBuscar, IconoChevronDerecha, IconoOk } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { errorTope, leerTope } from "@/lib/ciudadesAdmin";
import { avisoLote, botonLote, dolares, LIMITE_LOTE, lineaTotalLote, TOPE_INVESTIGAR } from "@/lib/showcase";
import { investigarVarios } from "./acciones";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/** Cada cuánto se vuelve a leer la lista mientras alguna investigación corre (con la pantalla a la vista y la hoja cerrada). */
export const RECARGA_MS = 20_000;

/** Un grupo de la hoja: cuántos y sus ids (null si pasan del límite: no se pueden mandar). */
type Grupo = { n: number; ids: string[] | null };
type Props = {
  /** Lo que dice el renglón: la orden en curso o acabada («Investigando a 26 · 5 terminados · 1,95 USD») o lo que propone («26 candidatos por investigar»). */
  texto: string;
  /** La barra de la orden en curso (0 a 1), o null. */
  avance: number | null;
  /** Alguna investigación pendiente o corriendo: la lista se vuelve a leer sola. */
  corriendo: boolean;
  /** La línea de la orden en curso, para decirla también en la hoja; null si no hay. */
  lote: string | null;
  /** Los candidatos marcados sin investigación reciente (la opción por omisión). */
  candidatos: Grupo;
  /** Los que se ven en la lista con el filtro de ahora, y por qué quedan fuera los demás. */
  visibles: Grupo & { fueraRecientes: number; fueraDescartados: number; filtrando: boolean };
  /** El crédito de la API que queda (USD), o null si no se pudo leer. */
  disponible: number | null;
};

/**
 * «Investigar» a varios desde la lista del Showcase (OL-439): el mismo renglón que la ficha (OL-430), arriba de la lista, dice cómo va la última
 * orden con su barra o a cuántos propone investigar, y abre su hoja. Mientras alguna investigación corre, la lista se vuelve a leer cada 20 s
 * (solo con la pantalla a la vista y la hoja cerrada) y al volver a la pantalla, sin apilar historial. Lo que traigan llega a «Por revisar» de
 * cada ficha y la tarjeta lo dice.
 */
export default function InvestigarLote(props: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const { corriendo, texto, avance } = props;
  useEffect(() => {
    if (!corriendo || abierta) return;
    const recargar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const reloj = setInterval(recargar, RECARGA_MS);
    document.addEventListener("visibilitychange", recargar);
    return () => {
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", recargar);
    };
  }, [corriendo, abierta, router]);
  return (
    <>
      <ul className={`${renglon.tarjeta} ${s.investigarLote}`}>
        <li>
          <button type="button" className={`${admin.fila} ${s.boton}`} aria-haspopup="dialog" onClick={() => setAbierta(true)}>
            <IconoBuscar width={20} height={20} />
            <b>Investigar</b>
            <small>{texto}</small>
            <span className={admin.total}>
              <IconoChevronDerecha />
            </span>
            {avance != null && (
              <span className={`${admin.barraEmbudo} ${s.barraInvestigar}`} role="progressbar" aria-label="Avance de la investigación" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance * 100)}>
                <i style={{ width: `${Math.round(avance * 100)}%` }} />
              </span>
            )}
          </button>
        </li>
      </ul>
      {abierta && <HojaLote {...props} onCerrar={() => setAbierta(false)} />}
    </>
  );
}

type Opcion = "candidatos" | "visibles";
const artistas = (n: number) => `${n} ${n === 1 ? "artista" : "artistas"}`;

/** Lo que dice la opción «Los que se ven en la lista»: cuántos y, si quedan fuera algunos, por qué. */
function detalleVisibles(v: Props["visibles"]): string {
  const fuera = [
    v.fueraRecientes ? `${v.fueraRecientes} ${v.fueraRecientes === 1 ? "investigado" : "investigados"} en 30 días` : null,
    v.fueraDescartados ? `${v.fueraDescartados} ${v.fueraDescartados === 1 ? "descartado" : "descartados"}` : null,
  ].filter(Boolean);
  return [`${artistas(v.n)} ${v.filtrando ? "con este filtro" : "de la lista"}`, fuera.length ? `sin ${fuera.join(" ni ")}` : null].filter(Boolean).join(" · ");
}

/**
 * La hoja: a quiénes (los candidatos por investigar, o los que se ven en la lista), el tope por artista con su ✕ (1,00 USD por omisión) y el total
 * («26 artistas · hasta 26,00 USD · crédito 192,40»). El botón dice a cuántos: «Investigar a los 26». Si la opción trae más de 60, la hoja lo dice y
 * su salida es filtrar por disciplina (nada apagado); si nadie, solo se cierra.
 */
function HojaLote({ lote, candidatos, visibles, disponible, onCerrar }: Props & { onCerrar: () => void }) {
  const [opcion, setOpcion] = useState<Opcion>(candidatos.n > 0 || visibles.n === 0 ? "candidatos" : "visibles");
  const [tope, setTope] = useState(dolares(TOPE_INVESTIGAR));
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const campo = useRef<HTMLDivElement>(null);
  const grupo = opcion === "candidatos" ? candidatos : visibles;
  const aviso = avisoLote(grupo.n);
  const usd = leerTope(tope);
  const errorDelTope = tocado ? errorTope(tope) : null;

  function elegir(o: Opcion) {
    setOpcion(o);
    setError(null);
  }
  function correr() {
    setTocado(true);
    if (errorTope(tope) || usd === null || !grupo.ids?.length) return;
    if (disponible !== null && grupo.n * usd > disponible) {
      setError(`Pasa del crédito que queda (${dolares(disponible)} USD): baja el tope o elige a menos.`);
      campo.current?.querySelector("input")?.focus();
      return;
    }
    setError(null);
    const ids = grupo.ids;
    iniciar(async () => {
      const r = await investigarVarios(ids, tope);
      if (!r.ok) return setError(r.error);
      onCerrar();
    });
  }
  /** La salida cuando la opción trae más de la cuenta: cerrar y dejar a la vista, con el foco, los chips de disciplina. */
  function filtrar() {
    onCerrar();
    setTimeout(() => {
      const chips = document.querySelector<HTMLElement>("[aria-label='Filtrar por disciplina']");
      chips?.scrollIntoView({ block: "center" });
      chips?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    }, 60);
  }

  const pie =
    grupo.n === 0 ? (
      <Boton variante="secundario" onClick={onCerrar}>
        Cerrar
      </Boton>
    ) : (
      <>
        <Boton variante="secundario" disabled={enCamino} onClick={onCerrar}>
          Cancelar
        </Boton>
        {grupo.n > LIMITE_LOTE ? (
          <Boton onClick={filtrar}>Filtrar por disciplina</Boton>
        ) : (
          <Boton disabled={enCamino} aria-busy={enCamino} onClick={correr}>
            {enCamino ? "Guardando…" : botonLote(grupo.n)}
          </Boton>
        )}
      </>
    );

  return (
    <Hoja etiqueta="Investigar a varios" titulo="Investigar a varios" onCerrar={onCerrar} pie={pie}>
      <p className={hojaCss.nota}>
        A cada artista, cuatro búsquedas en la web con su nombre, su ciudad y su disciplina: premios y becas, prensa, festivales y obra publicada. No lee redes. Lo que encuentre llega a «Por revisar» de su ficha y nada cuenta hasta que lo aceptas.
      </p>
      {lote && (
        <p className={hojaCss.nota} role="status">
          Ahora: {lote}.
        </p>
      )}
      <p className={hojaCss.nota}>
        <b>A quiénes</b>
      </p>
      <ul className={`${admin.menu} ${s.menu} ${s.aQuienes}`}>
        {(
          [
            { valor: "candidatos", etiqueta: "Candidatos por investigar", detalle: `${artistas(candidatos.n)} · candidatos o revisados, sin investigar en 30 días` },
            { valor: "visibles", etiqueta: "Los que se ven en la lista", detalle: detalleVisibles(visibles) },
          ] as const
        ).map((o) => (
          <li key={o.valor}>
            <button type="button" className={`${admin.menuItem} ${admin.menuConDetalle} ${s.opcion}`} aria-pressed={opcion === o.valor} onClick={() => elegir(o.valor)}>
              <IconoOk width={20} height={20} className={opcion === o.valor ? undefined : s.hueco} />
              {o.etiqueta}
              <small>{o.detalle}</small>
            </button>
          </li>
        ))}
      </ul>
      {aviso ? (
        <p className={`${hojaCss.nota} ${s.avisoLote}`} role="status">
          {aviso}
        </p>
      ) : (
        <>
          <div ref={campo}>
            <Campo
              etiqueta="Tope por artista (USD)"
              name="tope-lote"
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
              ayuda="Cada uno cuesta unos 0,40 USD (entre 0,20 y 0,60). Al llegar al tope se detiene y guarda lo encontrado."
            />
          </div>
          <p className={`${hojaCss.nota} ${s.totalLote}`} role="status">
            {lineaTotalLote(grupo.n, usd, disponible)}
          </p>
        </>
      )}
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}
