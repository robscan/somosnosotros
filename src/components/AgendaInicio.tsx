"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pestana, Pestanas } from "@/components/ui/Pestanas";
import chip from "@/components/ui/Chip.module.css";
import { useState, useTransition, type ReactNode } from "react";
import { cambiarAsistencia } from "@/app/eventos/acciones";
import { accionEvento, textoHecho, type Asistencia } from "@/lib/deslizar";
import { agruparPorDia, buscarEventos, FILTROS, filtrarAgenda, type EventoAgenda, type Filtro, type Grupo, type Punto } from "@/lib/agenda";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { enOrden, tarjetaEvento, type Destacado } from "@/lib/destacados";
import ChipCiudad from "./Ciudad";
import Destacados from "./Destacados";
import Hecho from "./Hecho";
import { diaCorto, diaLargo, localAIso } from "@/lib/fechas";
import { useMemoriaPantalla } from "./MemoriaPantalla";
import RenglonEvento from "./RenglonEvento";
import { CampoBuscar } from "./ui/Buscador";
import type { AccionDeslizable } from "./ui/Deslizable";
import { IconoBuscar, IconoCalendario, IconoCaret, IconoCerrar, IconoEstrella, IconoOk } from "./ui/Iconos";
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
  asistencias?: Record<string, Exclude<Asistencia, null>> | null;
  /** La tira de destacados de la ciudad (docs/rediseno/20). */
  destacados?: Destacado[];
};
type EstadoGeo = "sin-pedir" | "pidiendo" | "negado" | "error";
/** Lo que la agenda recuerda al salir a una ficha y volver: pestaña, día elegido y búsqueda (decisión 17 de 02). */
type Recordado = { filtro: Filtro; fecha: string; busqueda: string; buscando: boolean };

/**
 * La agenda de la ciudad: cabecera pegajosa (chip de fecha, chip de ciudad, lupa, filtros como pestañas),
 * lista agrupada por día con títulos pegajosos, vacíos por causa. Decisiones en docs/rediseno/02-inicio-flujo-y-estados.md.
 */
export default function AgendaInicio({ eventos, seguidos, eventosSeguidos = [], ciudad, ciudades, hoy, zona, antes, asistencias = null, destacados = [] }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [fecha, setFecha] = useState("");
  // La lupa abre el campo en el sitio de los chips; lo escrito filtra al vuelo (los eventos ya están en el teléfono).
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  // El foco (y el teclado) solo cuando la lupa acaba de abrir el campo; al volver de una ficha no se roba el foco.
  const [enfocar, setEnfocar] = useState(false);
  useMemoriaPantalla<Recordado>("agenda", { filtro, fecha, busqueda, buscando }, (r) => {
    if (FILTROS.some((f) => f.clave === r.filtro)) setFiltro(r.filtro);
    if (typeof r.fecha === "string") setFecha(r.fecha);
    if (typeof r.busqueda === "string") setBusqueda(r.busqueda);
    setBuscando(!!r.buscando || !!r.busqueda);
  });
  const [punto, setPunto] = useState<Punto | null>(null);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");
  const ahora = new Date();

  // Al deslizar un evento: Me interesa (decisión del founder, 2026-09-16; bitácora 071). Se ve al momento y se guarda
  // con la misma acción de la ficha; el aviso permite deshacer. Sin sesión, lleva a entrar y se aplica al volver.
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [mias, setMias] = useState<Record<string, Asistencia>>(asistencias ?? {});
  const [hecho, setHecho] = useState<{ texto: string; deshacer: () => void; vez: number } | null>(null);
  function guardar(eventoId: string, nuevo: Asistencia) {
    setMias((m) => ({ ...m, [eventoId]: nuevo }));
    iniciar(async () => {
      await cambiarAsistencia(eventoId, nuevo);
    });
  }
  function accionesDe(e: EventoAgenda): AccionDeslizable[] {
    const previo = mias[e.id] ?? null;
    const accion = accionEvento(previo);
    const icono = accion.clave === "vas" ? <IconoOk width={22} height={22} /> : <IconoEstrella width={22} height={22} />;
    return [
      {
        ...accion,
        icono,
        alTocar: () => {
          if (asistencias === null) {
            router.push(`/entrar?siguiente=${encodeURIComponent(`/eventos/${e.id}?accion=me_interesa`)}`);
            return;
          }
          guardar(e.id, accion.clave === "me_interesa" ? "me_interesa" : null);
          setHecho((h) => ({ texto: textoHecho(accion.clave, e.titulo), deshacer: () => guardar(e.id, previo), vez: (h?.vez ?? 0) + 1 }));
        },
      },
    ];
  }

  function pedirUbicacion() {
    if (!("geolocation" in navigator)) {
      setGeo("error");
      return;
    }
    setGeo("pidiendo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo("sin-pedir");
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "negado" : "error"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  const { lista: filtrada, km } = filtrarAgenda(eventos, { filtro, punto, seguidos, eventosSeguidos, fecha, ahora });
  const lista = buscarEventos(filtrada, busqueda);
  const hayBusqueda = busqueda.trim().length > 0;
  const hoyIso = localAIso(`${hoy}T12:00`, zona) ?? new Date().toISOString();

  let cuerpo: React.ReactNode;
  if (filtro === "cercanos" && !punto) {
    cuerpo = (
      <VacioConAccion titulo="Cercanos" texto={geo === "negado" ? "No pudimos leer tu ubicación. Actívala para este sitio en los ajustes del teléfono." : "Para ordenar por cercanía necesitamos tu ubicación, solo mientras miras la agenda. No se guarda."}>
        {geo !== "negado" && (
          <button type="button" className={styles.accion} onClick={pedirUbicacion} disabled={geo === "pidiendo"}>
            {geo === "pidiendo" ? "Un momento…" : "Usar mi ubicación"}
          </button>
        )}
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
      grupos = agruparPorDia(lista, ahora);
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
              <RenglonEvento key={e.id} evento={e} km={km.get(e.id)} estado={mias[e.id] ?? null} acciones={accionesDe(e)} />
            ))}
          </ul>
        </section>
      ))
    );
  }

  return (
    <>
      <div className={styles.fija}>
        <div className={styles.contexto}>
          {buscando ? (
            // La lupa abrió el campo en el sitio de los chips: la cabecera no cambia de alto y la ✕ lo cierra.
            <CampoBuscar valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar un evento, sitio o artista" ariaLabel="Buscar un evento" autoFocus={enfocar} className={styles.campoBusqueda} onCerrar={() => { setBusqueda(""); setBuscando(false); setEnfocar(false); }} />
          ) : (
            <>
              {fecha ? (
                // Con fecha elegida el chip solo se quita: vuelve a hoy sin abrir el selector.
                <span className={`${chip.chip} ${styles.chipContexto} ${styles.marcado}`}>
                  <IconoCalendario width={16} height={16} />
                  <span>{diaCorto(localAIso(`${fecha}T12:00`, zona) ?? hoyIso, ahora, zona)}</span>
                  <button type="button" className={styles.quitar} aria-label="Quitar la fecha" onClick={() => setFecha("")}>
                    <IconoCerrar width={18} height={18} />
                  </button>
                </span>
              ) : (
                // Sin fecha (hoy), el chip es el selector nativo: el toque cae en él.
                <label className={`${chip.chip} ${chip.chipNativo} ${styles.chipContexto}`} htmlFor="agenda-fecha">
                  <IconoCalendario width={16} height={16} />
                  <span>{diaCorto(hoyIso, ahora, zona)}</span>
                  <IconoCaret width={12} height={12} />
                  <input type="date" id="agenda-fecha" className={chip.encima} min={hoy} value={hoy} onChange={(e) => setFecha(e.target.value === hoy ? "" : e.target.value)} aria-label="Elegir una fecha" />
                </label>
              )}
              <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => (c.slug === CIUDAD_INICIAL.slug ? "/" : `/?ciudad=${c.slug}`)} className={styles.chipContexto} />
              <button type="button" className={`${chip.chip} ${styles.chipContexto} ${styles.lupa}`} onClick={() => { setBuscando(true); setEnfocar(true); }} aria-label="Buscar un evento">
                <IconoBuscar width={18} height={18} />
              </button>
            </>
          )}
        </div>
        <Pestanas ariaLabel="Filtrar la agenda" repartidas className={styles.filtros}>
          {FILTROS.map((f) => (
            <Pestana key={f.clave} activa={filtro === f.clave} onClick={() => setFiltro(f.clave)}>
              {f.etiqueta}
            </Pestana>
          ))}
        </Pestanas>
      </div>
      {antes}
      {/* La tira se va cuando la persona ya busca algo: otra pestaña, una fecha o la búsqueda (decisión 3). */}
      {filtro === "todos" && !fecha && !buscando && <Destacados tarjetas={enOrden(destacados, eventos).map((e) => tarjetaEvento(e, ahora))} />}
      {cuerpo}
      {hecho && <Hecho key={hecho.vez} texto={hecho.texto} onDeshacer={hecho.deshacer} onCerrar={() => setHecho(null)} />}
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
