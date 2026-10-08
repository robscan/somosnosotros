import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { decididasDe } from "@/app/eventos/decididas";
import EventosPorDia from "@/components/EventosPorDia";
import MapaFicha from "@/components/MapaFicha";
import BarraFicha from "@/components/ui/BarraFicha";
import Ficha, { CIRCULO } from "@/components/ui/Ficha";
import ficha from "@/components/ui/Ficha.module.css";
import Heroe from "@/components/ui/Heroe";
import { IconoMas, IconoPin, IconoRuta } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import type { EventoAgenda } from "@/lib/agenda";
import { enlaceAltaLugar } from "@/lib/armazon";
import { slugDeCiudad } from "@/lib/ciudad";
import { enlaceComoLlegar } from "@/lib/eventos";
import { filtroSinPasar } from "@/lib/fechas";
import { ERROR_FICHA } from "@/lib/leerFicha";
import { partesDeDireccion } from "@/lib/lugares";
import { sedesDeFestival, type ActoConSitio, type Sede } from "@/lib/sedesFestival";
import { eventosDelSitio } from "@/lib/sitios";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

type Params = { params: Promise<{ slug: string }> };
type EventoDelSitio = Omit<EventoAgenda, "lugar" | "van"> & ActoConSitio & { ciudad: string | null };
type Sitio = { sede: Sede & { punto: { lat: number; lng: number } }; ciudad: string | null; eventos: EventoAgenda[] };

/** Lo que se pide de cada evento: lo del renglón de la agenda y lo que dice dónde es (el sitio, su punto y su ciudad). */
const COLUMNAS = "id, slug, titulo, inicio, fin, zona, imagen, precio, clase, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, ciudad, creado_en";

/**
 * El sitio de ese slug, armado al vuelo con los eventos visibles y por venir que lo nombran (OL-348, `lib/sitios`): su nombre, su dirección y
 * su punto salen de ellos como las sedes de un festival (`sedesDeFestival`), y cada evento va con cuántos van, listo para el renglón de la
 * agenda. Sin ninguno (o sin punto: los antiguos que no lo tienen), null y la ficha no existe. La consulta trae los sitios fuera del directorio
 * por venir (el slug no se puede filtrar en la base, que no sabe quitar acentos por la API) con un tope de sobra contra el corte silencioso de
 * PostgREST; `cache()` la pide una vez para las etiquetas y la página.
 */
const cargarSitio = cache(async (slug: string): Promise<Sitio | null> => {
  const supabase = await clienteServidor();
  if (!supabase) {
    console.warn("[ficha] cliente no disponible: sitio");
    throw new Error(ERROR_FICHA);
  }
  const { data, error } = await supabase
    .from("eventos")
    .select(COLUMNAS)
    .is("lugar_id", null)
    .eq("sitio_reservado", false)
    .not("sitio_texto", "is", null)
    .eq("visible", true)
    .or(filtroSinPasar())
    .order("inicio")
    .order("titulo")
    .order("id")
    .limit(2000);
  if (error) throw new Error(ERROR_FICHA);
  const filas = eventosDelSitio((data ?? []) as unknown as EventoDelSitio[], slug);
  const [sede] = sedesDeFestival(filas);
  if (!sede?.punto) return null;
  // Solo se cuenta, no se muestra quién (como en la ficha de un lugar).
  const { data: van } = await supabase.rpc("van_por_evento", { ids: filas.map((f) => f.id) });
  const cuantos = new Map(((van ?? []) as { evento_id: string; n: number }[]).map((v) => [v.evento_id, Number(v.n)]));
  return {
    sede: { ...sede, punto: sede.punto },
    ciudad: filas.find((f) => f.ciudad)?.ciudad ?? null,
    eventos: filas.map((f) => ({ ...f, lugar: null, van: cuantos.get(f.id) ?? 0 })),
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
 * ahí a cómo llegar»): la de un lugar con menos bloques. Su nombre sobre el símbolo SN; las acciones «Cómo llegar» y, con sesión, «Agregar al
 * directorio» (el alta de lugar con su nombre y su punto ya puestos); los eventos que pasan ahí; y «Dónde», con su mapa y su dirección si algún
 * evento la dice. Sin texto propio: todo lo que dice ya lo dicen las fichas de lugar.
 */
export default async function FichaSitio({ params }: Params) {
  const { slug } = await params;
  const [sitio, actual] = await Promise.all([cargarSitio(slug), usuarioActual()]);
  if (!sitio) notFound();
  const { sede, ciudad, eventos } = sitio;
  const comoLlegar = enlaceComoLlegar({ lugar: sede.punto, sitioReservado: false, sitioLat: null, sitioLng: null, privado: null });
  // El alta de lugar abre con su nombre y lo ubica en el mapa con su punto («¿Es aquí?»); la ciudad acerca la búsqueda. Los eventos que lo
  // nombran no se religan solos al lugar nuevo (pendiente, bitácora 377).
  const agregar = enlaceAltaLugar({ nombre: sede.nombre, lat: sede.punto.lat.toFixed(6), lng: sede.punto.lng.toFixed(6), ciudad: ciudad ? slugDeCiudad(ciudad) : null });
  const decididas = await decididasDe(actual?.perfil.id ?? null, eventos.map((e) => e.id));
  const { calle, resto } = partesDeDireccion(sede.direccion);

  return (
    <Ficha portada={null}>
      <BarraFicha volver={{ href: "/lugares", texto: "Lugares" }} titulo={sede.nombre} />
      <Heroe portada={null} alt={`Portada de ${sede.nombre}`} titulo={sede.nombre} />

      <div className={ficha.cuerpo} data-cuerpo>
        <div className={ficha.acciones}>
          {comoLlegar && (
            <a href={comoLlegar} className={ficha.accion} target="_blank" rel="noopener noreferrer">
              <span className={CIRCULO}>
                <IconoRuta />
              </span>
              Cómo llegar
            </a>
          )}
          {actual && (
            <Link href={agregar} className={ficha.accion}>
              <span className={CIRCULO}>
                <IconoMas />
              </span>
              <span className={ficha.accionEtiqueta}>Agregar al directorio</span>
            </Link>
          )}
        </div>

        <section className={ficha.bloque} id="eventos" aria-label="Próximos eventos">
          <h2>
            Próximos eventos<span className={ficha.cuenta}> · {eventos.length}</span>
          </h2>
          <EventosPorDia eventos={eventos} sinSitio decididas={decididas} avisos={avisosParaListas(actual)} />
        </section>

        <section className={ficha.tarjeta}>
          <h2>Dónde</h2>
          <MapaFicha punto={sede.punto} href={comoLlegar} alt={sede.nombre} />
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
