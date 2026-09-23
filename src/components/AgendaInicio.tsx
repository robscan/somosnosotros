"use client";

import Link from "next/link";
import { PanelPestana, Pestana, Pestanas } from "@/components/ui/Pestanas";
import chip from "@/components/ui/Chip.module.css";
import { Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import { agruparPorDia, buscarEventos, FILTROS, filtrarAgenda, type EventoAgenda, type Filtro, type Grupo } from "@/lib/agenda";
import type { Agenda } from "@/lib/cargarAgenda";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { tandaAcotada, siguienteTanda, TANDA_INICIAL } from "@/lib/tandas";
import ChipCiudad from "./Ciudad";
import { diaCorto, diaLargo, localAIso } from "@/lib/fechas";
import { useMemoriaPantalla } from "./MemoriaPantalla";
import { useCentinela } from "./useCentinela";
import { usePunteroFinoAncho } from "./usePunteroFinoAncho";
import CargarMas from "./ui/CargarMas";
import { EsqueletoRenglones } from "./ui/Esqueleto";
import RenglonEvento from "./RenglonEvento";
import { CampoBuscar } from "./ui/Buscador";
import Cabecera from "./ui/Cabecera";
import SelectorFecha from "./ui/SelectorFecha";
import { IconoCalendario, IconoCaret, IconoCerrar } from "./ui/Iconos";
import { useAsistenciaEnLista } from "./useAsistenciaEnLista";
import { AvisoAbajo, useCanalDeListas } from "./useCanalDeListas";
import type { AvisosLista } from "./useSeguirEnLista";
import styles from "./AgendaInicio.module.css";

type Props = {
  /** Eventos, quién sigue qué y qué decidió la persona: una sola consulta pesada, diferida (OL-161, bitácora 196).
   *  Sin `await` en la página: llega como promesa para que la cabecera (fecha, ciudad, pestañas, lupa) pinte al
   *  instante y solo la lista espere, en su propio `<Suspense>`. */
  agenda: Promise<Agenda>;
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  /** Hoy en la ciudad, YYYY-MM-DD (lo decide el servidor para que cliente y servidor coincidan). */
  hoy: string;
  /** Zona horaria de la ciudad (la de "hoy" y el chip de fecha); cada evento se agrupa en el día de la suya. */
  zona?: string;
  /** Lo que va entre la cabecera y la lista: la tarjeta "Activa los avisos" de la app instalada (docs/rediseno/17, decisión 4). */
  antes?: ReactNode;
  /** Lo que pide la pregunta de avisos tras el primer Voy al deslizar (como en la ficha): no depende de la consulta
   *  pesada (sale de la sesión), así que llega ya resuelto. */
  avisos?: AvisosLista | null;
  /** Con qué pestaña abrir (un "Ver todos" de Inicio, OL-156): "siguiendo"; sin ella, "todos" de siempre. Cualquier
   *  otro valor (un enlace viejo a "cercanos" o "nuevos", pestañas que ya no existen) también cae a "todos". */
  filtroInicial?: Filtro;
  /** Con qué texto abrir la búsqueda ya escrita (el "Ver todos" de un grupo del buscador único). */
  busquedaInicial?: string;
};
/**
 * Lo que la agenda recuerda al salir a una ficha y volver: pestaña, día elegido y búsqueda (decisión 17 de 02).
 */
type Recordado = { filtro: Filtro; fecha: string; busqueda: string; buscando: boolean; mostrados: number };

/**
 * Agenda: lista directa de eventos, con Todos y Siguiendo (OL-156, segunda vuelta — se quitan la tira de destacados,
 * Cercanos y Nuevos: viven como carriles en Inicio, `/`). `ui/Cabecera` con el chip de fecha, el de ciudad y la
 * lupa; lista agrupada por día con títulos pegajosos, vacíos por causa. Decisiones en docs/rediseno/02.
 */
export default function AgendaInicio({ agenda, ciudad, ciudades, hoy, zona, antes, avisos = null, filtroInicial, busquedaInicial }: Props) {
  const filtroValido = filtroInicial === "siguiendo" ? "siguiendo" : "todos";
  const [filtro, setFiltro] = useState<Filtro>(filtroValido);
  const [fecha, setFecha] = useState("");
  // La lupa abre el campo en el renglón de los chips; lo escrito filtra al vuelo (los eventos ya están en el teléfono).
  const [busqueda, setBusqueda] = useState(busquedaInicial ?? "");
  const [buscando, setBuscando] = useState(!!busquedaInicial);
  // El foco (y el teclado) solo cuando la lupa acaba de abrir el campo; al volver de una ficha no se roba el foco.
  const [enfocar, setEnfocar] = useState(false);
  // Carga progresiva (OL-158): cuántos renglones van pintados de la lista agrupada por día. La memoria de pantalla
  // repone este número igual que la pestaña o la búsqueda, para que volver de una ficha no colapse la lista a la
  // primera tanda otra vez. Vive aquí (no en `AgendaLista`, diferida) para que una sola `useMemoriaPantalla` guarde
  // todo junto — dos llamadas con la misma clave se pisarían la una a la otra (OL-161).
  const [mostrados, setMostrados] = useState(TANDA_INICIAL);
  // En escritorio con puntero fino, el chip de fecha abre la hoja propia (OL-162, bitácora 197: el selector nativo
  // de Chrome no aparece en la app instalada en un monitor externo). En táctil y móvil, el input nativo de abajo.
  const escritorio = usePunteroFinoAncho();
  const [hojaFecha, setHojaFecha] = useState(false);
  const disparadorFecha = useRef<HTMLButtonElement | null>(null);

  useMemoriaPantalla<Recordado>("agenda", { filtro, fecha, busqueda, buscando, mostrados }, (r) => {
    if (FILTROS.some((f) => f.clave === r.filtro)) setFiltro(r.filtro);
    if (typeof r.fecha === "string") setFecha(r.fecha);
    if (typeof r.busqueda === "string") setBusqueda(r.busqueda);
    setBuscando(!!r.buscando || !!r.busqueda);
    if (typeof r.mostrados === "number") setMostrados(r.mostrados);
  });

  const ahora = new Date();
  const hoyIso = localAIso(`${hoy}T12:00`, zona) ?? new Date().toISOString();

  return (
    <>
      <Cabecera
        contexto={
          <>
            {fecha ? (
              // Con fecha elegida el chip solo se quita: vuelve a hoy sin abrir el selector.
              <span className={`${chip.chip} ${chip.deContexto} ${styles.marcado}`}>
                <IconoCalendario width={16} height={16} />
                <span>{diaCorto(localAIso(`${fecha}T12:00`, zona) ?? hoyIso, ahora, zona)}</span>
                <button type="button" className={styles.quitar} aria-label="Quitar la fecha" onClick={() => setFecha("")}>
                  <IconoCerrar width={18} height={18} />
                </button>
              </span>
            ) : escritorio ? (
              // Escritorio: el chip abre la hoja propia en vez del input nativo (mismo aspecto, otro selector).
              <button
                type="button"
                className={`${chip.chip} ${chip.deContexto}`}
                onClick={(e) => {
                  disparadorFecha.current = e.currentTarget;
                  setHojaFecha(true);
                }}
              >
                <IconoCalendario width={16} height={16} />
                <span>Seleccionar</span>
                <IconoCaret width={12} height={12} />
              </button>
            ) : (
              // Sin fecha elegida: estado vacío "Seleccionar". El chip es el selector nativo: el toque cae en él.
              <label className={`${chip.chip} ${chip.deContexto} ${chip.chipNativo}`} htmlFor="agenda-fecha">
                <IconoCalendario width={16} height={16} />
                <span>Seleccionar</span>
                <IconoCaret width={12} height={12} />
                <input type="date" id="agenda-fecha" className={chip.encima} min={hoy} value={hoy} onChange={(e) => setFecha(e.target.value === hoy ? "" : e.target.value)} aria-label="Elegir una fecha" />
              </label>
            )}
            {hojaFecha && (
              <SelectorFecha
                titulo="Fecha"
                fecha={fecha || hoy}
                min={hoy}
                zona={zona}
                onListo={(f) => {
                  setFecha(f === hoy ? "" : f);
                  setHojaFecha(false);
                  disparadorFecha.current?.focus();
                }}
                onCerrar={() => {
                  setHojaFecha(false);
                  disparadorFecha.current?.focus();
                }}
              />
            )}
            <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => (c.slug === CIUDAD_INICIAL.slug ? "/agenda" : `/agenda?ciudad=${c.slug}`)} />
          </>
        }
        onBuscar={() => {
          setBuscando(true);
          setEnfocar(true);
        }}
        campo={buscando && <CampoBuscar valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar un evento, sitio o artista" ariaLabel="Buscar un evento" autoFocus={enfocar} onCerrar={() => { setBusqueda(""); setBuscando(false); setEnfocar(false); }} />}
        filtros={
          <Pestanas ariaLabel="Filtrar la agenda" repartidas>
            {FILTROS.map((f) => (
              <Pestana key={f.clave} activa={filtro === f.clave} onClick={() => setFiltro(f.clave)}>
                {f.etiqueta}
              </Pestana>
            ))}
          </Pestanas>
        }
      />
      {antes}
      {/* La lista sí espera su propia consulta (eventos, quién sigue qué, qué decidió la persona): va en su
          `<Suspense>`, con renglones de esqueleto del mismo alto (OL-161, bitácora 196) — antes, la cabecera de
          arriba esperaba lo mismo (observado por el gestor en la captura 01 de la bitácora 193). */}
      <Suspense fallback={<EsqueletoListaAgenda />}>
        <AgendaLista agenda={agenda} filtro={filtro} fecha={fecha} busqueda={busqueda} ciudad={ciudad} zona={zona} avisos={avisos} mostrados={mostrados} onMostrados={setMostrados} />
      </Suspense>
    </>
  );
}

/** Fallback de `AgendaLista`: el mismo `PanelPestana` (para no saltar de posición) con renglones grises. */
function EsqueletoListaAgenda() {
  return (
    <div className={styles.lista} aria-hidden="true">
      <EsqueletoRenglones cantidad={6} />
    </div>
  );
}

/**
 * La lista misma, tras `cargarAgenda` (OL-161, bitácora 196): `use(agenda)` la desenvuelve y, mientras está
 * pendiente, suspende. El filtro, la fecha, la búsqueda y cuántos van mostrados llegan como prop desde
 * `AgendaInicio` (que sigue siendo su dueño, para la memoria de pantalla): esta lista los usa, no los guarda.
 */
function AgendaLista({
  agenda,
  filtro,
  fecha,
  busqueda,
  ciudad,
  zona,
  avisos,
  mostrados,
  onMostrados,
}: {
  agenda: Promise<Agenda>;
  filtro: Filtro;
  fecha: string;
  busqueda: string;
  ciudad: Ciudad;
  zona?: string;
  avisos: AvisosLista | null;
  mostrados: number;
  onMostrados: (actualizar: (m: number) => number) => void;
}) {
  const { eventos, seguidos, eventosSeguidos, asistencias } = use(agenda);
  const ahora = new Date();
  const canal = useCanalDeListas();
  const asistencia = useAsistenciaEnLista(asistencias, avisos, canal);

  // Sin la pestaña Cercanos (que ya vive en Inicio como carril) `filtrarAgenda` nunca calcula distancias aquí: `km`
  // siempre viene vacío, como ya pasaba en Todos y Siguiendo antes de esta pieza.
  const { lista: filtrada, km } = filtrarAgenda(eventos, { filtro, punto: null, seguidos, eventosSeguidos, fecha, ahora });
  const lista = buscarEventos(filtrada, busqueda);
  const hayBusqueda = busqueda.trim().length > 0;

  // Carga progresiva de la lista agrupada por día (OL-158): con un día elegido ya es un solo día, corto, sin
  // tandas. El total cambia con la pestaña, la búsqueda o la ciudad; cuando cambia, la tanda se acota de nuevo
  // (nunca menos que la primera, nunca más que lo que hay) en vez de quedarse con un número que ya no aplica.
  const total = lista.length;
  const totalAnteriorRef = useRef(total);
  useEffect(() => {
    if (totalAnteriorRef.current !== total) {
      totalAnteriorRef.current = total;
      onMostrados((m) => tandaAcotada(total, m).mostrados);
    }
  }, [total, onMostrados]);
  const listaVisible = fecha ? lista : lista.slice(0, mostrados);
  const hayMasEventos = !fecha && mostrados < total;
  const centinelaRef = useCentinela(hayMasEventos, () => onMostrados((m) => siguienteTanda(total, m).mostrados));

  let cuerpo: React.ReactNode;
  if (filtro === "siguiendo" && seguidos === null) {
    cuerpo = (
      <VacioConAccion titulo="Siguiendo" texto="Aquí verás lo que pasa en los lugares y con los artistas que sigues. Entra para seguir a los tuyos.">
        <Link href="/entrar?siguiente=/agenda" className={styles.accion}>
          Entrar
        </Link>
      </VacioConAccion>
    );
  } else if (filtro === "siguiendo" && seguidos !== null && seguidos.length === 0 && eventosSeguidos.length === 0) {
    cuerpo = <VacioConAccion titulo="Siguiendo" texto="Todavía no sigues ningún lugar ni artista. En su ficha, toca Seguir y sus eventos aparecerán aquí." />;
  } else {
    let grupos: Grupo<EventoAgenda>[];
    let vacio: string;
    if (hayBusqueda) {
      grupos = fecha && lista.length ? [{ clave: fecha, titulo: diaLargo(fecha, ahora, zona), eventos: lista }] : agruparPorDia(listaVisible, ahora);
      // Vacío por causa: dice qué se buscó y dónde, y la salida (Todos, o quitar la fecha).
      const donde = filtro !== "todos" ? ` en ${FILTROS.find((f) => f.clave === filtro)?.etiqueta}` : "";
      vacio = `Nada con «${busqueda.trim()}»${donde}${fecha ? " ese día" : ""}.${filtro !== "todos" ? " Prueba en Todos." : fecha ? " Quita la fecha para buscar en todo." : ""}`;
    } else if (fecha) {
      grupos = lista.length ? [{ clave: fecha, titulo: diaLargo(fecha, ahora, zona), eventos: lista }] : [];
      vacio = "Ese día no hay nada todavía. Quita la fecha para ver todo.";
    } else {
      grupos = agruparPorDia(listaVisible, ahora);
      vacio = filtro === "siguiendo" ? "Lo que sigues no tiene eventos próximos." : `Aún no hay eventos próximos en ${ciudad.nombre}. Si sabes de uno, publícalo.`;
    }
    cuerpo = grupos.length === 0 ? (
      <section className={styles.grupo}>
        <h2>{hayBusqueda ? "Buscar" : fecha ? diaLargo(fecha, ahora, zona) : "Próximos días"}</h2>
        <p className={styles.vacio}>{vacio}</p>
      </section>
    ) : (
      <>
      {grupos.map((g) => (
        <section key={g.clave} className={styles.grupo} aria-label={g.titulo}>
          <h2>
            {g.titulo}
            {g.eventos.length > 1 && <span> · {g.eventos.length}</span>}
          </h2>
          <ul className={styles.lista}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} km={km.get(e.id)} estado={asistencia.estado(e.id)} boton={asistencia.boton(e)} />
            ))}
          </ul>
        </section>
      ))}
      <CargarMas hayMas={hayMasEventos} centinelaRef={centinelaRef} onVerMas={() => onMostrados((m) => siguienteTanda(total, m).mostrados)} />
      </>
    );
  }

  return (
    <>
      {/* Deslizamiento de 200 ms en la dirección de la pestaña tocada (docs/rediseno/38-transiciones-cargador.md,
          OL-148); no se dispara por una búsqueda o una fecha, solo cuando cambia el índice de la pestaña. */}
      <PanelPestana posicion={FILTROS.findIndex((f) => f.clave === filtro)}>{cuerpo}</PanelPestana>
      {asistencia.extras}
      <AvisoAbajo canal={canal} />
    </>
  );
}

function VacioConAccion({ titulo, texto, children }: { titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <section className={`${styles.grupo} ${styles.vacioAccion}`}>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {children}
    </section>
  );
}
