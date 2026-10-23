"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { hrefAgenda, SIN_FILTROS } from "@/lib/agenda";
import type { Agenda } from "@/lib/cargarAgenda";
import { enlaceAltaEvento } from "@/lib/armazon";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import CarrilEsqueleto from "./CarrilEsqueleto";
import FilaEventos from "./FilaEventos";
import Boton from "./ui/Boton";
import Cabecera from "./ui/Cabecera";
import { IconoMas } from "./ui/Iconos";
import comun from "./Lista.module.css";
import PantallaConAviso from "./useCanalDeListas";
import { CarrilesDeInicio, useEstadoCarriles } from "./inicio/EstadoCarriles";
import BannerCompartir from "./inicio/BannerCompartir";

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
  /** La fila de círculos «Ahora» (OL-359), bajo las dos barras y antes de los carriles; sin nada que mostrar no pinta nada. */
  slotAhora?: React.ReactNode;
  slotEstelar: React.ReactNode;
  slotEstaSemana: React.ReactNode;
  /** «Festivales y expos» (OL-342; antes «Para visitar», OL-322, solo las exposiciones), después de «Esta semana». */
  slotFestivales: React.ReactNode;
  slotNuevos: React.ReactNode;
  slotLugaresSemana: React.ReactNode;
  slotArtistasSemana: React.ReactNode;
  slotArtistasDestacados: React.ReactNode;
  slotMasAdelante: React.ReactNode;
};

/**
 * Inicio (docs/rediseno/41, tercera vuelta OL-219; doc 50, P5): solo carriles — Destacados (primero desde OL-382, D1), el banner para
 * compartir la app (OL-387; para todo el mundo desde OL-397; compartir no lo quita y la × solo hasta volver a abrir la app, OL-407), Tus planes, Esta semana, Festivales y
 * exposiciones (OL-342: los festivales y las exposiciones vigentes juntos, por cercanía; antes «Para visitar», OL-322, solo las
 * exposiciones), Nuevos eventos, Más adelante cuando los anteriores están vacíos, Lugares de la semana, Artistas destacadxs y
 * Artistas de la semana, cada uno con su título a la izquierda y, a la derecha, el
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
export default function Inicio({ ciudad, ciudades, hoy, zona, agenda, conSesion, slotAhora, slotTusPlanes, slotEstelar, slotEstaSemana, slotFestivales, slotNuevos, slotLugaresSemana, slotArtistasSemana, slotArtistasDestacados, slotMasAdelante }: Props) {
  const router = useRouter();
  const esCiudadInicial = ciudad.slug === CIUDAD_INICIAL.slug;

  return (
    <PantallaConAviso>
      <CarrilesDeInicio>
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
        {/* La fila «Ahora» (OL-359, prototipo firmado `barra-ahora.html`): en el flujo, se va al bajar. Sin esqueleto: si no hay nada, ni hueco. */}
        <Suspense fallback={null}>{slotAhora}</Suspense>
        {/* Orden firmado (doc 41, tercera vuelta): eventos siempre antes que lugares y artistas. "Tus planes"
            solo con sesión — sin ella, ni se pinta un carril colapsado (a diferencia de los demás, que sí
            existen vacíos): el componente entero se omite. */}
        {/* OL-382 (D1 y D2, firmados el 2026-10-12: «siempre en la primera línea», «como el de Instagram»): el carril estelar («Destacados» o
            «Seleccionados para ti») va primero, justo debajo de la fila «Ahora» y antes de «Tus planes», con la tarjeta XL. OL-370 (E5 firmado):
            tarjeta grande en Tus planes y Festivales y expos; mediana en Esta semana y Nuevos eventos. Cada esqueleto es del tamaño de su carril,
            para no saltar cuando llega la respuesta real. */}
        <Suspense fallback={<CarrilEsqueleto forma="xl" />}>{slotEstelar}</Suspense>
        {/* OL-387 (B1 y B2, firmados el 2026-10-12): el banner para compartir la app, justo tras el carril estelar y antes de «Tus planes»; solo con
            sesión y, de eso, solo desde la tercera visita (lo decide el teléfono tras el primer pintado: sin él, no ocupa nada). */}
        {/* Para todo el mundo, con o sin sesión (OL-397; antes solo con sesión, OL-387). Compartir no lo quita; la × lo esconde hasta la siguiente vez
            que se abre la app (OL-407). */}
        {/* OL-454 (firmado: «solo botón. iguala título de carril»): en una ciudad sin ningún evento próximo, el banner no sale y en su sitio va el
            llamado a publicar (`PublicarAqui`); con eventos, el banner de siempre. */}
        <BannerOLlamado ciudad={ciudad} zona={zona} />
        {conSesion && <Suspense fallback={<CarrilEsqueleto forma="grande" />}>{slotTusPlanes}</Suspense>}
        <Suspense fallback={<CarrilEsqueleto forma="mediana" />}>{slotEstaSemana}</Suspense>
        {/* OL-347: «Festivales y expos» va con la tarjeta grande de «Destacados» (founder, 2026-10-08). OL-375: todas con la portada del sistema,
            el título dentro: su esqueleto, sin el título debajo. */}
        <Suspense fallback={<CarrilEsqueleto forma="grande" tituloDentro />}>{slotFestivales}</Suspense>
        <Suspense fallback={<CarrilEsqueleto forma="mediana" />}>{slotNuevos}</Suspense>
        <Suspense fallback={null}>{slotMasAdelante}</Suspense>
        {/* OL-372 (E5 y E9 firmados): lugares y artistas de la semana en avatares (de 88 desde OL-382, N); «Artistas destacadxs» con la tarjeta mediana de un
            evento. Cada esqueleto mide lo que su carril. */}
        <Suspense fallback={<CarrilEsqueleto forma="avatar" />}>{slotLugaresSemana}</Suspense>
        <Suspense fallback={<CarrilEsqueleto forma="artista" />}>{slotArtistasDestacados}</Suspense>
        {/* OL-253: va después de los destacados porque no los repite (`app/page.tsx`). */}
        <Suspense fallback={<CarrilEsqueleto forma="avatar" />}>{slotArtistasSemana}</Suspense>
      </CarrilesDeInicio>
    </PantallaConAviso>
  );
}

/**
 * Tras el carril estelar, una sola de dos cosas, ya que se sabe si la ciudad tiene eventos (`useEstadoCarriles`, `ciudadSinEventos`: «Tus
 * planes» no cuenta): con eventos, el banner para compartir la app (OL-387, OL-397, OL-407); sin ninguno (OL-454), el llamado a publicar en su
 * sitio. Mientras no se sabe, nada: así ni el banner sale para irse ni el llamado entra tarde sobre él. El carril estelar va colapsado en una
 * ciudad sin eventos, así que el llamado queda arriba, y con sesión «Tus planes» debajo, en su orden firmado.
 */
function BannerOLlamado({ ciudad, zona }: { ciudad: Ciudad; zona: string }) {
  const { resuelto, vacio } = useEstadoCarriles();
  if (!resuelto) return null;
  return vacio ? <PublicarAqui ciudad={ciudad} /> : <BannerCompartir zona={zona} />;
}

/**
 * El llamado de una ciudad sin eventos (OL-454, prototipo firmado `inicio-vacio.html`, «solo botón»): el aviso de vacío de las listas (su título,
 * al tamaño del de los carriles, y su texto) y un solo `Boton` primario, «+ Publicar un evento», al alta de evento con la ciudad puesta. Su
 * nombre accesible es el texto (el «+» va oculto al lector, como todo `Icono…`); sin sesión, el alta pasa por Entrar y vuelve. Lugar y artista,
 * en el «+» de la barra. Sustituye al aviso que salía al final, en gris y sin acción («Si sabes de uno, publícalo.»).
 */
function PublicarAqui({ ciudad }: { ciudad: Ciudad }) {
  return (
    <div className={`${comun.vacio} ${comun.vacioInicio}`}>
      <h2>¿Sabes de algo que pase en {ciudad.nombre}?</h2>
      <p>Aún no hay eventos próximos aquí. Publica el primero.</p>
      <Boton href={enlaceAltaEvento({ ciudad: ciudad.slug })} prefetch={false}>
        <IconoMas width={20} height={20} />
        Publicar un evento
      </Boton>
    </div>
  );
}
