"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoCalendario, IconoChevronDerecha, IconoEstrella, IconoOk, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { BOTONES, errorTope, ETIQUETA_ESTADO, HOJAS, TOPE_POR_DEFECTO, usd, type EstadoCiudad, type EstadoCorrida, type TipoBoton } from "@/lib/ciudadesAdmin";
import { cancelarCorrida, crearCorrida } from "./acciones";
import styles from "../admin.module.css";
import css from "./ciudades.module.css";

export type BotonCiudad = {
  tipo: TipoBoton;
  /** Lo que pasó la última vez («Sin correr», «Pendiente de correr · tope 3,00 USD»…). */
  texto: string;
  /** La barra de la corrida que corre (0 a 1), si la rutina dijo cuánto lleva. */
  avance: number | null;
  /** La corrida en curso de este botón, si hay: la hoja la enseña en vez del tope. */
  enCurso: { id: string; estado: EstadoCorrida; texto: string } | null;
};
type Props = { slug: string; nombre: string; estado: EstadoCiudad; cifras: string; linea: string; botones: BotonCiudad[]; credito: string };

const ICONO: Record<TipoBoton, typeof IconoPin> = { lugares: IconoPin, agendas: IconoCalendario, artistas: IconoEstrella };
const CLASE_ESTADO: Record<EstadoCiudad, string | undefined> = { abierta: css.ok, investigando: styles.etiquetaRol, detectada: styles.destacada, cerrada: undefined };

/**
 * Una ciudad (prototipo firmado OL-425, pantalla B): su cabecera con la píldora de estado, cuánto se consulta y qué tiene, la última
 * investigación y, debajo, los tres botones en el orden del founder. Cada botón dice lo que pasó la última vez y abre su hoja.
 */
export default function TarjetaCiudad({ slug, nombre, estado, cifras, linea, botones, credito }: Props) {
  const [abierta, setAbierta] = useState<TipoBoton | null>(null);
  const boton = botones.find((b) => b.tipo === abierta);
  return (
    <>
      <ul className={`${renglon.tarjeta} ${css.ciudad}`} aria-label={nombre}>
        <li>
          <div className={`${styles.fila} ${css.cabeza}`}>
            <IconoUbicacion width={20} height={20} />
            <b>
              {nombre} <span className={[styles.etiqueta, CLASE_ESTADO[estado]].filter(Boolean).join(" ")}>{ETIQUETA_ESTADO[estado]}</span>
            </b>
            <small>{cifras}</small>
            <span className={css.linea}>{linea}</span>
          </div>
        </li>
        {BOTONES.map(({ tipo, verbo }) => {
          const b = botones.find((x) => x.tipo === tipo);
          const Icono = ICONO[tipo];
          return (
            <li key={tipo}>
              <button type="button" className={`${styles.fila} ${css.boton}`} aria-haspopup="dialog" onClick={() => setAbierta(tipo)}>
                <Icono width={20} height={20} />
                <b>{verbo}</b>
                <small>{b?.texto ?? "Sin correr"}</small>
                <span className={styles.total}>
                  <IconoChevronDerecha />
                </span>
                {b?.avance != null && (
                  <span className={`${styles.barraEmbudo} ${css.avance}`} role="progressbar" aria-label={`Avance de ${verbo.toLowerCase()}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(b.avance * 100)}>
                    <i style={{ width: `${Math.round(b.avance * 100)}%` }} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {abierta && <HojaCorrer key={abierta} slug={slug} ciudad={nombre} tipo={abierta} enCurso={boton?.enCurso ?? null} credito={credito} onCerrar={() => setAbierta(null)} />}
    </>
  );
}

type PropsHoja = { slug: string; ciudad: string; tipo: TipoBoton; enCurso: BotonCiudad["enCurso"]; credito: string; onCerrar: () => void };

/**
 * La hoja de un botón: qué va a hacer, con qué fuentes y en qué orden, y el tope en USD (campo con su ✕; 3,00 por omisión). «Correr» deja la
 * corrida pendiente: la corre la rutina con la API. Si ya hay una de este botón en curso, la hoja la dice y deja cancelarla mientras no empiece.
 */
export function HojaCorrer({ slug, ciudad, tipo, enCurso, credito, onCerrar }: PropsHoja) {
  const verbo = BOTONES.find((b) => b.tipo === tipo)!.verbo;
  const h = HOJAS[tipo];
  const [tope, setTope] = useState(usd(TOPE_POR_DEFECTO));
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const errorDelTope = tocado ? errorTope(tope) : null;

  function correr() {
    setTocado(true);
    if (errorTope(tope)) return;
    setError(null);
    iniciar(async () => {
      const r = await crearCorrida(slug, tipo, tope);
      if (!r.ok) return setError(r.error);
      onCerrar();
    });
  }
  function cancelar() {
    if (!enCurso) return;
    setError(null);
    iniciar(async () => {
      const r = await cancelarCorrida(enCurso.id);
      if (!r.ok) return setError(r.error);
      onCerrar();
    });
  }

  const pie = enCurso ? (
    enCurso.estado === "pendiente" ? (
      <>
        <Boton variante="secundario" disabled={enCamino} onClick={onCerrar}>
          Dejarla
        </Boton>
        <Boton variante="peligro" disabled={enCamino} aria-busy={enCamino} onClick={cancelar}>
          {enCamino ? "Cancelando…" : "Cancelar la búsqueda"}
        </Boton>
      </>
    ) : (
      <Boton variante="secundario" onClick={onCerrar}>
        Cerrar
      </Boton>
    )
  ) : (
    <>
      <Boton variante="secundario" disabled={enCamino} onClick={onCerrar}>
        Cancelar
      </Boton>
      <Boton disabled={enCamino} aria-busy={enCamino} onClick={correr}>
        {enCamino ? "Guardando…" : "Correr"}
      </Boton>
    </>
  );

  return (
    <Hoja etiqueta={`${verbo} en ${ciudad}`} titulo={`${verbo} en ${ciudad}`} onCerrar={onCerrar} pie={pie}>
      <p className={hoja.nota}>{h.que}</p>
      <p className={hoja.nota}>
        <b>Fuentes, en este orden</b>
      </p>
      <ul className={`${styles.puede} ${css.fuentes}`}>
        {h.fuentes.map((f) => (
          <li key={f.clave}>
            <IconoOk width={18} height={18} />
            {f.texto(ciudad)}
          </li>
        ))}
      </ul>
      {enCurso ? (
        <p className={hoja.nota} role="status">
          {enCurso.texto}. La corre la rutina con la API; lo que encuentre llega a «Propuestas» para que lo aceptes o lo rechaces.
        </p>
      ) : (
        <Campo
          etiqueta="Tope de gasto (USD)"
          name="tope"
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
            // «Ir» del teclado corre; sin el preventDefault, el mismo Intro tocaría el botón que recupera el foco al cerrarse la hoja.
            if (e.key !== "Enter") return;
            e.preventDefault();
            correr();
          }}
          error={errorDelTope ?? undefined}
          ayuda={`${h.estimado} Al llegar al tope se detiene y guarda lo encontrado. ${credito}.`}
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
