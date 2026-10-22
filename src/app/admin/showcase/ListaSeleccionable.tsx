"use client";

import { useState, type ReactNode } from "react";
import Boton from "@/components/ui/Boton";
import Casilla from "@/components/ui/Casilla";
import { dolares, LIMITE_LOTE, TOPE_INVESTIGAR, type Candidato } from "@/lib/showcase";
import { HojaLote } from "./InvestigarLote";
import TarjetaCandidato from "./TarjetaCandidato";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

/** Una tarjeta de la página con lo que dice de su investigación y cuántas evidencias le quedan por revisar. */
export type TarjetaVista = { c: Candidato; investigacion: string | null; porRevisar: number };

type Props = {
  /** La línea de cifras: «692 artistas · …» o «7 de 692 artistas · 5 pasan al consejo con 5 de 8». */
  cifras: string;
  /** Con tarjetas y alguien en la lista se puede seleccionar (en la tabla, no). */
  seleccionable: boolean;
  tarjetas: TarjetaVista[];
  /** Todos los filtrados, en el orden de la lista (también los que aún no se ven): «Seleccionar los N filtrados». */
  elegibles: { id: string; nombre: string }[];
  filtrando: boolean;
  hoy: string;
  /** Los renglones de arriba (Por aprobar, Investigar): se esconden mientras se selecciona. */
  renglones: ReactNode;
  /** La tabla, o el «nadie» (en lugar de las tarjetas). */
  enLugar: ReactNode;
  /** «Ver más» (siempre) y la exportación (no seleccionando). */
  verMas: ReactNode;
  exportar: ReactNode;
  /** Para la hoja de Investigar con los elegidos (OL-439). */
  lote: string | null;
  disponible: number | null;
};

/**
 * La lista del Showcase con «Seleccionar» (OL-446; lo firmado en OL-443): la línea de cifras lleva «Seleccionar» a la derecha; al tocarlo, arriba la
 * casilla «Seleccionar los N filtrados», en cada tarjeta su casilla (tocar la tarjeta también marca; elegida, en el violeta suave) y al pie una barra
 * con «Cancelar» y un solo violeta que dice qué hace: «Elige a quién investigar», «Investigar a 5 · hasta 5,00 USD» o «Son 75: elige hasta 60».
 * Abre la hoja de Investigar de OL-439 con los elegidos; al mandarlos, la lista sale de Seleccionar. Lo elegido vive aquí, no en la URL.
 */
export default function ListaSeleccionable({ cifras, seleccionable, tarjetas, elegibles, filtrando, hoy, renglones, enLugar, verMas, exportar, lote, disponible }: Props) {
  const [sel, setSel] = useState<string[] | null>(null);
  const [hoja, setHoja] = useState(false);
  const seleccionando = sel !== null && seleccionable;
  const elegidos = new Set(sel ?? []);
  const todos = elegibles.length > 0 && elegibles.every((e) => elegidos.has(e.id));
  const m = sel?.length ?? 0;
  const cambiar = (id: string) => setSel((x) => (x ? (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]) : x));
  const texto = !m ? "Elige a quién investigar" : m > LIMITE_LOTE ? `Son ${m}: elige hasta ${LIMITE_LOTE}` : `Investigar a ${m} · hasta ${dolares(m * TOPE_INVESTIGAR)} USD`;
  // Los elegidos en el orden de la lista, con sus nombres (la hoja dice los tres primeros).
  const enOrden = elegibles.filter((e) => elegidos.has(e.id));
  return (
    <>
      {seleccionando ? (
        <div className={s.todos}>
          <Casilla
            titulo={`Seleccionar ${filtrando ? "los" : "a los"} ${elegibles.length}${filtrando ? " filtrados" : ""}`}
            detalle={m ? `${m} ${m === 1 ? "elegido" : "elegidos"}` : "O toca cada tarjeta"}
            marcada={todos}
            onCambio={() => setSel(todos ? [] : elegibles.map((e) => e.id))}
          />
        </div>
      ) : (
        <>
          <p className={`${admin.nota} ${s.cifras}`} role="status">
            <span>{cifras}</span>
            {seleccionable && (
              <button type="button" className={admin.enlace} onClick={() => setSel([])}>
                Seleccionar
              </button>
            )}
          </p>
          {renglones}
        </>
      )}
      {enLugar ?? (
        <ul className={s.tarjetas} aria-label="Candidatos">
          {tarjetas.map((t) => (
            <TarjetaCandidato key={t.c.id} c={t.c} hoy={hoy} investigacion={t.investigacion} porRevisar={t.porRevisar} eleccion={seleccionando ? { elegido: elegidos.has(t.c.id), onCambio: () => cambiar(t.c.id) } : null} />
          ))}
        </ul>
      )}
      {verMas}
      {seleccionando ? (
        <div className={s.barra} role="group" aria-label="Con los elegidos">
          <Boton variante="texto" ancho="contenido" onClick={() => setSel(null)}>
            Cancelar
          </Boton>
          <Boton onClick={() => m > 0 && m <= LIMITE_LOTE && setHoja(true)}>{texto}</Boton>
        </div>
      ) : (
        exportar
      )}
      {hoja && seleccionando && (
        <HojaLote
          lote={lote}
          disponible={disponible}
          elegidos={{ ids: enOrden.map((e) => e.id), nombres: enOrden.map((e) => e.nombre) }}
          onCerrar={() => setHoja(false)}
          onHecho={() => setSel(null)}
        />
      )}
    </>
  );
}
