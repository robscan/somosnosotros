import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import Buscador from "@/components/ui/Buscador";
import Grupo from "@/components/ui/Grupo";
import plantilla from "@/components/ui/Plantilla.module.css";
import Renglon from "@/components/ui/Renglon";
import lista from "@/components/Lista.module.css";
import { puedeDestacarse, SIN_DECIDIR, TIPO_DE, textoMotivo } from "@/lib/destacados";
import { eventoPaso } from "@/lib/fechas";
import { normalizarNombre } from "@/lib/lugares";
import { contar, detalleArtista, enDosLineas, detalleEvento, detalleLugar, esSeccionFichas, GALLETA_CIUDAD, hrefLista, leerLista, PAGINA_PANEL, unir, vacioDe, type ArtistaFila, type EventoFila, type LugarFila } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import CabeceraLista from "../CabeceraLista";
import { cargarCiudades, cargarFichas, conLaElegida } from "../consultas";
import Reintentar from "../Reintentar";
import MenuFicha from "./MenuFicha";
import styles from "../admin.module.css";
import { tituloDePagina } from "@/lib/marca";

const TITULO = { lugares: "Lugares", eventos: "Eventos", artistas: "Artistas" } as const;
const CUANTOS = { lugares: ["lugar", "lugares"], eventos: ["evento", "eventos"], artistas: ["artista", "artistas"] } as const;
const BUSCAR = { lugares: "Buscar lugar", eventos: "Buscar evento", artistas: "Buscar artista" } as const;

export async function generateMetadata({ params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  return { title: tituloDePagina(esSeccionFichas(seccion) ? TITULO[seccion] : "Administración", "Administración"), robots: { index: false, follow: false } };
}

/** `destacable`: lo que puede salir en la tira, con la misma regla que la ficha (`puedeDestacarse`). */
type Fila = { id: string; nombre: string; foto: string | null; visible: boolean; destacable: boolean; detalle: string };

/**
 * Lugares, Eventos y Artistas en el panel (decisión 10): búsqueda, filtros con conteo por lo que pide atención y un
 * renglón por ficha. El renglón abre la ficha pública; los tres puntos, su menú. Lo oculto se ve oculto.
 */
export default async function ListaFichas({ params, searchParams }: { params: Promise<{ seccion: string }>; searchParams: Promise<{ q?: string; filtro?: string; n?: string; ciudad?: string }> }) {
  const { seccion } = await params;
  if (!esSeccionFichas(seccion)) notFound();
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/admin/${seccion}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const l = leerLista(seccion, await searchParams, (await cookies()).get(GALLETA_CIUDAD)?.value ?? null);
  const [{ filas, total, conteos, error, destacados, decididos }, ciudades] = await Promise.all([cargarFichas(seccion, l), cargarCiudades(seccion).then((c) => conLaElegida(c, l.ciudad))]);
  const ahora = new Date();
  const destacadoDe = new Map(destacados.map((d) => [d.id, d]));
  const renglones: Fila[] =
    // Destacados: por qué y hasta cuándo en su renglón (docs/rediseno/20, A5); la búsqueda filtra aquí.
    l.filtro === "destacados"
      ? destacados.filter((d) => !l.q || normalizarNombre(d.nombre).includes(normalizarNombre(l.q))).map((d) => ({ id: d.id, nombre: d.nombre, foto: d.foto, visible: true, destacable: true, detalle: textoMotivo(d, TIPO_DE[seccion], ahora) }))
      : seccion === "lugares"
      ? (filas as LugarFila[]).map((x) => ({ id: x.id, nombre: x.nombre, foto: x.foto, visible: x.visible, destacable: puedeDestacarse(x), detalle: detalleLugar(x) }))
      : seccion === "eventos"
        ? (filas as EventoFila[]).map((x) => ({ id: x.id, nombre: x.titulo, foto: x.imagen, visible: x.visible, destacable: puedeDestacarse({ visible: x.visible, paso: eventoPaso(x.inicio, x.fin, ahora, x.zona), lugar: x.lugar }), detalle: detalleEvento(x, ahora) }))
        : (filas as ArtistaFila[]).map((x) => ({ id: x.id, nombre: x.nombre, foto: x.foto, visible: x.visible, destacable: puedeDestacarse(x), detalle: detalleArtista(x) }));
  const cuantos = l.filtro === "destacados" ? renglones.length : total;

  return (
    <main className={`${plantilla.paginaContenido} ${styles.listado}`}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} titulo={TITULO[seccion]} />
      <CabeceraLista seccion={seccion} lista={l} conteos={conteos} ciudades={ciudades} />
      <Buscador valor={l.q ?? ""} placeholder={BUSCAR[seccion]} ariaLabel={BUSCAR[seccion]} />
      {error ? (
        <Reintentar texto={`No pudimos leer ${TITULO[seccion].toLowerCase()}.`} />
      ) : renglones.length === 0 ? (
        <p className={lista.vacio}>{vacioDe(seccion, l.filtro, l.q)}</p>
      ) : (
        <>
          <p className={lista.conteo}>{contar(cuantos, CUANTOS[seccion][0], CUANTOS[seccion][1])}</p>
          <Grupo>
            {renglones.map((r) => (
              <Renglon key={r.id} href={`/${seccion}/${r.id}`} foto={r.foto} redonda={seccion === "artistas"} perezosa titulo={r.nombre} accion={<MenuFicha seccion={seccion} id={r.id} nombre={r.nombre} visible={r.visible} destacable={r.destacable} decidido={decididos.get(r.id) ?? SIN_DECIDIR} enTira={destacadoDe.get(r.id) ?? null} />}>
                {enDosLineas(unir([!r.visible && "Oculto", l.filtro !== "destacados" && destacadoDe.has(r.id) && "Destacado", r.detalle])).map((linea) => (
                  <span key={linea}>
                    <span>{linea}</span>
                  </span>
                ))}
              </Renglon>
            ))}
          </Grupo>
        </>
      )}
      {total > renglones.length && (
        <Boton href={hrefLista(seccion, { ...l, n: l.n + PAGINA_PANEL })} variante="secundario" forma="pildora" alto="control" ancho="contenido" className={styles.verMas} scroll={false} replace>
          Ver más ({total - renglones.length} más)
        </Boton>
      )}
    </main>
  );
}
