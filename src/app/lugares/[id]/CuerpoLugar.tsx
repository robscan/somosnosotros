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
import { EsqueletoDato, EsqueletoRenglones } from "@/components/ui/Esqueleto";
import { IconoCalendario, IconoCompartir, IconoPersonas, IconoPin, IconoRuta } from "@/components/ui/Iconos";
import IconoRed from "@/components/ui/IconoRed";
import Salto from "@/components/ui/Salto";
import ficha from "@/components/ui/Ficha.module.css";
import styles from "@/components/ui/FichaLista.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import type { EventoAgenda } from "@/lib/agenda";
import { enmascararCorreo } from "@/lib/comunidad";
import { puedeDestacarse } from "@/lib/destacados";
import { etiquetaEnlace, normalizarRedes } from "@/lib/enlaces";
import { filtroSinPasar } from "@/lib/fechas";
import { repartoDeAcciones } from "@/lib/ficha";
import { esUuid } from "@/lib/formulario";
import { etiquetaTipo, hrefLugar, textoProximo, type Lugar } from "@/lib/lugares";
import { ORIGENES } from "@/lib/origen";
import { clienteServidor, usuarioActual, type Perfil } from "@/lib/supabase/servidor";
import { borrarLugar, cambiarSeguimiento, cambiarVisible } from "../acciones";
import EsMiEspacio from "./EsMiEspacio";

export const ORIGEN = "https://somosnosotros.org";

type LugarConAutor = Lugar & { autor: { id: string; nombre: string } | null };
type Actual = { correo: string | null; perfil: Perfil };

/** Lo que la ficha de un lugar necesita saber de quien mira, cargado una vez para su cuerpo, su menú y su barra de Seguir. */
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

// `cargarEventos` y cuántos siguen al lugar se piden de nuevo abajo (`MetaLugar` y `SeccionEventosLugar`, en
// `<Suspense>` separados): `cache()` de React las memoiza por argumento para que sea una sola consulta por petición
// (OL-161, bitácora 196; mismo patrón que `cargarLigadas` en la ficha de artista).
const cargarEventosCache = cache(cargarEventos);
const cargarSeguidoresLugarCache = cache(async (lugarId: string): Promise<number> => {
  const supabase = await clienteServidor();
  const { data } = (await supabase?.rpc("cuenta_seguidores", { p_lugar: lugarId })) ?? { data: 0 };
  return Number(data ?? 0);
});

/**
 * Cuántos siguen al lugar y su próximo evento: los dos renglones de `<ul className={ficha.datos}>` que piden una
 * consulta aparte de la del lugar (OL-161). Se difieren en `<Suspense>`, con un renglón de esqueleto del mismo alto
 * mientras llegan; la cabecera (foto, nombre, dirección) no los espera.
 */
async function MetaLugar({ lugar }: { lugar: LugarConAutor }) {
  const [seguidores, eventos] = await Promise.all([cargarSeguidoresLugarCache(lugar.id), cargarEventosCache(lugar)]);
  return seguidores === 0 && !eventos[0] ? (
    <li className={renglon.dato}>
      <IconoCalendario width={20} height={20} />
      <small>Sin eventos próximos · Nadie lo sigue todavía</small>
    </li>
  ) : (
    <>
      <li className={renglon.dato}>
        <IconoPersonas width={20} height={20} />
        <b>{seguidores === 0 ? "Nadie lo sigue todavía" : seguidores === 1 ? "1 persona lo sigue" : `${seguidores} personas lo siguen`}</b>
      </li>
      <li className={renglon.dato}>
        <IconoCalendario width={20} height={20} />
        <b>{eventos[0] ? textoProximo(eventos[0]) : "Sin eventos próximos"}</b>
        {eventos[0] && <Salto destino="eventos">ver</Salto>}
      </li>
    </>
  );
}

/** "Próximos eventos" entero: la misma consulta que `MetaLugar`, memoizada por `cache()`, más quién decidió qué. */
async function SeccionEventosLugar({ lugar, actual, hrefPublicarAqui }: { lugar: LugarConAutor; actual: Actual | null; hrefPublicarAqui: string }) {
  const eventos = await cargarEventosCache(lugar);
  const decididas = await decididasDe(actual?.perfil.id ?? null, eventos.map((e) => e.id));
  return (
    <section className={styles.lista} id="eventos" aria-label="Próximos eventos">
      <h2>
        Próximos eventos
        {eventos.length > 0 && <span> · {eventos.length}</span>}
      </h2>
      {eventos.length === 0 && <p className={styles.vacio}>Aún no hay eventos aquí. ¿Organizas algo? Publícalo.</p>}
      <EventosPorDia eventos={eventos} sinSitio decididas={decididas} avisos={avisosParaListas(actual)} />
      <Boton href={hrefPublicarAqui} variante="secundario" className={styles.publicar}>
        Publicar un evento aquí
      </Boton>
    </section>
  );
}

/** Fallback de `SeccionEventosLugar`: el título fijo (sin el conteo, que sí espera la consulta) y renglones grises. */
function EsqueletoSeccionEventos() {
  return (
    <section className={styles.lista} id="eventos" aria-label="Próximos eventos" aria-hidden="true">
      <h2>Próximos eventos</h2>
      <EsqueletoRenglones cantidad={3} redonda />
    </section>
  );
}

/**
 * El cuerpo de la ficha de un lugar, de sus datos a su autor: lo mismo a pantalla completa (`page.tsx`, que pone encima su
 * portada y su título) y dentro de la hoja de Lugares (`HojaLugares`, que pone su héroe y su cabecera). No incluye la barra
 * de Seguir (`SeguirLugar`) ni el menú «···» (`OpcionesLugar`): cada sitio los coloca a su manera.
 */
export default function CuerpoLugar({ f: { lugar, actual, puedeEditar } }: { f: FichaLugar }) {
  const redes = normalizarRedes(lugar.redes);
  const url = `${ORIGEN}${hrefLugar(lugar)}`;
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lng}`;
  // Compartir no sirve en un lugar privado: el enlace no le abre a nadie más que a su autor y a la administración
  // (founder, 2026-09-24, OL-179: «esconde si no sirve botón de compartir»). Cómo llegar se queda.
  const reparto = repartoDeAcciones((lugar.privado ? 1 : 2) + redes.length);
  const claseReparto = reparto === "repartidas" ? ficha.accionesRepartidas : reparto === "carril" ? ficha.accionesCarril : "";
  const hrefPublicarAqui = actual ? `/eventos/nuevo?lugar=${lugar.id}` : `/entrar?siguiente=${encodeURIComponent(`/eventos/nuevo?lugar=${lugar.id}`)}`;

  return (
    <>
      <ul className={ficha.datos}>
        <li className={renglon.dato}>
          <IconoPin width={20} height={20} />
          <b>{lugar.direccion ?? "Sin dirección"}</b>
        </li>
        <Suspense fallback={<EsqueletoDato />}>
          <MetaLugar lugar={lugar} />
        </Suspense>
      </ul>

      {/* Los accionables van arriba del mapa (founder, OL-225, 2026-09-26: "así se ven mas"). */}
      <div className={`${ficha.acciones} ${claseReparto}`}>
        <a href={comoLlegar} className={ficha.accion} target="_blank" rel="noopener noreferrer">
          <span className={CIRCULO}>
            <IconoRuta />
          </span>
          Cómo llegar
        </a>
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

      <MapaFicha punto={{ lat: lugar.lat, lng: lugar.lng }} href={comoLlegar} alt={lugar.nombre} />

      {lugar.descripcion && <Desplegable texto={lugar.descripcion} />}

      <Suspense fallback={<EsqueletoSeccionEventos />}>
        <SeccionEventosLugar lugar={lugar} actual={actual} hrefPublicarAqui={hrefPublicarAqui} />
      </Suspense>

      {/* Sin pie de origen para las fichas del catálogo (decisión del founder, 2026-09-14): solo se dice quién la publicó cuando hay quién. */}
      {!(lugar.origen && !lugar.autor) && (
        <p className={ficha.autor}>Publicado por {lugar.autor ? <Link href={`/personas/${lugar.autor.id}`}>{lugar.autor.nombre}</Link> : "una cuenta borrada"}.</p>
      )}
      {/* Quien lleva el espacio de verdad puede pedir la ficha: al final, discreto y solo con sesión (sin sesión
          no se ofrece, para no invitar a reclamos ajenos). El origen se dice dentro de la hoja, no en la ficha. */}
      {actual && !puedeEditar && <EsMiEspacio lugarId={lugar.id} nombre={lugar.nombre} correo={correoDe(actual)} origen={lugar.origen ? ORIGENES[lugar.origen].nombre : undefined} />}
    </>
  );
}

/** La barra de Seguir de la ficha: «Seguir» lleno a lo ancho y, ya seguido, «Sigues» con su promesa. */
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
      avisosCorreo={actual?.perfil.avisos_correo ?? false}
      correo={correoDe(actual)}
      llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
    />
  );
}

/** Lo secundario de la ficha, dentro de su menú «···»: editar, destacar, ocultar, reportar y borrar, según quién mira. */
export function OpcionesLugar({ f: { lugar, actual, esAdmin, puedeEditar, puedeBorrar, destacable } }: { f: FichaLugar }) {
  // Sin el conteo (diferido) el aviso de borrar ya no dice cuántos eventos tiene: el menú de administración sigue
  // en el HTML inicial y no puede esperar esa consulta aparte.
  const avisoBorrar = "Se borra el lugar, con sus eventos (próximos y pasados).";
  return (
    <>
      {puedeEditar && (
        <li>
          <Link href={`${hrefLugar(lugar)}/editar`} className={ficha.menuItem}>
            Editar
          </Link>
        </li>
      )}
      {destacable && <DestacarFicha tipo="lugar" id={lugar.id} {...destacable} />}
      {esAdmin && (
        <li>
          <form action={cambiarVisible.bind(null, lugar.id, !lugar.visible)}>
            <button type="submit" className={ficha.menuItem}>
              {lugar.visible ? "Ocultar del mapa" : "Volver a mostrar"}
            </button>
          </form>
        </li>
      )}
      <li className={ficha.menuItem}>
        <Reportar tipo="lugar" objetoId={lugar.id} volver={hrefLugar(lugar)} conSesion={!!actual} />
      </li>
      {puedeBorrar && (
        <li className={ficha.menuItem}>
          <Borrar que="el lugar" icono="lugar" aviso={avisoBorrar} accion={borrarLugar.bind(null, lugar.id)} />
        </li>
      )}
    </>
  );
}
