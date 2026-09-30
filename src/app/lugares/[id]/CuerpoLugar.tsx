import { cache, Suspense } from "react";
import Link from "next/link";
import { cargarDestacado } from "@/app/admin/consultas";
import DestacarFicha from "@/app/admin/DestacarFicha";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { decididasDe } from "@/app/eventos/decididas";
import Borrar from "@/components/Borrar";
import BotonCompartir from "@/components/BotonCompartir";
import Desplegable from "@/components/Desplegable";
import EventosPorDia from "@/components/EventosPorDia";
import MapaFicha from "@/components/MapaFicha";
import Reportar from "@/components/Reportar";
import Seguir from "@/components/Seguir";
import Boton from "@/components/ui/Boton";
import { claseBotonIcono } from "@/components/ui/BotonIcono";
import EnlaceExterno from "@/components/ui/EnlaceExterno";
import { EsqueletoKpi, EsqueletoRenglones } from "@/components/ui/Esqueleto";
import { IconoCalendario, IconoChevronDerecha, IconoCompartir, IconoLapiz, IconoOjo, IconoOjoTachado, IconoPersonas, IconoPin, IconoRuta } from "@/components/ui/Iconos";
import IconoRed from "@/components/ui/IconoRed";
import { Kpi, Kpis } from "@/components/ui/Kpi";
import ficha from "@/components/ui/Ficha.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import type { EventoAgenda } from "@/lib/agenda";
import { enmascararCorreo } from "@/lib/comunidad";
import { puedeDestacarse } from "@/lib/destacados";
import { etiquetaEnlace, normalizarRedes } from "@/lib/enlaces";
import { kpiProximos } from "@/lib/ficha";
import { filtroSinPasar } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { etiquetaTipo, hrefLugar, partesDeDireccion, type Lugar } from "@/lib/lugares";
import { ORIGENES } from "@/lib/origen";
import { clienteServidor, usuarioActual, type Perfil } from "@/lib/supabase/servidor";
import { borrarLugar, cambiarSeguimiento, cambiarVisible } from "../acciones";
import EsMiEspacio from "./EsMiEspacio";
import KpiDistancia from "./KpiDistancia";

export const ORIGEN = "https://somosnosotros.org";

type LugarConAutor = Lugar & { autor: { id: string; nombre: string } | null };
type Actual = { correo: string | null; perfil: Perfil };

/** Lo que la ficha de un lugar necesita saber de quien mira, cargado una vez para su cuerpo, su menú y su pastilla de Seguir. */
export type FichaLugar = {
  lugar: LugarConAutor;
  actual: Actual | null;
  /** Ya lo sigue quien mira. */
  sigo: boolean;
  esAdmin: boolean;
  /** Edita el autor, la cuenta ligada («¿Es tu espacio?», atendido por el administrador) o el administrador. */
  puedeEditar: boolean;
  /** Borrar es del autor y del administrador (la política de la base lo exige). */
  puedeBorrar: boolean;
  destacable: Awaited<ReturnType<typeof cargarDestacado>> | null;
};

/** El círculo de cada acción (ui/BotonIcono). */
const CIRCULO = claseBotonIcono({ tamano: "grande", relieve: "elevado" });

/** El correo de quien mira, enmascarado, para las confirmaciones (la de «¿Es tu espacio?» y la de los avisos de Seguir). */
const correoDe = (actual: Actual | null) => (actual?.correo ? enmascararCorreo(actual.correo) : "tu correo");

/**
 * Se busca por slug (la dirección de hoy) y, si no aparece nada, por UUID (la dirección vieja, para que siga
 * resolviendo). Mismo criterio que artistas (OL-114).
 */
export async function cargarLugar(idOSlug: string): Promise<LugarConAutor | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const columnas = "id, slug, nombre, tipo, direccion, lat, lng, portada, descripcion, ciudad, redes, creado_por, visible, privado, origen, autor:perfiles!lugares_creado_por_fkey(id, nombre)";
  const porSlug = await supabase.from("lugares").select(columnas).eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("lugares").select(columnas).eq("id", idOSlug).maybeSingle()).data : null);
  if (!data) return null;
  const autor = Array.isArray(data.autor) ? (data.autor[0] ?? null) : data.autor;
  return { ...(data as unknown as Lugar), autor: autor as LugarConAutor["autor"] };
}

/**
 * El lugar y lo que decide qué puede hacer quien mira (seguirlo, editarlo, borrarlo, destacarlo). Cuántos lo siguen y sus
 * eventos próximos son consultas aparte, diferidas en `<Suspense>` (OL-161, bitácora 196: `MetaLugar` y
 * `SeccionEventosLugar`, memoizadas con `cache()` para pedirse una sola vez). Sirve a la ficha a pantalla completa y a la
 * que se abre dentro de la hoja de Lugares (`../fichaEnHoja.tsx`); null si no existe (o quien mira no puede verlo).
 */
export async function cargarFicha(idOSlug: string): Promise<FichaLugar | null> {
  const [lugar, actual] = await Promise.all([cargarLugar(idOSlug), usuarioActual()]);
  if (!lugar) return null;
  const supabase = await clienteServidor();
  const [mio, lig] = await Promise.all([
    actual && supabase ? supabase.from("seguimientos").select("usuario_id").eq("lugar_id", lugar.id).eq("usuario_id", actual.perfil.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase?.from("lugares_cuentas").select("perfil_id").eq("lugar_id", lugar.id) ?? Promise.resolve({ data: [] as { perfil_id: string }[] }),
  ]);
  const ligados = (lig.data ?? []) as { perfil_id: string }[];
  const esAdmin = actual?.perfil.rol === "admin";
  const esAutor = !!actual && actual.perfil.id === lugar.creado_por;
  const estaLigado = !!actual && ligados.some((l) => l.perfil_id === actual.perfil.id);
  return {
    lugar,
    actual,
    sigo: !!mio.data,
    esAdmin,
    puedeEditar: esAdmin || esAutor || estaLigado,
    puedeBorrar: esAdmin || esAutor,
    destacable: esAdmin && puedeDestacarse(lugar) ? await cargarDestacado("lugar", lugar.id) : null,
  };
}

/** Los eventos próximos del lugar, con cuántos van, listos para el renglón de la agenda. */
async function cargarEventos(lugar: Lugar): Promise<EventoAgenda[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase.from("eventos").select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en").eq("lugar_id", lugar.id).eq("visible", true).or(filtroSinPasar()).order("inicio").order("titulo").order("id").limit(30);
  const filas = (data ?? []) as Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng">[];
  if (filas.length === 0) return [];
  // Solo se cuenta, no se muestra quién; tope de sobra contra el corte silencioso de PostgREST.
  const { data: a } = await supabase
    .from("asistencias")
    .select("evento_id")
    .eq("estado", "voy")
    .in(
      "evento_id",
      filas.map((f) => f.id),
    )
    .limit(2000);
  const van = new Map<string, number>();
  for (const f of a ?? []) van.set(f.evento_id as string, (van.get(f.evento_id as string) ?? 0) + 1);
  return filas.map((f) => ({ ...f, lugar: { nombre: lugar.nombre, portada: lugar.portada }, lat: lugar.lat, lng: lugar.lng, van: van.get(f.id) ?? 0 }));
}

// `cargarEventos` y cuántos siguen al lugar se piden de nuevo abajo (`KpisLugar` y `SeccionEventosLugar`, en
// `<Suspense>` separados): `cache()` de React las memoiza por argumento para que sea una sola consulta por petición
// (OL-161, bitácora 196; mismo patrón que `cargarLigadas` en la ficha de artista).
const cargarEventosCache = cache(cargarEventos);
const cargarSeguidoresLugarCache = cache(async (lugarId: string): Promise<number> => {
  const supabase = await clienteServidor();
  const { data } = (await supabase?.rpc("cuenta_seguidores", { p_lugar: lugarId })) ?? { data: 0 };
  return Number(data ?? 0);
});

/**
 * Cuántos eventos vienen y cuánta gente sigue al lugar: los otros dos números de la ficha (`ui/Kpi`; el primero, la distancia, se
 * calcula en el teléfono). Piden una consulta aparte de la del lugar (OL-161), así que van en `<Suspense>`, con dos tarjetas de
 * esqueleto del mismo alto mientras llegan; la cabecera (foto, nombre, tipo) no las espera.
 */
async function KpisLugar({ lugar }: { lugar: LugarConAutor }) {
  const [seguidores, eventos] = await Promise.all([cargarSeguidoresLugarCache(lugar.id), cargarEventosCache(lugar)]);
  return (
    <>
      <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta="Eventos" valor={kpiProximos(eventos.length)} salto={eventos.length > 0 ? "eventos" : undefined} />
      <Kpi icono={<IconoPersonas width={16} height={16} />} etiqueta="Siguen" valor={seguidores} />
    </>
  );
}

/** "Próximos eventos" entero: la misma consulta que `KpisLugar`, memoizada por `cache()`, más quién decidió qué. */
async function SeccionEventosLugar({ lugar, actual, hrefPublicarAqui }: { lugar: LugarConAutor; actual: Actual | null; hrefPublicarAqui: string }) {
  const eventos = await cargarEventosCache(lugar);
  const decididas = await decididasDe(actual?.perfil.id ?? null, eventos.map((e) => e.id));
  return (
    <section className={ficha.bloque} id="eventos" aria-label="Próximos eventos">
      <h2>
        Próximos eventos
        {eventos.length > 0 && <span className={ficha.cuenta}> · {eventos.length}</span>}
      </h2>
      {eventos.length === 0 && <p className={ficha.vacio}>Aún no hay eventos aquí. ¿Organizas algo? Publícalo.</p>}
      <EventosPorDia eventos={eventos} sinSitio decididas={decididas} avisos={avisosParaListas(actual)} />
      <Boton href={hrefPublicarAqui} variante="secundario">
        Publicar un evento aquí
      </Boton>
    </section>
  );
}

/** Fallback de `SeccionEventosLugar`: el título fijo (sin el conteo, que sí espera la consulta) y renglones grises. */
function EsqueletoSeccionEventos() {
  return (
    <section className={ficha.bloque} id="eventos" aria-label="Próximos eventos" aria-hidden="true">
      <h2>Próximos eventos</h2>
      <EsqueletoRenglones cantidad={3} redonda />
    </section>
  );
}

/**
 * El cuerpo de la ficha de un lugar (docs/rediseno/50, P6): sus tres números, las acciones, los próximos eventos, «Dónde» (el mapa y
 * la dirección, que lleva a la ruta), sobre el lugar y quién lo publicó. Lo mismo a pantalla completa (`page.tsx`, que pone encima su
 * barra y su héroe) y dentro de la hoja de Lugares (`FichaHoja`, que pone su cabecera y su héroe). No incluye la pastilla de Seguir
 * (`SeguirLugar`) ni el menú «···» (`OpcionesLugar`): cada sitio los coloca a su manera.
 */
export default function CuerpoLugar({ f: { lugar, actual, puedeEditar } }: { f: FichaLugar }) {
  const redes = normalizarRedes(lugar.redes);
  const url = `${ORIGEN}${hrefLugar(lugar)}`;
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lng}`;
  const publicarAqui = `/nuevo?lugar=${lugar.id}`;
  const hrefPublicarAqui = actual ? publicarAqui : `/entrar?siguiente=${encodeURIComponent(publicarAqui)}`;
  const { calle, resto } = partesDeDireccion(lugar.direccion);

  return (
    <div className={ficha.cuerpo} data-cuerpo>
      <Kpis>
        <KpiDistancia lat={lugar.lat} lng={lugar.lng} />
        <Suspense
          fallback={
            <>
              <EsqueletoKpi />
              <EsqueletoKpi />
            </>
          }
        >
          <KpisLugar lugar={lugar} />
        </Suspense>
      </Kpis>

      {/* Los accionables van arriba del mapa (founder, OL-225, 2026-09-26: "así se ven mas"). */}
      <div className={ficha.acciones}>
        <a href={comoLlegar} className={ficha.accion} target="_blank" rel="noopener noreferrer">
          <span className={CIRCULO}>
            <IconoRuta />
          </span>
          Cómo llegar
        </a>
        {/* Compartir no sirve en un lugar privado: el enlace no le abre a nadie más que a su autor y a la administración
            (founder, 2026-09-24, OL-179: «esconde si no sirve botón de compartir»). Cómo llegar se queda. */}
        {!lugar.privado && (
          <BotonCompartir titulo={lugar.nombre} texto={`${lugar.nombre} · ${etiquetaTipo(lugar.tipo)}${lugar.direccion ? ` · ${lugar.direccion}` : ""}`} url={url} className={ficha.accion}>
            <span className={CIRCULO}>
              <IconoCompartir />
            </span>
            Compartir
          </BotonCompartir>
        )}
        {redes.map((r) => (
          <EnlaceExterno key={r.url} href={r.url} className={ficha.accion}>
            <span className={CIRCULO}>
              <IconoRed red={r.red} />
            </span>
            {/* Título editable de hasta 30 caracteres (OL-168): a dos líneas con puntos suspensivos, nunca
                fuera de la pantalla (ficha.accionEtiqueta). */}
            <span className={ficha.accionEtiqueta}>{etiquetaEnlace(r)}</span>
          </EnlaceExterno>
        ))}
      </div>

      <Suspense fallback={<EsqueletoSeccionEventos />}>
        <SeccionEventosLugar lugar={lugar} actual={actual} hrefPublicarAqui={hrefPublicarAqui} />
      </Suspense>

      <section className={ficha.tarjeta}>
        <h2>Dónde</h2>
        <MapaFicha punto={{ lat: lugar.lat, lng: lugar.lng }} href={comoLlegar} alt={lugar.nombre} />
        <a href={comoLlegar} className={renglon.dato} target="_blank" rel="noopener noreferrer">
          <IconoPin width={20} height={20} />
          <b>{calle || "Sin dirección"}</b>
          {resto && <small>{resto}</small>}
          <IconoChevronDerecha />
        </a>
      </section>

      {lugar.descripcion && (
        <section className={ficha.bloque} aria-label="Sobre el lugar">
          <h2>Sobre el lugar</h2>
          <Desplegable texto={lugar.descripcion} />
        </section>
      )}

      {/* Sin pie de origen para las fichas del catálogo (decisión del founder, 2026-09-14): solo se dice quién la publicó cuando hay quién. */}
      {!(lugar.origen && !lugar.autor) && <p className={ficha.pie}>Publicado por {lugar.autor ? <Link href={`/personas/${lugar.autor.id}`}>{lugar.autor.nombre}</Link> : "una cuenta borrada"}</p>}
      {/* Quien lleva el espacio de verdad puede pedir la ficha: al final, discreto y solo con sesión (sin sesión
          no se ofrece, para no invitar a reclamos ajenos). El origen se dice dentro de la hoja, no en la ficha. */}
      {actual && !puedeEditar && <EsMiEspacio lugarId={lugar.id} nombre={lugar.nombre} correo={correoDe(actual)} origen={lugar.origen ? ORIGENES[lugar.origen].nombre : undefined} />}
    </div>
  );
}

/** La pastilla de Seguir de la ficha: «Seguir» y, ya seguido, «Sigues» en verde (`components/Seguir`). */
export function SeguirLugar({ f: { lugar, actual, sigo } }: { f: FichaLugar }) {
  return (
    <Seguir
      que="lugar"
      nombre={lugar.nombre}
      sigo={sigo}
      conSesion={!!actual}
      cuenta={actual?.perfil.id ?? ""}
      accion={cambiarSeguimiento.bind(null, lugar.id)}
      hrefEntrar={`${hrefLugar(lugar)}?accion=seguir`}
      avisosPreguntado={actual?.perfil.avisos_preguntado ?? true}
      correo={correoDe(actual)}
      llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
    />
  );
}

/** Lo secundario de la ficha, dentro de su menú «···»: editar, destacar, ocultar, reportar y borrar, según quien mira. Cada uno, una fila como las de Ajustes. */
export function OpcionesLugar({ f: { lugar, actual, esAdmin, puedeEditar, puedeBorrar, destacable } }: { f: FichaLugar }) {
  // Sin el conteo (diferido) el aviso de borrar ya no dice cuántos eventos tiene: el menú de administración sigue
  // en el HTML inicial y no puede esperar esa consulta aparte.
  const avisoBorrar = "Se borra el lugar, con sus eventos (próximos y pasados).";
  return (
    <>
      {puedeEditar && (
        <li>
          <Link href={`${hrefLugar(lugar)}/editar`} className={renglon.ajuste}>
            <IconoLapiz width={20} height={20} />
            <b>Editar</b>
          </Link>
        </li>
      )}
      {destacable && <DestacarFicha tipo="lugar" id={lugar.id} {...destacable} />}
      {esAdmin && (
        <li>
          <form action={cambiarVisible.bind(null, lugar.id, !lugar.visible)}>
            <button type="submit" className={renglon.ajuste}>
              {lugar.visible ? <IconoOjoTachado width={20} height={20} /> : <IconoOjo width={20} height={20} />}
              <b>{lugar.visible ? "Ocultar del mapa" : "Volver a mostrar"}</b>
            </button>
          </form>
        </li>
      )}
      <li>
        <Reportar tipo="lugar" objetoId={lugar.id} volver={hrefLugar(lugar)} conSesion={!!actual} />
      </li>
      {puedeBorrar && (
        <li>
          <Borrar fila que="el lugar" icono="lugar" aviso={avisoBorrar} accion={borrarLugar.bind(null, lugar.id)} />
        </li>
      )}
    </>
  );
}
