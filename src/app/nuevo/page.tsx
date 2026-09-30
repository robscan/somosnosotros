import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { crearArtista } from "@/app/artistas/acciones";
import { cargarMisArtistas, cargarQuien } from "@/app/artistas/consultas";
import { crearEvento, cupoDeCartel } from "@/app/eventos/acciones";
import { crearLugar } from "@/app/lugares/acciones";
import type { QuienItem } from "@/lib/artistas";
import { altaDeParametro, tituloDeAlta } from "@/lib/armazon";
import { lecturaDeCartelActiva } from "@/lib/cartel";
import { CIUDAD_INICIAL, ciudadPorSlug } from "@/lib/ciudad";
import { cargarCiudades, cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { ciudadDesdeSlug } from "@/lib/direccionContexto";
import type { Evento } from "@/lib/eventos";
import { esUuid } from "@/lib/formulario";
import type { LugarResumen } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { zonaDelSitio } from "@/lib/zona";
import Alta from "./Alta";

type Consulta = { tipo?: string; lugar?: string; desde?: string; artista?: string; ciudad?: string; nombre?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Consulta> }): Promise<Metadata> {
  const { tipo } = await searchParams;
  return { title: `${tituloDeAlta(altaDeParametro(tipo))} · Somos Nosotros`, robots: { index: false, follow: false } };
}

/**
 * Publicar (docs/rediseno/50, P9): la única pantalla de alta, con Evento, Lugar y Artista. El tipo con el que abre (`?tipo=`) es el
 * de la sección desde la que se tocó «+»; la ciudad que se veía (`?ciudad=`) acerca la búsqueda de dirección del evento y del lugar y
 * es la de entrada del artista (OL-100); `?nombre=` es lo que buscó quien no encontró nada (Buscar). Un evento ya armado —duplicado
 * (`?desde=`), o publicado desde la ficha de un lugar (`?lugar=`) o de un artista (`?artista=`)— abre solo como evento, sin tira de tipos.
 */
export default async function Nuevo({ searchParams }: { searchParams: Promise<Consulta> }) {
  const { tipo, lugar, desde, artista, ciudad: ciudadSlug, nombre } = await searchParams;
  const actual = await usuarioActual();
  // Con o sin sesión se llega aquí; la sesión se pide después, con lo mismo por delante.
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ tipo, lugar, desde, artista, ciudad: ciudadSlug, nombre })) if (valor) consulta.set(clave, valor);
  const aqui = `/nuevo${consulta.size ? `?${consulta}` : ""}`;
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(aqui)}`);
  const eventoArmado = !!(desde || lugar || artista);
  const tipoInicial = eventoArmado ? "evento" : altaDeParametro(tipo);
  const supabase = await clienteServidor();

  // Del evento ya armado: el evento que se duplica, con quién se presenta, o el artista desde cuya ficha se publica una fecha.
  async function cargarArmado(): Promise<{ base?: Partial<Evento>; quien?: QuienItem[] }> {
    if (desde && esUuid(desde)) {
      const { data } = (await supabase?.from("eventos").select("*").eq("id", desde).maybeSingle()) ?? { data: null };
      if (data) return { base: { ...(data as Evento), id: undefined, inicio: undefined, fin: undefined }, quien: await cargarQuien(desde) };
    }
    if (artista && esUuid(artista)) {
      const { data } = (await supabase?.from("artistas").select("id, nombre").eq("id", artista).maybeSingle()) ?? { data: null };
      if (data) return { quien: [{ id: data.id as string, nombre: data.nombre as string }] };
    }
    return {};
  }

  // `privado`: la política de lectura ya deja pasar los lugares privados de la propia cuenta (RLS), así que esta consulta -de por sí
  // solo suya, la sesión- también trae los suyos entre los registrados; «¿Dónde es?» los ofrece marcados «Privado» y elegirlos rellena
  // el evento como reservado (OL-179, founder 2026-09-24). El lugar los usa solo para avisar «ya existe» -nunca para elegirlos (OL-211).
  const [ciudades, { data: lugares }, { base, quien }, mios, cupo, ciudadesArtistas] = await Promise.all([
    cargarCiudades(),
    supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre") ?? { data: [] },
    cargarArmado(),
    cargarMisArtistas(actual.perfil.id),
    lecturaDeCartelActiva() ? cupoDeCartel() : null,
    eventoArmado ? [] : cargarCiudadesDeArtistas(),
  ]);
  const usuarioId = actual.perfil.id;
  const esAdmin = actual.perfil.rol === "admin";
  const lugaresRegistrados = (lugares ?? []) as LugarResumen[];
  const nombreInicial = nombre?.trim().slice(0, 80) || undefined;
  // Un artista no tiene punto del que deducir ciudad: de entrada, la que la persona tenía elegida en Artistas; se cambia en el renglón Ciudad.
  const ciudadArtista = ciudadPorSlug(ciudadSlug, ciudadesArtistas);
  return (
    <Alta
      tipoInicial={tipoInicial}
      salidas={{
        evento: { href: base?.lugar_id ? `/lugares/${base.lugar_id}` : lugar ? `/lugares/${lugar}` : artista ? `/artistas/${artista}` : "/", texto: "Volver" },
        lugar: { href: "/lugares", texto: "Lugares" },
        artista: { href: `/artistas${ciudadArtista.slug === CIUDAD_INICIAL.slug ? "" : `?ciudad=${ciudadArtista.slug}`}`, texto: "Artistas" },
      }}
      evento={{
        accion: crearEvento,
        lugares: lugaresRegistrados,
        lugarInicial: lugar,
        evento: base,
        zonaSitio: zonaDelSitio(base),
        modo: base ? "duplicar" : "alta",
        usuarioId,
        cartelActivo: lecturaDeCartelActiva(),
        quienInicial: quien,
        mios,
        esAdmin,
        volverA: aqui,
        cupo,
        // Un slug inventado o vacío cae en null (ciudadDesdeSlug), nunca en San Luis Potosí por respaldo silencioso (revisión del gestor, 2026-09-21).
        ciudadContexto: ciudadDesdeSlug(ciudadSlug, ciudades),
      }}
      lugar={
        eventoArmado
          ? undefined
          : {
              accion: crearLugar,
              usuarioId,
              nombreInicial,
              esAdmin,
              lugares: lugaresRegistrados,
              // Sin `?ciudad=` cae en San Luis Potosí -el respaldo que ya usa el listado de Lugares (`ciudadPorSlug`)-: sin él, Mapbox buscaba
              // en todo el país (corrección del gestor, revisión sobre el PR #249).
              ciudadContexto: ciudadPorSlug(ciudadSlug, ciudades),
            }
      }
      artista={eventoArmado ? undefined : { accion: crearArtista, usuarioId, nombreInicial, esAdmin, ciudadInicial: ciudadArtista.nombre, ciudades: ciudadesArtistas }}
    />
  );
}
