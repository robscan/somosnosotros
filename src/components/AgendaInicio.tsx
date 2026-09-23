"use client";

import Link from "next/link";
import { PanelPestana, Pestana, Pestanas } from "@/components/ui/Pestanas";
import chip from "@/components/ui/Chip.module.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cargarCercanos, cargarNuevos } from "@/app/accionesAgenda";
import type { RespuestaCercanos } from "@/lib/cargarCercanos";
import type { RespuestaNuevos } from "@/lib/cargarNuevos";
import { agruparPorDia, agruparPorPublicacion, buscarEventos, FILTROS, filtrarAgenda, LIMITE_NUEVOS, zonaDelEntorno, type EventoAgenda, type Filtro, type Grupo, type Punto } from "@/lib/agenda";
import { huboVisitaANuevos, leerCorteNuevos, marcarNuevosVisto } from "@/lib/nuevosVisto";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { enOrden, tarjetaEvento, type Destacado } from "@/lib/destacados";
import { leerUbicacionCercana, ubicacionCercanaFresca } from "@/lib/ubicacion";
import ChipCiudad from "./Ciudad";
import Destacados from "./Destacados";
import { diaCorto, diaLargo, localAIso } from "@/lib/fechas";
import { useMemoriaPantalla } from "./MemoriaPantalla";
import RenglonEvento from "./RenglonEvento";
import { CampoBuscar } from "./ui/Buscador";
import Cabecera from "./ui/Cabecera";
import { IconoCalendario, IconoCaret, IconoCerrar } from "./ui/Iconos";
import { useAsistenciaEnLista, type Decididas } from "./useAsistenciaEnLista";
import { AvisoAbajo, useCanalDeListas } from "./useCanalDeListas";
import type { AvisosLista } from "./useSeguirEnLista";
import styles from "./AgendaInicio.module.css";

type Props = {
  eventos: EventoAgenda[];
  /** Lugares que la persona sigue; null = sin sesión. */
  seguidos: string[] | null;
  /** Eventos de los artistas que sigue (con sesión). */
  eventosSeguidos?: string[];
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  /** Hoy en la ciudad, YYYY-MM-DD (lo decide el servidor para que cliente y servidor coincidan). */
  hoy: string;
  /** Zona horaria de la ciudad (la de "hoy" y el chip de fecha); cada evento se agrupa en el día de la suya. */
  zona?: string;
  /** Lo que va entre la cabecera y la lista: la tarjeta "Activa los avisos" de la app instalada (docs/rediseno/17, decisión 4). */
  antes?: ReactNode;
  /** Lo que la persona decidió en los eventos cargados (Voy, Me interesa); null = sin sesión. */
  asistencias?: Decididas;
  /** Lo que pide la pregunta de avisos tras el primer Voy al deslizar (como en la ficha); null = sin sesión. */
  avisos?: AvisosLista | null;
  /** La tira de destacados de la ciudad (docs/rediseno/20). */
  destacados?: Destacado[];
};
type EstadoGeo = "sin-pedir" | "pidiendo" | "negado" | "error";
/**
 * Lo que la agenda recuerda al salir a una ficha y volver: pestaña, día elegido, búsqueda y, en Nuevos, el corte
 * (decisión 17 de 02). El corte va aquí a propósito: al mirar Nuevos la marca del teléfono avanza, así que releerla al
 * volver daría una lista vacía. Reponiéndolo se ve otra vez lo mismo que se acababa de ver, y con él va si ya
 * había visita, porque de eso depende cuál de los dos textos del vacío toca.
 */
type Recordado = { filtro: Filtro; fecha: string; busqueda: string; buscando: boolean; corte: number | null; huboVisita: boolean; selloNuevos: string | null };

/**
 * La agenda de la ciudad: ui/Cabecera (chip de fecha, chip de ciudad, lupa, filtros como pestañas),
 * lista agrupada por día con títulos pegajosos, vacíos por causa. Decisiones en docs/rediseno/02-inicio-flujo-y-estados.md.
 */
export default function AgendaInicio({ eventos, seguidos, eventosSeguidos = [], ciudad, ciudades, hoy, zona, antes, asistencias = null, avisos = null, destacados = [] }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [fecha, setFecha] = useState("");
  // La lupa abre el campo en el renglón de los chips; lo escrito filtra al vuelo (los eventos ya están en el teléfono).
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  // El foco (y el teclado) solo cuando la lupa acaba de abrir el campo; al volver de una ficha no se roba el foco.
  const [enfocar, setEnfocar] = useState(false);
  // Desde cuándo cuenta como nuevo en este teléfono. El ref lo fija al instante (el estado llega en el render siguiente,
  // y entre los dos cabría un segundo toque que releería la marca ya avanzada y vaciaría la lista).
  const corteRef = useRef<number | null>(null);
  const [corte, setCorte] = useState<number | null>(null);
  const [huboVisita, setHuboVisita] = useState(false);
  const [selloNuevos, setSelloNuevos] = useState<string | null>(null);
  const [nuevos, setNuevos] = useState<RespuestaNuevos | null>(null);
  const [origenNuevos, setOrigenNuevos] = useState(asistencias);
  const [intentoNuevos, setIntentoNuevos] = useState(0);
  const peticionNuevos = useRef<{ clave: string; origen: Decididas; resultado: Promise<RespuestaNuevos> } | null>(null);

  /**
   * El corte se congela antes de consultar. La marca solo avanza cuando llega una
   * respuesta completa y la persona sigue mirando Nuevos, nunca durante la carga.
   */
  function verNuevos() {
    if (corteRef.current !== null) return;
    corteRef.current = leerCorteNuevos(new Date(), ciudad.slug);
    setCorte(corteRef.current);
    setHuboVisita(huboVisitaANuevos(ciudad.slug));
  }

  useMemoriaPantalla<Recordado>("agenda", { filtro, fecha, busqueda, buscando, corte, huboVisita, selloNuevos }, (r) => {
    if (FILTROS.some((f) => f.clave === r.filtro)) {
      setFiltro(r.filtro);
      if (typeof r.corte === "number") {
        corteRef.current = r.corte;
        setCorte(r.corte);
        setHuboVisita(!!r.huboVisita);
      } else if (r.filtro === "nuevos") verNuevos();
    }
    if (typeof r.selloNuevos === "string" && Number.isFinite(Date.parse(r.selloNuevos))) setSelloNuevos(r.selloNuevos);
    if (typeof r.fecha === "string") setFecha(r.fecha);
    if (typeof r.busqueda === "string") setBusqueda(r.busqueda);
    setBuscando(!!r.buscando || !!r.busqueda);
  });

  useEffect(() => {
    if (filtro !== "nuevos" || corte === null || (nuevos !== null && origenNuevos === asistencias)) return;
    let vigente = true;
    const clave = `${ciudad.slug}:${corte}:${selloNuevos ?? ""}:${intentoNuevos}`;
    // Reutilizar la promesa evita repetir una consulta si se cambia de pestaña
    // durante la carga, y también durante la comprobación de efectos de React.
    if (peticionNuevos.current?.clave !== clave || peticionNuevos.current.origen !== asistencias) {
      peticionNuevos.current = {
        clave,
        origen: asistencias,
        resultado: cargarNuevos(ciudad.nombre, corte, selloNuevos ?? undefined)
          .catch(() => ({ ok: false as const, error: "No pudimos cargar los eventos nuevos." })),
      };
    }
    void peticionNuevos.current.resultado.then((respuesta) => {
      if (!vigente) return;
      setNuevos(respuesta);
      setOrigenNuevos(asistencias);
      if (respuesta.ok) setSelloNuevos(respuesta.sello);
    });
    return () => { vigente = false; };
  }, [filtro, corte, ciudad.slug, ciudad.nombre, selloNuevos, intentoNuevos, nuevos, origenNuevos, asistencias]);

  useEffect(() => {
    if (filtro === "nuevos" && nuevos?.ok && origenNuevos === asistencias) marcarNuevosVisto(new Date(nuevos.sello), ciudad.slug);
  }, [filtro, nuevos, ciudad.slug, origenNuevos, asistencias]);

  const [punto, setPunto] = useState<Punto | null>(null);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");
  const ahora = new Date();

  // Si ya hay una ubicación fresca guardada en el teléfono (de aquí o de Lugares), se reutiliza sin pedirla de
  // nuevo: al volver a Cercanos no hay que tocar "Usar mi ubicación" otra vez (OL-095, L25). Efecto y no estado
  // inicial: el servidor siempre pinta sin ubicación, y así los dos primeros pintados coinciden (sin parpadeo de
  // hidratación). El `.then` (y no leer y llamar a setPunto de un tirón) es a propósito: evita el estado puesto
  // en seco dentro de un efecto que marca react-hooks/set-state-in-effect.
  useEffect(() => {
    Promise.resolve(ubicacionCercanaFresca()).then((fresca) => {
      if (fresca) setPunto(fresca);
    });
  }, []);

  // Cercanos ordena por la ubicación de la persona, no por la ciudad del chip (OL-095, L36: "el contexto ordena, no
  // limita"): la lista viene de todas las ciudades, aparte de la de `eventos` (que sí trae solo la del chip). Se
  // pide una vez, al entrar a la pestaña con la ubicación ya en mano; sus coordenadas nunca viajan al servidor.
  const [cercanos, setCercanos] = useState<RespuestaCercanos | null>(null);
  const [intentoCercanos, setIntentoCercanos] = useState(0);
  const peticionCercanos = useRef<{ intento: number; resultado: Promise<RespuestaCercanos> } | null>(null);
  useEffect(() => {
    if (filtro !== "cercanos" || !punto || (cercanos !== null && peticionCercanos.current?.intento === intentoCercanos)) return;
    let vigente = true;
    if (peticionCercanos.current?.intento !== intentoCercanos) {
      peticionCercanos.current = {
        intento: intentoCercanos,
        resultado: cargarCercanos().catch(() => ({ ok: false as const, error: "No pudimos cargar los eventos cercanos." })),
      };
    }
    void peticionCercanos.current.resultado.then((respuesta) => {
      if (vigente) setCercanos(respuesta);
    });
    return () => { vigente = false; };
  }, [filtro, punto, cercanos, intentoCercanos]);

  // Al deslizar un evento: Voy y Me interesa, las dos con Deshacer (decisión del founder, 2026-09-17; bitácora 085). Se
  // ven al momento y se guardan con la misma acción de la ficha. Sin sesión, llevan a entrar y se aplican al volver.
  // Cada consulta cubre su propia lista. No se mezcla una ausencia en los 300
  // de Todos con el estado de un evento que solo vino entre los 20 de Nuevos.
  const canal = useCanalDeListas();
  const asistenciaTodos = useAsistenciaEnLista(asistencias, avisos, canal);
  const asistenciaNuevos = useAsistenciaEnLista(nuevos?.ok ? nuevos.asistencias : null, avisos, canal);
  const asistenciaCercanos = useAsistenciaEnLista(cercanos?.ok ? cercanos.asistencias : null, avisos, canal);
  const asistencia = filtro === "nuevos" ? asistenciaNuevos : filtro === "cercanos" ? asistenciaCercanos : asistenciaTodos;

  function pedirUbicacion() {
    setGeo("pidiendo");
    leerUbicacionCercana().then(
      (p) => {
        setPunto(p);
        setGeo("sin-pedir");
      },
      (error: unknown) => setGeo(error === "negado" ? "negado" : "error"),
    );
  }

  // Cercanos no usa `eventos` (solo trae la ciudad del chip): usa `cercanos`, de todas las ciudades.
  const fuente = filtro === "nuevos" ? (nuevos?.ok ? nuevos.eventos : []) : filtro === "cercanos" ? (cercanos?.ok ? cercanos.eventos : []) : eventos;
  const { lista: filtrada, km } = filtrarAgenda(fuente, { filtro, punto, seguidos, eventosSeguidos, fecha, ahora, corte: corte ?? undefined });
  const encontrada = buscarEventos(filtrada, busqueda);
  const lista = filtro === "nuevos" ? encontrada.slice(0, LIMITE_NUEVOS) : encontrada;
  const hayBusqueda = busqueda.trim().length > 0;
  const hoyIso = localAIso(`${hoy}T12:00`, zona) ?? new Date().toISOString();

  let cuerpo: React.ReactNode;
  const cargandoNuevos = nuevos === null || origenNuevos !== asistencias;
  if (filtro === "nuevos" && cargandoNuevos) {
    cuerpo = <section className={styles.grupo} aria-busy="true"><p className={styles.vacio} role="status">Cargando…</p></section>;
  } else if (filtro === "nuevos" && nuevos && !nuevos.ok) {
    cuerpo = (
      <VacioConAccion titulo="No pudimos cargar Nuevos" texto="Intenta otra vez. Tu última visita no se ha actualizado.">
        <button type="button" className={styles.accion} onClick={() => { setNuevos(null); setIntentoNuevos((n) => n + 1); }}>Reintentar</button>
      </VacioConAccion>
    );
  } else if (filtro === "cercanos" && !punto) {
    cuerpo = (
      <VacioConAccion titulo="Cercanos" texto={geo === "negado" ? "No pudimos leer tu ubicación. Actívala para este sitio en los ajustes del teléfono." : "Para ordenar por cercanía necesitamos tu ubicación. Solo sirve para eso: no sale de tu teléfono."}>
        {geo !== "negado" && (
          <button type="button" className={styles.accion} onClick={pedirUbicacion} disabled={geo === "pidiendo"}>
            {geo === "pidiendo" ? "Un momento…" : "Usar mi ubicación"}
          </button>
        )}
      </VacioConAccion>
    );
  } else if (filtro === "cercanos" && punto && cercanos === null) {
    cuerpo = <section className={styles.grupo} aria-busy="true"><p className={styles.vacio} role="status">Cargando…</p></section>;
  } else if (filtro === "cercanos" && punto && cercanos && !cercanos.ok) {
    cuerpo = (
      <VacioConAccion titulo="Cercanos" texto="No pudimos cargar los eventos cercanos. Intenta otra vez.">
        <button type="button" className={styles.accion} onClick={() => { setCercanos(null); setIntentoCercanos((n) => n + 1); }}>Reintentar</button>
      </VacioConAccion>
    );
  } else if (filtro === "siguiendo" && seguidos === null) {
    cuerpo = (
      <VacioConAccion titulo="Siguiendo" texto="Aquí verás lo que pasa en los lugares y con los artistas que sigues. Entra para seguir a los tuyos.">
        <Link href="/entrar?siguiente=/" className={styles.accion}>
          Entrar
        </Link>
      </VacioConAccion>
    );
  } else if (filtro === "siguiendo" && seguidos !== null && seguidos.length === 0 && eventosSeguidos.length === 0) {
    cuerpo = <VacioConAccion titulo="Siguiendo" texto="Todavía no sigues ningún lugar ni artista. En su ficha, toca Seguir y sus eventos aparecerán aquí." />;
  } else if (filtro === "nuevos" && !hayBusqueda && !fecha && lista.length === 0) {
    // Con el corte por última visita esto es lo que más se ve, no la excepción: por eso invita a publicar en vez de
    // dejar a la persona sin nada que hacer (textos elegidos por el founder, 2026-09-17). Sin cuenta, publicar exige
    // entrar, así que la salida lleva a Entrar y vuelve al alta, como en Lugares.
    cuerpo = (
      <VacioConAccion titulo={huboVisita ? "Ya estás al día." : "Nada nuevo esta semana."} texto="¿Sabes de un evento? Publícalo.">
        <Link href={seguidos !== null ? "/eventos/nuevo" : "/entrar?siguiente=/eventos/nuevo"} className={styles.accion}>
          Publicar evento
        </Link>
      </VacioConAccion>
    );
  } else {
    let grupos: Grupo<EventoAgenda>[];
    let vacio: string;
    if (hayBusqueda) {
      grupos = fecha && lista.length ? [{ clave: fecha, titulo: diaLargo(fecha, ahora, zona), eventos: lista }] : agruparPorDia(lista, ahora, filtro === "cercanos");
      // Vacío por causa: dice qué se buscó y dónde, y la salida (Todos, o quitar la fecha).
      const donde = filtro !== "todos" ? ` en ${FILTROS.find((f) => f.clave === filtro)?.etiqueta}` : "";
      vacio = `Nada con «${busqueda.trim()}»${donde}${fecha ? " ese día" : ""}.${filtro !== "todos" ? " Prueba en Todos." : fecha ? " Quita la fecha para buscar en todo." : ""}`;
    } else if (fecha) {
      grupos = lista.length ? [{ clave: fecha, titulo: diaLargo(fecha, ahora, zona), eventos: lista }] : [];
      vacio = "Ese día no hay nada todavía. Quita la fecha para ver todo.";
    } else if (filtro === "cercanos") {
      // Por día, y dentro de cada día del más cercano al más lejano.
      grupos = agruparPorDia(lista, ahora, true);
      vacio = "Nada cerca por ahora.";
    } else if (filtro === "nuevos") {
      // Por cuándo se publicó, no por cuándo es el evento: `agruparPorDia` reordenaba por la hora del evento y tiraba
      // el orden que trae `filtrarAgenda` (el defecto que el founder vio el 2026-09-17).
      grupos = agruparPorPublicacion(lista, ahora, zonaDelEntorno());
      vacio = "Nada nuevo esta semana.";
    } else {
      grupos = agruparPorDia(lista, ahora);
      vacio = filtro === "siguiendo" ? "Lo que sigues no tiene eventos próximos." : `Aún no hay eventos próximos en ${ciudad.nombre}. Si sabes de uno, publícalo.`;
    }
    cuerpo = grupos.length === 0 ? (
      <section className={styles.grupo}>
        <h2>{hayBusqueda ? "Buscar" : fecha ? diaLargo(fecha, ahora, zona) : "Próximos días"}</h2>
        <p className={styles.vacio}>{vacio}</p>
      </section>
    ) : (
      grupos.map((g) => (
        <section key={g.clave} className={styles.grupo} aria-label={g.titulo}>
          <h2>
            {g.titulo}
            {g.eventos.length > 1 && <span> · {g.eventos.length}</span>}
          </h2>
          <ul className={styles.lista}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} km={km.get(e.id)} estado={asistencia.estado(e.id)} boton={asistencia.boton(e)} conDia={filtro === "nuevos" && !fecha && !hayBusqueda} />
            ))}
          </ul>
        </section>
      ))
    );
  }

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
            ) : (
              // Sin fecha elegida: estado vacío "Seleccionar". El chip es el selector nativo: el toque cae en él.
              <label className={`${chip.chip} ${chip.deContexto} ${chip.chipNativo}`} htmlFor="agenda-fecha">
                <IconoCalendario width={16} height={16} />
                <span>Seleccionar</span>
                <IconoCaret width={12} height={12} />
                <input type="date" id="agenda-fecha" className={chip.encima} min={hoy} value={hoy} onChange={(e) => setFecha(e.target.value === hoy ? "" : e.target.value)} aria-label="Elegir una fecha" />
              </label>
            )}
            {/* Cercanos ya no filtra por la ciudad del chip (L36): mientras está activo, el chip dice "Cerca de ti" para no
                contradecir una lista que ahora es de todas las ciudades. Sigue siendo el mismo selector; elegir otra
                ciudad ahí vuelve a Todos de esa ciudad, como ya pasaba. */}
            <ChipCiudad ciudad={filtro === "cercanos" ? { ...ciudad, nombre: "Cerca de ti" } : ciudad} ciudades={ciudades} hrefDe={(c) => (c.slug === CIUDAD_INICIAL.slug ? "/" : `/?ciudad=${c.slug}`)} />
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
              <Pestana key={f.clave} activa={filtro === f.clave} onClick={() => { if (f.clave === "nuevos") verNuevos(); setFiltro(f.clave); }}>
                {f.etiqueta}
              </Pestana>
            ))}
          </Pestanas>
        }
      />
      {antes}
      {/* La tira se va cuando la persona ya busca algo: otra pestaña, una fecha o la búsqueda (decisión 3). */}
      {filtro === "todos" && !fecha && !buscando && <Destacados tarjetas={enOrden(destacados, eventos).map((e) => tarjetaEvento(e, ahora))} grande boton={(t) => asistenciaTodos.boton(t)} />}
      {/* Deslizamiento de 200 ms en la dirección de la pestaña tocada (docs/rediseno/38-transiciones-cargador.md,
          OL-148); no se dispara por una búsqueda o una fecha, solo cuando cambia el índice de la pestaña. */}
      <PanelPestana posicion={FILTROS.findIndex((f) => f.clave === filtro)}>{cuerpo}</PanelPestana>
      {filtro === "nuevos" && nuevos?.ok && !cargandoNuevos && (
        <div className={styles.grupo}>
          <button type="button" className={styles.accion} onClick={() => { setFiltro("todos"); setFecha(""); setBusqueda(""); setBuscando(false); window.scrollTo({ top: 0, behavior: "instant" }); }}>Ver todos</button>
        </div>
      )}
      {asistenciaTodos.extras}
      {asistenciaNuevos.extras}
      {asistenciaCercanos.extras}
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
