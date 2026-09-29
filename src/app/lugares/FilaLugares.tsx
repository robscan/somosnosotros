"use client";

import { useState } from "react";
import ChipCiudad from "@/components/Ciudad";
import { Chip, ChipContexto, ChipQuitar, Chips, Cuenta } from "@/components/ui/Chip";
import HojaFiltros, { BloqueFiltro } from "@/components/ui/HojaFiltros";
import { IconoCampana, IconoFiltros } from "@/components/ui/Iconos";
import Palanca from "@/components/ui/Palanca";
import renglon from "@/components/ui/Renglon.module.css";
import type { Ciudad, CiudadConDatos } from "@/lib/ciudad";
import { CON_EVENTOS, eleccionesPuestas, etiquetaTipo, filtrarLugares, filtrarPorEleccion, SIN_ELECCION, tiposPresentes, UMBRAL_CHIPS_LUGARES, type EleccionLugares, type LugarLista } from "@/lib/lugares";

type Props = {
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  hrefDeCiudad: (c: Ciudad) => string;
  /** Todos los lugares de la ciudad: de ellos salen los tipos con su cuenta y cuántos da cada elección. */
  lugares: LugarLista[];
  /** Hoy en la ciudad, YYYY-MM-DD (lo decide el servidor para que cliente y servidor coincidan). */
  hoy: string;
  /** Los lugares que sigue la persona (null sin sesión o mientras llegan): solo se necesitan para «Solo lo que sigo». */
  seguidos: string[] | null;
  /** Lo que se busca con la lupa: el número de lugares del botón también lo respeta. */
  busqueda: string;
  valor: EleccionLugares;
  /** Al aplicar la hoja o quitar un filtro puesto. */
  onCambiar: (valor: EleccionLugares) => void;
};

/** «Ver 14 lugares», «Ver 1 lugar», «Sin lugares». */
const cuantosLugares = (n: number) => (n === 0 ? "Sin lugares" : n === 1 ? "Ver 1 lugar" : `Ver ${n} lugares`);

/**
 * La fila de contexto de Lugares (docs/rediseno/50, P5b): la ciudad y Filtros y, después, cada filtro puesto con su ✕. No lleva
 * Cuándo: «Con eventos» (hoy o esta semana) vive dentro de Filtros. Con pocos lugares, filtrar no sirve y no hay Filtros. La hoja
 * arma su elección aparte y solo la aplica el botón, que dice cuántos lugares da; cerrar con la ✕ o tocando fuera no cambia nada.
 */
export default function FilaLugares({ ciudad, ciudades, hrefDeCiudad, lugares, hoy, seguidos, busqueda, valor, onCambiar }: Props) {
  const [abierta, setAbierta] = useState(false);
  const conFiltros = lugares.length >= UMBRAL_CHIPS_LUGARES;

  return (
    <>
      <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={hrefDeCiudad} />
      {conFiltros && (
        <ChipContexto icono={<IconoFiltros width={16} height={16} />} cuenta={eleccionesPuestas(valor)} onClick={() => setAbierta(true)}>
          Filtros
        </ChipContexto>
      )}
      {valor.tipo && <ChipQuitar texto={etiquetaTipo(valor.tipo)} onClick={() => onCambiar({ ...valor, tipo: null })} />}
      {valor.conEventos && <ChipQuitar texto={CON_EVENTOS.find((c) => c.clave === valor.conEventos)!.puesto} onClick={() => onCambiar({ ...valor, conEventos: null })} />}
      {valor.soloSigo && <ChipQuitar texto="Solo lo que sigo" onClick={() => onCambiar({ ...valor, soloSigo: false })} />}
      {abierta && (
        <HojaDeFiltros
          valor={valor}
          lugares={lugares}
          hoy={hoy}
          seguidos={seguidos}
          busqueda={busqueda}
          onAplicar={(v) => {
            setAbierta(false);
            onCambiar(v);
          }}
          onCerrar={() => setAbierta(false)}
        />
      )}
    </>
  );
}

/** Filtros: qué tipo de lugar, con eventos hoy o esta semana, y si solo lo que sigue la persona. */
function HojaDeFiltros({ valor, lugares, hoy, seguidos, busqueda, onAplicar, onCerrar }: Pick<Props, "valor" | "lugares" | "hoy" | "seguidos" | "busqueda"> & { onAplicar: (valor: EleccionLugares) => void; onCerrar: () => void }) {
  const [borrador, setBorrador] = useState(valor);
  const tipos = tiposPresentes(lugares);
  const n = filtrarLugares(filtrarPorEleccion(lugares, borrador, seguidos, hoy), busqueda).length;

  return (
    <HojaFiltros titulo="Filtros" resultado={cuantosLugares(n)} sinResultados={n === 0} onLimpiar={() => setBorrador(SIN_ELECCION)} onVer={() => onAplicar(borrador)} onCerrar={onCerrar}>
      {tipos.length > 1 && (
        <BloqueFiltro rotulo="Tipo">
          <Chips ariaLabel="Tipo de lugar" envuelve>
            <Chip activo={!borrador.tipo} onClick={() => setBorrador({ ...borrador, tipo: null })}>
              Todos
              <Cuenta n={lugares.length} />
            </Chip>
            {tipos.map((t) => (
              <Chip key={t.valor} activo={borrador.tipo === t.valor} onClick={() => setBorrador({ ...borrador, tipo: t.valor })}>
                {t.etiqueta}
                <Cuenta n={t.n} />
              </Chip>
            ))}
          </Chips>
        </BloqueFiltro>
      )}
      <BloqueFiltro rotulo="Con eventos">
        <Chips ariaLabel="Con eventos" envuelve>
          {CON_EVENTOS.map((c) => (
            <Chip key={c.clave} activo={borrador.conEventos === c.clave} onClick={() => setBorrador({ ...borrador, conEventos: borrador.conEventos === c.clave ? null : c.clave })}>
              {c.etiqueta}
            </Chip>
          ))}
        </Chips>
      </BloqueFiltro>
      <BloqueFiltro rotulo="Siguiendo">
        <ul className={renglon.tarjeta}>
          <li className={renglon.ajuste}>
            <IconoCampana width={20} height={20} />
            <b>Solo lo que sigo</b>
            <small>Lugares que sigues</small>
            <Palanca encendida={borrador.soloSigo} aria-label="Solo lo que sigo" onClick={() => setBorrador({ ...borrador, soloSigo: !borrador.soloSigo })} />
          </li>
        </ul>
      </BloqueFiltro>
    </HojaFiltros>
  );
}
