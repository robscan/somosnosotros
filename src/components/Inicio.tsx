"use client";

import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { hrefAgenda, SIN_FILTROS } from "@/lib/agenda";
import type { Agenda } from "@/lib/cargarAgenda";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import CarrilEsqueleto from "./CarrilEsqueleto";
import FilaEventos from "./FilaEventos";
import { CampoBuscar } from "./ui/Buscador";
import Cabecera from "./ui/Cabecera";
import BuscadorUnificado from "./BuscadorUnificado";
import PantallaConAviso from "./useCanalDeListas";

type Props = {
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  /** Hoy en la ciudad, YYYY-MM-DD, y su zona: los atajos de Cuándo se cuentan desde ahí. */
  hoy: string;
  zona: string;
  /** La agenda, diferida como los carriles: de ella salen los puntos del calendario y el número de eventos de cada hoja. */
  agenda: Promise<Agenda>;
  conSesion: boolean;
  /** La búsqueda ya abierta y con el cursor puesto: a Inicio llega la lupa de la barra desde una pantalla sin búsqueda propia. */
  buscarAlAbrir: boolean;
  /** Los seis carriles, ya construidos (cada uno, un componente de servidor dentro de su propio `<Suspense>` en
   *  `src/app/page.tsx`). `slotTusPlanes` solo se pinta con sesión (OL-219: sin cuenta, ese carril no existe, no
   *  colapsa vacío). */
  slotTusPlanes: React.ReactNode;
  slotEstelar: React.ReactNode;
  slotEstaSemana: React.ReactNode;
  slotNuevos: React.ReactNode;
  slotLugaresSemana: React.ReactNode;
  slotArtistasDestacados: React.ReactNode;
};

/**
 * Inicio (docs/rediseno/41, tercera vuelta OL-219; doc 50, P5): solo carriles — Tus planes, Destacados, Esta semana,
 * Nuevos eventos, Lugares con eventos y Artistas destacados, cada uno con su título a la izquierda y, a la derecha, el
 * enlace que dice a dónde lleva — bajo la fila de contexto de las pantallas de eventos (`FilaEventos`: ciudad, Cuándo y
 * Filtros). Cuándo y Filtros no filtran a Inicio: al aplicarlos llevan a Agenda con eso puesto. Carga progresiva (pedido
 * del founder tras probar en producción): esta pantalla ya no espera ninguna consulta antes de pintar; cada carril llega
 * por su cuenta (streaming del App Router, cada uno en su `<Suspense>`) y un esqueleto del tamaño exacto
 * (`CarrilEsqueleto`) ocupa su lugar mientras tanto. Un carril vacío colapsa sin salto (`Destacados.module.css`,
 * `.vacio`). El buscador único es la lupa de la barra de la app, con los resultados agrupados por tipo
 * (`BuscadorUnificado`). Todos los carriles comparten un solo aviso/pregunta de avisos (`PantallaConAviso`, la misma
 * pieza que ya usan las fichas): el de más abajo se pinta una sola vez, para toda la pantalla, aunque cada carril tenga
 * su propio botón.
 *
 * Ya no hay invitación a crear cuenta (founder, 2026-09-25, OL-219: «dejemos de presentar el callout que invita a
 * crear cuenta en inicio»): el botón «Entrar» de la barra (`Sesion.tsx`) se queda como única puerta a entrar, sin
 * bloquear nada delante del contenido de eventos, lugares y artistas.
 */
export default function Inicio({ ciudad, ciudades, hoy, zona, agenda, conSesion, buscarAlAbrir, slotTusPlanes, slotEstelar, slotEstaSemana, slotNuevos, slotLugaresSemana, slotArtistasDestacados }: Props) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(buscarAlAbrir);
  const [enfocar, setEnfocar] = useState(buscarAlAbrir);

  const esCiudadInicial = ciudad.slug === CIUDAD_INICIAL.slug;

  return (
    <PantallaConAviso>
      <Cabecera
        contexto={
          <FilaEventos
            ciudad={ciudad}
            ciudades={ciudades}
            hrefDeCiudad={(c) => `/${c.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${c.slug}`}`}
            hoy={hoy}
            zona={zona}
            agenda={agenda}
            valor={SIN_FILTROS}
            onCambiar={(valor) => router.push(hrefAgenda(valor, esCiudadInicial ? null : ciudad.slug))}
          />
        }
        onBuscar={() => {
          setBuscando(true);
          setEnfocar(true);
        }}
        campo={buscando && <CampoBuscar valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar un evento, lugar o artista" ariaLabel="Buscar en toda la app" autoFocus={enfocar} onCerrar={() => { setBusqueda(""); setBuscando(false); setEnfocar(false); }} />}
      />
      {buscando && busqueda.trim() ? (
        <BuscadorUnificado seccion="inicio" q={busqueda} ciudadSlug={esCiudadInicial ? null : ciudad.slug} ciudadNombre={ciudad.nombre} />
      ) : (
        <>
          {/* Orden firmado (doc 41, tercera vuelta): eventos siempre antes que lugares y artistas. "Tus planes"
              solo con sesión — sin ella, ni se pinta un carril colapsado (a diferencia de los demás, que sí
              existen vacíos): el componente entero se omite. */}
          {conSesion && <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotTusPlanes}</Suspense>}
          <Suspense fallback={<CarrilEsqueleto tamano="grande" />}>{slotEstelar}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotEstaSemana}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotNuevos}</Suspense>
          <Suspense fallback={<CarrilEsqueleto tamano="chica" />}>{slotLugaresSemana}</Suspense>
          {/* OL-165: «Artistas destacados» pasó a grande (misma tarjeta que la tira de Artistas); el esqueleto
              cambia con él para no saltar cuando llega la respuesta real. */}
          <Suspense fallback={<CarrilEsqueleto tamano="grande" />}>{slotArtistasDestacados}</Suspense>
        </>
      )}
    </PantallaConAviso>
  );
}
