"use client";

import type { ReactNode } from "react";
import { PiePaso } from "@/components/PorPasos";
import { valorDelSitio } from "@/app/eventos/direccionEvento";
import Boton from "@/components/ui/Boton";
import { IconoBoleto, IconoPersonas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { unirNombres, type ArtistaResumen } from "@/lib/artistas";
import { COOPERACION_SOLIDARIA, type ErroresEvento } from "@/lib/eventos";
import { formatearCuando, localAIso, yaPaso } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { dondeResuelto, inicioDe, type Paso, type Respuestas } from "./pasos";
import styles from "./AltaEvento.module.css";

type Props = {
  r: Respuestas;
  zona: string;
  /** El lugar registrado elegido, si es en uno. */
  lugar: LugarResumen | undefined;
  mios: ArtistaResumen[];
  errores: ErroresEvento;
  /** El error que no es de un dato («No se pudo publicar el evento completo»), encima del botón como en el alta de siempre. */
  general?: string;
  enviando: boolean;
  /** Lo que falta todavía, dicho en el botón; null si ya se puede publicar. */
  falta: string | null;
  /** El formulario escondido que publica (el botón va en el pie, fuera de él). */
  formulario: string;
  onAbrir: (paso: Paso) => void;
};

/**
 * «Revisa» (prototipo firmado, bitácora 323): el nombre como título y cada dato en su renglón sin etiqueta a la vista (OL-297: el icono y
 * el valor dicen qué es; la clave queda para el lector de pantalla). Tocar un renglón abre solo su pregunta y, al contestarla, se vuelve
 * aquí. Lo que falta lo dice el propio valor, con la línea de «por completar». Lo opcional es un enlace quieto que no compite con
 * «Publicar». Los errores del servidor salen junto a su dato, como en el alta de siempre.
 */
export default function Revisa({ r, zona, lugar, mios, errores, general, enviando, falta, formulario, onAbrir }: Props) {
  const inicio = localAIso(inicioDe(r), zona);
  const cuando = inicio && r.fin !== null ? formatearCuando(inicio, r.fin ? localAIso(r.fin, zona) : null, new Date(), zona) : null;
  const cuanto = r.costo === "gratis" ? "Gratis" : r.costo === "cooperacion" ? COOPERACION_SOLIDARIA : r.costo === "precio" && r.precio ? `$${r.precio}` : null;
  const extras = errores.descripcion ?? errores.enlace ?? errores.imagen;
  return (
    <>
      <h2 className={styles.titulo} tabIndex={-1}>
        {r.nombre}
      </h2>
      {errores.titulo && (
        <p className={canon.error} role="alert">
          {errores.titulo}
        </p>
      )}
      <ul className={renglon.renglones}>
        <Dato
          icono={<IconoReloj width={20} height={20} />}
          clave="Cuándo"
          valor={cuando}
          falta={r.dias ? "Falta la hora" : "Falta el día y la hora"}
          error={errores.inicio ?? errores.fin}
          nota={inicio && yaPaso(inicioDe(r), new Date(), zona) ? "Esa hora ya pasó." : undefined}
          onAbrir={() => onAbrir(r.dias && !cuando ? "hora" : "dia")}
        />
        <Dato
          icono={<IconoPin width={20} height={20} />}
          clave="Dónde"
          valor={dondeResuelto(r.sitio) ? valorDelSitio(r.sitio.modo, lugar, r.sitio.otro) : null}
          falta="Falta el lugar"
          error={errores.lugar_id ?? errores.sitio_texto ?? errores.sitio_direccion ?? errores.direccion_privada}
          onAbrir={() => onAbrir("donde")}
        />
        <Dato icono={<IconoBoleto width={20} height={20} />} clave="Cuánto" valor={cuanto} falta="Falta el precio" error={errores.precio} onAbrir={() => onAbrir("cuanto")} />
        {r.quien.length > 0 && (
          <Dato
            icono={<IconoPersonas width={20} height={20} />}
            clave="Quién"
            valor={unirNombres(r.quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre)))}
            onAbrir={() => onAbrir("mas")}
          />
        )}
      </ul>
      <Boton type="button" variante="quieto" onClick={() => onAbrir("mas")}>
        Agregar artistas, descripción o enlace
      </Boton>
      {extras && (
        <p className={canon.error} role="alert">
          {extras}
        </p>
      )}
      <PiePaso>
        {general && (
          <p className="aviso-error" role="alert">
            {general}
          </p>
        )}
        <Boton type={falta ? "button" : "submit"} form={formulario} disabled={enviando} aria-busy={enviando || undefined} aria-disabled={falta ? true : undefined}>
          {enviando ? "Publicando…" : (falta ?? "Publicar")}
        </Boton>
      </PiePaso>
    </>
  );
}

/** Un dato de «Revisa»: el renglón resuelto sin clave a la vista (`ui/Renglon`); todo él abre su pregunta («Cambiar», o «Poner» si falta). */
function Dato({ icono, clave, valor, falta, error, nota, onAbrir }: { icono: ReactNode; clave: string; valor: string | null; falta?: string; error?: string; nota?: string; onAbrir: () => void }) {
  const accion = valor ? "Cambiar" : "Poner";
  return (
    <li className={`${renglon.resuelto} ${renglon.sinClave} ${valor ? "" : renglon.pendiente} ${styles.dato}`}>
      {icono}
      <small>{clave}</small>
      <b className={valor ? undefined : renglon.falta}>{valor ?? falta}</b>
      <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={onAbrir} aria-label={`${accion} ${clave.toLowerCase()}`}>
        {accion}
      </Boton>
      {(error ?? nota) && (
        <p className={renglon.nota} role={error ? "alert" : undefined}>
          {error ?? nota}
        </p>
      )}
    </li>
  );
}
