import { cache, Suspense } from "react";
import { esUuid } from "@/lib/formulario";
import { cargarDestacado } from "@/app/admin/consultas";
import DestacarFicha from "@/app/admin/DestacarFicha";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import Borrar from "@/components/Borrar";
import BotonCompartir from "@/components/BotonCompartir";
import Cartel from "@/components/Cartel";
import CompartirFicha from "@/components/ui/CompartirFicha";
import VideoEmbed from "@/components/ui/VideoEmbed";
import { ORIGENES } from "@/lib/origen";
import { CAPO_SIN_RECLAMAR_EN_SITEMAP } from "@/lib/sitemap";
import Desplegable from "@/components/Desplegable";
import { EsqueletoBloqueTexto, EsqueletoRenglones } from "@/components/ui/Esqueleto";
import EventosPorDia from "@/components/EventosPorDia";
import Reportar from "@/components/Reportar";
import Seguir from "@/components/Seguir";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import EnlaceExterno from "@/components/ui/EnlaceExterno";
import { IconoCalendario, IconoPersonas, IconoPin } from "@/components/ui/Iconos";
import IconoRed from "@/components/ui/IconoRed";
import MenuAcciones from "@/components/ui/MenuAcciones";
import Salto from "@/components/ui/Salto";
import ficha from "@/components/ui/Ficha.module.css";
import type { EventoAgenda } from "@/lib/agenda";
import { etiquetaArtista, hrefArtista, textoProximaFecha, type Artista } from "@/lib/artistas";
import { enmascararCorreo } from "@/lib/comunidad";
import { puedeDestacarse } from "@/lib/destacados";
import { jsonLdArtista, jsonLdMigajas } from "@/lib/estructurados";
import { nombreSitio } from "@/lib/eventos";
import { filtroSinPasar } from "@/lib/fechas";
import { etiquetaEnlace, normalizarRedes } from "@/lib/enlaces";
import { repartoDeAcciones } from "@/lib/ficha";
import { qrDeUrl } from "@/lib/qr";
import { clienteServidor, usuarioActual, type Perfil } from "@/lib/supabase/servidor";
import { videoEmbedDe } from "@/lib/video";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { decididasDe } from "@/app/eventos/decididas";
import { borrarArtista, cambiarSeguimientoArtista, cambiarVisibleArtista } from "../acciones";
import EsMiNombre from "./EsMiNombre";
import styles from "@/components/ui/FichaLista.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string; accion?: string; error?: string }> };
type ArtistaConAutor = Artista & { autor: { id: string; nombre: string } | null };
type FilaEvento = Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng"> & { lugar: { nombre: string; portada: string | null; lat: number; lng: number } | { nombre: string; portada: string | null; lat: number; lng: number }[] | null };

const ORIGEN = "https://somosnosotros.org";

/**
 * Quién lleva la ficha (una fila por cuenta ligada). `generateMetadata` y la ficha necesitan la misma pregunta —
 * `cache()` de React la memoiza por petición para no pedirla dos veces por visita (gestión de cambios, OL-059).
 */
const cargarLigadas = cache(async (id: string): Promise<{ perfil_id: string }[]> => {
  const supabase = await clienteServidor();
  const { data } = (await supabase?.from("artistas_cuentas").select("perfil_id").eq("artista_id", id)) ?? { data: [] as { perfil_id: string }[] };
  return (data ?? []) as { perfil_id: string }[];
});

/**
 * Se busca por slug (la dirección de hoy) y, si no aparece nada, por UUID (la dirección vieja, para que siga
 * resolviendo). Un slug nunca es un UUID válido, así que no hace falta adivinar cuál es cuál antes de preguntar.
 */
async function cargarArtista(idOSlug: string): Promise<ArtistaConAutor | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const columnas = "id, slug, nombre, disciplina, detalle, tipo, foto, descripcion, ciudad, redes, creado_por, visible, origen, autor:perfiles!artistas_creado_por_fkey(id, nombre)";
  const porSlug = await supabase.from("artistas").select(columnas).eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("artistas").select(columnas).eq("id", idOSlug).maybeSingle()).data : null);
  if (!data) return null;
  const autor = Array.isArray(data.autor) ? (data.autor[0] ?? null) : data.autor;
  return { ...(data as unknown as Artista), autor: autor as ArtistaConAutor["autor"] };
}

/** Las fechas próximas en las que se presenta, con su sitio y cuántos van, listas para el renglón de la agenda (decisión 8). */
async function cargarFechas(artistaId: string): Promise<EventoAgenda[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase
    .from("eventos")
    .select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, lugar:lugares(nombre, portada, lat, lng), eventos_artistas!inner(artista_id)")
    .eq("eventos_artistas.artista_id", artistaId)
    .eq("visible", true)
    .or(filtroSinPasar())
    .order("inicio")
    .order("titulo")
    .order("id")
    .limit(30);
  const filas = (data ?? []) as unknown as FilaEvento[];
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
  return filas.map((f) => {
    const lugar = Array.isArray(f.lugar) ? (f.lugar[0] ?? null) : f.lugar;
    return { ...f, lugar, lat: null, lng: null, van: van.get(f.id) ?? 0 };
  });
}

// `cargarFechas` y cuántos siguen al artista se piden de nuevo abajo (`MetaArtista` y `SeccionFechasArtista`, en
// `<Suspense>` separados): `cache()` de React las memoiza por argumento para que sea una sola consulta por
// petición (OL-161, bitácora 196; mismo patrón que `cargarLigadas`, arriba).
const cargarFechasCache = cache(cargarFechas);
const cargarSeguidoresArtistaCache = cache(async (artistaId: string): Promise<number> => {
  const supabase = await clienteServidor();
  const { data } = (await supabase?.rpc("cuenta_seguidores", { p_artista: artistaId })) ?? { data: 0 };
  return Number(data ?? 0);
});

/**
 * Cuánta gente sigue al artista y su próxima fecha: los dos renglones de `<ul className={ficha.datos}>` que piden
 * una consulta aparte de la del artista (OL-161). Se difieren en `<Suspense>`; la cabecera (foto, nombre, etiqueta)
 * no los espera.
 */
async function MetaArtista({ artista }: { artista: ArtistaConAutor }) {
  const [seguidores, fechas] = await Promise.all([cargarSeguidoresArtistaCache(artista.id), cargarFechasCache(artista.id)]);
  const proxima = fechas[0] ? { id: fechas[0].id, inicio: fechas[0].inicio, sitio: nombreSitio(fechas[0]), zona: fechas[0].zona } : null;
  return seguidores === 0 && !proxima ? (
    <li className={ficha.dato}>
      <IconoCalendario width={20} height={20} />
      <span className={ficha.suave}>Sin fechas próximas · Nadie lo sigue todavía</span>
    </li>
  ) : (
    <>
      <li className={ficha.dato}>
        <IconoPersonas width={20} height={20} />
        <b>{seguidores === 0 ? "Nadie lo sigue todavía" : seguidores === 1 ? "1 persona lo sigue" : `${seguidores} personas lo siguen`}</b>
      </li>
      <li className={ficha.dato}>
        <IconoCalendario width={20} height={20} />
        <b>{proxima ? textoProximaFecha(proxima) : "Sin fechas próximas"}</b>
        {proxima && (
          <Salto destino="fechas" className={ficha.datoEnlace}>
            ver
          </Salto>
        )}
      </li>
    </>
  );
}

/** Fallback de `MetaArtista`: un renglón del mismo alto (el caso con más texto, "Nadie lo sigue todavía"). */
function EsqueletoMetaArtista() {
  return (
    <li className={ficha.dato} aria-hidden="true">
      <EsqueletoBloqueTexto lineas={1} />
    </li>
  );
}

/** "Se presenta en" entero: la misma consulta que `MetaArtista`, memoizada por `cache()`, más quién decidió qué. */
async function SeccionFechasArtista({ artista, actual, hrefPublicarFecha }: { artista: ArtistaConAutor; actual: { correo: string | null; perfil: Perfil } | null; hrefPublicarFecha: string }) {
  const fechas = await cargarFechasCache(artista.id);
  const decididas = await decididasDe(actual?.perfil.id ?? null, fechas.map((e) => e.id));
  return (
    <section className={styles.lista} id="fechas" aria-label="Se presenta en">
      <h2>
        Se presenta en
        {fechas.length > 0 && <span> · {fechas.length}</span>}
      </h2>
      {fechas.length === 0 && <p className={styles.vacio}>Aún no tiene fechas publicadas. ¿Sabes de una? Publícala.</p>}
      <EventosPorDia eventos={fechas} decididas={decididas} avisos={avisosParaListas(actual)} />
      <Boton href={hrefPublicarFecha} variante="secundario" className={styles.publicar}>
        Publicar una fecha
      </Boton>
    </section>
  );
}

/** Fallback de `SeccionFechasArtista`: el título fijo (sin el conteo, que sí espera la consulta) y renglones grises. */
function EsqueletoSeccionFechas() {
  return (
    <section className={styles.lista} id="fechas" aria-label="Se presenta en" aria-hidden="true">
      <h2>Se presenta en</h2>
      <EsqueletoRenglones cantidad={3} redonda />
    </section>
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const a = await cargarArtista(id);
  if (!a) return { title: "Artista · Somos Nosotros" };
  const descripcion = etiquetaArtista(a);
  // Del CAPO y sin reclamar (OL-059): mismo interruptor que el sitemap (src/lib/sitemap.ts). Sin esto la ficha seguía
  // indexable por el enlace desde /artistas aunque el interruptor la dejara fuera del mapa del sitio.
  const sinIndexar = a.origen === "capo" && !CAPO_SIN_RECLAMAR_EN_SITEMAP && (await cargarLigadas(a.id)).length === 0;
  // Sin foto, la imagen por defecto del sitio: el enlace compartido nunca sale sin imagen (OL-143, doc 36).
  const imagen = a.foto ?? "/portada.png";
  return {
    title: `${a.nombre} · Somos Nosotros`,
    description: descripcion,
    alternates: { canonical: `${ORIGEN}${hrefArtista(a)}` },
    ...(sinIndexar ? { robots: { index: false } } : {}),
    openGraph: { title: a.nombre, description: descripcion, url: `${ORIGEN}${hrefArtista(a)}`, type: "profile", images: [{ url: imagen }], locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary_large_image", title: a.nombre, description: descripcion, images: [imagen] },
  };
}

/** Ficha de artista: decisiones 6 a 11 y 15 de docs/rediseno/08-artistas-flujo-y-estados.md. */
export default async function FichaArtista({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo, accion, error } = (await searchParams) ?? {};
  const [a, actual] = await Promise.all([cargarArtista(id), usuarioActual()]);
  if (!a) notFound();
  // La dirección vieja (/artistas/<uuid>) sigue resolviendo, pero se redirige a la de hoy (el slug); permanente
  // porque es la misma ficha para siempre (OL-114, doc 24). Se preservan los parámetros con los que haya llegado.
  if (id !== a.slug) {
    const p = new URLSearchParams();
    if (nuevo) p.set("nuevo", nuevo);
    if (accion) p.set("accion", accion);
    if (error) p.set("error", error);
    const q = p.toString();
    permanentRedirect(`${hrefArtista(a)}${q ? `?${q}` : ""}`);
  }
  const supabase = await clienteServidor();
  // Venía de entrar con la intención de seguir: se aplica sola.
  if (actual && accion === "seguir") {
    await supabase?.from("seguimientos").upsert({ usuario_id: actual.perfil.id, artista_id: a.id }, { onConflict: "usuario_id,artista_id", ignoreDuplicates: true });
    redirect(hrefArtista(a));
  }
  // Cuántos lo siguen y sus fechas próximas son consultas aparte, diferidas en `<Suspense>` (OL-161, bitácora 196:
  // `MetaArtista` y `SeccionFechasArtista`, memoizadas con `cache()` para pedirse una sola vez). La cabecera (foto,
  // nombre, etiqueta), el menú de administración y el compartir junto al avatar no las esperan. Si yo lo sigo se
  // pregunta aparte, una fila como mucho (nunca la lista entera), para que el botón Seguir salga ya con su estado.
  const [mio, ligados] = await Promise.all([
    actual && supabase ? supabase.from("seguimientos").select("usuario_id").eq("artista_id", a.id).eq("usuario_id", actual.perfil.id).maybeSingle() : Promise.resolve({ data: null }),
    cargarLigadas(a.id),
  ]);
  const sigo = !!mio.data;
  const esAdmin = actual?.perfil.rol === "admin";
  const destacable = esAdmin && puedeDestacarse(a) ? await cargarDestacado("artista", a.id) : null;
  const porConfirmar = !!a.origen && !a.autor;
  const esAutor = !!actual && actual.perfil.id === a.creado_por;
  const estaLigado = !!actual && ligados.some((l) => l.perfil_id === actual.perfil.id);
  const puedeEditar = esAdmin || esAutor || estaLigado;
  const puedeBorrar = esAdmin || esAutor;
  const redes = normalizarRedes(a.redes);
  // Video embebido (OL-154, doc 40d): el enlace de YouTube/Vimeo ya guardado como red se ve embebido, sin
  // revisión previa; el resto de las redes (incluido un video con forma irreconocible) sigue como botón de enlace.
  const videos = redes.map((r) => videoEmbedDe(r)).filter((v): v is NonNullable<typeof v> => v !== null);
  const redesConEnlace = redes.filter((r) => !videoEmbedDe(r));
  const repartoEnlaces = repartoDeAcciones(redesConEnlace.length);
  const claseRepartoEnlaces = repartoEnlaces === "repartidas" ? ficha.accionesRepartidas : repartoEnlaces === "carril" ? ficha.accionesCarril : "";
  const faltanDetalles = a.disciplina === "por_completar" || (!a.descripcion && !a.foto && redes.length === 0);
  const url = `${ORIGEN}${hrefArtista(a)}`;
  const textoCompartir = `${a.nombre} · ${etiquetaArtista(a)}`;
  const hrefPublicarFecha = actual ? `/eventos/nuevo?artista=${a.id}` : `/entrar?siguiente=${encodeURIComponent(`/eventos/nuevo?artista=${a.id}`)}`;
  const qrSvg = await qrDeUrl(url);
  // Sin las fechas (diferidas) el aviso de borrar ya no dice cuántas tiene: el menú de administración sigue en el
  // HTML inicial y no puede esperar esa consulta aparte.
  const avisoBorrar = "Se borra la ficha; sus fechas próximas, si tiene, se quedan sin artista.";
  const correo = actual?.correo ? enmascararCorreo(actual.correo) : "tu correo";
  // JSON-LD (OL-143, doc 36): nada en una ficha oculta ni en una del CAPO sin reclamar y sin indexar (mismo
  // interruptor que `generateMetadata`); solo redes ya públicas y registradas, nunca un dato de contacto.
  const sinIndexar = a.origen === "capo" && !CAPO_SIN_RECLAMAR_EN_SITEMAP && ligados.length === 0;
  const jsonLdVisible = a.visible && !sinIndexar;
  const jsonLd = jsonLdVisible ? jsonLdArtista({ nombre: a.nombre, descripcion: a.descripcion, imagen: a.foto, url: hrefArtista(a), esGrupo: a.tipo !== "solista", redes: redes.map((r) => r.url) }) : null;
  const migajas = jsonLdVisible ? jsonLdMigajas([{ nombre: "Inicio", url: "/" }, { nombre: "Artistas", url: "/artistas" }, { nombre: a.nombre, url: hrefArtista(a) }]) : null;

  return (
    <main className={ficha.pagina}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      {migajas && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(migajas).replace(/</g, "\\u003c") }} />}
      <Barra
        volver={{ href: "/artistas", texto: "Artistas" }}
        derecha={
          <MenuAcciones>
            {puedeEditar && (
              <li>
                <Link href={`${hrefArtista(a)}/editar`} className={ficha.menuItem}>
                  Editar
                </Link>
              </li>
            )}
            {destacable && <DestacarFicha tipo="artista" id={a.id} {...destacable} />}
            {esAdmin && (
              <li>
                <form action={cambiarVisibleArtista.bind(null, a.id, !a.visible)}>
                  <button type="submit" className={ficha.menuItem}>
                    {a.visible ? "Ocultar de Artistas" : "Volver a mostrar"}
                  </button>
                </form>
              </li>
            )}
            <li className={ficha.menuItem}>
              <Reportar tipo="artista" objetoId={a.id} volver={hrefArtista(a)} conSesion={!!actual} />
            </li>
            {!puedeEditar && !porConfirmar && (
              <li className={ficha.menuItem}>
                <EsMiNombre artistaId={a.id} slug={a.slug} nombre={a.nombre} conSesion={!!actual} correo={correo} />
              </li>
            )}
            {puedeBorrar && (
              <li className={ficha.menuItem}>
                <Borrar que="la ficha" icono="artista" aviso={avisoBorrar} accion={borrarArtista.bind(null, a.id)} />
              </li>
            )}
          </MenuAcciones>
        }
      />
      {/* Volvió de entrar con "Soy yo / es mi grupo" en la mano: la hoja se abre sola. */}
      {actual && accion === "mio" && !puedeEditar && <EsMiNombre artistaId={a.id} slug={a.slug} nombre={a.nombre} conSesion correo={correo} soloHoja />}
      {nuevo === "1" && (
        <div className={ficha.publicado} role="status">
          <b>Publicado.</b>
          Ya está en Artistas.
          {puedeEditar && faltanDetalles ? (
            <Link href={`${hrefArtista(a)}/editar`} className={ficha.publicadoBoton}>
              Completar
            </Link>
          ) : (
            <BotonCompartir titulo={a.nombre} texto={textoCompartir} url={url} className={ficha.publicadoBoton}>
              Compartir
            </BotonCompartir>
          )}
        </div>
      )}
      {nuevo !== "1" && puedeEditar && faltanDetalles && (
        <p className={styles.nota}>
          {a.disciplina === "por_completar" ? "Esta ficha se creó con solo el nombre." : "Aún sin descripción, redes ni foto."} <Link href={`${hrefArtista(a)}/editar`}>Completar</Link>
        </p>
      )}
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar. ¿Sigues con sesión y es tu ficha?
        </p>
      )}
      {!a.visible && (
        <p className={`aviso-error ${ficha.oculto}`} role="status">
          Esta ficha está oculta: solo la ven su autor, su cuenta ligada y el administrador.
        </p>
      )}

      <div className={ficha.fotoConAccion}>
        <Cartel src={a.foto} alt={`Foto de ${a.nombre}`} forma="avatar" />
        {/* Compartir junto al avatar, no en el carril de enlaces (corrección del founder, OL-159): mismo círculo
            elevado que las acciones de abajo, sin letrero. Visible para cualquiera, no solo para el dueño. */}
        <CompartirFicha titulo={a.nombre} texto={textoCompartir} url={url} svg={qrSvg} etiqueta={`Compartir la ficha de ${a.nombre}`} className={ficha.compartirFoto} slug={a.slug} />
      </div>
      <h1 className={`${ficha.titulo} ${ficha.tituloConEtiqueta}`}>{a.nombre}</h1>
      <p className={ficha.etiqueta}>{etiquetaArtista(a)}</p>

      <ul className={ficha.datos}>
        {/* De dónde es, como la dirección en la ficha de un lugar. */}
        <li className={ficha.dato}>
          <IconoPin width={20} height={20} />
          <b>{a.ciudad}</b>
        </li>
        <Suspense fallback={<EsqueletoMetaArtista />}>
          <MetaArtista artista={a} />
        </Suspense>
      </ul>

      {/* Compartir ya no vive aquí (corrección del founder, OL-159): el carril es solo enlaces externos, con su
          propio título corto, como los demás bloques de la ficha. Sin enlaces, el bloque entero no aparece. */}
      {redesConEnlace.length > 0 && (
        <section className={ficha.seccionEnlaces} aria-label="Enlaces">
          <h2>Enlaces</h2>
          <div className={`${ficha.acciones} ${claseRepartoEnlaces}`}>
            {redesConEnlace.map((r) => (
              <EnlaceExterno key={r.url} href={r.url} className={ficha.accion}>
                <span className={ficha.accionIcono}>
                  <IconoRed red={r.red} />
                </span>
                {/* Título editable de hasta 30 caracteres (OL-168): a dos líneas con puntos suspensivos, nunca
                    fuera de la pantalla (ficha.accionEtiqueta). */}
                <span className={ficha.accionEtiqueta}>{etiquetaEnlace(r)}</span>
              </EnlaceExterno>
            ))}
          </div>
        </section>
      )}

      {a.descripcion && <Desplegable texto={a.descripcion} />}

      {videos.length > 0 && (
        <section className={styles.lista} aria-label="Video">
          <h2>Video</h2>
          {videos.map((v) => (
            <VideoEmbed key={v.id} video={v} titulo={a.nombre} />
          ))}
        </section>
      )}

      <Suspense fallback={<EsqueletoSeccionFechas />}>
        <SeccionFechasArtista artista={a} actual={actual} hrefPublicarFecha={hrefPublicarFecha} />
      </Suspense>

      {/* Ficha traída de un catálogo y sin dueño: al final, discreto y solo con sesión (sin sesión no se ofrece, para no
          invitar a reclamos ajenos), un letrero que abre la hoja con el origen y las dos salidas. Sin pie de origen aparte. */}
      {porConfirmar ? (
        actual && !puedeEditar && <EsMiNombre artistaId={a.id} slug={a.slug} nombre={a.nombre} conSesion correo={correo} origen={ORIGENES[a.origen!].nombre} discreto />
      ) : (
        <p className={ficha.autor}>Registrado por {a.autor ? <Link href={`/personas/${a.autor.id}`}>{a.autor.nombre}</Link> : "una cuenta borrada"}.</p>
      )}

      <Seguir
        que="artista"
        nombre={a.nombre}
        sigo={sigo}
        conSesion={!!actual}
        cuenta={actual?.perfil.id ?? ""}
        accion={cambiarSeguimientoArtista.bind(null, a.id)}
        hrefEntrar={`${hrefArtista(a)}?accion=seguir`}
        avisosPreguntado={actual?.perfil.avisos_preguntado ?? true}
        avisosCorreo={actual?.perfil.avisos_correo ?? false}
        correo={correo}
        llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
    </main>
  );
}
