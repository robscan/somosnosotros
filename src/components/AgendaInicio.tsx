"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import { agruparPorDia, agruparPorPublicacion, conFiltros, corteNuevos, filtrosRecordados, listarAgenda, sinSeguirSinSesion, type FiltrosAgenda } from "@/lib/agenda";
import type { Agenda } from "@/lib/cargarAgenda";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { ZONA_INICIAL } from "@/lib/fechas";
import { marcarNuevosVisto } from "@/lib/nuevosVisto";
import { tandaAcotada, siguienteTanda, TANDA_INICIAL } from "@/lib/tandas";
import { useMemoriaPantalla } from "./MemoriaPantalla";
import { useCentinela } from "./useCentinela";
import { useVisitaNuevos } from "./useMarcaNuevos";
import CargarMas from "./ui/CargarMas";
import { EsqueletoRenglones } from "./ui/Esqueleto";
import FilaEventos from "./FilaEventos";
import Grupo from "./ui/Grupo";
import { Pestana, Pestanas } from "./ui/Pestanas";
import RenglonEvento from "./RenglonEvento";
import Cabecera from "./ui/Cabecera";
import { useAsistenciaEnLista } from "./useAsistenciaEnLista";
import { AvisoAbajo, useCanalDeListas } from "./useCanalDeListas";
import type { AvisosLista } from "./useSeguirEnLista";
import esqueleto from "./ListaEsqueleto.module.css";
import comun from "./Lista.module.css";

type Props = {
  /** Eventos, quién sigue qué y qué decidió la persona: una sola consulta pesada, diferida (OL-161, bitácora 196).
   *  Sin `await` en la página: llega como promesa para que la cabecera (ciudad, Cuándo, Filtros) pinte al instante y
   *  solo la lista espere, en su propio `<Suspense>`. */
  agenda: Promise<Agenda>;
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  /** Hoy en la ciudad, YYYY-MM-DD (lo decide el servidor para que cliente y servidor coincidan). */
  hoy: string;
  /** Zona horaria de la ciudad (la de "hoy" y el chip de Cuándo); cada evento se agrupa en el día de la suya. */
  zona?: string;
  /** Lo que va entre la cabecera y la lista: la tarjeta "Activa los avisos" de la app instalada (docs/rediseno/17, decisión 4). */
  antes?: ReactNode;
  /** Lo que pide la pregunta de avisos tras el primer Voy al deslizar (como en la ficha): no depende de la consulta
   *  pesada (sale de la sesión), así que llega ya resuelto. */
  avisos?: AvisosLista | null;
  /** ¿Hay sesión? «Solo lo que sigo» solo existe con ella: sin sesión, ni se ofrece ni cuenta un valor que venga de la URL o de la memoria. */
  conSesion: boolean;
  /** Con qué filtros abrir: los que trae la URL (Cuándo o Filtros elegidos desde Inicio, o un «solo lo que sigo»). */
  filtrosIniciales: FiltrosAgenda;
};
/**
 * Lo que la agenda recuerda al salir a una ficha y volver: sus filtros, cuántos renglones iban (decisión 17 de 02) y la última visita a Nuevos
 * con la que se armó esa pestaña (la pestaña misma vive en la URL, y con ella la memoria de pantalla: una por dirección).
 */
type Recordado = { filtros: FiltrosAgenda; mostrados: number; visita?: string | null };

/**
 * Agenda: la lista por día de todo lo que viene, con la fila de contexto de las pantallas de eventos (`FilaEventos`:
 * ciudad, Cuándo y Filtros) y, debajo, las pestañas Todos · Nuevos, todo en `ui/Cabecera`. Cada día es un grupo con su título
 * pegado (`ui/Grupo`); vacíos por causa. Buscar es la lupa de la barra de la app (`app/buscar`), no un campo de esta pantalla.
 * Nuevos es lo publicado desde la última visita (`AgendaNuevos`). Decisiones en docs/rediseno/02, 23 y 50.
 */
export default function AgendaInicio({ agenda, ciudad, ciudades, hoy, zona = ZONA_INICIAL, antes, avisos = null, conSesion, filtrosIniciales }: Props) {
  const [guardados, setFiltros] = useState(filtrosIniciales);
  const filtros = sinSeguirSinSesion(guardados, conSesion);
  // La pestaña vive en la URL (`?ver=nuevos`; sin él, Todos): se comparte, y tocar la sección en la que ya se está la deja en Todos. Cambiarla
  // reemplaza la dirección sin apilar historial, como los filtros, y sin pedirle nada al servidor; la lista nueva empieza arriba.
  const ruta = usePathname();
  const params = useSearchParams();
  const nuevos = params.get("ver") === "nuevos";
  function verPestana(pestana: "todos" | "nuevos") {
    const siguiente = new URLSearchParams(params);
    if (pestana === "nuevos") siguiente.set("ver", "nuevos");
    else siguiente.delete("ver");
    const consulta = siguiente.toString();
    window.history.replaceState(null, "", consulta ? `${ruta}?${consulta}` : ruta);
    window.scrollTo({ top: 0 });
  }
  const [visita, setVisita] = useVisitaNuevos(ciudad.slug);
  const nuevosDesde = nuevos && visita !== undefined ? corteNuevos(visita) : undefined;
  // Carga progresiva (OL-158): cuántos renglones van pintados de la lista agrupada por día. La memoria de pantalla
  // repone este número igual que los filtros, para que volver de una ficha no colapse la lista a la
  // primera tanda otra vez. Vive aquí (no en `AgendaLista`, diferida) para que una sola `useMemoriaPantalla` guarde
  // todo junto — dos llamadas con la misma clave se pisarían la una a la otra (OL-161).
  const [mostrados, setMostrados] = useState(TANDA_INICIAL);

  useMemoriaPantalla<Recordado>("agenda", { filtros, mostrados, visita }, (r) => {
    if (r.filtros) setFiltros(filtrosRecordados(r.filtros)); // una memoria de la versión anterior no trae `filtros`: se ignora
    if (typeof r.mostrados === "number") setMostrados(r.mostrados);
    if (r.visita !== undefined) setVisita(r.visita);
  });

  // La lista sí espera su propia consulta (eventos, quién sigue qué, qué decidió la persona): va en su `<Suspense>`, con renglones de esqueleto del
  // mismo alto (OL-161, bitácora 196) — antes, la cabecera de arriba esperaba lo mismo (observado por el gestor en la captura 01 de la bitácora
  // 193). Nuevos también lo enseña mientras no se ha leído la última visita (en el servidor y en el primer pintado): nunca un «nada nuevo» en falso.
  const cargando = (
    <div className={esqueleto.lista}>
      <EsqueletoRenglones cantidad={6} />
    </div>
  );

  return (
    <>
      <Cabecera
        contexto={
          <FilaEventos
            ciudad={ciudad}
            ciudades={ciudades}
            hrefDeCiudad={(c) => (c.slug === CIUDAD_INICIAL.slug ? "/agenda" : `/agenda?ciudad=${c.slug}`)}
            hoy={hoy}
            zona={zona}
            agenda={agenda}
            conSesion={conSesion}
            valor={filtros}
            onCambiar={setFiltros}
            nuevosDesde={nuevosDesde}
          />
        }
      >
        <Pestanas ariaLabel="Eventos">
          <Pestana activa={!nuevos} onClick={() => verPestana("todos")}>
            Todos
          </Pestana>
          <Pestana activa={nuevos} onClick={() => verPestana("nuevos")}>
            Nuevos
          </Pestana>
        </Pestanas>
      </Cabecera>
      {antes}
      <Suspense fallback={cargando}>
        {!nuevos ? (
          <AgendaLista agenda={agenda} filtros={filtros} ciudad={ciudad} avisos={avisos} mostrados={mostrados} onMostrados={setMostrados} />
        ) : nuevosDesde === undefined ? (
          cargando
        ) : (
          <AgendaNuevos agenda={agenda} filtros={filtros} desde={nuevosDesde} ciudad={ciudad} avisos={avisos} />
        )}
      </Suspense>
    </>
  );
}

/**
 * La lista misma, tras `cargarAgenda` (OL-161, bitácora 196): `use(agenda)` la desenvuelve y, mientras está
 * pendiente, suspende. Los filtros y cuántos van mostrados llegan como prop desde `AgendaInicio` (que sigue
 * siendo su dueño, para la memoria de pantalla): esta lista los usa, no los guarda.
 */
function AgendaLista({
  agenda,
  filtros,
  ciudad,
  avisos,
  mostrados,
  onMostrados,
}: {
  agenda: Promise<Agenda>;
  filtros: FiltrosAgenda;
  ciudad: Ciudad;
  avisos: AvisosLista | null;
  mostrados: number;
  onMostrados: (actualizar: (m: number) => number) => void;
}) {
  const datos = use(agenda);
  const { seguidos, eventosSeguidos, asistencias } = datos;
  const destacados = new Set(datos.destacados.map((d) => d.id));
  const ahora = new Date();
  const canal = useCanalDeListas();
  const asistencia = useAsistenciaEnLista(asistencias, avisos, canal);

  const lista = listarAgenda(datos, filtros);

  // Carga progresiva de la lista agrupada por día (OL-158): el total cambia con los filtros o la ciudad;
  // cuando cambia, la tanda se acota de nuevo (nunca menos que la primera, nunca más que lo que hay) en vez de quedarse
  // con un número que ya no aplica.
  const total = lista.length;
  const totalAnteriorRef = useRef(total);
  useEffect(() => {
    if (totalAnteriorRef.current !== total) {
      totalAnteriorRef.current = total;
      onMostrados((m) => tandaAcotada(total, m).mostrados);
    }
  }, [total, onMostrados]);
  const hayMasEventos = mostrados < total;
  const centinelaRef = useCentinela(hayMasEventos, () => onMostrados((m) => siguienteTanda(total, m).mostrados));

  function cuerpo() {
    if (filtros.siguiendo && seguidos !== null && seguidos.length === 0 && eventosSeguidos.length === 0) {
      return <Vacio titulo="Siguiendo" texto="Todavía no sigues lugares ni artistas. En su ficha, toca Seguir y sus eventos aparecerán aquí." />;
    }
    if (total === 0) {
      // Vacío por causa: dice qué se puso, y la salida.
      return (
        <Vacio
          titulo={filtros.cuando ? "En esas fechas" : filtros.siguiendo ? "Siguiendo" : "Próximos días"}
          texto={filtros.siguiendo ? "Lo que sigues no tiene eventos próximos." : conFiltros(filtros) ? "No hay nada con lo que elegiste. Cambia o quita algún filtro para ver más." : `Aún no hay eventos próximos en ${ciudad.nombre}. Si sabes de uno, publícalo.`}
        />
      );
    }
    return (
      <>
        {agruparPorDia(lista.slice(0, mostrados), ahora, filtros.cuando?.desde).map((g) => (
          <Grupo key={g.clave} titulo={g.titulo} cuenta={g.eventos.length}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} destacado={destacados.has(e.id)} estado={asistencia.estado(e.id)} boton={asistencia.boton(e)} />
            ))}
          </Grupo>
        ))}
        <CargarMas hayMas={hayMasEventos} centinelaRef={centinelaRef} onVerMas={() => onMostrados((m) => siguienteTanda(total, m).mostrados)} />
      </>
    );
  }

  return (
    <>
      {cuerpo()}
      {asistencia.extras}
      <AvisoAbajo canal={canal} />
    </>
  );
}

/**
 * Nuevos (docs/rediseno/23): lo publicado desde la última visita (`desde`, `corteNuevos`: a lo más 7 días y 20 eventos), en grupos por cuándo
 * se publicó y lo último arriba, con los mismos filtros de la fila de contexto que Todos. Como el grupo dice cuándo se publicó y no cuándo
 * es, el renglón lleva el día del evento. Enseñarla cuenta como haberla visto (`marcarNuevosVisto`), salvo con filtros puestos: lo que no
 * se enseñó sigue siendo nuevo.
 */
function AgendaNuevos({ agenda, filtros, desde, ciudad, avisos }: { agenda: Promise<Agenda>; filtros: FiltrosAgenda; desde: number; ciudad: Ciudad; avisos: AvisosLista | null }) {
  const datos = use(agenda);
  const ahora = new Date();
  const canal = useCanalDeListas();
  const asistencia = useAsistenciaEnLista(datos.asistencias, avisos, canal);
  const destacados = new Set(datos.destacados.map((d) => d.id));
  const lista = listarAgenda(datos, filtros, desde);
  const vistoTodo = !conFiltros(filtros);
  useEffect(() => {
    if (vistoTodo) marcarNuevosVisto(ciudad.slug, datos.eventos);
  }, [vistoTodo, ciudad.slug, datos.eventos]);

  return (
    <>
      {lista.length === 0 ? (
        <div className={comun.vacio}>
          <p>{vistoTodo ? "Nada nuevo desde tu última visita." : "Nada nuevo con lo que elegiste. Cambia o quita algún filtro para ver más."}</p>
        </div>
      ) : (
        agruparPorPublicacion(lista, ahora).map((g) => (
          <Grupo key={g.clave} titulo={g.titulo} cuenta={g.eventos.length}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} conDia destacado={destacados.has(e.id)} estado={asistencia.estado(e.id)} boton={asistencia.boton(e)} />
            ))}
          </Grupo>
        ))
      )}
      {asistencia.extras}
      <AvisoAbajo canal={canal} />
    </>
  );
}

/** Un vacío con su causa. */
function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={comun.vacio}>
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </div>
  );
}
