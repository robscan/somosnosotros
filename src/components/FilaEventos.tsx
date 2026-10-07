"use client";

import { useMemo, useRef, useState } from "react";
import { contarAgenda, CUANTOS, eventosNuevos, filtrosPuestos, ponerQue, queDeFiltros, textoVer, type Cuanto, type FiltrosAgenda } from "@/lib/agenda";
import { QUES, sinPuntoEnCalendario, type Que } from "@/lib/agendaPorClase";
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
  /** ¿Hay sesión? «Solo lo que sigo» solo existe con ella: sin sesión, Filtros no lo ofrece. */
  conSesion: boolean;
  /** Lo que hay puesto ahora: en Agenda, sus filtros; en Inicio, nada (Inicio son carriles y no se filtra). */
  valor: FiltrosAgenda;
  /** Al aplicar una hoja o quitar un filtro puesto: Agenda lo guarda; Inicio lleva a Agenda con eso puesto. */
  onCambiar: (valor: FiltrosAgenda) => void;
  /** Solo en la pestaña Nuevos de Agenda, desde cuándo cuenta como nuevo (`corteNuevos`): el botón «Ver N eventos» de cada hoja y los puntos del calendario cuentan lo de esa pestaña. */
  nuevosDesde?: number;
};

/** Lo que dice el botón de cada hoja con lo elegido (`textoVer`: «Ver 14 eventos», «Ver 14 eventos y 3 para visitar»…) y si no hay nada que ver. */
function resultado(agenda: Agenda | null, filtros: FiltrosAgenda, hoy: string, nuevosDesde?: number) {
  const cuenta = agenda ? contarAgenda(agenda, filtros, hoy, nuevosDesde) : null;
  return { texto: textoVer(cuenta, queDeFiltros(filtros)), vacio: cuenta !== null && cuenta.renglones + cuenta.visitar === 0 };
}

/**
 * La fila de contexto de las pantallas de eventos (Inicio y Agenda; docs/rediseno/50, P5): la ciudad, Cuándo y Filtros, y
 * después cada filtro puesto con su ✕. Cada hoja arma su elección aparte y solo la aplica el botón que dice cuántos
 * eventos da; cerrar con la ✕ o tocando fuera no cambia nada.
 */
export default function FilaEventos({ ciudad, ciudades, hrefDeCiudad, hoy, zona, agenda, conSesion, valor, onCambiar, nuevosDesde }: Props) {
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
  const que = queDeFiltros(valor);

  return (
    <>
      <ChipCiudad ciudad={ciudad} ciudades={ciudades} seccion="eventos" hrefDe={hrefDeCiudad} />
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
      {que !== "todo" && (
        <Chip variante="quitar" onClick={() => onCambiar(ponerQue(valor, "todo"))}>
          {QUES.find((q) => q.clave === que)?.etiqueta ?? que}
        </Chip>
      )}
      {hoja === "cuando" && <HojaCuando valor={valor} hoy={hoy} zona={zona} agenda={cargada} nuevosDesde={nuevosDesde} onAplicar={aplicar} onCerrar={cerrar} />}
      {hoja === "filtros" && <HojaDeFiltros valor={valor} hoy={hoy} agenda={cargada} conSesion={conSesion} nuevosDesde={nuevosDesde} onAplicar={aplicar} onCerrar={cerrar} />}
    </>
  );
}

type PropsHoja = { valor: FiltrosAgenda; agenda: Agenda | null; nuevosDesde?: number; onAplicar: (valor: FiltrosAgenda) => void; onCerrar: () => void };

/**
 * Cuándo: los atajos (Hoy, Mañana, Fin de semana, Esta semana), «Elegir fecha…» —que abre el calendario dentro de la
 * misma hoja, con un punto en los días con eventos, un día con un toque y un rango con dos— y «Todos los próximos».
 */
function HojaCuando({ valor, hoy, zona, agenda, nuevosDesde, onAplicar, onCerrar }: PropsHoja & { hoy: string; zona: string }) {
  const atajos = atajosCuando(hoy);
  const [borrador, setBorrador] = useState<Cuando | null>(valor.cuando);
  // El calendario se ve mientras se elige con él: al abrir con un valor que no es un atajo, ya viene abierto.
  const [eligiendo, setEligiendo] = useState(() => !!valor.cuando && !atajos.some((a) => mismoCuando(a.cuando, valor.cuando)));
  // Los puntos son los días con renglones: una sesión o un acto sí, una exposición o el marco de un festival no (no son una fecha; OL-322).
  const dias = useMemo(() => (agenda ? diasActivosCalendario((nuevosDesde === undefined ? agenda.eventos : eventosNuevos(agenda.eventos, nuevosDesde)).filter((e) => !sinPuntoEnCalendario(e))) : undefined), [agenda, nuevosDesde]);
  const n = resultado(agenda, { ...valor, cuando: borrador }, hoy, nuevosDesde);
  const elegir = (cuando: Cuando | null) => {
    setBorrador(cuando);
    setEligiendo(false);
  };

  return (
    <HojaFiltros titulo="Cuándo" resultado={n.texto} sinResultados={n.vacio} onLimpiar={() => elegir(null)} onVer={() => onAplicar({ ...valor, cuando: borrador })} onCerrar={onCerrar}>
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

/**
 * Filtros: qué (OL-322: todo, eventos, exposiciones, talleres o festivales; una sola elección), cuánto cuesta (uno, otro o los dos) y, con
 * sesión, si solo lo que sigue la persona.
 */
function HojaDeFiltros({ valor, hoy, agenda, conSesion, nuevosDesde, onAplicar, onCerrar }: PropsHoja & { hoy: string; conSesion: boolean }) {
  const [borrador, setBorrador] = useState<{ cuanto: Cuanto[]; siguiendo: boolean; que: Que }>({ cuanto: valor.cuanto, siguiendo: valor.siguiendo, que: queDeFiltros(valor) });
  // «Todo» no se guarda en los filtros (sin la propiedad): así un filtro de siempre queda igual que antes.
  const elegido = (b: typeof borrador): FiltrosAgenda => ponerQue({ ...valor, cuanto: b.cuanto, siguiendo: b.siguiendo }, b.que);
  const n = resultado(agenda, elegido(borrador), hoy, nuevosDesde);
  const alternar = (clave: Cuanto) => setBorrador((b) => ({ ...b, cuanto: b.cuanto.includes(clave) ? b.cuanto.filter((c) => c !== clave) : [...b.cuanto, clave] }));

  return (
    <HojaFiltros titulo="Filtros" resultado={n.texto} sinResultados={n.vacio} onLimpiar={() => setBorrador({ cuanto: [], siguiendo: false, que: "todo" })} onVer={() => onAplicar(elegido(borrador))} onCerrar={onCerrar}>
      <BloqueFiltro rotulo="Qué">
        <Chips ariaLabel="Qué" envuelve>
          {QUES.map((q) => (
            <Chip key={q.clave} activo={borrador.que === q.clave} onClick={() => setBorrador((b) => ({ ...b, que: q.clave }))}>
              {q.etiqueta}
            </Chip>
          ))}
        </Chips>
      </BloqueFiltro>
      <BloqueFiltro rotulo="Cuánto">
        <Chips ariaLabel="Cuánto cuesta" envuelve>
          {CUANTOS.map((c) => (
            <Chip key={c.clave} activo={borrador.cuanto.includes(c.clave)} onClick={() => alternar(c.clave)}>
              {c.etiqueta}
            </Chip>
          ))}
        </Chips>
      </BloqueFiltro>
      {conSesion && (
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
      )}
    </HojaFiltros>
  );
}
