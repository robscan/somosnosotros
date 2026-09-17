import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import Buscador from "@/components/ui/Buscador";
import { ChipEnlace, Chips, Cuenta } from "@/components/ui/Chip";
import ficha from "@/components/ui/Ficha.module.css";
import { puedeDestacarse, SIN_DECIDIR, TIPO_DE, textoMotivo } from "@/lib/destacados";
import { eventoPaso } from "@/lib/fechas";
import { SIN_FOTO } from "@/lib/imagen";
import { normalizarNombre } from "@/lib/lugares";
import { detalleArtista, detalleEvento, detalleLugar, esSeccionFichas, FILTROS, hrefLista, leerLista, PAGINA_PANEL, vacioDe, type ArtistaFila, type EventoFila, type LugarFila } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import { cargarFichas } from "../consultas";
import Reintentar from "../Reintentar";
import MenuFicha from "./MenuFicha";
import styles from "../admin.module.css";

const TITULO = { lugares: "Lugares", eventos: "Eventos", artistas: "Artistas" } as const;
const BUSCAR = { lugares: "Buscar lugar", eventos: "Buscar evento", artistas: "Buscar artista" } as const;

export async function generateMetadata({ params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  return { title: `${esSeccionFichas(seccion) ? TITULO[seccion] : "Administración"} · Administración · Somos Nosotros` };
}

/** `destacable`: lo que puede salir en la tira, con la misma regla que la ficha (`puedeDestacarse`). */
type Renglon = { id: string; nombre: string; foto: string | null; visible: boolean; destacable: boolean; detalle: string };

/**
 * Lugares, Eventos y Artistas en el panel (decisión 10): búsqueda, filtros con conteo por lo que pide atención y un
 * renglón por ficha. El renglón abre la ficha pública; los tres puntos, su menú. Lo oculto se ve oculto.
 */
export default async function ListaFichas({ params, searchParams }: { params: Promise<{ seccion: string }>; searchParams: Promise<{ q?: string; filtro?: string; n?: string }> }) {
  const { seccion } = await params;
  if (!esSeccionFichas(seccion)) notFound();
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/admin/${seccion}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const l = leerLista(seccion, await searchParams);
  const { filas, total, conteos, error, destacados, decididos } = await cargarFichas(seccion, l);
  const ahora = new Date();
  const destacadoDe = new Map(destacados.map((d) => [d.id, d]));
  const renglones: Renglon[] =
    // Destacados: por qué y hasta cuándo en su renglón (docs/rediseno/20, A5); la búsqueda filtra aquí.
    l.filtro === "destacados"
      ? destacados.filter((d) => !l.q || normalizarNombre(d.nombre).includes(normalizarNombre(l.q))).map((d) => ({ id: d.id, nombre: d.nombre, foto: d.foto, visible: true, destacable: true, detalle: textoMotivo(d, TIPO_DE[seccion], ahora) }))
      : seccion === "lugares"
      ? (filas as LugarFila[]).map((x) => ({ id: x.id, nombre: x.nombre, foto: x.foto, visible: x.visible, destacable: puedeDestacarse(x), detalle: detalleLugar(x) }))
      : seccion === "eventos"
        ? (filas as EventoFila[]).map((x) => ({ id: x.id, nombre: x.titulo, foto: x.imagen, visible: x.visible, destacable: puedeDestacarse({ visible: x.visible, paso: eventoPaso(x.inicio, x.fin, ahora, x.zona), lugar: x.lugar }), detalle: detalleEvento(x, ahora) }))
        : (filas as ArtistaFila[]).map((x) => ({ id: x.id, nombre: x.nombre, foto: x.foto, visible: x.visible, destacable: puedeDestacarse(x), detalle: detalleArtista(x) }));
  const redonda = seccion === "artistas" ? styles.redonda : "";

  return (
    <main className={`${ficha.pagina} ${styles.lista}`}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} />
      <h1 className={styles.titulo}>{TITULO[seccion]}</h1>
      <Buscador valor={l.q ?? ""} placeholder={BUSCAR[seccion]} ariaLabel={BUSCAR[seccion]} />
      <Chips ariaLabel={`Filtrar ${TITULO[seccion].toLowerCase()}`}>
        {FILTROS[seccion].map((f) => (
          <ChipEnlace key={f.valor} activo={l.filtro === f.valor} href={hrefLista(seccion, { q: l.q, filtro: f.valor })}>
            {f.etiqueta}
            {conteos && <Cuenta n={conteos[f.valor] ?? 0} />}
          </ChipEnlace>
        ))}
      </Chips>
      {error ? (
        <Reintentar texto={`No pudimos leer ${TITULO[seccion].toLowerCase()}.`} />
      ) : renglones.length === 0 ? (
        <p className={styles.vacio}>{vacioDe(seccion, l.filtro, l.q)}</p>
      ) : (
        <ul className={styles.renglones}>
          {renglones.map((r) => (
            <li key={r.id} className={`${styles.renglonFicha} ${r.visible ? "" : styles.oculta}`}>
              <Link href={`/${seccion}/${r.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
                <img src={r.foto ?? SIN_FOTO} alt="" className={`${styles.foto} ${redonda}`} loading="lazy" decoding="async" />
                <b>
                  {r.nombre}
                  {!r.visible && (
                    <>
                      {" "}
                      <span className={styles.etiqueta}>Oculto</span>
                    </>
                  )}
                  {l.filtro !== "destacados" && destacadoDe.has(r.id) && (
                    <>
                      {" "}
                      <span className={`${styles.etiqueta} ${styles.destacada}`}>Destacado</span>
                    </>
                  )}
                </b>
                <small>{r.detalle}</small>
              </Link>
              <MenuFicha seccion={seccion} id={r.id} nombre={r.nombre} visible={r.visible} destacable={r.destacable} decidido={decididos.get(r.id) ?? SIN_DECIDIR} enTira={destacadoDe.get(r.id) ?? null} />
            </li>
          ))}
        </ul>
      )}
      {total > renglones.length && (
        <Boton href={hrefLista(seccion, { ...l, n: l.n + PAGINA_PANEL })} variante="secundario" className={styles.verMas} scroll={false} replace>
          Ver más ({total - renglones.length} más)
        </Boton>
      )}
    </main>
  );
}
