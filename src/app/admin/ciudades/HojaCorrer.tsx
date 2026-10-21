"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoOk } from "@/components/ui/Iconos";
import { errorTope, HOJAS, pegado, TOPE_POR_DEFECTO, usd, verboDe, type TipoBoton } from "@/lib/ciudadesAdmin";
import { crearCorrida } from "./acciones";
import styles from "../admin.module.css";
import css from "./ciudades.module.css";

type Props = {
  slug: string;
  ciudad: string;
  tipo: TipoBoton;
  credito: string;
  /** Si la vez pasada falló o llegó al tope, su razón (en minúscula: va tras «La vez pasada»). */
  vezPasada: string | null;
  onCerrar: () => void;
};

/**
 * La hoja de un botón (OL-427; la de hoy en el prototipo firmado OL-431): qué va a hacer, con qué fuentes y en qué orden, y el tope en USD
 * (campo con su ✕; 3,00 por omisión). «Correr» deja la corrida pendiente y la corre la rutina con la API. Si la vez pasada falló o llegó al
 * tope, la hoja empieza por recordarlo. Una búsqueda en curso no abre esta hoja: su tarjeta no lleva botón (o lleva «Cancelar la búsqueda»).
 */
export default function HojaCorrer({ slug, ciudad, tipo, credito, vezPasada, onCerrar }: Props) {
  const verbo = verboDe(tipo);
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

  const pie = (
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
      {vezPasada && (
        <p className={hoja.nota}>
          <b>La vez pasada</b> {pegado(vezPasada)}
        </p>
      )}
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
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}
