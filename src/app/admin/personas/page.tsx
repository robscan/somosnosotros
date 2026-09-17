import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import Buscador from "@/components/ui/Buscador";
import { ChipEnlace, Chips, Cuenta } from "@/components/ui/Chip";
import { IconoChevronDerecha } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { detallePersona, FILTROS, hrefLista, leerLista, PAGINA_PANEL, vacioDe } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import Avatar from "../Avatar";
import { cargarPersonas } from "../consultas";
import Reintentar from "../Reintentar";
import styles from "../admin.module.css";

export const metadata = { title: "Personas · Administración · Somos Nosotros" };

/**
 * Personas (decisión 7): buscar por nombre o correo, filtrar con conteo y leer lo más significativo de cada quien. El
 * filtro y la búsqueda viven en la URL: se comparten y sobreviven al volver de una ficha; el scroll lo repone MemoriaScroll.
 */
export default async function Personas({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string; n?: string }> }) {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/personas");
  if (actual.perfil.rol !== "admin") redirect("/");
  const l = leerLista("personas", await searchParams);
  const { filas, total, conteos, error } = await cargarPersonas(l);
  const ahora = new Date();
  return (
    <main className={`${ficha.pagina} ${styles.lista}`}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} />
      <h1 className={styles.titulo}>Personas</h1>
      <Buscador valor={l.q ?? ""} placeholder="Buscar por nombre o correo" ariaLabel="Buscar persona por nombre o correo" />
      <Chips ariaLabel="Filtrar personas">
        {FILTROS.personas.map((f) => (
          <ChipEnlace key={f.valor} activo={l.filtro === f.valor} href={hrefLista("personas", { q: l.q, filtro: f.valor })}>
            {f.etiqueta}
            {conteos && <Cuenta n={conteos[f.valor] ?? 0} />}
          </ChipEnlace>
        ))}
      </Chips>
      {error ? (
        <Reintentar texto="No pudimos leer las personas." />
      ) : filas.length === 0 ? (
        <p className={styles.vacio}>{vacioDe("personas", l.filtro, l.q)}</p>
      ) : (
        <ul className={styles.renglones}>
          {filas.map((p) => {
            const tu = p.id === actual.perfil.id;
            return (
              <li key={p.id}>
                <Link href={`/admin/personas/${p.id}`} className={styles.persona}>
                  <Avatar foto={p.foto} nombre={p.nombre} />
                  <b>
                    {tu ? "Tú" : p.nombre || "Sin nombre"}
                    {p.rol === "admin" && (
                      <>
                        {" "}
                        <span className={`${styles.etiqueta} ${styles.etiquetaRol}`}>Administración</span>
                      </>
                    )}
                  </b>
                  <small>{detallePersona(p, ahora, l.q, tu)}</small>
                  <IconoChevronDerecha width={16} height={16} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {total > filas.length && (
        <Boton href={hrefLista("personas", { ...l, n: l.n + PAGINA_PANEL })} variante="secundario" className={styles.verMas} scroll={false}>
          Ver más ({total - filas.length} más)
        </Boton>
      )}
    </main>
  );
}
