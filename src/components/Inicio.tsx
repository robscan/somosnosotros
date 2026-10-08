"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { hrefAgenda, SIN_FILTROS } from "@/lib/agenda";
import type { Agenda } from "@/lib/cargarAgenda";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import CarrilEsqueleto from "./CarrilEsqueleto";
import FilaEventos from "./FilaEventos";
import Cabecera from "./ui/Cabecera";
import PantallaConAviso from "./useCanalDeListas";
import { Vacio } from "./AgendaInicio";
import { CarrilesDeInicio, useEstadoCarriles } from "./inicio/EstadoCarriles";

type Props = {
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  /** Hoy en la ciudad, YYYY-MM-DD, y su zona: los atajos de Cuándo se cuentan desde ahí. */
  hoy: string;
  zona: string;
  /** La agenda, diferida como los carriles: de ella salen los puntos del calendario y el número de eventos de cada hoja. */
  agenda: Promise<Agenda>;
  conSesion: boolean;
  /** Los carriles, ya construidos (cada uno, un componente de servidor dentro de su propio `<Suspense>` en
   *  `src/app/page.tsx`). `slotTusPlanes` solo se pinta con sesión (OL-219: sin cuenta, ese carril no existe, no
   *  colapsa vacío). */
  slotTusPlanes: React.ReactNode;
  slotEstelar: React.ReactNode;
  slotEstaSemana: React.ReactNode;
  /** «Festivales y exposiciones» (OL-342; antes «Para visitar», OL-322, solo las exposiciones), después de «Esta semana». */
  slotFestivales: React.ReactNode;
  slotNuevos: React.ReactNode;
  slotLugaresSemana: React.ReactNode;
  slotArtistasSemana: React.ReactNode;
  slotArtistasDestacados: React.ReactNode;
  slotMasAdelante: React.ReactNode;
};

/**
 * Inicio (docs/rediseno/41, tercera vuelta OL-219; doc 50, P5): solo carriles — Tus planes, Destacados, Esta semana, Festivales y
 * exposiciones (OL-342: los festivales y las exposiciones vigentes juntos, por cercanía; antes «Para visitar», OL-322, solo las
 * exposiciones), Nuevos eventos, Más adelante cuando los anteriores están vacíos, Lugares con eventos esta semana, Artistas destacadxs y
 * Artistas con eventos esta semana, cada uno con su título a la izquierda y, a la derecha, el
 * enlace que dice a dónde lleva — bajo la fila de contexto de las pantallas de eventos (`FilaEventos`: ciudad, Cuándo y
 * Filtros). Cuándo y Filtros no filtran a Inicio: al aplicarlos llevan a Agenda con eso puesto. Carga progresiva (pedido
 * del founder tras probar en producción): esta pantalla ya no espera ninguna consulta antes de pintar; cada carril llega
 * por su cuenta (streaming del App Router, cada uno en su `<Suspense>`) y un esqueleto del tamaño exacto
 * (`CarrilEsqueleto`) ocupa su lugar mientras tanto. Un carril vacío colapsa sin salto (`Destacados.module.css`,
 * `.vacio`). La lupa de la barra de la app lleva a Buscar (`app/buscar`), la misma desde toda la app. Todos los carriles comparten un solo aviso/pregunta de avisos (`PantallaConAviso`, la misma
 * pieza que ya usan las fichas): el de más abajo se pinta una sola vez, para toda la pantalla, aunque cada carril tenga
 * su propio botón.
 *
 * Ya no hay invitación a crear cuenta (founder, 2026-09-25, OL-219: «dejemos de presentar el callout que invita a
 * crear cuenta en inicio»): y la barra tampoco lleva «Entrar» (founder, 2026-09-29): el acceso se ofrece al entrar a Perfil y al
 * seguir o marcar «Voy», sin bloquear nada delante del contenido de eventos, lugares y artistas.
 */
export default function Inicio({ ciudad, ciudades, hoy, zona, agenda, conSesion, slotTusPlanes, slotEstelar, slotEstaSemana, slotFestivales, slotNuevos, slotLugaresSemana, slotArtistasSemana, slotArtistasDestacados, slotMasAdelante }: Props) {
  const router = useRouter();
  const esCiudadInicial = ciudad.slug === CIUDAD_INICIAL.slug;

  return (
    <PantallaConAviso>
      <CarrilesDeInicio conSesion={conSesion}>
        <Cabecera
          contexto={
            <FilaEventos
              ciudad={ciudad}
              ciudades={ciudades}
              hrefDeCiudad={(c) => `/${c.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${c.slug}`}`}
              hoy={hoy}
              zona={zona}
              agenda={agenda}
              conSesion={conSesion}
              valor={SIN_FILTROS}
              onCambiar={(valor) => router.push(hrefAgenda(valor, esCiudadInicial ? null : ciudad.slug))}
            />
          }
        />
        {/* Orden firmado (doc 41, tercera vuelta): eventos siempre antes que lugares y artistas. "Tus planes"
            solo con sesión — sin ella, ni se pinta un carril colapsado (a diferencia de los demás, que sí
            existen vacíos): el componente entero se omite. */}
        {conSesion && <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotTusPlanes}</Suspense>}
        <Suspense fallback={<CarrilEsqueleto tamano="grande" />}>{slotEstelar}</Suspense>
        <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotEstaSemana}</Suspense>
        {/* OL-347: «Festivales y exposiciones» va con la tarjeta grande de «Destacados» (founder, 2026-10-08); el esqueleto
            cambia con él para no saltar cuando llega la respuesta real. */}
        <Suspense fallback={<CarrilEsqueleto tamano="grande" />}>{slotFestivales}</Suspense>
        <Suspense fallback={<CarrilEsqueleto tamano="mediana" />}>{slotNuevos}</Suspense>
        <Suspense fallback={null}>{slotMasAdelante}</Suspense>
        <Suspense fallback={<CarrilEsqueleto tamano="chica" />}>{slotLugaresSemana}</Suspense>
        {/* OL-165: «Artistas destacadxs» pasó a grande (misma tarjeta que la tira de Artistas); el esqueleto
            cambia con él para no saltar cuando llega la respuesta real. */}
        <Suspense fallback={<CarrilEsqueleto tamano="grande" />}>{slotArtistasDestacados}</Suspense>
        {/* OL-253: va después de los destacados porque no los repite (`app/page.tsx`). */}
        <Suspense fallback={<CarrilEsqueleto tamano="chica" />}>{slotArtistasSemana}</Suspense>
        <InicioVacio ciudad={ciudad.nombre} />
      </CarrilesDeInicio>
    </PantallaConAviso>
  );
}

function InicioVacio({ ciudad }: { ciudad: string }) {
  const { vacio } = useEstadoCarriles();
  return vacio ? <Vacio titulo="Próximos días" texto={`Aún no hay eventos próximos en ${ciudad}. Si sabes de uno, publícalo.`} /> : null;
}
