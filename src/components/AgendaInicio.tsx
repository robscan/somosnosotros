"use client";

import { Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import { agruparPorDia, filtrosRecordados, listarAgenda, sinSeguirSinSesion, type FiltrosAgenda } from "@/lib/agenda";
import type { Agenda } from "@/lib/cargarAgenda";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { ZONA_INICIAL } from "@/lib/fechas";
import { tandaAcotada, siguienteTanda, TANDA_INICIAL } from "@/lib/tandas";
import { useMemoriaPantalla } from "./MemoriaPantalla";
import { useCentinela } from "./useCentinela";
import CargarMas from "./ui/CargarMas";
import { EsqueletoRenglones } from "./ui/Esqueleto";
import FilaEventos from "./FilaEventos";
import Grupo from "./ui/Grupo";
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
 * Lo que la agenda recuerda al salir a una ficha y volver: sus filtros y cuántos renglones iban (decisión 17 de 02).
 */
type Recordado = { filtros: FiltrosAgenda; mostrados: number };

/**
 * Agenda: la lista por día de todo lo que viene, con la fila de contexto de las pantallas de eventos (`FilaEventos`:
 * ciudad, Cuándo y Filtros) en `ui/Cabecera`. Cada día es un grupo con su título pegado (`ui/Grupo`); vacíos por causa. Buscar
 * es la lupa de la barra de la app (`app/buscar`), no un campo de esta pantalla. Decisiones en docs/rediseno/02 y 50.
 */
export default function AgendaInicio({ agenda, ciudad, ciudades, hoy, zona = ZONA_INICIAL, antes, avisos = null, conSesion, filtrosIniciales }: Props) {
  const [guardados, setFiltros] = useState(filtrosIniciales);
  const filtros = sinSeguirSinSesion(guardados, conSesion);
  // Carga progresiva (OL-158): cuántos renglones van pintados de la lista agrupada por día. La memoria de pantalla
  // repone este número igual que los filtros, para que volver de una ficha no colapse la lista a la
  // primera tanda otra vez. Vive aquí (no en `AgendaLista`, diferida) para que una sola `useMemoriaPantalla` guarde
  // todo junto — dos llamadas con la misma clave se pisarían la una a la otra (OL-161).
  const [mostrados, setMostrados] = useState(TANDA_INICIAL);

  useMemoriaPantalla<Recordado>("agenda", { filtros, mostrados }, (r) => {
    if (r.filtros) setFiltros(filtrosRecordados(r.filtros)); // una memoria de la versión anterior no trae `filtros`: se ignora
    if (typeof r.mostrados === "number") setMostrados(r.mostrados);
  });

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
          />
        }
      />
      {antes}
      {/* La lista sí espera su propia consulta (eventos, quién sigue qué, qué decidió la persona): va en su
          `<Suspense>`, con renglones de esqueleto del mismo alto (OL-161, bitácora 196) — antes, la cabecera de
          arriba esperaba lo mismo (observado por el gestor en la captura 01 de la bitácora 193). */}
      <Suspense
        fallback={
          <div className={esqueleto.lista}>
            <EsqueletoRenglones cantidad={6} />
          </div>
        }
      >
        <AgendaLista agenda={agenda} filtros={filtros} ciudad={ciudad} avisos={avisos} mostrados={mostrados} onMostrados={setMostrados} />
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
      const conFiltros = !!filtros.cuando || filtros.cuanto.length > 0 || filtros.siguiendo;
      return (
        <Vacio
          titulo={filtros.cuando ? "En esas fechas" : filtros.siguiendo ? "Siguiendo" : "Próximos días"}
          texto={filtros.siguiendo ? "Lo que sigues no tiene eventos próximos." : conFiltros ? "No hay nada con lo que elegiste. Cambia o quita algún filtro para ver más." : `Aún no hay eventos próximos en ${ciudad.nombre}. Si sabes de uno, publícalo.`}
        />
      );
    }
    return (
      <>
        {agruparPorDia(lista.slice(0, mostrados), ahora, filtros.cuando?.desde).map((g) => (
          <Grupo key={g.clave} titulo={g.titulo} cuenta={g.eventos.length}>
            {g.eventos.map((e) => (
              <RenglonEvento key={e.id} evento={e} estado={asistencia.estado(e.id)} boton={asistencia.boton(e)} />
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

/** Un vacío con su causa. */
function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={comun.vacio}>
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </div>
  );
}
