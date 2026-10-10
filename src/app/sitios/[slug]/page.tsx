import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { decididasDe } from "@/app/eventos/decididas";
import EventosPorDia from "@/components/EventosPorDia";
import MapaFicha from "@/components/MapaFicha";
import BarraFicha from "@/components/ui/BarraFicha";
import Ficha from "@/components/ui/Ficha";
import ficha from "@/components/ui/Ficha.module.css";
import Heroe from "@/components/ui/Heroe";
import { IconoPin } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import type { EventoAgenda } from "@/lib/agenda";
import { enlaceAltaLugar } from "@/lib/armazon";
import { slugDeCiudad } from "@/lib/ciudad";
import { enlaceComoLlegar } from "@/lib/eventos";
import { ERROR_FICHA } from "@/lib/leerFicha";
import { hrefLugar, partesDeDireccion } from "@/lib/lugares";
import { sedesDeFestival, type ActoConSitio, type Sede } from "@/lib/sedesFestival";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { ligarSitioALugar } from "../acciones";
import { eventosVigentesDelSitio } from "../sitio";
import AccionesSitio from "./AccionesSitio";

type Params = { params: Promise<{ slug: string }> };
type EventoDelSitio = Omit<EventoAgenda, "lugar" | "van"> & ActoConSitio & { ciudad: string | null; creado_por: string | null };
/** El lugar del directorio que es este sitio, si ya lo hay: su mismo nombre a menos de 150 m. */
type EnDirectorio = { id: string; slug: string | null };
type Sitio = { sede: Sede & { punto: { lat: number; lng: number } }; ciudad: string | null; eventos: EventoAgenda[]; enDirectorio: EnDirectorio | null };

/**
 * El sitio de ese slug, armado al vuelo con los eventos visibles y por venir que lo nombran (OL-348, `eventosVigentesDelSitio`): su nombre,
 * su dirección y su punto salen de ellos como las sedes de un festival (`sedesDeFestival`), y cada evento va con cuántos van, listo para el
 * renglón de la agenda. Sin ninguno (o sin punto: los antiguos que no lo tienen), null y la ficha no existe. Con él, el lugar del directorio
 * que ya lo representa (OL-366): `lugares_parecidos`, el mismo criterio con que el alta de lugar pregunta «¿Es este?» (su nombre sin acentos
 * ni signos, a menos de 150 m; solo lugares que se ven). `cache()` lo pide una vez para las etiquetas y la página.
 */
const cargarSitio = cache(async (slug: string): Promise<Sitio | null> => {
  const supabase = await clienteServidor();
  if (!supabase) {
    console.warn("[ficha] cliente no disponible: sitio");
    throw new Error(ERROR_FICHA);
  }
  const filas = await eventosVigentesDelSitio<EventoDelSitio>(supabase, slug);
  if (!filas) throw new Error(ERROR_FICHA);
  const [sede] = sedesDeFestival(filas);
  if (!sede?.punto) return null;
  const [{ data: van }, { data: parecidos }] = await Promise.all([
    // Solo se cuenta, no se muestra quién (como en la ficha de un lugar).
    supabase.rpc("van_por_evento", { ids: filas.map((f) => f.id) }),
    supabase.rpc("lugares_parecidos", { p_nombre: sede.nombre, p_lat: sede.punto.lat, p_lng: sede.punto.lng }),
  ]);
  const cuantos = new Map(((van ?? []) as { evento_id: string; n: number }[]).map((v) => [v.evento_id, Number(v.n)]));
  const [lugar] = Array.isArray(parecidos) ? (parecidos as EnDirectorio[]) : [];
  return {
    sede: { ...sede, punto: sede.punto },
    ciudad: filas.find((f) => f.ciudad)?.ciudad ?? null,
    eventos: filas.map((f) => ({ ...f, lugar: null, van: cuantos.get(f.id) ?? 0 })),
    enDirectorio: lugar?.id ? { id: lugar.id, slug: lugar.slug ?? null } : null,
  };
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const sitio = await cargarSitio(slug).catch(() => undefined);
  if (sitio === undefined) return {};
  // No se indexa: un sitio fuera del directorio no es una ficha del catálogo hasta que alguien lo agrega como lugar.
  const robots = { index: false, follow: false };
  if (!sitio) return { title: "Sitio · Somos Nosotros", robots };
  return { title: `${sitio.sede.nombre} · Somos Nosotros`, ...(sitio.sede.direccion ? { description: sitio.sede.direccion } : {}), robots };
}

/**
 * La ficha de un sitio fuera del directorio (OL-348; founder, 2026-10-08: «aunque el lugar no esté en catálogo se abra ficha incompleta y de
 * ahí a cómo llegar»): la de un lugar con menos bloques. Su nombre sobre el símbolo SN; las acciones (`AccionesSitio`): «Cómo llegar» y, con
 * sesión, «Agregar al directorio» (el alta de lugar con su nombre, su punto y su clave: al publicarse, sus eventos pasan al lugar, OL-366); si
 * el sitio ya tiene su lugar en el directorio, «Ver en el directorio» en su lugar y, para la administración, «Ligar sus eventos»; los eventos
 * que pasan ahí; y «Dónde», con su mapa y su dirección si algún evento la dice. Sin texto propio: todo lo que dice ya lo dicen las fichas de lugar.
 */
export default async function FichaSitio({ params }: Params) {
  const { slug } = await params;
  const [sitio, actual] = await Promise.all([cargarSitio(slug), usuarioActual()]);
  if (!sitio) notFound();
  const { sede, ciudad, eventos, enDirectorio } = sitio;
  const comoLlegar = enlaceComoLlegar({ lugar: sede.punto, sitioReservado: false, sitioLat: null, sitioLng: null, privado: null });
  // El alta de lugar abre con su nombre y lo ubica en el mapa con su punto («¿Es aquí?»); la ciudad acerca la búsqueda y la clave del sitio
  // viaja hasta publicar: sus eventos pasan al lugar nuevo (los de quien lo registra; todos, si es la administración).
  const agregar = enlaceAltaLugar({ nombre: sede.nombre, lat: sede.punto.lat.toFixed(6), lng: sede.punto.lng.toFixed(6), ciudad: ciudad ? slugDeCiudad(ciudad) : null, sitio: slug });
  const esAdmin = actual?.perfil.rol === "admin";
  const decididas = await decididasDe(actual?.perfil.id ?? null, eventos.map((e) => e.id));
  const { calle, resto } = partesDeDireccion(sede.direccion);

  return (
    <Ficha portada={null}>
      <BarraFicha volver={{ href: "/lugares", texto: "Lugares" }} titulo={sede.nombre} />
      <Heroe portada={null} alt={`Portada de ${sede.nombre}`} titulo={sede.nombre} />

      <div className={ficha.cuerpo} data-cuerpo>
        <AccionesSitio
          comoLlegar={comoLlegar}
          agregar={actual ? agregar : null}
          directorio={enDirectorio && hrefLugar(enDirectorio)}
          // Diferido: la ficha del sitio no se vuelve a pintar en la misma respuesta (sin sus eventos sería «Esto ya no está»).
          ligar={esAdmin && enDirectorio ? ligarSitioALugar.bind(null, slug, enDirectorio.id, true) : null}
        />

        <section className={ficha.bloque} id="eventos" aria-label="Próximos eventos">
          <h2>
            Próximos eventos<span className={ficha.cuenta}> · {eventos.length}</span>
          </h2>
          <EventosPorDia eventos={eventos} sinSitio decididas={decididas} avisos={avisosParaListas(actual)} />
        </section>

        <section className={ficha.tarjeta}>
          <h2>Dónde</h2>
          {/* Su pin lleva el día de su próximo evento; su tarjeta, sin ángulo (es esta ficha) y con «Cómo llegar» (OL-350). */}
          {comoLlegar && <MapaFicha sedes={[{ clave: sede.clave, nombre: sede.nombre, punto: sede.punto, meta: calle || null, href: null, comoLlegar, proximo: eventos[0] ? { inicio: eventos[0].inicio, zona: eventos[0].zona } : null }]} ficha="sitio" alt={sede.nombre} />}
          {/* La dirección es un dato, como en la ficha de un lugar: «Cómo llegar» está en las acciones. */}
          {calle && (
            <div className={renglon.dato}>
              <IconoPin width={20} height={20} />
              <b>{calle}</b>
              {resto && <small>{resto}</small>}
            </div>
          )}
        </section>
      </div>
    </Ficha>
  );
}
