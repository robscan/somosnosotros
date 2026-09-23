"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cargarCercanos } from "@/app/accionesAgenda";
import type { RespuestaCercanos } from "@/lib/cargarCercanos";
import { filtrarAgenda } from "@/lib/agenda";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { tarjetaEvento, type Tarjeta } from "@/lib/destacados";
import { eventosEstaSemana } from "@/lib/inicio";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import ChipCiudad from "./Ciudad";
import { CampoBuscar } from "./ui/Buscador";
import Cabecera from "./ui/Cabecera";
import BuscadorUnificado from "./BuscadorUnificado";
import Destacados from "./Destacados";
import type { Decididas } from "./useAsistenciaEnLista";
import { useAsistenciaEnLista } from "./useAsistenciaEnLista";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import { AvisoAbajo, useCanalDeListas } from "./useCanalDeListas";
import styles from "./Inicio.module.css";

type Props = {
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  conSesion: boolean;
  /** Carril 1: de tus lugares y artistas favoritos (solo con sesión y con algo que seguir; ya viene vacío si no aplica). */
  favoritos: Tarjeta[];
  /** Carril 2: eventos destacados (doc 20). */
  destacados: Tarjeta[];
  /** Carril 5: eventos populares, ya sin lo que salió en favoritos o destacados. */
  populares: Tarjeta[];
  /** Carril 4: lugares con eventos esta semana (ya arma `cargarEventosSemana`). */
  semanaLugares: Tarjeta[];
  /** Carril 6: artistas con eventos esta semana. */
  semanaArtistas: Tarjeta[];
  /** Ids ya usados en favoritos, destacados o populares: el carril 3 (Cercanos) tampoco los repite. */
  excluirDeCercanos: string[];
  seguidosLugares: string[] | null;
  seguidosArtistas: string[] | null;
  asistencias: Decididas;
  avisos: AvisosLista | null;
};

/**
 * Inicio (docs/rediseno/41, OL-153, bitácora 188): seis carriles tipo Netflix con el shell de siempre —
 * `ui/Cabecera` con el chip de ciudad (el de fecha no aplica aquí) y la lupa. Un carril vacío no se pinta (el
 * canon ya lo hace `Destacados`); "Ver todos" abre la sección real con sus listados y filtros. El buscador único
 * es la misma lupa, con los resultados agrupados por tipo (`BuscadorUnificado`).
 */
export default function Inicio({ ciudad, ciudades, conSesion, favoritos, destacados, populares, semanaLugares, semanaArtistas, excluirDeCercanos, seguidosLugares, seguidosArtistas, asistencias, avisos }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [enfocar, setEnfocar] = useState(false);

  // Carril 3 (Cercanos esta semana): solo si ya hay una ubicación fresca guardada en el teléfono — Inicio no pide
  // permiso, a diferencia de la pestaña Cercanos de Agenda (doc 41: "si no, no se muestra el carril").
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const [cercanos, setCercanos] = useState<RespuestaCercanos | null>(null);
  const pedida = useRef(false);
  useEffect(() => {
    Promise.resolve(ubicacionCercanaFresca()).then((fresca) => {
      if (fresca) setPunto(fresca);
    });
  }, []);
  useEffect(() => {
    if (!punto || pedida.current) return;
    pedida.current = true;
    cargarCercanos()
      .catch((): RespuestaCercanos => ({ ok: false, error: "No pudimos cargar los eventos cercanos." }))
      .then(setCercanos);
  }, [punto]);

  const ahora = new Date();
  const excluidos = new Set(excluirDeCercanos);
  const cercanosSemana =
    punto && cercanos?.ok
      ? filtrarAgenda(eventosEstaSemana(cercanos.eventos, ahora).filter((e) => !excluidos.has(e.id)), { filtro: "cercanos", punto, seguidos: null, fecha: "", ahora }).lista
      : [];

  const canal = useCanalDeListas();
  const asistenciaBase = useAsistenciaEnLista(asistencias, avisos, canal);
  const asistenciaCercanos = useAsistenciaEnLista(cercanos?.ok ? cercanos.asistencias : null, avisos, canal);
  const seguirLugar = useSeguirEnLista("lugar", seguidosLugares, avisos, canal);
  const seguirArtista = useSeguirEnLista("artista", seguidosArtistas, avisos, canal);

  const esCiudadInicial = ciudad.slug === CIUDAD_INICIAL.slug;
  /** El "Ver todos" de cada carril conserva la ciudad que se está viendo (OL-055) y, si aplica, la pestaña. */
  const verTodosHref = (raiz: string, filtro?: string) => {
    const p = new URLSearchParams();
    if (filtro) p.set("filtro", filtro);
    if (!esCiudadInicial) p.set("ciudad", ciudad.slug);
    const cadena = p.toString();
    return cadena ? `${raiz}?${cadena}` : raiz;
  };

  return (
    <>
      <Cabecera
        contexto={<ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => `/inicio${c.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${c.slug}`}`} />}
        onBuscar={() => {
          setBuscando(true);
          setEnfocar(true);
        }}
        campo={buscando && <CampoBuscar valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar un evento, lugar o artista" ariaLabel="Buscar en toda la app" autoFocus={enfocar} onCerrar={() => { setBusqueda(""); setBuscando(false); setEnfocar(false); }} />}
      />
      {buscando && busqueda.trim() ? (
        <BuscadorUnificado seccion="inicio" q={busqueda} ciudadSlug={esCiudadInicial ? null : ciudad.slug} ciudadNombre={ciudad.nombre} />
      ) : (
        <div className={styles.carriles}>
          {!conSesion && (
            <div className={styles.invitacion}>
              <b>Sigue lugares y artistas</b>
              <p>Con una cuenta, esta pantalla se llena con lo tuyo: tus lugares, tus artistas y lo que pasa cerca.</p>
              <Link href="/entrar?siguiente=/inicio" className={styles.crearCuenta}>
                Crear cuenta
              </Link>
            </div>
          )}
          <Destacados tarjetas={favoritos} grande memoria="inicio-favoritos" encabezado="De tus lugares y artistas favoritos" verTodos={{ href: verTodosHref("/", "siguiendo") }} boton={(t) => asistenciaBase.boton(t)} />
          <Destacados tarjetas={destacados} grande memoria="inicio-destacados" encabezado="Eventos destacados" verTodos={{ href: verTodosHref("/") }} boton={(t) => asistenciaBase.boton(t)} />
          <Destacados tarjetas={cercanosSemana.map((e) => tarjetaEvento(e, ahora))} grande memoria="inicio-cercanos" encabezado="Eventos cercanos esta semana" verTodos={{ href: verTodosHref("/", "cercanos") }} boton={(t) => asistenciaCercanos.boton(t)} />
          <Destacados tarjetas={semanaLugares} redondas detalleCompleto memoria="inicio-lugares-semana" encabezado="Lugares con eventos esta semana" verTodos={{ href: verTodosHref("/lugares") }} boton={(t) => seguirLugar.boton(t.id, t.titulo)} />
          <Destacados tarjetas={populares} memoria="inicio-populares" encabezado="Eventos populares" verTodos={{ href: verTodosHref("/") }} boton={(t) => asistenciaBase.boton(t)} />
          <Destacados tarjetas={semanaArtistas} redondas detalleCompleto memoria="inicio-artistas-semana" encabezado="Artistas con eventos esta semana" verTodos={{ href: verTodosHref("/artistas") }} boton={(t) => seguirArtista.boton(t.id, t.titulo)} />
        </div>
      )}
      {asistenciaBase.extras}
      {asistenciaCercanos.extras}
      {seguirLugar.extras}
      {seguirArtista.extras}
      <AvisoAbajo canal={canal} />
    </>
  );
}
