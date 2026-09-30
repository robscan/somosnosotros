"use client";

import { useMemo, useRef, useState } from "react";
import { CUANTOS, filtrosPuestos, listarAgenda, type Cuanto, type FiltrosAgenda } from "@/lib/agenda";
import { diasActivosCalendario } from "@/lib/calendario";
import type { Agenda } from "@/lib/cargarAgenda";
import type { Ciudad, CiudadConDatos } from "@/lib/ciudad";
import { atajosCuando, elegirEnRango, etiquetaCuando, mismoCuando, type Cuando } from "@/lib/cuando";
import ChipCiudad from "./Ciudad";
import Calendario from "./ui/Calendario";
import { Chip, Chips } from "./ui/Chip";
import HojaFiltros, { BloqueFiltro } from "./ui/HojaFiltros";
import { IconoCalendario, IconoCampana, IconoFiltros } from "./ui/Iconos";
import Palanca from "./ui/Palanca";
import renglon from "./ui/Renglon.module.css";
import { useResuelta } from "./useResuelta";

type Props = {
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  /** A dónde lleva cada ciudad (Inicio o la agenda). */
  hrefDeCiudad: (c: Ciudad) => string;
  /** Hoy en la ciudad, YYYY-MM-DD (lo decide el servidor para que cliente y servidor coincidan) y su zona. */
  hoy: string;
  zona: string;
  /** La agenda, diferida como la lista: de ella salen los puntos del calendario y cuántos eventos da cada elección. */
  agenda: Promise<Agenda>;
  /** Lo que hay puesto ahora: en Agenda, sus filtros; en Inicio, nada (Inicio son carriles y no se filtra). */
  valor: FiltrosAgenda;
  /** Al aplicar una hoja o quitar un filtro puesto: Agenda lo guarda; Inicio lleva a Agenda con eso puesto. */
  onCambiar: (valor: FiltrosAgenda) => void;
};

/** «Ver 14 eventos», «Ver 1 evento», «Sin eventos»; sin saber todavía cuántos, «Ver eventos». */
const cuantosEventos = (n: number | null) => (n === null ? "Ver eventos" : n === 0 ? "Sin eventos" : n === 1 ? "Ver 1 evento" : `Ver ${n} eventos`);

/**
 * La fila de contexto de las pantallas de eventos (Inicio y Agenda; docs/rediseno/50, P5): la ciudad, Cuándo y Filtros, y
 * después cada filtro puesto con su ✕. Cada hoja arma su elección aparte y solo la aplica el botón que dice cuántos
 * eventos da; cerrar con la ✕ o tocando fuera no cambia nada.
 */
export default function FilaEventos({ ciudad, ciudades, hrefDeCiudad, hoy, zona, agenda, valor, onCambiar }: Props) {
  const [hoja, setHoja] = useState<"cuando" | "filtros" | null>(null);
  const disparador = useRef<HTMLElement | null>(null);
  const cargada = useResuelta(agenda);

  function abrir(cual: "cuando" | "filtros") {
    disparador.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setHoja(cual);
  }
  function cerrar() {
    setHoja(null);
    disparador.current?.focus({ preventScroll: true });
  }
  function aplicar(nuevo: FiltrosAgenda) {
    cerrar();
    onCambiar(nuevo);
  }
  const quitarCuanto = (clave: Cuanto) => onCambiar({ ...valor, cuanto: valor.cuanto.filter((c) => c !== clave) });

  return (
    <>
      <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={hrefDeCiudad} />
      <Chip variante="contexto" icono={<IconoCalendario width={16} height={16} />} activo={!!valor.cuando} onClick={() => abrir("cuando")}>
        {valor.cuando ? etiquetaCuando(valor.cuando, hoy, zona) : "Cuándo"}
      </Chip>
      <Chip variante="contexto" icono={<IconoFiltros width={16} height={16} />} cuenta={filtrosPuestos(valor)} onClick={() => abrir("filtros")}>
        Filtros
      </Chip>
      {valor.cuanto.map((clave) => (
        <Chip key={clave} variante="quitar" onClick={() => quitarCuanto(clave)}>
          {CUANTOS.find((c) => c.clave === clave)?.etiqueta ?? clave}
        </Chip>
      ))}
      {valor.siguiendo && (
        <Chip variante="quitar" onClick={() => onCambiar({ ...valor, siguiendo: false })}>
          Solo lo que sigo
        </Chip>
      )}
      {hoja === "cuando" && <HojaCuando valor={valor} hoy={hoy} zona={zona} agenda={cargada} onAplicar={aplicar} onCerrar={cerrar} />}
      {hoja === "filtros" && <HojaDeFiltros valor={valor} agenda={cargada} onAplicar={aplicar} onCerrar={cerrar} />}
    </>
  );
}

type PropsHoja = { valor: FiltrosAgenda; agenda: Agenda | null; onAplicar: (valor: FiltrosAgenda) => void; onCerrar: () => void };

/**
 * Cuándo: los atajos (Hoy, Mañana, Fin de semana, Esta semana), «Elegir fecha…» —que abre el calendario dentro de la
 * misma hoja, con un punto en los días con eventos, un día con un toque y un rango con dos— y «Todos los próximos».
 */
function HojaCuando({ valor, hoy, zona, agenda, onAplicar, onCerrar }: PropsHoja & { hoy: string; zona: string }) {
  const atajos = atajosCuando(hoy);
  const [borrador, setBorrador] = useState<Cuando | null>(valor.cuando);
  // El calendario se ve mientras se elige con él: al abrir con un valor que no es un atajo, ya viene abierto.
  const [eligiendo, setEligiendo] = useState(() => !!valor.cuando && !atajos.some((a) => mismoCuando(a.cuando, valor.cuando)));
  const dias = useMemo(() => (agenda ? diasActivosCalendario(agenda.eventos) : undefined), [agenda]);
  const n = agenda ? listarAgenda(agenda, { ...valor, cuando: borrador }, new Date()).length : null;
  const elegir = (cuando: Cuando | null) => {
    setBorrador(cuando);
    setEligiendo(false);
  };

  return (
    <HojaFiltros titulo="Cuándo" resultado={cuantosEventos(n)} sinResultados={n === 0} onLimpiar={() => elegir(null)} onVer={() => onAplicar({ ...valor, cuando: borrador })} onCerrar={onCerrar}>
      <Chips ariaLabel="Cuándo" envuelve>
        {atajos.map((a) => (
          <Chip key={a.etiqueta} activo={!eligiendo && mismoCuando(a.cuando, borrador)} onClick={() => elegir(a.cuando)}>
            {a.etiqueta}
          </Chip>
        ))}
        <Chip
          activo={eligiendo}
          onClick={() => {
            if (!eligiendo) setBorrador(null);
            setEligiendo(true);
          }}
        >
          {eligiendo && borrador ? etiquetaCuando(borrador, hoy, zona) : "Elegir fecha…"}
        </Chip>
        <Chip activo={!eligiendo && !borrador} onClick={() => elegir(null)}>
          Todos los próximos
        </Chip>
      </Chips>
      {eligiendo && <Calendario hoy={hoy} zona={zona} desde={borrador?.desde ?? ""} hasta={borrador?.hasta ?? ""} diasActivos={dias} sinSemanasPasadas permiteQuitar onElegir={(dia) => setBorrador(elegirEnRango(borrador, dia))} />}
    </HojaFiltros>
  );
}

/** Filtros: cuánto cuesta (uno, otro o los dos) y si solo lo que sigue la persona. */
function HojaDeFiltros({ valor, agenda, onAplicar, onCerrar }: PropsHoja) {
  const [borrador, setBorrador] = useState({ cuanto: valor.cuanto, siguiendo: valor.siguiendo });
  const n = agenda ? listarAgenda(agenda, { ...valor, ...borrador }, new Date()).length : null;
  const alternar = (clave: Cuanto) => setBorrador((b) => ({ ...b, cuanto: b.cuanto.includes(clave) ? b.cuanto.filter((c) => c !== clave) : [...b.cuanto, clave] }));

  return (
    <HojaFiltros titulo="Filtros" resultado={cuantosEventos(n)} sinResultados={n === 0} onLimpiar={() => setBorrador({ cuanto: [], siguiendo: false })} onVer={() => onAplicar({ ...valor, ...borrador })} onCerrar={onCerrar}>
      <BloqueFiltro rotulo="Cuánto">
        <Chips ariaLabel="Cuánto cuesta" envuelve>
          {CUANTOS.map((c) => (
            <Chip key={c.clave} activo={borrador.cuanto.includes(c.clave)} onClick={() => alternar(c.clave)}>
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
            <small>Lugares y artistas que sigues</small>
            <Palanca encendida={borrador.siguiendo} aria-label="Solo lo que sigo" onClick={() => setBorrador((b) => ({ ...b, siguiendo: !b.siguiendo }))} />
          </li>
        </ul>
      </BloqueFiltro>
    </HojaFiltros>
  );
}
