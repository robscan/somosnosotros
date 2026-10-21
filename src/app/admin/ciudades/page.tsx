import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { busquedasDe, credito, estadoVisible, juntarAlias, lineaCredito, lineaFila, ordenarCiudades, porRevisarDe } from "@/lib/ciudadesAdmin";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import { cargarExtras, cargarPanelCiudades, conCifras, pedirPasoSiHayVaradas } from "./consultas";
import ListaCiudades, { type FilaLista } from "./ListaCiudades";
import styles from "../admin.module.css";

export const metadata = { title: "Ciudades · Administración · Somos Nosotros", robots: { index: false, follow: false } };

/**
 * Administración › Ciudades, la lista general (OL-432; prototipo firmado OL-431, pantalla A, con las respuestas del gestor). Dice en qué ciudad
 * entrar: una fila por ciudad, primero las que tienen algo por decidir, luego las detectadas, luego el resto (por consultas). Las búsquedas
 * viven en el panel de cada ciudad (`[slug]`). Las ocultas no salen; una detectada que es otra con otro nombre suma a ella (`juntarAlias`).
 * Se entra desde la portada de Administración y Atrás vuelve ahí.
 */
export default async function Ciudades() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/ciudades");
  if (actual.perfil.rol !== "admin") redirect("/");
  const [panel, extras] = await Promise.all([cargarPanelCiudades(), cargarExtras()]);
  if (!panel)
    return (
      <main className={plantilla.paginaContenido}>
        <Barra volver={{ href: "/admin", texto: "Administración" }} />
        <h1 className={styles.titulo}>Ciudades</h1>
        <Reintentar texto="No pudimos leer las ciudades." />
      </main>
    );
  const ahora = new Date();
  // Si una corrida se quedó varada, se pide su paso después de responder (OL-429); la pantalla no cambia.
  await pedirPasoSiHayVaradas(panel.corridas, ahora);
  const nombres = new Map(panel.ciudades.map((c) => [c.slug, { nombre: c.nombre, alias: extras?.get(c.slug)?.alias ?? [] }]));
  const { ciudades } = juntarAlias(panel.ciudades, nombres);
  const conNumeros = await conCifras(ciudades, extras ?? new Map());
  const filas: FilaLista[] = ordenarCiudades(conNumeros, panel.corridas).map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    estado: estadoVisible(c.estado),
    consultas: c.consultas,
    lugares: c.lugares,
    eventos: c.eventos,
    porRevisar: porRevisarDe(panel.corridas, c.slug),
    linea: lineaFila({ estado: c.estado, abiertaEn: extras?.get(c.slug)?.parametros.abiertaEn }, busquedasDe(panel.corridas, c.slug), ahora),
  }));
  return (
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} />
      <h1 className={styles.titulo}>Ciudades</h1>
      <ListaCiudades filas={filas} credito={lineaCredito(credito(panel.credito, ahora))} />
    </main>
  );
}
