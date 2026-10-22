"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip, Chips } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import { IconoCaret, IconoDocumento, IconoFiltros, IconoOk, IconoPersonas } from "@/components/ui/Iconos";
import { hrefShowcase, ORDENES, type Vista } from "@/lib/showcase";
import { nPuestos, type Grupo, type Hechos } from "@/lib/showcaseFiltros";
import { filtrosDe, HojaFiltrosShowcase } from "./FiltrosShowcase";
import admin from "../admin.module.css";
import s from "./showcase.module.css";

type Opcion = { valor: string; etiqueta: string; detalle: string };
type Que = "orden" | "vista";

/**
 * Filtros, Orden y Vista de la lista de candidatos (lo firmado en OL-425; OL-446: Estado entra a la hoja Filtros, firmada en OL-443): tres chips
 * de contexto que abren su hoja; elegir una opción la cierra y reemplaza la URL (filtrar no es navegar: no se apila en el historial y Atrás no la
 * repite). «Puntaje» es el orden por defecto. Filtros dice cuántos hay puestos.
 */
export default function OpcionesLista({ vista, hechos, grupos, hoy }: { vista: Vista; hechos: Hechos[]; grupos: Grupo[]; hoy: string }) {
  const router = useRouter();
  const [hoja, setHoja] = useState<Que | "filtros" | null>(null);
  const puestos = nPuestos(filtrosDe(vista));
  const OPCIONES: Record<Que, { titulo: string; actual: string; opciones: Opcion[] }> = {
    orden: { titulo: "Ordenar por", actual: vista.orden, opciones: ORDENES.map((o) => ({ ...o })) },
    vista: {
      titulo: "Ver como",
      actual: vista.tabla ? "tabla" : "tarjetas",
      opciones: [
        { valor: "tarjetas", etiqueta: "Tarjetas", detalle: "Una por artista, con su rúbrica y sus cifras" },
        { valor: "tabla", etiqueta: "Tabla", detalle: "Todas las columnas; en el teléfono se desliza" },
      ],
    },
  };
  function elegir(que: Que, valor: string) {
    setHoja(null);
    const cambio: Partial<Vista> = que === "orden" ? { orden: valor as Vista["orden"] } : { tabla: valor === "tabla" };
    router.replace(hrefShowcase({ ...vista, n: undefined, ...cambio }), { scroll: false });
  }
  const nombreOrden = ORDENES.find((o) => o.valor === vista.orden)!.etiqueta;
  const abierta = hoja && hoja !== "filtros" ? OPCIONES[hoja] : null;
  return (
    <>
      <Chips ariaLabel="Filtros, orden y vista">
        <Chip variante="contexto" activo={puestos > 0} cuenta={puestos} icono={<IconoFiltros width={18} height={18} />} fin={<IconoCaret width={16} height={16} />} onClick={() => setHoja("filtros")}>
          Filtros
        </Chip>
        <Chip variante="contexto" activo={vista.orden !== "puntaje"} icono={<IconoFiltros width={18} height={18} />} fin={<IconoCaret width={16} height={16} />} onClick={() => setHoja("orden")}>
          Orden: {nombreOrden}
        </Chip>
        <Chip variante="contexto" icono={vista.tabla ? <IconoDocumento width={18} height={18} /> : <IconoPersonas width={18} height={18} />} fin={<IconoCaret width={16} height={16} />} onClick={() => setHoja("vista")}>
          Vista: {vista.tabla ? "tabla" : "tarjetas"}
        </Chip>
      </Chips>
      {hoja === "filtros" && <HojaFiltrosShowcase vista={vista} hechos={hechos} grupos={grupos} hoy={hoy} onCerrar={() => setHoja(null)} />}
      {hoja && hoja !== "filtros" && abierta && (
        <Hoja etiqueta={abierta.titulo} titulo={abierta.titulo} onCerrar={() => setHoja(null)}>
          <ul className={`${admin.menu} ${s.menu}`}>
            {abierta.opciones.map((o) => {
              const elegida = o.valor === abierta.actual;
              return (
                <li key={o.valor}>
                  <button type="button" className={`${admin.menuItem} ${admin.menuConDetalle} ${s.opcion}`} aria-pressed={elegida} onClick={() => elegir(hoja, o.valor)}>
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
    </>
  );
}
