import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import Buscador from "@/components/ui/Buscador";
import Grupo from "@/components/ui/Grupo";
import plantilla from "@/components/ui/Plantilla.module.css";
import Renglon from "@/components/ui/Renglon";
import lista from "@/components/Lista.module.css";
import { contar, detallePersona, enDosLineas, GALLETA_CIUDAD, hrefLista, leerLista, PAGINA_PANEL, unir, vacioDe } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import CabeceraLista from "../CabeceraLista";
import { cargarCiudades, cargarPersonas, conLaElegida } from "../consultas";
import Reintentar from "../Reintentar";
import styles from "../admin.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Personas", "Administración"), robots: { index: false, follow: false } };

/**
 * Personas (decisión 7; OL-456 con el canon del front): la barra de las fichas, la cabecera de Lugares con la ciudad de cada persona (la que más
 * se repite en lo que lleva, publica y marca «Voy»; «Sin ciudad» si nada) y Filtros, el buscador por nombre o correo y el renglón de lista de la
 * app. La ciudad, el filtro y la búsqueda viven en la URL (la ciudad, también en la sesión): se comparten y sobreviven al volver de una ficha.
 */
export default async function Personas({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string; n?: string; ciudad?: string }> }) {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/personas");
  if (actual.perfil.rol !== "admin") redirect("/");
  const l = leerLista("personas", await searchParams, (await cookies()).get(GALLETA_CIUDAD)?.value ?? null);
  const [{ filas, total, conteos, error }, ciudades] = await Promise.all([cargarPersonas(l), cargarCiudades("personas").then((c) => conLaElegida(c, l.ciudad))]);
  const ahora = new Date();
  return (
    <main className={`${plantilla.paginaContenido} ${styles.listado}`}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} titulo="Personas" />
      <CabeceraLista seccion="personas" lista={l} conteos={conteos} ciudades={ciudades} />
      <Buscador valor={l.q ?? ""} placeholder="Buscar por nombre o correo" ariaLabel="Buscar persona por nombre o correo" />
      {error ? (
        <Reintentar texto="No pudimos leer las personas." />
      ) : filas.length === 0 ? (
        <p className={lista.vacio}>{vacioDe("personas", l.filtro, l.q)}</p>
      ) : (
        <>
          <p className={lista.conteo}>{contar(total, "persona", "personas")}</p>
          <Grupo>
            {filas.map((p) => {
              const tu = p.id === actual.perfil.id;
              return (
                <Renglon key={p.id} href={`/admin/personas/${p.id}`} foto={p.foto} redonda perezosa titulo={tu ? "Tú" : p.nombre || "Sin nombre"}>
                  {enDosLineas(unir([p.rol === "admin" && "Administración", detallePersona(p, ahora, l.q, tu)])).map((linea) => (
                    <span key={linea}>
                      <span>{linea}</span>
                    </span>
                  ))}
                </Renglon>
              );
            })}
          </Grupo>
        </>
      )}
      {total > filas.length && (
        <Boton href={hrefLista("personas", { ...l, n: l.n + PAGINA_PANEL })} variante="secundario" forma="pildora" alto="control" ancho="contenido" className={styles.verMas} scroll={false} replace>
          Ver más ({total - filas.length} más)
        </Boton>
      )}
    </main>
  );
}
