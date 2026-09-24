"use client";

import { use, useEffect, useRef, useState } from "react";
import { cargarCercanos } from "@/app/accionesAgenda";
import Destacados from "@/components/Destacados";
import CarrilEsqueleto from "@/components/CarrilEsqueleto";
import { useAsistenciaEnLista } from "@/components/useAsistenciaEnLista";
import { useCanalDePantalla } from "@/components/useCanalDeListas";
import type { AvisosLista } from "@/components/useSeguirEnLista";
import { filtrarAgenda } from "@/lib/agenda";
import { tarjetaEvento } from "@/lib/destacados";
import { eventosEstaSemana } from "@/lib/inicio";
import type { RespuestaCercanos } from "@/lib/cargarCercanos";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";

/**
 * "Eventos cercanos esta semana" (OL-156, segunda vuelta): solo si ya hay una ubicación fresca guardada en el
 * teléfono — Inicio no pide permiso (doc 41). Ya era cliente antes de esta pieza (bitácora 188); ahora, además,
 * recibe la lista de ids que ya usaron los otros carriles (`excluirPromise`, resuelta por la misma `cargarAgenda` que
 * ellos) para tampoco repetirlos, sin bloquear su propio pintado por eso: el `<Suspense>` que lo envuelve en
 * `Inicio.tsx` solo espera esa lista corta, no la agenda entera ni la respuesta de geolocalización.
 */
export default function CarrilCercanos({ excluirPromise, avisos, verTodosHref }: { excluirPromise: Promise<string[]>; avisos: AvisosLista | null; verTodosHref: string }) {
  const excluir = use(excluirPromise);
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const [cercanos, setCercanos] = useState<RespuestaCercanos | null>(null);
  const pedida = useRef(false);
  useEffect(() => {
    Promise.resolve(ubicacionCercanaFresca()).then((fresca) => {
      if (fresca) setPunto(fresca);
      else setCercanos({ ok: true, eventos: [], asistencias: null });
    });
  }, []);
  useEffect(() => {
    if (!punto || pedida.current) return;
    pedida.current = true;
    cargarCercanos()
      .catch((): RespuestaCercanos => ({ ok: false, error: "No pudimos cargar los eventos cercanos." }))
      .then(setCercanos);
  }, [punto]);

  const canal = useCanalDePantalla();
  const asistencia = useAsistenciaEnLista(cercanos?.ok ? cercanos.asistencias : null, avisos, canal);

  if (cercanos === null) return <CarrilEsqueleto tamano="mediana" />;
  const excluidos = new Set(excluir);
  const ahora = new Date();
  const eventos = cercanos.ok
    ? filtrarAgenda(eventosEstaSemana(cercanos.eventos, ahora).filter((e) => !excluidos.has(e.id)), { filtro: "cercanos", punto, seguidos: null, fecha: "", ahora }).lista
    : [];
  return (
    <>
      <Destacados tarjetas={eventos.map((e) => tarjetaEvento(e, ahora))} memoria="inicio-cercanos" encabezado="Eventos cercanos esta semana" verTodos={{ href: verTodosHref }} boton={(t) => asistencia.boton(t)} estadoDe={asistencia.estado} />
      {asistencia.extras}
    </>
  );
}
