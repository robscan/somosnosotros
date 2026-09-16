import Link from "next/link";
import Barra from "@/components/ui/Barra";
import { redirect } from "next/navigation";
import { formatearCuando } from "@/lib/fechas";
import { etiquetaMotivo, pideLlevarLaFicha } from "@/lib/reportes";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { atenderReporte, cambiarVisibleDesdeAdmin, ligarFichaDesdeAdmin } from "./acciones";
import Tarjeta from "@/components/ui/Tarjeta";
import styles from "./admin.module.css";

export const metadata = { title: "Administración · Somos Nosotros" };

type Reporte = { id: string; tipo: "lugar" | "evento" | "perfil" | "artista"; objeto_id: string; motivo: string; detalle: string | null; creado_en: string; creado_por: string | null; autor: { nombre: string } | { nombre: string }[] | null };

/** Panel simple para el administrador: reportes, lo último publicado, conteos. */
export default async function Admin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin");
  if (actual.perfil.rol !== "admin") redirect("/");
  const supabase = (await clienteServidor())!;
  const [{ data: reportes }, { data: lugares }, { data: eventos }, { data: artistas }, perfiles, asistencias, seguimientos] = await Promise.all([
    supabase.from("reportes").select("id, tipo, objeto_id, motivo, detalle, creado_en, creado_por, autor:perfiles!reportes_creado_por_fkey(nombre)").eq("atendido", false).order("creado_en", { ascending: false }).limit(50),
    supabase.from("lugares").select("id, nombre, visible, creado_en").order("creado_en", { ascending: false }).limit(10),
    supabase.from("eventos").select("id, titulo, inicio, visible, creado_en").order("creado_en", { ascending: false }).limit(10),
    supabase.from("artistas").select("id, nombre, visible, creado_en").order("creado_en", { ascending: false }).limit(10),
    supabase.from("perfiles").select("*", { count: "exact", head: true }),
    supabase.from("asistencias").select("*", { count: "exact", head: true }),
    supabase.from("seguimientos").select("*", { count: "exact", head: true }),
  ]);
  const rutaDe = (r: Reporte) => (r.tipo === "lugar" ? `/lugares/${r.objeto_id}` : r.tipo === "evento" ? `/eventos/${r.objeto_id}` : r.tipo === "artista" ? `/artistas/${r.objeto_id}` : `/personas/${r.objeto_id}`);
  const nombreAutor = (a: Reporte["autor"]) => (Array.isArray(a) ? a[0]?.nombre : a?.nombre) ?? "cuenta borrada";

  return (
    <main className="pagina">
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <h1 className="titulo">Administración</h1>
      <p className="subtitulo">
        {perfiles.count ?? 0} personas · {lugares?.length ?? 0}+ lugares · {eventos?.length ?? 0}+ eventos · {artistas?.length ?? 0}+ artistas · {asistencias.count ?? 0} “voy” · {seguimientos.count ?? 0} seguimientos
      </p>

      <section className={styles.seccion} aria-label="Reportes pendientes">
        <h2 className={styles.tituloSeccion}>Reportes pendientes {reportes && reportes.length > 0 ? `(${reportes.length})` : ""}</h2>
        {!reportes || reportes.length === 0 ? (
          <p className={styles.vacio}>Nada pendiente.</p>
        ) : (
          <ul className={styles.lista}>
            {(reportes as unknown as Reporte[]).map((r) => (
              <li key={r.id}>
                <Tarjeta
                  titulo={
                    <>
                      {etiquetaMotivo(r.motivo, r.tipo)} · {r.tipo} · <Link href={rutaDe(r)}>ver</Link>
                    </>
                  }
                  detalle={r.detalle}
                >
                <p className={styles.meta}>
                  Reportó {nombreAutor(r.autor)} · {formatearCuando(r.creado_en)}
                </p>
                <div className={styles.acciones}>
                  {pideLlevarLaFicha(r.tipo, r.motivo) && (
                    <form action={ligarFichaDesdeAdmin.bind(null, r.tipo, r.objeto_id, r.creado_por, r.id)}>
                      <button type="submit" className={styles.botonSuave}>
                        Pasar la ficha a esta cuenta
                      </button>
                    </form>
                  )}
                  {(r.tipo === "lugar" || r.tipo === "evento" || r.tipo === "artista") && (
                    <form action={cambiarVisibleDesdeAdmin.bind(null, r.tipo, r.objeto_id, false)}>
                      <button type="submit" className={styles.botonSuave}>
                        Ocultar
                      </button>
                    </form>
                  )}
                  <form action={atenderReporte.bind(null, r.id)}>
                    <button type="submit" className={styles.botonSuave}>
                      Marcar atendido
                    </button>
                  </form>
                </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.seccion} aria-label="Últimos eventos">
        <h2 className={styles.tituloSeccion}>Últimos eventos</h2>
        <ul className={styles.lista}>
          {(eventos ?? []).map((e) => (
            <li key={e.id} className={styles.fila}>
              <Link href={`/eventos/${e.id}`} className={styles.nombre}>
                {e.titulo}
              </Link>
              <span className={styles.meta}>{formatearCuando(e.inicio)}</span>
              <form action={cambiarVisibleDesdeAdmin.bind(null, "evento", e.id, !e.visible)}>
                <button type="submit" className={styles.botonSuave}>
                  {e.visible ? "Ocultar" : "Mostrar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.seccion} aria-label="Últimos artistas">
        <h2 className={styles.tituloSeccion}>Últimos artistas</h2>
        {!artistas || artistas.length === 0 ? (
          <p className={styles.vacio}>Todavía no hay artistas registrados.</p>
        ) : (
          <ul className={styles.lista}>
            {artistas.map((a) => (
              <li key={a.id} className={styles.fila}>
                <Link href={`/artistas/${a.id}`} className={styles.nombre}>
                  {a.nombre}
                </Link>
                <form action={cambiarVisibleDesdeAdmin.bind(null, "artista", a.id, !a.visible)}>
                  <button type="submit" className={styles.botonSuave}>
                    {a.visible ? "Ocultar" : "Mostrar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.seccion} aria-label="Últimos lugares">
        <h2 className={styles.tituloSeccion}>Últimos lugares</h2>
        <ul className={styles.lista}>
          {(lugares ?? []).map((l) => (
            <li key={l.id} className={styles.fila}>
              <Link href={`/lugares/${l.id}`} className={styles.nombre}>
                {l.nombre}
              </Link>
              <form action={cambiarVisibleDesdeAdmin.bind(null, "lugar", l.id, !l.visible)}>
                <button type="submit" className={styles.botonSuave}>
                  {l.visible ? "Ocultar" : "Mostrar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
